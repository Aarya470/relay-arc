// AUTO-EXTRACTED from components/Navigation.tsx — do not edit by hand

export function distanceBetween(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}
export function bearingBetween(lat1: number, lon1: number, lat2: number, lon2: number) {
  const y1 = lat1 * Math.PI/180, y2 = lat2 * Math.PI/180
  const dx = (lon2 - lon1) * Math.PI/180
  const y = Math.sin(dx) * Math.cos(y2)
  const x = Math.cos(y1)*Math.sin(y2) - Math.sin(y1)*Math.cos(y2)*Math.cos(dx)
  return ((Math.atan2(y, x) * 180/Math.PI) + 360) % 360
}
export function projectAhead(lat: number, lng: number, brg: number, d: number): [number, number] {
  const rad = brg * Math.PI/180
  return [lat + (d * Math.cos(rad)) / 111320, lng + (d * Math.sin(rad)) / (111320 * Math.cos(lat * Math.PI/180))]
}
// Cumulative distance along a polyline
export function buildCumulative(route: [number, number][]): number[] {
  const cum = [0]
  for (let i = 1; i < route.length; i++) {
    cum.push(cum[i-1] + distanceBetween(route[i-1][0], route[i-1][1], route[i][0], route[i][1]))
  }
  return cum
}
// Closest point on segment a→b to p (degrees space, fine at street scale)
export function segClosest(p: [number, number], a: [number, number], b: [number, number]) {
  const ax = a[1], ay = a[0], bx = b[1], by = b[0], px = p[1], py = p[0]
  const dx = bx - ax, dy = by - ay
  const len2 = dx*dx + dy*dy
  let t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0
  t = Math.max(0, Math.min(1, t))
  const cx = ax + t * dx, cy = ay + t * dy
  return { t, point: [cy, cx] as [number, number], dist: distanceBetween(py, px, cy, cx) }
}
// Snap to route: returns snapped point, segment index, metres travelled along route.
// Searches a window around the last match for speed, but falls back to a full scan
// when that window yields a poor match — otherwise a GPS jump (tunnel, signal gap,
// backgrounded app) clamps to the window edge and distance-along goes badly stale.
export function nearestOnRoute(
  p: [number, number], route: [number, number][], cum: number[], hint: number
) {
  if (route.length < 2) return null
  const scan = (from: number, to: number) => {
    let best = { dist: Infinity, index: from, point: route[from], along: cum[from] }
    for (let i = from; i <= to; i++) {
      const r = segClosest(p, route[i], route[i+1])
      if (r.dist < best.dist) {
        const segLen = cum[i+1] - cum[i]
        best = { dist: r.dist, index: i, point: r.point, along: cum[i] + r.t * segLen }
      }
    }
    return best
  }
  if (hint >= 0) {
    const windowed = scan(Math.max(0, hint - 25), Math.min(route.length - 2, hint + 120))
    if (windowed.dist <= 80) return windowed
  }
  return scan(0, route.length - 2)
}

export function formatDist(m: number) {
  return m >= 1000 ? `${(m/1000).toFixed(1)} km` : `${Math.round(m / 10) * 10} m`
}
export function formatTime(seconds: number) {
  const mins = Math.max(1, Math.round(seconds / 60))
  return mins < 60 ? `${mins} min` : `${Math.floor(mins/60)} h ${mins%60} m`
}


export interface Step {
  name: string
  distance: number
  duration: number
  type: string
  modifier: string
  exit?: number
  coords: [number, number]
}
export function instructionText(s: Step | undefined) {
  if (!s) return 'Continue'
  const road = s.name ? ` onto ${s.name}` : ''
  const t = s.type, m = s.modifier || ''
  if (t === 'depart') return `Head out${road}`
  if (t === 'arrive') return 'You arrive at the hospital'
  if (t === 'roundabout' || t === 'rotary') return `At the roundabout, take exit ${s.exit || ''}`.trim()
  if (t === 'merge') return `Merge ${m}${road}`
  if (t === 'on ramp') return `Take the ramp${road}`
  if (t === 'off ramp') return `Take the exit ${m}`
  if (t === 'fork') return `Keep ${m}${road}`
  if (t === 'end of road') return `Turn ${m}${road}`
  if (t === 'new name' || t === 'continue') return `Continue${road}`
  if (m.includes('uturn')) return 'Make a U-turn'
  if (m) return `Turn ${m.replace('slight ', 'slightly ')}${road}`
  return `Continue${road}`
}
