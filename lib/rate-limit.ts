import { clientIp } from '@/lib/security'
// Request limiting for the public API routes.

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

// Cheap sweep so a long-lived instance does not grow the map forever.
function sweep(now: number) {
  if (buckets.size < 500) return
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k)
}

export type RateLimitResult = {
  ok: boolean
  remaining: number
  retryAfterSeconds: number
}

/**
 * @param key    Something stable per caller. Use clientKey() below.
 * @param limit  Requests allowed inside the window.
 * @param windowMs Length of the window.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  sweep(now)

  const existing = buckets.get(key)
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 }
  }

  existing.count += 1
  if (existing.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    }
  }
  return { ok: true, remaining: limit - existing.count, retryAfterSeconds: 0 }
}

/**
 * Identify the caller from headers the platform sets, not ones a client can
 * forge. See clientIp() in lib/security.ts.
 *
 * The route name is folded into the key so a burst against one endpoint does
 * not lock a person out of a different one, and an SOS is never blocked because
 * someone was clicking around the dashboard.
 */
export function clientKey(req: Request, scope: string): string {
  return `${scope}:${clientIp(req.headers)}`
}

/** 429 with the headers a well-behaved client will honour. */
export function tooManyRequests(r: RateLimitResult): Response {
  return new Response(
    JSON.stringify({ error: 'Too many requests. Wait a moment and try again.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(r.retryAfterSeconds),
      },
    },
  )
}
