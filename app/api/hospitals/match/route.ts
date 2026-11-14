import { readJson } from '@/lib/security'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit, clientKey, tooManyRequests } from '@/lib/rate-limit'

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
  const limited = rateLimit(clientKey(req, 'hospitals-match'), 60, 60000)
  if (!limited.ok) return tooManyRequests(limited)

  try {
    const { candidates } = ((await readJson<any>(req)) ?? {})
    if (!Array.isArray(candidates) || candidates.length > 12) {
      return NextResponse.json({ error: 'Invalid candidates' }, { status: 400 })
    }
    const { data: partners } = await admin
      .from('hospital_partners')
      .select(
        'name, lat, lng, accepting, cath_lab, stroke_unit, trauma_unit, beds_free, status_updated_at',
      )
    const statuses: Record<string, any> = {}
    for (const c of candidates) {
      if (typeof c?.lat !== 'number' || typeof c?.lng !== 'number') continue
      const hit = (partners || []).find((p) => dist(p.lat, p.lng, c.lat, c.lng) < 400)
      if (hit) {
        statuses[c.id] = {
          name: hit.name,
          accepting: hit.accepting,
          cathLab: hit.cath_lab,
          strokeUnit: hit.stroke_unit,
          traumaUnit: hit.trauma_unit,
          bedsFree: hit.beds_free,
          updatedAt: hit.status_updated_at,
        }
      }
    }
    return NextResponse.json({ statuses })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
