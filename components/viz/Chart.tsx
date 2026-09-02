'use client'
// Inline SVG charts. No charting library — these are simple enough that
// Recharts' ~100 KB would buy nothing, and hand-built SVG themes with the
// palette and stays crisp at any size.
//
// Every chart on the features page is fed real numbers from the engines or the
// benchmark, never invented shapes.
import { useEffect, useRef, useState } from 'react'

const INK = '#141413', INK2 = '#5C5A52', INK3 = '#6F6D65', BORDER = '#98C890'
const mono = 'var(--font-mono, monospace)'

/** Reveal on scroll — the bars grow once, when they come into view. */
export function useInView<T extends Element>() {
  const ref = useRef<T | null>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') { setSeen(true); return }
    const io = new IntersectionObserver(es => {
      if (es.some(e => e.isIntersecting)) { setSeen(true); io.disconnect() }
    }, { threshold: 0.25 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return { ref, seen }
}

export interface Bar { label: string; value: number; color: string; note?: string }

/**
 * Horizontal bars. Used for latency (log-ish disparity) and accuracy, where a
 * vertical axis would waste space and force rotated labels.
 */
export function BarChart({
  bars, max, unit = '', height = 30, format,
}: {
  bars: Bar[]; max?: number; unit?: string; height?: number
  format?: (v: number) => string
}) {
  const { ref, seen } = useInView<HTMLDivElement>()
  const top = max ?? Math.max(...bars.map(b => b.value))
  const fmt = format ?? ((v: number) => `${v}${unit}`)
  return (
    <div ref={ref}>
      {bars.map(b => (
        <div key={b.label} style={{ marginBottom: '13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px', gap: '10px' }}>
            <span style={{ color: INK, fontSize: '13px', fontWeight: 600 }}>{b.label}</span>
            <span style={{ color: INK, fontFamily: mono, fontSize: '12.5px', fontWeight: 700 }}>{fmt(b.value)}</span>
          </div>
          <div style={{ height: `${height}px`, background: '#B3DDAC', border: `1px solid ${BORDER}`, position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', inset: '0 auto 0 0',
              width: seen ? `${Math.max(0.6, (b.value / top) * 100)}%` : '0%',
              background: b.color,
              transition: 'width 900ms cubic-bezier(0.16,1,0.3,1)',
            }}/>
          </div>
          {b.note && <p style={{ color: INK3, fontSize: '11.5px', marginTop: '4px', lineHeight: 1.5 }}>{b.note}</p>}
        </div>
      ))}
    </div>
  )
}

/**
 * Stepped line chart with a threshold band — used for the NEWS2 escalation
 * curve, where the bands matter more than the exact curve.
 */
export function StepChart({
  points, bands, w = 620, h = 220, xLabel, yLabel,
}: {
  points: { x: number; y: number }[]
  bands: { from: number; to: number; color: string; label: string }[]
  w?: number; h?: number; xLabel?: string; yLabel?: string
}) {
  const { ref, seen } = useInView<HTMLDivElement>()
  const pad = { l: 34, r: 12, t: 12, b: 30 }
  const maxX = Math.max(...points.map(p => p.x))
  const maxY = Math.max(...points.map(p => p.y), ...bands.map(b => b.to))
  const sx = (x: number) => pad.l + (x / maxX) * (w - pad.l - pad.r)
  const sy = (y: number) => h - pad.b - (y / maxY) * (h - pad.t - pad.b)

  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x)},${sy(p.y)}`).join(' ')

  return (
    <div ref={ref} style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', minWidth: '420px', display: 'block' }} role="img">
        {bands.map(b => (
          <g key={b.label}>
            <rect x={pad.l} y={sy(b.to)} width={w - pad.l - pad.r} height={Math.max(1, sy(b.from) - sy(b.to))}
              fill={b.color} opacity={0.13}/>
            <text x={w - pad.r - 4} y={sy(b.to) + 12} textAnchor="end"
              style={{ fontFamily: mono, fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.8px' }}
              fill={b.color}>{b.label.toUpperCase()}</text>
          </g>
        ))}

        {/* axes */}
        <line x1={pad.l} y1={h - pad.b} x2={w - pad.r} y2={h - pad.b} stroke={INK} strokeWidth={1.4}/>
        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={h - pad.b} stroke={INK} strokeWidth={1.4}/>

        {[0, 3, 5, 7, 12].filter(v => v <= maxY).map(v => (
          <g key={v}>
            <line x1={pad.l - 3} y1={sy(v)} x2={pad.l} y2={sy(v)} stroke={INK2} strokeWidth={1}/>
            <text x={pad.l - 6} y={sy(v) + 3} textAnchor="end"
              style={{ fontFamily: mono, fontSize: '9px' }} fill={INK2}>{v}</text>
          </g>
        ))}

        <path d={d} fill="none" stroke={INK} strokeWidth={2.4} strokeLinejoin="round"
          strokeDasharray={1200} strokeDashoffset={seen ? 0 : 1200}
          style={{ transition: 'stroke-dashoffset 1400ms ease-out' }}/>
        {points.map(p => (
          <circle key={p.x} cx={sx(p.x)} cy={sy(p.y)} r={3.4} fill="#FFFFFF" stroke={INK} strokeWidth={1.8}
            opacity={seen ? 1 : 0} style={{ transition: 'opacity 500ms ease-out 900ms' }}/>
        ))}

        {xLabel && <text x={(w + pad.l) / 2} y={h - 6} textAnchor="middle"
          style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '1px' }} fill={INK3}>{xLabel.toUpperCase()}</text>}
        {yLabel && <text x={10} y={pad.t + 4} textAnchor="start"
          style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '1px' }} fill={INK3}>{yLabel.toUpperCase()}</text>}
      </svg>
    </div>
  )
}

/**
 * Donut for a single proportion — used for the on-device vs cloud split.
 */
export function Donut({
  value, label, sub, color, track = '#EDEAE0', size = 168,
}: { value: number; label: string; sub?: string; color: string; track?: string; size?: number }) {
  const { ref, seen } = useInView<HTMLDivElement>()
  const r = size / 2 - 14
  const c = 2 * Math.PI * r
  return (
    <div ref={ref} style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }} role="img">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={16}/>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={16}
          strokeLinecap="butt" strokeDasharray={c}
          strokeDashoffset={seen ? c * (1 - value) : c}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1200ms cubic-bezier(0.16,1,0.3,1)' }}/>
        <text x={size / 2} y={size / 2 + 2} textAnchor="middle"
          style={{ fontSize: '30px', fontWeight: 800, letterSpacing: '-0.03em' }} fill={INK}>
          {Math.round(value * 100)}%
        </text>
        <text x={size / 2} y={size / 2 + 20} textAnchor="middle"
          style={{ fontFamily: mono, fontSize: '8.5px', letterSpacing: '1.2px' }} fill={INK3}>
          {label.toUpperCase()}
        </text>
      </svg>
      {sub && <p style={{ color: INK2, fontSize: '14px', lineHeight: 1.65, maxWidth: '260px' }}>{sub}</p>}
    </div>
  )
}
