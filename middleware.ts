import { NextRequest, NextResponse } from 'next/server'

// In-memory sliding window rate limiter.
// Vercel reuses warm Edge instances so this provides meaningful protection.
// Key: "ip:path", value: { count, resetAt }
const limits = new Map<string, { count: number; resetAt: number }>()

// Cleanup stale entries every ~200 requests to avoid unbounded growth
let cleanupCounter = 0
function maybeCleanup() {
  if (++cleanupCounter % 200 !== 0) return
  const now = Date.now()
  for (const [k, v] of limits) {
    if (now > v.resetAt) limits.delete(k)
  }
}

function rateLimit(ip: string, path: string, max: number, windowMs: number): boolean {
  maybeCleanup()
  const key = `${ip}:${path}`
  const now = Date.now()
  const entry = limits.get(key)
  if (!entry || now > entry.resetAt) {
    limits.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= max) return false
  entry.count++
  return true
}

// Headers used for cache poisoning, route override and middleware bypass
// tricks. Nothing legitimate sends these to this site from outside.
const BLOCKED_HEADERS = [
  'x-original-url',
  'x-rewrite-url',
  'x-http-method-override',
  'x-method-override',
  'x-middleware-subrequest',
  'x-forwarded-scheme',
]

// Largest JSON body any route needs. Apple Health pushes are the big one.
const MAX_BODY = 1_000_000
const MAX_BODY_INGEST = 6_000_000

export function middleware(req: NextRequest) {
  // x-real-ip is set by the platform. x-forwarded-for can have anything
  // prepended by the client, so only its last hop is used, and only as a fallback.
  const fwd = req.headers.get('x-forwarded-for')?.split(',').map((h) => h.trim()).filter(Boolean)
  const ip =
    req.headers.get('x-real-ip')?.trim() ||
    req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
    (fwd && fwd.length ? fwd[fwd.length - 1] : '') ||
    'unknown'

  const { pathname } = req.nextUrl

  for (const h of BLOCKED_HEADERS) {
    if (req.headers.has(h)) return new NextResponse('Bad Request', { status: 400 })
  }

  // A request may not carry both a length and chunked encoding, or two lengths.
  // That mismatch is what request smuggling relies on.
  const te = req.headers.get('transfer-encoding')
  const cl = req.headers.get('content-length')
  if ((te && cl) || (cl && !/^\d{1,10}$/.test(cl))) {
    return new NextResponse('Bad Request', { status: 400 })
  }

  // Very long addresses are never real pages here, and long inputs are how a
  // slow pattern match is turned into an outage.
  if (pathname.length > 512 || req.nextUrl.search.length > 2048) {
    return new NextResponse('URI Too Long', { status: 414 })
  }

  // ── API rate limits ──────────────────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    const limit = pathname === '/api/health/ingest' ? MAX_BODY_INGEST : MAX_BODY
    if (cl && Number(cl) > limit) {
      return new NextResponse('Payload Too Large', { status: 413 })
    }

    // Push send: 10 per minute per IP (prevents notification spam)
    if (pathname === '/api/push/send') {
      if (!rateLimit(ip, '/api/push/send', 10, 60_000)) {
        return new NextResponse('Too many requests', {
          status: 429,
          headers: { 'Retry-After': '60', 'Content-Type': 'text/plain' },
        })
      }
    }

    // All other API routes: 60 per minute per IP
    if (!rateLimit(ip, 'api-general', 60, 60_000)) {
      return new NextResponse('Too many requests', {
        status: 429,
        headers: { 'Retry-After': '60', 'Content-Type': 'text/plain' },
      })
    }
  } else if (!rateLimit(ip, 'pages', 600, 60_000)) {
    // Pages: generous for a person, tight for a flood from one address.
    return new NextResponse('Too many requests', {
      status: 429,
      headers: { 'Retry-After': '60', 'Content-Type': 'text/plain' },
    })
  }

  // ── Block suspicious patterns ────────────────────────────────────────────
  const ua = req.headers.get('user-agent') || ''
  const suspiciousUAs = ['sqlmap', 'nikto', 'nessus', 'masscan', 'zgrab', 'nuclei']
  if (suspiciousUAs.some((s) => ua.toLowerCase().includes(s))) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  // Block common path-traversal / injection attempts in URL
  const rawPath = req.nextUrl.pathname + req.nextUrl.search
  if (/(\.\.|%2e%2e|<script|javascript:|%3cscript)/i.test(rawPath)) {
    return new NextResponse('Bad Request', { status: 400 })
  }

  const res = NextResponse.next()
  if (pathname.startsWith('/api/')) {
    // API answers are per person. Never let a shared cache store one.
    res.headers.set('Cache-Control', 'no-store, max-age=0')
    res.headers.set('Vary', 'Authorization, Cookie, Origin')
  }
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
