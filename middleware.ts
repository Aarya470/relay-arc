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

export function middleware(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'

  const { pathname } = req.nextUrl

  // ── API rate limits ──────────────────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
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

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
