// POST /api/pageview
//
// Records that a path was viewed. Nothing about who viewed it.
//
// The request body carries a path and nothing else. This route deliberately
// does not read the IP, the user agent, the referrer or the session, because
// the moment any of those are stored the table stops being aggregate and
// starts being personal data, and then it needs a legal basis, a retention
// policy and a line in the privacy policy.
//
// The IP is used for one thing only, rate limiting, and it never reaches the
// database.
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit, clientKey, tooManyRequests } from '@/lib/rate-limit'
import { PUBLIC_ROUTES } from '@/lib/site'

export const dynamic = 'force-dynamic'

// An allow-list rather than free text. Without it, anyone can write arbitrary
// rows by posting invented paths, and the table fills with junk that makes the
// real numbers useless.
const ALLOWED = new Set<string>(PUBLIC_ROUTES.map(r => r.path))

export async function POST(req: NextRequest) {
  // Generous. A person navigating quickly should never see this, and a script
  // trying to inflate a count will.
  const limited = rateLimit(clientKey(req, 'pageview'), 40, 60_000)
  if (!limited.ok) return tooManyRequests(limited)

  let path: unknown
  try {
    const body = await req.json()
    path = body?.path
  } catch {
    return new Response(null, { status: 204 })
  }

  if (typeof path !== 'string' || !ALLOWED.has(path)) {
    // Not an error worth surfacing. A view that cannot be counted is not a
    // problem the visitor should ever hear about.
    return new Response(null, { status: 204 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return new Response(null, { status: 204 })

  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } })
    await supabase.rpc('bump_page_view', { p_path: path })
  } catch {
    // Counting is the least important thing this server does. It fails silently.
  }

  return new Response(null, { status: 204 })
}
