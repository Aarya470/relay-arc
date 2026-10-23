'use client'
// /check — a full NEWS2 vitals check using only the phone.
//
// WHY THIS PAGE EXISTS
// NEWS2 is the score hospitals use to catch someone getting worse. Everywhere
// else in Relay it is only as good as the numbers someone types in, and most
// families do not own a smartwatch, a pulse oximeter or a blood-pressure cuff.
// So the phone itself becomes the sensor:
//   - pulse from the rear camera and flash (fingertip photoplethysmography),
//   - breathing rate from the accelerometer, with the phone on the chest,
//     or by tapping once per breath if the motion sensor is unavailable,
//   - everything else from Apple Health if the person has it, or by hand.
// Then every one of NEWS2's seven parameters is scored on screen, point by
// point, so a person (or a paramedic they show it to) can see exactly why.
//
// No account is needed and nothing leaves the phone unless the person chooses
// to save it to their log. Signal maths: lib/pulse. Health import: lib/health.
//
// REGULATORY FRAMING (docs/INTENDED_USE.md §6): a deterioration risk tier with
// advice, presented to a patient, is a device function under FDA's January 2026
// CDS guidance. So this page measures and records, and lays the NEWS2
// arithmetic out for a CLINICIAN to read (a paramedic, a nurse, the care team),
// labelled as such. It never tells the person what their score means for them
// or what to do because of it. The safety instruction is unconditional: if you
// feel unwell, call 911, whatever the numbers say.
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Heart, Wind, Upload, Phone, Check, Hand } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { bestChannelEstimate, fingerCoach, estimateBreathRate, breathRateFromTaps, detrend, resample, type Sample } from '@/lib/pulse'
import { startPulseCamera, type PulseCamera } from '@/lib/pulse/camera'
import { requestMotionPermission, startMotion, type MotionReader } from '@/lib/pulse/motion'
import { importAppleHealth, type HealthSummary } from '@/lib/health/apple'
import {
  assessRisk, scoreRespRate, scoreSpo2, scoreSystolic, scorePulse, scoreTemperature,
  scoreConsciousness, scoreSupplementalOxygen, type Acvpu,
} from '@/lib/risk'
import { emergencyNumber } from '@/lib/emergency-number'
import SignalView from '@/components/SignalView'
import { demoOn } from '@/lib/demo'

// ── look ──────────────────────────────────────────────────────────────────────
const PAGE = '#B3DDAC', T1 = '#141413', T2 = '#3F3D36', T3 = '#6E6B5D'
const LINE = '#E4E2DA', LINE2 = '#CFCCC1', PAPER = '#FBFAF6', RED = '#A33417', GREEN = '#3B5E35', AMBER = '#7C5200', ORANGE = '#D97757'
const mono = 'var(--font-mono, monospace)'

// 15 seconds per reading. If the pulse is not confirmed by then, the page keeps
// going for up to 10 more seconds ("almost there") rather than failing.
const PULSE_SECONDS = 15
const PULSE_MAX_SECONDS = 25
const BREATH_SECONDS = 15
const TAP_SECONDS = 15

type Source = 'camera' | 'motion' | 'taps' | 'apple' | 'typed' | 'demo'
interface Val { v: number | null; src: Source | null; at?: Date }
const empty: Val = { v: null, src: null }

const ACVPU: { id: Acvpu; label: string }[] = [
  { id: 'A', label: 'Alert, talking normally' },
  { id: 'C', label: 'New confusion' },
  { id: 'V', label: 'Only responds to voice' },
  { id: 'P', label: 'Only responds to pain' },
  { id: 'U', label: 'Unresponsive' },
]
const srcLabel: Record<Source, string> = {
  camera: 'camera', motion: 'motion sensor', taps: 'tapped', apple: 'Apple Health', typed: 'typed', demo: 'DEMO, simulated',
}

const panel: React.CSSProperties = {
  background: '#FFFFFF', border: '1px solid rgba(20,20,19,0.14)', borderRadius: '10px', padding: '18px', marginBottom: '14px',
}
const h2: React.CSSProperties = { fontSize: '19px', fontWeight: 700, color: T1, margin: 0, letterSpacing: '-0.1px' }
const lbl: React.CSSProperties = { fontSize: '14px', color: T2, fontWeight: 600 }
const btn = (primary: boolean, tone: string = T1): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'center',
  background: primary ? tone : '#FFFFFF', color: primary ? '#FFFFFF' : tone,
  border: `1.5px solid ${tone}`, borderRadius: '8px', padding: '12px 18px', minHeight: '48px',
  fontWeight: 700, fontSize: '15.5px', cursor: 'pointer', fontFamily: 'inherit', boxSizing: 'border-box',
})
const input: React.CSSProperties = {
  width: '100%', border: `1px solid ${LINE2}`, borderRadius: '8px', padding: '11px 12px', minHeight: '48px',
  fontSize: '16px', fontFamily: 'inherit', color: T1, background: '#FFFFFF', boxSizing: 'border-box', outline: 'none',
}

