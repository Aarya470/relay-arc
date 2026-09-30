'use client'
// Feature illustrations for /features.
//
// SECOND REWORK. The isometric cubes (still in Iso.tsx, kept for possible
// reuse elsewhere) read as generic 3D-icon-pack art no matter how the labels
// were laid out — the medium itself was the dated part, not the label
// placement. This version drops 3D entirely and draws each feature as a flat
// diagram in the site's own editorial language: thick ink borders, mono
// captions, the orange/green/red brand palette, on the same cream card the
// rest of the page uses. Each one is still literally a comparison, a
// pathway, or a process — just drawn the way this site draws everything else
// (see Flow.tsx, Chart.tsx) instead of as a rendered 3D scene.
const INK = '#141413', INK2 = '#3A392F', INK3 = '#726F60'
const GREEN = '#56804E', GREEN_DEEP = '#3A5A34'
const ORANGE = '#D97757', CRIT = '#A33417'
const LINE = 'rgba(20,20,19,0.14)'
const CARD = '#FBF9F2'
const mono = 'var(--font-mono, monospace)'

function Frame({ children, vb, label, caption }: {
  children: React.ReactNode; vb: string; label?: string; caption?: string
}) {
  return (
    <div style={{ border: `1.5px solid ${INK}`, background: CARD }}>
      {label && (
        <div style={{ borderBottom: `1.5px solid ${INK}`, padding: '10px 14px' }}>
          <span style={{ color: INK, fontFamily: mono, fontSize: '10px', fontWeight: 700, letterSpacing: '1.6px', textTransform: 'uppercase' }}>
            {label}
          </span>
        </div>
      )}
      <div style={{ padding: '18px 16px 6px' }}>
        <svg viewBox={vb} style={{ width: '100%', display: 'block' }} role="img">{children}</svg>
      </div>
      {caption && (
        <div style={{ padding: '10px 16px 14px', borderTop: `1px solid ${LINE}` }}>
          <span style={{ color: INK3, fontFamily: mono, fontSize: '10.5px', letterSpacing: '0.2px' }}>{caption}</span>
        </div>
      )}
    </div>
  )
}

function Chip({ x, y, w = 88, h = 22, text, color = INK, fill = 'none', dash }: {
  x: number; y: number; w?: number; h?: number; text: string; color?: string; fill?: string; dash?: boolean
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={fill} stroke={color} strokeWidth={1.3} strokeDasharray={dash ? '4 3' : undefined}/>
      <text x={x + w / 2} y={y + h / 2 + 3.5} textAnchor="middle"
        style={{ fontFamily: mono, fontSize: '9px', fontWeight: 700, letterSpacing: '0.4px' }} fill={color}>
        {text}
      </text>
    </g>
  )
}

function Arrow({ x1, y1, x2, y2, color = INK, width = 1.6, dash }: {
  x1: number; y1: number; x2: number; y2: number; color?: string; width?: number; dash?: boolean
}) {
  const id = `ah-${x1}-${y1}-${x2}-${y2}`.replace(/\./g, '_')
  return (
    <g>
      <defs>
        <marker id={id} markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill={color}/>
        </marker>
      </defs>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={width}
        strokeDasharray={dash ? '5 4' : undefined} markerEnd={`url(#${id})`}/>
    </g>
  )
}

/**
 * Scene 1 — dispatch, drawn as a ranked comparison. Three hospitals as rows,
 * each with a drive-time bar and a cath-lab flag. The shortest bar is struck
 * through and rejected; a longer bar wins because it has the capability the
 * patient needs. That trade-off is the entire feature, in one glance.
 */
