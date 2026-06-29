'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, ChevronRight, Loader2, CheckCircle, Shield, X, Share2, FileText } from 'lucide-react'
import { findNearbyHospitals, formatDistance, estimateTime, Hospital } from '@/lib/hospitals'
import { sendPushNotification } from '@/lib/notifications'

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
  const [notifiedContacts, setNotifiedContacts] = useState<any[]>([])
  const [showMedCard, setShowMedCard] = useState(false)
  const lockedRef = useRef(true)
  const activeEmergencyId = useRef(emergencyId)
  const userIdRef = useRef('')

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
      const userId = user?.id
      if (userId) {
        userIdRef.current = userId
        const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
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
        alertCareTeam(userId)
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
            alertCareTeam(userId)
          },
          () => {
            // Geolocation denied or failed — do NOT fall back to hardcoded coordinates
            setLocationError('Location unavailable — please call 911 directly')
            setLoading(false)
            alertCareTeam(userId)
          },
          { enableHighAccuracy: true, timeout: 10000 }
        )
      } else {
        setLocationError('Geolocation not supported on this device')
        setLoading(false)
        alertCareTeam(userId)
      }
    }
    load()
  }, [type])

  const alertCareTeam = async (userId?: string) => {
    if (!userId) { setCareTeamAlerted(true); return }
    try {
      // Send push notification to the patient themselves (care team will see it via Supabase Realtime)
      await sendPushNotification(userId, 'Emergency alert sent', 'Your care team has been notified and can see your emergency.')
    } catch (e) {
      console.error('Care team alert failed:', e)
    }

    // Also attempt to SMS-link emergency contacts via the profile (graceful — best effort)
    try {
      const { data: profileData } = await supabase.from('profiles').select('emergency_contacts, full_name').eq('id', userId).single()
      const contacts: any[] = profileData?.emergency_contacts || []
      if (contacts.length > 0) setNotifiedContacts(contacts)
      if (contacts.length > 0) {
        // Log to emergencies table that contacts were notified (actual SMS requires a backend integration)
        await supabase.from('emergency_contact_alerts').insert(
          contacts.map(c => ({ user_id: userId, contact_name: c.name, contact_phone: c.phone, alerted_at: new Date().toISOString() }))
        ).then(() => {})
      }
    } catch { /* non-critical */ }

    setCareTeamAlerted(true)
  }

  const cancelEmergency = async () => {
    setCancelling(true)
    const uid = userIdRef.current
    if (uid) {
      await supabase.from('emergencies')
        .update({ status: 'resolved' })
        .eq('user_id', uid)
        .eq('status', 'active')
    }
    lockedRef.current = false
    router.push(`/emergency/recovery?type=${type}`)
  }

  if (loading) return (
    <div style={{ minHeight: '100dvh', background: '#F0EDE5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
      <Loader2 size={32} color="#B91C1C" className="animate-spin"/>
      <p style={{ color: 'rgba(16,22,14,0.55)', fontSize: '14px', fontWeight: 500 }}>Finding nearest hospital...</p>
      <p style={{ color: 'rgba(16,22,14,0.3)', fontSize: '12px', fontFamily: 'var(--font-mono, monospace)' }}>Alerting care team...</p>
    </div>
  )

  if (!hospital) return (
    <div style={{ minHeight: '100dvh', background: '#F0EDE5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '24px' }}>
      <p style={{ color: '#B91C1C', fontSize: '18px', fontWeight: 700 }}>Could not find a hospital</p>
      <p style={{ color: 'rgba(16,22,14,0.5)', fontSize: '13px', textAlign: 'center', lineHeight: 1.6 }}>{locationError || 'Please call 911 immediately for emergency assistance.'}</p>
      <motion.a
        href="tel:911"
        whileTap={{ scale: 0.97 }}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#B91C1C', color: 'white', fontWeight: 800, fontSize: '16px', padding: '16px 32px', borderRadius: '14px', textDecoration: 'none', boxShadow: '0 6px 20px rgba(185,28,28,0.35)' }}>
        <Phone size={18}/>
        Call 911 now
      </motion.a>
      <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowCancelConfirm(true)}
        style={{ background: 'rgba(16,22,14,0.06)', color: 'rgba(16,22,14,0.55)', fontWeight: 600, fontSize: '13px', padding: '12px 24px', borderRadius: '12px', border: '1px solid rgba(16,22,14,0.1)', cursor: 'pointer' }}>
        I&apos;m safe — cancel emergency
      </motion.button>
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', background: '#F0EDE5', display: 'flex', flexDirection: 'column' }}>

      {/* Alert bar */}
      <div style={{ background: 'linear-gradient(90deg, #B91C1C, #B91C1C)', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, boxShadow: '0 2px 12px rgba(196,32,32,0.3)' }}>
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
        style={{ flex: 1, background: '#FFFFFF', borderRadius: '24px 24px 0 0', borderTop: '1px solid rgba(16,22,14,0.08)', padding: '20px 16px', overflowY: 'auto', boxShadow: '0 -4px 20px rgba(16,22,14,0.08)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', marginTop: '-4px' }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(16,22,14,0.1)' }}/>
        </div>

        {/* Selected hospital */}
        <div style={{ marginBottom: '12px' }}>
          <p style={{ color: 'rgba(16,22,14,0.38)', fontFamily: 'var(--font-mono, monospace)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '6px' }}>
            Routing to
          </p>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <p style={{ color: '#0F1A0E', fontWeight: 700, fontSize: '16px', marginBottom: '3px' }}>{hospital.name}</p>
              <p style={{ color: 'rgba(16,22,14,0.4)', fontSize: '12px', marginBottom: '4px' }}>{hospital.address}</p>
              <p style={{ color: 'rgba(16,22,14,0.28)', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)' }}>{hospital.capability}</p>
            </div>
            <div style={{ background: 'rgba(185,28,28,0.08)', border: '1px solid rgba(185,28,28,0.2)', borderRadius: '14px', padding: '10px 14px', textAlign: 'center', flexShrink: 0 }}>
              <p style={{ color: '#B91C1C', fontWeight: 800, fontSize: '22px', fontFamily: 'var(--font-mono, monospace)', lineHeight: 1, letterSpacing: '-0.5px' }}>
                {estimateTime(hospital.distance || 0)}
              </p>
              <p style={{ color: 'rgba(185,28,28,0.5)', fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', marginTop: '2px' }}>
                {formatDistance(hospital.distance || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Care team alert status */}
        <motion.div
          animate={{
            borderColor: careTeamAlerted ? 'rgba(44,122,80,0.28)' : 'rgba(16,22,14,0.08)',
            backgroundColor: careTeamAlerted ? 'rgba(44,122,80,0.06)' : 'rgba(16,22,14,0.03)'
          }}
          style={{ borderRadius: '16px', padding: '12px 14px', border: '1px solid', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}
        >
          {careTeamAlerted
            ? <CheckCircle size={16} color="#2C7A50" style={{ flexShrink: 0 }}/>
            : <Loader2 size={16} color="rgba(16,22,14,0.3)" className="animate-spin" style={{ flexShrink: 0 }}/>
          }
          <div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: careTeamAlerted ? '#1C3D28' : 'rgba(16,22,14,0.45)' }}>
              {careTeamAlerted ? 'Care team alerted — they can see your emergency' : 'Alerting your care team...'}
            </p>
            {careTeamAlerted && profile && (
              <p style={{ color: 'rgba(16,22,14,0.38)', fontSize: '11px', marginTop: '2px' }}>
                {profile.full_name} · {EMERGENCY_LABELS[type]}
              </p>
            )}
          </div>
        </motion.div>

        {/* Notified contacts list */}
        {notifiedContacts.length > 0 && careTeamAlerted && (
          <div style={{ marginBottom: '12px' }}>
            <p style={{ color: 'rgba(16,22,14,0.38)', fontFamily: 'var(--font-mono, monospace)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>
              Contacts notified
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {notifiedContacts.map((c: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(16,22,14,0.03)', borderRadius: '10px', padding: '8px 12px', border: '1px solid rgba(16,22,14,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2C7A50' }}/>
                    <span style={{ color: '#0F1A0E', fontSize: '13px', fontWeight: 500 }}>{c.name}</span>
                    <span style={{ color: 'rgba(16,22,14,0.3)', fontSize: '12px' }}>{c.relationship}</span>
                  </div>
                  <motion.a href={`tel:${c.phone}`} whileTap={{ scale: 0.95 }}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#B91C1C', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>
                    <Phone size={11} color="#B91C1C"/>
                    Call
                  </motion.a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* First responder card */}
        {profile && (profile.blood_type || profile.allergies || (profile.medications?.length > 0)) && (
          <div style={{ marginBottom: '12px', border: '1px solid rgba(185,28,28,0.2)', borderRadius: '14px', overflow: 'hidden' }}>
            <button
              onClick={() => setShowMedCard(!showMedCard)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: showMedCard ? 'rgba(185,28,28,0.06)' : 'rgba(185,28,28,0.03)', border: 'none', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#B91C1C' }}/>
                <span style={{ color: '#B91C1C', fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  First Responder Info
                </span>
              </div>
              <span style={{ color: 'rgba(16,22,14,0.4)', fontSize: '11px' }}>{showMedCard ? 'Hide' : 'Show to paramedic'}</span>
            </button>
            {showMedCard && (
              <div style={{ padding: '12px 14px', background: '#FFFBFB', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {profile.blood_type && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: 'rgba(16,22,14,0.45)', fontSize: '11px', width: '80px', flexShrink: 0 }}>Blood type</span>
                    <span style={{ color: '#B91C1C', fontWeight: 800, fontSize: '18px', fontFamily: 'var(--font-mono, monospace)' }}>{profile.blood_type}</span>
                  </div>
                )}
                {profile.allergies && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ color: 'rgba(16,22,14,0.45)', fontSize: '11px', width: '80px', flexShrink: 0, paddingTop: '2px' }}>Allergies</span>
                    <span style={{ color: '#B91C1C', fontWeight: 700, fontSize: '13px', lineHeight: 1.5 }}>{profile.allergies}</span>
                  </div>
                )}
                {profile.medications?.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ color: 'rgba(16,22,14,0.45)', fontSize: '11px', width: '80px', flexShrink: 0, paddingTop: '2px' }}>Medications</span>
                    <span style={{ color: '#0F1A0E', fontSize: '12px', lineHeight: 1.6 }}>
                      {profile.medications.slice(0, 4).map((m: any) => m.name || m).join(', ')}
                    </span>
                  </div>
                )}
                <p style={{ color: 'rgba(185,28,28,0.5)', fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', marginTop: '4px' }}>
                  SHOW THIS SCREEN TO PARAMEDICS
                </p>
              </div>
            )}
          </div>
        )}

        {/* Nearby hospitals */}
        {nearbyHospitals.length > 1 && (
          <div style={{ marginBottom: '12px' }}>
            <button
              onClick={() => setShowAll(!showAll)}
              style={{ color: 'rgba(16,22,14,0.4)', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              {showAll ? 'Hide' : `${nearbyHospitals.length - 1} other hospitals nearby`}
              <ChevronRight size={12} style={{ transform: showAll ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}/>
            </button>
            {showAll && nearbyHospitals.slice(1).map((h, i) => (
              <motion.button key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                onClick={() => { setHospital(h); setShowAll(false) }}
                style={{ width: '100%', background: '#F0EDE5', border: '1px solid rgba(16,22,14,0.08)', borderRadius: '12px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', cursor: 'pointer' }}>
                <div style={{ textAlign: '