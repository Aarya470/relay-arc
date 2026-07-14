'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, useMap, Circle } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { Volume2, VolumeX } from 'lucide-react'

// ─── Design tokens ────────────────────────────────────────────────────────────
const T1     = '#0E1218'
const T2     = '#5B6371'
const T3     = '#9AA2AD'
const BORDER = '#E3E6EC'
const ACCENT = '#0055FF'
const RED    = '#D91414'
const GREEN  = '#007A44'

// ─── Icons (recreated per-bearing so they stay upright while the map rotates) ─
function makeUserIcon(bearing: number) {
  return L.divIcon({
    className: '',
    html: `<div style="transform:rotate(${bearing}deg);width:44px;height:44px;display:flex;align-items:center;justify-content:center;">
      <div style="width:0;height:0;border-left:13px solid transparent;border-right:13px solid transparent;border-bottom:34px solid ${ACCENT};
        filter:drop-shadow(0 2px 6px rgba(0,85,255,0.5));border-radius:4px;"></div>
      <div style="position:absolute;width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-bottom:19px solid white;margin-top:9px;"></div>
    </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  })
}
function makeHospitalIcon(bearing: number) {
  return L.divIcon({
    className: '',
    html: `<div style="transform:rotate(${bearing}deg);width:36px;height:36px;background:${RED};border-radius:10px;
      display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:white;line-height:1;
      border:2.5px solid white;box-shadow:0 3px 14px rgba(14,18,24,0.35);">+</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  })
}

// ─── Geometry helpers ─────────────────────────────────────────────────────────
function distanceBetween(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}
function bearingBetween(lat1: number, lon1: number, lat2: number, lon2: number) {
  const φ1 = lat1 * Math.PI/180, φ2 = lat2 * Math.PI/180
  const Δλ = (lon2 - lon1) * Math.PI/180
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1)*Math.sin(φ2) - Math.sin(φ1)*Math.cos(φ2)*Math.cos(Δλ)
  return ((Math.atan2(y, x) * 180/Math.PI) + 360) % 360
}
// Point `d` meters ahead of (lat,lng) along `brg` degrees
function projectAhead(lat: number, lng: number, brg: number, d: number): [number, number] {
  const rad = brg * Math.PI/180
  return [lat + (d * Math.cos(rad)) / 111320, lng + (d * Math.sin(rad)) / (111320 * Math.cos(lat * Math.PI/180))]
}
function formatDist(m: number) {
  return m >= 1000 ? `${(m/1000).toFixed(1)} km` : `${Math.round(m / 10) * 10} m`
}
function formatTime(seconds: number) {
  const mins = Math.max(1, Math.round(seconds / 60))
  return mins < 60 ? `${mins} min` : `${Math.floor(mins/60)} h ${mins%60} m`
}

// ─── Instruction text (OSRM demo returns no prose — we compose it) ───────────
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

// ─── Map plumbing ─────────────────────────────────────────────────────────────
function SizeFix() {
  const map = useMap()
  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 60)
    const t2 = setTimeout(() => map.invalidateSize(), 400)
    const onResize = () => map.invalidateSize()
    window.addEventListener('resize', onResize)
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null
    ro?.observe(map.getContainer())
    return () => {
      clearTimeout(t1); clearTimeout(t2)
      window.removeEventListener('resize', onResize)
      ro?.disconnect()
    }
  }, [map])
  return null
}
function ChaseCamera({ position, bearing, zoom, preview }: { position: [number,number] | null; bearing: number; zoom: number; preview: boolean }) {
  const map = useMap()
  useEffect(() => {
    if (!position) return
    if (preview) { map.setView(position, 15, { animate: true }); return }
    // center a point ahead of the driver so they sit in the lower third
    const ahead = projectAhead(position[0], position[1], bearing, 70)
    map.setView(ahead, zoom, { animate: true, duration: 0.45 })
  }, [position, bearing, zoom, preview])
  return null
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Navigation({ hospital, preview = false }: { hospital: any; preview?: boolean }) {
  const [position, setPosition] = useState<[number, number] | null>(null)
  const [speed, setSpeed] = useState(0)
  const [bearing, setBearing] = useState(0)
  const [route, setRoute] = useState<[number, number][]>([])
  const [steps, setSteps] = useState<Step[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [eta, setEta] = useState<number | null>(null)
  const [totalDist, setTotalDist] = useState<number | null>(null)
  const [distToNext, setDistToNext] = useState<number | null>(null)
  const [arrived, setArrived] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [muted, setMuted] = useState(false)
  const watchId = useRef<number | null>(null)
  const lastPos = useRef<[number, number] | null>(null)
  const lastRecalc = useRef(0)
  const spokenFar = useRef(false)
  const spokenNear = useRef(false)
  const mutedRef = useRef(false)
  mutedRef.current = muted

  const hospitalPos: [number, number] = [hospital.lat, hospital.lng]

  const speak = useCallback((text: string) => {
    if (mutedRef.current || preview) return
    try {
      const u = new SpeechSynthesisUtterance(text)
      u.rate = 1.05
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(u)
    } catch {}
  }, [preview])

  // Fetch route — FOSSGIS first (reliable), OSRM demo as fallback
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
      } catch { /* try next */ }
    }
    if (!data) { setError('Could not load route'); setLoading(false); return }

    const leg = data.routes[0].legs[0]
    setEta(data.routes[0].duration)
    setTotalDist(data.routes[0].distance)
    const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng]
    )
    setRoute(coords)
    const parsedSteps: Step[] = leg.steps.map((s: any) => ({
      name: s.name || '',
      distance: s.distance,
      duration: s.duration,
      type: s.maneuver.type,
      modifier: s.maneuver.modifier || '',
      exit: s.maneuver.exit,
      coords: [s.maneuver.location[1], s.maneuver.location[0]] as [number, number],
    }))
    setSteps(parsedSteps)
    setCurrentStep(0)
    setLoading(false)
  }, [hospital])

  // GPS tracking
  useEffect(() => {
    if (!navigator.geolocation) {
      const fallback: [number, number] = [hospital.lat - 0.05, hospital.lng - 0.05]
      setPosition(fallback)
      fetchRoute(fallback)
      return
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        const p: [number, number] = [pos.coords.latitude, pos.coords.longitude]
        setPosition(p)
        lastPos.current = p
        fetchRoute(p)
      },
      () => {
        const fallback: [number, number] = [hospital.lat - 0.05, hospital.lng - 0.05]
        setPosition(fallback)
        fetchRoute(fallback)
        setError('Using demo location')
      },
      { enableHighAccuracy: true }
    )

    watchId.current = navigator.geolocation.watchPosition(
      pos => {
        const p: [number, number] = [pos.coords.latitude, pos.coords.longitude]
        setPosition(p)
        setSpeed(pos.coords.speed || 0)

        // Heading: GPS heading while moving, else derive from motion
        if (pos.coords.heading !== null && !isNaN(pos.coords.heading) && (pos.coords.speed || 0) > 1) {
          setBearing(pos.coords.heading)
        } else if (lastPos.current && distanceBetween(p[0], p[1], lastPos.current[0], lastPos.current[1]) > 4) {
          setBearing(bearingBetween(lastPos.current[0], lastPos.current[1], p[0], p[1]))
        }
        lastPos.current = p

        // Arrival
        const distToHospital = distanceBetween(p[0], p[1], hospital.lat, hospital.lng)
        if (distToHospital < 50) {
          setArrived(true)
          return
        }

        // Advance maneuvers
        if (steps.length > 0 && currentStep < steps.length - 1) {
          const nextStep = steps[currentStep + 1]
          const dist = distanceBetween(p[0], p[1], nextStep.coords[0], nextStep.coords[1])
          setDistToNext(dist)
          if (dist < 30) {
            setCurrentStep(prev => prev + 1)
            spokenFar.current = false
            spokenNear.current = false
          } else {
            if (!spokenFar.current && dist < 350) { spokenFar.current = true; speak(`In ${Math.round(dist / 50) * 50} meters, ${instructionText(steps[currentStep + 1])}`) }
            if (!spokenNear.current && dist < 60) { spokenNear.current = true; speak(instructionText(steps[currentStep + 1])) }
          }
        }

        // Off-route: recalc when >60m from the polyline (throttled)
        if (route.length > 0 && Date.now() - lastRecalc.current > 20000) {
          let minD = Infinity
          for (let i = 0; i < route.length; i += 3) {
            const d = distanceBetween(p[0], p[1], route[i][0], route[i][1])
            if (d < minD) minD = d
            if (minD < 60) break
          }
          if (minD > 60) {
            lastRecalc.current = Date.now()
            speak('Recalculating route')
            fetchRoute(p)
          }
        }

        // Remaining ETA
        if (steps.length > 0) {
          const remaining = steps.slice(currentStep).reduce((acc, s) => acc + s.duration, 0)
          setEta(remaining)
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 5000 }
    )

    return () => {
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current)
      try { window.speechSynthesis.cancel() } catch {}
    }
  }, [steps, currentStep, route])

  const upcoming = steps.length > 0 ? steps[Math.min(currentStep + 1, steps.length - 1)] : undefined
  const after = steps.length > 0 ? steps[Math.min(currentStep + 2, steps.length - 1)] : undefined
  const zoom = speed > 18 ? 16.75 : speed > 9 ? 17.5 : 18
  const mapBearing = preview ? 0 : bearing

  if (arrived) return (
    <div style={{
      height: '100%', background: '#FFFFFF',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px', gap: '14px'
    }}>
      <div style={{ width: '68px', height: '68px', borderRadius: '18px', background: 'rgba(0,122,68,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
    <div style={{ height: '100%', position: 'relative', overflow: 'hidden', background: '#E8EAED' }}>

      {/* Rotating map plane — oversized so corners never show */}
      <div style={{
        position: 'absolute',
        inset: preview ? 0 : '-30%',
        transform: preview ? 'none' : `rotate(${-mapBearing}deg)`,
        transformOrigin: 'center center',
        transition: 'transform 0.6s ease-out',
        willChange: 'transform',
      }}>
        {position && (
          <MapContainer
            center={position}
            zoom={preview ? 15 : 18}
            zoomSnap={0.25}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
            attributionControl={false}
            dragging={preview}
            scrollWheelZoom={preview}
            touchZoom={preview}
            doubleClickZoom={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution=""
            />
            {route.length > 0 && (
              <>
                <Polyline positions={route} pathOptions={{ color: '#0033A0', weight: 12, opacity: 0.25 }} />
                <Polyline positions={route} pathOptions={{ color: ACCENT, weight: 7, opacity: 1 }} />
              </>
            )}
            <Marker position={position} icon={makeUserIcon(mapBearing)}/>
            {!preview && (
              <Circle center={position} radius={20} pathOptions={{ color: ACCENT, fillColor: ACCENT, fillOpacity: 0.08, weight: 0 }}/>
            )}
            <Marker position={hospitalPos} icon={makeHospitalIcon(mapBearing)}/>
            <ChaseCamera position={position} bearing={mapBearing} zoom={zoom} preview={preview}/>
            <SizeFix/>
          </MapContainer>
        )}
      </div>

      {!preview && (
        <>
          {/* ── Maneuver banner — Apple/Tesla style ─────────────────────────── */}
          <div style={{
            position: 'absolute', top: '12px', left: '12px', right: '12px', zIndex: 500,
            background: T1, borderRadius: '18px',
            padding: '16px 18px',
            boxShadow: '0 10px 34px rgba(14,18,24,0.35)',
          }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#E8A33D', animation: 'pulse 1s infinite' }}/>
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '14px', fontWeight: 600 }}>{error || 'Calculating route…'}</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <TurnGlyph step={upcoming} size={40}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: 'white', fontWeight: 800, fontSize: '26px', letterSpacing: '-0.8px', lineHeight: 1, fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums' }}>
                      {distToNext !== null ? formatDist(distToNext) : upcoming ? formatDist(upcoming.distance) : ''}
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600, fontSize: '15px', lineHeight: 1.3, marginTop: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {instructionText(upcoming)}
                    </p>
                  </div>
                </div>
                {after && after !== upcoming && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginTop: '12px', paddingTop: '11px', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '1.2px', flexShrink: 0 }}>Then</span>
                    <TurnGlyph step={after} size={16} color="rgba(255,255,255,0.6)"/>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{instructionText(after)}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Floating ETA bar ────────────────────────────────────────────── */}
          <div style={{
            position: 'absolute', bottom: '14px', left: '12px', right: '12px', zIndex: 500,
            background: 'rgba(255,255,255,0.96)',
            backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
            border: `1px solid ${BORDER}`, borderRadius: '18px',
            padding: '13px 18px',
            boxShadow: '0 8px 28px rgba(14,18,24,0.16)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', minWidth: 0 }}>
              <div>
                <p style={{ color: GREEN, fontWeight: 800, fontSize: '21px', letterSpacing: '-0.6px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                  {eta !== null ? formatTime(eta) : '—'}
                </p>
                <p style={{ color: T3, fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '3px' }}>
                  {eta !== null ? `arrive ${new Date(Date.now() + eta * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'eta'}
                </p>
              </div>
              <div>
                <p style={{ color: T1, fontWeight: 700, fontSize: '15px', fontFamily: 'var(--font-mono, monospace)', lineHeight: 1 }}>
                  {totalDist !== null ? formatDist(totalDist) : ''}
                </p>
                {speed > 1 && (
                  <p style={{ color: T3, fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', marginTop: '4px' }}>{Math.round(speed * 3.6)} km/h</p>
                )}
              </div>
            </div>
            <button onClick={() => setMuted(m => !m)} aria-label={muted ? 'Unmute voice guidance' : 'Mute voice guidance'}
              style={{ width: '42px', height: '42px', borderRadius: '12px', background: muted ? '#F4F5F7' : 'rgba(0,85,255,0.08)', border: `1px solid ${muted ? BORDER : 'rgba(0,85,255,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              {muted ? <VolumeX size={17} color={T3}/> : <Volume2 size={17} color={ACCENT}/>}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
