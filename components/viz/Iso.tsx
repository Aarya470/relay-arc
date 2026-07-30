'use client'
// Isometric 3D primitives, hand-built in SVG.
//
// No Three.js. A WebGL scene would add ~600 KB, need a canvas fallback, and
// fight the flat editorial look of the rest of the site. True isometric
// projection in SVG costs nothing, scales to any screen, themes with the
// palette, and prints.
//
// Projection: a 2:1 dimetric grid (the "video game isometric"), where one unit
// on the x axis moves (+ISO_X, +ISO_Y) and one on the y axis moves
// (−ISO_X, +ISO_Y). Height is straight up the screen.

export const ISO_X = 0.866   // cos(30°)
export const ISO_Y = 0.5     // sin(30°)

/** Grid coords → screen coords. u,v are floor position; h is height. */
export function iso(u: number, v: number, h = 0, s = 1) {
  return {
    x: (u - v) * ISO_X * s,
    y: (u + v) * ISO_Y * s - h * s,
  }
}

const pts = (a: { x: number; y: number }[]) => a.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')

/** Shade a hex colour by a factor (<1 darker, >1 lighter). */
export function shade(hex: string, f: number) {
  const h = hex.replace('#', '')
  const n = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16))
  const out = n.map(c => Math.max(0, Math.min(255, Math.round(c * f))))
  return '#' + out.map(c => c.toString(16).padStart(2, '0')).join('')
}

interface BoxProps {
  u: number; v: number
  /** footprint in grid units */
  w?: number; d?: number
  /** height in grid units */
  h: number
  s?: number
  color: string
  /** hairline outline colour */
  stroke?: string
  opacity?: number
}

/**
 * An extruded box. Three faces: top lit, left mid, right dark — which is what
 * reads as "3D" without any lighting model.
 */
export function IsoBox({ u, v, w = 1, d = 1, h, s = 1, color, stroke, opacity = 1 }: BoxProps) {
  const top = [iso(u, v, h, s), iso(u + w, v, h, s), iso(u + w, v + d, h, s), iso(u, v + d, h, s)]
  const left = [iso(u, v + d, h, s), iso(u + w, v + d, h, s), iso(u + w, v + d, 0, s), iso(u, v + d, 0, s)]
  const right = [iso(u + w, v, h, s), iso(u + w, v + d, h, s), iso(u + w, v + d, 0, s), iso(u + w, v, 0, s)]
  const sw = stroke ? 1 : 0
  return (
    <g opacity={opacity}>
      <polygon points={pts(left)} fill={shade(color, 0.78)} stroke={stroke} strokeWidth={sw}/>
      <polygon points={pts(right)} fill={shade(color, 0.6)} stroke={stroke} strokeWidth={sw}/>
      <polygon points={pts(top)} fill={color} stroke={stroke} strokeWidth={sw}/>
    </g>
  )
}

/** A flat tile on the ground plane — roads, plots, water. */
export function IsoTile({ u, v, w = 1, d = 1, s = 1, color, stroke, opacity = 1 }: Omit<BoxProps, 'h'> & { h?: number }) {
  const p = [iso(u, v, 0, s), iso(u + w, v, 0, s), iso(u + w, v + d, 0, s), iso(u, v + d, 0, s)]
  return <polygon points={pts(p)} fill={color} stroke={stroke} strokeWidth={stroke ? 1 : 0} opacity={opacity}/>
}

/** A polyline across the ground plane, for routes. */
export function IsoPath({
  points, s = 1, color, width = 3, dash, opacity = 1, h = 0.06,
}: {
  points: [number, number][]
  s?: number; color: string; width?: number; dash?: string; opacity?: number; h?: number
}) {
  const d = points.map(([u, v], i) => {
    const p = iso(u, v, h, s)
    return `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`
  }).join(' ')
  return (
    <path d={d} fill="none" stroke={color} strokeWidth={width} strokeDasharray={dash}
      strokeLinecap="round" strokeLinejoin="round" opacity={opacity}/>
  )
}

/** Ground grid, drawn as thin tiles so it sits in perspective. */
export function IsoGrid({ n = 10, s = 1, color, opacity = 0.25 }: { n?: number; s?: number; color: string; opacity?: number }) {
  const lines: React.ReactNode[] = []
  for (let i = 0; i <= n; i++) {
    const a = iso(i, 0, 0, s), b = iso(i, n, 0, s)
    const c = iso(0, i, 0, s), e = iso(n, i, 0, s)
    lines.push(<line key={`u${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={0.7} opacity={opacity}/>)
    lines.push(<line key={`v${i}`} x1={c.x} y1={c.y} x2={e.x} y2={e.y} stroke={color} strokeWidth={0.7} opacity={opacity}/>)
  }
  return <g>{lines}</g>
}

/** A pin standing on the ground plane. */
export function IsoPin({ u, v, s = 1, color, h = 2.4, label }: { u: number; v: number; s?: number; color: string; h?: number; label?: string }) {
  const base = iso(u, v, 0, s)
  const tip = iso(u, v, h, s)
  return (
    <g>
      <ellipse cx={base.x} cy={base.y} rx={5} ry={2.6} fill={color} opacity={0.22}/>
      <line x1={base.x} y1={base.y} x2={tip.x} y2={tip.y} stroke={color} strokeWidth={2}/>
      <circle cx={tip.x} cy={tip.y} r={5.4} fill={color}/>
      <circle cx={tip.x} cy={tip.y} r={2} fill="#FFFFFF"/>
      {label && (
        <text x={tip.x} y={tip.y - 11} textAnchor="middle"
          style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.6px' }}
          fill={color}>{label}</text>
      )}
    </g>
  )
}
