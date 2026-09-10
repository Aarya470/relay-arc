'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, ChevronRight, Loader2, CheckCircle, AlertTriangle, Shield, X, Share2, FileText, MessageSquare, Navigation2 } from 'lucide-react'
import { findNearbyHospitals, formatDistance, estimateTime, etaText, trafficLabel, formatEtaMin, fresh, trafficMultiplier, Hospital } from '@/lib/hospitals'
import { sendPushNotification } from '@/lib/notifications'
import { toast } from 'sonner'
import qrgen from 'qrcode-generator'
import { emergencyNumber } from '@/lib/emergency-number'
import { DEMO, demoOn } from '@/lib/demo'

const Nav = dynamic(() => import('@/components/Navigation'), { ssr: false })
const GuardianWatch = dynamic(() => import('@/components/GuardianWatch'), { ssr: false })

function directionsUrl(h: Hospital) {
  return `https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}&travelmode=driving`
}

function buildSmsHref(contacts: any[], hospital: Hospital | null, emergencyType: string) {
  const phones = contacts.map((c: any) => c.phone).filter(Boolean).join(',')
  if (!phones) return '#'
  const typeLabels: Record<string, string> = {
    chest_pain: 'a chest pain emergency',
    unconscious: 'an emergency (unconscious)',
    breathing: 'a breathing emergency',
    pots: 'a POTS episode',
    stroke: 'possible stroke symptoms',
    mecfs: 'a severe ME/CFS crash',
    other: 'a medical emergency',
  }
  const typeLabel = typeLabels[emergencyType] || 'a medical emergency'
  const hospitalText = hospital
    ? `They are being routed to ${hospital.name}. Directions: ${directionsUrl(hospital)}`
    : 'They are getting emergency help now.'
  const msg = `URGENT: I am having ${typeLabel} and need emergency help. ${hospitalText} Please call 911 or come to the hospital.`
  return `sms:${phones}?body=${encodeURIComponent(msg)}`
}

const EMERGENCY_LABELS: Record<string, string> = {
  chest_pain: 'Chest pain',
  unconscious: 'Unconscious',
  breathing: "Can't breathe",
  pots: 'POTS episode',
  stroke: 'Stroke signs',
  mecfs: 'Severe crash',
  other: 'Emergency',
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg:          '#B3DDAC',
  card:        '#FFFFFF',
  card2:       '#FFFFFF',
  border:      '#F2F0E8',
  textPrimary: '#141413',
  textSec:     '#5C5A52',
  textMuted:   '#6F6D65',
  red:         '#A33417',
  redSoft:     'rgba(163,52,23,0.12)',
  redGlow:     'none',
  green:       '#42623C',
  greenSoft:   'rgba(86,128,78,0.12)',
  blue:        '#42623C',
  blueSoft:    'rgba(86,128,78,0.12)',
  amber:       '#A87200',
} as const

