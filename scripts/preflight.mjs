#!/usr/bin/env node
// Pre-push preflight. Runs in about a second.
//
// WHY THIS EXISTS
// Four Vercel deployments failed across two days. `tsc --noEmit` would have
// caught two of them, but a full typecheck takes 10+ minutes against a network-
// mounted working copy, so it kept getting skipped and Vercel became the
// typechecker — which means a failure email to the owner every time.
//
// Every rule below corresponds to a deployment that actually failed. This is a
// regression suite for build breakage, not a style linter. Keep it fast, keep it
// zero-dependency, and only add a rule when something has genuinely broken.
//
//   node scripts/preflight.mjs
//
// It is not a substitute for `tsc --noEmit` when you can afford to run it.

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, extname } from 'node:path'

const ROOT = process.cwd()
const SKIP = new Set(['node_modules', '.next', '.git', 'out', 'dist', '.vercel', '.claude'])

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

const problems = []
const fail = (file, rule, detail) =>
  problems.push({ file: relative(ROOT, file).replace(/\\/g, '/'), rule, detail })

const files = walk(ROOT)
const code = files.filter(f => ['.ts', '.tsx', '.mjs', '.js', '.jsx', '.css'].includes(extname(f)))

for (const f of code) {
  const buf = readFileSync(f)
  const rel = relative(ROOT, f).replace(/\\/g, '/')
  const text = buf.toString('utf8')

  // ── Rule 1: null bytes and truncation ──────────────────────────────────────
  // Cause of earlier corruption in layout.tsx / page.tsx / globals.css, where a
  // file ended in a run of trailing NULs and the build failed on a parse error.
  const nul = buf.indexOf(0)
  if (nul !== -1) fail(f, 'null-byte', `first NUL at byte ${nul} of ${buf.length}`)

  // ── Rule 2: stray leading character ────────────────────────────────────────
  // Broke 34cca06 and 1d00fa1: heredoc escaping left a literal backslash as the
  // first byte of global-error.tsx and demo/page.tsx.
  if (buf.length > 0) {
    const first = buf[0]
    const ok = first === 0x2f /* / */ || first === 0x27 /* ' */ || first === 0x22 /* " */ ||
      first === 0x69 /* i */ || first === 0x65 /* e */ || first === 0x2a /* * */ ||
      first === 0x40 /* @ */ || first === 0x23 /* # */ || first === 0x0a ||
      first === 0x2e /* . */ || first === 0x3a /* : */ || first === 0x62 /* b */ ||
      first === 0x68 /* h */ || first === 0x3c /* < */ || first === 0x66 /* f */ ||
      first === 0x63 /* c */ || first === 0x64 /* d */ || first === 0x6d /* m */ ||
      first === 0x70 /* p */ || first === 0x75 /* u */ || first === 0x76 /* v */ ||
      first === 0x74 /* t */ || first === 0x6c /* l */ || first === 0x72 /* r */ ||
      first === 0x73 /* s */ || first === 0x67 /* g */ || first === 0x6e /* n */ ||
      first === 0x61 /* a */ || first === 0x7b /* { */ || first === 0xef /* BOM */
    if (!ok) {
      fail(f, 'stray-first-byte', `starts with 0x${first.toString(16)} ${JSON.stringify(String.fromCharCode(first))}`)
    }
  }

  // ── Rule 3: .ts / .tsx extensions in import specifiers ─────────────────────
  // Broke 5a1075a. Next normalises tsconfig during build, so
  // allowImportingTsExtensions does not survive and these imports fail to
  // resolve. Test files are exempt: they run under node --experimental-strip-types,
  // which requires the extension, and Next does not typecheck tests/.
  if (!rel.startsWith('tests/') && !rel.startsWith('scripts/') && !rel.startsWith('ml/')) {
    const re = /from\s+['"]([^'"]+\.tsx?)['"]/g
    let m
    while ((m = re.exec(text))) fail(f, 'ts-extension-import', m[1])
  }
}

// ── Rules 4 and 5: Next.js route files ───────────────────────────────────────
const routes = code.filter(f => /[\\/]app[\\/].*[\\/]route\.tsx?$/.test(f))
for (const f of routes) {
  const text = readFileSync(f, 'utf8')
  const rel = relative(ROOT, f).replace(/\\/g, '/')

  // Rule 4: route segment config must be a literal export.
  // Broke 26abd6d: `export { POST, dynamic } from '../../risk/route'`. Next reads
  // dynamic/revalidate/runtime/fetchCache by static analysis and rejects a
  // re-export.
  const CONFIG = ['dynamic', 'revalidate', 'runtime', 'fetchCache', 'preferredRegion', 'maxDuration']
  const reExport = /export\s*\{([^}]*)\}\s*from\s*['"][^'"]+['"]/g
  let m
  while ((m = reExport.exec(text))) {
    for (const name of m[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0])) {
      if (CONFIG.includes(name)) {
        fail(f, 'reexported-route-config', `"${name}" must be declared literally, not re-exported`)
      }
    }
  }

  // Rule 5: routes must not import from another route file.
  // Same commit. Next compiles each route.ts as its own entry point; share code
  // through lib/ instead.
  const imp = /from\s+['"]([^'"]+)['"]/g
  while ((m = imp.exec(text))) {
    if (/(^|\/)route$/.test(m[1]) || /(^|\/)route\.tsx?$/.test(m[1])) {
      fail(f, 'cross-route-import', `${rel} imports ${m[1]} — move shared code into lib/`)
    }
  }
}

