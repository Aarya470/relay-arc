import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authedClient } from '@/lib/supabase-route'

// Kept only for calls that are genuinely anonymous. Anything that reads or
// writes a user's rows must go through the request-scoped client instead, or
// RLS sees no user. See lib/supabase-route.ts.
const anonSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const CRITICAL_THRESHOLDS = {
  heart_rate: { low: 45, high: 130 },
  systolic: { low: 85, high: 180 },
  diastolic: { low: 50, high: 110 },
  oxygen_sat: { low: 92, high: 101 },
  resp_rate: { low: 8, high: 30 },
}

function isCritical(vitals: Record<string, number | null>): string[] {
  const alerts: string[] = []
  for (const [key, val] of Object.entries(vitals)) {
    if (val === null || val === undefined) continue
    const threshold = CRITICAL_THRESHOLDS[key as keyof typeof CRITICAL_THRESHOLDS]
    if (!threshold) continue
    if (val < threshold.low) alerts.push(`${key.replace('_', ' ')} critically low (${val})`)
    if (val > threshold.high) alerts.push(`${key.replace('_', ' ')} critically high (${val})`)
  }
  return alerts
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authedClient(req)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { supabase } = auth
    const user = { id: auth.userId }

    const body = await req.json()
    const { heart_rate, systolic, diastolic, oxygen_sat, resp_rate } = body

    // Validate numeric values
    const vitals: Record<string, number | null> = {}
    for (const [key, val] of Object.entries({ heart_rate, systolic, diastolic, oxygen_sat, resp_rate })) {
      if (val !== undefined && val !== null && val !== '') {
        const num = parseFloat(String(val))
        if (!isNaN(num) && num > 0) vitals[key] = num
      }
    }

    if (Object.keys(vitals).length === 0) {
      return NextResponse.json({ error: 'No valid vitals provided' }, { status: 400 })
    }

    // Insert vitals log
    const { error: insertError } = await supabase.from('vitals_logs').insert({
      user_id: user.id,
      logged_at: new Date().toISOString(),
      ...vitals,
    })

    if (insertError) {
      console.error('Vitals insert error:', insertError)
      return NextResponse.json({ error: 'Could not save vitals' }, { status: 500 })
    }

    // Check for critical values and record the alert.
    const criticalAlerts = isCritical(vitals)
    if (criticalAlerts.length > 0) {
      // The result of this insert is now checked, because the message below
      // used to promise something this code cannot guarantee.
      //
      // It previously said "Your care team has been notified" unconditionally,
      // with the insert fired as .then(() => {}) so any failure was discarded.
      // Telling someone with a heart rate of 142 that their care team knows,
      // when the row was never written, is the most harmful sentence in this
      // file: it is a reason to sit down and wait instead of calling anyone.
      //
      // Recording the alert is also not the same as delivering it. Nothing here
      // sends a push or an email, so the honest claim is that it has been
      // flagged for the care team, not that anyone has seen it.
      const { error: alertError } = await supabase.from('vitals_alerts').insert({
        user_id: user.id,
        alerts: criticalAlerts,
        vitals,
        created_at: new Date().toISOString(),
      })

      if (alertError) console.error('Vitals alert insert failed:', alertError)

      return NextResponse.json({
        saved: true,
        critical: true,
        alerts: criticalAlerts,
        flagged: !alertError,
        message: alertError
          ? 'Saved, and these readings are outside the safe range. Flagging them for your care team did not work, so tell someone yourself. If you feel unwell, call emergency services.'
          : 'Saved, and these readings are outside the safe range. They have been flagged for your care team. If you feel unwell, call emergency services rather than waiting for a reply.',
      })
    }

    return NextResponse.json({ saved: true, critical: false })
  } catch (e) {
    console.error('Vitals API error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
