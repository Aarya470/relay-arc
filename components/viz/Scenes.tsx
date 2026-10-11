'use client'
// Feature diagrams for /features.
//
// Flat SVG, drawn like a diagram in a printed manual: square boxes, hairline
// rules, sentence-case labels in the body font. The page's own captions sit
// underneath each one, so the frames carry a short title and nothing else.
//
// Numbers here must agree with the rest of the page: 61% of test cases settle
// on the phone (see the donut on /features), and the dispatch example uses the
// same 4 / 9 / 11 minute arrangement the page has always used. The relay
// diagram shows order, not timings, because nothing measures those timings.
const INK = '#141413', INK2 = '#3A392F', INK3 = '#6E6B5D'
const GREEN = '#56804E', GREEN_DEEP = '#3A5A34'
const CRIT = '#A33417', WARN = '#7C5200'
const RULE = 'rgba(20,20,19,0.16)'
const PAPER = '#FFFFFF'
const sans = 'inherit'

function Frame({ children, vb, title }: { children: React.ReactNode; vb: string; title: string }) {
  return (
    <figure style={{ margin: 0, border: `1px solid ${INK}`, background: PAPER }}>
      <figcaption style={{ borderBottom: `1px solid ${INK}`, padding: '9px 14px', color: INK, fontSize: '13px', fontWeight: 700 }}>
        {title}
      </figcaption>
      <div style={{ padding: '18px 16px 14px' }}>
        <svg viewBox={vb} style={{ width: '100%', display: 'block', fontFamily: sans }} role="img" aria-label={title}>{children}</svg>
      </div>
    </figure>
  )
}

function Box({ x, y, w, h = 30, text, color = INK, fill = 'none', dash, bold = true }: {
  x: number; y: number; w: number; h?: number; text: string; color?: string; fill?: string; dash?: boolean; bold?: boolean
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={fill} stroke={color} strokeWidth={1.2} strokeDasharray={dash ? '4 3' : undefined}/>
      <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" fontSize="11.5" fontWeight={bold ? 700 : 500} fill={color}>
        {text}
      </text>
    </g>
  )
}

function Arrow({ id, d, color = INK, dash, width = 1.4 }: { id: string; d: string; color?: string; dash?: boolean; width?: number }) {
  return (
    <g>
      <defs>
        <marker id={id} markerWidth="8" markerHeight="8" refX="6.5" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill={color}/>
        </marker>
      </defs>
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeDasharray={dash ? '5 4' : undefined} markerEnd={`url(#${id})`}/>
    </g>
  )
}

/**
 * Dispatch: three hospitals, drive time as a bar. The two closer ones are
 * ruled out for a stated reason; the furthest is chosen because it can treat
 * a heart attack on arrival.
 */
export function DispatchScene() {
  const rows = [
    { name: 'Nearest hospital', min: 4,  why: 'No cath lab',          out: true },
    { name: 'Second hospital',  min: 9,  why: 'Not accepting (diverting)', out: true },
    { name: 'Heart centre',     min: 11, why: 'Cath lab, accepting',  out: false },
  ]
  const X0 = 170, PER_MIN = 20
  return (
    <Frame vb="0 0 560 200" title="Which hospital gets picked">
      {[0, 4, 8, 12].map(m => (
        <g key={m}>
          <line x1={X0 + m * PER_MIN} y1={12} x2={X0 + m * PER_MIN} y2={172} stroke={RULE} strokeWidth={1}/>
          <text x={X0 + m * PER_MIN} y={190} textAnchor="middle" fontSize="10" fill={INK3}>{m} min</text>
        </g>
      ))}
      {rows.map((r, i) => {
        const y = 22 + i * 52
        const w = r.min * PER_MIN
        return (
          <g key={r.name}>
            <text x={0} y={y + 10} fontSize="12.5" fontWeight={700} fill={r.out ? INK2 : GREEN_DEEP}>{r.name}</text>
            <text x={0} y={y + 26} fontSize="11" fill={r.out ? CRIT : GREEN_DEEP}>{r.why}</text>
            <rect x={X0} y={y} width={w} height={22}
              fill={r.out ? 'none' : GREEN} stroke={r.out ? INK3 : GREEN_DEEP} strokeWidth={1.2}
              strokeDasharray={r.out ? '4 3' : undefined}/>
            <text x={X0 + w + 8} y={y + 15} fontSize="12" fontWeight={700} fill={r.out ? INK3 : GREEN_DEEP}>
              {r.min} min{r.out ? '' : '  ← chosen'}
            </text>
          </g>
        )
      })}
    </Frame>
  )
}

