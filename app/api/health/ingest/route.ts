/**
 * POST /api/health/ingest
 * Accepts Apple Watch / Apple Health data pushed from the iPhone: Health Auto
 * Export's REST automation, or an iOS Shortcut. Parsing: lib/health/ingest-parse.ts.
 * Expects JSON body with an API key (user-specific token) + readings.
 *
 * Body shape:
 * {
 *   "api_key": "<user's ingest token>",
 *   "source": "apple_health" | "manual",
 *   "readings": [
 *     { "type": "heart_rate",         "value": 72,        "unit": "bpm",   "timestamp": "2026-07-07T08:00:00Z" },
 *     { "type": "blood_pressure",     "systolic": 118, "diastolic": 76,   "timestamp": "2026-07-07T08:00:00Z" },
 *     { "type": "oxygen_saturation",  "value": 98,        "unit": "pct",   "timestamp": "2026-07-07T08:00:00Z" },
 *     { "type": "respiratory_rate",   "value": 14,        "unit": "bpm",   "timestamp": "2026-07-07T08:00:00Z" },
 *     { "type": "steps",              "value": 3200,      "unit": "count", "timestamp": "2026-07-07T08:00:00Z" },
 *     { "type": "hrv",                "value": 45,        "unit": "ms",    "timestamp": "2026-07-07T08:00:00Z" },
 *     { "type": "weight",             "value": 72.5,      "unit": "kg",    "timestamp": "2026-07-07T08:00:00Z" }
 *   ]
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit, clientKey, tooManyRequests } from '@/lib/rate-limit'
import { SITE_URL } from '@/lib/site'
import { parseIngestBody } from '@/lib/health/ingest-parse'

export const dynamic = 'force-dynamic'

// Use service role key so we can look up users by their ingest token
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// The key can arrive three ways, so whichever app sends the data needs the
// least setup: in the URL (?key=..., one paste in Health Auto Export or a
// Shortcut), as an X-API-Key header, or as api_key in the JSON body.
function keyFrom(req: NextRequest, body: any): string | null {
  return req.nextUrl.searchParams.get('key') || req.headers.get('x-api-key') || body?.api_key || null
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(clientKey(req, 'health-ingest'), 60, 60000)
  if (!limited.ok) return tooManyRequests(limited)

  try {
    let body: any
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const api_key = keyFrom(req, body)
    if (!api_key) return NextResponse.json({ error: 'Missing key' }, { status: 401 })

    // Look up user by ingest token
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('health_ingest_token', api_key)
      .single()

    if (profileErr || !profile) {
      return NextResponse.json({ error: 'Invalid key' }, { status: 401 })
    }

    const userId = profile.id
    const parsed = parseIngestBody(body)
    if (parsed.length === 0) {
      return NextResponse.json({ ok: true, stored: 0, message: 'Nothing usable in that payload (heart rate, breathing, oxygen or blood pressure)' })
    }
    const rows = parsed.map(r => ({ ...r, user_id: userId, source: 'apple_health' }))

    // Upsert on (user_id, logged_at) so a watch re-sending the same hour does not duplicate it
    const { error: insertErr } = await supabase
      .from('vitals_logs')
      .upsert(rows, { onConflict: 'user_id,logged_at' })

    if (insertErr) {
      const { error: fallbackErr } = await supabase.from('vitals_logs').insert(rows)
      if (fallbackErr) {
        console.error('Vitals ingest error:', fallbackErr)
        return NextResponse.json({ error: 'Failed to store readings', detail: fallbackErr.message }, { status: 500 })
      }
    }

    // Background health intelligence analysis (fire and forget)
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || SITE_URL}/api/groq/health-intelligence`, {
      method: 'POST',
      headers: { 'x-internal-user-id': userId },
    }).catch(() => { /* silent */ })

    return NextResponse.json({ ok: true, stored: rows.length, message: `${rows.length} reading(s) synced` })
  } catch (e: any) {
    console.error('Ingest error:', e)
    return NextResponse.json({ error: e?.message || 'Ingest failed' }, { status: 500 })
  }
}
