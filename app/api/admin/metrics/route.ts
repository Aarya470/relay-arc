// Private metrics.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Service role so the counts see every row regardless of RLS. This route is gated
// on ADMIN_PORTAL_KEY and returns aggregates only — never a name, never a row.
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } },
)

const DAY = 86_400_000
const iso = (d: number) => new Date(Date.now() - d * DAY).toISOString()

/** A profile counts as "complete" when it would actually help in an emergency. */
function isComplete(p: Record<string, unknown>): boolean {
  const has = (k: string) => {
    const v = p[k]
    if (Array.isArray(v)) return v.length > 0
    return typeof v === 'string' ? v.trim().length > 0 : v != null
  }
  return (
    has('full_name') &&
    has('blood_type') &&
    has('diagnosis') &&
    (has('medications') || has('allergies'))
  )
}

export async function GET(req: NextRequest) {
  const key = req.headers.get('x-admin-key') || new URL(req.url).searchParams.get('key')
  if (!process.env.ADMIN_PORTAL_KEY) {
    return NextResponse.json(
      { error: 'ADMIN_PORTAL_KEY is not set in the environment' },
      { status: 503 },
    )
  }
  if (key !== process.env.ADMIN_PORTAL_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [profiles, checkins, vitals, emergencies, medLogs, pageViews] = await Promise.all([
      admin.from('profiles').select('*'),
      admin.from('checkins').select('user_id, created_at'),
      admin.from('vitals_logs').select('user_id, logged_at'),
      admin.from('emergencies').select('user_id, created_at, status'),
      admin.from('medication_logs').select('user_id, taken, taken_at'),
      admin.from('page_views').select('day, views'),
    ])
    const PV = (pageViews.data || []) as { day: string; views: number }[]
    const cut30 = iso(30).slice(0, 10)
    const views = {
      total: PV.reduce((n, r) => n + (r.views || 0), 0),
      last30: PV.filter((r) => r.day >= cut30).reduce((n, r) => n + (r.views || 0), 0),
      since: PV.length ? PV.map((r) => r.day).sort()[0] : null,
    }

    const P = profiles.data || []
    const C = checkins.data || []
    const V = vitals.data || []
    const E = emergencies.data || []
    const M = medLogs.data || []

    // Generic so the row type survives the filter — a non-generic version narrowed
    // away user_id and then uniq() could not see it.
    type Stamped = { created_at?: string; logged_at?: string; taken_at?: string }
    const since = <T extends Stamped>(rows: T[], d: number): T[] => {
      const cut = iso(d)
      return rows.filter((r) => (r.created_at || r.logged_at || r.taken_at || '') >= cut)
    }
    const uniq = (rows: { user_id?: string }[]) =>
      new Set(rows.map((r) => r.user_id).filter(Boolean)).size

    // Retention: of the people who signed up at least 30 days ago, how many are
    // still checking in? Counting recent signups would flatter the number.
    const cohort30 = P.filter((p) => (p.created_at || '') <= iso(30))
    const active7 = new Set(since(C, 7).map((c) => c.user_id))
    const retained30 = cohort30.filter((p) => active7.has(p.id)).length

    const complete = P.filter(isComplete)

    return NextResponse.json({
      generated_at: new Date().toISOString(),
      views,

      // ── the two that matter ────────────────────────────────────────────────
      headline: {
        complete_medical_ids: complete.length,
        day30_retained: retained30,
        day30_cohort_size: cohort30.length,
        day30_retention_pct: cohort30.length
          ? Math.round((retained30 / cohort30.length) * 100)
          : null,
      },

      // ── the funnel, so the biggest leak is visible ─────────────────────────
      funnel: {
        profiles_created: P.length,
        with_a_name: P.filter((p) => (p.full_name || '').trim()).length,
        with_blood_type: P.filter((p) => (p.blood_type || '').trim()).length,
        with_a_diagnosis: P.filter((p) => (p.diagnosis || '').trim()).length,
        with_medications: P.filter((p) => Array.isArray(p.medications) && p.medications.length)
          .length,
        with_emergency_contacts: P.filter(
          (p) => Array.isArray(p.emergency_contacts) && p.emergency_contacts.length,
        ).length,
        fully_complete: complete.length,
      },

      activity: {
        checkins_7d: since(C, 7).length,
        checkins_30d: since(C, 30).length,
        distinct_users_checking_in_7d: uniq(since(C, 7)),
        distinct_users_checking_in_30d: uniq(since(C, 30)),
        vitals_logged_7d: since(V, 7).length,
        vitals_logged_30d: since(V, 30).length,
        distinct_users_logging_vitals_30d: uniq(since(V, 30)),
        medications_marked_taken_7d: since(M, 7).filter((m) => (m as { taken?: boolean }).taken)
          .length,
      },

      emergencies: {
        total: E.length,
        last_30d: since(E, 30).length,
        currently_active: E.filter((e) => (e as { status?: string }).status === 'active').length,
      },

      // Honest framing so a number is never quoted without its caveat.
      notes: [
        'complete_medical_ids is the number to quote. It means: if something happened, this would have helped.',
        'day30_retention_pct only counts people who signed up 30+ days ago. Recent signups are excluded so the figure is not flattered.',
        'Aggregates only. This endpoint never returns a name, an email, or a single row.',
      ],
    })
  } catch (e) {
    console.error('metrics error', e)
    return NextResponse.json({ error: 'Could not compute metrics' }, { status: 500 })
  }
}
