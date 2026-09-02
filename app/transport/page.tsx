'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, MapPin, Loader2, Phone, Heart, Brain, Zap, AlertCircle, Wind, Activity, Car, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { findNearbyHospitals, Hospital } from '@/lib/hospitals'

const EMERGENCY_TYPES = [
  { id: 'chest_pain', label: 'Chest pain',    Icon: Heart      },
  { id: 'stroke',     label: 'Stroke signs',   Icon: Brain      },
  { id: 'pots',       label: 'POTS episode',   Icon: Zap        },
  { id: 'unconscious',label: 'Unconscious',    Icon: AlertCircle},
  { id: 'breathing',  label: "Can't breathe",  Icon: Wind       },
  { id: 'mecfs',      label: 'Severe crash',   Icon: Activity   },
]

const spring = { type: 'spring', stiffness: 380, damping: 24 } as const

export default function TransportRequest() {
  const [step, setStep]               = useState<'type' | 'location' | 'hospital' | 'waiting' | 'accepted'>('type')
  const [emergencyType, setEmergencyType] = useState('')
  const [position, setPosition]       = useState<{ lat: number; lng: number } | null>(null)
  const [address, setAddress]         = useState('')
  const [hospitals, setHospitals]     = useState<Hospital[]>([])
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null)
  const [request, setRequest]         = useState<any>(null)
  const [profile, setProfile]         = useState<any>(null)
  const [loading, setLoading]         = useState(false)
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
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
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
      status: 'pending',
      expires_at: expiresAt
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
    <div style={{ minHeight: '100dvh', background: '#B3DDAC', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ padding: '56px 20px 14px', borderBottom: '1px solid #98C890', display: 'flex', alignItems: 'center', gap: '12px', background: '#FFFFFF', flexShrink: 0 }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          transition={spring}
          onClick={() => router.push('/dashboard')}
          style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#F2F0E8', border: '1px solid #98C890', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <ArrowLeft size={16} color="#5C5A52"/>
        </motion.button>
        <div>
          <p style={{ color: '#6F6D65', fontFamily: 'var(--font-mono, monospace)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px' }}>Community</p>
          <h1 style={{ color: '#141413', fontWeight: 700, fontSize: '20px', letterSpacing: '-0.4px' }}>Request a Ride</h1>
        </div>
      </div>

      <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
        <AnimatePresence mode="wait">

          {/* Step 1 — Emergency type */}
          {step === 'type' && (
            <motion.div key="type" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <p style={{ color: '#5C5A52', fontSize: '13px', marginBottom: '20px', lineHeight: 1.6 }}>
                What is the emergency? A nearby community member will drive you to the right hospital.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {EMERGENCY_TYPES.map(type => (
                  <motion.button
                    key={type.id}
                    whileTap={{ scale: 0.95 }}
                    transition={spring}
                    onClick={() => { setEmergencyType(type.id); setStep('location') }}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #98C890',
                      borderRadius: '16px',
                      padding: '18px 16px',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(163,52,23,0.10)', border: '1px solid rgba(163,52,23,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                      <type.Icon size={17} color="#A33417"/>
                    </div>
                    <p style={{ color: '#141413', fontSize: '13px', fontWeight: 700, letterSpacing: '-0.2px' }}>{type.label}</p>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 2 — Location */}
          {step === 'location' && (
            <motion.div key="location" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div style={{ background: '#FFFFFF', border: '1px solid #98C890', borderRadius: '20px', padding: '24px 20px', marginBottom: '16px', textAlign: 'center' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(86,128,78,0.10)', border: '1px solid rgba(86,128,78,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <MapPin size={24} color="#42623C"/>
                </div>
                <p style={{ color: '#141413', fontWeight: 700, fontSize: '16px', marginBottom: '8px', letterSpacing: '-0.3px' }}>Share your location</p>
                <p style={{ color: '#5C5A52', fontSize: '13px', marginBottom: '20px', lineHeight: 1.6 }}>
                  Relay Arc will find the nearest community driver and the right hospital for your emergency.
                </p>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  transition={spring}
                  onClick={getLocation}
                  disabled={loading}
                  style={{ width: '100%', background: '#42623C', color: 'white', fontWeight: 700, fontSize: '15px', padding: '15px', borderRadius: '14px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {loading ? <Loader2 size={18} className="animate-spin"/> : <><MapPin size={16}/> Use my location</>}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Step 3 — Hospital selection */}
          {step === 'hospital' && (
            <motion.div key="hospital" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div style={{ background: 'rgba(86,128,78,0.08)', border: '1px solid rgba(86,128,78,0.15)', borderRadius: '12px', padding: '11px 14px', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <MapPin size={13} color="#42623C" style={{ flexShrink: 0 }}/>
                <p style={{ color: '#42623C', fontSize: '12px', fontWeight: 500 }}>{address}</p>
              </div>

              <p style={{ color: '#6F6D65', fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '10px' }}>
                Select hospital
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {hospitals.map((h, i) => (
                  <motion.button
                    key={i}
                    whileTap={{ scale: 0.98 }}
                    transition={spring}
                    onClick={() => setSelectedHospital(h)}
                    style={{
                      background: selectedHospital?.id === h.id ? 'rgba(86,128,78,0.10)' : '#FFFFFF',
                      border: `1px solid ${selectedHospital?.id === h.id ? 'rgba(86,128,78,0.35)' : '#F2F0E8'}`,
                      borderRadius: '14px', padding: '14px', textAlign: 'left', cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}
                  >
                    <div>
                      <p style={{ color: '#141413', fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>{h.name}</p>
                      <p style={{ color: '#6F6D65', fontSize: '11px' }}>{h.address}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                      <p style={{ color: '#42623C', fontWeight: 700, fontSize: '14px', fontFamily: 'var(--font-mono, monospace)' }}>
                        {Math.round((h.distance || 0) / 1000 / 50 * 60)} min
                      </p>
                      <p style={{ color: '#6F6D65', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)' }}>
                        {((h.distance || 0) / 1000).toFixed(1)} km
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                transition={spring}
                onClick={submitRequest}
                disabled={!selectedHospital || loading}
                style={{
                  width: '100%',
                  background: selectedHospital ? '#A33417' : '#F2F0E8',
                  color: selectedHospital ? 'white' : '#6F6D65',
                  fontWeight: 700, fontSize: '15px', padding: '15px', borderRadius: '14px', border: 'none',
                  cursor: selectedHospital ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: selectedHospital ? '0 6px 20px rgba(163,52,23,0.45)' : 'none'
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
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(86,128,78,0.10)', border: '2px solid rgba(86,128,78,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}
              >
                <Car size={32} color="#42623C"/>
              </motion.div>
              <h2 style={{ color: '#141413', fontWeight: 700, fontSize: '22px', marginBottom: '8px', letterSpacing: '-0.4px' }}>Finding a driver</h2>
              <p style={{ color: '#5C5A52', fontSize: '14px', marginBottom: '32px', lineHeight: 1.6 }}>
                Nearby community members are being notified. Someone will accept your request shortly.
              </p>
              <div style={{ background: '#FFFFFF', border: '1px solid #98C890', borderRadius: '16px', padding: '16px', textAlign: 'left', marginBottom: '24px' }}>
                <p style={{ color: '#6F6D65', fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>Request details</p>
                <p style={{ color: '#141413', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>{request?.hospital_name}</p>
                <p style={{ color: '#5C5A52', fontSize: '12px' }}>{request?.pickup_address}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {[0, 0.3, 0.6].map((delay, i) => (
                  <motion.div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#42623C' }} animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity, delay }}/>
                ))}
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                transition={spring}
                onClick={async () => {
                  if (!request?.id) return
                  await supabase.from('transport_requests')
                    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
                    .eq('id', request.id)
                  toast.success('Request cancelled')
                  setStep('type')
                  setRequest(null)
                }}
                style={{ marginTop: '24px', background: '#F2F0E8', border: '1px solid #D8D4C8', borderRadius: '12px', padding: '12px 24px', color: '#5C5A52', fontSize: '13px', cursor: 'pointer', width: '100%' }}
              >
                Cancel request
              </motion.button>
            </motion.div>
          )}

          {/* Step 5 — Accepted */}
          {step === 'accepted' && (
            <motion.div key="accepted" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div style={{ background: 'rgba(86,128,78,0.06)', border: '1px solid rgba(86,128,78,0.18)', borderRadius: '20px', padding: '24px 20px', textAlign: 'center', marginBottom: '14px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(86,128,78,0.12)', border: '1px solid rgba(86,128,78,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <CheckCircle size={26} color="#42623C"/>
                </div>
                <p style={{ color: '#42623C', fontWeight: 700, fontSize: '20px', marginBottom: '4px', letterSpacing: '-0.3px' }}>Driver found</p>
                <p style={{ color: '#5C5A52', fontSize: '13px' }}>They are on their way to you</p>
              </div>
              <div style={{ background: '#FFFFFF', border: '1px solid #98C890', borderRadius: '16px', padding: '16px', marginBottom: '10px' }}>
                <p style={{ color: '#6F6D65', fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>Your driver</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(86,128,78,0.10)', border: '1px solid rgba(86,128,78,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#42623C', fontWeight: 700, fontSize: '18px', flexShrink: 0 }}>
                    {request?.driver_name?.[0]}
                  </div>
                  <div>
                    <p style={{ color: '#141413', fontWeight: 600, fontSize: '16px', letterSpacing: '-0.3px' }}>{request?.driver_name}</p>
                    <p style={{ color: '#5C5A52', fontSize: '12px' }}>Community driver</p>
                  </div>
                </div>
                {request?.driver_phone && (
                  <a
                    href={`tel:${request.driver_phone}`}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'rgba(86,128,78,0.08)', border: '1px solid rgba(86,128,78,0.16)', borderRadius: '12px', padding: '12px', color: '#42623C', fontWeight: 600, fontSize: '14px', textDecoration: 'none' }}
                  >
                    <Phone size={15}/> Call driver
                  </a>
                )}
              </div>
              <div style={{ background: '#FFFFFF', border: '1px solid #98C890', borderRadius: '16px', padding: '16px' }}>
                <p style={{ color: '#6F6D65', fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>Heading to</p>
                <p style={{ color: '#141413', fontWeight: 600, fontSize: '14px' }}>{request?.hospital_name}</p>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
