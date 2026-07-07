/**
 * POST /api/health/ingest
 * Accepts Apple Health data from an iOS Shortcut.
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

export const dynamic = 'force-dynamic'

// Use service role key so we can look up users by their ingest token
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type ReadingType = 'heart_rate' | 'blood_pressure' | 'oxygen_saturation' | 'respiratory_rate' | 'steps' | 'hrv' | 'weight'

interface Reading {
  type: ReadingType
  value?: number
  systolic?: number
  diastolic?: number
  unit?: string
  timestamp?: string
}

export async function POST(req: NextRequest) {
  try {
    let body: any
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { api_key, source = 'apple_health', readings } = body

    if (!api_key) return NextResponse.json({ error: 'Missing api_key' }, { status: 401 })
    if (!Array.isArray(readings) || readings.length === 0) {
      return NextResponse.json({ error: 'No readings provided' }, { status: 400 })
    }

    // Look up user by ingest token
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('health_ingest_token', api_key)
      .single()

    if (profileErr || !profile) {
      return NextResponse.json({ error: 'Invalid api_key' }, { status: 401 })
    }

    const userId = profile.id
    const now = new Date().toISOString()

    // Group readings by timestamp to batch into single vitals_log rows
    const byTimestamp = new Map<string, Record<string, any>>()

    for (const r of readings as Reading[]) {
      const ts = r.timestamp || now
      if (!byTimestamp.has(ts)) byTimestamp.set(ts, { user_id: userId, source, logged_at: ts })
      const row = byTimestamp.get(ts)!

      switch (r.type) {
        case 'heart_rate':         row.heart_rate = r.value;              break
        case 'blood_pressure':     row.systolic = r.systolic; row.diastolic = r.diastolic; break
        case 'oxygen_saturation':  row.oxygen_saturation = r.value;       break
        case 'respiratory_rate':   row.respiratory_rate = r.value;        break
        case 'steps':              row.steps = r.value;                   break
        case 'hrv':                row.hrv_ms = r.value;                  break
        case 'weight':             row.weight_kg = r.value;               break
      }
    }

    const rows = Array.from(byTimestamp.values())

    // Upsert vitals — use logged_at as the conflict target to avoid duplicates from repeated syncs
    const { error: insertErr } = await supabase
      .from('vitals_logs')
      .upsert(rows, { onConflict: 'user_id,logged_at' })

    if (insertErr) {
      // Fall back to insert (if upsert isn't supported on this schema)
      const { error: fallbackErr } = await supabase.from('vitals_logs').insert(rows)
      if (fallbackErr) {
        console.error('Vitals ingest error:', fallbackErr)
        return NextResponse.json({ error: 'Failed to store readings', detail: fallbackErr.message }, { status: 500 })
      }
    }

    // Trigger background health intelligence analysis (non-blocking)
    // We don't await this — fire and forget so the Shortcut gets a fast response
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://relay-arc.vercel.app'}/api/groq/health-intelligence`, {
      method: 'POST',
      headers: { 'x-internal-user-id': userId },
    }).catch(() => { /* silent */ })

    return NextResponse.json({
      ok: true,
      stored: rows.length,
      message: `${readings.length} reading(s) ingested`,
    })

  } catch (e: any) {
    console.error('Ingest error:', e)
    return NextResponse.json({ error: e?.message || 'Ingest failed' }, { status: 500 })
  }
}
