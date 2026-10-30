import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { CHAT_MODEL, REASONING_TEXT, createChat } from '@/lib/model'
import Groq from 'groq-sdk'

export const dynamic = 'force-dynamic'

type Check = {
  name: string
  group: string
  ok: boolean
  ms: number | null
  detail: string
  critical: boolean
}

async function timed(fn: () => Promise<{ ok: boolean; detail: string }>) {
  const t0 = Date.now()
  try {
    const r = await fn()
    return { ...r, ms: Date.now() - t0 }
  } catch (e: any) {
    return { ok: false, detail: (e?.message || 'unreachable').slice(0, 80), ms: Date.now() - t0 }
  }
}

let chatProbe: { at: number; r: { ok: boolean; detail: string } } | null = null

export async function GET() {
  const checks: Check[] = []
  const push = (name: string, group: string, critical: boolean, r: any) =>
    checks.push({ name, group, critical, ok: r.ok, ms: r.ms, detail: r.detail })

  // ── Routing: primary + fallback, the core of dispatch ──
  push(
    'FOSSGIS routing (primary)',
    'Routing',
    true,
    await timed(async () => {
      const res = await fetch(
        'https://routing.openstreetmap.de/routed-car/route/v1/driving/72.87,19.11;72.83,19.05?overview=false',
      )
      const j = await res.json()
      return {
        ok: res.ok && j.code === 'Ok',
        detail:
          j.code === 'Ok'
            ? `route ${(j.routes[0].distance / 1000).toFixed(1)} km`
            : `code ${j.code}`,
      }
    }),
  )
  push(
    'OSRM demo (fallback)',
    'Routing',
    false,
    await timed(async () => {
      const res = await fetch(
        'https://router.project-osrm.org/route/v1/driving/72.87,19.11;72.83,19.05?overview=false',
      )
      const j = await res.json().catch(() => ({}))
      return {
        ok: res.ok && j.code === 'Ok',
        detail: res.ok ? `code ${j.code}` : `HTTP ${res.status}`,
      }
    }),
  )
  push(
    'Drive-time matrix (ranking)',
    'Routing',
    true,
    await timed(async () => {
      const res = await fetch(
        'https://routing.openstreetmap.de/routed-car/table/v1/driving/72.87,19.11;72.83,19.05;72.84,19.03?sources=0&annotations=duration',
      )
      const j = await res.json()
      const n = j?.durations?.[0]?.length ?? 0
      return { ok: j.code === 'Ok' && n >= 2, detail: `${n} destinations priced` }
    }),
  )

  // ── Map tiles ──
  push(
    'OpenFreeMap vector style',
    'Map',
    true,
    await timed(async () => {
      const res = await fetch('https://tiles.openfreemap.org/styles/liberty')
      const j = await res.json()
      return {
        ok: res.ok && Array.isArray(j.layers),
        detail: res.ok ? `${j.layers.length} style layers` : `HTTP ${res.status}`,
      }
    }),
  )

  // ── Data plane ──
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  push(
    'Supabase (database + auth)',
    'Data',
    true,
    await timed(async () => {
      if (!url || !anon) return { ok: false, detail: 'not configured' }
      const sb = createClient(url, anon)
      const { error } = await sb.from('profiles').select('id', { count: 'exact', head: true })
      return { ok: !error, detail: error ? error.message.slice(0, 60) : 'reachable' }
    }),
  )
  push(
    'Realtime (Relay Room)',
    'Data',
    false,
    await timed(async () => {
      if (!url) return { ok: false, detail: 'not configured' }
      const res = await fetch(
        url.replace('https://', 'https://') + '/realtime/v1/api/tenants/realtime/health',
        { headers: anon ? { apikey: anon } : {} },
      )
      return { ok: res.status < 500, detail: `HTTP ${res.status}` }
    }),
  )

  // ── Partner network ──
  push(
    'Hospital partner network',
    'Dispatch',
    false,
    await timed(async () => {
      const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!url || !svc) return { ok: false, detail: 'service role not configured' }
      const admin = createClient(url, svc)
      const { count, error } = await admin
        .from('hospital_partners')
        .select('id', { count: 'exact', head: true })
      if (error)
        return {
          ok: false,
          detail: error.message.includes('does not exist')
            ? 'schema not migrated yet'
            : error.message.slice(0, 60),
        }
      return {
        ok: true,
        detail: `${count ?? 0} partner ${count === 1 ? 'facility' : 'facilities'} onboarded`,
      }
    }),
  )

  // ── Language model: is the key accepted, and does the model still exist? ──
  // "Configured" only proved an env var was set.
  push(
    'Language model (check-in, cloud triage)',
    'AI',
    true,
    await timed(async () => {
      const key = process.env.GROQ_API_KEY
      if (!key) return { ok: false, detail: 'GROQ_API_KEY missing' }
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
        cache: 'no-store',
      })
      if (res.status === 401 || res.status === 403)
        return { ok: false, detail: `key rejected (HTTP ${res.status})` }
      if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` }
      const j = await res.json().catch(() => ({}))
      const ids: string[] = (j.data || []).map((m: any) => m.id)
      return ids.includes(CHAT_MODEL)
        ? { ok: true, detail: `${CHAT_MODEL} available` }
        : { ok: false, detail: `${CHAT_MODEL} not offered any more` }
    }),
  )

  // ── Language model: a real (tiny) chat call, the same way the check-in
  // makes one. Listing models only proves the key; this proves a completion
  // actually comes back. Cached for 10 minutes so the page does not spend
  // tokens on every view.
  push(
    'Language model: test chat reply',
    'AI',
    true,
    await timed(async () => {
      const now = Date.now()
      if (chatProbe && now - chatProbe.at < 10 * 60 * 1000) return chatProbe.r
      let r: { ok: boolean; detail: string }
      try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
        const c = await createChat(groq, {
          model: CHAT_MODEL,
          ...REASONING_TEXT,
          temperature: 0.7,
          messages: [
            {
              role: 'user',
              content: 'Reply with one short friendly sentence asking how someone feels today.',
            },
          ],
        })
        const text = c.choices?.[0]?.message?.content || ''
        r = text.trim()
          ? { ok: true, detail: `replied (${c.choices[0].finish_reason})` }
          : { ok: false, detail: `empty reply (${c.choices?.[0]?.finish_reason})` }
      } catch (e: any) {
        const body = e?.error?.error || e?.error || {}
        r = {
          ok: false,
          detail:
            `HTTP ${e?.status ?? '?'} ${body.code || ''} ${String(body.message || e?.message || '').slice(0, 140)}`.trim(),
        }
      }
      chatProbe = { at: now, r }
      return r
    }),
  )

  // ── Configuration (no secrets echoed, presence only) ──
  const cfg = (k: string) => !!process.env[k]
  checks.push({
    name: 'AI triage (Groq key)',
    group: 'Config',
    critical: true,
    ok: cfg('GROQ_API_KEY'),
    ms: null,
    detail: cfg('GROQ_API_KEY') ? 'configured' : 'missing',
  })
  checks.push({
    name: 'Push notifications (VAPID)',
    group: 'Config',
    critical: false,
    ok: cfg('VAPID_PRIVATE_KEY') && cfg('NEXT_PUBLIC_VAPID_KEY'),
    ms: null,
    detail: cfg('VAPID_PRIVATE_KEY') ? 'configured' : 'missing',
  })
  checks.push({
    name: 'Service role (ER board)',
    group: 'Config',
    critical: true,
    ok: cfg('SUPABASE_SERVICE_ROLE_KEY'),
    ms: null,
    detail: cfg('SUPABASE_SERVICE_ROLE_KEY') ? 'configured' : 'missing',
  })
  checks.push({
    name: 'Operations portal key',
    group: 'Config',
    critical: false,
    ok: cfg('ADMIN_PORTAL_KEY'),
    ms: null,
    detail: cfg('ADMIN_PORTAL_KEY') ? 'configured' : 'not set. /admin locked',
  })
  checks.push({
    name: 'Live traffic (TomTom)',
    group: 'Config',
    critical: false,
    ok: cfg('NEXT_PUBLIC_TOMTOM_KEY'),
    ms: null,
    detail: cfg('NEXT_PUBLIC_TOMTOM_KEY') ? 'live traffic active' : 'using time-of-day model',
  })

  const criticalDown = checks.filter((c) => c.critical && !c.ok).length
  return NextResponse.json(
    {
      checkedAt: new Date().toISOString(),
      overall: criticalDown === 0 ? 'operational' : 'degraded',
      criticalDown,
      checks,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
