import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// A Supabase client for API routes that acts AS THE CALLING USER.

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
