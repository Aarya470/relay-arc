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
import { ArrowLeft, Heart, Wind, Upload, Phone, Check } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { estimateHeartRate, estimateBreathRate, breathRateFromTaps, detrend, resample, type Sample, type RateEstimate } from '@/lib/pulse'
import { startPulseCamera, type PulseCamera } from '@/lib/pulse/camera'
import { requestMotionPermission, startMotion, type MotionReader } from '@/lib/pulse/motion'
import { importAppleHealth, type HealthSummary } from '@/lib/health/apple'
import {
  assessRisk, scoreRespRate, scoreSpo2, scoreSystolic, scorePulse, scoreTemperature,
  scoreConsciousness, scoreSupplementalOxygen, type Acvpu,
} from '@/lib/risk'
import { emergencyNumber } from '@/lib/emergency-number'
import SignalView from '@/components/SignalView'

const PAGE = '#B3DDAC', CARD = '#FFFFFF', T1 = '#141413', T2 = '#4A4840', T3 = '#6E6B5D'
const LINE = '#98C890', RED = '#A33417', GREEN = '#42623C', AMBER = '#7C5200', ORANGE = '#D97757'
const mono = 'var(--font-mono, monospace)'

const PULSE_SECONDS = 25
const BREATH_SECONDS = 40
const TAP_SECONDS = 30

type Source = 'camera' | 'motion' | 'taps' | 'apple' | 'typed'
interface Val { v: number | null; src: Source | null; at?: Date }
const empty: Val = { v: null, src: null }

const ACVPU: { id: Acvpu; label: string }[] = [
  { id: 'A', label: 'Alert, talking normally' },
  { id: 'C', label: 'New confusion' },
  { id: 'V', label: 'Only responds to voice' },
  { id: 'P', label: 'Only responds to pain' },
  { id: 'U', label: 'Unresponsive' },
]

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section style={{ background: CARD, border: `1px solid ${T1}`, marginBottom: '16px' }}>
      <div style={{ borderBottom: `1px solid ${T1}`, padding: '10px 16px', display: 'flex', gap: '10px', alignItems: 'baseline' }}>
        <span style={{ fontFamily: mono, fontSize: '12px', fontWeight: 700, color: ORANGE }}>{n}</span>
        <span style={{ fontSize: '15px', fontWeight: 800, color: T1 }}>{title}</span>
      </div>
      <div style={{ padding: '16px' }}>{children}</div>
    </section>
  )
}

const btn = (primary = false): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'center',
  background: primary ? T1 : 'transparent', color: primary ? '#FFFFFF' : T1,
  border: `1.5px solid ${T1}`, borderRadius: '4px', padding: '12px 16px', minHeight: '48px',
  fontWeight: 700, fontSize: '15px', cursor: 'pointer', fontFamily: 'inherit',
})
const input: React.CSSProperties = {
  width: '100%', border: `1.5px solid ${LINE}`, borderRadius: '4px', padding: '11px 12px',
  fontSize: '17px', fontFamily: 'inherit', color: T1, background: '#FFFFFF', boxSizing: 'border-box',
}
const srcLabel: Record<Source, string> = {
  camera: 'camera', motion: 'motion sensor', taps: 'tapped', apple: 'Apple Health', typed: 'typed',
}

