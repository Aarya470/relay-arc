'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Volume2, VolumeX, Crosshair, List, X, MapPin } from 'lucide-react'
import { trafficMultiplier } from '@/lib/hospitals'

// ─── Design tokens ────────────────────────────────────────────────────────────
const T1     = '#141413'
const T2     = '#5C5A52'
const T3     = '#6F6D65'
const BORDER = '#98C890'
const ACCENT = '#42623C'
const RED    = '#A33417'
const GREEN  = '#42623C'
const MONO   = 'var(--font-mono, monospace)'

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'
const DEMO_ORIGIN: [number, number] = [19.1136, 72.8697]   // Andheri East — demo mode only

const USER_ARROW_HTML = `<div style="width:46px;height:46px;display:flex;align-items:center;justify-content:center;position:relative;">
  <div style="width:0;height:0;border-left:14px solid transparent;border-right:14px solid transparent;border-bottom:36px solid ${ACCENT};filter:drop-shadow(0 3px 8px rgba(86,128,78,0.55));"></div>
  <div style="position:absolute;top:19px;width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:20px solid white;"></div>
</div>`

const HOSPITAL_HTML = `<div style="width:38px;height:38px;background:${RED};border-radius:11px;
  display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:white;line-height:1;
  border:2.5px solid white;box-shadow:0 4px 16px rgba(20,20,19,0.35);font-family:monospace;">+</div>`

// ─── Style: runtime enrichment, with a real night variant ────────────────────
async function loadStyle(night: boolean): Promise<any> {
  try {
    const res = await fetch(STYLE_URL)
    const style = await res.json()
    for (const l of style.layers) {
      const p = l.paint || {}
      if (night) {
        if (l.type === 'symbol') {
          l.paint = { ...p, 'text-color': '#C9D2DE', 'text-halo-color': '#0B0F16', 'text-halo-width': 1.3 }
          continue
        }
        switch (l.id) {
          case 'background': l.paint = { ...p, 'background-color': '#0F131A' }; break
          case 'building': l.paint = { ...p, 'fill-color': '#1B212C', 'fill-outline-color': '#252C39' }; break
          case 'building-3d': l.paint = {
            ...p, 'fill-extrusion-color': '#1E252F',
            'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 16],
            'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
            'fill-extrusion-opacity': 0.9,
          }; break
          case 'water': l.paint = { ...p, 'fill-color': '#0C2338' }; break
          case 'park': l.paint = { ...p, 'fill-color': '#16261A', 'fill-opacity': 0.85 }; break
          case 'landuse_residential': l.paint = { ...p, 'fill-color': 'hsla(215,14%,14%,0.7)' }; break
          default:
            if (l.type === 'line' && p['line-color']) l.paint = { ...p, 'line-color': '#333B49' }
            else if (l.type === 'fill' && p['fill-color'] && l.id.startsWith('landcover')) l.paint = { ...p, 'fill-opacity': 0.25 }
        }
      } else {
        switch (l.id) {
          case 'background': l.paint = { ...p, 'background-color': '#E9ECF0' }; break
          case 'building': l.paint = { ...p, 'fill-color': '#D8DCE3', 'fill-outline-color': '#BFC6D0' }; break
          case 'building-3d': l.paint = {
            ...p, 'fill-extrusion-color': '#D4D9E1',
            'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 16],
            'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
            'fill-extrusion-opacity': 0.88,
          }; break
          case 'park': l.paint = { ...p, 'fill-color': '#C9E4BC', 'fill-opacity': 0.85 }; break
          case 'landcover_grass': l.paint = { ...p, 'fill-opacity': 0.5 }; break
          case 'landcover_wood': l.paint = { ...p, 'fill-opacity': 0.55 }; break
          case 'landuse_residential': l.paint = { ...p, 'fill-color': 'hsla(215,12%,88%,0.6)' }; break
          case 'water': l.paint = { ...p, 'fill-color': '#9DC2F0' }; break
        }
      }
    }
    return style
  } catch {
    return STYLE_URL
  }
}

