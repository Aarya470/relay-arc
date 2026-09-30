'use client'
// Isometric 3D scenes, composed from the primitives in Iso.tsx.
//
// Each scene illustrates one feature literally rather than decoratively — the
// dispatch scene really does show three candidate hospitals at different drive
// times, and the one it picks is not the nearest.
//
// REWORKED: labels used to sit directly on the box's top face, which meant
// they fought the fill colour, clipped at small sizes, and read as a 90s CAD
// screenshot rather than a modern diagram. They are now small floating tags —
// white pill, hairline border, connected to the shape by a thin leader line —
// the pattern most product sites use for annotating an illustration. The boxes
// themselves lost their hard black outline; the three-tone shading in Iso.tsx
// already reads as 3D without one, and the outline was most of what made this
// look like clip art. Frames also got taller so nothing clips at the bottom.
import { IsoBox, IsoTile, IsoPath, IsoGrid, IsoPin, iso } from './Iso'

const INK = '#141413', INK3 = '#5C5A52', BORDER = '#98C890'
const GREEN = '#56804E', GREEN_DEEP = '#42623C'
const ORANGE = '#D97757', CRIT = '#A33417', WARN = '#7C5200'
const CREAM = '#B3DDAC'
const mono = 'var(--font-mono, monospace)'

function Frame({ children, vb, label }: { children: React.ReactNode; vb: string; label?: string }) {
  return (
    <div style={{ border: `1.5px solid ${INK}`, background: CREAM, overflow: 'hidden' }}>
      {label && (
        <div style={{ borderBottom: `1px solid ${INK}`, padding: '10px 14px' }}>
          <span style={{ color: INK, fontFamily: mono, fontSize: '10px', fontWeight: 700, letterSpacing: '1.6px', textTransform: 'uppercase' }}>
            {label}
          </span>
        </div>
      )}
      <div style={{ padding: '8px' }}>
        <svg viewBox={vb} style={{ width: '100%', display: 'block' }} role="img">{children}</svg>
      </div>
    </div>
  )
}

/**
 * A floating tag: a small pill above a point on the ground plane, joined to it
 * by a thin leader line. Replaces text that used to sit on the box face.
 */
