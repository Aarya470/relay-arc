'use client'
// /episode: "I feel faint". Works without signing in. Red flags first, then the
// counter-manoeuvre steps with timers, then a short log for the doctor report.
import { useEffect, useRef, useState } from 'react'
import { AppHeader, Hero } from '@/components/AppKit'
import BottomNav from '@/components/BottomNav'
import { COUNTER_STEPS, RED_FLAGS } from '@/lib/autonomic'
import { emergencyNumber } from '@/lib/emergency-number'
import { saveLog, TRIGGERS, type EpisodeLog } from '@/lib/autonomic/store'

export default function Episode() {
  const [emg, setEmg] = useState({ number: '911', label: '911' })
  const [flag, setFlag] = useState<string | null>(null)
  const [step, setStep] = useState(-1)
  const [left, setLeft] = useState<number | null>(null)
  const [log, setLog] = useState<EpisodeLog>({ type: 'nearly fainted', triggers: [], helped: [] })
  const [saved, setSaved] = useState<'' | 'saved' | 'phone'>('')
  const t0 = useRef(Date.now())
  const iv = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setEmg(emergencyNumber())
    return () => {
      if (iv.current) clearInterval(iv.current)
    }
  }, [])

  const go = (i: number) => {
    if (iv.current) clearInterval(iv.current)
    setStep(i)
    const s = COUNTER_STEPS[i]
    if (s?.holdSeconds) {
      const end = Date.now() + s.holdSeconds * 1000
      setLeft(s.holdSeconds)
      iv.current = setInterval(() => {
        const l = Math.max(0, Math.round((end - Date.now()) / 1000))
        setLeft(l)
        if (l === 0 && iv.current) clearInterval(iv.current)
      }, 250)
    } else setLeft(null)
  }

  const red = RED_FLAGS.find((f) => f.id === flag)
  const toggle = (k: 'triggers' | 'helped', v: string) =>
    setLog((l) => ({ ...l, [k]: l[k].includes(v) ? l[k].filter((x) => x !== v) : [...l[k], v] }))

  return (
    <div style={{ minHeight: '100dvh', maxWidth: '640px', margin: '0 auto', padding: '0 16px 112px' }}>
      <AppHeader title="I feel faint" sub="Lie down first. Read the rest once you are flat." />

      <a href={`tel:${emg.number}`} className="au-big-btn ds-btn-sos" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', marginBottom: '14px' }}>
        Call {emg.label}
      </a>

      {step === -1 && !red && (
        <div className="glass" style={{ padding: '16px', marginBottom: '14px' }}>
          <p className="ak-panel-title" style={{ marginBottom: '4px' }}>Is any of this happening?</p>
          <p style={{ fontSize: '14px', color: '#3F3D36', marginBottom: '10px' }}>If yes, call {emg.label}. Do not wait it out.</p>
          <div style={{ display: 'grid', gap: '8px' }}>
            {RED_FLAGS.map((f) => (
              <button key={f.id} className="row" style={{ borderRadius: 10, background: 'rgba(255,255,255,0.6)' }} onClick={() => setFlag(f.id)}>
                <span className="row-title" style={{ flex: 1 }}>{f.prompt}</span>
                <span className="row-end">Yes</span>
              </button>
            ))}
          </div>
          <button className="au-big-btn ds-btn-ink" style={{ marginTop: '14px' }} onClick={() => go(0)}>None of these. Help me through it</button>
        </div>
      )}

      {red && (
        <Hero tone="orange">
          <span className="ak-kicker">Call {emg.label} now</span>
          <p style={{ fontSize: '22px', fontWeight: 800, lineHeight: 1.2, marginTop: '6px' }}>{red.prompt}</p>
          <p style={{ fontSize: '15px', marginTop: '8px' }}>{red.because}</p>
          <button className="ds-btn ds-btn-line" style={{ marginTop: '14px', minHeight: '44px', padding: '0 16px', borderRadius: 10, border: 0, fontWeight: 700, cursor: 'pointer' }} onClick={() => setFlag(null)}>I picked the wrong one</button>
        </Hero>
      )}

      {step >= 0 && step < COUNTER_STEPS.length && (
        <Hero>
          <span className="ak-kicker">Step {step + 1} of {COUNTER_STEPS.length}</span>
          <p style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.03em', marginTop: '6px' }}>{COUNTER_STEPS[step].title}</p>
          <p style={{ fontSize: '17px', lineHeight: 1.5, marginTop: '8px' }}>{COUNTER_STEPS[step].body}</p>
          {left !== null && (
            <p style={{ fontSize: '56px', fontWeight: 800, letterSpacing: '-0.04em', marginTop: '10px' }} aria-live="polite">
              {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
            </p>
          )}
          <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
            {step > 0 && <button className="ds-btn ds-btn-line" style={{ minHeight: '50px', padding: '0 18px', borderRadius: 10, border: 0, fontWeight: 700, cursor: 'pointer' }} onClick={() => go(step - 1)}>Back</button>}
            <button className="ds-btn ds-btn-ink" style={{ flex: 1, minHeight: '50px', borderRadius: 10, border: 0, fontWeight: 800, cursor: 'pointer' }} onClick={() => go(step + 1)}>
              {step === COUNTER_STEPS.length - 1 ? 'I feel better' : 'Next step'}
            </button>
          </div>
        </Hero>
      )}

      {step >= COUNTER_STEPS.length && (
        <div className="glass" style={{ padding: '16px', display: 'grid', gap: '14px' }}>
          <p className="ak-panel-title">Log it for your doctor</p>
          <div className="med-chips" style={{ marginTop: 0 }}>
            {(['nearly fainted', 'fainted', 'flare'] as const).map((t) => (
              <button key={t} className="ak-chip" data-on={log.type === t} onClick={() => setLog({ ...log, type: t })}>{t === 'flare' ? 'Bad flare' : t[0].toUpperCase() + t.slice(1)}</button>
            ))}
          </div>
          {log.type === 'fainted' && (
            <p style={{ fontSize: '14.5px', fontWeight: 700, color: '#7A3D00' }}>Actually passing out needs a doctor to check you, especially if you hit your head. Tell your doctor today.</p>
          )}
          <div>
            <p style={{ fontWeight: 750, marginBottom: '6px' }}>What set it off?</p>
            <div className="med-chips" style={{ marginTop: 0 }}>
              {TRIGGERS.map((t) => <button key={t} className="ak-chip" data-on={log.triggers.includes(t)} onClick={() => toggle('triggers', t)}>{t}</button>)}
            </div>
          </div>
          <div>
            <p style={{ fontWeight: 750, marginBottom: '6px' }}>What helped?</p>
            <div className="med-chips" style={{ marginTop: 0 }}>
              {COUNTER_STEPS.map((s) => <button key={s.id} className="ak-chip" data-on={log.helped.includes(s.title)} onClick={() => toggle('helped', s.title)}>{s.title}</button>)}
            </div>
          </div>
          <button className="au-big-btn ds-btn-ink" onClick={async () => setSaved(await saveLog('episode', { ...log, minutes: Math.round((Date.now() - t0.current) / 60000) }))} disabled={!!saved}>
            {saved ? 'Saved' : 'Save to my record'}
          </button>
          {saved && <p style={{ fontSize: '14px' }}>{saved === 'saved' ? 'Saved. It will show in your doctor report.' : 'Saved on this phone. Sign in to keep it in your record.'}</p>}
        </div>
      )}
      <BottomNav />
    </div>
  )
}
