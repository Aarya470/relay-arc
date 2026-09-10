'use client'
// Live demo of the Relay Triage Engine.
//
// This is not a mockup and not a recording. lib/triage is a self-contained
// TypeScript module — model weights inlined, zero imports — so the classifier
// genuinely runs in the visitor's browser as they type. The latency figure is
// measured with performance.now() on their device, not a number we typed in.
//
// Loaded via next/dynamic so the 96 KB of weights is fetched only when someone
// scrolls to the demo, rather than on every homepage visit.
import { useState, useMemo, useRef, useEffect } from 'react'
import { triage, featurize, MODEL_META, ABSTAIN_THRESHOLD } from '@/lib/triage'

const T1 = '#141413', T2 = '#5C5A52', T3 = '#5C5A52'
const BORDER = '#98C890', BG2 = '#B3DDAC'
const CRIT = '#A33417', ACCENT = '#42623C', GREEN = '#42623C'
const mono = 'var(--font-mono, monospace)'

const LABELS: Record<string, string> = {
  chest_pain: 'Chest pain', unconscious: 'Unconscious', breathing: 'Breathing',
  pots: 'POTS episode', stroke: 'Stroke', mecfs: 'ME/CFS crash', other: 'Other urgent',
}

// Chosen to show the interesting behaviour, including the failure mode.
const PRESETS = [
  { label: 'clear cardiac', text: 'chest is crushing and pain going down my left arm' },
  { label: 'cardiac arrest', text: 'he collapsed and is not breathing' },
  { label: 'negation', text: 'no chest pain but i cannot breathe' },
  { label: 'orthostatic', text: 'heart racing hard when i stand up and dizzy' },
  // Verified to actually fall below the gate (0.312). If the model is retrained
  // and this starts answering confidently, the label becomes a lie — recheck it.
  { label: 'abstains', text: 'i dont feel right' },
]

