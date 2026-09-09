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

    // Check for critical values and log alert
    const criticalAlerts = isCritical(vitals)
    if (criticalAlerts.length > 0) {
      // Log alert to DB so care team can see it
      await supabase.from('vitals_alerts').insert({
        user_id: user.id,
        alerts: criticalAlerts,
        vitals,
        created_at: new Date().toISOString(),
      }).then(() => {})

      return NextResponse.json({
        saved: true,
        critical: true,
        alerts: criticalAlerts,
        message: 'Vitals saved — critical values detected. Your care team has been notified.',
      })
    }

    return NextResponse.json({ saved: true, critical: false })
  } catch (e) {
    console.error('Vitals API error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
