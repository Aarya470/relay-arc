import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// A Supabase client for API routes that acts AS THE CALLING USER.
//
// THE BUG THIS EXISTS TO PREVENT
// Four routes did this:
//
//     const supabase = createClient(URL, ANON_KEY)          // module scope
//     const { data: { user } } = await supabase.auth.getUser(token)
//     await supabase.from('vitals_logs').insert({ user_id: user.id, ... })
//
// The identity check is fine, because getUser takes the token as an argument.
// The write is not. That client holds the anon key and no session, so inside
// Postgres auth.uid() is null, and any row-level security policy of the usual
// shape `auth.uid() = user_id` rejects the write. The route then returns 500.
//
// It is a convincing bug because the code reads as though it is authenticated.
// It verifies a real token, it gets a real user back, and it uses that user's
// id in the payload. The part that is missing is invisible: the JWT is never
// attached to the connection that does the writing.
//
// This broke recording vitals, which the manual entry form on /vitals posts to,
// and vitals are what the NEWS2 risk engine scores. So the app could not save
// the readings its own escalation logic depends on.
//
// WHY NOT THE SERVICE ROLE
// It would work, and it would be wrong. The service role bypasses RLS
// completely, so a bug in a route becomes a bug that can read or write any
// user's rows. Forwarding the caller's token keeps every existing policy doing
// its job: the route can do exactly what that person could do and nothing more.
// The service role belongs in the handful of routes that genuinely act as the
// system rather than as a person, such as the hospital feed and the audit trail.

export type RouteAuth =
  | { ok: true; supabase: SupabaseClient; userId: string; token: string }
  | { ok: false; status: 401; error: string }

/**
 * Reads the bearer token, confirms it, and returns a client bound to it.
 *
 * Every query made through the returned client runs with that user's identity,
 * so RLS applies normally.
 */
export async function authedClient(req: Request): Promise<RouteAuth> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) return { ok: false, status: 401, error: 'Auth unavailable' }

  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return { ok: false, status: 401, error: 'Unauthorized' }

  // The token travels on the client itself, which is the whole point: it is
  // what makes auth.uid() resolve for every statement this client runs.
  const supabase = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return { ok: false, status: 401, error: 'Unauthorized' }

  return { ok: true, supabase, userId: data.user.id, token }
}
