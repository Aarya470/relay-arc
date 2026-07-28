import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function dist(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export async function POST(req: NextRequest) {
  try {
    const { candidates } = await req.json()
    if (!Array.isArray(candidates) || candidates.length > 12) {
      return NextResponse.json({ error: 'Invalid candidates' }, { status: 400 })
    }
    const { data: partners } = await admin.from('hospital_partners')
      .select('name, lat, lng, accepting, cath_lab, beds_free, status_updated_at')
    const statuses: Record<string, any> = {}
    for (const c of candidates) {
      if (typeof c?.lat !== 'number' || typeof c?.lng !== 'number') continue
      const hit = (partners || []).find(p => dist(p.lat, p.lng, c.lat, c.lng) < 400)
      if (hit) {
        statuses[c.id] = {
          name: hit.name,
          accepting: hit.accepting,
          cathLab: hit.cath_lab,
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
