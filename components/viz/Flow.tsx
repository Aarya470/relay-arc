'use client'
// Flowchart primitive. Hand-built SVG nodes and connectors rather than Mermaid,
// because these diagrams need to carry the palette, the mono type, and decision
// branches with labelled edges — and Mermaid would fight all three.
import { useInView } from './Chart'

const INK = '#141413', INK2 = '#5C5A52', INK3 = '#8A8780', BORDER = '#E5E2D9'
const mono = 'var(--font-mono, monospace)'

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

const CW = 186, CH = 92, GX = 34, GY = 40

export function Flow({ nodes, edges, height }: { nodes: Node[]; edges: Edge[]; height?: number }) {
  const { ref, seen } = useInView<HTMLDivElement>()
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
      <svg viewBox={`-6 -6 ${W + 12} ${H + 12}`} style={{ width: '100%', minWidth: `${Math.min(W, 700)}px`, display: 'block' }} role="img">
        <defs>
          <marker id="fl-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={INK2}/>
          </marker>
        </defs>

        {/* edges first so nodes sit on top */}
        {edges.map((e, i) => {
          const a = byId[e.from], b = byId[e.to]
          if (!a || !b) return null
          const pa = at(a), pb = at(b)
          let d: string
          if (a.row === b.row) {
            d = `M${pa.x + CW},${pa.cy} L${pb.x},${pb.cy}`
          } else if (a.col === b.col) {
            d = `M${pa.cx},${pa.y + CH} L${pb.cx},${pb.y}`
          } else {
            // elbow: out the right, down, then in the left
            const midX = pa.x + CW + GX / 2
            d = `M${pa.x + CW},${pa.cy} L${midX},${pa.cy} L${midX},${pb.cy} L${pb.x},${pb.cy}`
          }
          const len = 900
          return (
            <g key={i}>
              <path d={d} fill="none" stroke={e.color || INK2} strokeWidth={1.6}
                strokeDasharray={e.dashed ? '5 4' : len}
                strokeDashoffset={e.dashed ? 0 : (seen ? 0 : len)}
                style={{ transition: 'stroke-dashoffset 1100ms ease-out' }}
                markerEnd="url(#fl-arrow)"/>
              {e.label && (
                <text
                  x={a.row === b.row ? (pa.x + CW + pb.x) / 2 : pa.cx + 8}
                  y={a.row === b.row ? pa.cy - 7 : (pa.y + CH + pb.y) / 2}
                  textAnchor={a.row === b.row ? 'middle' : 'start'}
                  style={{ fontFamily: mono, fontSize: '9px', fontWeight: 700, letterSpacing: '0.6px' }}
                  fill={e.color || INK3}>{e.label}</text>
              )}
            </g>
          )
        })}

        {nodes.map((n, i) => {
          const p = at(n)
          const stroke = n.color || INK
          const isDec = n.kind === 'decision'
          const fill = n.fill || '#FFFFFF'
          const textColor = n.fill ? INK : INK
          return (
            <g key={n.id} opacity={seen ? 1 : 0}
              style={{ transition: `opacity 420ms ease-out ${120 + i * 70}ms` }}>
              {isDec ? (
                <polygon
                  points={`${p.cx},${p.y} ${p.x + CW},${p.cy} ${p.cx},${p.y + CH} ${p.x},${p.cy}`}
                  fill={fill} stroke={stroke} strokeWidth={1.6}/>
              ) : (
                <rect x={p.x} y={p.y} width={CW} height={CH} fill={fill}
                  stroke={stroke} strokeWidth={n.kind === 'end' ? 2.6 : 1.4}/>
              )}
              <text x={p.cx} y={n.sub ? p.cy - 4 : p.cy + 4} textAnchor="middle"
                style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '-0.01em' }} fill={textColor}>
                {n.label}
              </text>
              {n.sub && (
                <text x={p.cx} y={p.cy + 15} textAnchor="middle"
                  style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.4px' }} fill={INK2}>
                  {n.sub}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