export default function TriageDemo() {
  const [text, setText] = useState(PRESETS[0].text)
  const [ms, setMs] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const result = useMemo(() => {
    if (!text.trim()) return null
    return triage(text)
  }, [text])

  const features = useMemo(() => (text.trim() ? featurize(text) : []), [text])

  // Measure on the visitor's own hardware. Median of 200 runs, warm.
  useEffect(() => {
    if (!text.trim()) { setMs(null); return }
    const times: number[] = []
    for (let i = 0; i < 200; i++) {
      const t0 = performance.now()
      triage(text)
      times.push(performance.now() - t0)
    }
    times.sort((a, b) => a - b)
    setMs(times[Math.floor(times.length / 2)])
  }, [text])

  const conf = result ? result.confidence : 0
  const abstained = !!result?.abstain

  return (
    <div style={{ border: `2px solid ${T1}`, background: '#FFFFFF' }}>

      {/* header strip */}
      <div style={{
        borderBottom: `1px solid ${T1}`, padding: '11px 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
      }}>
        <span style={{ color: T1, fontFamily: mono, fontSize: '10.5px', fontWeight: 700, letterSpacing: '1.6px', textTransform: 'uppercase' }}>
          Running in your browser. Type anything
        </span>
        <span style={{ color: T3, fontFamily: mono, fontSize: '10.5px', letterSpacing: '1.2px', textTransform: 'uppercase' }}>
          no network calls
        </span>
      </div>

      <div style={{ padding: '20px 16px 22px' }}>

        {/* presets */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => { setText(p.text); inputRef.current?.focus() }}
              style={{
                background: text === p.text ? T1 : 'transparent',
                color: text === p.text ? '#FFFFFF' : T2,
                border: `1px solid ${text === p.text ? T1 : BORDER}`,
                padding: '5px 10px', fontFamily: mono, fontSize: '10.5px',
                fontWeight: 700, letterSpacing: '0.4px', cursor: 'pointer', borderRadius: 0,
              }}>
              {p.label}
            </button>
          ))}
        </div>

        <input
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="describe an emergency…"
          style={{
            width: '100%', boxSizing: 'border-box', padding: '15px 16px',
            border: `1.5px solid ${T1}`, borderRadius: 0, background: '#FFFFFF',
            color: T1, fontSize: '16px', fontWeight: 600, fontFamily: 'inherit',
            outline: 'none', marginBottom: '18px',
          }}
        />

        {/* verdict */}
        {result && (
          <>
            <div style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              gap: '16px', flexWrap: 'wrap', marginBottom: '10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                <span style={{
                  color: abstained ? T3 : T1, fontSize: 'clamp(26px, 5vw, 40px)',
                  fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1,
                }}>
                  {abstained ? 'abstains' : LABELS[result.type] || result.type}
                </span>
                <span style={{ color: T3, fontFamily: mono, fontSize: '13px', fontWeight: 700 }}>
                  {conf.toFixed(3)}
                </span>
              </div>
              <span style={{ color: ms != null && ms < 1 ? GREEN : T2, fontFamily: mono, fontSize: '12px', fontWeight: 700 }}>
                {ms != null ? `${ms.toFixed(3)} ms on your device` : '—'}
              </span>
            </div>

            {/* confidence bar with the abstention gate marked */}
            <div style={{ position: 'relative', height: '8px', background: BG2, marginBottom: '6px' }}>
              <div style={{
                position: 'absolute', inset: 0, width: `${Math.min(100, conf * 100)}%`,
                background: abstained ? T3 : T1,
              }}/>
              <div style={{
                position: 'absolute', top: '-4px', bottom: '-4px',
                left: `${ABSTAIN_THRESHOLD * 100}%`, width: '2px', background: CRIT,
              }}/>
            </div>
            <p style={{ color: T3, fontFamily: mono, fontSize: '10px', letterSpacing: '0.8px', marginBottom: '18px' }}>
              the marked line = {ABSTAIN_THRESHOLD} abstention gate. Below it we ask the cloud instead of guessing
            </p>

            {/* what drove it */}
            <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: '14px' }}>
              <p style={{ color: T3, fontFamily: mono, fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
                Evidence it acted on
              </p>
              {result.evidence.length ? (
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '14px' }}>
                  {result.evidence.map(e => (
                    <span key={e} style={{
                      background: 'rgba(86,128,78,0.07)', border: '1px solid rgba(86,128,78,0.16)',
                      color: ACCENT, fontFamily: mono, fontSize: '11px', fontWeight: 700, padding: '3px 8px',
                    }}>{e}</span>
                  ))}
                </div>
              ) : (
                <p style={{ color: T3, fontSize: '13px', marginBottom: '14px' }}>
                  nothing it recognises, which is exactly why it abstains
                </p>
              )}

              <p style={{ color: T3, fontFamily: mono, fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
                Features extracted ({features.length})
              </p>
              <p style={{ color: T2, fontFamily: mono, fontSize: '11.5px', lineHeight: 1.7, wordBreak: 'break-word' }}>
                {features.length ? features.join('  ·  ') : '—'}
              </p>
            </div>
          </>
        )}
      </div>

      {/* footer facts */}
      <div style={{
        borderTop: `1px solid ${T1}`, background: BG2, padding: '11px 16px',
        display: 'flex', gap: '20px', flexWrap: 'wrap',
      }}>
        {[
          ['examples', String(MODEL_META.trainedExamples)],
          ['cross-val', String(MODEL_META.heldOutAccuracy)],
          ['weights', '94 KB'],
          ['offline', 'always'],
        ].map(([k, v]) => (
          <span key={k} style={{ fontFamily: mono, fontSize: '10.5px', letterSpacing: '0.8px' }}>
            <span style={{ color: T3, textTransform: 'uppercase' }}>{k} </span>
            <span style={{ color: T1, fontWeight: 700 }}>{v}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