export default function VitalsCheck() {
  const router = useRouter()
  const [emg, setEmg] = useState({ number: '911', label: '911' })
  useEffect(() => { setEmg(emergencyNumber()) }, [])

  // DEMO MODE (relay-arc.org/check?demo=1, or the site-wide demo switch):
  // for filming. The camera still runs and the live waveform is real, but the
  // reading is a fixed, SIMULATED 73 bpm after 10 seconds, and the card is
  // badged DEMO the whole time so no viewer can mistake it for a measurement.
  // Never active unless asked for.
  const [demo, setDemo] = useState(false)
  useEffect(() => {
    try { setDemo(demoOn() || new URLSearchParams(window.location.search).has('demo')) } catch {}
  }, [])

  // ── measured values ────────────────────────────────────────────────────────
  const [hr, setHr] = useState<Val>(empty)
  const [rr, setRr] = useState<Val>(empty)
  const [spo2, setSpo2] = useState<Val>(empty)
  const [sbp, setSbp] = useState<Val>(empty)
  const [tempF, setTempF] = useState<Val>(empty)
  const [acvpu, setAcvpu] = useState<Acvpu | null>(null)
  const [onO2, setOnO2] = useState<boolean | null>(null)

  // ── camera pulse ───────────────────────────────────────────────────────────
  const [pulseState, setPulseState] = useState<'idle' | 'starting' | 'running' | 'done' | 'error'>('idle')
  const [pulseMsg, setPulseMsg] = useState('')
  const [coach, setCoach] = useState<string | null>(null)
  const [live, setLive] = useState<{ rate: number | null; quality: number; confirmed: boolean } | null>(null)
  const [finger, setFinger] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [torch, setTorch] = useState(true)
  const camRef = useRef<PulseCamera | null>(null)
  const redRef = useRef<Sample[]>([])
  const greenRef = useRef<Sample[]>([])
  const rawPulseRef = useRef<Sample[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [showRaw, setShowRaw] = useState(false)
  const [sigVersion, setSigVersion] = useState(0)

  const stopPulse = () => { camRef.current?.stop(); camRef.current = null }
  useEffect(() => () => { stopPulse(); motionRef.current?.stop() }, [])

  const drawWave = (channel: Sample[]) => {
    const c = canvasRef.current; if (!c) return
    const ctx = c.getContext('2d'); if (!ctx) return
    ctx.clearRect(0, 0, c.width, c.height)
    if (channel.length < 30) return
    const recent = channel.filter(x => x.t > channel[channel.length - 1].t - 6)
    const y = detrend(resample(recent, 30), 30, 1.2)
    if (y.length < 2) return
    const max = Math.max(...y.map(Math.abs)) || 1
    const pts = y.map((v, i) => [(i / (y.length - 1)) * c.width, c.height / 2 - (v / max) * (c.height / 2 - 10)])
    ctx.strokeStyle = 'rgba(20,20,19,0.06)'; ctx.lineWidth = 2
    for (let gx = 0; gx <= c.width; gx += c.width / 12) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, c.height); ctx.stroke() }
    ctx.strokeStyle = '#A33417'; ctx.lineWidth = 3.5; ctx.lineJoin = 'round'
    ctx.beginPath(); pts.forEach(([x, yy], i) => (i ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy))); ctx.stroke()
  }

  const startPulse = async () => {
    setPulseState('starting'); setPulseMsg(''); setLive(null); setCoach(null)
    redRef.current = []; greenRef.current = []; rawPulseRef.current = []; setElapsed(0)
    try {
      let lastFinger = 0, startT = -1, frames = 0
      camRef.current = await startPulseCamera(f => {
        frames++
        setFinger(f.finger)
        if (frames % 10 === 0) setCoach(f.finger ? null : fingerCoach(f.r, f.g, f.spread))
        if (!f.finger) {
          // a lifted finger ruins the window: start again, after a 2 s grace
          if (f.t - lastFinger > 2 && startT >= 0) {
            redRef.current = []; greenRef.current = []; rawPulseRef.current = []; startT = -1; setElapsed(0); setLive(null)
          }
          return
        }
        lastFinger = f.t
        if (startT < 0) startT = f.t
        // inverted: blood arriving darkens the frame
        redRef.current.push({ t: f.t, v: -f.r }); greenRef.current.push({ t: f.t, v: -f.g })
        rawPulseRef.current.push({ t: f.t, v: f.r })
        const secs = f.t - startT
        setElapsed(Math.floor(secs))
        if (demo && secs >= 10) {
          drawWave(redRef.current)
          stopPulse(); setPulseState('done'); setLive(null)
          setHr({ v: 73, src: 'demo' })
          return
        }
        if (redRef.current.length % 12 === 0) {
          const est = bestChannelEstimate(redRef.current, greenRef.current)
          drawWave(est.channel === 'green' ? greenRef.current : redRef.current)
          setSigVersion(v => v + 1)
          if (secs >= 8 && !demo) setLive({ rate: est.rate ?? (est.quality > 0.2 ? null : null), quality: est.quality, confirmed: est.confirmed })
          if ((secs >= PULSE_SECONDS && est.confirmed) || secs >= PULSE_MAX_SECONDS) {
            stopPulse(); setPulseState('done')
            if (est.confirmed && est.rate) setHr({ v: est.rate, src: 'camera' })
            else setPulseMsg('Could not get a steady reading. Rest your hand on a table, cover the lens fully, and keep still.')
          }
        }
      })
      setTorch(camRef.current.torch)
      setPulseState('running')
    } catch {
      setPulseState('error')
      setPulseMsg('Camera unavailable. Allow camera access, or type your pulse below.')
    }
  }

  // ── breathing ──────────────────────────────────────────────────────────────
  const [breathState, setBreathState] = useState<'idle' | 'motion' | 'taps' | 'done'>('idle')
  const [breathMsg, setBreathMsg] = useState('')
  const [breathLeft, setBreathLeft] = useState(0)
  const [tapCount, setTapCount] = useState(0)
  const [tapPulse, setTapPulse] = useState(0)
  const motionRef = useRef<MotionReader | null>(null)
  const motionSamples = useRef<Sample[]>([])
  const taps = useRef<number[]>([])
  const tapStart = useRef(0)

  const startMotionBreath = async () => {
    setBreathMsg('')
    const okPerm = await requestMotionPermission()
    if (!okPerm) { setBreathMsg('Motion sensor unavailable on this phone. Use tap counting instead.'); return }
    motionSamples.current = []
    setBreathState('motion'); setBreathLeft(BREATH_SECONDS)
    motionRef.current = startMotion((t, v) => { motionSamples.current.push({ t, v }) })
    const t0 = Date.now()
    const iv = setInterval(() => {
      const left = BREATH_SECONDS - Math.floor((Date.now() - t0) / 1000)
      setBreathLeft(left); setSigVersion(v => v + 1)
      if (left <= 0) {
        clearInterval(iv); motionRef.current?.stop()
        const s = motionSamples.current
        if (s.length < 50) { setBreathState('idle'); setBreathMsg('No motion data arrived. Use tap counting instead.'); return }
        const est = estimateBreathRate(s)
        setBreathState('done')
        if (est.ok && est.rate) setRr({ v: est.rate, src: 'motion' })
        else setBreathMsg('Too much movement to read 15 seconds of breathing. Lie still and try again, or use tap counting.')
      }
    }, 250)
  }

  const startTaps = () => {
    taps.current = []; tapStart.current = Date.now(); setTapCount(0)
    setBreathState('taps'); setBreathLeft(TAP_SECONDS); setBreathMsg('')
    const iv = setInterval(() => {
      const left = TAP_SECONDS - Math.floor((Date.now() - tapStart.current) / 1000)
      setBreathLeft(left)
      if (left <= 0) {
        clearInterval(iv)
        const rate = breathRateFromTaps(taps.current)
        setBreathState('done')
        if (rate) setRr({ v: rate, src: 'taps' })
        else setBreathMsg('Not enough taps. Tap once each time the chest rises.')
      }
    }, 200)
  }

  // ── Apple Health ───────────────────────────────────────────────────────────
  const [health, setHealth] = useState<HealthSummary | null>(null)
  const [importing, setImporting] = useState(false)
  const onHealthFile = async (f: File | undefined) => {
    if (!f) return
    setImporting(true)
    try {
      const s = await importAppleHealth(f)
      setHealth(s)
      const L = s.latest
      if (L.spo2) setSpo2(p => p.v == null ? { v: L.spo2!.value, src: 'apple', at: L.spo2!.at } : p)
      if (L.systolic) setSbp(p => p.v == null ? { v: L.systolic!.value, src: 'apple', at: L.systolic!.at } : p)
      if (L.resp_rate) setRr(p => p.v == null ? { v: L.resp_rate!.value, src: 'apple', at: L.resp_rate!.at } : p)
      if (L.heart_rate) setHr(p => p.v == null ? { v: L.heart_rate!.value, src: 'apple', at: L.heart_rate!.at } : p)
      if (L.temp_c) setTempF(p => p.v == null ? { v: Math.round((L.temp_c!.value * 9 / 5 + 32) * 10) / 10, src: 'apple', at: L.temp_c!.at } : p)
      toast.success(`Read ${s.matched.toLocaleString()} readings from Apple Health, on this phone`)
    } catch (e: any) {
      toast.error(e?.message || 'Could not read that file')
    } finally { setImporting(false) }
  }

  // ── NEWS2 ──────────────────────────────────────────────────────────────────
  const tempC = tempF.v != null ? Math.round(((tempF.v - 32) * 5 / 9) * 10) / 10 : null
  const rows: { name: string; value: string; pts: number | null; src: Source | null; at?: Date }[] = [
    { name: 'Breathing rate', value: rr.v != null ? `${rr.v} /min` : '', pts: rr.v != null ? scoreRespRate(rr.v) : null, src: rr.src, at: rr.at },
    { name: 'Oxygen saturation', value: spo2.v != null ? `${spo2.v}%` : '', pts: spo2.v != null ? scoreSpo2(spo2.v) : null, src: spo2.src, at: spo2.at },
    { name: 'On extra oxygen', value: onO2 == null ? '' : onO2 ? 'Yes' : 'No', pts: onO2 == null ? null : scoreSupplementalOxygen(onO2), src: onO2 == null ? null : 'typed' },
    { name: 'Temperature', value: tempF.v != null ? `${tempF.v} °F (${tempC} °C)` : '', pts: tempC != null ? scoreTemperature(tempC) : null, src: tempF.src, at: tempF.at },
    { name: 'Systolic blood pressure', value: sbp.v != null ? `${sbp.v} mmHg` : '', pts: sbp.v != null ? scoreSystolic(sbp.v) : null, src: sbp.src, at: sbp.at },
    { name: 'Pulse', value: hr.v != null ? `${hr.v} bpm` : '', pts: hr.v != null ? scorePulse(hr.v) : null, src: hr.src, at: hr.at },
    { name: 'Alertness', value: acvpu ? ACVPU.find(a => a.id === acvpu)!.label : '', pts: acvpu ? scoreConsciousness(acvpu) : null, src: acvpu ? 'typed' : null },
  ]
  const measuredCount = rows.filter(r => r.pts != null).length
  const total = rows.reduce((a, r) => a + (r.pts ?? 0), 0)
  const assessment = measuredCount >= 2 ? assessRisk([{
    logged_at: new Date().toISOString(),
    heart_rate: hr.v, resp_rate: rr.v, oxygen_sat: spo2.v, systolic: sbp.v,
    temperature_c: tempC, consciousness: acvpu, on_oxygen: onO2,
  }]) : null
  // The RCP banding itself, from the aggregate and the single-parameter rule.
  // (assessRisk's own level also folds in Relay's unvalidated personal-baseline
  // layer, which is not part of NEWS2 and must not be labelled as a NEWS2 band.)
  const redFlag = rows.some(r => r.pts === 3)
  const level = total >= 7 ? 'high' : total >= 5 ? 'medium' : redFlag ? 'low-medium (a single parameter scored 3)' : 'low'

  const share = async () => {
    const lines = rows.filter(r => r.pts != null).map(r => `${r.name}: ${r.value} (+${r.pts}${r.src ? `, ${srcLabel[r.src]}` : ''})`)
    const text = [`Relay Arc vitals check, ${new Date().toLocaleString()}`, ...lines,
      `NEWS2 ${total} from ${measuredCount} of 7 parameters${assessment?.partial ? ' (partial)' : ''}.`,
      'Camera and motion readings are phone estimates, not a medical device.'].join('\n')
    try {
      if ((navigator as any).share) await (navigator as any).share({ title: 'Vitals check', text })
      else { await navigator.clipboard.writeText(text); toast.success('Copied. Paste it into a message to your care team') }
    } catch { /* cancelled */ }
  }

  const [saving, setSaving] = useState(false)
  const save = async () => {
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { toast('Sign in to keep a history. Your reading is still shown here.'); return }
      const res = await fetch('/api/vitals/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ heart_rate: hr.v, resp_rate: rr.v, oxygen_sat: spo2.v, systolic: sbp.v }),
      })
      if (!res.ok) throw new Error()
      toast.success('Saved to your vitals log')
    } catch { toast.error('Could not save right now') } finally { setSaving(false) }
  }

  const when = (d?: Date) => d ? ` · ${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''
  const stale = (d?: Date) => !!d && Date.now() - d.getTime() > 24 * 3600 * 1000

  // live display values
  const bpmShown = (hr.src === 'camera' || hr.src === 'demo') && pulseState === 'done' ? hr.v : live?.rate ?? null
  const pulseProgress = pulseState === 'done' && (hr.src === 'camera' || hr.src === 'demo') ? 1 : elapsed / (demo ? 10 : PULSE_SECONDS)
  const breathProgress = breathState === 'motion' || breathState === 'taps' ? 1 - breathLeft / (breathState === 'taps' ? TAP_SECONDS : BREATH_SECONDS) : breathState === 'done' && rr.v != null ? 1 : 0
  const ptsColor = (p: number | null) => p == null ? { bg: '#EEF2EC', fg: T3 } : p >= 3 ? { bg: RED, fg: '#fff' } : p === 2 ? { bg: ORANGE, fg: T1 } : p === 1 ? { bg: '#F4D9A0', fg: T1 } : { bg: '#D6EED0', fg: GREEN }

  return (
    <div style={{ background: PAGE, minHeight: '100dvh' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px 16px 64px' }}>
        <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: T1, fontWeight: 600, fontSize: '15px', cursor: 'pointer', padding: '6px 0', fontFamily: 'inherit' }}>
          <ArrowLeft size={17}/> Back
        </button>

        <div style={{ margin: '14px 0 20px' }}>
          <h1 style={{ color: T1, fontSize: '30px', fontWeight: 800, letterSpacing: '-0.4px', lineHeight: 1.15, margin: '0 0 8px' }}>
            Vitals check
          </h1>
          <p style={{ color: T2, fontSize: '16px', lineHeight: 1.55, margin: 0 }}>
            Your pulse from the camera and your breathing from the motion sensor, 15 seconds each.
            At the bottom is the NEWS2 table to show a doctor or paramedic. Nothing leaves this phone unless you share it.
          </p>
        </div>

        <a href={`tel:${emg.number}`} style={{ ...btn(true, RED), width: '100%', marginBottom: '20px', textDecoration: 'none' }}>
          <Phone size={18}/> Feeling very unwell? Call {emg.label} first
        </a>

        {/* ── Pulse ─────────────────────────────────────────────────────── */}
        <section style={panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
            <h2 style={{ ...h2, display: 'flex', alignItems: 'center', gap: '8px' }}><Heart size={19} color={RED} fill={bpmShown ? RED : 'none'}/>Pulse</h2>
            {demo
              ? <span style={{ fontSize: '12px', fontWeight: 700, background: '#FFD166', color: '#1A1300', padding: '3px 8px', borderRadius: '4px' }}>DEMO · simulated reading</span>
              : <span style={{ fontSize: '14px', color: T3 }}>camera + flash</span>}
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '10px 0 2px' }}>
            <span style={{ fontSize: '56px', fontWeight: 700, letterSpacing: '-1px', lineHeight: 1, color: bpmShown ? T1 : '#B9B6AA', fontVariantNumeric: 'tabular-nums' }}>
              {bpmShown ?? '—'}
            </span>
            <span style={{ fontSize: '17px', fontWeight: 600, color: T3 }}>bpm</span>
          </div>
          <p style={{ fontSize: '14px', color: hr.src === 'camera' && pulseState === 'done' ? GREEN : T3, margin: '0 0 12px' }}>
            {pulseState === 'running'
              ? (finger
                ? (demo ? `Reading… ${elapsed} of 10 s` : live?.confirmed ? `Steady signal (quality ${Math.round(live.quality * 100)}%)` : elapsed >= PULSE_SECONDS ? 'Almost there, keep holding' : `Reading… ${elapsed} of ${PULSE_SECONDS} s`)
                : 'Waiting for your fingertip')
              : hr.src === 'demo' && pulseState === 'done' ? 'Demo: simulated reading, not measured' : hr.src === 'camera' && pulseState === 'done' ? 'Measured with the camera' : 'Not measured yet'}
          </p>

          <div style={{ height: '3px', background: LINE, borderRadius: '2px', overflow: 'hidden', marginBottom: '10px' }}>
            <div style={{ height: '100%', width: `${Math.round(Math.min(1, pulseProgress) * 100)}%`, background: RED, transition: 'width 0.3s linear' }}/>
          </div>
          <canvas ref={canvasRef} width={1100} height={200}
            style={{ width: '100%', height: '96px', display: 'block', background: PAPER, border: `1px solid ${LINE}`, borderRadius: '6px' }}/>

          {pulseState !== 'running' && pulseState !== 'starting' && (
            <p style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', margin: '14px 0 0', color: T2, fontSize: '15px', lineHeight: 1.5 }}>
              <Hand size={19} style={{ flexShrink: 0, marginTop: '2px' }}/>
              <span>Rest your hand on a table and lay your fingertip gently over the back camera and flash, so it is fully covered. Don&apos;t press hard.</span>
            </p>
          )}
          {pulseState === 'running' && (coach || !torch) && (
            <p style={{ margin: '12px 0 0', padding: '10px 12px', borderRadius: '6px', background: '#FBEDE8', color: '#6B2410', fontSize: '14px', lineHeight: 1.5 }}>
              {coach ?? 'This browser cannot switch the flash on. Stand near a bright light, or shine a second phone’s torch behind your finger.'}
            </p>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
            {pulseState === 'running'
              ? <button style={btn(false)} onClick={() => { stopPulse(); setPulseState('idle') }}>Stop</button>
              : <button style={btn(true)} onClick={startPulse}><Heart size={17}/> {hr.src === 'camera' ? 'Measure again' : 'Measure pulse'}</button>}
            <input inputMode="numeric" aria-label="Type pulse instead" style={{ ...input, width: '140px' }}
              value={hr.src === 'typed' ? (hr.v ?? '') : ''} placeholder="or type bpm"
              onChange={e => { const n = parseInt(e.target.value); setHr(isNaN(n) ? empty : { v: n, src: 'typed' }) }}/>
          </div>
          {pulseMsg && <p style={{ color: RED, fontSize: '14px', marginTop: '10px', lineHeight: 1.5 }}>{pulseMsg}</p>}

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: T2, cursor: 'pointer', marginTop: '14px' }}>
            <input type="checkbox" checked={showRaw} onChange={e => setShowRaw(e.target.checked)}/> Show the raw signal
          </label>
          {showRaw && <div style={{ marginTop: '8px' }}><SignalView samples={rawPulseRef.current} kind="pulse" version={sigVersion}/></div>}
        </section>

        {/* ── Breathing ─────────────────────────────────────────────────── */}
        <section style={panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
            <h2 style={{ ...h2, display: 'flex', alignItems: 'center', gap: '8px' }}><Wind size={19} color={T1}/>Breathing rate</h2>
            <span style={{ fontSize: '14px', color: T3 }}>taps or motion sensor</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '10px 0 2px' }}>
            <span style={{ fontSize: '56px', fontWeight: 700, letterSpacing: '-1px', lineHeight: 1, color: rr.v != null || breathState === 'taps' ? T1 : '#B9B6AA', fontVariantNumeric: 'tabular-nums' }}>
              {breathState === 'taps' ? tapCount : rr.v ?? '—'}
            </span>
            <span style={{ fontSize: '17px', fontWeight: 600, color: T3 }}>{breathState === 'taps' ? 'taps' : 'per min'}</span>
          </div>
          <p style={{ fontSize: '14px', color: rr.v != null ? GREEN : T3, margin: '0 0 12px' }}>
            {breathState === 'motion' ? `Phone on chest, keep still… ${breathLeft} s` : breathState === 'taps' ? `Tap every breath in… ${breathLeft} s` : rr.v != null ? `Measured (${rr.src ? srcLabel[rr.src] : ''})` : 'Not measured yet'}
          </p>
          {(breathState === 'motion' || breathState === 'taps') && (
            <div style={{ height: '3px', background: LINE, borderRadius: '2px', overflow: 'hidden', marginBottom: '12px' }}>
              <div style={{ height: '100%', width: `${Math.round(Math.min(1, breathProgress) * 100)}%`, background: T1, transition: 'width 0.3s linear' }}/>
            </div>
          )}

          {breathState === 'taps' ? (
            <button onClick={() => { taps.current.push((Date.now() - tapStart.current) / 1000); setTapCount(n => n + 1); setTapPulse(n => n + 1) }}
              key={tapPulse}
              style={{ width: '100%', minHeight: '128px', borderRadius: '8px', border: `2px solid ${T1}`, cursor: 'pointer', fontFamily: 'inherit',
                background: '#FFFFFF', color: T1, fontSize: '20px', fontWeight: 700 }}>
              Tap here each time the chest rises
            </button>
          ) : (
            <>
              <p style={{ color: T2, fontSize: '15px', lineHeight: 1.5, margin: '0 0 12px' }}>
                Easiest is to tap once each time the chest rises. Or lie back and rest the phone flat on the chest for 15 seconds.
              </p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button style={btn(true)} onClick={startTaps} disabled={breathState === 'motion'}>Count by tapping</button>
                <button style={btn(false)} onClick={startMotionBreath} disabled={breathState === 'motion'}><Wind size={17}/> Phone on chest</button>
                <input inputMode="numeric" aria-label="Type breathing rate instead" style={{ ...input, width: '140px' }}
                  value={rr.src === 'typed' ? (rr.v ?? '') : ''} placeholder="or type /min"
                  onChange={e => { const n = parseInt(e.target.value); setRr(isNaN(n) ? empty : { v: n, src: 'typed' }) }}/>
              </div>
            </>
          )}
          {breathMsg && <p style={{ color: RED, fontSize: '14px', marginTop: '10px', lineHeight: 1.5 }}>{breathMsg}</p>}
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: T2, cursor: 'pointer', marginTop: '14px' }}>
            <input type="checkbox" checked={showRaw} onChange={e => setShowRaw(e.target.checked)}/> Show the raw signal
          </label>
          {showRaw && <div style={{ marginTop: '8px' }}><SignalView samples={motionSamples.current} kind="breath" version={sigVersion}/></div>}
        </section>

        {/* ── Apple Health ──────────────────────────────────────────────── */}
        <section style={panel}>
          <h2 style={h2}>Apple Health <span style={{ fontWeight: 500, color: T3, fontSize: '15px' }}>(optional)</span></h2>
          <p style={{ color: T2, fontSize: '15px', lineHeight: 1.55, margin: '6px 0 14px' }}>
            On iPhone, open Health, tap your picture, then <strong>Export All Health Data</strong> and choose the file here.
            Readings from an Apple Watch, a cuff or a pulse oximeter fill the gaps. The file is read on this phone and never uploaded.
          </p>
          <label style={{ ...btn(false), cursor: importing ? 'wait' : 'pointer' }}>
            <Upload size={17}/> {importing ? 'Reading…' : health ? 'Choose another export' : 'Choose export.zip'}
            <input type="file" accept=".zip,.xml,application/zip,text/xml" style={{ display: 'none' }} onChange={e => onHealthFile(e.target.files?.[0])}/>
          </label>
          {health && (
            <div style={{ marginTop: '14px' }}>
              <p style={{ fontSize: '14px', color: T3 }}>{health.recordsScanned.toLocaleString()} records scanned, {health.matched.toLocaleString()} vital-sign readings</p>
              {health.dailyHr.length > 3 && (
                <svg viewBox="0 0 300 80" style={{ width: '100%', height: '80px', marginTop: '8px', background: PAPER, border: `1px solid ${LINE}`, borderRadius: '6px' }}>
                  {(() => {
                    const d = health.dailyHr, lo = Math.min(...d.map(x => x.mean)) - 3, hi = Math.max(...d.map(x => x.mean)) + 3
                    const pts = d.map((x, i) => `${(i / (d.length - 1)) * 280 + 10},${72 - ((x.mean - lo) / (hi - lo)) * 56}`).join(' ')
                    return <><polyline points={pts} fill="none" stroke={T1} strokeWidth={2} strokeLinejoin="round"/>
                      <text x="10" y="13" fontSize="9" fill={T3}>daily mean pulse, last {d.length} days</text></>
                  })()}
                </svg>
              )}
            </div>
          )}
        </section>

        {/* ── Other readings ────────────────────────────────────────────── */}
        <section style={panel}>
          <h2 style={h2}>Anything else you know</h2>
          <p style={{ color: T3, fontSize: '14px', margin: '4px 0 12px' }}>Leave blank what you don&apos;t have.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label style={lbl}>Oxygen saturation (%)
              <input inputMode="numeric" style={{ ...input, marginTop: '6px' }} value={spo2.v ?? ''} placeholder="pulse oximeter"
                onChange={e => { const n = parseFloat(e.target.value); setSpo2(isNaN(n) ? empty : { v: n, src: 'typed' }) }}/>
            </label>
            <label style={lbl}>Top blood-pressure number
              <input inputMode="numeric" style={{ ...input, marginTop: '6px' }} value={sbp.v ?? ''} placeholder="e.g. 118"
                onChange={e => { const n = parseFloat(e.target.value); setSbp(isNaN(n) ? empty : { v: n, src: 'typed' }) }}/>
            </label>
            <label style={lbl}>Temperature (°F)
              <input inputMode="decimal" style={{ ...input, marginTop: '6px' }} value={tempF.v ?? ''} placeholder="e.g. 98.6"
                onChange={e => { const n = parseFloat(e.target.value); setTempF(isNaN(n) ? empty : { v: n, src: 'typed' }) }}/>
            </label>
            <div style={lbl}>On extra oxygen?
              <div style={{ display: 'flex', marginTop: '6px', border: `1px solid ${LINE2}`, borderRadius: '8px', overflow: 'hidden' }}>
                {[false, true].map(b => (
                  <button key={String(b)} onClick={() => setOnO2(b)} style={{ flex: 1, minHeight: '46px', border: 'none', fontFamily: 'inherit', fontSize: '15px', fontWeight: 600, cursor: 'pointer',
                    background: onO2 === b ? T1 : '#FFFFFF', color: onO2 === b ? '#FFFFFF' : T1 }}>{b ? 'Yes' : 'No'}</button>
                ))}
              </div>
            </div>
          </div>
          <p style={{ ...lbl, margin: '16px 0 6px' }}>How alert is the person?</p>
          <div style={{ border: `1px solid ${LINE2}`, borderRadius: '8px', overflow: 'hidden' }}>
            {ACVPU.map((a, i) => (
              <button key={a.id} onClick={() => setAcvpu(a.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '12px 14px', border: 'none',
                borderTop: i ? `1px solid ${LINE}` : 'none', background: '#FFFFFF', fontFamily: 'inherit', fontSize: '15px', color: T1, cursor: 'pointer', textAlign: 'left' }}>
                {a.label}{acvpu === a.id && <Check size={18} color={GREEN}/>}
              </button>
            ))}
          </div>
        </section>

        {/* ── NEWS2 ─────────────────────────────────────────────────────── */}
        <section style={{ ...panel, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 18px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '10px', borderBottom: `2px solid ${T1}` }}>
            <div>
              <h2 style={h2}>NEWS2 score</h2>
              <p style={{ fontSize: '14px', color: T3, margin: '2px 0 0' }}>For your doctor, nurse or paramedic. {measuredCount} of 7 measured.</p>
            </div>
            <span style={{ fontSize: '44px', fontWeight: 700, lineHeight: 1, color: T1, fontVariantNumeric: 'tabular-nums' }}>{assessment ? total : '–'}</span>
          </div>
          <div style={{ padding: '0 18px' }}>
            {rows.map(r => {
              const c = ptsColor(r.pts)
              return (
                <div key={r.name} style={{ display: 'grid', gridTemplateColumns: '1fr auto 44px', gap: '12px', alignItems: 'center', padding: '11px 0', borderBottom: `1px solid ${LINE}` }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: r.pts == null ? T3 : T1 }}>{r.name}</div>
                    {r.src && <div style={{ fontSize: '12.5px', color: stale(r.at) ? AMBER : T3 }}>{srcLabel[r.src]}{when(r.at)}{stale(r.at) ? ', older than a day' : ''}</div>}
                  </div>
                  <div style={{ fontSize: '15px', color: T1, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.value || <span style={{ color: T3 }}>not measured</span>}</div>
                  <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '15px', padding: '5px 0', borderRadius: '4px', background: c.bg, color: c.fg, fontVariantNumeric: 'tabular-nums' }}>
                    {r.pts == null ? '–' : `+${r.pts}`}
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ padding: '14px 18px 20px' }}>
            {assessment ? (
              <>
                <p style={{ fontSize: '14px', color: T1, fontWeight: 600, marginBottom: '6px' }}>{`Total ${total}. Royal College of Physicians band: ${level}.`}</p>
                <p style={{ color: T2, fontSize: '14px', lineHeight: 1.55 }}>
                  Each point comes from the published NEWS2 table, so a clinician can check it line by line.
                  Relay Arc does not interpret the score for you or tell you what is wrong.
                </p>
                {assessment.partial && (
                  <p style={{ color: T3, fontSize: '13.5px', lineHeight: 1.5, marginTop: '8px' }}>
                    {`${7 - measuredCount} of the seven measurements ${7 - measuredCount === 1 ? 'is' : 'are'} missing, which can only make the total lower than it really is.`}
                  </p>
                )}
              </>
            ) : (
              <p style={{ color: T3, fontSize: '15px' }}>Measure at least two things above to see a score.</p>
            )}
            <div style={{ borderTop: `1px solid ${LINE}`, marginTop: '16px', paddingTop: '14px' }}>
              <p style={{ color: T1, fontSize: '15px', fontWeight: 600, lineHeight: 1.45 }}>
                Whatever these numbers say, if you feel very unwell, are worried, or it is getting worse, call {emg.label}.
              </p>
              <a href={`tel:${emg.number}`} style={{ ...btn(true, RED), width: '100%', marginTop: '10px', textDecoration: 'none' }}>
                <Phone size={18}/> Call {emg.label}
              </a>
            </div>
            {measuredCount > 0 && (
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
                <button style={btn(true)} onClick={share}>Share with my care team</button>
                <button style={btn(false)} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save to my log'}</button>
              </div>
            )}
            <p style={{ fontSize: '12.5px', color: T3, marginTop: '16px', lineHeight: 1.5 }}>
              For clinicians: aggregate 0–4 low (low-medium if any single parameter scores 3), 5–6 medium, 7+ high. Royal College of Physicians, NEWS2 (2017).
              Camera and motion readings are phone estimates, not a medical device. Not a diagnosis.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
