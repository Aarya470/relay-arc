// Browser audit. Real Chromium, real viewports, no human looking at anything.
//
// WHY THIS EXISTS
// `npm run verify` had six suites and all of them tested pure functions. Every
// bug found in the sweep that produced this file was invisible to all of them,
// because every one of them was about what the page actually does in a browser:
//
//   the homepage h1 ran under the phone mockup, so the first thing a visitor
//     read was "The closest hospital is not always the right" and then nothing
//   the muted grey was 3.42:1 on the page green, under the 4.5 minimum, and it
//     was carrying the hospital name and the distance on the SOS screen
//   the warning amber was 2.73:1 and carried the triage severity scale
//   every text field was 14 or 15px, so iOS zoomed the page on every tap
//   fifteen links were under the 24px touch target minimum
//   five symptom sliders were divs, unreachable by keyboard, announcing nothing
//
// A unit test cannot see any of that. This can, and it runs on every push.
//
// RUNNING IT
//   node tests/ui.audit.mjs                  audits the deployed site
//   BASE=http://localhost:3000 node ...      audits a local dev server
//
// Signed-in pages are audited too when a credential is available. Without one
// the public pages are still checked and the rest are skipped out loud, so a
// missing secret degrades the run rather than silently shrinking it.
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.BASE || 'https://www.relay-arc.org'

const PUBLIC_PAGES = ['/', '/card', '/flare', '/rights', '/features', '/engineering', '/login', '/donate', '/changelog', '/privacy', '/terms']
const PRIVATE_PAGES = ['/dashboard', '/vitals', '/symptoms', '/medications', '/checkin', '/settings', '/emergency', '/medical-profile', '/emergency-contacts']

const VIEWPORTS = [
  { name: 'mobile',  width: 375,  height: 812,  isMobile: true,  hasTouch: true },
  { name: 'desktop', width: 1440, height: 900,  isMobile: false, hasTouch: false },
]

let pass = 0, fail = 0
const failures = []
const advisories = []
function check(ok, label, detail = '') {
  if (ok) { pass++ }
  else { fail++; failures.push(`${label}${detail ? ' — ' + detail : ''}`) }
}

