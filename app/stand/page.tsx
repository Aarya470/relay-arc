'use client'
// /stand: a guided lie-then-stand test. Pulse from the phone camera (or typed),
// optional blood pressure, scored with the published POTS and orthostatic
// hypotension thresholds in lib/autonomic. It never diagnoses.
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AppHeader, Hero } from '@/components/AppKit'
import Accordion from '@/components/Accordion'
import BottomNav from '@/components/BottomNav'
import QuickPulse from '@/components/QuickPulse'
import { assessOrthostatic, BASIS, type OrthostaticResult } from '@/lib/autonomic'
import { saveLog, type StandLog } from '@/lib/autonomic/store'

const CHECKS = [1, 3, 5, 10]
type Phase = 'intro' | 'lie' | 'lyingHr' | 'stand' | 'done'

function BpInput({ label, value, onChange }: { label: string; value: [string, string]; onChange: (v: [string, string]) => void }) {
  return (
    <div className="qp">
      <p className="qp-label">{label} <span style={{ fontWeight: 500, color: '#3F3D36', fontSize: '14px' }}>optional, needs a cuff</span></p>
      <div className="qp-row" style={{ alignItems: 'center' }}>
        <input inputMode="numeric" aria-label={`${label} top number`} placeholder="120" value={value[0]} onChange={(e) => onChange([e.target.value.replace(/\D/g, '').slice(0, 3), value[1]])} />
        <span style={{ fontSize: '22px', fontWeight: 700 }}>/</span>
        <input inputMode="numeric" aria-label={`${label} bottom number`} placeholder="80" value={value[1]} onChange={(e) => onChange([value[0], e.target.value.replace(/\D/g, '').slice(0, 3)])} />
      </div>
    </div>
  )
}