// ─── Cancel confirm sheet — shared between error and main view ─────────────────
function CancelConfirmSheet({
  show,
  cancelling,
  onKeep,
  onConfirm,
}: {
  show: boolean
  cancelling: boolean
  onKeep: () => void
  onConfirm: () => void
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(20,20,19,0.45)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'flex-end',
          }}
          onClick={e => { if (e.target === e.currentTarget) onKeep() }}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            style={{
              background: T.card,
              borderRadius: '24px 24px 0 0',
              border: `1px solid ${T.border}`,
              borderBottom: 'none',
              padding: '28px 20px 52px',
              width: '100%',
            }}
          >
            <p style={{
              color: T.textPrimary,
              fontWeight: 800,
              fontSize: '18px',
              marginBottom: '8px',
              letterSpacing: '-0.2px',
            }}>
              Cancel emergency?
            </p>
            <p style={{
              color: T.textSec,
              fontSize: '14px',
              marginBottom: '28px',
              lineHeight: 1.65,
            }}>
              Only cancel if you are safe and do not need help. This will end your active emergency.
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              {/* Keep going — ghost */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onKeep}
                style={{
                  flex: 1,
                  padding: '15px',
                  background: '#F2F0E8',
                  borderRadius: '14px',
                  border: `1px solid ${T.border}`,
                  cursor: 'pointer',
                  fontWeight: 700,
                  color: T.textPrimary,
                  fontSize: '14px',
                  letterSpacing: '0.1px',
                }}
              >
                Keep going
              </motion.button>

              {/* Yes, cancel — red */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onConfirm}
                disabled={cancelling}
                style={{
                  flex: 1,
                  padding: '15px',
                  background: `#A33417`,
                  borderRadius: '14px',
                  border: 'none',
                  cursor: cancelling ? 'default' : 'pointer',
                  fontWeight: 700,
                  color: 'white',
                  fontSize: '14px',
                  boxShadow: T.redGlow,
                  opacity: cancelling ? 0.7 : 1,
                  letterSpacing: '0.1px',
                }}
              >
                {cancelling ? 'Cancelling…' : 'Yes, cancel'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
function RoutingPage() {
  const searchParams = useSearchParams()
  const [emg, setEmg] = useState({ number: '911', label: '911' })
  useEffect(() => { setEmg(emergencyNumber()) }, [])
  const router = useRouter()
  const type = searchParams.get('type') || 'other'
  const emergencyId = searchParams.get('id') || ''
  const destLat = searchParams.get('destlat')
  const destLng = searchParams.get('destlng')
  const destName = searchParams.get('destname')

  const [hospital, setHospital] = useState<Hospital | null>(null)
  const [nearbyHospitals, setNearbyHospitals] = useState<Hospital[]>([])
  const [careTeamAlerted, setCareTeamAlerted] = useState(false)
  // Whether an emergencies row actually exists. Null while that is still being
  // worked out, so the screen never guesses in either direction.
  const [recorded, setRecorded] = useState<boolean | null>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [notifiedContacts, setNotifiedContacts] = useState<any[]>([])
  const [elapsed, setElapsed] = useState(0)
  const [navMode, setNavMode] = useState(false)
  const [roomId, setRoomId] = useState(emergencyId)
  const [showQr, setShowQr] = useState(false)
  const [patientPos, setPatientPos] = useState<[number, number] | null>(null)
  const [ride, setRide] = useState<'none' | 'dismissed' | 'searching' | 'accepted'>('none')
  const [erConnected, setErConnected] = useState('')
  const [isDemo, setIsDemo] = useState(false)
  useEffect(() => { setIsDemo(demoOn()) }, [])
  const erNotifiedFor = useRef('')
  const erIncomingId = useRef('')
  const [rideDriver, setRideDriver] = useState('')
  const rideIdRef = useRef('')
  const roomChannel = useRef<any>(null)
  const timelineRef = useRef<{ t: string; label: string }[]>([])
  const lastLocRef = useRef<any>(null)
  const lastLocSent = useRef(0)
  const hospitalRef = useRef<Hospital | null>(null)
  const lockedRef = useRef(true)
  const activeEmergencyId = useRef(emergencyId)
  const userIdRef = useRef('')

  // Live elapsed timer — the number this product exists for
  useEffect(() => {
    const t0 = Date.now()
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000)
    return () => clearInterval(id)
  }, [])

  const fmtElapsed = (s: number) => `+${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const shareLive = async () => {
    const id = activeEmergencyId.current
    if (!id) { toast.error('Live link not ready yet. Try again in a moment'); return }
    const url = `${window.location.origin}/emergency/live/${id}`
    if (typeof navigator.share === 'function') {
      try { await navigator.share({ title: 'Live emergency status. Relay Arc', url }); return } catch {}
    }
    try { await navigator.clipboard.writeText(url); toast.success('Live status link copied. Send it to family') }
    catch { toast.error('Could not copy the link') }
  }

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
      if (data) { activeEmergencyId.current = data.id; setRoomId(data.id) }
    }
    resolveEmergencyId()
  }, [])

  useEffect(() => { hospitalRef.current = hospital }, [hospital])

  // ── Relay Room: broadcast location + events to family in realtime ──────────
  const pushEvt = (label: string) => {
    const e = { t: new Date().toISOString(), label }
    timelineRef.current = [...timelineRef.current.slice(-29), e]
    try { roomChannel.current?.send({ type: 'broadcast', event: 'evt', payload: e }) } catch {}
  }

  useEffect(() => {
    if (!roomId) return
    const ch = supabase.channel(`relay-room-${roomId}`, {
      config: { broadcast: { self: false }, presence: { key: `patient-${roomId.slice(0, 6)}` } },
    })
    roomChannel.current = ch
    ch.on('broadcast', { event: 'sync-req' }, () => {
      try {
        ch.send({ type: 'broadcast', event: 'sync', payload: { timeline: timelineRef.current, loc: lastLocRef.current } })
      } catch {}
    })
    ch.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        ch.track({ role: 'patient', name: 'Patient' })
        pushEvt('SOS active. Hospital routing started')
      }
    })
    let watch: number | null = null
    if (navigator.geolocation) {
      watch = navigator.geolocation.watchPosition(pos => {
        const now = Date.now()
        if (now - lastLocSent.current < 8000) return
        lastLocSent.current = now
        const h = hospitalRef.current
        const payload = {
          lat: pos.coords.latitude, lng: pos.coords.longitude, ts: now,
          hName: h?.name || '', hLat: h?.lat ?? null, hLng: h?.lng ?? null,
        }
        lastLocRef.current = payload
        try { ch.send({ type: 'broadcast', event: 'loc', payload }) } catch {}
      }, () => {}, { enableHighAccuracy: true, maximumAge: 5000 })
    }
    return () => {
      if (watch !== null) navigator.geolocation.clearWatch(watch)
      supabase.removeChannel(ch)
      roomChannel.current = null
    }
  }, [roomId])

  useEffect(() => { if (careTeamAlerted) pushEvt(recorded ? 'Emergency recorded' : 'Emergency could not be recorded') }, [careTeamAlerted, recorded])

  // ── Connected hospitals: put this patient on the ER's dispatch board ──────
  useEffect(() => {
    if (!hospital || !roomId || !careTeamAlerted) return
    if (erNotifiedFor.current === hospital.id) return
    erNotifiedFor.current = hospital.id
    setErConnected('')
    const notify = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        if (!token) return
        const res = await fetch('/api/hospital/incoming', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            hospital: { name: hospital.name, lat: hospital.lat, lng: hospital.lng },
            patientName: profile?.full_name || 'Relay patient',
            emergencyType: type,
            etaMin: formatEtaMin(hospital),
            liveUrl: `${window.location.origin}/emergency/live/${roomId}`,
          }),
        })
        const json = await res.json()
        if (json.connected) {
          setErConnected(json.partnerName || hospital.name)
          erIncomingId.current = json.incomingId || ''
          pushEvt(`${json.partnerName || 'Hospital'} ER notified. Patient on their dispatch board`)
        }
      } catch {}
    }
    notify()
  }, [hospital?.id, roomId, careTeamAlerted])
  useEffect(() => { if (navMode) pushEvt('Turn-by-turn navigation started') }, [navMode])

  // Live ETA countdown on the ER dispatch board (every 45s while en route)
  useEffect(() => {
    if (!erConnected) return
    const tick = setInterval(async () => {
      const loc = lastLocRef.current
      const h = hospitalRef.current
      if (!erIncomingId.current || !loc || !h) return
      const dLat = (h.lat - loc.lat) * Math.PI / 180
      const dLng = (h.lng - loc.lng) * Math.PI / 180
      const a = Math.sin(dLat/2)**2 + Math.cos(loc.lat*Math.PI/180) * Math.cos(h.lat*Math.PI/180) * Math.sin(dLng/2)**2
      const meters = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
      const etaMin = Math.max(1, Math.round(meters / 1000 / 38 * 60 * trafficMultiplier()))
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) return
        await fetch('/api/hospital/incoming', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ id: erIncomingId.current, etaMin }),
        })
      } catch {}
    }, 45000)
    return () => clearInterval(tick)
  }, [erConnected])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id
      if (userId) {
        userIdRef.current = userId
        try {
          const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
          if (data) {
            setProfile(data)
            try { localStorage.setItem('relay_offline_profile', JSON.stringify(data)) } catch {}
          } else { throw new Error('no data') }
        } catch {
          try {
            const cached = localStorage.getItem('relay_offline_profile')
            if (cached) setProfile(JSON.parse(cached))
          } catch {}
        }
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

      // Demo mode: fixed origin + seeded cardiac centres, no GPS required
      if (demoOn()) {
        const [dLat, dLng] = DEMO.origin
        setPatientPos([dLat, dLng])
        const seeded = DEMO.hospitals.map(h => ({
          ...h,
          distance: Math.round(Math.hypot((h.lat - dLat) * 111320, (h.lng - dLng) * 105000)),
        })) as Hospital[]
        try {
          const ranked = await findNearbyHospitals(dLat, dLng, type)
          const byName = new Map(ranked.map(r => [r.name, r]))
          const merged = seeded.map(h => ({ ...h, ...(byName.get(h.name) || {}) })) as Hospital[]
          setHospital(merged[0]); setNearbyHospitals(merged)
        } catch {
          setHospital(seeded[0]); setNearbyHospitals(seeded)
        }
        setLoading(false)
        alertCareTeam(userId)
        return
      }

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude, longitude } = pos.coords
            setPatientPos([latitude, longitude])
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
            setLocationError('Location unavailable. Please call emergency services directly')
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

  // WHAT THIS USED TO CLAIM, AND WHY IT WAS THE WORST BUG IN THE APP
  //
  // It ran setCareTeamAlerted(true) no matter what happened, including the very
  // first line, where there is no signed-in user at all and therefore nothing to
  // alert anybody about. The screen then showed a green tick and the sentence
  // "Your emergency is visible to your care team".
  //
  // Almost none of that was reliably true:
  //   - The push call returns 404 "No subscription found" unless the person has
  //     already granted notification permission and registered a subscription.
  //     For most people it has never succeeded once. sendPushNotification logs
  //     the failure and swallows it, so the caller never learned.
  //   - The emergency_contact_alerts rows are only written when the profile
  //     actually holds contacts, and writing a row is not sending anything. The
  //     comment in the old code said so and the screen said otherwise.
  //   - The one thing that is genuinely true is that the emergencies row was
  //     inserted on the previous screen, so a care team member who has Relay Arc
  //     open sees it over Realtime. That is a record existing, not a person
  //     having been reached.
  //
  // Someone having a cardiac event reads a green tick as "help knows". That is a
  // reason to sit still and wait. This now reports only what happened, and the
  // one instruction that is always right stays on screen either way.
  const alertCareTeam = async (userId?: string) => {
    // The previous screen puts the inserted emergency id in the query string and
    // leaves it empty when the insert failed or nobody was signed in. That is
    // the only evidence here that a record exists at all.
    setCareTeamAlerted(true)
    if (!emergencyId) { setRecorded(false); return }
    setRecorded(true)
    if (!userId) return
    try {
      // Best effort. It reaches the person's own devices if any of them are
      // subscribed, and does nothing at all if none are.
      await sendPushNotification(userId, 'Emergency recorded', 'Your emergency is showing on your care team dashboard.')
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

  // ── SOS ride dispatch — the mission's core case: no vehicle, no ambulance ──
  const requestRide = async () => {
    if (!patientPos || !hospital) return
    setRide('searching')
    try {
      const { data, error } = await supabase.from('transport_requests').insert({
        user_id: userIdRef.current || undefined,
        patient_name: profile?.full_name || 'Relay patient',
        pickup_lat: patientPos[0],
        pickup_lng: patientPos[1],
        pickup_address: 'Live GPS location via Relay SOS',
        hospital_name: hospital.name,
        hospital_lat: hospital.lat,
        hospital_lng: hospital.lng,
        emergency_type: type,
        status: 'pending',
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      }).select().single()
      if (error || !data) throw error
      rideIdRef.current = data.id
      pushEvt('Community driver requested. Searching nearby')
    } catch {
      setRide('none')
      toast.error('Could not request a ride. Ask family or call an ambulance')
    }
  }

  const cancelRide = async () => {
    setRide('dismissed')
    if (rideIdRef.current) {
      try {
        await supabase.from('transport_requests')
          .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
          .eq('id', rideIdRef.current)
      } catch {}
    }
  }

  useEffect(() => {
    if (ride !== 'searching' || !rideIdRef.current) return
    const poll = setInterval(async () => {
      try {
        const { data } = await supabase.from('transport_requests')
          .select('status, driver_name')
          .eq('id', rideIdRef.current)
          .single()
        if (data && (data.status === 'accepted' || data.driver_name)) {
          setRide('accepted')
          setRideDriver(data.driver_name || 'A community driver')
          pushEvt(`Driver ${data.driver_name || 'accepted'}. On their way to the patient`)
          try { navigator.vibrate?.([200, 100, 200]) } catch {}
        }
      } catch {}
    }, 5000)
    return () => clearInterval(poll)
  }, [ride])

  const cancelEmergency = async () => {
    setCancelling(true)
    // Local escape hatch FIRST: even if the server write fails, the dashboard
    // must respect the user's explicit cancel and never bounce them back here.
    try { sessionStorage.setItem('relay_user_cancelled_until', String(Date.now() + 20 * 60 * 1000)) } catch {}
    let serverConfirmed = false
    try {
      let uid = userIdRef.current
      if (!uid) {
        const { data: { user } } = await supabase.auth.getUser()
        uid = user?.id || ''
      }
      if (uid) {
        const { error } = await supabase.from('emergencies')
          .update({ status: 'resolved' })
          .eq('user_id', uid)
          .eq('status', 'active')
        if (error) throw error
        // Verify the rows actually flipped — a missing RLS UPDATE policy
        // makes the update silently affect zero rows.
        const { data: still } = await supabase.from('emergencies')
          .select('id').eq('user_id', uid).eq('status', 'active').limit(1)
        serverConfirmed = !still || still.length === 0
      } else {
        serverConfirmed = true // nothing to resolve without a user
      }
    } catch { /* fall through — user still leaves */ }

    if (!serverConfirmed) {
      toast.error('Cancelled on this device, but the server did not confirm. Your care team may still see it as active.')
    }
    pushEvt('Emergency cancelled. Patient reports safe')
    if (erIncomingId.current) {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          fetch('/api/hospital/incoming', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ id: erIncomingId.current, status: 'cancelled' }),
          })
        }
      } catch {}
    }
    lockedRef.current = false
    router.replace('/dashboard')
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{
      minHeight: '100dvh',
      background: T.bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '24px',
    }}>
      {/* Spinner with soft red glow halo */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          position: 'absolute',
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: T.redSoft,
          filter: 'blur(12px)',
        }} />
        <Loader2 size={38} color={T.red} className="animate-spin" style={{ position: 'relative' }} />
      </div>

      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <p style={{
          color: T.textPrimary,
          fontSize: '16px',
          fontWeight: 700,
          letterSpacing: '-0.2px',
        }}>
          Finding nearest hospital
        </p>
        <p style={{
          color: T.textMuted,
          fontSize: '12px',
          fontFamily: 'var(--font-mono, monospace)',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
        }}>
          Recording this emergency…
        </p>
      </div>

      {/* The call button belongs on this screen too.
          Finding a hospital waits on the browser location prompt, and the
          getCurrentPosition timeout is ten seconds, so someone who has just
          tapped "chest pain" can sit in front of a spinner for that long. The
          screen before this one leads with a full width call button and the
          screen after it has one. Taking it away in between, during the exact
          part of the flow where the app is doing nothing visible, is the worst
          possible moment to hide it. Timed in the browser with location
          blocked: ten seconds of spinner and no way to call. */}
      <motion.a
        href={`tel:${emg.number}`}
        whileTap={{ scale: 0.98 }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
          background: T.red, color: 'white',
          padding: '20px', borderRadius: '14px',
          fontWeight: 900, fontSize: '20px', letterSpacing: '-0.3px',
          textDecoration: 'none', minHeight: '64px',
          width: 'calc(100% - 40px)', maxWidth: '480px',
        }}
      >
        <Phone size={22} color="white" />
        Call {emg.label} now
      </motion.a>
    </div>
  )

  // ── Error state (no hospital found) ───────────────────────────────────────
  if (!hospital) return (
    <div style={{
      minHeight: '100dvh',
      background: T.bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '20px',
      padding: '32px 24px',
    }}>
      {/* Red phone icon in glowing circle */}
      <div style={{
        width: '72px',
        height: '72px',
        borderRadius: '50%',
        background: T.redSoft,
        border: `1px solid rgba(163,52,23,0.25)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: T.redGlow,
      }}>
        <Phone size={30} color={T.red} />
      </div>

      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <p style={{
          color: T.red,
          fontSize: '20px',
          fontWeight: 800,
          letterSpacing: '-0.3px',
        }}>
          Could not find a hospital
        </p>
        <p style={{
          color: T.textSec,
          fontSize: '14px',
          lineHeight: 1.7,
          maxWidth: '280px',
        }}>
          {locationError || 'Please call 911 immediately for emergency assistance.'}
        </p>
      </div>

      {/* Call {emg.label} — red gradient pill with glow */}
      <motion.a
        href={`tel:${emg.number}`}
        whileTap={{ scale: 0.96 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          background: `#A33417`,
          color: 'white',
          fontWeight: 800,
          fontSize: '17px',
          padding: '17px 0',
          borderRadius: '16px',
          textDecoration: 'none',
          boxShadow: T.redGlow,
          width: '100%',
          maxWidth: '320px',
          letterSpacing: '0.2px',
        }}
      >
        <Phone size={20} strokeWidth={2.5} />
        Call {emg.label} now
      </motion.a>

      {/* Cancel ghost */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setShowCancelConfirm(true)}
        style={{
          background: '#F2F0E8',
          color: T.textMuted,
          fontWeight: 500,
          fontSize: '13px',
          padding: '11px 24px',
          borderRadius: '12px',
          border: `1px solid #98C890`,
          cursor: 'pointer',
        }}
      >
        I&apos;m safe, cancel this emergency
      </motion.button>

      <CancelConfirmSheet
        show={showCancelConfirm}
        cancelling={cancelling}
        onKeep={() => setShowCancelConfirm(false)}
        onConfirm={cancelEmergency}
      />
    </div>
  )

  // ── Main routing view ──────────────────────────────────────────────────────
  const MONO = 'var(--font-mono, monospace)'
  return (
    <div style={{ minHeight: '100dvh', background: '#B3DDAC', display: 'flex', flexDirection: 'column', overflowX: 'hidden', maxWidth: '640px', margin: '0 auto', width: '100%' }}>

      {/* ── Status line ─────────────────────────────────────────────────────── */}
      <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(163,52,23,0.18)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
          <motion.div
            animate={{ opacity: [1, 0.25, 1] }}
            transition={{ duration: 1.1, repeat: Infinity }}
            style={{ width: '8px', height: '8px', background: T.red, flexShrink: 0 }}
          />
          <span style={{ color: T.red, fontFamily: MONO, fontSize: '10.5px', letterSpacing: '1.6px', textTransform: 'uppercase', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {isDemo && <span style={{ background: T.textPrimary, color: 'white', padding: '2px 6px', borderRadius: '4px', marginRight: '7px' }}>DEMO</span>}
            Active emergency · {EMERGENCY_LABELS[type] || 'Emergency'}
          </span>
        </div>
        <span style={{ color: T.red, fontFamily: MONO, fontSize: '15px', fontWeight: 700, letterSpacing: '0.5px', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
          {fmtElapsed(elapsed)}
        </span>
      </div>

      {/* ── Hospital — flat header, big numbers ─────────────────────────────── */}
      <div style={{ padding: '20px 20px 18px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: T.textMuted, fontFamily: MONO, fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '1.8px', marginBottom: '7px' }}>
              Routing to
            </p>
            <p style={{ color: T.textPrimary, fontWeight: 800, fontSize: '22px', letterSpacing: '-0.6px', lineHeight: 1.1, marginBottom: '4px' }}>
              {hospital.name}
            </p>
            {hospital.address && (
              <p style={{ color: T.textMuted, fontSize: '12.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {hospital.address}
              </p>
            )}
            {hospital.capability && (
              <p style={{ color: T.green, fontFamily: MONO, fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginTop: '8px' }}>
                ✓ {hospital.capability}
              </p>
            )}
            {hospital.partner && fresh(hospital.partner) && (
              <p style={{ color: hospital.partner.accepting ? T.green : T.red, fontFamily: MONO, fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginTop: '5px' }}>
                {hospital.partner.accepting ? '✓ Accepting now' : '⚠ Diverting'}
                {hospital.partner.cathLab === true ? ' · cath lab open' : ''}
                {hospital.partner.bedsFree != null ? ` · ${hospital.partner.bedsFree} beds` : ''}
                {'. Reported by facility'}
              </p>
            )}
            {erConnected && (
              <p style={{ color: T.green, fontSize: '12.5px', fontWeight: 700, marginTop: '7px' }}>
                ✓ {erConnected} ER is expecting you
              </p>
            )}
            <p style={{ color: T.textMuted, fontSize: '11.5px', marginTop: '7px' }}>
              Ranked first: fastest arrival{hospital.partner && fresh(hospital.partner) && hospital.partner.accepting ? ' · confirmed accepting' : ''} · {hospital.capability?.toLowerCase()}
            </p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ color: T.red, fontWeight: 800, fontSize: '38px', fontFamily: MONO, lineHeight: 0.9, letterSpacing: '-2px' }}>
              {etaText(hospital)}
            </p>
            <p style={{ color: T.textMuted, fontSize: '12px', fontFamily: MONO, marginTop: '5px' }}>
              {formatDistance(hospital.distance || 0)}
            </p>
            {hospital.etaTrafficSec != null && (
              <p style={{ color: hospital.liveTraffic ? T.green : T.amber, fontSize: '10px', fontFamily: MONO, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                {hospital.liveTraffic ? 'live traffic' : trafficLabel()}
              </p>
            )}
          </div>
        </div>

        <motion.button
          onClick={() => setNavMode(true)}
          whileTap={{ scale: 0.985 }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            width: '100%', background: T.red, color: 'white',
            padding: '17px', borderRadius: '12px', border: 'none',
            fontWeight: 800, fontSize: '16.5px', letterSpacing: '-0.2px',
            cursor: 'pointer', fontFamily: 'inherit', marginTop: '16px', minHeight: '56px',
          }}
        >
          <Navigation2 size={19} strokeWidth={2.5}/>
          Start navigation
        </motion.button>
        <a href={directionsUrl(hospital)} target="_blank" rel="noopener noreferrer"
          style={{ display: 'block', textAlign: 'center', color: T.textMuted, fontSize: '12.5px', textDecoration: 'none', padding: '10px 0 0' }}>
          Prefer Google Maps? <span style={{ textDecoration: 'underline', textUnderlineOffset: '3px' }}>Open there instead</span>
        </a>

        {/* ── Getting there — solve the vehicle, not just the destination ── */}
        {patientPos && ride !== 'dismissed' && (
          <div style={{ borderTop: `1px solid ${T.border}`, marginTop: '14px', paddingTop: '14px' }}>
            <p style={{ color: T.textMuted, fontFamily: 'var(--font-mono, monospace)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.6px', marginBottom: '10px' }}>
              Getting there
            </p>

            {ride === 'none' && (
              <div style={{ display: 'flex', gap: '9px' }}>
                <button onClick={() => setRide('dismissed')}
                  style={{ flex: 1, background: 'none', border: `1.5px solid ${T.border}`, color: T.textSec, fontWeight: 600, fontSize: '13.5px', padding: '13px 8px', borderRadius: '11px', cursor: 'pointer', fontFamily: 'inherit', minHeight: '50px' }}>
                  I have a driver
                </button>
                <button onClick={requestRide}
                  style={{ flex: 1.4, background: T.blue, border: 'none', color: 'white', fontWeight: 700, fontSize: '13.5px', padding: '13px 8px', borderRadius: '11px', cursor: 'pointer', fontFamily: 'inherit', minHeight: '50px' }}>
                  I need a ride — alert drivers
                </button>
              </div>
            )}

            {ride === 'searching' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                <Loader2 size={16} color={T.blue} className="animate-spin" style={{ flexShrink: 0 }}/>
                <div style={{ flex: 1 }}>
                  <p style={{ color: T.textPrimary, fontSize: '14px', fontWeight: 700 }}>Alerting nearby community drivers…</p>
                  <p style={{ color: T.textMuted, fontSize: '12px', marginTop: '2px' }}>Your live location and hospital are attached.</p>
                </div>
                <button onClick={cancelRide}
                  style={{ background: 'none', border: 'none', color: T.textMuted, fontSize: '12.5px', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', textUnderlineOffset: '3px', flexShrink: 0 }}>
                  Cancel
                </button>
              </div>
            )}

            {ride === 'accepted' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                <CheckCircle size={17} color={T.green} style={{ flexShrink: 0 }}/>
                <div>
                  <p style={{ color: T.green, fontSize: '14.5px', fontWeight: 800 }}>{rideDriver} is coming to you</p>
                  <p style={{ color: T.textSec, fontSize: '12.5px', marginTop: '2px' }}>They can see your live location. Stay where you are if safe.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Map — full bleed ────────────────────────────────────────────────── */}
      <div style={{ height: '32vh', flexShrink: 0, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
        {!navMode && <Nav hospital={hospital} preview demo={isDemo} />}
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        style={{ flex: 1, padding: '22px 20px 44px' }}
      >

        {/* Care team status.
            Three states, and each one says only what is true. The old version
            had one state, showed a green tick every time, and told the person
            their care team could see them even when nothing had been written
            anywhere. See alertCareTeam above. */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '26px' }}>
          {!careTeamAlerted
            ? <Loader2 size={16} color={T.textMuted} className="animate-spin" style={{ flexShrink: 0, marginTop: '2px' }} />
            : recorded
              ? <CheckCircle size={16} color={T.green} style={{ flexShrink: 0, marginTop: '2px' }} />
              : <AlertTriangle size={16} color={T.red} style={{ flexShrink: 0, marginTop: '2px' }} />
          }
          <div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: !careTeamAlerted ? T.textSec : recorded ? T.green : T.red }}>
              {!careTeamAlerted
                ? 'Recording this emergency'
                : recorded
                  ? 'Recorded and showing on your care team dashboard'
                  : 'This emergency could not be recorded'}
            </p>
            {careTeamAlerted && (
              <p style={{ fontSize: '12.5px', color: T.textSec, marginTop: '3px', lineHeight: 1.45 }}>
                {recorded
                  ? 'Nobody has confirmed they have seen it. Call emergency services if you need help now.'
                  : 'Nothing was saved and nobody has been told. Call emergency services now.'}
              </p>
            )}
          </div>
        </div>

        {/* ── Notify family ─────────────────────────────────────────────────── */}
        {careTeamAlerted && (
          <div style={{ marginBottom: '30px' }}>
            <p style={{ color: T.textMuted, fontFamily: MONO, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.6px', marginBottom: '4px' }}>
              Notify family
            </p>

            {notifiedContacts.length > 0 ? (
              <>
                <div style={{ borderTop: `1px solid ${T.border}`, marginBottom: '12px' }}>
                  {notifiedContacts.map((c: any, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', padding: '13px 0', borderBottom: `1px solid ${T.border}` }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ color: T.textPrimary, fontSize: '14.5px', fontWeight: 600 }}>{c.name}</p>
                        {c.relationship && <p style={{ color: T.textMuted, fontSize: '12px', marginTop: '1px' }}>{c.relationship}</p>}
                      </div>
                      <a href={`tel:${c.phone}`}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', color: T.green, fontSize: '14px', fontWeight: 700, textDecoration: 'none', flexShrink: 0, padding: '8px 0 8px 16px' }}>
                        <Phone size={14} color={T.green} />
                        Call
                      </a>
                    </div>
                  ))}
                </div>

                <motion.a
                  href={buildSmsHref(notifiedContacts, hospital, type)}
                  whileTap={{ scale: 0.985 }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px',
                    background: T.blue, color: 'white',
                    fontWeight: 700, fontSize: '15px',
                    padding: '16px', borderRadius: '12px',
                    textDecoration: 'none', minHeight: '54px',
                  }}
                >
                  <MessageSquare size={16} color="white" />
                  Text family the hospital + directions
                </motion.a>

                <button
                  onClick={shareLive}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', background: 'none', border: 'none', color: T.blue, fontWeight: 600, fontSize: '13.5px', padding: '14px 14px 6px', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  <Share2 size={14} color={T.blue} />
                  Share a live status link instead
                </button>
                <button
                  onClick={() => setShowQr(q => !q)}
                  style={{ display: 'block', width: '100%', background: 'none', border: 'none', color: T.textMuted, fontWeight: 500, fontSize: '12.5px', padding: '4px 14px 10px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center' }}
                >
                  {showQr ? 'Hide QR' : 'Or show a QR for anyone nearby to scan'}
                </button>
                {showQr && roomId && typeof window !== 'undefined' && (() => {
                  try {
                    const qr = qrgen(0, 'M')
                    qr.addData(`${window.location.origin}/emergency/live/${roomId}`)
                    qr.make()
                    const svg = qr.createSvgTag({ cellSize: 4, margin: 2 })
                    return (
                      <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '10px' }}>
                        <div style={{ width: '164px', border: `1px solid ${T.border}`, borderRadius: '10px', padding: '10px', background: 'white' }}
                          dangerouslySetInnerHTML={{ __html: svg.replace('<svg ', '<svg style="width:100%;height:auto;display:block" ') }}/>
                      </div>
                    )
                  } catch { return null }
                })()}
              </>
            ) : (
              <p style={{ color: T.textMuted, fontSize: '13.5px', padding: '13px 0', borderTop: `1px solid ${T.border}` }}>
                No emergency contacts saved — add them in Settings for one-tap alerts.
              </p>
            )}
          </div>
        )}

        {/* ── First responder info — always visible, no box ─────────────────── */}
        {profile && (profile.blood_type || profile.allergies || (profile.medications?.length > 0)) && (
          <div style={{ marginBottom: '30px' }}>
            <p style={{ color: T.red, fontFamily: MONO, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.6px', marginBottom: '4px' }}>
              First responder info — show this screen
            </p>
            <div style={{ borderTop: `2px solid ${T.red}` }}>
              {profile.blood_type && (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '18px', padding: '14px 0', borderBottom: `1px solid ${T.border}` }}>
                  <span style={{ color: T.textMuted, fontSize: '12.5px', width: '92px', flexShrink: 0 }}>Blood type</span>
                  <span style={{ color: T.red, fontWeight: 900, fontSize: '34px', fontFamily: MONO, letterSpacing: '-1px', lineHeight: 0.9 }}>
                    {profile.blood_type}
                  </span>
                </div>
              )}
              {profile.allergies && (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '18px', padding: '14px 0', borderBottom: `1px solid ${T.border}` }}>
                  <span style={{ color: T.textMuted, fontSize: '12.5px', width: '92px', flexShrink: 0 }}>Allergies</span>
                  <span style={{ color: T.red, fontWeight: 700, fontSize: '15.5px', lineHeight: 1.5 }}>
                    {profile.allergies}
                  </span>
                </div>
              )}
              {profile.medications?.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '18px', padding: '14px 0', borderBottom: `1px solid ${T.border}` }}>
                  <span style={{ color: T.textMuted, fontSize: '12.5px', width: '92px', flexShrink: 0 }}>Medications</span>
                  <span style={{ color: T.textSec, fontSize: '13.5px', lineHeight: 1.7 }}>
                    {profile.medications.slice(0, 4).map((m: any) => m.name || m).join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Other hospitals — hairline rows ───────────────────────────────── */}
        {nearbyHospitals.length > 1 && (
          <div style={{ marginBottom: '30px' }}>
            <button
              onClick={() => setShowAll(!showAll)}
              style={{ color: T.textMuted, fontSize: '10px', fontWeight: 700, fontFamily: MONO, background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1.6px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px', padding: 0 }}
            >
              {showAll ? 'Hide other hospitals' : `${nearbyHospitals.length - 1} other hospital${nearbyHospitals.length - 1 > 1 ? 's' : ''} nearby`}
              <ChevronRight size={11} style={{ transform: showAll ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s ease' }}/>
            </button>

            <AnimatePresence>
              {showAll && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ borderTop: `1px solid ${T.border}` }}
                >
                  {nearbyHospitals.slice(1).map((h, i) => (
                    <button
                      key={i}
                      onClick={() => { setHospital(h); setShowAll(false) }}
                      style={{ width: '100%', background: 'none', border: 'none', borderBottom: `1px solid ${T.border}`, padding: '13px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <p style={{ color: T.textPrimary, fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>{h.name}</p>
                        <p style={{ color: T.textMuted, fontSize: '11.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.address}</p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ color: T.textPrimary, fontWeight: 700, fontSize: '15px', fontFamily: MONO, letterSpacing: '-0.5px' }}>
                          {etaText(h)}
                        </p>
                        <p style={{ color: T.textMuted, fontSize: '11px', fontFamily: MONO, marginTop: '2px' }}>
                          {formatDistance(h.distance || 0)}
                        </p>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── Actions ───────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <motion.a
            href={`tel:${emg.number}`}
            whileTap={{ scale: 0.985 }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              background: T.red, color: 'white',
              padding: '17px', borderRadius: '12px',
              fontWeight: 800, fontSize: '17px',
              textDecoration: 'none', minHeight: '56px', letterSpacing: '-0.1px',
            }}
          >
            <Phone size={19} strokeWidth={2.5} />
            Call {emg.label}
          </motion.a>

          {type === 'unconscious' && (
            <motion.button
              whileTap={{ scale: 0.985 }}
              onClick={() => router.push('/emergency/cpr')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                background: 'none', color: T.red,
                padding: '15px', borderRadius: '12px',
                fontWeight: 700, fontSize: '14.5px',
                border: `1.5px solid ${T.red}`, cursor: 'pointer', fontFamily: 'inherit', minHeight: '52px',
              }}
            >
              Not breathing? Start CPR guide
            </motion.button>
          )}

          <motion.button
            whileTap={{ scale: 0.985 }}
            onClick={() => router.push(`/emergency/brief?type=${type}&name=${encodeURIComponent(hospital.name)}`)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              background: 'none', color: T.textPrimary,
              padding: '15px', borderRadius: '12px',
              fontWeight: 700, fontSize: '14.5px',
              border: `1.5px solid ${T.textPrimary}`, cursor: 'pointer', fontFamily: 'inherit', minHeight: '52px',
            }}
          >
            <FileText size={15} />
            ER handoff brief
          </motion.button>

          <button
            onClick={() => setShowCancelConfirm(true)}
            style={{ background: 'none', color: T.textMuted, fontWeight: 500, fontSize: '13.5px', padding: '14px', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            I&apos;m safe. <span style={{ textDecoration: 'underline', textUnderlineOffset: '3px' }}>Cancel this emergency</span>
          </button>
        </div>
      </motion.div>

      {/* ── Guardian — escalates if the patient stops responding ─────────────── */}
      <GuardianWatch
        profile={profile}
        contacts={notifiedContacts}
        hospitalName={hospital.name}
        typeLabel={EMERGENCY_LABELS[type] || 'Emergency'}
        onEvent={pushEvt}
      />

      {/* ── Full-screen Relay navigation ──────────────────────────────────────── */}
      <AnimatePresence>
        {navMode && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
            style={{ position: 'fixed', inset: 0, zIndex: 150, background: '#FFFFFF', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(163,52,23,0.18)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <motion.div animate={{ opacity: [1, 0.25, 1] }} transition={{ duration: 1.1, repeat: Infinity }}
                  style={{ width: '8px', height: '8px', background: T.red }}/>
                <span style={{ color: T.red, fontFamily: MONO, fontSize: '10.5px', letterSpacing: '1.6px', textTransform: 'uppercase', fontWeight: 700 }}>
                  Relay navigation
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ color: T.red, fontFamily: MONO, fontSize: '14px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {fmtElapsed(elapsed)}
                </span>
                <button onClick={() => setNavMode(false)} aria-label="Exit navigation"
                  style={{ background: '#B3DDAC', border: `1px solid ${T.border}`, borderRadius: '9px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <X size={16} color={T.textSec}/>
                </button>
              </div>
            </div>

            <div style={{ flex: 1, minHeight: 0 }}>
              <Nav hospital={hospital} demo={isDemo}/>
            </div>

            <div style={{ padding: '11px 16px', borderTop: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: '#FFFFFF' }}>
              <a href={`tel:${emg.number}`} style={{ color: T.red, fontWeight: 800, fontSize: '14.5px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '7px' }}>
                <Phone size={14} strokeWidth={2.5}/> Call {emg.label}
              </a>
              <a href={directionsUrl(hospital)} target="_blank" rel="noopener noreferrer"
                style={{ color: T.textMuted, fontSize: '12.5px', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                Open in Google Maps
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Cancel confirm sheet ──────────────────────────────────────────────── */}
      <CancelConfirmSheet
        show={showCancelConfirm}
        cancelling={cancelling}
        onKeep={() => setShowCancelConfirm(false)}
        onConfirm={cancelEmergency}
      />
    </div>
  )
}

export default function RoutingPageWrapper() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100dvh', background: '#B3DDAC' }} />}>
      <RoutingPage />
    </Suspense>
  )
}