// ── The audit, as a single function evaluated inside the page ────────────────
// Kept as one string so it runs in one round trip per page.
const AUDIT = `(() => {
  const lum = c => { const s = c.map(v => { v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4) });
                     return 0.2126*s[0] + 0.7152*s[1] + 0.0722*s[2] }
  const parse = s => { const m = s.match(/[\\d.]+/g); return m ? m.slice(0,3).map(Number) : null }
  const alpha = s => { const m = s.match(/[\\d.]+/g); return m && m.length > 3 ? Number(m[3]) : 1 }
  const bgOf = el => { let e = el; while (e) { const cs = getComputedStyle(e);
                         if (alpha(cs.backgroundColor) > 0.85) return parse(cs.backgroundColor); e = e.parentElement }
                       return [255,255,255] }
  const vis = el => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect()
                      return cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.4 && r.width > 0 && r.height > 0 }

  const out = { contrast: [], targets: [], fields: [], names: [], occluded: [], hScroll: false, emDash: false, brokenSentence: [] }
  const W = document.documentElement.clientWidth
  out.hScroll = document.documentElement.scrollWidth > W + 2

  // 1. Text contrast, WCAG AA
  for (const el of document.querySelectorAll('body *')) {
    if (el.children.length) continue
    const t = (el.textContent || '').trim(); if (t.length < 2) continue
    if (!vis(el)) continue
    const cs = getComputedStyle(el); const fg = parse(cs.color); if (!fg) continue
    const bg = bgOf(el)
    const L1 = lum(fg), L2 = lum(bg)
    const ratio = (Math.max(L1,L2) + 0.05) / (Math.min(L1,L2) + 0.05)
    const px = parseFloat(cs.fontSize), bold = Number(cs.fontWeight) >= 700
    const need = (px >= 24 || (px >= 18.66 && bold)) ? 3 : 4.5
    if (ratio < need) out.contrast.push({ t: t.slice(0,40), ratio: +ratio.toFixed(2), need, px, fg: cs.color, bg: 'rgb(' + bg.join(',') + ')' })
  }

  // 2. Touch target size. Inline links inside a paragraph are exempt.
  for (const el of document.querySelectorAll('button, a[href], [role=slider], [role=option], input, select, textarea')) {
    if (!vis(el)) continue
    const r = el.getBoundingClientRect()
    if (r.height >= 24 && r.width >= 24) continue
    const p = el.closest('p')
    const inlineInProse = p && p.textContent.trim().length > el.textContent.trim().length + 20
    if (inlineInProse) continue
    out.targets.push({ t: (el.innerText || el.getAttribute('aria-label') || '').slice(0,28), w: Math.round(r.width), h: Math.round(r.height) })
  }

  // 3. Form control font size. Under 16px makes mobile Safari zoom the page.
  for (const el of document.querySelectorAll('input, textarea, select')) {
    if (!vis(el)) continue
    if (['checkbox','radio','range','hidden','submit','button'].includes(el.type)) continue
    const px = parseFloat(getComputedStyle(el).fontSize)
    if (px < 16) out.fields.push({ t: (el.placeholder || el.getAttribute('aria-label') || el.type || '').slice(0,28), px })
  }

  // 4. Accessible names on interactive elements
  for (const el of document.querySelectorAll('button, a[href], input, select, textarea, [role=slider]')) {
    if (!vis(el)) continue
    const name = (el.getAttribute('aria-label') || el.innerText || el.getAttribute('title') || el.getAttribute('placeholder') || '').trim()
    const labelled = el.id && document.querySelector('label[for="' + el.id + '"]')
    if (!name && !labelled && !el.getAttribute('aria-labelledby')) {
      out.names.push({ tag: el.tagName, cls: (el.className || '').toString().slice(0,30) })
    }
  }

  // 5. Text painted over by something with a higher stacking order.
  //    This is the check that would have caught the clipped headline.
  for (const el of document.querySelectorAll('h1, h2, h3, p, a, button, span, li')) {
    if (!vis(el) || el.children.length) continue
    const t = (el.textContent || '').trim(); if (t.length < 4) continue
    const r = el.getBoundingClientRect()
    if (r.width < 8 || r.height < 8) continue
    if (r.bottom < 0 || r.top > innerHeight) continue
    // sample the trailing edge of the text, where an overlap shows up first
    const x = Math.min(W - 2, r.right - 6), y = Math.min(innerHeight - 2, r.top + r.height / 2)
    if (x < 0 || y < 0) continue
    const top = document.elementFromPoint(x, y)
    if (!top || top === el || el.contains(top) || top.contains(el)) continue
    // Only a thing that actually PAINTS can hide text. An ancestor-less sibling
    // with no background is just the point landing in padding, and flagging
    // that produced dozens of false positives on the first run. Require the
    // covering element to be opaque, or to be an image or canvas.
    const tcs = getComputedStyle(top)
    const a = (tcs.backgroundColor.match(/[\d.]+/g) || [])[3]
    const opaque = tcs.backgroundColor !== 'transparent' && tcs.backgroundColor !== 'rgba(0, 0, 0, 0)' && (a === undefined || Number(a) > 0.5)
    const paints = opaque || ['IMG','CANVAS','VIDEO','svg'].includes(top.tagName)
    if (!paints) continue
    // and it must genuinely sit over the text box, not merely touch its edge
    const tr = top.getBoundingClientRect()
    const overlapW = Math.min(tr.right, r.right) - Math.max(tr.left, r.left)
    if (overlapW < Math.min(24, r.width * 0.15)) continue
    out.occluded.push({ t: t.slice(0,44), by: top.tagName + '.' + (top.className || '').toString().slice(0,24) })
  }

  // 6. House style: no em dashes, and no sentence left broken by a dash removal
  const body = document.body.innerText
  out.emDash = body.includes('\\u2014')
  const m = body.match(/[a-z,)][.]\\s+[a-z]{2,}/g)
  if (m) out.brokenSentence = m.filter(s => !/\\b(js|ts|com|org|png|svg|md)\\b/.test(s)).slice(0,6)
  return out
})()`

