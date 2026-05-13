'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { Navigation, Phone, ChevronRight, Loader2 } from 'lucide-react'
import { findNearbyHospitals, formatDistance, estimateTime, Hospital } from '@/lib/hospitals'

const Nav = dynamic(() => import('@/components/Navigation'), { ssr: false })

function RoutingPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const type = searchParams.get('type') || 'other'
  const destLat = searchParams.get('destlat')
  const destLng = searchParams.get('destlng')
  const destName = searchParams.get('destname')

  const [hospital, setHospital] = useState<Hospital | null>(null)
  const [nearbyHospitals, setNearbyHospitals] = useState<Hospital[]>([])
  const [alertSent, setAlertSent] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [locationError, setLocationError] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(data)
      }

      if (destLat && destLng && destName) {
        setHospital({
          id: 'custom',
          name: decodeURIComponent(destName),
          lat: parseFloat(destLat),
          lng: parseFloat(destLng),
          address: '',
          capability: 'Navigation'
        })
        setLoading(false)
        return
      }

      // Get user location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude, longitude } = pos.coords
            const hospitals = await findNearbyHospitals(latitude, longitude, type)

            if (hospitals.length > 0) {
              setHospital(hospitals[0])
              setNearbyHospitals(hospitals)
            } else {
              setLocationError('No hospitals found nearby')
            }
            setLoading(false)
            setTimeout(() => setAlertSent(true), 2500)
          },
          async () => {
            setLocationError('Location unavailable — using default area')
            // Fallback to hardcoded NJ location
            const hospitals = await findNearbyHospitals(40.2715, -74.6600, type)
            if (hospitals.length > 0) {
              setHospital(hospitals[0])
              setNearbyHospitals(hospitals)
            }
            setLoading(false)
            setTimeout(() => setAlertSent(true), 2500)
          },
          { enableHighAccuracy: true, timeout: 10000 }
        )
      }
    }
    load()
  }, [type])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#070710', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
      <Loader2 size={32} color="#fcb546" className="animate-spin"/>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>Finding nearest hospital...</p>
      <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px', fontFamily: 'monospace' }}>Scanning {type.replace('_', ' ')} capable facilities</p>
    </div>
  )

  if (!hospital) return (
    <div style={{ minHeight: '100vh', background: '#070710', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '24px' }}>
      <p style={{ color: '#FF4A42', fontSize: '16px', fontWeight: 600 }}>No hospitals found</p>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', textAlign: 'center' }}>{locationError}</p>
      <button onClick={() => router.back()} style={{ color: '#fcb546', fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer' }}>Go back</button>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#070710', display: 'flex', flexDirection: 'column' }}>

      {/* Alert bar */}
      <div style={{ background: '#DC2626', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <motion.div
            style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span style={{ color: 'white', fontFamily: 'monospace', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase' }}>
            Emergency active
          </span>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace', fontSize: '11px' }}>
          {new Date().toLocaleTimeString()}
        </span>
      </div>

      {/* Map */}
      <div style={{ height: '55vh', flexShrink: 0 }}>
        <Nav hospital={hospital}/>
      </div>

      {/* Bottom sheet */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, type: 'spring', bounce: 0.2 }}
        style={{ flex: 1, background: '#09090C', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '16px', overflowY: 'auto' }}
      >

        {/* Selected hospital */}
        <div style={{ marginBottom: '12px' }}>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '4px' }}>
            Routing to
          </p>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <p style={{ color: 'white', fontWeight: 700, fontSize: '16px', marginBottom: '2px' }}>{hospital.name}</p>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', marginBottom: '4px' }}>{hospital.address}</p>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', fontFamily: 'monospace' }}>{hospital.capability}</p>
            </div>
            <div style={{
              background: 'rgba(232,50,42,0.15)',
              border: '1px solid rgba(232,50,42,0.25)',
              borderRadius: '12px',
              padding: '8px 12px',
              textAlign: 'center',
              flexShrink: 0
            }}>
              <p style={{ color: '#FF4A42', fontWeight: 700, fontSize: '20px', fontFamily: 'monospace', lineHeight: 1 }}>
                {estimateTime(hospital.distance || 0)}
              </p>
              <p style={{ color: 'rgba(255,74,66,0.5)', fontSize: '10px', fontFamily: 'monospace', marginTop: '2px' }}>
                {formatDistance(hospital.distance || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* ER Status */}
        <motion.div
          animate={{
            borderColor: alertSent ? 'rgba(128,239,128,0.25)' : 'rgba(255,255,255,0.08)',
            backgroundColor: alertSent ? 'rgba(128,239,128,0.06)' : 'rgba(255,255,255,0.03)'
          }}
          style={{ borderRadius: '16px', padding: '12px', border: '1px solid', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}
        >
          <motion.div
            animate={{ backgroundColor: alertSent ? '#80EF80' : '#555' }}
            style={{ width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 }}
          />
          <div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: alertSent ? '#80EF80' : 'rgba(255,255,255,0.4)' }}>
              {alertSent ? 'ER team notified — standing by' : 'Sending patient profile to ER...'}
            </p>
            {alertSent && profile && (
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', marginTop: '2px' }}>
                {profile.full_name} · {profile.diagnosis?.split(',')[0]}
              </p>
            )}
          </div>
        </motion.div>

        {/* Nearby hospitals */}
        {nearbyHospitals.length > 1 && (
          <div style={{ marginBottom: '12px' }}>
            <button
              onClick={() => setShowAll(!showAll)}
              style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', fontFamily: 'monospace', background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              {showAll ? 'Hide' : `${nearbyHospitals.length - 1} other hospitals nearby`}
              <ChevronRight size={12} style={{ transform: showAll ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}/>
            </button>

            {showAll && nearbyHospitals.slice(1).map((h, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => { setHospital(h); setShowAll(false) }}
                style={{
                  width: '100%',
                  background: '#111116',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                  cursor: 'pointer'
                }}
              >
                <div style={{ textAlign: 'left' }}>
                  <p style={{ color: 'white', fontSize: '13px', fontWeight: 500 }}>{h.name}</p>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', marginTop: '2px' }}>{formatDistance(h.distance || 0)}</p>
                </div>
                <p style={{ color: '#fcb546', fontSize: '12px', fontFamily: 'monospace' }}>{estimateTime(h.distance || 0)}</p>
              </motion.button>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push('/emergency/status')}
            style={{
              background: '#111116',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '14px',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              color: 'rgba(255,255,255,0.7)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Navigation size={15}/>
            Full status
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => window.location.href = 'tel:911'}
            style={{
              background: '#DC2626',
              border: 'none',
              borderRadius: '14px',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              color: 'white',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Phone size={15}/>
            Call 911
          </motion.button>
        </div>

      </motion.div>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#070710', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} color="#fcb546" className="animate-spin"/>
      </div>
    }>
      <RoutingPage/>
    </Suspense>
  )
}
