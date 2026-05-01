'use client'
import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

const patientIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

const hospitalIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

function RoutingControl({ patientPos, hospitalPos, onStepsReady }: any) {
  const map = useMap()

  useEffect(() => {
    if (!patientPos || !hospitalPos) return

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.min.js'
    script.onload = () => {
      const LR = (window as any).L.Routing
      if (!LR) return

      const control = LR.control({
        waypoints: [
          L.latLng(patientPos[0], patientPos[1]),
          L.latLng(hospitalPos[0], hospitalPos[1])
        ],
        routeWhileDragging: false,
        showAlternatives: false,
        fitSelectedRoutes: true,
        lineOptions: {
          styles: [{ color: '#4A9EF5', weight: 5, opacity: 0.9 }]
        },
        createMarker: () => null,
      }).addTo(map)

      control.on('routesfound', (e: any) => {
        const routes = e.routes[0]
        const steps = routes.instructions.map((s: any) => ({
          text: s.text,
          distance: s.distance,
          time: s.time
        }))
        onStepsReady(steps, Math.round(routes.summary.totalTime / 60))
      })

      const container = control.getContainer()
      if (container) container.style.display = 'none'
    }

    document.head.appendChild(script)

    return () => {
      if (document.head.contains(script)) document.head.removeChild(script)
    }
  }, [patientPos, hospitalPos])

  return null
}

export default function Navigation({ hospital }: { hospital: any }) {
  const [patientPos, setPatientPos] = useState<[number, number] | null>(null)
  const [steps, setSteps] = useState<any[]>([])
  const [eta, setEta] = useState<number | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [locationError, setLocationError] = useState('')

  useEffect(() => {
    if (!navigator.geolocation) {
      setPatientPos([hospital.lat - 0.05, hospital.lng - 0.05])
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => setPatientPos([pos.coords.latitude, pos.coords.longitude]),
      () => {
        setLocationError('Location access denied. Using demo location.')
        setPatientPos([hospital.lat - 0.05, hospital.lng - 0.05])
      }
    )
  }, [])

  const handleStepsReady = (newSteps: any[], etaMin: number) => {
    setSteps(newSteps)
    setEta(etaMin)
  }

  return (
    <div className="flex flex-col h-full">
      {locationError && (
        <p className="text-yellow-400 text-xs px-4 py-2 bg-yellow-400/10">{locationError}</p>
      )}

      {/* Current instruction */}
      {steps.length > 0 && (
        <div className="bg-[#09090C] border-b border-white/10 px-4 py-3 flex items-center gap-4">
          <p className="text-blue-400 text-3xl font-bold">→</p>
          <div className="flex-1">
            <p className="text-white text-sm font-semibold">{steps[currentStep]?.text}</p>
            <p className="text-gray-400 font-mono text-xs">
              {steps[currentStep]?.distance > 1000
                ? `${(steps[currentStep].distance / 1000).toFixed(1)} km`
                : `${Math.round(steps[currentStep]?.distance || 0)} m`}
            </p>
          </div>
          {eta && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-xl px-3 py-1.5 text-center">
              <p className="text-red-400 font-bold text-lg font-mono">{eta}</p>
              <p className="text-red-400 text-xs font-mono">min</p>
            </div>
          )}
        </div>
      )}

      {/* Map */}
      <div className="flex-1" style={{ minHeight: '300px' }}>
        {patientPos && (
          <MapContainer
            center={patientPos}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            <Marker position={patientPos} icon={patientIcon}/>
            <Marker position={[hospital.lat, hospital.lng]} icon={hospitalIcon}/>
            <RoutingControl
              patientPos={patientPos}
              hospitalPos={[hospital.lat, hospital.lng]}
              onStepsReady={handleStepsReady}
            />
          </MapContainer>
        )}
        {!patientPos && (
          <div className="h-full flex items-center justify-center bg-[#0D0D18]">
            <p className="text-gray-400 text-sm">Getting your location...</p>
          </div>
        )}
      </div>

      {/* All steps */}
      {steps.length > 0 && (
        <div className="max-h-40 overflow-y-auto bg-[#09090C] border-t border-white/10">
          {steps.map((step, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 border-b border-white/5 text-left transition ${
                i === currentStep ? 'bg-blue-500/10' : 'hover:bg-white/5'
              }`}
            >
              <span className="text-gray-500 font-mono text-xs w-4">{i + 1}</span>
              <p className={`text-xs flex-1 ${i === currentStep ? 'text-white' : 'text-gray-400'}`}>{step.text}</p>
              <span className="text-gray-600 font-mono text-xs">
                {step.distance > 1000 ? `${(step.distance / 1000).toFixed(1)}km` : `${Math.round(step.distance)}m`}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