export function DispatchScene() {
  const rows = [
    { name: 'Sion Hospital',    min: 4,  cath: false, chosen: false, w: 70 },
    { name: 'Wockhardt',        min: 7,  cath: false, chosen: false, w: 122 },
    { name: 'Lilavati Hosp.',   min: 11, cath: true,  chosen: true,  w: 192 },
  ]
  const rowY = (i: number) => 40 + i * 62
  return (
    <Frame vb="0 0 560 240" label="Dispatch"
      caption="Ranked by drive time, then filtered by capability — the nearest ER without a cath lab is skipped for one 7 minutes further out.">
      <line x1={150} y1={20} x2={150} y2={210} stroke={LINE} strokeWidth={1}/>
      {rows.map((r, i) => {
        const y = rowY(i)
        const barColor = r.chosen ? GREEN : (r.cath ? INK2 : INK3)
        return (
          <g key={r.name}>
            <text x={0} y={y - 8} style={{ fontFamily: mono, fontSize: '11px', fontWeight: 700 }} fill={r.chosen ? GREEN_DEEP : INK}>
              {r.name}
            </text>
            <text x={150 - 10} y={y + 15} textAnchor="end" style={{ fontFamily: mono, fontSize: '10px' }} fill={INK3}>
              {r.cath ? 'CATH LAB' : 'no cath lab'}
            </text>
            <rect x={150} y={y} width={r.w} height={18} fill={r.chosen ? GREEN : 'none'}
              stroke={barColor} strokeWidth={1.6} opacity={r.chosen ? 1 : 0.85}/>
            {!r.chosen && !r.cath && (
              <line x1={150} y1={y + 9} x2={150 + r.w} y2={y + 9} stroke={CRIT} strokeWidth={1.4}/>
            )}
            <text x={150 + r.w + 10} y={y + 14} style={{ fontFamily: mono, fontSize: '11px', fontWeight: 700 }} fill={r.chosen ? GREEN_DEEP : INK2}>
              {r.min} min
            </text>
            {r.chosen && (
              <text x={150 + r.w + 62} y={y + 14} style={{ fontFamily: mono, fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.4px' }} fill={GREEN_DEEP}>
                ✓ SELECTED
              </text>
            )}
          </g>
        )
      })}
    </Frame>
  )
}

/**
 * Scene 2 — the triage decision, drawn as a fork in a pathway rather than a
 * device with parts inside it. Almost every signal exits on the fast,
 * on-device branch; a dashed low-traffic branch only reaches the cloud model
 * when the on-device score is not confident — the cloud is a fallback lane,
 * not a stop every signal makes.
 */
export function OnDeviceScene() {
  return (
    <Frame vb="0 0 560 220" label="Triage"
      caption="94% of signals resolve on-device in under a tenth of a millisecond. Only an unconfident score continues to the cloud model.">
      <Chip x={12} y={90} w={92} h={30} text="SIGNAL IN" color={INK}/>
      <Arrow x1={104} y1={105} x2={190} y2={105} color={INK}/>

      <Chip x={192} y={70} w={168} h={30} text="ON-DEVICE MODEL" color={GREEN_DEEP} fill="rgba(86,128,78,0.08)"/>
      <text x={276} y={116} textAnchor="middle" style={{ fontFamily: mono, fontSize: '9px' }} fill={INK3}>94 KB · 0.07 ms</text>

      <Arrow x1={360} y1={82} x2={430} y2={40} color={GREEN_DEEP} width={1.8}/>
      <Chip x={432} y={24} w={116} h={30} text="ACTED ON" color={GREEN_DEEP} fill="none"/>
      <text x={490} y={68} textAnchor="middle" style={{ fontFamily: mono, fontSize: '9px', fontWeight: 700 }} fill={GREEN_DEEP}>CONFIDENT</text>

      <Arrow x1={360} y1={98} x2={430} y2={170} color={INK3} width={1.4} dash/>
      <Chip x={432} y={155} w={116} h={30} text="CLOUD MODEL" color={INK3} fill="none" dash/>
      <text x={490} y={200} textAnchor="middle" style={{ fontFamily: mono, fontSize: '9px', fontWeight: 700 }} fill={INK3}>ONLY IF UNSURE</text>
    </Frame>
  )
}

/**
 * Scene 3 — the relay, drawn as a timeline instead of four boxes on a grid.
 * One press on the left; four recipients on the right, each landing at a
 * different, named second. Order and timing are the point, and a timeline
 * shows both without needing a legend.
 */
export function RelayScene() {
  const stops = [
    { t: '0:01', label: 'HOSPITAL', label2: 'ER BOARD',   color: GREEN_DEEP, sub: 'bed + team paged' },
    { t: '0:02', label: 'CARE',     label2: 'CIRCLE',      color: ORANGE,     sub: 'location shared' },
    { t: '0:03', label: 'DRIVER',   label2: '',            color: INK2,       sub: 'turn-by-turn starts' },
    { t: '0:41', label: 'ER BRIEF', label2: 'LANDS',        color: CRIT,       sub: 'full record ready' },
  ]
  return (
    <Frame vb="0 0 600 220" label="Relay"
      caption="One press starts four independent deliveries; the slowest is the full ER brief, and it still lands before the ambulance does.">
      <Chip x={0} y={94} w={78} h={30} text="SOS" color={CRIT} fill="rgba(163,52,23,0.08)"/>
      <line x1={78} y1={109} x2={588} y2={109} stroke={LINE} strokeWidth={1.5}/>
      {stops.map((s, i) => {
        const x = 120 + i * 128
        return (
          <g key={s.label}>
            <line x1={x} y1={99} x2={x} y2={119} stroke={s.color} strokeWidth={2}/>
            <circle cx={x} cy={109} r={3.5} fill={s.color}/>
            <text x={x} y={90} textAnchor="middle" style={{ fontFamily: mono, fontSize: '10px', fontWeight: 700 }} fill={s.color}>{s.t}</text>
            <text x={x} y={140} textAnchor="middle" style={{ fontFamily: mono, fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.3px' }} fill={INK}>{s.label}</text>
            {s.label2 && (
              <text x={x} y={153} textAnchor="middle" style={{ fontFamily: mono, fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.3px' }} fill={INK}>{s.label2}</text>
            )}
            <text x={x} y={s.label2 ? 168 : 155} textAnchor="middle" style={{ fontFamily: mono, fontSize: '8.5px' }} fill={INK3}>{s.sub}</text>
          </g>
        )
      })}
    </Frame>
  )
}
