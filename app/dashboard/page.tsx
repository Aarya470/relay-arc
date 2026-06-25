'use client'
// v2
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { registerPushNotifications } from '@/lib/notifications'
import BottomNav from '@/components/BottomNav'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronRight, CheckCircle2, Video, Settings, Phone } from 'lucide-react'
import { toast } from 'sonner'

function scheduleCheckinReminders(userId: string, checkins: any[]): () => void {
  let timerId: ReturnType<typeof setTimeout> | null = null
  let cancelled = false

  const schedule = (existingCheckins: any[]) => {
    if (cancelled) return
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    if (Notification.permission !== 'granted') return

    const today = new Date().toDateString()
    const checkedInToday = existingCheckins.some(c => new Date(c.created_at).toDateString() === today)
    if (checkedInToday) return

    const now = new Date()
    const hour = now.getHours()
    if (hour < 8 || hour >= 20) return

    const nextHour = new Date(now)
    nextHour.setHours(hour + 1, 0, 0, 0)
    const ms = nextHour.getTime() - now.getTime()

    timerId = setTimeout(async () => {
      if (cancelled) return
      try {
        const { supabase: sb } = await import('@/lib/supabase')
        const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0)
        const { data } = await sb.from('checkins').select('id').eq('user_id', userId).gte('created_at', startOfDay.toISOString()).limit(1)
        if (data?.length) return
        const reg = await navigator.serviceWorker.ready
        await reg.showNotification('Daily check-in reminder', {
          body: "You haven't completed your check-in yet. Tap to do it now.",
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          data: { url: '/checkin' },
        } as any)
        schedule([])
      } catch {}
    }, ms)
  }

  schedule(checkins)
  return () => { cancelled = true; if (timerId) clearTimeout(timerId) }
}

function parseTS(ts: string) {
  if (!ts) return new Date()
  return new Date(/[Z+]/.test(ts) ? ts : ts + 'Z')
}

const ease = { type: 'spring', stiffness: 300, damping: 28 } as const

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: ease },
}

// Design tokens
const card: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid rgba(0,0,0,0.07)',
  borderRadius: '14px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
}

