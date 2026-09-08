// Request limiting for the public API routes.
//
// WHY THIS EXISTS
// Nothing in app/api limited anything. Six of those routes forward text to a
// paid language model, and /api/health/ingest writes to a profile using a token
// in the request. An unlimited public endpoint that spends money per call is a
// bill waiting to happen, and an unlimited endpoint that writes to a row is a
// way to hammer someone else's record.
//
// WHAT THIS IS NOT
// It is in-memory, so each serverless instance counts on its own and a burst
// spread across instances gets through proportionally. That is a real weakness
// and it is the correct trade here: the alternative is a round trip to Redis on
// the hot path of an emergency route. This stops scripted abuse and accidental
// loops, which is what actually happens. If the project ever needs a hard
// guarantee, this is the seam to replace with a durable counter.
//
// It also resets when an instance recycles. Again, deliberate: failing open is
// the right direction for a route that might be carrying an SOS.

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
 * Identify the caller. x-forwarded-for is the first entry on Vercel and is the
 * client address. It can be spoofed in general, but not through Vercel's proxy,
 * which is the only path to these routes in production.
 *
 * The route name is folded into the key so a burst against one endpoint does
 * not lock a person out of a different one, and an SOS is never blocked because
 * someone was clicking around the dashboard.
 */
export function clientKey(req: Request, scope: string): string {
  const fwd = req.headers.get('x-forwarded-for') ?? ''
  const ip = fwd.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown'
  return `${scope}:${ip}`
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
    }
  )
}