export default function VitalsCheck() {
  const router = useRouter()
  const [emg, setEmg] = useState({ number: '911', label: '911' })
  useEffect(() => { setEmg(emergencyNumber()) }, [])

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
  const [pulseEst, setPulseEst] = useState<RateEstimate | null>(null)
  const [finger, setFinger] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const camRef = useRef<PulseCamera | null>(null)
  const samplesRef = useRef<Sample[]>([])
  // Raw red values for the signal view (samplesRef holds the inverted copy).
  const rawPulseRef = useRef<Sample[]>([])
  const [showRaw, setShowRaw] = useState(false)
  const [sigVersion, setSigVersion] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const stopPulse = () => { camRef.current?.stop(); camRef.current = null }
  useEffect(() => () => { stopPulse(); motionRef.current?.stop() }, [])

  const drawWave = () => {
    const c = canvasRef.current; if (!c) return
    const ctx = c.getContext('2d'); if (!ctx) return
    const s = samplesRef.current
    ctx.clearRect(0, 0, c.width, c.height)
    if (s.length < 30) return
    const recent = s.filter(x => x.t > s[s.length - 1].t - 6)
    const y = detrend(resample(recent, 30), 30, 1.2)
    if (y.length < 2) return
    const max = Math.max(...y.map(Math.abs)) || 1
    ctx.strokeStyle = RED; ctx.lineWidth = 2.5; ctx.beginPath()
    y.forEach((v, i) => {
      const px = (i / (y.length - 1)) * c.width
      const py = c.height / 2 + (v / max) * (c.height / 2 - 6)   // darker = more blood = up
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)
    })
    ctx.stroke()
  }

  const startPulse = async () => {
    setPulseState('starting'); setPulseMsg(''); setPulseEst(null); samplesRef.current = []; rawPulseRef.current = []; setElapsed(0)
    try {
      let lastFinger = 0, startT = -1
      camRef.current = await startPulseCamera(f => {
        setFinger(f.finger)
        if (!f.finger) {
          // a lifted finger ruins the window: start the clock again
          if (f.t - lastFinger > 1) { samplesRef.current = []; rawPulseRef.current = []; startT = -1; setElapsed(0) }
          return
        }
        lastFinger = f.t
        if (startT < 0) startT = f.t
        samplesRef.current.push({ t: f.t, v: -f.r })   // invert: blood arriving darkens the frame
        rawPulseRef.current.push({ t: f.t, v: f.r })
        const secs = f.t - startT
        setElapsed(Math.floor(secs))
        if (samplesRef.current.length % 15 === 0) {
          drawWave()
          setSigVersion(v => v + 1)
          const win = samplesRef.current.filter(x => x.t > f.t - 20)
          const est = estimateHeartRate(win)
          if (secs >= 12) setPulseEst(est)
          if (secs >= PULSE_SECONDS) {
            stopPulse(); setPulseState('done')
            if (est.ok && est.rate) setHr({ v: est.rate, src: 'camera' })
            else setPulseMsg(est.problem || 'Could not get a clean reading. Try again, pressing lightly and holding still.')
          }
        }
      })
      setPulseState('running')
      if (!camRef.current.torch) setPulseMsg('This browser cannot switch the flash on. Stand near a bright light, or hold a second phone’s torch behind your finger.')
    } catch {
      setPulseState('error')
      setPulseMsg('Camera unavailable. Allow camera access, or type your pulse below.')
    }
  }

  // ── breathing ──────────────────────────────────────────────────────────────
  const [breathState, setBreathState] = useState<'idle' | 'motion' | 'taps' | 'done'>('idle')
  const [breathMsg, setBreathMsg] = useState('')
  const [breathLeft, setBreathLeft] = useState(0)
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
      setBreathLeft(left)
      setSigVersion(v => v + 1)
      if (left <= 0) {
        clearInterval(iv); motionRef.current?.stop()
        const s = motionSamples.current
        if (s.length < 50) { setBreathState('idle'); setBreathMsg('No motion data arrived. Use tap counting instead.'); return }
        const est = estimateBreathRate(s)
        setBreathState('done')
        if (est.ok && est.rate) setRr({ v: est.rate, src: 'motion' })
        else setBreathMsg(est.problem || 'Too much movement to read breathing. Lie still, or use tap counting.')
      }
    }, 250)
  }

  const startTaps = () => {
    taps.current = []; tapStart.current = Date.now()
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
      // Fill gaps only: a reading taken on this page, just now, beats an old one.
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
  // The RCP banding itself, computed here from the aggregate and the
  // single-parameter rule. (assessRisk's own `level` also folds in Relay's
  // unvalidated personal-baseline layer, which is not part of NEWS2 and must not
  // be labelled as a NEWS2 band.)
  const redFlag = rows.some(r => r.pts === 3)
  const level = total >= 7 ? 'high' : total >= 5 ? 'medium' : redFlag ? 'low-medium (a single parameter scored 3)' : 'low'

  // Plain-text handoff a clinician can read in a message or over the phone.
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

  return (
    <div style={{ background: PAGE, minHeight: '100dvh' }}>
      <div style={{ maxWidth: '620px', margin: '0 auto', padding: '18px 16px 60px' }}>
        <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: T1, fontWeight: 600, fontSize: '14px', cursor: 'pointer', padding: '6px 0', fontFamily: 'inherit' }}>
          <ArrowLeft size={16}/> Back
        </button>
        <h1 style={{ color: T1, fontSize: '34px', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1.05, margin: '12px 0 10px' }}>
          Check your vitals with just your phone
        </h1>
        <p style={{ color: T2, fontSize: '15.5px', lineHeight: 1.6, marginBottom: '14px' }}>
          No smartwatch or extra device needed. The camera reads your pulse and the motion sensor reads your breathing.
          Relay lays the readings out as a NEWS2 score, the early-warning score hospitals use, point by point,
          ready to show your doctor, nurse or a paramedic. Nothing leaves this phone unless you save or share it.
        </p>
        <a href={`tel:${emg.number}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', background: RED, color: '#fff', padding: '14px', fontWeight: 800, textDecoration: 'none', marginBottom: '18px', borderRadius: '4px' }}>
          <Phone size={18}/> Feeling very unwell? Call {emg.label} first
        </a>

        <Section n="01" title="Pulse, from the camera">
          <p style={{ color: T2, fontSize: '14.5px', lineHeight: 1.55, marginBottom: '12px' }}>
            Rest your fingertip lightly over the back camera and the flash, covering both. Hold still for {PULSE_SECONDS} seconds.
          </p>
          {(pulseState === 'running' || pulseState === 'starting') && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: mono, fontSize: '12px', color: finger ? GREEN : RED, marginBottom: '6px' }}>
                <span>{finger ? 'Finger detected, hold still' : 'Cover the camera and flash with your fingertip'}</span>
                <span>{elapsed}/{PULSE_SECONDS}s</span>
              </div>
              <canvas ref={canvasRef} width={560} height={90} style={{ width: '100%', height: '90px', background: '#FBF9F2', border: `1px solid ${LINE}` }}/>
              <div style={{ height: '4px', background: '#EDEAE0', marginTop: '6px' }}>
                <div style={{ height: '100%', width: `${Math.min(100, (elapsed / PULSE_SECONDS) * 100)}%`, background: RED }}/>
              </div>
              {pulseEst && (
                <p style={{ fontFamily: mono, fontSize: '12px', color: T3, marginTop: '6px' }}>
                  live estimate {pulseEst.rate ?? '…'} bpm · signal quality {Math.round(pulseEst.quality * 100)}%
                </p>
              )}
            </div>
          )}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            {pulseState === 'running'
              ? <button style={btn()} onClick={() => { stopPulse(); setPulseState('idle') }}>Stop</button>
              : <button style={btn(true)} onClick={startPulse}><Heart size={17}/> {hr.src === 'camera' ? 'Measure again' : 'Measure pulse'}</button>}
            {hr.src === 'camera' && <span style={{ fontWeight: 800, fontSize: '20px', color: T1 }}><Check size={18} color={GREEN}/> {hr.v} bpm</span>}
          </div>
          {pulseMsg && <p style={{ color: AMBER, fontSize: '13.5px', marginTop: '10px', lineHeight: 1.5 }}>{pulseMsg}</p>}
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', fontSize: '13px', color: T2, cursor: 'pointer' }}>
            <input type="checkbox" checked={showRaw} onChange={e => setShowRaw(e.target.checked)}/> Show the raw signal
          </label>
          {showRaw && <SignalView samples={rawPulseRef.current} kind="pulse" version={sigVersion}/>}
          <label style={{ display: 'block', marginTop: '14px', fontSize: '13px', color: T3 }}>Or type it (bpm)
            <input inputMode="numeric" style={{ ...input, marginTop: '4px' }} value={hr.src === 'typed' ? (hr.v ?? '') : ''} placeholder={hr.v != null && hr.src !== 'typed' ? String(hr.v) : 'e.g. 78'}
              onChange={e => { const n = parseInt(e.target.value); setHr(isNaN(n) ? empty : { v: n, src: 'typed' }) }}/>
          </label>
        </Section>

        <Section n="02" title="Breathing rate">
          <p style={{ color: T2, fontSize: '14.5px', lineHeight: 1.55, marginBottom: '12px' }}>
            Lie back and rest the phone flat on the chest, screen up, for {BREATH_SECONDS} seconds. Or tap the button once every time the chest rises.
          </p>
          {breathState === 'motion' && <p style={{ fontFamily: mono, fontSize: '13px', color: GREEN, marginBottom: '10px' }}>Reading breathing… keep still · {breathLeft}s</p>}
          {breathState === 'taps' ? (
            <button onClick={() => taps.current.push((Date.now() - tapStart.current) / 1000)}
              style={{ ...btn(true), width: '100%', minHeight: '110px', fontSize: '20px' }}>
              Tap each breath · {breathLeft}s
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button style={btn(true)} onClick={startMotionBreath} disabled={breathState === 'motion'}><Wind size={17}/> Phone on chest</button>
              <button style={btn()} onClick={startTaps} disabled={breathState === 'motion'}>Tap to count</button>
            </div>
          )}
          {rr.v != null && (rr.src === 'motion' || rr.src === 'taps') && breathState === 'done' &&
            <p style={{ fontWeight: 800, fontSize: '20px', color: T1, marginTop: '10px' }}><Check size={18} color={GREEN}/> {rr.v} breaths/min</p>}
          {breathMsg && <p style={{ color: AMBER, fontSize: '13.5px', marginTop: '10px' }}>{breathMsg}</p>}
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', fontSize: '13px', color: T2, cursor: 'pointer' }}>
            <input type="checkbox" checked={showRaw} onChange={e => setShowRaw(e.target.checked)}/> Show the raw signal (phone-on-chest mode)
          </label>
          {showRaw && <SignalView samples={motionSamples.current} kind="breath" version={sigVersion}/>}
          <label style={{ display: 'block', marginTop: '14px', fontSize: '13px', color: T3 }}>Or type it (breaths per minute)
            <input inputMode="numeric" style={{ ...input, marginTop: '4px' }} value={rr.src === 'typed' ? (rr.v ?? '') : ''} placeholder={rr.v != null && rr.src !== 'typed' ? String(rr.v) : 'e.g. 16'}
              onChange={e => { const n = parseInt(e.target.value); setRr(isNaN(n) ? empty : { v: n, src: 'typed' }) }}/>
          </label>
        </Section>

        <Section n="03" title="Apple Health (optional)">
          <p style={{ color: T2, fontSize: '14.5px', lineHeight: 1.55, marginBottom: '12px' }}>
            On iPhone: Health app → your picture → <strong>Export All Health Data</strong>, then pick the file here.
            Readings from an Apple Watch, a Bluetooth cuff or a pulse oximeter fill in the gaps. The file is read on this phone and never uploaded.
          </p>
          <label style={{ ...btn(), cursor: importing ? 'wait' : 'pointer' }}>
            <Upload size={17}/> {importing ? 'Reading…' : health ? 'Choose another export' : 'Choose export.zip'}
            <input type="file" accept=".zip,.xml,application/zip,text/xml" style={{ display: 'none' }} onChange={e => onHealthFile(e.target.files?.[0])}/>
          </label>
          {health && (
            <div style={{ marginTop: '12px' }}>
              <p style={{ fontFamily: mono, fontSize: '12px', color: T3 }}>{health.recordsScanned.toLocaleString()} records scanned · {health.matched.toLocaleString()} vital-sign readings</p>
              {health.dailyHr.length > 3 && (
                <svg viewBox="0 0 300 70" style={{ width: '100%', height: '70px', marginTop: '8px', background: '#FBF9F2', border: `1px solid ${LINE}` }}>
                  {(() => {
                    const d = health.dailyHr, lo = Math.min(...d.map(x => x.mean)) - 3, hi = Math.max(...d.map(x => x.mean)) + 3
                    const pts = d.map((x, i) => `${(i / (d.length - 1)) * 290 + 5},${65 - ((x.mean - lo) / (hi - lo)) * 60}`).join(' ')
                    return <><polyline points={pts} fill="none" stroke={RED} strokeWidth={2}/>
                      <text x="6" y="12" fontSize="9" fill={T3}>daily mean pulse, last {d.length} days ({lo + 3}–{hi - 3} bpm)</text></>
                  })()}
                </svg>
              )}
            </div>
          )}
        </Section>

        <Section n="04" title="The rest, if you know them">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label style={{ fontSize: '13px', color: T3 }}>Oxygen saturation (%)
              <input inputMode="numeric" style={{ ...input, marginTop: '4px' }} value={spo2.v ?? ''} placeholder="from a pulse oximeter"
                onChange={e => { const n = parseFloat(e.target.value); setSpo2(isNaN(n) ? empty : { v: n, src: 'typed' }) }}/>
            </label>
            <label style={{ fontSize: '13px', color: T3 }}>Top blood-pressure number
              <input inputMode="numeric" style={{ ...input, marginTop: '4px' }} value={sbp.v ?? ''} placeholder="e.g. 118"
                onChange={e => { const n = parseFloat(e.target.value); setSbp(isNaN(n) ? empty : { v: n, src: 'typed' }) }}/>
            </label>
            <label style={{ fontSize: '13px', color: T3 }}>Temperature (°F)
              <input inputMode="decimal" style={{ ...input, marginTop: '4px' }} value={tempF.v ?? ''} placeholder="e.g. 98.6"
                onChange={e => { const n = parseFloat(e.target.value); setTempF(isNaN(n) ? empty : { v: n, src: 'typed' }) }}/>
            </label>
            <div style={{ fontSize: '13px', color: T3 }}>On extra oxygen?
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                {[false, true].map(b => (
                  <button key={String(b)} onClick={() => setOnO2(b)} style={{ ...btn(onO2 === b), flex: 1, padding: '10px' }}>{b ? 'Yes' : 'No'}</button>
                ))}
              </div>
            </div>
          </div>
          <p style={{ fontSize: '13px', color: T3, margin: '14px 0 6px' }}>How alert is the person?</p>
          <div style={{ display: 'grid', gap: '6px' }}>
            {ACVPU.map(a => (
              <button key={a.id} onClick={() => setAcvpu(a.id)} style={{ ...btn(acvpu === a.id), justifyContent: 'flex-start', minHeight: '42px', padding: '9px 12px', fontSize: '14.5px' }}>
                {a.label}
              </button>
            ))}
          </div>
        </Section>

        {/* NEWS2, every point shown */}
        <section style={{ background: CARD, border: `2px solid ${T1}` }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${T1}`, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px' }}>
            <span style={{ fontSize: '16px', fontWeight: 900, color: T1 }}>NEWS2 · for your doctor, nurse or paramedic</span>
            <span style={{ fontFamily: mono, fontSize: '12px', color: T3 }}>{measuredCount} of 7 measured</span>
          </div>
          <div>
            {rows.map(r => (
              <div key={r.name} style={{ display: 'grid', gridTemplateColumns: '1fr auto 44px', gap: '10px', alignItems: 'center', padding: '10px 16px', borderBottom: `1px solid #E7E3D6` }}>
                <div>
                  <div style={{ fontSize: '14.5px', fontWeight: 700, color: r.pts == null ? T3 : T1 }}>{r.name}</div>
                  {r.src && <div style={{ fontFamily: mono, fontSize: '11px', color: stale(r.at) ? AMBER : T3 }}>{srcLabel[r.src]}{when(r.at)}{stale(r.at) ? ' · older than a day' : ''}</div>}
                </div>
                <div style={{ fontSize: '14.5px', color: T1, textAlign: 'right' }}>{r.value || <span style={{ color: T3 }}>not measured</span>}</div>
                <div style={{
                  textAlign: 'center', fontWeight: 900, fontSize: '16px', padding: '4px 0',
                  background: r.pts == null ? '#F1EEE4' : r.pts >= 3 ? RED : r.pts === 2 ? ORANGE : r.pts === 1 ? '#F3D9A6' : '#DCEFD8',
                  color: r.pts == null ? T3 : r.pts >= 2 ? '#fff' : T1,
                }}>{r.pts == null ? '–' : `+${r.pts}`}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: '16px' }}>
            {assessment ? (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '46px', fontWeight: 900, color: T1, lineHeight: 1 }}>{total}</span>
                  <span style={{ fontFamily: mono, fontSize: '12.5px', color: T2 }}>
                    {`NEWS2 aggregate · RCP band: ${level}`}
                  </span>
                </div>
                <p style={{ color: T2, fontSize: '13.5px', lineHeight: 1.55 }}>
                  Every point above comes from the Royal College of Physicians table, so a clinician can check it line by line.
                  Relay does not interpret this score for you or tell you what is wrong.
                </p>
                {assessment.partial && (
                  <p style={{ color: T3, fontSize: '12.5px', lineHeight: 1.5, marginTop: '8px' }}>
                    {`Partial: ${7 - measuredCount} of NEWS2\u2019s seven measurements ${7 - measuredCount === 1 ? 'is' : 'are'} missing, which can only make the total lower than it really is.`}
                  </p>
                )}
              </>
            ) : (
              <p style={{ color: T3, fontSize: '14px' }}>Measure at least two things above to lay out a score.</p>
            )}
            <div style={{ border: `2px solid ${RED}`, padding: '12px', marginTop: '14px' }}>
              <p style={{ color: T1, fontSize: '14.5px', fontWeight: 700, lineHeight: 1.45 }}>
                Whatever these numbers say: if you feel very unwell, are worried, or it is getting worse, call {emg.label}.
              </p>
              <a href={`tel:${emg.number}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', background: RED, color: '#fff', padding: '13px', fontWeight: 800, textDecoration: 'none', marginTop: '10px', borderRadius: '4px' }}>
                <Phone size={18}/> Call {emg.label}
              </a>
            </div>
            {measuredCount > 0 && (
              <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
                <button style={btn(true)} onClick={share}>Share with my care team</button>
                <button style={btn()} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save to my log'}</button>
              </div>
            )}
            <p style={{ fontFamily: mono, fontSize: '11px', color: T3, marginTop: '14px', lineHeight: 1.5 }}>
              For clinicians: aggregate 0–4 low (low-medium if any single parameter scores 3), 5–6 medium, 7+ high. Royal College of Physicians, NEWS2 (2017).
              Camera and motion readings are phone estimates, not a medical device. Not a diagnosis.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