export default function Dashboard() {
  const [profile, setProfile] = useState<any>(null)
  const [checkins, setCheckins] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  const [upcomingMeeting, setUpcomingMeeting] = useState<any>(null)
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [showIosHint, setShowIosHint] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const handler = (e: any) => { e.preventDefault(); setInstallPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  useEffect(() => {
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    setShowIosHint(isIos && !isStandalone)
  }, [])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data: allActiveEms } = await supabase
        .from('emergencies').select('id, emergency_type, created_at')
        .eq('user_id', user.id).eq('status', 'active')
        .order('created_at', { ascending: false })
      if (allActiveEms && allActiveEms.length > 0) {
        const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
        const recentEm = allActiveEms[0].created_at >= fifteenMinAgo ? allActiveEms[0] : null
        const resolveIds = allActiveEms.slice(recentEm ? 1 : 0).map(e => e.id)
        if (!recentEm) resolveIds.push(allActiveEms[0].id)
        if (resolveIds.length > 0) {
          await supabase.from('emergencies').update({ status: 'resolved' }).in('id', resolveIds)
        }
        if (recentEm) {
          router.push(`/emergency/routing?type=${recentEm.emergency_type}&id=${recentEm.id}`)
          return
        }
      }

      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!data) { router.push('/onboarding'); return }
      const { data: c } = await supabase.from('checkins').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3)
      setProfile(data)
      setCheckins(c || [])
      setLoading(false)
      registerPushNotifications(user.id)
      const cancelReminders = scheduleCheckinReminders(user.id, c || [])
      return cancelReminders
    }
    load()
  }, [])

  useEffect(() => {
    if (!userId) return
    const check = async () => {
      const { data } = await supabase.from('appointments').select('*').eq('patient_id', userId).eq('status', 'confirmed')
      if (!data) return
      const now = Date.now()
      const upcoming = data.find(a => {
        if (!a.meeting_room_id) return false
        const t = parseTS(a.scheduled_at).getTime()
        return t > now - 5 * 60 * 1000 && t < now + 15 * 60 * 1000
      })
      setUpcomingMeeting(upcoming || null)
    }
    check()
    const id = setInterval(check, 30000)
    return () => clearInterval(id)
  }, [userId])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  if (loading) return (
    <div style={{ minHeight: '100dvh', background: '#F5F3EF', padding: '80px 20px 100px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {[1, 2, 3, 4].map(i => <Skeleton key={i} style={{ height: '72px', borderRadius: '14px', background: 'rgba(0,0,0,0.05)' }}/>)}
    </div>
  )

  const weeksSinceSurgery = profile?.surgery_date
    ? Math.floor((Date.now() - new Date(profile.surgery_date).getTime()) / (1000 * 60 * 60 * 24 * 7))
    : null
  const checkinToday = checkins.length > 0 && (() => {
    const ts = checkins[0].created_at
    const d = new Date(/[Z+]/.test(ts) ? ts : ts + 'Z')
    return d.toLocaleDateString() === new Date().toLocaleDateString()
  })()
  const recoveryPct = weeksSinceSurgery !== null ? Math.min((weeksSinceSurgery / 12) * 100, 100) : 0
  const meds = profile?.medications?.slice(0, 3) || []

  return (
    <div style={{ minHeight: '100dvh', background: '#F5F3EF', paddingBottom: '100px' }}>

      {/* Meeting banner */}
      <AnimatePresence>
        {upcomingMeeting && (
          <motion.div
            initial={{ y: -64, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -64, opacity: 0 }}
            transition={ease}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
              background: '#1A2820',
              padding: '52px 20px 14px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <div>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '3px' }}>
                {parseTS(upcomingMeeting.scheduled_at) <= new Date() ? 'Live now' : 'Starting soon'}
              </p>
              <p style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>Your care team call is ready</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => toast('Care team — coming soon', { description: 'This feature is launching shortly.' })}
              style={{ background: '#5C8B74', color: 'white', fontWeight: 600, fontSize: '13px', padding: '9px 16px', borderRadius: '9px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}
            >
              <Video size={13}/>
              Join
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={ease}
        style={{ padding: '56px 20px 20px', maxWidth: '720px', margin: '0 auto', width: '100%' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: 'rgba(0,0,0,0.38)', fontSize: '13px', marginBottom: '4px', fontWeight: 400 }}>{greeting}</p>
            <h1 style={{ color: '#111', fontSize: '30px', fontWeight: 700, letterSpacing: '-0.8px', lineHeight: 1.1 }}>
              {profile?.full_name?.split(' ')[0]}
            </h1>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => router.push('/settings')}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(0,0,0,0.05)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, marginTop: '4px' }}
            aria-label="Settings"
          >
            <Settings size={16} color="rgba(0,0,0,0.5)"/>
          </motion.button>
        </div>

        {/* Diagnosis tags */}
        {profile?.diagnosis && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px' }}>
            {profile.diagnosis.split(',').map((d: string, i: number) => (
              <span key={i} style={{
                background: 'rgba(0,0,0,0.05)',
                color: 'rgba(0,0,0,0.5)',
                fontSize: '11px',
                fontWeight: 500,
                padding: '3px 10px',
                borderRadius: '99px',
                border: '1px solid rgba(0,0,0,0.07)',
              }}>
                {d.trim()}
              </span>
            ))}
          </div>
        )}
      </motion.div>

      {/* Install banner */}
      {installPrompt && (
        <div style={{ margin: '0 auto 10px', maxWidth: '680px', width: 'calc(100% - 40px)', ...card, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <p style={{ color: '#111', fontWeight: 600, fontSize: '13px' }}>Add to Home Screen</p>
            <p style={{ color: 'rgba(0,0,0,0.4)', fontSize: '12px', marginTop: '1px' }}>Install for quick access</p>
          </div>
          <button
            onClick={async () => { installPrompt.prompt(); const { outcome } = await installPrompt.userChoice; if (outcome === 'accepted') setInstallPrompt(null) }}
            style={{ background: '#1A2820', color: 'white', fontWeight: 600, fontSize: '12px', padding: '7px 13px', borderRadius: '8px', border: 'none', cursor: 'pointer', flexShrink: 0 }}
          >Install</button>
          <button onClick={() => setInstallPrompt(null)} style={{ background: 'none', border: 'none', color: 'rgba(0,0,0,0.3)', fontSize: '20px', cursor: 'pointer', lineHeight: 1, padding: '0', flexShrink: 0 }}>×</button>
        </div>
      )}

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '720px', margin: '0 auto', width: '100%' }}
      >

        {/* SOS */}
        <motion.div variants={fadeUp}>
          <motion.button
            whileTap={{ scale: 0.98 }}
            transition={ease}
            onClick={() => router.push('/emergency')}
            style={{
              width: '100%',
              background: '#C8372D',
              borderRadius: '14px',
              padding: '20px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 4px 16px rgba(200,55,45,0.28)',
            }}
          >
            <div style={{ textAlign: 'left' }}>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 500 }}>Emergency</p>
              <p style={{ color: 'white', fontSize: '32px', fontWeight: 800, letterSpacing: '-1.5px', lineHeight: 1 }}>SOS</p>
            </div>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Phone size={22} color="white"/>
            </div>
          </motion.button>
        </motion.div>

        {/* Check-in + Recovery */}
        <motion.div variants={fadeUp} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push('/checkin')}
            style={{
              background: '#FFFFFF',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              borderRadius: '14px',
              borderTop: 'none',
              borderRight: 'none',
              borderBottom: 'none',
              borderLeft: checkinToday ? '4px solid #5C8B74' : '4px solid rgba(0,0,0,0.1)',
              padding: '18px 16px',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <p style={{ color: 'rgba(0,0,0,0.35)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '10px' }}>Daily check-in</p>
            <p style={{ color: checkinToday ? '#3D6B58' : '#111', fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1, marginBottom: '5px' }}>
              {checkinToday ? 'Done' : 'Check in'}
            </p>
            <p style={{ color: checkinToday ? '#5C8B74' : 'rgba(0,0,0,0.3)', fontSize: '11px', fontWeight: 500 }}>
              {checkinToday ? 'Completed today' : 'Tap to start'}
            </p>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push('/timeline')}
            style={{
              background: '#1A2820',
              borderRadius: '14px',
              border: 'none',
              padding: '18px 16px',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '10px' }}>Recovery</p>
            {weeksSinceSurgery !== null ? (
              <>
                <p style={{ color: '#FFFFFF', fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1, marginBottom: '5px' }}>
                  Wk {weeksSinceSurgery}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', fontWeight: 500 }}>{Math.round(recoveryPct)}% complete</p>
              </>
            ) : (
              <>
                <p style={{ color: '#FFFFFF', fontSize: '20px', fontWeight: 700, letterSpacing: '-0.3px', lineHeight: 1, marginBottom: '5px' }}>Timeline</p>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', fontWeight: 500 }}>Recovery plan</p>
              </>
            )}
          </motion.button>
        </motion.div>

        {/* Medications */}
        <motion.div variants={fadeUp}>
          <motion.button
            whileTap={{ scale: 0.99 }}
            onClick={() => router.push('/medications')}
            style={{ ...card, padding: '16px', textAlign: 'left', cursor: 'pointer', width: '100%' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: meds.length > 0 ? '12px' : '0' }}>
              <span style={{ color: '#111', fontSize: '14px', fontWeight: 700, letterSpacing: '-0.2px' }}>Medications</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {meds.length > 0 && (
                  <span style={{ background: 'rgba(0,0,0,0.06)', color: 'rgba(0,0,0,0.45)', fontSize: '11px', fontWeight: 600, padding: '2px 7px', borderRadius: '99px' }}>
                    {meds.length}
                  </span>
                )}
                <ChevronRight size={14} color="rgba(0,0,0,0.25)"/>
              </div>
            </div>
            {meds.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {meds.map((med: any, i: number) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 0',
                    borderTop: i > 0 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                  }}>
                    <p style={{ color: '#111', fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{med.name}</p>
                    <p style={{ color: 'rgba(0,0,0,0.35)', fontSize: '12px', flexShrink: 0, marginLeft: '8px' }}>{med.dose}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'rgba(0,0,0,0.3)', fontSize: '13px' }}>No medications added</p>
            )}
          </motion.button>
        </motion.div>



        {/* Care team */}
        <motion.div variants={fadeUp}>
          <motion.button
            whileTap={{ scale: 0.99 }}
            onClick={() => toast('Care team — coming soon', { description: 'This feature is launching shortly.' })}
            style={{
              background: '#1A2820',
              borderRadius: '14px',
              border: 'none',
              padding: '16px 18px',
              cursor: 'pointer',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ textAlign: 'left' }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '4px' }}>Care team</p>
              <p style={{ color: '#FFFFFF', fontWeight: 600, fontSize: '15px' }}>Schedule or join a call</p>
            </div>
            <ChevronRight size={16} color="rgba(255,255,255,0.3)"/>
          </motion.button>
        </motion.div>

        {/* Last check-in */}
        {checkins.length > 0 && (
          <motion.div variants={fadeUp}>
            <motion.button
              whileTap={{ scale: 0.99 }}
              onClick={() => router.push('/history')}
              style={{ ...card, padding: '14px 16px', cursor: 'pointer', width: '100%', textAlign: 'left' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <p style={{ color: 'rgba(0,0,0,0.4)', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Last check-in</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <p style={{ color: 'rgba(0,0,0,0.25)', fontSize: '11px' }}>
                    {new Date(checkins[0].created_at).toLocaleDateString()}
                  </p>
                  <ChevronRight size={11} color="rgba(0,0,0,0.2)"/>
                </div>
              </div>
              <p style={{ color: 'rgba(0,0,0,0.55)', fontSize: '13px', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {checkins[0].summary}
              </p>
            </motion.button>
          </motion.div>
        )}

      </motion.div>

      {/* iOS install hint */}
      {showIosHint && (
        <div style={{ margin: '10px auto 0', maxWidth: '680px', width: 'calc(100% - 40px)', ...card, padding: '14px 16px' }}>
          <p style={{ color: '#111', fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>Add to Home Screen</p>
          <p style={{ color: 'rgba(0,0,0,0.45)', fontSize: '12px', lineHeight: 1.6 }}>
            Open in <strong>Safari</strong> · tap the Share button · tap <strong>Add to Home Screen</strong>
          </p>
        </div>
      )}

      <BottomNav/>
    </div>
  )
}