/**
 * Triage: a fork. The phone decides on its own when it is confident; when it
 * is not, it asks the cloud model, and if there is no signal it falls back to
 * its own best guess rather than stopping.
 */
export function OnDeviceScene() {
  return (
    <Frame vb="0 0 560 200" title="Where the decision gets made">
      <Box x={0} y={84} w={110} text="Symptoms in"/>
      <Arrow id="od-a1" d="M110,99 L176,99"/>

      <Box x={180} y={84} w={130} text="Phone's model" color={GREEN_DEEP} fill="rgba(86,128,78,0.10)"/>

      <Arrow id="od-a2" d="M310,92 L360,92 L360,40 L410,40" color={GREEN_DEEP}/>
      <text x={352} y={62} textAnchor="end" fontSize="10.5" fill={GREEN_DEEP}>confident, 61%</text>
      <Box x={414} y={25} w={140} text="Hospital chosen" color={GREEN_DEEP}/>

      <Arrow id="od-a3" d="M310,106 L360,106 L360,158 L410,158" color={INK3} dash/>
      <text x={352} y={168} textAnchor="end" fontSize="10.5" fill={INK3}>unsure, 39%</text>
      <Box x={414} y={143} w={140} text="Ask cloud model" color={INK3} dash bold={false}/>

      <text x={245} y={132} textAnchor="middle" fontSize="10.5" fill={INK3}>94 KB, no signal needed</text>
    </Frame>
  )
}

/**
 * The relay: what goes out after one press, in order. Steps 2 to 4 start
 * together; the hospital step only happens when the hospital is a partner.
 */
export function RelayScene() {
  const steps = [
    { n: '1', title: 'Shared room opens', sub: 'live location shared',   color: CRIT },
    { n: '2', title: 'Hospital is told',  sub: 'partner hospitals only', color: GREEN_DEEP },
    { n: '3', title: 'Family notified',   sub: 'push alert, live map',   color: WARN },
    { n: '4', title: 'Driver routed',     sub: 'turn-by-turn in app',    color: INK2 },
  ]
  return (
    <Frame vb="0 0 620 160" title="What goes out after one press">
      <Box x={0} y={60} w={74} h={34} text="SOS" color={CRIT} fill="rgba(163,52,23,0.08)"/>
      <line x1={74} y1={77} x2={616} y2={77} stroke={INK} strokeWidth={1}/>
      {steps.map((s, i) => {
        const x = 100 + i * 128
        return (
          <g key={s.n}>
            <rect x={x - 11} y={66} width={22} height={22} fill={PAPER} stroke={s.color} strokeWidth={1.5}/>
            <text x={x} y={81} textAnchor="middle" fontSize="11.5" fontWeight={700} fill={s.color}>{s.n}</text>
            <text x={x - 11} y={116} fontSize="12" fontWeight={700} fill={INK}>{s.title}</text>
            <text x={x - 11} y={133} fontSize="10.5" fill={INK3}>{s.sub}</text>
          </g>
        )
      })}
      <text x={217} y={46} fontSize="10.5" fill={INK3}>2, 3 and 4 start at the same time</text>
      <line x1={228} y1={52} x2={484} y2={52} stroke={INK3} strokeWidth={1}/>
    </Frame>
  )
}

