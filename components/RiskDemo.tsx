'use client'
// Live demo of the Relay Risk Engine.
//
// Same principle as the triage demo: lib/risk is a pure function with no
// dependencies, so this is the actual production scoring code running on the
// visitor's device. Drag a slider and you are watching the same function that
// decides whether a real user sees an alert.
//
// The point being demonstrated is determinism. Every point on screen is traced
// to the measurement that produced it, and the same sliders always give the same
// answer — which is the whole reason this is not a language model.
import { useState, useMemo } from 'react'
import {
  assessRisk, scoreRespRate, scoreSpo2, scoreSystolic, scorePulse,
} from '@/lib/risk'

const T1 = '#141413', T2 = '#5C5A52', T3 = '#716F67'
const BORDER = '#B5C68F', BG2 = '#CDDAAD'
const RED = '#A33417', AMBER = '#A87200', GREEN = '#51623B'
const mono = 'var(--font-mono, monospace)'

interface Param {
  key: 'resp_rate' | 'oxygen_sat' | 'systolic' | 'heart_rate'
  label: string
  unit: string
  min: number
  max: number
  score: (v: number) => number
  /** The published NEWS2 band boundaries, for the scale underneath. */
  bands: string
}

const PARAMS: Param[] = [
  { key: 'resp_rate',  label: 'Respiratory rate', unit: '/min', min: 4,  max: 40,  score: scoreRespRate, bands: '≤8 · 9–11 · 12–20 · 21–24 · ≥25' },
  { key: 'oxygen_sat', label: 'Oxygen saturation', unit: '%',   min: 80, max: 100, score: scoreSpo2,     bands: '≤91 · 92–93 · 94–95 · ≥96' },
  { key: 'systolic',   label: 'Systolic BP',       unit: 'mmHg', min: 60, max: 240, score: scoreSystolic, bands: '≤90 · 91–100 · 101–110 · 111–219 · ≥220' },
  { key: 'heart_rate', label: 'Pulse',             unit: 'bpm',  min: 30, max: 180, score: scorePulse,    bands: '≤40 · 41–50 · 51–90 · 91–110 · 111–130 · ≥131' },
]

const SCENARIOS = [
  { label: 'healthy',        v: { resp_rate: 16, oxygen_sat: 98, systolic: 118, heart_rate: 72 } },
  { label: 'deteriorating',  v: { resp_rate: 22, oxygen_sat: 94, systolic: 105, heart_rate: 115 } },
  { label: 'critical',       v: { resp_rate: 26, oxygen_sat: 91, systolic: 88,  heart_rate: 135 } },
  { label: 'one red flag',   v: { resp_rate: 16, oxygen_sat: 90, systolic: 120, heart_rate: 72 } },
]

const pointColor = (p: number) => (p >= 3 ? RED : p === 2 ? AMBER : p === 1 ? T2 : T3)

