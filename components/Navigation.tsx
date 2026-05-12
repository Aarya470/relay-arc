'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, useMap, Circle } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Icons
const userIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:20px;height:20px;
    background:#4A9EF5;
    border:3px solid white;
    border-radius:50%;
    box-shadow:0 0 0 4px rgba(74,158,245,0.3);
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

const hospitalIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:36px;height:36px;
    background:#80EF80;
    border-radius:8px;
    display:flex;align-items:center;justify-content:center;
    font-size:18px;
    box-shadow:0 4px 12px rgba(128,239,128,0.4);
    border:2px solid white;
  ">H</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
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
function TurnIcon({ type }: { type: string }) {
  const t = type?.toLowerCase() || ''
  let arrow = '↑'
  if (t.includes('left')) arrow = '←'
  else if (t.includes('right')) arrow = '→'
  else if (t.includes('slight left')) arrow = '↖'
  else if (t.includes('slight right')) arrow = '↗'
  else if (t.includes('sharp left')) arrow = '↙'
  else if (t.includes('sharp right')) arrow = '↘'
  else if (t.includes('u-turn')) arrow = '↩'
  else if (t.includes('arrive') || t.includes('destination')) arrow = '🏥'
  return <span style={{ fontSize: '28px', lineHeight: 1 }}>{arrow}</span>
}

// Auto-follow map
function MapController({ position, heading }: { position: [number,number] | null, heading: number }) {
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
  const [heading, setHeading] = useState(0)
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
        setHeading(pos.coords.heading || 0)
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
      height: '100%', background: '#09090C',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px', gap: '16px'
    }}>
      <div style={{ fontSize: '64px' }}>🏥</div>
      <p style={{ color: '#80EF80', fontSize: '24px', fontWeight: 700 }}>You have arrived</p>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', textAlign: 'center' }}>
        {hospital.name} — the ER team is ready for you
      </p>
    </div>
  )

  return (
    <div style={{ height: '420px', display: 'flex', flexDirection: 'column', background: '#07070F' }}>

      {/* Current instruction bar */}
      {currentStepData && !loading && (
        <div style={{
          background: '#111116',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          flexShrink: 0
        }}>
          <div style={{
            width: '52px', height: '52px',
            background: 'rgba(74,158,245,0.15)',
            borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            <TurnIcon type={currentStepData.type}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: 'white', fontWeight: 600, fontSize: '15px', marginBottom: '2px', lineHeight: 1.3 }}>
              {currentStepData.instruction}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontFamily: 'monospace' }}>
              {distToNext !== null ? formatDist(distToNext) : formatDist(currentStepData.distance)}
            </p>
          </div>
          {eta !== null && (
            <div style={{
              background: 'rgba(232,50,42,0.15)',
              border: '1px solid rgba(232,50,42,0.25)',
              borderRadius: '12px',
              padding: '8px 12px',
              textAlign: 'center',
              flexShrink: 0
            }}>
              <p style={{ color: '#FF4A42', fontWeight: 700, fontSize: '18px', fontFamily: 'monospace', lineHeight: 1 }}>
                {formatTime(eta)}
              </p>
              <p style={{ color: 'rgba(255,74,66,0.5)', fontSize: '10px', fontFamily: 'monospace', marginTop: '2px' }}>ETA</p>
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{
          background: '#111116',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexShrink: 0
        }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fcb546', animation: 'pulse 1s infinite' }}/>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
            {error || 'Calculating route...'}
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
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution=""
            />

            {/* Route line */}
            {route.length > 0 && (
              <>
                {/* Shadow */}
                <Polyline
                  positions={route}
                  pathOptions={{ color: '#4A9EF5', weight: 10, opacity: 0.2 }}
                />
                {/* Main route */}
                <Polyline
                  positions={route}
                  pathOptions={{ color: '#4A9EF5', weight: 5, opacity: 1 }}
                />
              </>
            )}

            {/* User position */}
            <Marker position={position} icon={userIcon}/>
            <Circle
              center={position}
              radius={15}
              pathOptions={{ color: '#4A9EF5', fillColor: '#4A9EF5', fillOpacity: 0.15, weight: 0 }}
            />

            {/* Hospital */}
            <Marker position={hospitalPos} icon={hospitalIcon}/>

            {/* Auto follow */}
            <MapController position={position} heading={heading}/>
          </MapContainer>
        )}
      </div>

      {/* Bottom info strip */}
      <div style={{
        background: '#111116',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>
            Destination
          </p>
          <p style={{ color: 'white', fontSize: '13px', fontWeight: 600 }}>{hospital.name}</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {totalDist !== null && (
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Distance</p>
              <p style={{ color: 'white', fontSize: '13px', fontWeight: 600, fontFamily: 'monospace' }}>{formatDist(totalDist)}</p>
            </div>
          )}
          {speed > 0 && (
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Speed</p>
              <p style={{ color: '#80EF80', fontSize: '13px', fontWeight: 600, fontFamily: 'monospace' }}>{Math.round(speed * 3.6)} km/h</p>
            </div>
          )}
        </div>
      </div>

      {/* Next step preview */}
      {nextStepData && (
        <div style={{
          background: '#09090C',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexShrink: 0
        }}>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', flexShrink: 0 }}>
            Then
          </p>
          <TurnIcon type={nextStepData.type}/>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px' }}>{nextStepData.instruction}</p>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', fontFamily: 'monospace', marginLeft: 'auto', flexShrink: 0 }}>
            {formatDist(nextStepData.distance)}
          </p>
        </div>
      )}

    </div>
  )
}