/**
 * Risk trend: seven readings from one made-up patient against NEWS2's
 * published bands (low 0–4, medium 5–6, high 7+). Replaces a generic step
 * chart whose bands were drawn at the wrong boundaries (4 and 6 instead of
 * between 4/5 and 6/7), whose axis title sat on top of a tick label, and whose
 * line ran off the right edge. The point of the section is that a single
 * reading can look fine while the run of readings is clearly heading up, so
 * every reading is plotted and labelled, and the stretch where each one still
 * counts as low is marked.
 */
export function TrendScene() {
  const scores = [1, 1, 2, 3, 4, 6, 8]
  const X0 = 64, DX = 72, Y0 = 222, PER = 20  // score 0 at y=222, 10 at y=22
  const x = (i: number) => X0 + i * DX
  const y = (s: number) => Y0 - s * PER
  const bands = [
    { from: 0,   to: 4.5, fill: 'rgba(86,128,78,0.12)',  label: 'Low (0–4)',    color: GREEN_DEEP },
    { from: 4.5, to: 6.5, fill: 'rgba(124,82,0,0.13)',   label: 'Medium (5–6)', color: WARN },
    { from: 6.5, to: 10,  fill: 'rgba(163,52,23,0.10)',  label: 'High (7+)',    color: CRIT },
  ]
  const dot = (s: number) => (s >= 7 ? CRIT : s >= 5 ? WARN : GREEN_DEEP)
  const path = scores.map((s, i) => `${i ? 'L' : 'M'}${x(i)},${y(s)}`).join(' ')
  return (
    <Frame vb="0 0 620 270" title="Seven readings from one made-up patient">
      {bands.map(b => (
        <g key={b.label}>
          <rect x={40} y={y(b.to)} width={480} height={(b.to - b.from) * PER} fill={b.fill}/>
          <text x={530} y={(y(b.to) + y(b.from)) / 2 + 4} fontSize="11.5" fontWeight={700} fill={b.color}>{b.label}</text>
        </g>
      ))}
      {[0, 2, 4, 6, 8, 10].map(t => (
        <text key={t} x={32} y={y(t) + 4} textAnchor="end" fontSize="10" fill={INK3}>{t}</text>
      ))}
      <line x1={40} y1={Y0} x2={520} y2={Y0} stroke={INK} strokeWidth={1}/>
      <line x1={40} y1={y(10)} x2={40} y2={Y0} stroke={INK} strokeWidth={1}/>

      {/* the stretch where each reading, taken alone, still says low */}
      <line x1={x(2)} y1={206} x2={x(4)} y2={206} stroke={INK2} strokeWidth={1}/>
      <line x1={x(2)} y1={200} x2={x(2)} y2={206} stroke={INK2} strokeWidth={1}/>
      <line x1={x(4)} y1={200} x2={x(4)} y2={206} stroke={INK2} strokeWidth={1}/>
      <text x={x(3)} y={218} textAnchor="middle" fontSize="10.5" fill={INK2}>each one alone: low</text>

      <path d={path} fill="none" stroke={INK} strokeWidth={2}/>
      {scores.map((s, i) => (
        <g key={i}>
          <rect x={x(i) - 5} y={y(s) - 5} width={10} height={10} fill={dot(s)}/>
          <text x={x(i)} y={y(s) - 11} textAnchor="middle" fontSize="11.5" fontWeight={700} fill={INK}>{s}</text>
          <text x={x(i)} y={240} textAnchor="middle" fontSize="10.5" fill={INK3}>{i + 1}</text>
        </g>
      ))}
      <text x={280} y={262} textAnchor="middle" fontSize="11" fill={INK2}>Reading</text>
      <text x={12} y={14} fontSize="11" fill={INK2}>NEWS2 score</text>
    </Frame>
  )
}
