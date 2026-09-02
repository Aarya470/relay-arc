'use client'
// The private metrics page. Two numbers big, everything else small.
//
// Enter the admin key once and it is remembered locally. Nothing here is public,
// and the API it calls returns aggregates only — never a name or a row.
import { useState, useEffect, useCallback } from 'react'

const INK = '#141413', INK2 = '#5C5A52', INK3 = '#6F6D65'
const CREAM = '#B3DDAC', BORDER = '#98C890'
const GREEN = '#42623C', ORANGE = '#D97757', CRIT = '#A33417', WARN = '#A87200'
const mono = 'var(--font-mono, monospace)'

interface Metrics {
  generated_at: string
  headline: {
    complete_medical_ids: number
    day30_retained: number
    day30_cohort_size: number
    day30_retention_pct: number | null
  }
  funnel: Record<string, number>
  activity: Record<string, number>
  emergencies: Record<string, number>
  notes: string[]
}

const LABELS: Record<string, string> = {
  profiles_created: 'Signed up',
  with_a_name: 'Entered a name',
  with_blood_type: 'Entered blood type',
  with_a_diagnosis: 'Entered a diagnosis',
  with_medications: 'Added medications',
  with_emergency_contacts: 'Added emergency contacts',
  fully_complete: 'Complete medical ID',
}

