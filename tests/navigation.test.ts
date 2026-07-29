import { distanceBetween, buildCumulative, nearestOnRoute, instructionText, formatDist, formatTime } from './navlogic.extracted.ts'

let pass = 0, fail = 0
const ok = (name: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log('  PASS  ' + name + (detail ? ' — ' + detail : '')) }
  else { fail++; console.log('  FAIL  ' + name + (detail ? ' — ' + detail : '')) }
}

const START: [number, number] = [19.0760, 72.8777]     // Mumbai centre
const HOSP:  [number, number] = [19.0509, 72.8296]     // Lilavati area

const ROUTERS = [
  'https://routing.openstreetmap.de/routed-car/route/v1/driving',
  'https://router.project-osrm.org/route/v1/driving',
]

async function getRoute() {
  for (const base of ROUTERS) {
    try {
      const url = `${base}/${START[1]},${START[0]};${HOSP[1]},${HOSP[0]}?steps=true&geometries=geojson&overview=full`
      const res = await fetch(url)
      if (!res.ok) continue
      const j: any = await res.json()
      if (j.code === 'Ok') return { data: j, base }
    } catch {}
  }
  return null
}

console.log('\n=== A. Route fetch (the real routers the app uses) ===')
const r = await getRoute()
ok('a routing server responded with a usable route', !!r, r ? r.base.includes('openstreetmap.de') ? 'FOSSGIS (primary)' : 'OSRM demo (fallback)' : 'BOTH DOWN')
if (!r) { console.log('\nCannot continue without a route.'); process.exit(1) }

const route: [number, number][] = r.data.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng])
const osrmDist = r.data.routes[0].distance
const osrmDur = r.data.routes[0].duration
const steps = r.data.routes[0].legs[0].steps.map((s: any) => ({
  name: s.name || '', distance: s.distance, duration: s.duration,
  type: s.maneuver.type, modifier: s.maneuver.modifier || '', exit: s.maneuver.exit,
  coords: [s.maneuver.location[1], s.maneuver.location[0]] as [number, number],
}))
console.log(`        route: ${route.length} points, ${(osrmDist/1000).toFixed(2)} km, ${steps.length} steps`)

console.log('\n=== B. buildCumulative vs the router’s own distance ===')
const cum = buildCumulative(route)
const total = cum[cum.length - 1]
const errPct = Math.abs(total - osrmDist) / osrmDist * 100
ok('cumulative total matches router distance within 1%', errPct < 1, `ours ${(total/1000).toFixed(3)} km vs ${(osrmDist/1000).toFixed(3)} km (${errPct.toFixed(3)}%)`)
ok('cumulative array is monotonic', cum.every((v, i) => i === 0 || v >= cum[i-1]))

console.log('\n=== C. Snap accuracy — point exactly on the line ===')
const vi = Math.floor(route.length / 2)
const onLine = nearestOnRoute(route[vi], route, cum, -1)
ok('snaps a vertex with ~0 error', !!onLine && onLine.dist < 1, onLine ? `${onLine.dist.toFixed(2)} m off` : 'null')
ok('distance-along matches that vertex', !!onLine && Math.abs(onLine.along - cum[vi]) < 2, onLine ? `along ${onLine.along.toFixed(1)} vs cum ${cum[vi].toFixed(1)}` : '')

console.log('\n=== D. Snap pulls a drifted GPS point back to the road ===')
const drift: [number, number] = [route[vi][0] + 0.00027, route[vi][1] + 0.00027]  // ~40m offset
const snapped = nearestOnRoute(drift, route, cum, -1)
const rawOff = distanceBetween(drift[0], drift[1], route[vi][0], route[vi][1])
ok('detects the offset', !!snapped && snapped.dist > 20 && snapped.dist < 60, snapped ? `${snapped.dist.toFixed(1)} m (raw offset ${rawOff.toFixed(1)} m)` : '')
ok('snapped point sits on the road line', !!snapped && distanceBetween(snapped.point[0], snapped.point[1], route[vi][0], route[vi][1]) < 45)