async function auditPage(page, url, vp, label) {
  try {
    await page.goto(BASE + url, { waitUntil: 'networkidle', timeout: 45000 })
  } catch {
    await page.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {})
  }
  await page.waitForTimeout(1200)
  const r = await page.evaluate(AUDIT)
  const where = `${label}${url} @${vp.name}`

  check(r.contrast.length === 0, `${where} contrast`,
    r.contrast.slice(0,3).map(c => `"${c.t}" ${c.ratio}:1 needs ${c.need} (${c.fg} on ${c.bg})`).join(' | '))
  check(r.targets.length === 0, `${where} touch targets`,
    r.targets.slice(0,3).map(t => `"${t.t}" ${t.w}x${t.h}`).join(' | '))
  check(r.names.length === 0, `${where} accessible names`,
    r.names.slice(0,3).map(n => `${n.tag}.${n.cls}`).join(' | '))
  // ADVISORY, not a failure. Deciding whether one box genuinely hides another
  // from a hit test alone is unreliable: adjacent opaque panels trip it
  // constantly. It stays because it is the only check that would have caught
  // the clipped headline, and a short list worth two seconds of looking is
  // better than a red build nobody trusts.
  if (r.occluded.length) advisories.push(`${where} possible overlap: ` +
    r.occluded.slice(0,2).map(o => `"${o.t}" under ${o.by}`).join(' | '))
  check(!r.hScroll, `${where} no sideways scroll`)
  check(!r.emDash, `${where} no em dashes`)
  check(r.brokenSentence.length === 0, `${where} no broken sentences`, r.brokenSentence.join(' | '))
  if (vp.name === 'mobile') {
    check(r.fields.length === 0, `${where} field size >= 16px`,
      r.fields.slice(0,3).map(f => `"${f.t}" ${f.px}px`).join(' | '))
  }
}

// ── Credential, if one exists ────────────────────────────────────────────────
function readEnv() {
  const f = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(f)) return {}
  const env = {}
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    if (!line.includes('=') || line.trim().startsWith('#')) continue
    const i = line.indexOf('=')
    const v = line.slice(i + 1).trim().replace(/^["']|["']$/g, '')
    if (v) env[line.slice(0, i).trim()] = v
  }
  return env
}

/**
 * Returns a Supabase session for the QA account, or null.
 *
 * Two routes, both of which keep the secret out of the browser and out of this
 * file. A service role key mints a link with no password involved at all. A QA
 * password is the lower privilege option and goes straight to the auth API
 * rather than into a login form.
 */
async function mintSession(env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL, anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) return null
  const { createClient } = await import('@supabase/supabase-js')

  if (env.SUPABASE_SERVICE_ROLE_KEY && env.E2E_EMAIL) {
    const admin = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email: env.E2E_EMAIL })
    if (error) return null
    const c = createClient(url, anon, { auth: { persistSession: false } })
    const { data: s } = await c.auth.verifyOtp({ token_hash: data.properties.hashed_token, type: 'magiclink' })
    return s?.session || null
  }
  if (env.E2E_EMAIL && env.E2E_PASSWORD) {
    const c = createClient(url, anon, { auth: { persistSession: false } })
    const { data: s } = await c.auth.signInWithPassword({ email: env.E2E_EMAIL, password: env.E2E_PASSWORD })
    return s?.session || null
  }
  return null
}

// ── Run ──────────────────────────────────────────────────────────────────────
const env = readEnv()
const session = await mintSession(env).catch(() => null)

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })

console.log(`\n=== UI audit against ${BASE} ===`)
console.log(session ? 'signed in, auditing private pages too\n' : 'no E2E credential, auditing public pages only\n')

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.isMobile, hasTouch: vp.hasTouch,
    // Entrance animations are rAF driven and never settle in a headless tab.
    // Asking for reduced motion makes the page render finished, which is also
    // what a motion sensitive person sees. See components/Motion.tsx.
    reducedMotion: 'reduce',
    userAgent: vp.isMobile
      ? 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36'
      : undefined,
  })
  const page = await ctx.newPage()

  if (session) {
    const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]
    await page.addInitScript(([key, value]) => {
      try { localStorage.setItem(key, value) } catch {}
    }, [`sb-${ref}-auth-token`, JSON.stringify(session)])
  }

  for (const url of PUBLIC_PAGES) await auditPage(page, url, vp, '')
  if (session) for (const url of PRIVATE_PAGES) await auditPage(page, url, vp, '')

  await ctx.close()
}
await browser.close()

console.log('\n' + '='.repeat(52))
if (failures.length) {
  console.log('FAILURES')
  for (const f of failures) console.log('  FAIL  ' + f)
  console.log('')
}
if (advisories.length) {
  console.log('ADVISORY (look, do not necessarily fix)')
  for (const a of advisories.slice(0, 8)) console.log('  ....  ' + a)
  console.log('')
}
console.log(`  ${pass} passed, ${fail} failed, ${advisories.length} advisory`)
console.log('='.repeat(52) + '\n')
process.exit(fail ? 1 : 0)