export default function RiskDemo() {
  const [v, setV] = useState<Record<string, number>>(SCENARIOS[1].v)

  const result = useMemo(() => assessRisk([{
    logged_at: new Date().toISOString(),
    resp_rate: v.resp_rate, oxygen_sat: v.oxygen_sat,
    systolic: v.systolic, diastolic: Math.round(v.systolic * 0.65), heart_rate: v.heart_rate,
  }]), [v])

  const levelColor = result?.level === 'high' ? RED : result?.level === 'medium' ? AMBER : GREEN

  return (
    <div style={{ border: `2px solid ${T1}`, background: '#FFFFFF' }}>

      <div style={{
        borderBottom: `1px solid ${T1}`, padding: '11px 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
      }}>
        <span style={{ color: T1, fontFamily: mono, fontSize: '10.5px', fontWeight: 700, letterSpacing: '1.6px', textTransform: 'uppercase' }}>
          Drag a vital — same code that alerts real users
        </span>
        <span style={{ color: T3, fontFamily: mono, fontSize: '10.5px', letterSpacing: '1.2px', textTransform: 'uppercase' }}>
          deterministic
        </span>
      </div>

      <div style={{ padding: '20px 16px 22px' }}>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {SCENARIOS.map(s => {
            const on = PARAMS.every(p => v[p.key] === (s.v as Record<string, number>)[p.key])
            return (
              <button key={s.label} onClick={() => setV(s.v)}
                style={{
                  background: on ? T1 : 'transparent', color: on ? '#FFFFFF' : T2,
                  border: `1px solid ${on ? T1 : BORDER}`, padding: '5px 10px',
                  fontFamily: mono, fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.4px',
                  cursor: 'pointer', borderRadius: 0,
                }}>
                {s.label}
              </button>
            )
          })}
        </div>

        {/* sliders — each row shows the points it is contributing right now */}
        {PARAMS.map(p => {
          const val = v[p.key]
          const pts = p.score(val)
          return (
            <div key={p.key} style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '5px' }}>
                <span style={{ color: T1, fontSize: '13.5px', fontWeight: 600 }}>{p.label}</span>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                  <span style={{ color: T1, fontFamily: mono, fontSize: '14px', fontWeight: 700 }}>
                    {val}<span style={{ color: T3, fontSize: '10.5px' }}> {p.unit}</span>
                  </span>
                  <span style={{
                    minWidth: '26px', textAlign: 'center',
                    background: pts > 0 ? pointColor(pts) : 'transparent',
                    color: pts > 0 ? '#FFFFFF' : T3,
                    border: `1px solid ${pts > 0 ? pointColor(pts) : BORDER}`,
                    fontFamily: mono, fontSize: '11px', fontWeight: 700, padding: '2px 6px',
                  }}>+{pts}</span>
                </span>
              </div>
              <input
                type="range" min={p.min} max={p.max} value={val}
                onChange={e => setV(prev => ({ ...prev, [p.key]: Number(e.target.value) }))}
                style={{ width: '100%', accentColor: pts > 0 ? pointColor(pts) : T1, margin: 0 }}
              />
              <p style={{ color: T3, fontFamily: mono, fontSize: '9.5px', letterSpacing: '0.6px', marginTop: '2px' }}>
                {p.bands}
              </p>
            </div>
          )
        })}

        {/* verdict */}
        {result && (
          <div style={{ borderTop: `2px solid ${T1}`, paddingTop: '16px', marginTop: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <span style={{ color: levelColor, fontSize: 'clamp(26px, 5vw, 40px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>
                {result.level}
              </span>
              <span style={{ color: T2, fontFamily: mono, fontSize: '13px', fontWeight: 700 }}>
                NEWS2 {result.news2}/12
              </span>
              {result.redFlag && (
                <span style={{ background: RED, color: '#FFFFFF', fontFamily: mono, fontSize: '10px', fontWeight: 700, padding: '3px 8px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  single-parameter red flag
                </span>
              )}
            </div>

            <p style={{ color: T2, fontSize: '13.5px', lineHeight: 1.6, marginBottom: '14px' }}>
              {result.advice}
            </p>

            <div style={{ background: BG2, padding: '12px 14px' }}>
              <p style={{ color: T3, fontFamily: mono, fontSize: '9.5px', fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase', marginBottom: '7px' }}>
                Why — every point traced to a measurement
              </p>
              {result.signals.length ? result.signals.map(s => (
                <div key={s.code} style={{ display: 'flex', gap: '9px', alignItems: 'baseline', marginBottom: '3px' }}>
                  <span style={{ color: pointColor(s.points), fontFamily: mono, fontSize: '10.5px', fontWeight: 700, minWidth: '16px' }}>+{s.points}</span>
                  <span style={{ color: T1, fontSize: '12.5px' }}>{s.label}</span>
                </div>
              )) : (
                <p style={{ color: T2, fontSize: '12.5px' }}>Nothing outside the expected range.</p>
              )}
            </div>

            <p style={{ color: T3, fontFamily: mono, fontSize: '10px', lineHeight: 1.6, marginTop: '12px', letterSpacing: '0.3px' }}>
              {result.partial
                ? `Partial NEWS2 — ${result.coverage.measured.length} of 7 parameters. Missing ${result.coverage.missing.join(', ')}, so it can under-estimate risk.`
                : 'Complete NEWS2 observation set — all 7 parameters.'} Decision support, not a diagnosis.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
