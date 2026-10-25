'use client'
// Flowchart primitive. Hand-built SVG nodes and connectors rather than Mermaid,
// because these diagrams need to carry the palette, the mono type, and decision
// branches with labelled edges — and Mermaid would fight all three.
import { useInView } from './Chart'

const INK = '#141413', INK2 = '#4A4840'

export interface Node {
  id: string
  /** grid column and row */
  col: number
  row: number
  label: string
  sub?: string
  /** 'step' rectangle · 'decision' diamond · 'end' heavy rectangle */
  kind?: 'step' | 'decision' | 'end'
  color?: string
  /** filled background, dark ink on top */
  fill?: string
}

export interface Edge {
  from: string
  to: string
  label?: string
  dashed?: boolean
  color?: string
}

const CW = 196, CH = 104, GX = 40, GY = 44

// Drawn like a figure in a textbook: one ink weight, open arrowheads, white
// boxes, flowchart-standard shapes (rounded ends for start and finish, a
// diamond for a decision). No colour coding; the words carry the meaning.
// A sub-label can hold detail on two lines, split with "\n".
export function Flow({ nodes, edges, height }: { nodes: Node[]; edges: Edge[]; height?: number }) {
  const { ref } = useInView<HTMLDivElement>()
  const cols = Math.max(...nodes.map(n => n.col)) + 1
  const rows = Math.max(...nodes.map(n => n.row)) + 1
  const W = cols * CW + (cols - 1) * GX
  const H = height ?? rows * CH + (rows - 1) * GY

  const at = (n: Node) => ({
    x: n.col * (CW + GX),
    y: n.row * (CH + GY),
    cx: n.col * (CW + GX) + CW / 2,
    cy: n.row * (CH + GY) + CH / 2,
  })
  const byId = Object.fromEntries(nodes.map(n => [n.id, n]))

  return (
    <div ref={ref} style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`-8 -8 ${W + 16} ${H + 16}`} style={{ width: '100%', minWidth: `${Math.min(W, 720)}px`, display: 'block', fontFamily: 'inherit' }} role="img">
        <defs>
          <marker id="fl-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M1,1 L9,5 L1,9" fill="none" stroke={INK} strokeWidth="1.4"/>
          </marker>
        </defs>

        {edges.map((e, i) => {
          const a = byId[e.from], b = byId[e.to]
          if (!a || !b) return null
          const pa = at(a), pb = at(b)
          let d: string, lx: number, ly: number, anchor: 'middle' | 'start' = 'middle'
          if (a.row === b.row && b.col > a.col) {
            d = `M${pa.x + CW},${pa.cy} L${pb.x - 2},${pb.cy}`; lx = (pa.x + CW + pb.x) / 2; ly = pa.cy - 8
          } else if (a.row === b.row) {
            d = `M${pa.x},${pa.cy} L${pb.x + CW + 2},${pb.cy}`; lx = (pa.x + pb.x + CW) / 2; ly = pa.cy - 8
          } else if (a.col === b.col) {
            const down = b.row > a.row
            d = down ? `M${pa.cx},${pa.y + CH} L${pb.cx},${pb.y - 2}` : `M${pa.cx},${pa.y} L${pb.cx},${pb.y + CH + 2}`
            lx = pa.cx + 8; ly = (down ? pa.y + CH + pb.y : pb.y + CH + pa.y) / 2 + 4; anchor = 'start'
          } else {
            const right = b.col > a.col
            const sx = right ? pa.x + CW : pa.x
            const midX = right ? pa.x + CW + GX / 2 : pa.x - GX / 2
            const ex = right ? pb.x - 2 : pb.x + CW + 2
            d = `M${sx},${pa.cy} L${midX},${pa.cy} L${midX},${pb.cy} L${ex},${pb.cy}`
            lx = midX + 6; ly = (pa.cy + pb.cy) / 2; anchor = 'start'
          }
          return (
            <g key={i}>
              <path d={d} fill="none" stroke={INK} strokeWidth={1.3}
                strokeDasharray={e.dashed ? '5 4' : undefined} markerEnd="url(#fl-arrow)"/>
              {e.label && (
                <text x={lx} y={ly} textAnchor={anchor}
                  style={{ fontSize: '11px', fontStyle: 'italic', paintOrder: 'stroke' }}
                  stroke="#FFFFFF" strokeWidth={4} strokeLinejoin="round" fill={INK2}>{e.label}</text>
              )}
            </g>
          )
        })}

        {nodes.map(n => {
          const p = at(n)
          const isDec = n.kind === 'decision'
          const isEnd = n.kind === 'end'
          const subs = (n.sub || '').split('\n').filter(Boolean)
          const top = p.cy - ((subs.length ? 14 : 0) + subs.length * 13) / 2 + 5
          return (
            <g key={n.id}>
              {isDec ? (
                <polygon
                  points={`${p.cx},${p.y} ${p.x + CW},${p.cy} ${p.cx},${p.y + CH} ${p.x},${p.cy}`}
                  fill="#FFFFFF" stroke={INK} strokeWidth={1.3}/>
              ) : (
                <rect x={p.x} y={p.y} width={CW} height={CH} rx={isEnd ? CH / 2 : 3} fill="#FFFFFF"
                  stroke={INK} strokeWidth={isEnd ? 1.8 : 1.3}/>
              )}
              <text x={p.cx} y={top} textAnchor="middle" style={{ fontSize: '13.5px', fontWeight: 700 }} fill={INK}>
                {n.label}
              </text>
              {subs.map((t, k) => (
                <text key={k} x={p.cx} y={top + 17 + k * 13} textAnchor="middle" style={{ fontSize: '10.5px' }} fill={INK2}>
                  {t}
                </text>
              ))}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