function Tag({
  u, v, h, s, lines, color = INK, lift = 1.3, dash,
}: {
  u: number; v: number; h: number; s: number
  lines: [string, string?]
  color?: string
  lift?: number
  dash?: boolean
}) {
  const base = iso(u, v, h, s)
  const top = iso(u, v, h + lift, s)
  const [title, sub] = lines
  const w = Math.max(title.length * 5.6, sub ? sub.length * 4.6 : 0) + 20
  const boxH = sub ? 30 : 18
  return (
    <g>
      <line x1={base.x} y1={base.y} x2={top.x} y2={top.y - boxH}
        stroke={color} strokeWidth={1.3} strokeDasharray={dash ? '3 3' : undefined} opacity={0.55}/>
      <circle cx={base.x} cy={base.y} r={2.6} fill={color}/>
      <g transform={`translate(${top.x - w / 2}, ${top.y - boxH})`}>
        <rect width={w} height={boxH} rx={boxH / 2} fill="#FFFFFF" stroke={color} strokeWidth={1.1}/>
        <text x={w / 2} y={sub ? 12 : boxH / 2 + 3} textAnchor="middle"
          style={{ fontFamily: mono, fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.5px' }} fill={INK}>
          {title}
        </text>
        {sub && (
          <text x={w / 2} y={23} textAnchor="middle"
            style={{ fontFamily: mono, fontSize: '7.5px', letterSpacing: '0.4px' }} fill={color}>
            {sub}
          </text>
        )}
      </g>
    </g>
  )
}

/**
 * Scene 1 — dispatch. A city block with the patient at one corner and three
 * hospitals. The nearest is deliberately NOT the chosen one, because it has no
 * cath lab: the whole argument of the dispatch engine in one picture.
 */
export function DispatchScene() {
  const S = 30
  const buildings: [number, number, number, number, number][] = [
    // u, v, w, d, h
    [1, 1, 1, 1.6, 1.2], [2.6, 1, 1.4, 1, 0.8], [1, 3.2, 1.6, 1, 1.6],
    [4.4, 2.2, 1, 1, 0.9], [3, 4.6, 1.2, 1.2, 1.1], [5.6, 4.4, 1, 1.4, 1.4],
    [0.8, 5.6, 1.2, 1, 0.7], [4.8, 6.4, 1.4, 1, 1.0], [6.6, 1.4, 1, 1.2, 0.9],
  ]
  return (
    <Frame vb="-260 -180 520 400" label="Dispatch: the nearest is not the chosen one">
      <g transform="translate(0,20)">
        <IsoGrid n={8} s={S} color={INK} opacity={0.1}/>

        {/* roads */}
        <IsoTile u={0} v={2.2} w={8} d={0.7} s={S} color="#F0EDE2"/>
        <IsoTile u={2.2} v={0} w={0.7} d={8} s={S} color="#F0EDE2"/>
        <IsoTile u={0} v={5.4} w={8} d={0.7} s={S} color="#F0EDE2"/>

        {buildings.map((b, i) => (
          <IsoBox key={i} u={b[0]} v={b[1]} w={b[2]} d={b[3]} h={b[4]} s={S} color="#E4E0D3" opacity={0.85}/>
        ))}

        {/* the rejected near hospital — no cath lab */}
        <IsoBox u={3.1} v={1.1} w={1.2} d={1.2} h={1.9} s={S} color={WARN}/>
        {/* the chosen hospital — has a cath lab, further away */}
        <IsoBox u={6.2} v={6.2} w={1.5} d={1.5} h={2.6} s={S} color={GREEN}/>
        {/* a third candidate, diverting */}
        <IsoBox u={0.6} v={7.0} w={1.2} d={1.1} h={1.7} s={S} color="#D6D1C2" opacity={0.85}/>

        {/* the route actually taken */}
        <IsoPath points={[[0.4, 0.4], [2.5, 0.4], [2.5, 2.5], [6.5, 2.5], [6.5, 6.4]]}
          s={S} color={CRIT} width={3.2}/>
        {/* the route to the nearest, not taken */}
        <IsoPath points={[[0.4, 0.4], [2.5, 0.4], [2.5, 1.6], [3.2, 1.6]]}
          s={S} color={INK3} width={1.8} dash="5 5" opacity={0.6}/>

        <IsoPin u={0.4} v={0.4} s={S} color={CRIT} h={2.0}/>
        <Tag u={0.4} v={0.4} h={2.0} s={S} lines={['YOU']} color={CRIT} lift={0.6}/>
        <Tag u={3.7} v={1.7} h={1.9} s={S} lines={['4 MIN', 'NO CATH LAB']} color={WARN} dash/>
        <Tag u={6.9} v={6.9} h={2.6} s={S} lines={['11 MIN', 'CATH LAB ✓']} color={GREEN_DEEP} lift={1.7}/>
        <Tag u={1.2} v={7.5} h={1.7} s={S} lines={['DIVERTING']} color={INK3} dash/>
      </g>
    </Frame>
  )
}

/**
 * Scene 2 — the on-device decision. A phone slab with the model inside it and a
 * severed link to the cloud, showing that the cloud is optional rather than
 * on the critical path.
 */
export function OnDeviceScene() {
  const S = 34
  return (
    <Frame vb="-250 -190 500 380" label="Triage: the cloud is optional, not on the path">
      <g transform="translate(0,20)">
        <IsoGrid n={6} s={S} color={INK} opacity={0.08}/>

        {/* phone slab */}
        <IsoBox u={0.6} v={0.6} w={2.6} d={4.4} h={0.28} s={S} color="#FFFFFF"/>
        {/* the model, sitting inside the device */}
        <IsoBox u={1.1} v={1.2} w={1.6} d={1.5} h={0.85} s={S} color={GREEN}/>
        <IsoBox u={1.1} v={3.0} w={1.6} d={1.4} h={0.5} s={S} color={ORANGE}/>

        <Tag u={1.9} v={1.95} h={0.85} s={S} lines={['TRIAGE MODEL', '94 KB · 0.07 ms']} color={GREEN_DEEP} lift={1.5}/>
        <Tag u={1.9} v={3.7} h={0.5} s={S} lines={['RISK SCORER']} color={ORANGE} lift={1.1}/>

        {/* cloud block, floating, reachable only by a dashed link */}
        <g opacity={0.6}>
          <IsoBox u={5.0} v={0.4} w={1.6} d={1.6} h={0.6} s={S} color="#E4E0D3"/>
        </g>
        <Tag u={5.8} v={1.2} h={0.6} s={S} lines={['CLOUD LLM', 'ONLY IF UNSURE']} color={INK3} lift={1.4} dash/>
        <IsoPath points={[[3.3, 1.9], [4.9, 1.2]]} s={S} color={INK3} width={1.6} dash="4 5" h={0.9} opacity={0.55}/>
      </g>
    </Frame>
  )
}

/**
 * Scene 3 — the relay. Patient, phone, care circle and the hospital board, with
 * the emergency record travelling between them. This is the "relay, not revive"
 * idea drawn.
 */
export function RelayScene() {
  const S = 32
  const stack = (u: number, v: number, h: number, color: string, label: string, sub: string) => (
    <g>
      <IsoBox u={u} v={v} w={1.5} d={1.5} h={h} s={S} color={color}/>
      <Tag u={u + 0.75} v={v + 0.75} h={h} s={S} lines={[label, sub]} color={color === ORANGE || color === GREEN ? INK : INK3} lift={1.3}/>
    </g>
  )
  return (
    <Frame vb="-260 -170 520 400" label="One record, four places, under a minute">
      <g transform="translate(0,10)">
        <IsoGrid n={8} s={S} color={INK} opacity={0.08}/>
        <IsoPath points={[[1.0, 1.0], [6.6, 1.0]]} s={S} color={CRIT} width={2.4} h={0.05}/>
        <IsoPath points={[[1.0, 1.0], [1.0, 6.4]]} s={S} color={GREEN_DEEP} width={2.4} h={0.05}/>
        <IsoPath points={[[6.6, 1.0], [6.6, 6.4]]} s={S} color={INK3} width={1.6} dash="4 4" h={0.05} opacity={0.6}/>

        {stack(0.3, 0.3, 1.0, ORANGE, 'PATIENT', 'SOS')}
        {stack(5.9, 0.3, 1.6, GREEN, 'HOSPITAL', 'ER BOARD')}
        {stack(0.3, 5.7, 1.2, '#E4E0D3', 'CARE CIRCLE', 'LIVE MAP')}
        {stack(5.9, 5.7, 0.9, '#E4E0D3', 'DRIVER', 'TURN-BY-TURN')}
      </g>
    </Frame>
  )
}
