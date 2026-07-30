// Deterministic deterioration risk. No language model, no external API.
//
// The scoring lives in lib/risk (pure, zero-dependency, client-safe) so the
// dashboard can run the exact same function locally with no network — this route
// exists for the server-side paths: care-team alerting and background jobs.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { assessRisk, type VitalsSample } from '@/lib/risk'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // 21 days is what the personal-baseline layer needs to establish a median.
    const since = new Date(Date.now() - 21 * 86400000).toISOString()
    const [{ data: vitals }, { data: checkins }] = await Promise.all([
      supabase
        .from('vitals_logs')
        .select('heart_rate, systolic, diastolic, oxygen_sat, resp_rate, logged_at')
        .eq('user_id', user.id)
        .gte('logged_at', since)
        .order('logged_at', { ascending: false })
        .limit(60),
      supabase
        .from('checkins')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    const risk = assessRisk((vitals || []) as VitalsSample[], {
      checkinDates: (checkins || []).map((c: { created_at: string }) => c.created_at),
    })

    // null means "not enough data to say anything" — an honest answer, and
    // distinct from "low risk".
    return NextResponse.json({ risk })
  } catch (e) {
    console.error('Risk assessment error:', e)
    return NextResponse.json({ risk: null })
  }
}