// ── Rule 6: client components must not pull in server-only SDKs ──────────────
// groq-sdk in a client bundle has broken the build before. Any file marked
// 'use client' must not reach it, directly or via a barrel.
const SERVER_ONLY = ['groq-sdk', 'groq_sdk']
for (const f of code) {
  const text = readFileSync(f, 'utf8')
  if (!/^\s*['"]use client['"]/.test(text)) continue
  for (const pkg of SERVER_ONLY) {
    if (new RegExp(`from\\s+['"]${pkg}['"]`).test(text)) {
      fail(f, 'server-sdk-in-client', pkg)
    }
  }
}

// ── Rule 7: secrets behind NEXT_PUBLIC_ ──────────────────────────────────────
// The most serious thing preflight has caught. Three client pages read
// process.env.NEXT_PUBLIC_GROQ_API_KEY and constructed a Groq client with
// dangerouslyAllowBrowser. NEXT_PUBLIC_* is INLINED INTO THE CLIENT BUNDLE at
// build time, so the key was extractable from production JavaScript by anyone.
//
// Anything named like a credential must never carry the NEXT_PUBLIC_ prefix.
// SUPABASE_ANON_KEY is the documented exception: it is designed to be public and
// is what RLS policies are written against.
const SECRETISH = /^NEXT_PUBLIC_[A-Z0-9_]*(API_KEY|SECRET|PRIVATE|TOKEN|PASSWORD|CREDENTIAL)[A-Z0-9_]*$/
const PUBLIC_BY_DESIGN = new Set(['NEXT_PUBLIC_SUPABASE_ANON_KEY'])
for (const f of code) {
  const text = readFileSync(f, 'utf8')
  const rel = relative(ROOT, f).replace(/\\/g, '/')
  // The server route documents the old bug in a comment; don't flag the docs.
  if (rel.startsWith('scripts/')) continue
  for (const m of text.matchAll(/\bNEXT_PUBLIC_[A-Z0-9_]+\b/g)) {
    const name = m[0]
    if (PUBLIC_BY_DESIGN.has(name) || !SECRETISH.test(name)) continue
    // Ignore mentions inside comment lines — those are intentional history.
    const line = text.slice(text.lastIndexOf('\n', m.index) + 1, text.indexOf('\n', m.index))
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue
    fail(f, 'secret-in-public-env', `${name} is inlined into the client bundle`)
  }
}

// ── Rule 8: dangerouslyAllowBrowser ──────────────────────────────────────────
// An SDK only needs this flag when it is about to use a credential in a browser.
// There is no legitimate use of it in this codebase.
for (const f of code) {
  const text = readFileSync(f, 'utf8')
  if (relative(ROOT, f).replace(/\\/g, '/').startsWith('scripts/')) continue
  for (const m of text.matchAll(/dangerouslyAllowBrowser/g)) {
    const line = text.slice(text.lastIndexOf('\n', m.index) + 1, text.indexOf('\n', m.index))
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue
    fail(f, 'dangerously-allow-browser', 'SDK credential used in a browser context')
  }
}

// ── Rule 9: off-palette Tailwind colour classes ──────────────────────────────
// The app-wide recolour replaced hex literals but not Tailwind class names, so
// the nurse dashboard kept a blue avatar and red-400 text in a green/orange app —
// and nobody noticed until it was about to be filmed. Named Tailwind palette
// colours are banned; use arbitrary values from the token set instead, e.g.
// text-[#5F7049].
const TW_COLOUR = /\b(?:text|bg|border|from|via|to|ring|outline|decoration|divide|shadow|accent|caret|fill|stroke)-(?:red|blue|green|amber|yellow|orange|indigo|purple|pink|cyan|teal|emerald|rose|sky|violet|lime|fuchsia)-(?:50|[1-9]00|950)\b/g
for (const f of code) {
  const rel = relative(ROOT, f).replace(/\\/g, '/')
  if (rel.startsWith('scripts/')) continue
  const text = readFileSync(f, 'utf8')
  const hits = [...new Set([...text.matchAll(TW_COLOUR)].map(m => m[0]))]
  for (const h of hits) fail(f, 'off-palette-tailwind', h)
}

// ── report ───────────────────────────────────────────────────────────────────
const RULES = {
  'off-palette-tailwind': 'named Tailwind colour instead of a palette token',
  'secret-in-public-env': 'credential exposed via NEXT_PUBLIC_ (shipped to browsers)',
  'dangerously-allow-browser': 'SDK configured to use a credential in the browser',
  'null-byte': 'file contains NUL bytes (write corruption)',
  'stray-first-byte': 'file begins with an unexpected character',
  'ts-extension-import': 'import specifier includes a .ts/.tsx extension',
  'reexported-route-config': 'route segment config re-exported instead of declared',
  'cross-route-import': 'route imports from another route file',
  'server-sdk-in-client': "server-only SDK imported by a 'use client' file",
}

console.log(`\npreflight: ${code.length} source files checked\n`)
if (problems.length === 0) {
  console.log('  clean — no known build-breaking patterns\n')
  process.exit(0)
}
const byRule = {}
for (const p of problems) (byRule[p.rule] ||= []).push(p)
for (const [rule, list] of Object.entries(byRule)) {
  console.log(`  ${rule} — ${RULES[rule]}`)
  for (const p of list) console.log(`      ${p.file}  ${p.detail}`)
  console.log()
}
console.log(`${problems.length} problem${problems.length === 1 ? '' : 's'}\n`)
process.exit(1)
