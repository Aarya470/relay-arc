'use client'
// Isometric 3D scenes, composed from the primitives in Iso.tsx.
//
// Each scene illustrates one feature literally rather than decoratively — the
// dispatch scene really does show three candidate hospitals at different drive
// times, and the one it picks is not the nearest.
import { IsoBox, IsoTile, IsoPath, IsoGrid, IsoPin, iso } from './Iso'

const INK = '#141413', INK3 = '#8A8780', BORDER = '#E5E2D9'
const GREEN = '#788C5D', GREEN_DEEP = '#5F7049'
const ORANGE = '#D97757', CRIT = '#A33417', WARN = '#A87200'
const CREAM = '#FAF9F5'
const mono = 'var(--font-mono, monospace)'

function Frame({ children, vb, label }: { children: React.ReactNode; vb: string; label?: string }) {
  return (
    <div style={{ border: `2px solid ${INK}`, background: CREAM }}>
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
    <Frame vb="-260 -120 520 340" label="Dispatch — the nearest is not the chosen one">
      <g transform="translate(0,0)">
        <IsoGrid n={8} s={S} color={INK} opacity={0.13}/>

        {/* roads */}
        <IsoTile u={0} v={2.2} w={8} d={0.7} s={S} color="#EDEAE0"/>
        <IsoTile u={2.2} v={0} w={0.7} d={8} s={S} color="#EDEAE0"/>
        <IsoTile u={0} v={5.4} w={8} d={0.7} s={S} color="#EDEAE0"/>

        {buildings.map((b, i) => (
          <IsoBox key={i} u={b[0]} v={b[1]} w={b[2]} d={b[3]} h={b[4]} s={S}
            color="#DDD8CB" stroke={BORDER}/>
        ))}

        {/* the rejected near hospital — no cath lab */}
        <IsoBox u={3.1} v={1.1} w={1.2} d={1.2} h={1.9} s={S} color={WARN} stroke={INK}/>
        {/* the chosen hospital — has a cath lab, further away */}
        <IsoBox u={6.2} v={6.2} w={1.5} d={1.5} h={2.6} s={S} color={GREEN} stroke={INK}/>
        {/* a third candidate, diverting */}
        <IsoBox u={0.6} v={7.0} w={1.2} d={1.1} h={1.7} s={S} color="#CFC9BA" stroke={BORDER}/>

        {/* the route actually taken */}
        <IsoPath points={[[0.4, 0.4], [2.5, 0.4], [2.5, 2.5], [6.5, 2.5], [6.5, 6.4]]}
          s={S} color={CRIT} width={3.4}/>
        {/* the route to the nearest, not taken */}
        <IsoPath points={[[0.4, 0.4], [2.5, 0.4], [2.5, 1.6], [3.2, 1.6]]}
          s={S} color={INK3} width={2} dash="5 5" opacity={0.75}/>

        <IsoPin u={0.4} v={0.4} s={S} color={CRIT} h={2.2} label="YOU"/>
        <IsoPin u={3.7} v={1.7} s={S} color={WARN} h={2.9} label="4 MIN · NO CATH LAB"/>
        <IsoPin u={6.9} v={6.9} s={S} color={GREEN_DEEP} h={3.6} label="11 MIN · CATH LAB ✓"/>
        <IsoPin u={1.2} v={7.5} s={S} color={INK3} h={2.4} label="DIVERTING"/>
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
    <Frame vb="-250 -150 500 330" label="Triage — the cloud is optional, not on the path">
      <IsoGrid n={6} s={S} color={INK} opacity={0.1}/>

      {/* phone slab */}
      <IsoBox u={0.6} v={0.6} w={2.6} d={4.4} h={0.28} s={S} color="#FFFFFF" stroke={INK}/>
      {/* the model, sitting inside the device */}
      <IsoBox u={1.1} v={1.2} w={1.6} d={1.5} h={0.85} s={S} color={GREEN} stroke={INK}/>
      <IsoBox u={1.1} v={3.0} w={1.6} d={1.4} h={0.5} s={S} color={ORANGE} stroke={INK}/>

      <text {...iso(1.9, 1.95, 1.5, S)} textAnchor="middle"
        style={{ fontFamily: mono, fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.8px' }} fill={INK}>
        TRIAGE MODEL
      </text>
      <text {...iso(1.9, 1.95, 1.0, S)} textAnchor="middle"
        style={{ fontFamily: mono, fontSize: '8px', letterSpacing: '0.6px' }} fill={INK}>
        94 KB · 0.07 ms
      </text>
      <text {...iso(1.9, 3.7, 0.95, S)} textAnchor="middle"
        style={{ fontFamily: mono, fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.7px' }} fill={INK}>
        RISK SCORER
      </text>

      {/* cloud block, floating, reachable only by a dashed link */}
      <g opacity={0.55}>
        <IsoBox u={5.0} v={0.4} w={1.6} d={1.6} h={0.6} s={S} color="#DDD8CB" stroke={BORDER}/>
        <text {...iso(5.8, 1.2, 1.15, S)} textAnchor="middle"
          style={{ fontFamily: mono, fontSize: '8.5px', fontWeight: 700, letterSpacing: '0.7px' }} fill={INK3}>
          CLOUD LLM
        </text>
      </g>
      <IsoPath points={[[3.3, 1.9], [4.9, 1.2]]} s={S} color={INK3} width={1.8} dash="4 5" h={0.9}/>
      <text {...iso(4.1, 1.4, 1.5, S)} textAnchor="middle"
        style={{ fontFamily: mono, fontSize: '8px', letterSpacing: '0.6px' }} fill={INK3}>
        ONLY IF UNSURE
      </text>
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
  const stack = (u: number, v: number, h: number, color: string, label: string, sub?: string) => (
    <g>
      <IsoBox u={u} v={v} w={1.5} d={1.5} h={h} s={S} color={color} stroke={INK}/>
      <text {...iso(u + 0.75, v + 0.75, h + 0.55, S)} textAnchor="middle"
        style={{ fontFamily: mono, fontSize: '9px', fontWeight: 700, letterSpacing: '0.8px' }} fill={INK}>{label}</text>
      {sub && (
        <text {...iso(u + 0.75, v + 0.75, h + 0.18, S)} textAnchor="middle"
          style={{ fontFamily: mono, fontSize: '7.5px', letterSpacing: '0.5px' }} fill={INK3}>{sub}</text>
      )}
    </g>
  )
  return (
    <Frame vb="-260 -140 520 320" label="One record, four places, under a minute">
      <IsoGrid n={8} s={S} color={INK} opacity={0.1}/>
      <IsoPath points={[[1.0, 1.0], [6.6, 1.0]]} s={S} color={CRIT} width={2.6} h={0.05}/>
      <IsoPath points={[[1.0, 1.0], [1.0, 6.4]]} s={S} color={GREEN_DEEP} width={2.6} h={0.05}/>
      <IsoPath points={[[6.6, 1.0], [6.6, 6.4]]} s={S} color={INK3} width={1.8} dash="4 4" h={0.05}/>

      {stack(0.3, 0.3, 1.0, ORANGE, 'PATIENT', 'SOS')}
      {stack(5.9, 0.3, 1.6, GREEN, 'HOSPITAL', 'ER BOARD')}
      {stack(0.3, 5.7, 1.2, '#DDD8CB', 'CARE CIRCLE', 'LIVE MAP')}
      {stack(5.9, 5.7, 0.9, '#DDD8CB', 'DRIVER', 'TURN-BY-TURN')}
    </Frame>
  )
}
