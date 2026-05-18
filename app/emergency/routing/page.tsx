'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, ChevronRight, Loader2, CheckCircle, Shield, X } from 'lucide-react'
import { findNearbyHospitals, formatDistance, estimateTime, Hospital } from '@/lib/hospitals'

const Nav = dynamic(() => import('@/components/Navigation'), { ssr: false })

const EMERGENCY_LABELS: Record<string, string> = {
  chest_pain: 'Chest pain',
  unconscious: 'Unconscious',
  breathing: "Can't breathe",
  pots: 'POTS episode',
  stroke: 'Stroke signs',
  mecfs: 'Severe crash',
  other: 'Emergency',
}

function RoutingPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const type = searchParams.get('type') || 'other'
  const emergencyId = searchParams.get('id') || ''
  const destLat = searchParams.get('destlat')
  const destLng = searchParams.get('destlng')
  const destName = searchParams.get('destname')

  const [hospital, setHospital] = useState<Hospital | null>(null)
  const [nearbyHospitals, setNearbyHospitals] = useState<Hospital[]>([])
  const [careTeamAlerted, setCareTeamAlerted] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const lockedRef = useRef(true)
  const activeEmergencyId = useRef(emergencyId)

  // Lock the page — prevent back navigation
  useEffect(() => {
    window.history.pushState(null, '', window.location.href)
    const onPop = () => {
      if (lockedRef.current) {
        window.history.pushState(null, '', window.location.href)
      }
    }
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (lockedRef.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('popstate', onPop)
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [])

  // If no emergency ID was passed (direct navigation), look up the active one
  useEffect(() => {
    const resolveEmergencyId = async () => {
      if (activeEmergencyId.current) return
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('emergencies')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (data) activeEmergencyId.current = data.id
    }
    resolveEmergencyId()
  }, [])

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
        setTimeout(() => setCareTeamAlerted(true), 1500)
        return
      }

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
            setTimeout(() => setCareTeamAlerted(true), 1800)
          },
          async () => {
            setLocationError('Location unavailable — using default area')
            const hospitals = await findNearbyHospitals(40.2715, -74.6600, type)
            if (hospitals.length > 0) {
              setHospital(hospitals[0])
              setNearbyHospitals(hospitals)
            }
            setLoading(false)
            setTimeout(() => setCareTeamAlerted(true), 1800)
          },
          { enableHighAccuracy: true, timeout: 10000 }
        )
      } else {
        setLoading(false)
        setTimeout(() => setCareTeamAlerted(true), 1500)
      }
    }
    load()
  }, [type])

  const cancelEmergency = async () => {
    setCancelling(true)
    // Always cancel ALL active emergencies for this user — not just one by ID.
    // This prevents an infinite loop if multiple rows were created accidentally.
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('emergencies')
        .update({ status: 'resolved' })
        .eq('user_id', user.id)
        .eq('status', 'active')
    }
    lockedRef.current = false
    router.push('/dashboard')
  }

  if (loading) return (
    <div style={{ minHeight: '100dvh', background: '#F2EFE9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
      <Loader2 size={32} color="#DC2626" className="animate-spin"/>
      <p style={{ color: 'rgba(26,40,32,0.55)', fontSize: '14px', fontWeight: 500 }}>Finding nearest hospital...</p>
      <p style={{ color: 'rgba(26,40,32,0.3)', fontSize: '12px', fontFamily: 'var(--font-mono, monospace)' }}>Alerting care team...</p>
    </div>
  )

  if (!hospital) return (
    <div style={{ minHeight: '100dvh', background: '#F2EFE9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '24px' }}>
      <p style={{ color: '#DC2626', fontSize: '16px', fontWeight: 600 }}>No hospitals found</p>
      <p style={{ color: 'rgba(26,40,32,0.45)', fontSize: '13px', textAlign: 'center' }}>{locationError}</p>
      <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowCancelConfirm(true)}
        style={{ background: '#DC2626', color: 'white', fontWeight: 700, fontSize: '14px', padding: '14px 28px', borderRadius: '14px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(220,38,38,0.3)' }}>
        Cancel Emergency
      </motion.button>
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', background: '#F2EFE9', display: 'flex', flexDirection: 'column' }}>

      {/* Alert bar */}
      <div style={{ background: 'linear-gradient(90deg, #C42020, #E8322A)', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, boxShadow: '0 2px 12px rgba(196,32,32,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <motion.div
            style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span style={{ color: 'white', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700 }}>
            Emergency active — {EMERGENCY_LABELS[type] || 'Emergency'}
          </span>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px' }}>
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Map */}
      <div style={{ height: '52vh', flexShrink: 0 }}>
        <Nav hospital={hospital}/>
      </div>

      {/* Bottom sheet */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, type: 'spring', bounce: 0.2 }}
        style={{ flex: 1, background: '#FFFFFF', borderRadius: '24px 24px 0 0', borderTop: '1px solid rgba(26,40,32,0.08)', padding: '20px 16px', overflowY: 'auto', boxShadow: '0 -4px 20px rgba(26,40,32,0.08)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', marginTop: '-4px' }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(26,40,32,0.1)' }}/>
        </div>

        {/* Selected hospital */}
        <div style={{ marginBottom: '12px' }}>
          <p style={{ color: 'rgba(26,40,32,0.38)', fontFamily: 'var(--font-mono, monospace)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '6px' }}>
            Routing to
          </p>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <p style={{ color: '#1A2820', fontWeight: 700, fontSize: '16px', marginBottom: '3px' }}>{hospital.name}</p>
              <p style={{ color: 'rgba(26,40,32,0.4)', fontSize: '12px', marginBottom: '4px' }}>{hospital.address}</p>
              <p style={{ color: 'rgba(26,40,32,0.28)', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)' }}>{hospital.capability}</p>
            </div>
            <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '14px', padding: '10px 14px', textAlign: 'center', flexShrink: 0 }}>
              <p style={{ color: '#DC2626', fontWeight: 800, fontSize: '22px', fontFamily: 'var(--font-mono, monospace)', lineHeight: 1, letterSpacing: '-0.5px' }}>
                {estimateTime(hospital.distance || 0)}
              </p>
              <p style={{ color: 'rgba(220,38,38,0.5)', fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', marginTop: '2px' }}>
                {formatDistance(hospital.distance || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Care team alert status */}
        <motion.div
          animate={{
            borderColor: careTeamAlerted ? 'rgba(92,139,116,0.28)' : 'rgba(26,40,32,0.08)',
            backgroundColor: careTeamAlerted ? 'rgba(92,139,116,0.06)' : 'rgba(26,40,32,0.03)'
          }}
          style={{ borderRadius: '16px', padding: '12px 14px', border: '1px solid', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}
        >
          {careTeamAlerted
            ? <CheckCircle size={16} color="#5C8B74" style={{ flexShrink: 0 }}/>
            : <Loader2 size={16} color="rgba(26,40,32,0.3)" className="animate-spin" style={{ flexShrink: 0 }}/>
          }
          <div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: careTeamAlerted ? '#3D6B58' : 'rgba(26,40,32,0.45)' }}>
              {careTeamAlerted ? 'Care team alerted — they can see your emergency' : 'Alerting your care team...'}
            </p>
            {careTeamAlerted && profile && (
              <p style={{ color: 'rgba(26,40,32,0.38)', fontSize: '11px', marginTop: '2px' }}>
                {profile.full_name} · {EMERGENCY_LABELS[type]}
              </p>
            )}
          </div>
        </motion.div>

        {/* Nearby hospitals */}
        {nearbyHospitals.length > 1 && (
          <div style={{ marginBottom: '12px' }}>
            <button
              onClick={() => setShowAll(!showAll)}
              style={{ color: 'rgba(26,40,32,0.4)', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              {showAll ? 'Hide' : `${nearbyHospitals.length - 1} other hospitals nearby`}
              <ChevronRight size={12} style={{ transform: showAll ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}/>
            </button>
            {showAll && nearbyHospitals.slice(1).map((h, i) => (
              <motion.button key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                onClick={() => { setHospital(h); setShowAll(false) }}
                style={{ width: '100%', background: '#F8F6F2', border: '1px solid rgba(26,40,32,0.08)', borderRadius: '12px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', cursor: 'pointer' }}>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ color: '#1A2820', fontSize: '13px', fontWeight: 500 }}>{h.name}</p>
                  <p style={{ color: 'rgba(26,40,32,0.35)', fontSize: '11px', marginTop: '2px' }}>{formatDistance(h.distance || 0)}</p>
                </div>
                <p style={{ color: '#5C8B74', fontSize: '12px', fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}>{estimateTime(h.distance || 0)}</p>
              </motion.button>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => window.location.href = 'tel:911'}
            style={{ background: '#DC2626', border: 'none', borderRadius: '14px', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'white', fontSize: '13px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(220,38,38,0.3)' }}>
            <Phone size={15}/>
            Call 911
          </motion.button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowCancelConfirm(true)}
            style={{ background: '#F8F6F2', border: '1.5px solid rgba(26,40,32,0.12)', borderRadius: '14px', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'rgba(26,40,32,0.65)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            <Shield size={15}/>
            I&apos;m safe
          </motion.button>
        </div>
      </motion.div>

      {/* Cancel confirmation overlay */}
      <AnimatePresence>
        {showCancelConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(26,40,32,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              style={{ background: '#FFFFFF', borderRadius: '28px 28px 0 0', width: '100%', padding: '24px 20px 48px' }}
            >
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(26,40,32,0.1)', margin: '0 auto 24px' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(92,139,116,0.1)', border: '2px solid rgba(92,139,116,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Shield size={22} color="#5C8B74"/>
                </div>
                <div>
                  <p style={{ color: '#1A2820', fontWeight: 800, fontSize: '20px', letterSpacing: '-0.5px' }}>Are you safe?</p>
                  <p style={{ color: 'rgba(26,40,32,0.45)', fontSize: '13px', marginTop: '2px' }}>This will cancel the emergency alert</p>
                </div>
              </div>
              <p style={{ color: 'rgba(26,40,32,0.5)', fontSize: '13px', lineHeight: 1.6, marginBottom: '24px' }}>
                Cancelling will notify your care team that the emergency has ended. Only cancel if you are genuinely safe.
              </p>
              <motion.button whileTap={{ scale: 0.97, y: 1 }} onClick={cancelEmergency} disabled={cancelling}
                style={{ width: '100%', background: 'linear-gradient(135deg, #5C8B74, #3D6B58)', color: 'white', fontWeight: 800, fontSize: '16px', padding: '18px', borderRadius: '16px', border: 'none', cursor: 'pointer', boxShadow: '0 8px 28px rgba(92,139,116,0.3)', marginBottom: '10px' }}>
                {cancelling ? 'Cancelling...' : 'Yes, cancel emergency'}
              </motion.button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowCancelConfirm(false)}
                style={{ width: '100%', background: 'rgba(26,40,32,0.04)', color: 'rgba(26,40,32,0.55)', fontWeight: 700, fontSize: '15px', padding: '16px', borderRadius: '14px', border: '1.5px solid rgba(26,40,32,0.08)', cursor: 'pointer' }}>
                Stay on emergency
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100dvh', background: '#F2EFE9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} color="#DC2626" className="animate-spin"/>
      </div>
    }>
      <RoutingPage/>
    </Suspense>
  )
}
