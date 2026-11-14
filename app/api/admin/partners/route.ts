import { readJson } from '@/lib/security'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { safeEqual, randomCode } from '@/lib/security'
import { rateLimit, clientKey, tooManyRequests } from '@/lib/rate-limit'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function authed(req: NextRequest) {
  const key = process.env.ADMIN_PORTAL_KEY
  if (!key) return false
  return safeEqual(req.headers.get('x-admin-key'), key)
}

function genCode() {
  return `RELAY-${randomCode(2, 4)}`
}

async function audit(partner_id: string | null, actor: string, action: string, detail: string) {
  try {
    await admin.from('er_audit').insert({ partner_id, actor, action, detail: detail.slice(0, 300) })
  } catch {}
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(clientKey(req, 'admin'), 20, 15 * 60_000)
  if (!limited.ok) return tooManyRequests(limited)
  if (!authed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = ((await readJson<any>(req)) ?? {})

    if (body.op === 'list') {
      const { data: partners } = await admin
        .from('hospital_partners')
        .select('*')
        .order('created_at', { ascending: false })
      const { data: auditRows } = await admin
        .from('er_audit')
        .select('partner_id, actor, action, detail, created_at')
        .order('created_at', { ascending: false })
        .limit(40)
      return NextResponse.json({ partners: partners || [], audit: auditRows || [] })
    }

    if (body.op === 'create') {
      const { name, lat, lng } = body
      if (!name || typeof lat !== 'number' || typeof lng !== 'number') {
        return NextResponse.json({ error: 'Missing name/coordinates' }, { status: 400 })
      }
      const access_code = genCode()
      const { data, error } = await admin
        .from('hospital_partners')
        .insert({ name: String(name).slice(0, 160), lat, lng, access_code })
        .select()
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      await audit(data.id, 'admin', 'partner_created', `${data.name} onboarded`)
      return NextResponse.json({ partner: data })
    }

    if (body.op === 'regenerate') {
      const access_code = genCode()
      const { data } = await admin
        .from('hospital_partners')
        .update({ access_code })
        .eq('id', body.id)
        .select('id, name')
        .single()
      if (data)
        await audit(data.id, 'admin', 'code_regenerated', `${data.name} access code rotated`)
      return NextResponse.json({ access_code })
    }

    if (body.op === 'delete') {
      const { data } = await admin
        .from('hospital_partners')
        .select('name')
        .eq('id', body.id)
        .single()
      await admin.from('hospital_partners').delete().eq('id', body.id)
      await audit(null, 'admin', 'partner_removed', data?.name || body.id)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown op' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
