'use client'
// A 15 second camera pulse reading, or type it in. Used by the stand test.
import { useEffect, useRef, useState } from 'react'
import { startPulseCamera, type PulseCamera } from '@/lib/pulse/camera'
import { approxHeartRate, bestChannelEstimate, fingerCoach, type Sample } from '@/lib/pulse'

export default function QuickPulse({ label, onValue }: { label: string; onValue: (bpm: number, how: 'camera' | 'typed') => void }) {
  const [mode, setMode] = useState<'idle' | 'reading' | 'typing'>('idle')
  const [left, setLeft] = useState(15)
  const [coach, setCoach] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const cam = useRef<PulseCamera | null>(null)
  const red = useRef<Sample[]>([])
  const green = useRef<Sample[]>([])

  useEffect(() => () => cam.current?.stop(), [])

  const start = async () => {
    setErr(null)
    red.current = []
    green.current = []
    try {
      cam.current = await startPulseCamera((f) => {
        if (!f.finger) {
          setCoach(fingerCoach(f.r, f.g, f.spread) || 'Cover the back camera and flash with your fingertip')
          return
        }
        setCoach(null)
        red.current.push({ t: f.t, v: f.r })
        green.current.push({ t: f.t, v: f.g })
      })
      setMode('reading')
      const t0 = Date.now()
      const iv = setInterval(() => {
        const s = 15 - Math.floor((Date.now() - t0) / 1000)
        setLeft(Math.max(0, s))
        if (s <= 0) {
          clearInterval(iv)
          cam.current?.stop()
          const best = bestChannelEstimate(red.current, green.current)
          const rate = best.confirmed && best.rate ? best.rate : approxHeartRate(red.current, green.current)?.rate
          if (rate) onValue(rate, 'camera')
          else {
            setErr('Could not get a clear reading. Try again, or type it in.')
            setMode('idle')
          }
        }
      }, 250)
    } catch {
      setErr('The camera is not available here. Type your pulse instead.')
      setMode('typing')
    }
  }

  if (mode === 'reading')
    return (
      <div className="qp" role="status" aria-live="polite">
        <p className="qp-big">{left}s</p>
        <p className="qp-sub">{coach || `Reading your pulse. Keep your finger still.`}</p>
      </div>
    )

  return (
    <div className="qp">
      <p className="qp-label">{label}</p>
      {mode === 'typing' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const n = Number(typed)
            if (!n || n < 30 || n > 230) return setErr('Enter a pulse between 30 and 230')
            onValue(Math.round(n), 'typed')
          }}
          className="qp-row"
        >
          <input inputMode="numeric" aria-label="Pulse in beats per minute" value={typed} onChange={(e) => { setTyped(e.target.value.replace(/\D/g, '').slice(0, 3)); setErr(null) }} placeholder="bpm" autoFocus />
          <button className="ds-btn ds-btn-ink" type="submit">Save</button>
        </form>
      ) : (
        <div className="qp-row">
          <button className="ds-btn ds-btn-sos" onClick={start}>Measure with camera</button>
          <button className="ds-btn ds-btn-line" onClick={() => setMode('typing')}>Type it</button>
        </div>
      )}
      {err && <p className="qp-err">{err}</p>}
    </div>
  )
}