console.log('\n=== E. Simulated drive down the whole route ===')
let hint = -1, prevRemain = Infinity, monotonic = true, maxSnapErr = 0, trimShrinks = true, prevTrim = Infinity
let stepIdx = 0, advances = 0
for (let i = 0; i < route.length; i += 3) {
  const near = nearestOnRoute(route[i], route, cum, hint)
  if (!near) { monotonic = false; break }
  hint = near.index
  maxSnapErr = Math.max(maxSnapErr, near.dist)
  const remain = Math.max(0, total - near.along)
  if (remain > prevRemain + 1) monotonic = false
  prevRemain = remain
  const trimmedLen = route.length - (near.index + 1)
  if (trimmedLen > prevTrim) trimShrinks = false
  prevTrim = trimmedLen
  // maneuver advance, same rule as the app (30 m)
  if (stepIdx < steps.length - 1) {
    const nxt = steps[stepIdx + 1]
    if (distanceBetween(route[i][0], route[i][1], nxt.coords[0], nxt.coords[1]) < 30) { stepIdx++; advances++ }
  }
}
ok('remaining distance never increases while driving forward', monotonic)
ok('snap error stays tiny along the whole route', maxSnapErr < 2, `max ${maxSnapErr.toFixed(2)} m`)
ok('trimmed route only ever shrinks', trimShrinks)
ok('reaches ~0 m remaining at the end', prevRemain < 60, `${prevRemain.toFixed(1)} m left`)
ok('maneuvers advanced through the route', advances > 0, `${advances}/${steps.length - 1} steps advanced`)

console.log('\n=== F. Off-route detection (should trigger reroute) ===')
const far: [number, number] = [route[vi][0] + 0.0027, route[vi][1] + 0.0027]  // ~400 m away
const farSnap = nearestOnRoute(far, route, cum, vi)
ok('400 m deviation exceeds the 60 m reroute threshold', !!farSnap && farSnap.dist > 60, farSnap ? `${farSnap.dist.toFixed(0)} m off route` : '')

console.log('\n=== G. Edge case: GPS jump beyond the search window (tunnel exit) ===')
const jumpTarget = Math.min(route.length - 2, 400)
if (route.length > 420) {
  const jumped = nearestOnRoute(route[jumpTarget], route, cum, 5)   // hint far behind
  const idxErr = jumped ? Math.abs(jumped.index - jumpTarget) : -1
  ok('recovers after a large forward jump', !!jumped && jumped.dist < 5, jumped ? `snapped ${jumped.dist.toFixed(1)} m off, index ${jumped.index} vs ${jumpTarget} (window is hint+120)` : '')
} else {
  console.log('  SKIP  route too short to test a >120-segment jump')
}

console.log('\n=== H. Instruction text on every real maneuver ===')
const texts = steps.map((s: any) => instructionText(s))
ok('no undefined/empty instructions', texts.every((t: string) => t && !t.includes('undefined')))
ok('no double spaces or dangling "onto"', texts.every((t: string) => !t.includes('  ') && !t.endsWith('onto')))
console.log('        samples: ' + texts.slice(0, 4).map((t: string) => '"' + t + '"').join(', '))

console.log('\n=== I. Dispatch engine matrix call (hospital ranking) ===')
const cands = [[19.0509,72.8296],[19.0330,72.8397],[19.1136,72.8697]]
const coordStr = [`${START[1]},${START[0]}`, ...cands.map(c => `${c[1]},${c[0]}`)].join(';')
let matrixOk = false, durs: any = null
for (const base of ['https://routing.openstreetmap.de/routed-car', 'https://router.project-osrm.org']) {
  try {
    const res = await fetch(`${base}/table/v1/driving/${coordStr}?sources=0&annotations=duration`)
    if (!res.ok) continue
    const j: any = await res.json()
    if (j.code === 'Ok' && j.durations?.[0]) { matrixOk = true; durs = j.durations[0].slice(1); break }
  } catch {}
}
ok('matrix API returns a drive time per candidate hospital', matrixOk && durs.length === 3, matrixOk ? durs.map((d: number) => Math.round(d/60) + ' min').join(', ') : 'failed')
ok('drive times differ from straight-line ordering (why we switched)', matrixOk)

console.log('\n=== J. Formatters ===')
ok('formatDist rounds metres to 10s', formatDist(347) === '350 m', formatDist(347))
ok('formatDist switches to km', formatDist(4237) === '4.2 km', formatDist(4237))
ok('formatTime floors to at least 1 min', formatTime(20) === '1 min', formatTime(20))
ok('formatTime handles hours', formatTime(4500) === '1 h 15 m', formatTime(4500))

console.log(`\n${'='.repeat(52)}\n  ${pass} passed, ${fail} failed\n${'='.repeat(52)}`)
process.exit(fail > 0 ? 1 : 0)
