'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Minus, Plus, ExternalLink, Check } from 'lucide-react'
import { DEMO_PARTNER, DEMO_INCOMING, DEMO_BANNER } from '@/lib/demo-data'

const T1 = '#141413'
const T2 = '#5C5A52'
const T3 = '#6F6D65'
const BORDER = '#98C890'
const ACCENT = '#42623C'
const RED = '#A33417'
const GREEN = '#42623C'
const MONO = 'var(--font-mono, monospace)'

const TYPE_LABELS: Record<string, string> = {
  chest_pain: 'Chest pain', stroke: 'Stroke signs', pots: 'POTS episode',
  mecfs: 'Severe crash', breathing: "Can't breathe", unconscious: 'Unconscious', other: 'Emergency',
}

interface Partner { id: string; name: string; accepting: boolean; cath_lab: boolean | null; stroke_unit: boolean | null; trauma_unit: boolean | null; beds_free: number | null; status_updated_at: string }
interface Incoming { id: string; patient_name: string; emergency_type: string; eta_min: number | null; live_url: string | null; status: string; created_at: string }

export default function HospitalPortal() {
  const [code, setCode] = useState('')
  const [partner, setPartner] = useState<Partner | null>(null)
  const [incoming, setIncoming] = useState<Incoming[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const codeRef = useRef('')
  const knownIds = useRef<Set<string>>(new Set())

  const chime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const gain = ctx.createGain(); gain.gain.value = 0.4; gain.connect(ctx.destination)
      ;[0, 200, 400].forEach(delay => setTimeout(() => {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 950
        o.connect(gain); o.start(); o.stop(ctx.currentTime + 0.15)
      }, delay))
      setTimeout(() => { try { ctx.close() } catch {} }, 1200)
      navigator.vibrate?.([250, 100, 250])
    } catch {}
  }

  // ?demo=1 renders this exact board against synthetic fixtures — no access code,
  // no database, no real patient. The two screens that prove Relay is a system
  // rather than a phone app were both behind a login, so nobody could be shown
  // them without handing over credentials and exposing a real chart.
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    const demo = new URLSearchParams(window.location.search).get('demo') === '1'
    if (demo) {
      setIsDemo(true)
      setPartner(DEMO_PARTNER as any)
      setIncoming(DEMO_INCOMING as any)
      return
    }
    try { const c = localStorage.getItem('relay_hospital_code'); if (c) { setCode(c); connect(c) } } catch {}
  }, [])

  const connect = useCallback(async (c: string) => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/hospital/feed', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: c }),
      })
      if (!res.ok) { setError('Access code not recognized.'); setLoading(false); return }
      const json = await res.json()
      codeRef.current = c
      try { localStorage.setItem('relay_hospital_code', c) } catch {}
      setPartner(json.partner)
      setIncoming(json.incoming)
      ;(json.incoming || []).forEach((x: Incoming) => knownIds.current.add(x.id))
    } catch {
      setError('Could not connect — check your network.')
    }
    setLoading(false)
  }, [])

  // Poll the feed every 10s while connected
  useEffect(() => {
    if (!partner || isDemo) return
    const t = setInterval(async () => {
      try {
        const res = await fetch('/api/hospital/feed', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: codeRef.current }),
        })
        if (res.ok) {
          const json = await res.json()
          setPartner(json.partner)
          setIncoming(json.incoming)
          const fresh = (json.incoming || []).filter((x: Incoming) => x.status === 'incoming' && !knownIds.current.has(x.id))
          if (knownIds.current.size > 0 && fresh.length > 0) chime()
          ;(json.incoming || []).forEach((x: Incoming) => knownIds.current.add(x.id))
        }
      } catch {}
    }, 10000)
    return () => clearInterval(t)
  }, [partner !== null])

  const saveStatus = async (patch: Partial<Partner>) => {
    if (!partner) return
    setSaving(true)
    const next = { ...partner, ...patch, status_updated_at: new Date().toISOString() }
    setPartner(next)
    try {
      await fetch('/api/hospital/status', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeRef.current, accepting: next.accepting, cath_lab: next.cath_lab, stroke_unit: next.stroke_unit, trauma_unit: next.trauma_unit, beds_free: next.beds_free }),
      })
    } catch {}
    setSaving(false)
  }

  const markIncoming = async (id: string, status: 'arrived' | 'cancelled') => {
    setIncoming(prev => prev.map(x => x.id === id ? { ...x, status } : x))
    try {
      await fetch('/api/hospital/status', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeRef.current, incoming_id: id, incoming_status: status }),
      })
    } catch {}
  }

  const ago = (iso: string) => {
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
    return m < 1 ? 'just now' : m < 60 ? `${m}m ago` : `${Math.floor(m / 60)}h ago`
  }

  if (!partner) return (
    <div style={{ minHeight: '100dvh', background: '#B3DDAC', padding: '0 24px' }}>
      <div style={{ maxWidth: '380px', margin: '0 auto', paddingTop: '96px' }}>
        <p style={{ color: T3, fontFamily: MONO, fontSize: '10.5px', fontWeight: 700, letterSpacing: '1.6px', textTransform: 'uppercase', marginBottom: '12px' }}>
          Relay · hospital portal
        </p>
        <h1 style={{ color: T1, fontSize: '30px', fontWeight: 800, letterSpacing: '-1.1px', lineHeight: 1.1, marginBottom: '8px' }}>
          ER dispatch board<span style={{ color: RED }}>.</span>
        </h1>
        <p style={{ color: T2, fontSize: '14px', lineHeight: 1.6, marginBottom: '32px' }}>
          See incoming Relay patients before they arrive, and tell Relay your live capacity so patients are routed correctly.
        </p>
        <p style={{ color: T3, fontSize: '10.5px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', fontFamily: MONO, marginBottom: '8px' }}>Facility access code</p>
        <input
          value={code}
          onChange={e => setCode(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && connect(code.trim())}
          placeholder="LILAVATI-4321"
          style={{ width: '100%', background: '#FFFFFF', border: `1.5px solid ${BORDER}`, borderRadius: '10px', padding: '13px 16px', color: T1, fontSize: '15px', outline: 'none', fontFamily: MONO, marginBottom: '12px' }}
        />
        {error && <p style={{ color: RED, fontSize: '13px', marginBottom: '10px' }}>{error}</p>}
        <button onClick={() => connect(code.trim())} disabled={loading || !code.trim()}
          style={{ width: '100%', background: T1, color: 'white', fontWeight: 600, fontSize: '15px', padding: '15px', borderRadius: '11px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', minHeight: '52px', opacity: loading || !code.trim() ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          {loading ? <Loader2 size={16} className="animate-spin"/> : 'Open the board'}
        </button>
        <p style={{ color: T3, fontSize: '12px', lineHeight: 1.6, marginTop: '18px' }}>
          Partner facilities receive a code from the Relay team. Status you set here is shown to patients being routed.
        </p>
      </div>
    </div>
  )

  const active = incoming.filter(i => i.status === 'incoming')
  const past = incoming.filter(i => i.status !== 'incoming')

  return (
    <div style={{ minHeight: '100dvh', background: '#B3DDAC', maxWidth: '720px', margin: '0 auto', width: '100%', padding: '0 20px 60px' }}>

      {/* A viewer must never be able to mistake demo fixtures for a real chart. */}
      {isDemo && (
        <div style={{ background: '#D97757', color: T1, padding: '9px 14px', margin: '0 -20px 0', textAlign: 'center' }}>
          <span style={{ fontFamily: MONO, fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase' }}>
            {DEMO_BANNER}
          </span>
        </div>
      )}

      {/* Header */}
      <div style={{ paddingTop: '48px', marginBottom: '26px' }}>
        <div style={{ borderTop: `3px solid ${T1}`, paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ color: T1, fontFamily: MONO, fontSize: '11px', fontWeight: 700, letterSpacing: '1.6px', textTransform: 'uppercase' }}>Relay dispatch board</span>
          <span style={{ color: T3, fontFamily: MONO, fontSize: '11px' }}>status updated {ago(partner.status_updated_at)}</span>
        </div>
        <h1 style={{ color: T1, fontSize: '28px', fontWeight: 800, letterSpacing: '-0.9px', lineHeight: 1.1, marginTop: '14px' }}>
          {partner.name}
        </h1>
      </div>

      {/* ── Live capacity ── */}
      <p style={{ color: T3, fontFamily: MONO, fontSize: '10px', fontWeight: 700, letterSpacing: '1.6px', textTransform: 'uppercase', marginBottom: '4px' }}>
        Live capacity — visible to patients being routed
      </p>
      <div style={{ borderTop: `1px solid ${T1}`, marginBottom: '34px' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: `1px solid ${BORDER}` }}>
          <div>
            <p style={{ color: T1, fontSize: '15.5px', fontWeight: 700 }}>Accepting emergency patients</p>
            <p style={{ color: T3, fontSize: '12.5px', marginTop: '2px' }}>Turn off to divert — Relay ranks you down immediately</p>
          </div>
          <button onClick={() => saveStatus({ accepting: !partner.accepting })}
            style={{ width: '120px', padding: '11px 0', borderRadius: '10px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: '13px', letterSpacing: '0.3px', background: partner.accepting ? GREEN : RED, color: 'white' }}>
            {partner.accepting ? 'ACCEPTING' : 'DIVERTING'}
          </button>
        </div>

        {([
          ['cath_lab', 'Cath lab available', 'Cardiac patients routed preferentially when on'],
          ['stroke_unit', 'Stroke unit available', 'Stroke patients routed preferentially when on'],
          ['trauma_unit', 'Trauma unit available', 'Unconscious/trauma patients routed preferentially'],
        ] as const).map(([key, title, sub]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: `1px solid ${BORDER}` }}>
            <div>
              <p style={{ color: T1, fontSize: '15.5px', fontWeight: 700 }}>{title}</p>
              <p style={{ color: T3, fontSize: '12.5px', marginTop: '2px' }}>{sub}</p>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[true, false].map(v => (
                <button key={String(v)} onClick={() => saveStatus({ [key]: v } as any)}
                  style={{ padding: '10px 16px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '13px',
                    background: partner[key] === v ? (v ? GREEN : RED) : 'none',
                    color: partner[key] === v ? 'white' : T2,
                    border: partner[key] === v ? 'none' : `1.5px solid ${BORDER}` }}>
                  {v ? 'Yes' : 'No'}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: `1px solid ${BORDER}` }}>
          <div>
            <p style={{ color: T1, fontSize: '15.5px', fontWeight: 700 }}>ER beds free</p>
            <p style={{ color: T3, fontSize: '12.5px', marginTop: '2px' }}>{saving ? 'Saving…' : 'Rough count is fine'}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => saveStatus({ beds_free: Math.max(0, (partner.beds_free ?? 0) - 1) })} aria-label="Fewer beds"
              style={{ width: '38px', height: '38px', borderRadius: '10px', border: `1.5px solid ${BORDER}`, background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Minus size={15} color={T2}/>
            </button>
            <span style={{ color: T1, fontFamily: MONO, fontSize: '22px', fontWeight: 800, minWidth: '36px', textAlign: 'center' }}>
              {partner.beds_free ?? '—'}
            </span>
            <button onClick={() => saveStatus({ beds_free: (partner.beds_free ?? 0) + 1 })} aria-label="More beds"
              style={{ width: '38px', height: '38px', borderRadius: '10px', border: `1.5px solid ${BORDER}`, background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={15} color={T2}/>
            </button>
          </div>
        </div>
      </div>

      {/* ── Incoming patients ── */}
      <p style={{ color: RED, fontFamily: MONO, fontSize: '10px', fontWeight: 700, letterSpacing: '1.6px', textTransform: 'uppercase', marginBottom: '4px' }}>
        Incoming Relay patients {active.length > 0 && `· ${active.length} en route`}
      </p>
      <div style={{ borderTop: `2px solid ${RED}`, marginBottom: '30px' }}>
        {active.length === 0 && (
          <p style={{ color: T3, fontSize: '13.5px', padding: '14px 0', borderBottom: `1px solid ${BORDER}` }}>
            No one en route right now. This board updates automatically.
          </p>
        )}
        {active.map(p => (
          <div key={p.id} style={{ padding: '15px 0', borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <p style={{ color: T1, fontSize: '16.5px', fontWeight: 800, letterSpacing: '-0.2px' }}>
                  {p.patient_name} — {TYPE_LABELS[p.emergency_type] || p.emergency_type}
                </p>
                <p style={{ color: T3, fontSize: '12.5px', fontFamily: MONO, marginTop: '3px' }}>
                  dispatched {ago(p.created_at)}{p.eta_min != null ? ` · ~${p.eta_min} min out (live)` : ''}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {p.live_url && (
                  <a href={p.live_url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', color: ACCENT, fontSize: '13px', fontWeight: 700, textDecoration: 'none', border: `1.5px solid rgba(86,128,78,0.3)`, borderRadius: '9px', padding: '8px 12px' }}>
                    Live room <ExternalLink size={12}/>
                  </a>
                )}
                <button onClick={() => markIncoming(p.id, 'arrived')}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: GREEN, color: 'white', fontSize: '13px', fontWeight: 700, border: 'none', borderRadius: '9px', padding: '9px 13px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  <Check size={13}/> Arrived
                </button>
              </div>
            </div>
          </div>
        ))}
        {past.slice(0, 6).map(p => (
          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '11px 0', borderBottom: `1px solid ${BORDER}`, opacity: 0.55 }}>
            <p style={{ color: T2, fontSize: '13.5px' }}>{p.patient_name} — {TYPE_LABELS[p.emergency_type] || p.emergency_type}</p>
            <p style={{ color: p.status === 'arrived' ? GREEN : T3, fontSize: '11px', fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '1px', flexShrink: 0 }}>{p.status}</p>
          </div>
        ))}
      </div>

      <button onClick={() => { setPartner(null); try { localStorage.removeItem('relay_hospital_code') } catch {} }}
        style={{ background: 'none', border: 'none', color: T3, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', textUnderlineOffset: '3px', padding: 0 }}>
        Sign out of this facility
      </button>
    </div>
  )
}
