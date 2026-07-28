import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { code, accepting, cath_lab, beds_free, incoming_id, incoming_status } = await req.json()
    if (!code || typeof code !== 'string') return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
    const { data: partner } = await admin.from('hospital_partners')
      .select('id').eq('access_code', code).single()
    if (!partner) return NextResponse.json({ error: 'Unknown code' }, { status: 401 })

    if (incoming_id && ['arrived', 'cancelled'].includes(incoming_status)) {
      await admin.from('er_incoming').update({ status: incoming_status })
        .eq('id', incoming_id).eq('partner_id', partner.id)
      return NextResponse.json({ ok: true })
    }

    const patch: any = { status_updated_at: new Date().toISOString() }
    if (typeof accepting === 'boolean') patch.accepting = accepting
    if (cath_lab === null || typeof cath_lab === 'boolean') patch.cath_lab = cath_lab
    if (beds_free === null || (typeof beds_free === 'number' && beds_free >= 0 && beds_free < 10000)) patch.beds_free = beds_free
    await admin.from('hospital_partners').update(patch).eq('id', partner.id)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
