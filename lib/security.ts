// Shared security helpers for API routes and middleware.
import { createHash, randomInt, timingSafeEqual } from 'crypto'

/**
 * Compare two secrets without leaking where they differ through timing.
 * Both sides are hashed first so the comparison is always the same length.
 */
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

/**
 * The caller's address. On Vercel, x-real-ip and x-vercel-forwarded-for are set
 * by the platform and cannot be supplied by the client. x-forwarded-for is only
 * a fallback, and only its last hop is trusted, because a client can prepend
 * anything it likes to the front of that list.
 */
export function clientIp(headers: Headers): string {
  const real = headers.get('x-real-ip')?.trim()
  if (real) return real
  const vercel = headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()
  if (vercel) return vercel
  const fwd = headers.get('x-forwarded-for')
  if (fwd) {
    const hops = fwd.split(',').map((h) => h.trim()).filter(Boolean)
    if (hops.length) return hops[hops.length - 1]
  }
  return 'unknown'
}

// Control characters, zero width characters and bidirectional overrides. These
// are how a name is made to look like a different name, or how text is hidden.
const INVISIBLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F­​-‏‪-‮⁠-⁩﻿]/g

/**
 * Normalise text from a person. NFKC folds lookalike forms (full width letters,
 * ligatures, composed and decomposed accents) into one form, so two strings
 * that look the same compare the same. Then invisible characters are removed
 * and the length is capped, counted in characters and in bytes.
 */
export function cleanText(input: unknown, maxChars = 200): string {
  if (typeof input !== 'string') return ''
  let s = input.normalize('NFKC').replace(INVISIBLE, '').trim()
  s = Array.from(s).slice(0, maxChars).join('')
  // Cap bytes too. Some systems truncate at a byte limit (bcrypt stops at 72),
  // which is how two different long inputs end up treated as equal.
  while (Buffer.byteLength(s, 'utf8') > maxChars * 4) s = Array.from(s).slice(0, -1).join('')
  return s
}

/** An access code from the operating system's random source, never Math.random. */
export function randomCode(blocks = 2, blockLen = 4): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const block = () =>
    Array.from({ length: blockLen }, () => alphabet[randomInt(alphabet.length)]).join('')
  return Array.from({ length: blocks }, block).join('-')
}

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/** Remove keys that can rewrite an object's prototype, at any depth. */
export function stripDangerousKeys<T>(value: T, depth = 0): T {
  if (depth > 12 || value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map((v) => stripDangerousKeys(v, depth + 1)) as T
  const out: Record<string, unknown> = Object.create(null)
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_KEYS.has(k)) continue
    out[k] = stripDangerousKeys(v, depth + 1)
  }
  return out as T
}

/**
 * Read a JSON body with a size limit and without prototype pollution keys.
 * Returns null for anything that is not a JSON object within the limit.
 */
export async function readJson<T = Record<string, unknown>>(
  req: Request,
  maxBytes = 64_000,
): Promise<T | null> {
  try {
    const text = await req.text()
    if (Buffer.byteLength(text, 'utf8') > maxBytes) return null
    const parsed = JSON.parse(text)
    if (parsed === null || typeof parsed !== 'object') return null
    return stripDangerousKeys(parsed) as T
  } catch {
    return null
  }
}
