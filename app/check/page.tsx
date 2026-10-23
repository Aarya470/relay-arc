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
//   - everything else from Apple Watch and the daily check-in.
// Then every one of NEWS2's seven parameters is scored on screen, point by
// point, so a person (or a paramedic they show it to) can see exactly why.
//
// No account is needed. When signed in, phone readings are saved automatically
// and the NEWS2 table also pulls in Apple Watch readings and anything stated in
// today's check-in (lib/news2/sources.ts). Nothing is typed in by hand.
// Signal maths: lib/pulse.
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
import { ArrowLeft, Heart, Wind, Phone, Hand, Watch, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { bestChannelEstimate, approxHeartRate, fingerCoach, estimateBreathRate, breathRateFromTaps, detrend, resample, type Sample } from '@/lib/pulse'
import { startPulseCamera, type PulseCamera } from '@/lib/pulse/camera'
import { requestMotionPermission, startMotion, type MotionReader } from '@/lib/pulse/motion'
import { collectNews2, type News2Inputs, type SourceKind } from '@/lib/news2/sources'
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
const BREATH_SECONDS = 15
const TAP_SECONDS = 15

type Source = SourceKind
interface Val { v: number | null; src: Source | null; at?: Date; approx?: 'fair' | 'rough' }
const empty: Val = { v: null, src: null }

const ACVPU: { id: Acvpu; label: string }[] = [
  { id: 'A', label: 'Alert, talking normally' },
  { id: 'C', label: 'New confusion' },
  { id: 'V', label: 'Only responds to voice' },
  { id: 'P', label: 'Only responds to pain' },
  { id: 'U', label: 'Unresponsive' },
]
const srcLabel: Record<Source, string> = {
  camera: 'phone camera', motion: 'motion sensor', taps: 'tapped', apple: 'Apple Watch', checkin: 'from your check-in', typed: 'typed', demo: 'DEMO, simulated',
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
  const [acvpu, setAcvpu] = useState<{ v: Acvpu; src: Source; at?: Date } | null>(null)
  const [onO2, setOnO2] = useState<{ v: boolean; src: Source; at?: Date } | null>(null)

  // ── everything already known: Apple Watch, saved phone readings, check-in ──
  // The sheet fills itself from the last 24 hours and refreshes when the page
  // comes back into view, so a check-in done a minute ago shows up here.
  const [signedIn, setSignedIn] = useState(false)
  const [watchLast, setWatchLast] = useState<Date | null>(null)
  const [checkinLast, setCheckinLast] = useState<Date | null>(null)
  const applySources = (n: News2Inputs) => {
    const take = (r: News2Inputs['pulse'], set: (f: (p: Val) => Val) => void) => {
      if (!r) return
      set(p => (p.v == null || (p.at && r.at > p.at && p.src !== 'demo')) ? { v: r.value, src: r.source, at: r.at, approx: r.approx } : p)
    }
    take(n.pulse, setHr); take(n.resp_rate, setRr); take(n.spo2, setSpo2); take(n.systolic, setSbp)
    if (n.temp_c) setTempF(p => p.v == null || (p.at && n.temp_c!.at > p.at) ? { v: Math.round((n.temp_c!.value * 9 / 5 + 32) * 10) / 10, src: n.temp_c!.source, at: n.temp_c!.at } : p)
    if (n.acvpu) setAcvpu({ v: n.acvpu.value, src: n.acvpu.source, at: n.acvpu.at })
    if (n.on_oxygen) setOnO2({ v: n.on_oxygen.value, src: n.on_oxygen.source, at: n.on_oxygen.at })
  }
  useEffect(() => {
    let alive = true
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !alive) return
      setSignedIn(true)
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
      const [v, c] = await Promise.all([
        supabase.from('vitals_logs').select('heart_rate, resp_rate, oxygen_sat, systolic, source, logged_at').eq('user_id', user.id).gte('logged_at', since).order('logged_at', { ascending: false }).limit(50),
        supabase.from('checkins').select('summary, created_at').eq('user_id', user.id).gte('created_at', since).order('created_at', { ascending: false }).limit(5),
      ])
      if (!alive) return
      const vit = v.data || [], chk = c.data || []
      const w = vit.find((r: any) => r.source === 'apple_health')
      setWatchLast(w ? new Date(w.logged_at) : null)
      setCheckinLast(chk[0] ? new Date(chk[0].created_at) : null)
      applySources(collectNews2(vit as any, chk as any))
    }
    load()
    const onFocus = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onFocus)
    return () => { alive = false; document.removeEventListener('visibilitychange', onFocus) }
  }, [])

  // Phone readings are saved automatically when signed in, so the NEWS2 sheet
  // on the dashboard and here stay in step. Nothing is typed by hand.
  const autoSave = async (fields: { heart_rate?: number; resp_rate?: number }, source: 'camera' | 'motion' | 'taps') => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      await fetch('/api/vitals/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ ...fields, source }),
      })
    } catch { /* offline: the reading still shows on this page */ }
  }

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
      // At most 15 seconds of fingertip signal. A lifted finger pauses the
      // clock rather than restarting it, and when the window ends the page
      // always gives its best estimate: confirmed if the signal agreed with
      // itself, otherwise "about N bpm" with how rough it is.
      let startT = -1, frames = 0, fingerSecs = 0, lastT = -1, done = false
      const wallStart = performance.now()
      const finish = () => {
        if (done) return
        done = true
        stopPulse(); setPulseState('done'); setLive(null)
        const est = bestChannelEstimate(redRef.current, greenRef.current)
        drawWave(est.channel === 'green' ? greenRef.current : redRef.current)
        setSigVersion(v => v + 1)
        if (est.confirmed && est.rate) { setHr({ v: est.rate, src: 'camera', at: new Date() }); autoSave({ heart_rate: est.rate }, 'camera'); return }
        const guess = approxHeartRate(redRef.current, greenRef.current)
        if (guess) { setHr({ v: guess.rate, src: 'camera', at: new Date(), approx: guess.confidence === 'good' ? 'fair' : guess.confidence }); autoSave({ heart_rate: guess.rate }, 'camera') }
        else setPulseMsg('The camera never saw a covered lens for long enough. Lay your fingertip flat over the camera and flash, and try again.')
      }
      camRef.current = await startPulseCamera(f => {
        if (done) return
        frames++
        setFinger(f.finger)
        if (frames % 10 === 0) setCoach(f.finger ? null : fingerCoach(f.r, f.g, f.spread))
        // give up after 30 s on the clock if a fingertip never settled
        if ((performance.now() - wallStart) / 1000 > 30) { finish(); return }
        if (!f.finger) { lastT = -1; return }
        if (startT < 0) startT = f.t
        if (lastT >= 0) fingerSecs += Math.min(0.2, f.t - lastT)
        lastT = f.t
        // inverted: blood arriving darkens the frame
        redRef.current.push({ t: f.t, v: -f.r }); greenRef.current.push({ t: f.t, v: -f.g })
        rawPulseRef.current.push({ t: f.t, v: f.r })
        const secs = fingerSecs
        setElapsed(Math.floor(secs))
        if (demo && secs >= 10) {
          done = true
          drawWave(redRef.current)
          stopPulse(); setPulseState('done'); setLive(null)
          setHr({ v: 73, src: 'demo' })
          return
        }
        if (redRef.current.length % 12 === 0) {
          const est = bestChannelEstimate(redRef.current, greenRef.current)
          drawWave(est.channel === 'green' ? greenRef.current : redRef.current)
          setSigVersion(v => v + 1)
          if (secs >= 6 && !demo) {
            const g = est.rate ? null : approxHeartRate(redRef.current, greenRef.current)
            setLive({ rate: est.rate ?? g?.rate ?? null, quality: est.quality, confirmed: est.confirmed })
          }
        }
        if (secs >= PULSE_SECONDS) finish()
      })
      setTorch(camRef.current.torch)
      setPulseState('running')
    } catch {
      setPulseState('error')
      setPulseMsg('Camera unavailable. Allow camera access in your browser settings and try again.')
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
        if (est.ok && est.rate) { setRr({ v: est.rate, src: 'motion', at: new Date() }); autoSave({ resp_rate: est.rate }, 'motion') }
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
        if (rate) { setRr({ v: rate, src: 'taps', at: new Date() }); autoSave({ resp_rate: rate }, 'taps') }
        else setBreathMsg('Not enough taps. Tap once each time the chest rises.')
      }
    }, 200)
  }

  // ── NEWS2 ──────────────────────────────────────────────────────────────────
  const tempC = tempF.v != null ? Math.round(((tempF.v - 32) * 5 / 9) * 10) / 10 : null
  const rows: { name: string; value: string; pts: number | null; src: Source | null; at?: Date }[] = [
    { name: 'Breathing rate', value: rr.v != null ? `${rr.v} /min` : '', pts: rr.v != null ? scoreRespRate(rr.v) : null, src: rr.src, at: rr.at },
    { name: 'Oxygen saturation', value: spo2.v != null ? `${spo2.v}%` : '', pts: spo2.v != null ? scoreSpo2(spo2.v) : null, src: spo2.src, at: spo2.at },
    { name: 'On extra oxygen', value: onO2 == null ? '' : onO2.v ? 'Yes' : 'No', pts: onO2 == null ? null : scoreSupplementalOxygen(onO2.v), src: onO2?.src ?? null, at: onO2?.at },
    { name: 'Temperature', value: tempF.v != null ? `${tempF.v} °F (${tempC} °C)` : '', pts: tempC != null ? scoreTemperature(tempC) : null, src: tempF.src, at: tempF.at },
    { name: 'Systolic blood pressure', value: sbp.v != null ? `${sbp.v} mmHg` : '', pts: sbp.v != null ? scoreSystolic(sbp.v) : null, src: sbp.src, at: sbp.at },
    { name: 'Pulse', value: hr.v != null ? `${hr.approx ? 'about ' : ''}${hr.v} bpm` : '', pts: hr.v != null ? scorePulse(hr.v) : null, src: hr.src, at: hr.at },
    { name: 'Alertness', value: acvpu ? ACVPU.find(a => a.id === acvpu.v)!.label : '', pts: acvpu ? scoreConsciousness(acvpu.v) : null, src: acvpu?.src ?? null, at: acvpu?.at },
  ]
  const measuredCount = rows.filter(r => r.pts != null).length
  const total = rows.reduce((a, r) => a + (r.pts ?? 0), 0)
  const assessment = measuredCount >= 2 ? assessRisk([{
    logged_at: new Date().toISOString(),
    heart_rate: hr.v, resp_rate: rr.v, oxygen_sat: spo2.v, systolic: sbp.v,
    temperature_c: tempC, consciousness: acvpu?.v ?? null, on_oxygen: onO2?.v ?? null,
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
      else { await navigator.clipboard.writeText(text); toast.success('Copied. Paste it into a message to your doctor') }
    } catch { /* cancelled */ }
  }

  const when = (d?: Date) => d ? ` · ${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''
  const stale = (d?: Date) => !!d && Date.now() - d.getTime() > 24 * 3600 * 1000

  // live display values
  const bpmShown = pulseState === 'running' || pulseState === 'starting' ? live?.rate ?? null : hr.v
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
            The NEWS2 table at the bottom also uses your Apple Watch and today&apos;s check-in, and updates by itself.
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
              {bpmShown != null && (hr.approx || (pulseState === 'running' && !live?.confirmed)) ? '~' : ''}{bpmShown ?? '—'}
            </span>
            <span style={{ fontSize: '17px', fontWeight: 600, color: T3 }}>bpm</span>
          </div>
          <p style={{ fontSize: '14px', color: hr.src === 'camera' && pulseState === 'done' ? GREEN : T3, margin: '0 0 12px' }}>
            {pulseState === 'running'
              ? (finger
                ? (demo ? `Reading… ${elapsed} of 10 s` : live?.confirmed ? `Steady signal, ${elapsed} of ${PULSE_SECONDS} s` : `Reading… ${elapsed} of ${PULSE_SECONDS} s`)
                : 'Waiting for your fingertip')
              : hr.src === 'demo' && pulseState === 'done' ? 'Demo: simulated reading, not measured' : hr.src === 'camera' && pulseState === 'done' ? (hr.approx ? `Approximate. The signal was ${hr.approx === 'rough' ? 'noisy' : 'a little uneven'}, so treat this as about ${hr.v} bpm, give or take ${hr.approx === 'rough' ? 10 : 5}. Measure again for a steadier reading.` : 'Measured with the camera, steady signal') : hr.v != null && hr.src ? `Latest: ${srcLabel[hr.src]}${when(hr.at)}` : 'Not measured yet'}
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
            {breathState === 'motion' ? `Phone on chest, keep still… ${breathLeft} s` : breathState === 'taps' ? `Tap every breath in… ${breathLeft} s` : rr.v != null && rr.src ? `Latest: ${srcLabel[rr.src]}${when(rr.at)}` : 'Not measured yet'}
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
              </div>
            </>
          )}
          {breathMsg && <p style={{ color: RED, fontSize: '14px', marginTop: '10px', lineHeight: 1.5 }}>{breathMsg}</p>}
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: T2, cursor: 'pointer', marginTop: '14px' }}>
            <input type="checkbox" checked={showRaw} onChange={e => setShowRaw(e.target.checked)}/> Show the raw signal
          </label>
          {showRaw && <div style={{ marginTop: '8px' }}><SignalView samples={motionSamples.current} kind="breath" version={sigVersion}/></div>}
        </section>

        {/* ── Also counted ────────────────────────────────────────────── */}
        <section style={panel}>
          <h2 style={h2}>Also counted automatically</h2>
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <Watch size={20} style={{ flexShrink: 0, marginTop: '2px' }}/>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: T1 }}>Apple Watch</p>
                <p style={{ fontSize: '14px', color: T2, lineHeight: 1.5 }}>
                  {watchLast ? `Last sync ${watchLast.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}. Pulse, oxygen, breathing and blood pressure from your watch fill in below.`
                    : 'Not connected. Once set up, your watch readings arrive here by themselves, with nothing to upload.'}
                </p>
                {!watchLast && <a href="/connect-health" style={{ fontSize: '14px', fontWeight: 700, color: T1 }}>Connect Apple Watch →</a>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', borderTop: `1px solid ${LINE}`, paddingTop: '12px' }}>
              <MessageCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }}/>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: T1 }}>Daily check-in</p>
                <p style={{ fontSize: '14px', color: T2, lineHeight: 1.5 }}>
                  {checkinLast ? `Today at ${checkinLast.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}. ` : ''}
                  Anything you tell the check-in, like a temperature, an oxygen reading, feeling confused or being on oxygen, is added to the score.
                </p>
                {!checkinLast && signedIn && <a href="/checkin" style={{ fontSize: '14px', fontWeight: 700, color: T1 }}>Do today&apos;s check-in →</a>}
              </div>
            </div>
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
                <button style={btn(true)} onClick={share}>Share these readings</button>
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
