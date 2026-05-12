'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, MapPin, Loader2, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { findNearbyHospitals, Hospital } from '@/lib/hospitals'

const EMERGENCY_TYPES = [
  { id: 'chest_pain', label: 'Chest pain', icon: '🫀' },
  { id: 'stroke', label: 'Stroke signs', icon: '🧠' },
  { id: 'pots', label: 'POTS episode', icon: '⚡' },
  { id: 'unconscious', label: 'Unconscious', icon: '🔴' },
  { id: 'breathing', label: "Can't breathe", icon: '🫁' },
  { id: 'mecfs', label: 'Severe crash', icon: '😔' },
]

export default function TransportRequest() {
  const [step, setStep] = useState<'type' | 'location' | 'hospital' | 'waiting' | 'accepted'>('type')
  const [emergencyType, setEmergencyType] = useState('')
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [address, setAddress] = useState('')
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null)
  const [request, setRequest] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
    }
    load()
  }, [])

  // Poll for driver acceptance
  useEffect(() => {
    if (!request?.id) return
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('transport_requests')
        .select('*')
        .eq('id', request.id)
        .single()
      if (data?.status === 'accepted') {
        setRequest(data)
        setStep('accepted')
        clearInterval(interval)
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [request?.id])

  const getLocation = async () => {
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setPosition({ lat: latitude, lng: longitude })

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`)
          const data = await res.json()
          setAddress(data.display_name?.split(',').slice(0, 3).join(',') || 'Your location')
        } catch {
          setAddress('Your current location')
        }

        const nearbyHospitals = await findNearbyHospitals(latitude, longitude, emergencyType)
        setHospitals(nearbyHospitals)
        setLoading(false)
        setStep('hospital')
      },
      () => {
        toast.error('Could not get location')
        setLoading(false)
      },
      { enableHighAccuracy: true }
    )
  }

  const submitRequest = async () => {
    if (!position || !selectedHospital || !profile) return
    setLoading(true)

    const { data, error } = await supabase.from('transport_requests').insert({
      user_id: profile.id,
      patient_name: profile.full_name,
      pickup_lat: position.lat,
      pickup_lng: position.lng,
      pickup_address: address,
      hospital_name: selectedHospital.name,
      hospital_lat: selectedHospital.lat,
      hospital_lng: selectedHospital.lng,
      emergency_type: emergencyType,
      status: 'pending'
    }).select().single()

    if (error) {
      toast.error('Failed to submit request')
      setLoading(false)
      return
    }

    setRequest(data)
    setStep('waiting')
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#09090C', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ padding: '56px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => router.push('/dashboard')}
          style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ArrowLeft size={16} color="rgba(255,255,255,0.6)"/>
        </motion.button>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px' }}>Community</p>
          <h1 style={{ color: 'white', fontWeight: 700, fontSize: '20px' }}>Request a Ride</h1>
        </div>
      </div>

      <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
        <AnimatePresence mode="wait">

          {/* Step 1 — Emergency type */}
          {step === 'type' && (
            <motion.div key="type" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginBottom: '20px' }}>
                What is the emergency? A nearby community member will drive you to the right hospital.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {EMERGENCY_TYPES.map(type => (
                  <motion.button
                    key={type.id}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => { setEmergencyType(type.id); setStep('location') }}
                    style={{ background: '#111116', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '16px', textAlign: 'left', cursor: 'pointer' }}
                  >
                    <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>{type.icon}</span>
                    <p style={{ color: 'white', fontSize: '13px', fontWeight: 600 }}>{type.label}</p>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 2 — Location */}
          {step === 'location' && (
            <motion.div key="location" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div style={{ background: '#111116', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '20px', marginBottom: '16px', textAlign: 'center' }}>
                <MapPin size={32} color="#fcb546" style={{ margin: '0 auto 12px' }}/>
                <p style={{ color: 'white', fontWeight: 600, fontSize: '16px', marginBottom: '8px' }}>Share your location</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '20px' }}>
                  Relay Arc will find the nearest community driver and the right hospital for your emergency.
                </p>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={getLocation}
                  disabled={loading}
                  style={{ width: '100%', background: '#fcb546', color: '#09090C', fontWeight: 700, fontSize: '15px', padding: '16px', borderRadius: '14px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {loading ? <Loader2 size={18} className="animate-spin"/> : <><MapPin size={16}/> Use my location</>}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Step 3 — Hospital selection */}
          {step === 'hospital' && (
            <motion.div key="hospital" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div style={{ background: 'rgba(128,239,128,0.08)', border: '1px solid rgba(128,239,128,0.2)', borderRadius: '12px', padding: '12px 14px', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <MapPin size={14} color="#80EF80"/>
                <p style={{ color: '#80EF80', fontSize: '12px' }}>{address}</p>
              </div>

              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
                Select hospital
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {hospitals.map((h, i) => (
                  <motion.button
                    key={i}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedHospital(h)}
                    style={{
                      background: selectedHospital?.id === h.id ? 'rgba(252,181,70,0.08)' : '#111116',
                      border: `1px solid ${selectedHospital?.id === h.id ? 'rgba(252,181,70,0.4)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: '14px', padding: '14px', textAlign: 'left', cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}
                  >
                    <div>
                      <p style={{ color: 'white', fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>{h.name}</p>
                      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{h.address}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                      <p style={{ color: '#fcb546', fontWeight: 700, fontSize: '14px', fontFamily: 'monospace' }}>
                        {Math.round((h.distance || 0) / 1000 / 50 * 60)} min
                      </p>
                      <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', fontFamily: 'monospace' }}>
                        {((h.distance || 0) / 1000).toFixed(1)} km
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={submitRequest}
                disabled={!selectedHospital || loading}
                style={{
                  width: '100%',
                  background: selectedHospital ? '#DC2626' : 'rgba(255,255,255,0.08)',
                  color: selectedHospital ? 'white' : 'rgba(255,255,255,0.3)',
                  fontWeight: 700, fontSize: '15px', padding: '16px', borderRadius: '14px', border: 'none',
                  cursor: selectedHospital ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                {loading ? <Loader2 size={18} className="animate-spin"/> : 'Request community driver'}
              </motion.button>
            </motion.div>
          )}

          {/* Step 4 — Waiting */}
          {step === 'waiting' && (
            <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', paddingTop: '40px' }}>
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(252,181,70,0.15)', border: '2px solid rgba(252,181,70,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}
              >
                <span style={{ fontSize: '36px' }}>🚗</span>
              </motion.div>
              <h2 style={{ color: 'white', fontWeight: 700, fontSize: '22px', marginBottom: '8px' }}>Finding a driver</h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', marginBottom: '32px', lineHeight: 1.6 }}>
                Nearby community members are being notified. Someone will accept your request shortly.
              </p>
              <div style={{ background: '#111116', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '16px', textAlign: 'left', marginBottom: '24px' }}>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Request details</p>
                <p style={{ color: 'white', fontSize: '14px', marginBottom: '4px' }}>{request?.hospital_name}</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>{request?.pickup_address}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {[0, 0.3, 0.6].map((delay, i) => (
                  <motion.div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fcb546' }} animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity, delay }}/>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 5 — Accepted */}
          {step === 'accepted' && (
            <motion.div key="accepted" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div style={{ background: 'rgba(128,239,128,0.08)', border: '1px solid rgba(128,239,128,0.2)', borderRadius: '20px', padding: '20px', textAlign: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>✓</span>
                <p style={{ color: '#80EF80', fontWeight: 700, fontSize: '20px', marginBottom: '4px' }}>Driver found</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>They are on their way to you</p>
              </div>
              <div style={{ background: '#111116', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '16px', marginBottom: '12px' }}>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Your driver</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(74,158,245,0.15)', border: '1px solid rgba(74,158,245,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4A9EF5', fontWeight: 700, fontSize: '18px' }}>
                    {request?.driver_name?.[0]}
                  </div>
                  <div>
                    <p style={{ color: 'white', fontWeight: 600, fontSize: '16px' }}>{request?.driver_name}</p>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Community driver</p>
                  </div>
                </div>
                {request?.driver_phone && (
                  <a
                    href={`tel:${request.driver_phone}`}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'rgba(74,158,245,0.1)', border: '1px solid rgba(74,158,245,0.2)', borderRadius: '12px', padding: '12px', color: '#4A9EF5', fontWeight: 600, fontSize: '14px', textDecoration: 'none' }}
                  >
                    <Phone size={16}/> Call driver
                  </a>
                )}
              </div>
              <div style={{ background: '#111116', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '16px' }}>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Heading to</p>
                <p style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>{request?.hospital_name}</p>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
