'use client'
// Signal view: the raw sensor data behind a reading, drawn live.
import { useEffect, useRef } from 'react'
import { resample, detrend, spectrum, type Sample } from '@/lib/pulse'

const INK = '#141413',
  GRID = '#E4E0D3',
  MUTED = '#6E6B5D'
const mono = 'var(--font-mono, monospace)'

function drawLine(
  c: HTMLCanvasElement | null,
  xs: number[],
  ys: number[],
  color: string,
  opts: { marker?: number; label?: string } = {},
) {
  if (!c) return
  const ctx = c.getContext('2d')
  if (!ctx) return
  const W = c.width,
    H = c.height
  ctx.clearRect(0, 0, W, H)
  ctx.strokeStyle = GRID
  ctx.lineWidth = 1
  for (let i = 1; i < 4; i++) {
    ctx.beginPath()
    ctx.moveTo(0, (H * i) / 4)
    ctx.lineTo(W, (H * i) / 4)
    ctx.stroke()
  }
  if (xs.length < 2) return
  const x0 = xs[0],
    x1 = xs[xs.length - 1]
  let lo = Infinity,
    hi = -Infinity
  for (const y of ys) {
    if (y < lo) lo = y
    if (y > hi) hi = y
  }
  if (hi === lo) {
    hi += 1
    lo -= 1
  }
  const px = (x: number) => ((x - x0) / (x1 - x0 || 1)) * W
  const py = (y: number) => H - 6 - ((y - lo) / (hi - lo)) * (H - 12)
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.beginPath()
  xs.forEach((x, i) => (i ? ctx.lineTo(px(x), py(ys[i])) : ctx.moveTo(px(x), py(ys[i]))))
  ctx.stroke()
  if (opts.marker != null) {
    ctx.strokeStyle = '#A33417'
    ctx.setLineDash([6, 4])
    ctx.beginPath()
    ctx.moveTo(px(opts.marker), 0)
    ctx.lineTo(px(opts.marker), H)
    ctx.stroke()
    ctx.setLineDash([])
    if (opts.label) {
      ctx.fillStyle = '#A33417'
      ctx.font = `bold 22px monospace`
      ctx.fillText(opts.label, Math.min(px(opts.marker) + 8, W - 160), 26)
    }
  }
}

export default function SignalView({
  samples,
  kind,
  version,
}: {
  /** Raw samples: t in seconds, v = the raw sensor value (red mean, or accel z). */
  samples: Sample[]
  kind: 'pulse' | 'breath'
  /** Bump to redraw. */
  version: number
}) {
  const a = useRef<HTMLCanvasElement>(null),
    b = useRef<HTMLCanvasElement>(null),
    c = useRef<HTMLCanvasElement>(null)
  const cfg =
    kind === 'pulse'
      ? {
          hz: 30,
          det: 1.2,
          lo: 40 / 60,
          hi: 200 / 60,
          win: 10,
          specWin: 20,
          unit: 'bpm',
          raw: 'Raw: mean red brightness of each camera frame',
          rawColor: '#C0392B',
        }
      : {
          hz: 20,
          det: 12,
          lo: 6 / 60,
          hi: 40 / 60,
          win: 40,
          specWin: 40,
          unit: '/min',
          raw: 'Raw: accelerometer z axis (m/s²)',
          rawColor: '#2F6FB0',
        }
  const draw = () => {
    if (samples.length < 10) return
    const tEnd = samples[samples.length - 1].t
    const recent = samples.filter((s) => s.t > tEnd - cfg.win)
    drawLine(
      a.current,
      recent.map((s) => s.t),
      recent.map((s) => s.v),
      cfg.rawColor,
    )
    const forSpec = samples.filter((s) => s.t > tEnd - cfg.specWin)
    const x = resample(forSpec, cfg.hz)
    if (x.length < cfg.hz * 3) return
    const y = detrend(x, cfg.hz, cfg.det)
    const show = y.slice(-cfg.hz * cfg.win)
    drawLine(
      b.current,
      show.map((_, i) => i / cfg.hz),
      kind === 'pulse' ? show.map((v) => -v) : show,
      '#42623C',
    )
    const { freqs, power } = spectrum(y, cfg.hz, cfg.lo, cfg.hi, kind === 'pulse' ? 0.01 : 0.005)
    let best = 0
    for (let i = 1; i < power.length; i++) if (power[i] > power[best]) best = i
    drawLine(
      c.current,
      freqs.map((f) => f * 60),
      power,
      '#B5651D',
      { marker: freqs[best] * 60, label: `peak ${Math.round(freqs[best] * 60)} ${cfg.unit}` },
    )
  }
  // Redraw on every animation frame while new samples are arriving, so the
  // traces scroll smoothly instead of jumping a few times a second. When the
  // recording stops, the loop finds nothing new and does no work.
  useEffect(() => {
    let raf = 0,
      seen = -1
    const tick = () => {
      if (samples.length !== seen) {
        seen = samples.length
        draw()
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [samples, kind])
  useEffect(() => {
    draw() // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])

  const download = () => {
    const header = kind === 'pulse' ? 't_seconds,red_mean' : 't_seconds,accel_z'
    const body = samples.map((s) => `${s.t.toFixed(4)},${kind === 'pulse' ? -s.v : s.v}`).join('\n')
    const url = URL.createObjectURL(new Blob([header + '\n' + body], { type: 'text/csv' }))
    const el = document.createElement('a')
    el.href = url
    el.download = `relay-arc-${kind}-raw.csv`
    el.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const label = (t: string) => (
    <p style={{ fontFamily: mono, fontSize: '11px', color: MUTED, margin: '10px 0 4px' }}>{t}</p>
  )
  const canvas = (r: React.RefObject<HTMLCanvasElement | null>) => (
    <canvas
      ref={r}
      width={1000}
      height={170}
      style={{
        width: '100%',
        height: '85px',
        background: '#FBF9F2',
        border: `1px solid ${GRID}`,
        display: 'block',
      }}
    />
  )
  return (
    <div style={{ marginTop: '12px', borderTop: `1px solid ${GRID}`, paddingTop: '4px' }}>
      {label(`1 · ${cfg.raw}, last ${cfg.win} s`)}
      {canvas(a)}
      {label('2 · Drift removed (what the estimator analyses)')}
      {canvas(b)}
      {label(`3 · Frequency scan: the peak is the reading`)}
      {canvas(c)}
      <p style={{ fontFamily: mono, fontSize: '11px', color: MUTED, marginTop: '8px' }}>
        {samples.length} raw samples recorded on this phone.{' '}
        <button
          onClick={download}
          disabled={samples.length < 10}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: INK,
            textDecoration: 'underline',
            cursor: 'pointer',
            fontFamily: mono,
            fontSize: '11px',
          }}
        >
          Download raw data (CSV)
        </button>
      </p>
    </div>
  )
}