// ─── Geometry ─────────────────────────────────────────────────────────────────
function distanceBetween(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}
function bearingBetween(lat1: number, lon1: number, lat2: number, lon2: number) {
  const y1 = lat1 * Math.PI/180, y2 = lat2 * Math.PI/180
  const dx = (lon2 - lon1) * Math.PI/180
  const y = Math.sin(dx) * Math.cos(y2)
  const x = Math.cos(y1)*Math.sin(y2) - Math.sin(y1)*Math.cos(y2)*Math.cos(dx)
  return ((Math.atan2(y, x) * 180/Math.PI) + 360) % 360
}
function projectAhead(lat: number, lng: number, brg: number, d: number): [number, number] {
  const rad = brg * Math.PI/180
  return [lat + (d * Math.cos(rad)) / 111320, lng + (d * Math.sin(rad)) / (111320 * Math.cos(lat * Math.PI/180))]
}
// Cumulative distance along a polyline
function buildCumulative(route: [number, number][]): number[] {
  const cum = [0]
  for (let i = 1; i < route.length; i++) {
    cum.push(cum[i-1] + distanceBetween(route[i-1][0], route[i-1][1], route[i][0], route[i][1]))
  }
  return cum
}
// Closest point on segment a→b to p (degrees space, fine at street scale)
function segClosest(p: [number, number], a: [number, number], b: [number, number]) {
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
function nearestOnRoute(
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

function formatDist(m: number) {
  return m >= 1000 ? `${(m/1000).toFixed(1)} km` : `${Math.round(m / 10) * 10} m`
}
function formatTime(seconds: number) {
  const mins = Math.max(1, Math.round(seconds / 60))
  return mins < 60 ? `${mins} min` : `${Math.floor(mins/60)} h ${mins%60} m`
}

// ─── Instructions ─────────────────────────────────────────────────────────────
interface Step {
  name: string
  distance: number
  duration: number
  type: string
  modifier: string
  exit?: number
  coords: [number, number]
}
function instructionText(s: Step | undefined) {
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
function TurnGlyph({ step, size = 34, color = 'white' }: { step: Step | undefined; size?: number; color?: string }) {
  const m = (step?.modifier || '') + ' ' + (step?.type || '')
  let arrow = '↑'
  if (m.includes('slight left')) arrow = '↖'
  else if (m.includes('slight right')) arrow = '↗'
  else if (m.includes('sharp left')) arrow = '↰'
  else if (m.includes('sharp right')) arrow = '↱'
  else if (m.includes('uturn')) arrow = '↩'
  else if (m.includes('left')) arrow = '←'
  else if (m.includes('right')) arrow = '→'
  else if (m.includes('arrive')) arrow = '◉'
  return <span style={{ fontSize: `${size}px`, lineHeight: 1, fontFamily: 'monospace', fontWeight: 700, color }}>{arrow}</span>
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Navigation({ hospital, preview = false, demo = false }: { hospital: any; preview?: boolean; demo?: boolean }) {
  const [position, setPosition] = useState<[number, number] | null>(null)
  const [speed, setSpeed] = useState(0)
  const [bearing, setBearing] = useState(0)
  const [steps, setSteps] = useState<Step[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [remainingSec, setRemainingSec] = useState<number | null>(null)
  const [remainingDist, setRemainingDist] = useState<number | null>(null)
  const [distToNext, setDistToNext] = useState<number | null>(null)
  const [arrived, setArrived] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [muted, setMuted] = useState(false)
  const [following, setFollowing] = useState(true)
  const [showSteps, setShowSteps] = useState(false)

  const [night] = useState(() => { const h = new Date().getHours(); return h >= 19 || h < 6 })

  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const userMarkerRef = useRef<maplibregl.Marker | null>(null)
  const styleReadyRef = useRef(false)
  const routeRef = useRef<[number, number][]>([])
  const cumRef = useRef<number[]>([])
  const totalRef = useRef(0)
  const totalDurRef = useRef(0)
  const hintRef = useRef(-1)
  const stepsRef = useRef<Step[]>([])
  const stepIdxRef = useRef(0)
  const followRef = useRef(true)
  const watchId = useRef<number | null>(null)
  const lastPos = useRef<[number, number] | null>(null)
  const lastRecalc = useRef(0)
  const spokenFar = useRef(false)
  const spokenNear = useRef(false)
  const spokenArrive = useRef(false)
  const mutedRef = useRef(false)
  const wakeRef = useRef<any>(null)
  mutedRef.current = muted
  followRef.current = following
  stepsRef.current = steps
  stepIdxRef.current = currentStep

  const speak = useCallback((text: string) => {
    if (mutedRef.current || preview) return
    try {
      const u = new SpeechSynthesisUtterance(text)
      u.rate = 1.05
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(u)
    } catch {}
  }, [preview])

  // ── Screen Wake Lock: a phone that sleeps mid-drive is useless ─────────────
  useEffect(() => {
    if (preview) return
    let released = false
    const acquire = async () => {
      try {
        const nav: any = navigator
        if (!nav.wakeLock?.request) return
        wakeRef.current = await nav.wakeLock.request('screen')
      } catch {}
    }
    acquire()
    const onVis = () => { if (document.visibilityState === 'visible' && !released) acquire() }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      released = true
      document.removeEventListener('visibilitychange', onVis)
      try { wakeRef.current?.release?.() } catch {}
      wakeRef.current = null
    }
  }, [preview])

  // ── Draw the route ahead only (trim what has been driven) ─────────────────
  const paintRoute = useCallback((coords: [number, number][]) => {
    const map = mapRef.current
    if (!map || !styleReadyRef.current) return
    const src = map.getSource('route') as maplibregl.GeoJSONSource | undefined
    if (!src) return
    src.setData({
      type: 'Feature', properties: {},
      geometry: { type: 'LineString', coordinates: coords.map(([lat, lng]) => [lng, lat]) },
    })
  }, [])

  const fitWhole = useCallback((coords: [number, number][]) => {
    const map = mapRef.current
    if (!map || coords.length < 2) return
    const b = new maplibregl.LngLatBounds()
    coords.forEach(([lat, lng]) => b.extend([lng, lat]))
    map.fitBounds(b, { padding: 46, duration: 600 })
  }, [])

  // ── Route fetch ───────────────────────────────────────────────────────────
  const fetchRoute = useCallback(async (from: [number, number]) => {
    const routers = [
      'https://routing.openstreetmap.de/routed-car/route/v1/driving',
      'https://router.project-osrm.org/route/v1/driving',
    ]
    let data: any = null
    for (const base of routers) {
      try {
        const url = `${base}/${from[1]},${from[0]};${hospital.lng},${hospital.lat}?steps=true&geometries=geojson&overview=full`
        const res = await fetch(url)
        if (!res.ok) continue
        const json = await res.json()
        if (json.code === 'Ok') { data = json; break }
      } catch { /* next */ }
    }
    if (!data) { setError('Could not load route'); setLoading(false); return }

    const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng]
    )
    routeRef.current = coords
    cumRef.current = buildCumulative(coords)
    totalRef.current = cumRef.current[cumRef.current.length - 1] || 0
    totalDurRef.current = data.routes[0].duration || 0
    hintRef.current = -1
    setRemainingDist(totalRef.current)
    setRemainingSec(totalDurRef.current * trafficMultiplier())
    paintRoute(coords)
    if (preview) fitWhole(coords)

    const parsed: Step[] = data.routes[0].legs[0].steps.map((s: any) => ({
      name: s.name || '',
      distance: s.distance,
      duration: s.duration,
      type: s.maneuver.type,
      modifier: s.maneuver.modifier || '',
      exit: s.maneuver.exit,
      coords: [s.maneuver.location[1], s.maneuver.location[0]] as [number, number],
    }))
    setSteps(parsed)
    setCurrentStep(0)
    spokenFar.current = false
    spokenNear.current = false
    setLoading(false)
  }, [hospital, paintRoute, fitWhole, preview])

  // ── Map init ──────────────────────────────────────────────────────────────
  const hasFix = position !== null
  useEffect(() => {
    if (!hasFix || !containerRef.current || mapRef.current || arrived) return
    const p = position as [number, number]
    let cancelled = false
    let map: maplibregl.Map | null = null
    let ro: ResizeObserver | null = null

    loadStyle(!preview && night).then(style => {
      if (cancelled || !containerRef.current) return
      map = new maplibregl.Map({
        container: containerRef.current,
        style,
        center: [p[1], p[0]],
        zoom: preview ? 13 : 17.5,
        pitch: preview ? 0 : 58,
        bearing: 0,
        attributionControl: false,
        interactive: true,
      })
      mapRef.current = map

      map.on('load', () => {
        if (!map) return
        map.addSource('route', {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } },
        })
        map.addLayer({
          id: 'route-casing', type: 'line', source: 'route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': night && !preview ? '#00224F' : '#0033A0', 'line-width': 13, 'line-opacity': night && !preview ? 0.55 : 0.25 },
        })
        map.addLayer({
          id: 'route-line', type: 'line', source: 'route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': night && !preview ? '#3D82FF' : ACCENT, 'line-width': 7.5 },
        })
        styleReadyRef.current = true
        if (routeRef.current.length) {
          paintRoute(routeRef.current)
          if (preview) fitWhole(routeRef.current)
        }

        const uEl = document.createElement('div')
        uEl.innerHTML = USER_ARROW_HTML
        userMarkerRef.current = new maplibregl.Marker({ element: uEl, rotationAlignment: 'viewport' })
          .setLngLat([p[1], p[0]]).addTo(map)

        const hEl = document.createElement('div')
        hEl.innerHTML = HOSPITAL_HTML
        new maplibregl.Marker({ element: hEl, anchor: 'center' })
          .setLngLat([hospital.lng, hospital.lat]).addTo(map)
      })
      map.on('error', () => { /* tile hiccups are non-fatal */ })

      // Any deliberate gesture drops follow mode
      if (!preview) {
        const drop = (e: any) => { if (e?.originalEvent) setFollowing(false) }
        map.on('dragstart', drop)
        map.on('zoomstart', drop)
        map.on('rotatestart', drop)
      }

      ro = new ResizeObserver(() => map?.resize())
      ro.observe(containerRef.current!)
    })

    return () => {
      cancelled = true
      ro?.disconnect()
      styleReadyRef.current = false
      userMarkerRef.current = null
      map?.remove()
      mapRef.current = null
    }
  }, [hasFix, preview, arrived, night, paintRoute, fitWhole])

  // ── Marker tracking (independent of follow mode) ──────────────────────────
  useEffect(() => {
    if (position) userMarkerRef.current?.setLngLat([position[1], position[0]])
  }, [position])

  // ── Chase camera ──────────────────────────────────────────────────────────
  const zoom = speed > 18 ? 16.5 : speed > 9 ? 17 : 17.5
  useEffect(() => {
    const map = mapRef.current
    if (!map || !position || preview || !following) return
    const ahead = projectAhead(position[0], position[1], bearing, 55)
    map.easeTo({ center: [ahead[1], ahead[0]], bearing, zoom, pitch: 58, duration: 500 })
  }, [position, bearing, zoom, preview, following])

  const recenter = () => {
    setFollowing(true)
    const map = mapRef.current
    if (map && position) {
      const ahead = projectAhead(position[0], position[1], bearing, 55)
      map.easeTo({ center: [ahead[1], ahead[0]], bearing, zoom: 17.5, pitch: 58, duration: 400 })
    }
  }

  // ── Demo drive: walk the real route at ~50 km/h, no GPS involved ──────────
  useEffect(() => {
    if (!demo) return
    const [oLat, oLng] = [hospital.demoOrigin?.[0] ?? DEMO_ORIGIN[0], hospital.demoOrigin?.[1] ?? DEMO_ORIGIN[1]]
    setPosition([oLat, oLng])
    lastPos.current = [oLat, oLng]
    fetchRoute([oLat, oLng])

    let along = 0
    const SPEED = 13.9        // m/s ≈ 50 km/h
    const TICK = 1000
    const id = setInterval(() => {
      const route = routeRef.current
      const cum = cumRef.current
      if (route.length < 2 || !cum.length) return
      along = Math.min(along + SPEED, cum[cum.length - 1])

      // interpolate the point at `along` metres
      let i = 1
      while (i < cum.length && cum[i] < along) i++
      const segStart = route[i - 1], segEnd = route[Math.min(i, route.length - 1)]
      const segLen = Math.max(1, cum[Math.min(i, cum.length - 1)] - cum[i - 1])
      const t = Math.max(0, Math.min(1, (along - cum[i - 1]) / segLen))
      const p: [number, number] = [
        segStart[0] + (segEnd[0] - segStart[0]) * t,
        segStart[1] + (segEnd[1] - segStart[1]) * t,
      ]

      setSpeed(SPEED)
      setBearing(bearingBetween(segStart[0], segStart[1], segEnd[0], segEnd[1]))
      setPosition(p)
      lastPos.current = p
      hintRef.current = i - 1

      const remain = Math.max(0, cum[cum.length - 1] - along)
      setRemainingDist(remain)
      const frac = cum[cum.length - 1] > 0 ? remain / cum[cum.length - 1] : 0
      setRemainingSec(totalDurRef.current * frac * trafficMultiplier())
      paintRoute([p, ...route.slice(i)])

      // maneuvers + arrival, same rules as live driving
      const st = stepsRef.current
      const idx = stepIdxRef.current
      if (st.length > 0 && idx < st.length - 1) {
        const nxt = st[idx + 1]
        const d = distanceBetween(p[0], p[1], nxt.coords[0], nxt.coords[1])
        setDistToNext(d)
        if (d < 40) {
          setCurrentStep(idx + 1)
          spokenFar.current = false
          spokenNear.current = false
        } else {
          if (!spokenFar.current && d < 350) { spokenFar.current = true; speak(`In ${Math.round(d / 50) * 50} meters, ${instructionText(nxt)}`) }
          if (!spokenNear.current && d < 70) { spokenNear.current = true; speak(instructionText(nxt)) }
        }
      }
      if (remain < 45) { setArrived(true); clearInterval(id) }
      else if (remain < 250 && !spokenArrive.current) { spokenArrive.current = true; speak('You are arriving at the hospital') }
    }, TICK)
    return () => { clearInterval(id); try { window.speechSynthesis.cancel() } catch {} }
  }, [demo, hospital, fetchRoute, paintRoute, speak])

  // ── GPS: one watcher for the whole session, state read from refs ──────────
  useEffect(() => {
    if (demo) return
    if (!navigator.geolocation) {
      const fallback: [number, number] = [hospital.lat - 0.05, hospital.lng - 0.05]
      setPosition(fallback)
      fetchRoute(fallback)
      return
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        const p: [number, number] = [pos.coords.latitude, pos.coords.longitude]
        setPosition(p); lastPos.current = p; fetchRoute(p)
      },
      () => {
        const fallback: [number, number] = [hospital.lat - 0.05, hospital.lng - 0.05]
        setPosition(fallback); fetchRoute(fallback); setError('Using demo location')
      },
      { enableHighAccuracy: true }
    )

    watchId.current = navigator.geolocation.watchPosition(
      pos => {
        const raw: [number, number] = [pos.coords.latitude, pos.coords.longitude]
        const spd = pos.coords.speed || 0
        setSpeed(spd)

        // Heading: GPS while moving, else derived from motion
        if (pos.coords.heading !== null && !isNaN(pos.coords.heading) && spd > 1) {
          setBearing(pos.coords.heading)
        } else if (lastPos.current && distanceBetween(raw[0], raw[1], lastPos.current[0], lastPos.current[1]) > 4) {
          setBearing(bearingBetween(lastPos.current[0], lastPos.current[1], raw[0], raw[1]))
        }
        lastPos.current = raw

        // Snap to the route, trim what's behind, compute true remaining
        const route = routeRef.current
        let shown = raw
        let offRoute = false
        if (route.length > 1) {
          const near = nearestOnRoute(raw, route, cumRef.current, hintRef.current)
          if (near) {
            hintRef.current = near.index
            offRoute = near.dist > 60
            if (near.dist < 45) shown = near.point
            const remain = Math.max(0, totalRef.current - near.along)
            setRemainingDist(remain)
            const frac = totalRef.current > 0 ? remain / totalRef.current : 0
            setRemainingSec(totalDurRef.current * frac * trafficMultiplier())
            paintRoute([shown, ...route.slice(near.index + 1)])
          }
        }
        setPosition(shown)

        // Arrival
        const dHosp = distanceBetween(raw[0], raw[1], hospital.lat, hospital.lng)
        if (dHosp < 50) { setArrived(true); return }
        if (dHosp < 250 && !spokenArrive.current) {
          spokenArrive.current = true
          speak('You are arriving at the hospital')
        }

        // Maneuver advance + voice
        const st = stepsRef.current
        const idx = stepIdxRef.current
        if (st.length > 0 && idx < st.length - 1) {
          const next = st[idx + 1]
          const d = distanceBetween(raw[0], raw[1], next.coords[0], next.coords[1])
          setDistToNext(d)
          if (d < 30) {
            setCurrentStep(idx + 1)
            spokenFar.current = false
            spokenNear.current = false
          } else {
            if (!spokenFar.current && d < 350) { spokenFar.current = true; speak(`In ${Math.round(d / 50) * 50} meters, ${instructionText(next)}`) }
            if (!spokenNear.current && d < 60) { spokenNear.current = true; speak(instructionText(next)) }
          }
        }

        // Off-route recalculation (throttled)
        if (offRoute && Date.now() - lastRecalc.current > 20000) {
          lastRecalc.current = Date.now()
          speak('Recalculating route')
          fetchRoute(raw)
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 5000 }
    )

    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current)
      try { window.speechSynthesis.cancel() } catch {}
    }
  }, [demo, hospital, fetchRoute, paintRoute, speak])

  const upcoming = steps.length > 0 ? steps[Math.min(currentStep + 1, steps.length - 1)] : undefined
  const after = steps.length > 0 ? steps[Math.min(currentStep + 2, steps.length - 1)] : undefined
  const arriving = remainingDist != null && remainingDist < 250

  if (arrived) return (
    <div style={{
      height: '100%', background: '#FFFFFF',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px', gap: '14px'
    }}>
      <div style={{ width: '68px', height: '68px', borderRadius: '18px', background: 'rgba(86,128,78,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/>
        </svg>
      </div>
      <p style={{ color: T1, fontSize: '24px', fontWeight: 800, letterSpacing: '-0.6px' }}>You have arrived<span style={{ color: GREEN }}>.</span></p>
      <p style={{ color: T2, fontSize: '14px', textAlign: 'center', lineHeight: 1.55, maxWidth: '280px' }}>
        {hospital.name} — the ER already has your brief.
      </p>
    </div>
  )

  return (
    <div style={{ height: '100%', position: 'relative', overflow: 'hidden', background: night && !preview ? '#0F131A' : '#E8EAED' }}>

      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}/>

      {demo && (
        <div style={{
          position: 'absolute', top: preview ? '10px' : '104px', left: '12px', zIndex: 520,
          background: T1, color: 'white', fontFamily: MONO, fontSize: '9.5px', fontWeight: 700,
          letterSpacing: '1.4px', textTransform: 'uppercase', padding: '5px 9px', borderRadius: '5px',
        }}>
          Demo · simulated drive
        </div>
      )}

      {!preview && (
        <>
          {/* ── Maneuver banner ─────────────────────────────────────────────── */}
          <div style={{
            position: 'absolute', top: '12px', left: '12px', right: '12px', zIndex: 500,
            background: arriving ? GREEN : T1, borderRadius: '18px',
            padding: '16px 18px',
            boxShadow: '0 10px 34px rgba(20,20,19,0.35)',
          }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#E8A33D', animation: 'pulse 1s infinite' }}/>
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '14px', fontWeight: 600 }}>{error || 'Calculating route…'}</p>
              </div>
            ) : arriving ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <MapPin size={30} color="white"/>
                <div style={{ minWidth: 0 }}>
                  <p style={{ color: 'white', fontWeight: 800, fontSize: '22px', letterSpacing: '-0.6px', lineHeight: 1.1 }}>Arriving now</p>
                  <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {hospital.name} — head for the emergency entrance
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <TurnGlyph step={upcoming} size={40}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: 'white', fontWeight: 800, fontSize: '26px', letterSpacing: '-0.8px', lineHeight: 1, fontFamily: MONO, fontVariantNumeric: 'tabular-nums' }}>
                      {distToNext != null ? formatDist(distToNext) : upcoming ? formatDist(upcoming.distance) : ''}
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600, fontSize: '15px', lineHeight: 1.3, marginTop: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {instructionText(upcoming)}
                    </p>
                  </div>
                </div>
                {after && after !== upcoming && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginTop: '12px', paddingTop: '11px', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '1.2px', flexShrink: 0 }}>Then</span>
                    <TurnGlyph step={after} size={16} color="rgba(255,255,255,0.6)"/>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{instructionText(after)}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Recenter (only when the driver has panned away) ─────────────── */}
          {!following && (
            <button onClick={recenter}
              style={{
                position: 'absolute', right: '14px', bottom: '96px', zIndex: 500,
                display: 'flex', alignItems: 'center', gap: '8px',
                background: '#FFFFFF', border: `1.5px solid ${ACCENT}`, color: ACCENT,
                borderRadius: '99px', padding: '11px 16px', cursor: 'pointer',
                fontFamily: 'inherit', fontWeight: 700, fontSize: '13.5px',
                boxShadow: '0 6px 20px rgba(20,20,19,0.2)',
              }}>
              <Crosshair size={15}/> Re-centre
            </button>
          )}

          {/* ── Step list ───────────────────────────────────────────────────── */}
          {showSteps && (
            <div style={{
              position: 'absolute', left: '12px', right: '12px', bottom: '86px', zIndex: 600,
              background: '#FFFFFF', border: `1px solid ${BORDER}`, borderRadius: '16px',
              maxHeight: '46%', overflowY: 'auto', boxShadow: '0 12px 40px rgba(20,20,19,0.25)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: `1px solid ${BORDER}`, position: 'sticky', top: 0, background: '#FFFFFF' }}>
                <span style={{ color: T3, fontFamily: MONO, fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                  All directions · {steps.length}
                </span>
                <button onClick={() => setShowSteps(false)} aria-label="Close directions"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex' }}>
                  <X size={16} color={T2}/>
                </button>
              </div>
              {steps.map((s, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'baseline', gap: '13px',
                  padding: '12px 16px', borderBottom: `1px solid ${BORDER}`,
                  background: i === currentStep + 1 ? 'rgba(86,128,78,0.05)' : 'transparent',
                  opacity: i <= currentStep ? 0.4 : 1,
                }}>
                  <TurnGlyph step={s} size={17} color={i === currentStep + 1 ? ACCENT : T2}/>
                  <p style={{ flex: 1, color: T1, fontSize: '13.5px', fontWeight: i === currentStep + 1 ? 700 : 500, lineHeight: 1.4 }}>
                    {instructionText(s)}
                  </p>
                  <span style={{ color: T3, fontFamily: MONO, fontSize: '11.5px', flexShrink: 0 }}>{formatDist(s.distance)}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── ETA bar ─────────────────────────────────────────────────────── */}
          <div style={{
            position: 'absolute', bottom: '14px', left: '12px', right: '12px', zIndex: 500,
            background: 'rgba(255,255,255,0.96)',
            backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
            border: `1px solid ${BORDER}`, borderRadius: '18px',
            padding: '13px 16px',
            boxShadow: '0 8px 28px rgba(20,20,19,0.16)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', minWidth: 0 }}>
              <div>
                <p style={{ color: GREEN, fontWeight: 800, fontSize: '21px', letterSpacing: '-0.6px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                  {remainingSec != null ? formatTime(remainingSec) : '—'}
                </p>
                <p style={{ color: T3, fontSize: '10px', fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '3px' }}>
                  {remainingSec != null ? `arrive ${new Date(Date.now() + remainingSec * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'eta'}
                </p>
              </div>
              <div>
                <p style={{ color: T1, fontWeight: 700, fontSize: '15px', fontFamily: MONO, lineHeight: 1 }}>
                  {remainingDist != null ? formatDist(remainingDist) : ''}
                </p>
                <p style={{ color: T3, fontSize: '10px', fontFamily: MONO, marginTop: '4px' }}>
                  {speed > 1 ? `${Math.round(speed * 3.6)} km/h` : 'left'}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <button onClick={() => setShowSteps(s => !s)} aria-label="All directions"
                style={{ width: '42px', height: '42px', borderRadius: '12px', background: showSteps ? 'rgba(86,128,78,0.08)' : '#B3DDAC', border: `1px solid ${showSteps ? 'rgba(86,128,78,0.2)' : BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <List size={17} color={showSteps ? ACCENT : T2}/>
              </button>
              <button onClick={() => setMuted(m => !m)} aria-label={muted ? 'Unmute voice guidance' : 'Mute voice guidance'}
                style={{ width: '42px', height: '42px', borderRadius: '12px', background: muted ? '#B3DDAC' : 'rgba(86,128,78,0.08)', border: `1px solid ${muted ? BORDER : 'rgba(86,128,78,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                {muted ? <VolumeX size={17} color={T3}/> : <Volume2 size={17} color={ACCENT}/>}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
