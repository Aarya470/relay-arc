import { readJson } from '@/lib/security'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit, clientKey, tooManyRequests } from '@/lib/rate-limit'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  const limited = rateLimit(clientKey(req, 'hospital-code'), 20, 15 * 60_000)
  if (!limited.ok) return tooManyRequests(limited)
  try {
    const { code } = ((await readJson<any>(req)) ?? {})
    if (!code || typeof code !== 'string' || code.length > 64) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
    }
    const { data: partner } = await admin
      .from('hospital_partners')
      .select(
        'id, name, accepting, cath_lab, stroke_unit, trauma_unit, beds_free, status_updated_at',
      )
      .eq('access_code', code)
      .single()
    if (!partner) return NextResponse.json({ error: 'Unknown code' }, { status: 401 })

    const { data: incoming } = await admin
      .from('er_incoming')
      .select('id, patient_name, emergency_type, eta_min, live_url, status, created_at')
      .eq('partner_id', partner.id)
      .order('created_at', { ascending: false })
      .limit(25)
    return NextResponse.json({ partner, incoming: incoming || [] })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
