'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, useMap, Circle } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// ─── Design tokens — shared with the app ─────────────────────────────────────
const T1     = '#0E1218'
const T2     = '#5B6371'
const T3     = '#9AA2AD'
const BORDER = '#E3E6EC'
const ACCENT = '#0055FF'
const RED    = '#D91414'
const GREEN  = '#007A44'

// note: leaflet icons use HTML strings so we keep SVG inline rather than React components
const userIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:20px;height:20px;
    background:${ACCENT};
    border:3px solid white;
    border-radius:50%;
    box-shadow:0 0 0 5px rgba(0,85,255,0.22);
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

const hospitalIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:34px;height:34px;
    background:${RED};
    border-radius:9px;
    display:flex;align-items:center;justify-content:center;
    font-size:19px;font-weight:800;color:white;line-height:1;
    border:2px solid white;
    box-shadow:0 3px 12px rgba(14,18,24,0.3);
  ">+</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
})

// Haversine distance in meters
function distanceBetween(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

function formatDist(m: number) {
  return m >= 1000 ? `${(m/1000).toFixed(1)} km` : `${Math.round(m)} m`
}

function formatTime(seconds: number) {
  const mins = Math.round(seconds / 60)
  return mins < 60 ? `${mins} min` : `${Math.floor(mins/60)}h ${mins%60}m`
}

// Turn direction icon
function TurnIcon({ type, color = T1 }: { type: string; color?: string }) {
  const t = type?.toLowerCase() || ''
  let arrow = '↑'
  if (t.includes('slight left')) arrow = '↖'
  else if (t.includes('slight right')) arrow = '↗'
  else if (t.includes('sharp left')) arrow = '↙'
  else if (t.includes('sharp right')) arrow = '↘'
  else if (t.includes('left')) arrow = '←'
  else if (t.includes('right')) arrow = '→'
  else if (t.includes('u-turn')) arrow = '↩'
  else if (t.includes('arrive') || t.includes('destination')) arrow = '+'
  return <span style={{ fontSize: '24px', lineHeight: 1, fontFamily: 'monospace', fontWeight: 700, color }}>{arrow}</span>
}

// Auto-follow map
function MapController({ position }: { position: [number,number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (position) {
      map.setView(position, 16, { animate: true, duration: 0.8 })
    }
  }, [position])
  return null
}

interface Step {
  instruction: string
  distance: number
  duration: number
  type: string
  coords: [number, number]
}

export default function Navigation({ hospital }: { hospital: any }) {
  const [position, setPosition] = useState<[number, number] | null>(null)
  const [speed, setSpeed] = useState(0)
  const [route, setRoute] = useState<[number, number][]>([])
  const [steps, setSteps] = useState<Step[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [eta, setEta] = useState<number | null>(null)
  const [totalDist, setTotalDist] = useState<number | null>(null)
  const [distToNext, setDistToNext] = useState<number | null>(null)
  const [arrived, setArrived] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const watchId = useRef<number | null>(null)

  const hospitalPos: [number, number] = [hospital.lat, hospital.lng]

  // Fetch OSRM route
  const fetchRoute = useCallback(async (from: [number, number]) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${hospital.lng},${hospital.lat}?steps=true&geometries=geojson&overview=full`
      const res = await fetch(url)
      const data = await res.json()

      if (data.code !== 'Ok') return

      const leg = data.routes[0].legs[0]
      setEta(data.routes[0].duration)
      setTotalDist(data.routes[0].distance)

      // Route polyline
      const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
        ([lng, lat]: [number, number]) => [lat, lng]
      )
      setRoute(coords)

      // Steps
      const parsedSteps: Step[] = leg.steps.map((s: any) => ({
        instruction: s.maneuver.instruction || s.name || 'Continue',
        distance: s.distance,
        duration: s.duration,
        type: s.maneuver.type,
        coords: [s.maneuver.location[1], s.maneuver.location[0]] as [number, number]
      }))
      setSteps(parsedSteps)
      setLoading(false)
    } catch (e) {
      setError('Could not load route')
      setLoading(false)
    }
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

        // Check arrival
        const distToHospital = distanceBetween(p[0], p[1], hospital.lat, hospital.lng)
        if (distToHospital < 50) {
          setArrived(true)
          return
        }

        // Advance step
        if (steps.length > 0 && currentStep < steps.length - 1) {
          const nextStep = steps[currentStep + 1]
          const dist = distanceBetween(p[0], p[1], nextStep.coords[0], nextStep.coords[1])
          setDistToNext(dist)
          if (dist < 30) setCurrentStep(prev => prev + 1)
        }

        // Recalculate remaining ETA roughly
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
    }
  }, [steps, currentStep])

  const currentStepData = steps[currentStep]
  const nextStepData = steps[currentStep + 1]

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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>

      {/* Current instruction bar */}
      {currentStepData && !loading && (
        <div style={{
          background: '#FFFFFF',
          borderBottom: `1px solid ${BORDER}`,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          flexShrink: 0
        }}>
          <div style={{
            width: '52px', height: '52px',
            background: 'rgba(0,85,255,0.08)',
            borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            <TurnIcon type={currentStepData.type} color={ACCENT}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: T1, fontWeight: 700, fontSize: '15.5px', marginBottom: '3px', lineHeight: 1.3 }}>
              {currentStepData.instruction}
            </p>
            <p style={{ color: T3, fontSize: '12px', fontFamily: 'monospace' }}>
              {distToNext !== null ? formatDist(distToNext) : formatDist(currentStepData.distance)}
            </p>
          </div>
          {eta !== null && (
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ color: RED, fontWeight: 800, fontSize: '20px', fontFamily: 'monospace', lineHeight: 1, letterSpacing: '-0.5px' }}>
                {formatTime(eta)}
              </p>
              <p style={{ color: T3, fontSize: '9px', fontFamily: 'monospace', marginTop: '3px', textTransform: 'uppercase', letterSpacing: '1px' }}>ETA</p>
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{
          background: '#FFFFFF',
          borderBottom: `1px solid ${BORDER}`,
          padding: '15px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '11px',
          flexShrink: 0
        }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#B45309', animation: 'pulse 1s infinite' }}/>
          <p style={{ color: T2, fontSize: '13px' }}>
            {error || 'Calculating route…'}
          </p>
        </div>
      )}

      {/* Map */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {position && (
          <MapContainer
            center={position}
            zoom={16}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
            attributionControl={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution=""
            />

            {/* Route line */}
            {route.length > 0 && (
              <>
                {/* Casing */}
                <Polyline
                  positions={route}
                  pathOptions={{ color: ACCENT, weight: 11, opacity: 0.15 }}
                />
                {/* Main route */}
                <Polyline
                  positions={route}
                  pathOptions={{ color: ACCENT, weight: 5, opacity: 1 }}
                />
              </>
            )}

            {/* User position */}
            <Marker position={position} icon={userIcon}/>
            <Circle
              center={position}
              radius={15}
              pathOptions={{ color: ACCENT, fillColor: ACCENT, fillOpacity: 0.12, weight: 0 }}
            />

            {/* Hospital */}
            <Marker position={hospitalPos} icon={hospitalIcon}/>

            {/* Auto follow */}
            <MapController position={position}/>
          </MapContainer>
        )}
      </div>

      {/* Bottom info strip */}
      <div style={{
        background: '#FFFFFF',
        borderTop: `1px solid ${BORDER}`,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div style={{ minWidth: 0, paddingRight: '12px' }}>
          <p style={{ color: T3, fontSize: '9.5px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '3px' }}>
            Destination
          </p>
          <p style={{ color: T1, fontSize: '13.5px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hospital.name}</p>
        </div>
        <div style={{ display: 'flex', gap: '18px', alignItems: 'center', flexShrink: 0 }}>
          {totalDist !== null && (
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: T3, fontSize: '9.5px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '3px' }}>Distance</p>
              <p style={{ color: T1, fontSize: '13.5px', fontWeight: 700, fontFamily: 'monospace' }}>{formatDist(totalDist)}</p>
            </div>
          )}
          {speed > 0 && (
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: T3, fontSize: '9.5px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '3px' }}>Speed</p>
              <p style={{ color: GREEN, fontSize: '13.5px', fontWeight: 700, fontFamily: 'monospace' }}>{Math.round(speed * 3.6)} km/h</p>
            </div>
          )}
        </div>
      </div>

      {/* Next step preview */}
      {nextStepData && (
        <div style={{
          background: '#F4F5F7',
          borderTop: `1px solid ${BORDER}`,
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexShrink: 0
        }}>
          <p style={{ color: T3, fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1.2px', flexShrink: 0 }}>
            Then
          </p>
          <TurnIcon type={nextStepData.type} color={T2}/>
          <p style={{ color: T2, fontSize: '12.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nextStepData.instruction}</p>
          <p style={{ color: T3, fontSize: '11px', fontFamily: 'monospace', marginLeft: 'auto', flexShrink: 0 }}>
            {formatDist(nextStepData.distance)}
          </p>
        </div>
      )}

    </div>
  )
}
