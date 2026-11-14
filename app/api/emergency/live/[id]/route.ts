import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash, randomBytes } from 'crypto'
import { rateLimit, clientKey, tooManyRequests } from '@/lib/rate-limit'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// The shared link needs no account, but it is locked to devices. The first
// devices to open it (one per emergency contact, plus spares for the patient
// and a driver) are remembered with a cookie the page cannot read. Any other
// device that gets hold of the link later is refused.
const COOKIE = 'relay_device'
const SPARE_DEVICES = 2
const MAX_DEVICES = 10
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = rateLimit(clientKey(req, 'live'), 60, 60_000)
  if (!limited.ok) return tooManyRequests(limited)

  const { id } = await params
  if (!UUID.test(id)) return NextResponse.json({ error: 'Emergency not found' }, { status: 404 })

  // Fetch emergency
  const { data: emergency, error } = await supabaseAdmin
    .from('emergencies')
    .select('id, user_id, emergency_type, status, created_at')
    .eq('id', id)
    .single()

  if (error || !emergency) {
    return NextResponse.json({ error: 'Emergency not found' }, { status: 404 })
  }

  // Patient first name and how many contacts were told (not the full profile)
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name, emergency_contacts')
    .eq('id', emergency.user_id)
    .single()

  // ── Device lock ──────────────────────────────────────────────────────────
  let device = req.cookies.get(COOKIE)?.value
  const isNew = !device || !/^[0-9a-f]{64}$/.test(device)
  if (isNew) device = randomBytes(32).toString('hex')
  const deviceHash = createHash('sha256').update(`${id}:${device}`).digest('hex')

  const { data: seen } = await supabaseAdmin
    .from('emergency_viewers')
    .select('device_hash')
    .eq('emergency_id', id)

  // If the table is missing or unreadable, fail closed for new devices only.
  const known = (seen || []).some((r) => r.device_hash === deviceHash)
  if (!known) {
    const contacts = Array.isArray(profile?.emergency_contacts) ? profile.emergency_contacts.length : 0
    const allowed = Math.min(MAX_DEVICES, Math.max(1, contacts) + SPARE_DEVICES)
    if (!seen || seen.length >= allowed) {
      return NextResponse.json(
        { error: 'This link is already in use on other devices.', locked: true },
        { status: 403 },
      )
    }
    const { error: insertError } = await supabaseAdmin
      .from('emergency_viewers')
      .insert({ emergency_id: id, device_hash: deviceHash })
    if (insertError && insertError.code !== '23505') {
      return NextResponse.json({ error: 'Could not open this link.' }, { status: 503 })
    }
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'Your family member'

  const res = NextResponse.json({
    id: emergency.id,
    type: emergency.emergency_type,
    status: emergency.status,
    startedAt: emergency.created_at,
    patientFirstName: firstName,
  })
  if (isNew) {
    res.cookies.set(COOKIE, device!, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })
  }
  return res
}