export default function StandTest() {
  const [phase, setPhase] = useState<Phase>('intro')
  const [age, setAge] = useState<number | null>(null)
  const [lieLeft, setLieLeft] = useState(300)
  const [lyingHr, setLyingHr] = useState<number | null>(null)
  const [lyingBp, setLyingBp] = useState<[string, string]>(['', ''])
  const [standBp, setStandBp] = useState<[string, string]>(['', ''])
  const [secs, setSecs] = useState(0)
  const [readings, setReadings] = useState<{ min: number; hr: number }[]>([])
  const [felt, setFelt] = useState<string[]>([])
  const [result, setResult] = useState<OrthostaticResult | null>(null)
  const [saved, setSaved] = useState<'' | 'saved' | 'phone'>('')
  const tick = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const id = data.session?.user.id
      if (!id) return
      const { data: p } = await supabase.from('profiles').select('date_of_birth').eq('id', id).maybeSingle()
      if (p?.date_of_birth) setAge(Math.floor((Date.now() - new Date(p.date_of_birth).getTime()) / (365.25 * 864e5)))
    })
    return () => {
      if (tick.current) clearInterval(tick.current)
    }
  }, [])

  const startLie = () => {
    setPhase('lie')
    const t0 = Date.now()
    tick.current = setInterval(() => {
      const left = 300 - Math.floor((Date.now() - t0) / 1000)
      setLieLeft(Math.max(0, left))
      if (left <= 0 && tick.current) {
        clearInterval(tick.current)
        setPhase('lyingHr')
      }
    }, 500)
  }
  const skipLie = () => {
    if (tick.current) clearInterval(tick.current)
    setPhase('lyingHr')
  }
  const startStand = () => {
    setPhase('stand')
    const t0 = Date.now()
    tick.current = setInterval(() => setSecs(Math.floor((Date.now() - t0) / 1000)), 500)
  }

  const finish = async (list = readings) => {
    if (tick.current) clearInterval(tick.current)
    if (!lyingHr || list.length === 0) {
      setPhase('done')
      return
    }
    const peak = list.reduce((a, b) => (b.hr > a.hr ? b : a))
    const n = (s: string) => (s ? Number(s) : null)
    const r = assessOrthostatic(
      {
        supineHr: lyingHr,
        standingHr: peak.hr,
        minutesStanding: peak.min,
        supineSystolic: n(lyingBp[0]),
        supineDiastolic: n(lyingBp[1]),
        standingSystolic: n(standBp[0]),
        standingDiastolic: n(standBp[1]),
      },
      age,
    )
    setResult(r)
    setPhase('done')
    const log: StandLog = {
      lyingHr,
      standing: list,
      lyingBp: lyingBp[0] && lyingBp[1] ? [Number(lyingBp[0]), Number(lyingBp[1])] : null,
      standingBp: standBp[0] && standBp[1] ? [Number(standBp[0]), Number(standBp[1])] : null,
      ageYears: age,
      result: { hrDelta: r.hrDelta, threshold: r.threshold, meetsHr: r.meetsHrCriterion, over120: r.exceedsAbsolute, oh: r.orthostaticHypotension },
      feltDuring: felt,
    }
    setSaved(await saveLog('stand', log))
  }

  const due = CHECKS.find((m) => secs >= m * 60 && !readings.some((r) => r.min === m))
  const nextCheck = CHECKS.find((m) => !readings.some((r) => r.min === m))
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const stepIndex = { intro: 0, lie: 1, lyingHr: 1, stand: 2, done: 3 }[phase]

  return (
    <div style={{ minHeight: '100dvh', maxWidth: '640px', margin: '0 auto', padding: '0 16px 112px' }}>
      <AppHeader title="Stand test" sub="About 15 minutes. Lie down, then stand, while the phone checks your pulse." />
      <div className="au-steps" aria-hidden>{[0, 1, 2, 3].map((i) => <span key={i} data-on={i <= stepIndex} />)}</div>

      {phase === 'intro' && (
        <>
          <Hero>
            <span className="ak-kicker">Before you start</span>
            <p style={{ fontSize: '21px', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.25, marginTop: '6px' }}>
              Have somewhere to lie down and something to hold when you stand. Someone nearby is best.
            </p>
            <p style={{ fontSize: '15px', marginTop: '10px' }}>If you feel like you will faint at any point, stop, lie back down and tap stop.</p>
          </Hero>
          <button className="au-big-btn ds-btn-ink" onClick={startLie}>Lie down and start</button>
          <div className="glass" style={{ padding: '4px', marginTop: '14px' }}>
            <Accordion title="What this measures" hint="And what it does not">
              <p style={{ fontSize: '14.5px', lineHeight: 1.55, padding: '0 10px 8px' }}>
                Doctors look at how much your pulse rises in the first 10 minutes of standing. A rise of 30 or more ({age !== null && age >= 12 && age <= 19 ? '40 or more at your age' : '40 or more for ages 12 to 19'}) is the mark used for POTS. A blood pressure drop of 20/10 or more is the mark for orthostatic hypotension. This test shows you your numbers to take to your doctor. It cannot diagnose anything.
              </p>
              <p style={{ fontSize: '12.5px', color: '#3F3D36', padding: '0 10px 8px' }}>{BASIS.pots}. {BASIS.oh}.</p>
            </Accordion>
          </div>
        </>
      )}

      {phase === 'lie' && (
        <Hero style={{ textAlign: 'center' }}>
          <span className="ak-kicker">Lie flat and rest</span>
          <p style={{ fontSize: '72px', fontWeight: 800, letterSpacing: '-0.05em' }}>{mmss(lieLeft)}</p>
          <p style={{ fontSize: '15px' }}>Your pulse needs to settle first.</p>
          <button className="ds-btn ds-btn-line" style={{ marginTop: '14px', minHeight: '46px', padding: '0 18px', borderRadius: 10, border: 0, fontWeight: 700, cursor: 'pointer' }} onClick={skipLie}>
            I have already been lying down
          </button>
        </Hero>
      )}

      {phase === 'lyingHr' && (
        <div style={{ display: 'grid', gap: '12px' }}>
          {lyingHr ? (
            <div className="qp"><p className="qp-label">Lying pulse: {lyingHr} bpm</p></div>
          ) : (
            <QuickPulse label="Still lying down: measure your pulse" onValue={(v) => setLyingHr(v)} />
          )}
          <BpInput label="Lying blood pressure" value={lyingBp} onChange={setLyingBp} />
          <button className="au-big-btn ds-btn-sos" disabled={!lyingHr} style={{ opacity: lyingHr ? 1 : 0.5 }} onClick={startStand}>
            Stand up now
          </button>
        </div>
      )}

      {phase === 'stand' && (
        <div style={{ display: 'grid', gap: '12px' }}>
          <Hero style={{ textAlign: 'center' }}>
            <span className="ak-kicker">Standing still</span>
            <p style={{ fontSize: '72px', fontWeight: 800, letterSpacing: '-0.05em' }}>{mmss(secs)}</p>
            <p style={{ fontSize: '15px' }}>{nextCheck ? `Next pulse check at ${nextCheck} minute${nextCheck > 1 ? 's' : ''}` : 'All checks done'}</p>
          </Hero>
          {due !== undefined && (
            <QuickPulse key={due} label={`${due} minute${due > 1 ? 's' : ''} standing: measure now`} onValue={(v) => {
              const next = [...readings, { min: due, hr: v }]
              setReadings(next)
              if (due === 10) finish(next)
            }} />
          )}
          {readings.length > 0 && (
            <div className="glass" style={{ padding: '6px 16px' }}>
              <div className="au-row"><span className="au-k">Lying</span><span className="au-v">{lyingHr} bpm</span></div>
              {readings.map((r) => (
                <div key={r.min} className="au-row"><span className="au-k">{r.min} min standing</span><span className="au-v">{r.hr} bpm</span></div>
              ))}
            </div>
          )}
          {secs >= 180 && <BpInput label="Standing blood pressure" value={standBp} onChange={setStandBp} />}
          <div className="glass" style={{ padding: '14px 16px' }}>
            <p style={{ fontWeight: 800, marginBottom: '8px' }}>How do you feel?</p>
            <div className="med-chips" style={{ marginTop: 0 }}>
              {['Lightheaded', 'Racing heart', 'Shaky', 'Blurred vision', 'Nauseous', 'Fine'].map((f) => (
                <button key={f} className="ak-chip" data-on={felt.includes(f)} onClick={() => setFelt((x) => (x.includes(f) ? x.filter((y) => y !== f) : [...x, f]))}>{f}</button>
              ))}
            </div>
          </div>
          <button className="au-big-btn ds-btn-ink" onClick={() => finish()}>
            {readings.length ? 'Stop and see my result' : 'Stop the test'}
          </button>
        </div>
      )}

      {phase === 'done' && (
        <div style={{ display: 'grid', gap: '12px' }}>
          {result ? (
            <>
              <Hero>
                <span className="ak-kicker">Your result</span>
                <div className="ak-metric" style={{ marginTop: '6px' }}>
                  <span className="ak-metric-v">+{result.hrDelta}</span>
                  <span className="ak-metric-u">bpm on standing</span>
                </div>
                <p style={{ fontSize: '16px', fontWeight: 700, marginTop: '10px' }}>
                  {result.meetsHrCriterion
                    ? `At or above the ${result.threshold} bpm mark doctors use. Show this to your doctor.`
                    : `Below the ${result.threshold} bpm mark doctors use.`}
                </p>
              </Hero>
              <div className="glass" style={{ padding: '6px 16px' }}>
                {result.notes.map((n, i) => (
                  <p key={i} style={{ fontSize: '15px', lineHeight: 1.5, padding: '10px 0', borderTop: i ? '1px solid rgba(20,20,19,0.08)' : 0 }}>{n}</p>
                ))}
              </div>
              <p style={{ fontSize: '13.5px', color: '#3F3D36' }}>
                {saved === 'saved' ? 'Saved to your history and your doctor report.' : saved === 'phone' ? 'Saved on this phone. It will sync when you are signed in and online.' : ''}
                {' '}This is not a diagnosis. One test can be off because of heat, fluids, time of day or medicines.
              </p>
            </>
          ) : (
            <Hero><p style={{ fontSize: '19px', fontWeight: 800 }}>Stopped before any standing reading.</p><p style={{ marginTop: '6px' }}>If you felt faint, lie down and use the episode coach.</p></Hero>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <a className="au-big-btn ds-btn-ink" href="/report" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>Doctor report</a>
            <a className="au-big-btn ds-btn-line" href="/episode" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>I feel faint</a>
          </div>
        </div>
      )}
      <BottomNav />
    </div>
  )
}
