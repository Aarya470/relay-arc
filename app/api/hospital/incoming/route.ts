import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const anon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function dist(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const {
      data: { user },
    } = await anon.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { hospital, patientName, emergencyType, etaMin, liveUrl } = await req.json()
    if (!hospital?.lat || !hospital?.lng) return NextResponse.json({ connected: false })

    const { data: partners } = await admin.from('hospital_partners').select('id, name, lat, lng')
    const hit = (partners || []).find((p) => dist(p.lat, p.lng, hospital.lat, hospital.lng) < 400)
    if (!hit) return NextResponse.json({ connected: false })

    const { data: row } = await admin
      .from('er_incoming')
      .insert({
        partner_id: hit.id,
        user_id: user.id,
        patient_name: (patientName || 'Relay patient').slice(0, 120),
        emergency_type: String(emergencyType || 'other').slice(0, 40),
        eta_min: typeof etaMin === 'number' ? Math.min(999, Math.max(0, Math.round(etaMin))) : null,
        live_url: typeof liveUrl === 'string' ? liveUrl.slice(0, 300) : null,
      })
      .select('id')
      .single()
    try {
      await admin.from('er_audit').insert({
        partner_id: hit.id,
        actor: 'patient',
        action: 'incoming_dispatched',
        detail: `${(patientName || 'Relay patient').slice(0, 80)} · ${String(emergencyType).slice(0, 30)} · eta ${etaMin ?? '?'}m`,
      })
    } catch {}
    return NextResponse.json({
      connected: true,
      partnerName: hit.name,
      incomingId: row?.id || null,
    })
  } catch {
    return NextResponse.json({ connected: false })
  }
}

// Live updates from the patient's phone: ETA countdown + arrival/cancel.
export async function PATCH(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const {
      data: { user },
    } = await anon.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id, etaMin, status } = await req.json()
    if (!id || typeof id !== 'string')
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    const patch: any = {}
    if (typeof etaMin === 'number') patch.eta_min = Math.min(999, Math.max(0, Math.round(etaMin)))
    if (status && ['arrived', 'cancelled'].includes(status)) patch.status = status
    if (!Object.keys(patch).length) return NextResponse.json({ ok: true })
    await admin.from('er_incoming').update(patch).eq('id', id).eq('user_id', user.id)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
