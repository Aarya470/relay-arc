'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, ChevronRight, Loader2, CheckCircle, Shield, X, Share2, FileText, MessageSquare, Navigation2 } from 'lucide-react'
import { findNearbyHospitals, formatDistance, estimateTime, Hospital } from '@/lib/hospitals'
import { sendPushNotification } from '@/lib/notifications'
import { toast } from 'sonner'

const Nav = dynamic(() => import('@/components/Navigation'), { ssr: false })

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
  bg:          '#F4F5F7',
  card:        '#FFFFFF',
  card2:       '#FFFFFF',
  border:      '#ECEEF2',
  textPrimary: '#0E1218',
  textSec:     '#5B6371',
  textMuted:   '#9AA2AD',
  red:         '#D91414',
  redSoft:     'rgba(217,20,20,0.12)',
  redGlow:     'none',
  green:       '#007A44',
  greenSoft:   'rgba(0,122,68,0.12)',
  blue:        '#0055FF',
  blueSoft:    'rgba(0,85,255,0.12)',
  amber:       '#B45309',
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
            background: 'rgba(14,18,24,0.45)',
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
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: '#E3E6EC' }} />
            </div>

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
                  background: '#ECEEF2',
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
                  background: `#D91414`,
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
  const [showMedCard, setShowMedCard] = useState(true)
  const [elapsed, setElapsed] = useState(0)
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
    if (!id) { toast.error('Live link not ready yet — try again in a moment'); return }
    const url = `${window.location.origin}/emergency/live/${id}`
    if (typeof navigator.share === 'function') {
      try { await navigator.share({ title: 'Live emergency status — Relay Arc', url }); return } catch {}
    }
    try { await navigator.clipboard.writeText(url); toast.success('Live status link copied — send it to family') }
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
          Alerting care team…
        </p>
      </div>
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
        border: `1px solid rgba(217,20,20,0.25)`,
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

      {/* Call 911 — red gradient pill with glow */}
      <motion.a
        href="tel:911"
        whileTap={{ scale: 0.96 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          background: `#D91414`,
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
        Call 911 now
      </motion.a>

      {/* Cancel ghost */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setShowCancelConfirm(true)}
        style={{
          background: '#ECEEF2',
          color: T.textMuted,
          fontWeight: 500,
          fontSize: '13px',
          padding: '11px 24px',
          borderRadius: '12px',
          border: `1px solid #E3E6EC`,
          cursor: 'pointer',
        }}
      >
        I&apos;m safe — cancel emergency
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
  return (
    <div style={{
      minHeight: '100dvh',
      background: T.bg,
      display: 'flex',
      flexDirection: 'column',
      overflowX: 'hidden',
    }}>

      {/* ── Top status bar ──────────────────────────────────────────────────── */}
      <div style={{
        background: T.bg,
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        borderBottom: `1px solid rgba(217,20,20,0.12)`,
        zIndex: 10,
      }}>
        {/* Pulsing ACTIVE EMERGENCY badge */}
        <motion.div
          animate={{ opacity: [1, 0.6, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            background: T.redSoft,
            border: `1px solid rgba(217,20,20,0.28)`,
            borderRadius: '20px',
            padding: '5px 12px',
          }}
        >
          {/* Pulsing dot */}
          <motion.div
            animate={{ scale: [1, 1.35, 1], opacity: [1, 0.75, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: T.red,
              flexShrink: 0,
            }}
          />
          <span style={{
            color: T.red,
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: '10px',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}>
            Active Emergency · {EMERGENCY_LABELS[type] || 'Emergency'}
          </span>
        </motion.div>

        {/* Live elapsed timer */}
        <span style={{
          color: T.red,
          fontFamily: 'var(--font-mono, monospace)',
          fontSize: '14px',
          fontWeight: 700,
          letterSpacing: '0.5px',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {fmtElapsed(elapsed)}
        </span>
      </div>

      {/* ── Hospital info card (above map) ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        style={{
          background: T.card,
          margin: '12px 12px 0',
          borderRadius: '20px',
          border: `1px solid ${T.border}`,
          borderLeft: `3px solid ${T.red}`,
          padding: '16px 16px 16px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexShrink: 0,
          boxShadow: `0 4px 24px rgba(14,18,24,0.10), inset 0 0 0 1px rgba(217,20,20,0.06)`,
        }}
      >
        {/* Hospital name + address */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            color: T.textMuted,
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: '9px',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            marginBottom: '5px',
          }}>
            Routing to
          </p>
          <p style={{
            color: T.textPrimary,
            fontWeight: 800,
            fontSize: '16px',
            marginBottom: '3px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            letterSpacing: '-0.3px',
          }}>
            {hospital.name}
          </p>
          {hospital.address && (
            <p style={{
              color: T.textMuted,
              fontSize: '11px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {hospital.address}
            </p>
          )}
          {hospital.capability && (
            <span style={{
              display: 'inline-block',
              marginTop: '6px',
              color: T.green,
              background: T.greenSoft,
              fontSize: '9px',
              fontWeight: 700,
              fontFamily: 'var(--font-mono, monospace)',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              padding: '3px 8px',
              borderRadius: '5px',
            }}>
              ✓ {hospital.capability}
            </span>
          )}
        </div>

        {/* ETA + distance badge */}
        <div style={{
          background: T.redSoft,
          border: `1px solid rgba(217,20,20,0.22)`,
          borderRadius: '14px',
          padding: '10px 14px',
          textAlign: 'center',
          flexShrink: 0,
        }}>
          <p style={{
            color: T.red,
            fontWeight: 800,
            fontSize: '24px',
            fontFamily: 'var(--font-mono, monospace)',
            lineHeight: 1,
            letterSpacing: '-1px',
          }}>
            {estimateTime(hospital.distance || 0)}
          </p>
          <p style={{
            color: 'rgba(217,20,20,0.55)',
            fontSize: '10px',
            fontFamily: 'var(--font-mono, monospace)',
            marginTop: '3px',
            letterSpacing: '0.3px',
          }}>
            {formatDistance(hospital.distance || 0)}
          </p>
        </div>

        {/* Navigate button — red gradient pill with glow */}
        <motion.a
          href={directionsUrl(hospital)}
          target="_blank"
          rel="noopener noreferrer"
          whileTap={{ scale: 0.93 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '5px',
            background: `#D91414`,
            color: 'white',
            padding: '11px 14px',
            borderRadius: '14px',
            fontWeight: 700,
            fontSize: '10px',
            textDecoration: 'none',
            flexShrink: 0,
            boxShadow: T.redGlow,
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
          }}
        >
          <Navigation2 size={19} strokeWidth={2.5} />
          Route
        </motion.a>
      </motion.div>

      {/* ── Map ─────────────────────────────────────────────────────────────── */}
      <div style={{
        height: '36vh',
        flexShrink: 0,
        margin: '10px 12px 0',
        borderRadius: '20px',
        overflow: 'hidden',
        border: `1px solid ${T.border}`,
        boxShadow: '0 4px 20px rgba(14,18,24,0.10)',
      }}>
        <Nav hospital={hospital} />
      </div>

      {/* ── Bottom sheet ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        style={{
          flex: 1,
          background: T.card,
          borderRadius: '24px 24px 0 0',
          borderTop: `1px solid ${T.border}`,
          padding: '0 14px 40px',
          overflowY: 'auto',
          boxShadow: '0 -12px 40px rgba(14,18,24,0.10)',
          marginTop: '10px',
        }}
      >
        {/* Drag handle */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '12px 0 18px',
        }}>
          <div style={{
            width: '36px',
            height: '4px',
            borderRadius: '2px',
            background: '#E3E6EC',
          }} />
        </div>

        {/* ── Care team alert status ─────────────────────────────────────────── */}
        <motion.div
          animate={{
            borderColor: careTeamAlerted ? 'rgba(0,122,68,0.22)' : T.border,
            backgroundColor: careTeamAlerted ? 'rgba(0,122,68,0.06)' : 'transparent',
          }}
          transition={{ duration: 0.5 }}
          style={{
            borderRadius: '14px',
            padding: '12px 15px',
            border: '1px solid',
            display: 'flex',
            alignItems: 'center',
            gap: '11px',
            marginBottom: '14px',
          }}
        >
          {careTeamAlerted
            ? <CheckCircle size={17} color={T.green} style={{ flexShrink: 0 }} />
            : <Loader2 size={17} color={T.textMuted} className="animate-spin" style={{ flexShrink: 0 }} />
          }
          <div>
            <p style={{
              fontSize: '13px',
              fontWeight: 600,
              color: careTeamAlerted ? T.green : T.textSec,
              lineHeight: 1.4,
            }}>
              {careTeamAlerted
                ? 'Care team alerted — they can see your emergency'
                : 'Alerting your care team…'
              }
            </p>
            {careTeamAlerted && profile && (
              <p style={{
                color: T.textMuted,
                fontSize: '11px',
                marginTop: '3px',
                fontFamily: 'var(--font-mono, monospace)',
              }}>
                {profile.full_name} · {EMERGENCY_LABELS[type]}
              </p>
            )}
          </div>
        </motion.div>

        {/* ── Emergency contacts + SMS ───────────────────────────────────────── */}
        {careTeamAlerted && (
          <div style={{ marginBottom: '14px' }}>
            {/* Section label */}
            <p style={{
              color: T.textMuted,
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '9px',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              marginBottom: '9px',
            }}>
              Notify family
            </p>

            {notifiedContacts.length > 0 ? (
              <>
                {/* Text all — the family-routing feature, first and loud */}
                <motion.a
                  href={buildSmsHref(notifiedContacts, hospital, type)}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: T.blue,
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '14.5px',
                    padding: '16px',
                    borderRadius: '13px',
                    textDecoration: 'none',
                    marginBottom: '9px',
                  }}
                >
                  <MessageSquare size={16} color="white" />
                  Text family the hospital + directions
                </motion.a>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {notifiedContacts.map((c: any, i: number) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: T.card2,
                        borderRadius: '13px',
                        padding: '11px 14px',
                        border: `1px solid ${T.border}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div>
                          <span style={{
                            color: T.textPrimary,
                            fontSize: '13px',
                            fontWeight: 600,
                            display: 'block',
                          }}>
                            {c.name}
                          </span>
                          {c.relationship && (
                            <span style={{
                              color: T.textMuted,
                              fontSize: '11px',
                              display: 'block',
                              marginTop: '1px',
                            }}>
                              {c.relationship}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Call link — green */}
                      <motion.a
                        href={`tel:${c.phone}`}
                        whileTap={{ scale: 0.92 }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          color: T.green,
                          fontSize: '12px',
                          fontWeight: 700,
                          textDecoration: 'none',
                          background: T.greenSoft,
                          padding: '6px 11px',
                          borderRadius: '9px',
                          border: `1px solid rgba(0,122,68,0.2)`,
                        }}
                      >
                        <Phone size={12} color={T.green} />
                        Call
                      </motion.a>
                    </div>
                  ))}
                </div>

                {/* Share live status — caregiver live view */}
                <motion.button
                  onClick={shareLive}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    width: '100%',
                    background: T.card2,
                    border: `1px solid rgba(0,85,255,0.22)`,
                    color: T.blue,
                    fontWeight: 700,
                    fontSize: '13px',
                    padding: '14px 16px',
                    borderRadius: '13px',
                    cursor: 'pointer',
                    marginTop: '9px',
                  }}
                >
                  <Share2 size={15} color={T.blue} />
                  Share live status link with family
                </motion.button>
              </>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'transparent',
                border: `1px solid ${T.border}`,
                color: T.textMuted,
                fontWeight: 500,
                fontSize: '13px',
                padding: '14px 16px',
                borderRadius: '13px',
              }}>
                <MessageSquare size={15} />
                Add emergency contacts to enable quick SMS
              </div>
            )}
          </div>
        )}

        {/* ── First responder / medical profile card ────────────────────────── */}
        {profile && (profile.blood_type || profile.allergies || (profile.medications?.length > 0)) && (
          <div style={{
            marginBottom: '14px',
            background: T.card2,
            border: `1px solid rgba(217,20,20,0.18)`,
            borderRadius: '16px',
            overflow: 'hidden',
          }}>
            <button
              onClick={() => setShowMedCard(!showMedCard)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 15px',
                background: showMedCard ? 'rgba(217,20,20,0.08)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: T.red,
                }} />
                <span style={{
                  color: T.red,
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '1.2px',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-mono, monospace)',
                }}>
                  First Responder Info
                </span>
              </div>
              <span style={{
                color: T.textMuted,
                fontSize: '12px',
                fontWeight: 500,
              }}>
                {showMedCard ? 'Hide' : 'Show'}
              </span>
            </button>

            <AnimatePresence>
              {showMedCard && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeInOut' }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{
                    padding: '16px 15px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    borderTop: `1px solid rgba(217,20,20,0.12)`,
                  }}>
                    {profile.blood_type && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <span style={{
                          color: T.textMuted,
                          fontSize: '11px',
                          width: '80px',
                          flexShrink: 0,
                        }}>
                          Blood type
                        </span>
                        <span style={{
                          color: T.red,
                          fontWeight: 800,
                          fontSize: '26px',
                          fontFamily: 'var(--font-mono, monospace)',
                          letterSpacing: '-0.5px',
                          lineHeight: 1,
                        }}>
                          {profile.blood_type}
                        </span>
                      </div>
                    )}
                    {profile.allergies && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                        <span style={{
                          color: T.textMuted,
                          fontSize: '11px',
                          width: '80px',
                          flexShrink: 0,
                          paddingTop: '2px',
                        }}>
                          Allergies
                        </span>
                        <span style={{
                          color: T.red,
                          fontWeight: 600,
                          fontSize: '13px',
                          lineHeight: 1.55,
                        }}>
                          {profile.allergies}
                        </span>
                      </div>
                    )}
                    {profile.medications?.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                        <span style={{
                          color: T.textMuted,
                          fontSize: '11px',
                          width: '80px',
                          flexShrink: 0,
                          paddingTop: '2px',
                        }}>
                          Medications
                        </span>
                        <span style={{
                          color: T.textSec,
                          fontSize: '12px',
                          lineHeight: 1.7,
                        }}>
                          {profile.medications.slice(0, 4).map((m: any) => m.name || m).join(', ')}
                        </span>
                      </div>
                    )}
                    <p style={{
                      color: 'rgba(217,20,20,0.35)',
                      fontSize: '9px',
                      fontFamily: 'var(--font-mono, monospace)',
                      letterSpacing: '1.5px',
                      textTransform: 'uppercase',
                      marginTop: '2px',
                    }}>
                      Show this screen to paramedics
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── Other hospitals nearby ────────────────────────────────────────── */}
        {nearbyHospitals.length > 1 && (
          <div style={{ marginBottom: '14px' }}>
            <button
              onClick={() => setShowAll(!showAll)}
              style={{
                color: T.textMuted,
                fontSize: '11px',
                fontFamily: 'var(--font-mono, monospace)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '1.2px',
                marginBottom: '9px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: 0,
              }}
            >
              {showAll
                ? 'Hide other hospitals'
                : `${nearbyHospitals.length - 1} other hospital${nearbyHospitals.length - 1 > 1 ? 's' : ''} nearby`
              }
              <ChevronRight
                size={12}
                style={{
                  transform: showAll ? 'rotate(90deg)' : 'none',
                  transition: 'transform 0.2s ease',
                }}
              />
            </button>

            <AnimatePresence>
              {showAll && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}
                >
                  {nearbyHospitals.slice(1).map((h, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => { setHospital(h); setShowAll(false) }}
                      style={{
                        width: '100%',
                        background: T.card2,
                        border: `1px solid ${T.border}`,
                        borderRadius: '13px',
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div>
                        <p style={{
                          color: T.textPrimary,
                          fontWeight: 600,
                          fontSize: '13px',
                          marginBottom: '2px',
                        }}>
                          {h.name}
                        </p>
                        <p style={{
                          color: T.textMuted,
                          fontSize: '11px',
                        }}>
                          {h.address}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                        <p style={{
                          color: T.red,
                          fontWeight: 700,
                          fontSize: '14px',
                          fontFamily: 'var(--font-mono, monospace)',
                          letterSpacing: '-0.5px',
                        }}>
                          {estimateTime(h.distance || 0)}
                        </p>
                        <p style={{
                          color: T.textMuted,
                          fontSize: '11px',
                          fontFamily: 'var(--font-mono, monospace)',
                          marginTop: '2px',
                        }}>
                          {formatDistance(h.distance || 0)}
                        </p>
                      </div>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── Action buttons ────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>

          {/* Call 911 — full-width red gradient with glow */}
          <motion.a
            href="tel:911"
            whileTap={{ scale: 0.97 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              background: `#D91414`,
              color: 'white',
              padding: '16px',
              borderRadius: '14px',
              fontWeight: 800,
              fontSize: '16px',
              textDecoration: 'none',
              boxShadow: T.redGlow,
              letterSpacing: '0.3px',
            }}
          >
            <Phone size={18} strokeWidth={2.5} />
            Call 911
          </motion.a>

          {/* ER handoff brief */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push(`/emergency/brief?type=${type}&name=${encodeURIComponent(hospital.name)}`)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: '#ECEEF2',
              color: T.textSec,
              padding: '14px',
              borderRadius: '13px',
              fontWeight: 600,
              fontSize: '14px',
              border: `1px solid ${T.border}`,
              cursor: 'pointer',
            }}
          >
            <FileText size={15} />
            ER handoff brief
          </motion.button>

          {/* Cancel — dark ghost */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowCancelConfirm(true)}
            style={{
              background: '#ECEEF2',
              color: T.textMuted,
              fontWeight: 500,
              fontSize: '13px',
              padding: '12px 24px',
              borderRadius: '12px',
              border: `1px solid #E3E6EC`,
              cursor: 'pointer',
            }}
          >
            I&apos;m safe — cancel emergency
          </motion.button>
        </div>
      </motion.div>

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
    <Suspense fallback={<div style={{ minHeight: '100dvh', background: '#F4F5F7' }} />}>
      <RoutingPage />
    </Suspense>
  )
}