export default function AdminMetrics() {
  const [key, setKey] = useState('')
  const [data, setData] = useState<Metrics | null>(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (k: string) => {
    setLoading(true); setErr('')
    try {
      const res = await fetch(`/api/admin/metrics?key=${encodeURIComponent(k)}`)
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setErr(j.error || 'Could not load'); setLoading(false); return
      }
      setData(await res.json())
      try { localStorage.setItem('relay_admin_key', k) } catch {}
    } catch {
      setErr('Network error')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    try {
      const k = localStorage.getItem('relay_admin_key')
      if (k) { setKey(k); load(k) }
    } catch {}
  }, [load])

  if (!data) return (
    <div style={{ minHeight: '100dvh', background: CREAM, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ borderTop: `3px solid ${INK}`, paddingTop: '12px', marginBottom: '20px' }}>
          <span style={{ color: INK, fontFamily: mono, fontSize: '11px', fontWeight: 700, letterSpacing: '1.8px', textTransform: 'uppercase' }}>
            Relay metrics — private
          </span>
        </div>
        <input
          value={key} onChange={e => setKey(e.target.value)} type="password"
          onKeyDown={e => e.key === 'Enter' && load(key.trim())}
          placeholder="admin key"
          style={{ width: '100%', boxSizing: 'border-box', padding: '13px 15px', border: `1.5px solid ${INK}`, borderRadius: 0, fontFamily: mono, fontSize: '15px', outline: 'none', marginBottom: '10px', background: '#FFF' }}
        />
        {err && <p style={{ color: CRIT, fontSize: '13px', marginBottom: '10px' }}>{err}</p>}
        <button onClick={() => load(key.trim())} disabled={loading || !key.trim()}
          style={{ width: '100%', background: ORANGE, color: INK, fontWeight: 700, fontSize: '15px', padding: '14px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: loading || !key.trim() ? 0.6 : 1 }}>
          {loading ? 'Loading…' : 'Open'}
        </button>
      </div>
    </div>
  )

  const h = data.headline
  const funnelMax = data.funnel.profiles_created || 1

  return (
    <div style={{ minHeight: '100dvh', background: CREAM, padding: '40px 24px 80px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        <div style={{ borderTop: `3px solid ${INK}`, paddingTop: '12px', marginBottom: '36px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <span style={{ color: INK, fontFamily: mono, fontSize: '11px', fontWeight: 700, letterSpacing: '1.8px', textTransform: 'uppercase' }}>
            Relay metrics — private
          </span>
          <button onClick={() => load(key)} style={{ background: 'none', border: 'none', color: INK3, fontFamily: mono, fontSize: '11px', letterSpacing: '1.2px', textTransform: 'uppercase', cursor: 'pointer', padding: 0 }}>
            {loading ? 'refreshing…' : 'refresh'}
          </button>
        </div>

        {/* ── the two numbers that matter ─────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '14px' }}>
          <div style={{ background: '#FFF', border: `2px solid ${INK}`, padding: '24px' }}>
            <p style={{ color: INK, fontSize: '68px', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1 }}>
              {h.complete_medical_ids}
            </p>
            <p style={{ color: INK, fontFamily: mono, fontSize: '11px', fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase', marginTop: '12px' }}>
              Complete medical IDs
            </p>
            <p style={{ color: INK2, fontSize: '13px', lineHeight: 1.6, marginTop: '8px' }}>
              This is the number to quote. It means: if something happened, this would have helped.
            </p>
          </div>
          <div style={{ background: '#FFF', border: `2px solid ${INK}`, padding: '24px' }}>
            <p style={{ color: h.day30_retention_pct == null ? INK3 : h.day30_retention_pct >= 40 ? GREEN : WARN, fontSize: '68px', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1 }}>
              {h.day30_retention_pct == null ? '—' : `${h.day30_retention_pct}%`}
            </p>
            <p style={{ color: INK, fontFamily: mono, fontSize: '11px', fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase', marginTop: '12px' }}>
              Day-30 retention
            </p>
            <p style={{ color: INK2, fontSize: '13px', lineHeight: 1.6, marginTop: '8px' }}>
              {h.day30_cohort_size === 0
                ? 'Nobody has been signed up for 30 days yet. This stays blank until they have.'
                : `${h.day30_retained} of ${h.day30_cohort_size} people who joined 30+ days ago checked in this week. Target is 40%.`}
            </p>
          </div>
        </div>

        {/* ── funnel ──────────────────────────────────────────────────────── */}
        <Section title="Onboarding funnel — where people stop">
          {Object.entries(data.funnel).map(([k, v]) => {
            const pct = Math.round((v / funnelMax) * 100)
            return (
              <div key={k} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                  <span style={{ color: INK, fontSize: '13.5px', fontWeight: 600 }}>{LABELS[k] || k}</span>
                  <span style={{ color: INK, fontFamily: mono, fontSize: '13px', fontWeight: 700 }}>
                    {v}<span style={{ color: INK3 }}> · {pct}%</span>
                  </span>
                </div>
                <div style={{ height: '22px', background: CREAM, border: `1px solid ${BORDER}`, position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: '0 auto 0 0', width: `${pct}%`, background: k === 'fully_complete' ? GREEN : INK3 }}/>
                </div>
              </div>
            )
          })}
          <p style={{ color: INK2, fontSize: '13px', lineHeight: 1.6, marginTop: '14px' }}>
            The biggest drop between two consecutive rows is your highest-value fix.
          </p>
        </Section>

        <Section title="Activity">
          <Rows obj={data.activity}/>
        </Section>

        <Section title="Emergencies">
          <Rows obj={data.emergencies}/>
        </Section>

        <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: '16px', marginTop: '30px' }}>
          {data.notes.map(n => (
            <p key={n} style={{ color: INK3, fontSize: '12.5px', lineHeight: 1.6, marginBottom: '6px' }}>· {n}</p>
          ))}
          <p style={{ color: INK3, fontFamily: mono, fontSize: '11px', marginTop: '12px' }}>
            generated {new Date(data.generated_at).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#FFF', border: `1px solid ${BORDER}`, padding: '22px', marginTop: '20px' }}>
      <p style={{ color: INK3, fontFamily: mono, fontSize: '10.5px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '16px' }}>
        {title}
      </p>
      {children}
    </div>
  )
}

function Rows({ obj }: { obj: Record<string, number> }) {
  return (
    <>
      {Object.entries(obj).map(([k, v]) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: `1px solid ${BORDER}`, padding: '9px 0' }}>
          <span style={{ color: INK2, fontSize: '13.5px' }}>{k.replace(/_/g, ' ')}</span>
          <span style={{ color: INK, fontFamily: mono, fontSize: '14px', fontWeight: 700 }}>{v}</span>
        </div>
      ))}
    </>
  )
}
