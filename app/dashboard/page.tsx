'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { registerPushNotifications } from '@/lib/notifications'
import BottomNav from '@/components/BottomNav'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronRight, CheckCircle2, Video, Settings, Phone, Flame, Users, Clock, AlertTriangle, TrendingDown } from 'lucide-react'
import { toast } from 'sonner'
import { analyzeCrashRisk, CrashRisk } from '@/lib/crash-risk'

function scheduleCheckinReminders(userId: string, checkins: any[]): () => void {
  let timerId: ReturnType<typeof setTimeout> | null = null
  let cancelled = false
  const schedule = (existing: any[]) => {
    if (cancelled) return
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    if (Notification.permission !== 'granted') return
    const today = new Date().toDateString()
    if (existing.some(c => new Date(c.created_at).toDateString() === today)) return
    const now = new Date()
    const hour = now.getHours()
    if (hour < 8 || hour >= 20) return
    const next = new Date(now); next.setHours(hour + 1, 0, 0, 0)
    timerId = setTimeout(async () => {
      if (cancelled) return
      try {
        const { supabase: sb } = await import('@/lib/supabase')
        const start = new Date(); start.setHours(0, 0, 0, 0)
        const { data } = await sb.from('checkins').select('id').eq('user_id', userId).gte('created_at', start.toISOString()).limit(1)
        if (data?.length) return
        const reg = await navigator.serviceWorker.ready
        await reg.showNotification('Daily check-in', { body: "You haven't checked in yet today.", icon: '/icon-192.png', badge: '/icon-192.png', data: { url: '/checkin' } } as any)
        schedule([])
      } catch {}
    }, next.getTime() - now.getTime())
  }
  schedule(checkins)
  return () => { cancelled = true; if (timerId) clearTimeout(timerId) }
}

function parseTS(ts: string) {
  if (!ts) return new Date()
  return new Date(/[Z+]/.test(ts) ? ts : ts + 'Z')
}

function calcStreak(checkins: any[]): number {
  if (!checkins.length) return 0
  const sorted = [...checkins].sort((a, b) => parseTS(b.created_at).getTime() - parseTS(a.created_at).getTime())
  const toDay = (d: Date) => d.toDateString()
  const today = toDay(new Date())
  const yesterday = toDay(new Date(Date.now() - 86400000))
  const firstDay = toDay(parseTS(sorted[0].created_at))
  if (firstDay !== today && firstDay !== yesterday) return 0
  const uniqueDays = [...new Set(sorted.map(c => toDay(parseTS(c.created_at))))]
  let streak = 0
  let cursor = new Date(); cursor.setHours(0, 0, 0, 0)
  for (const day of uniqueDays) {
    if (toDay(cursor) === day) { streak++; cursor = new Date(cursor.getTime() - 86400000) }
    else break
  }
  return streak
}

const ease = { type: 'spring', stiffness: 300, damping: 28 } as const
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }
const fadeUp = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: ease } }

export default function Dashboard() {
  const [profile, setProfile] = useState<any>(null)
  const [checkins, setCheckins] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  const [upcomingMeeting, setUpcomingMeeting] = useState<any>(null)
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [showIosHint, setShowIosHint] = useState(false)
  const [crashRisk, setCrashRisk] = useState<CrashRisk | null>(null)
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
        if (resolveIds.length > 0) await supabase.from('emergencies').update({ status: 'resolved' }).in('id', resolveIds)
        if (recentEm) { router.push(`/emergency/routing?type=${recentEm.emergency_type}&id=${recentEm.id}`); return }
      }

      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!data) { router.push('/onboarding'); return }
      const { data: c } = await supabase.from('checkins').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30)
      setProfile(data)
      setCheckins(c || [])
      setLoading(false)
      analyzeCrashRisk(c || []).then(risk => { if (risk && risk.level !== 'low') setCrashRisk(risk) }).catch(() => {})
      registerPushNotifications(user.id)
      return scheduleCheckinReminders(user.id, c || [])
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
  const greeting = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening'

  if (loading) return (
    <div style={{ minHeight: '100dvh', background: '#F0EDE5', padding: '60px 20px 80px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {[80, 140, 72, 72, 72].map((h, i) => (
        <Skeleton key={i} style={{ height: `${h}px`, borderRadius: '12px', background: 'rgba(16,22,14,0.05)' }}/>
      ))}
    </div>
  )

  const weeksSinceSurgery = profile?.surgery_date
    ? Math.floor((Date.now() - new Date(profile.surgery_date).getTime()) / (1000 * 60 * 60 * 24 * 7))
    : null
  const checkinToday = checkins.length > 0 && (() => {
    const ts = checkins[0].created_at
    return new Date(/[Z+]/.test(ts) ? ts : ts + 'Z').toLocaleDateString() === new Date().toLocaleDateString()
  })()
  const recoveryPct = weeksSinceSurgery !== null ? Math.min((weeksSinceSurgery / 12) * 100, 100) : 0
  const meds = profile?.medications?.slice(0, 3) || []
  const streak = calcStreak(checkins)
  const emergencyContacts: any[] = profile?.emergency_contacts || []

  return (
    <div style={{ minHeight: '100dvh', background: '#F0EDE5', paddingBottom: '76px' }}>

      {/* Meeting banner */}
      <AnimatePresence>
        {upcomingMeeting && (
          <motion.div initial={{ y: -56, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -56, opacity: 0 }} transition={ease}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: '#1C3D28', padding: '48px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ color: 'rgba(240,237,229,0.45)', fontSize: '10px', letterSpacing: '1.2px', textTransform: 'uppercase', fontFamily: 'var(--font-mono, monospace)', marginBottom: '2px' }}>Care team</p>
              <p style={{ color: '#F0EDE5', fontWeight: 600, fontSize: '14px' }}>Your call is ready</p>
            </div>
            <motion.button whileTap={{ scale: 0.95 }}
              onClick={() => toast('Care team call — coming soon')}
              style={{ background: 'rgba(240,237,229,0.12)', color: '#F0EDE5', fontWeight: 600, fontSize: '13px', padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(240,237,229,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Video size={13}/> Join
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
        style={{ padding: '52px 20px 20px', maxWidth: '640px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: 'rgba(16,22,14,0.36)', fontSize: '12px', fontFamily: 'var(--font-mono, monospace)', letterSpacing: '0.8px', marginBottom: '3px', textTransform: 'uppercase' }}>
              {greeting}
            </p>
            <h1 style={{ color: '#0F1A0E', fontSize: '28px', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1 }}>
              {profile?.full_name?.split(' ')[0]}
            </h1>
            {profile?.diagnosis && (
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '7px' }}>
                {profile.diagnosis.split(',').map((d: string, i: number) => (
                  <span key={i} style={{ background: 'rgba(16,22,14,0.06)', color: 'rgba(16,22,14,0.48)', fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', fontFamily: 'var(--font-mono, monospace)', letterSpacing: '0.3px' }}>
                    {d.trim().toUpperCase()}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {streak >= 2 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(180,83,9,0.08)', border: '1px solid rgba(180,83,9,0.15)', borderRadius: '99px', padding: '4px 9px' }}>
                <Flame size={12} color="#B45309"/>
                <span style={{ color: '#B45309', fontSize: '12px', fontWeight: 800, fontFamily: 'var(--font-mono, monospace)' }}>{streak}</span>
              </div>
            )}
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => router.push('/settings')}
              style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(16,22,14,0.06)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Settings size={15} color="rgba(16,22,14,0.4)"/>
            </motion.button>
          </div>
        </div>
      </motion.div>

      <motion.div variants={stagger} initial="hidden" animate="show"
        style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '640px', margin: '0 auto' }}>

        {/* Install banner */}
        {installPrompt && (
          <motion.div variants={fadeUp}
            style={{ background: '#FFFFFF', border: '1px solid rgba(16,22,14,0.08)', borderRadius: '12px', padding: '13px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <p style={{ color: '#0F1A0E', fontWeight: 600, fontSize: '13px' }}>Add to Home Screen</p>
              <p style={{ color: 'rgba(16,22,14,0.4)', fontSize: '12px', marginTop: '1px' }}>Install for push notifications</p>
            </div>
            <button onClick={async () => { installPrompt.prompt(); const { outcome } = await installPrompt.userChoice; if (outcome === 'accepted') setInstallPrompt(null) }}
              style={{ background: '#1C3D28', color: '#F0EDE5', fontWeight: 600, fontSize: '12px', padding: '7px 12px', borderRadius: '7px', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
              Install
            </button>
            <button onClick={() => setInstallPrompt(null)} style={{ background: 'none', border: 'none', color: 'rgba(16,22,14,0.28)', fontSize: '18px', cursor: 'pointer', lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
          </motion.div>
        )}

        {/* SOS */}
        <motion.div variants={fadeUp}>
          <motion.button whileTap={{ scale: 0.98 }} onClick={() => router.push('/emergency')}
            style={{ width: '100%', background: '#0F1A0E', borderRadius: '14px', padding: '22px 20px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ textAlign: 'left' }}>
              <p style={{ color: 'rgba(240,237,229,0.4)', fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px', fontFamily: 'var(--font-mono, monospace)', fontWeight: 600 }}>Emergency</p>
              <p style={{ color: '#F0EDE5', fontSize: '36px', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1, fontFamily: 'var(--font-mono, monospace)' }}>SOS</p>
              <p style={{ color: 'rgba(240,237,229,0.35)', fontSize: '12px', marginTop: '6px', fontWeight: 400 }}>Tap to activate emergency response</p>
            </div>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#B91C1C', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Phone size={20} color="white" strokeWidth={2.2}/>
            </div>
          </motion.button>
        </motion.div>

        {/* Crash risk alert */}
        <AnimatePresence>
          {crashRisk && (
            <motion.div variants={fadeUp} initial="hidden" animate="show" exit={{ opacity: 0, scale: 0.97 }}
              style={{
                background: crashRisk.level === 'high' ? 'rgba(185,28,28,0.05)' : 'rgba(180,83,9,0.05)',
                border: `1px solid ${crashRisk.level === 'high' ? 'rgba(185,28,28,0.18)' : 'rgba(180,83,9,0.16)'}`,
                borderRadius: '12px', padding: '13px 14px',
                display: 'flex', alignItems: 'flex-start', gap: '10px',
              }}>
              <TrendingDown size={15} color={crashRisk.level === 'high' ? '#B91C1C' : '#B45309'} style={{ marginTop: '1px', flexShrink: 0 }}/>
              <div style={{ flex: 1 }}>
                <p style={{ color: crashRisk.level === 'high' ? '#991B1B' : '#92400E', fontWeight: 700, fontSize: '13px', marginBottom: '2px' }}>
                  {crashRisk.level === 'high' ? 'High crash risk' : 'Flare pattern detected'}
                </p>
                <p style={{ color: 'rgba(16,22,14,0.52)', fontSize: '12px', lineHeight: 1.55, marginBottom: '3px' }}>{crashRisk.reason}</p>
                <p style={{ color: crashRisk.level === 'high' ? '#B91C1C' : '#B45309', fontSize: '12px', fontWeight: 600 }}>{crashRisk.advice}</p>
              </div>
              <button onClick={() => setCrashRisk(null)} style={{ background: 'none', border: 'none', color: 'rgba(16,22,14,0.22)', fontSize: '17px', cursor: 'pointer', lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Check-in + Recovery */}
        <motion.div variants={fadeUp} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => router.push('/checkin')}
            style={{ background: '#FFFFFF', border: '1px solid rgba(16,22,14,0.08)', borderRadius: '12px', padding: '16px', textAlign: 'left', cursor: 'pointer' }}>
            <p style={{ color: 'rgba(16,22,14,0.36)', fontSize: '10px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px', fontFamily: 'var(--font-mono, monospace)' }}>Daily</p>
            <p style={{ color: checkinToday ? '#2C7A50' : '#0F1A0E', fontSize: '20px', fontWeight: 900, letterSpacing: '-0.8px', lineHeight: 1, marginBottom: '4px' }}>
              {checkinToday ? 'Done ✓' : 'Check in'}
            </p>
            <p style={{ color: checkinToday ? '#2C7A50' : 'rgba(16,22,14,0.3)', fontSize: '11px', fontWeight: 500 }}>
              {checkinToday ? 'Completed today' : streak > 0 ? `${streak}-day streak` : 'Tap to start'}
            </p>
          </motion.button>

          <motion.button whileTap={{ scale: 0.97 }} onClick={() => router.push('/timeline')}
            style={{ background: '#1C3D28', borderRadius: '12px', border: 'none', padding: '16px', textAlign: 'left', cursor: 'pointer' }}>
            <p style={{ color: 'rgba(240,237,229,0.36)', fontSize: '10px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px', fontFamily: 'var(--font-mono, monospace)' }}>Recovery</p>
            {weeksSinceSurgery !== null ? (
              <>
                <p style={{ color: '#F0EDE5', fontSize: '20px', fontWeight: 900, letterSpacing: '-0.8px', lineHeight: 1, marginBottom: '8px' }}>Week {weeksSinceSurgery}</p>
                <div style={{ height: '2px', background: 'rgba(240,237,229,0.12)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${recoveryPct}%`, background: '#4A9E6B', borderRadius: '99px' }}/>
                </div>
              </>
            ) : (
              <>
                <p style={{ color: '#F0EDE5', fontSize: '20px', fontWeight: 900, letterSpacing: '-0.8px', lineHeight: 1 }}>Timeline</p>
                <p style={{ color: 'rgba(240,237,229,0.35)', fontSize: '11px', marginTop: '4px' }}>Recovery plan</p>
              </>
            )}
          </motion.button>
        </motion.div>

        {/* Grouped list: Contacts · Profile · History */}
        <motion.div variants={fadeUp}
          style={{ background: '#FFFFFF', border: '1px solid rgba(16,22,14,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
          {[
            {
              label: 'Emergency contacts',
              sub: emergencyContacts.length > 0 ? `${emergencyContacts.length} contact${emergencyContacts.length > 1 ? 's' : ''} — notified on SOS` : 'No contacts added',
              href: '/emergency-contacts',
              icon: <Users size={15} color="#B91C1C"/>,
              iconBg: 'rgba(185,28,28,0.08)',
            },
            {
              label: 'Medical profile',
              sub: 'Conditions, medications & allergies',
              href: '/medical-profile',
              icon: (
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <path d="M7.5 1.5C4.18 1.5 1.5 4.18 1.5 7.5s2.68 6 6 6 6-2.68 6-6-2.68-6-6-6zm0 1.5a4.5 4.5 0 110 9 4.5 4.5 0 010-9zm.75 2.25h-1.5v2.25H4.5v1.5h2.25V11h1.5V9H10.5V7.5H8.25V5.25z" fill="#1C3D28"/>
                </svg>
              ),
              iconBg: 'rgba(28,61,40,0.08)',
            },
            {
              label: 'Emergency history',
              sub: 'Past SOS events',
              href: '/emergency/history',
              icon: <Clock size={15} color="#566253"/>,
              iconBg: 'rgba(16,22,14,0.06)',
            },
          ].map((item, i, arr) => (
            <motion.button key={item.href} whileTap={{ scale: 0.99 }} onClick={() => router.push(item.href)}
              style={{ width: '100%', background: 'none', border: 'none', padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: i < arr.length - 1 ? '1px solid rgba(16,22,14,0.05)' : 'none' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: item.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {item.icon}
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <p style={{ color: '#0F1A0E', fontWeight: 600, fontSize: '14px', lineHeight: 1.2 }}>{item.label}</p>
                <p style={{ color: 'rgba(16,22,14,0.38)', fontSize: '12px', marginTop: '2px' }}>{item.sub}</p>
              </div>
              <ChevronRight size={14} color="rgba(16,22,14,0.2)" strokeWidth={2}/>
            </motion.button>
          ))}
        </motion.div>

        {/* Medications */}
        <motion.div variants={fadeUp}>
          <motion.button whileTap={{ scale: 0.99 }} onClick={() => router.push('/medications')}
            style={{ background: '#FFFFFF', border: '1px solid rgba(16,22,14,0.08)', borderRadius: '12px', padding: '14px 16px', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: meds.length > 0 ? '10px' : 0 }}>
              <span style={{ color: 'rgba(16,22,14,0.36)', fontSize: '10px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'var(--font-mono, monospace)' }}>Medications</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {profile?.medications?.length > 0 && (
                  <span style={{ background: 'rgba(16,22,14,0.06)', color: 'rgba(16,22,14,0.45)', fontSize: '11px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', fontFamily: 'var(--font-mono, monospace)' }}>
                    {profile.medications.length}
                  </span>
                )}
                <ChevronRight size={14} color="rgba(16,22,14,0.2)" strokeWidth={2}/>
              </div>
            </div>
            {meds.length > 0 ? (
              <div>
                {meds.map((med: any, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '8px 0', borderTop: i > 0 ? '1px solid rgba(16,22,14,0.04)' : 'none' }}>
                    <p style={{ color: '#0F1A0E', fontSize: '14px', fontWeight: 500 }}>{med.name}</p>
                    <p style={{ color: 'rgba(16,22,14,0.32)', fontSize: '12px', fontFamily: 'var(--font-mono, monospace)', marginLeft: '8px', flexShrink: 0 }}>{med.dose}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'rgba(16,22,14,0.28)', fontSize: '13px' }}>No medications added</p>
            )}
          </motion.button>
        </motion.div>

        {/* Care team */}
        <motion.div variants={fadeUp}>
          <motion.button whileTap={{ scale: 0.99 }} onClick={() => router.push('/appointments')}
            style={{ background: '#FFFFFF', border: '1px solid rgba(16,22,14,0.08)', borderRadius: '12px', padding: '14px 16px', cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ color: 'rgba(16,22,14,0.36)', fontSize: '10px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '3px', fontFamily: 'var(--font-mono, monospace)' }}>Care team</p>
              <p style={{ color: '#0F1A0E', fontWeight: 600, fontSize: '14px' }}>Schedule or join a call</p>
            </div>
            <Video size={16} color="rgba(16,22,14,0.28)" strokeWidth={1.8}/>
          </motion.button>
        </motion.div>

        {/* Last check-in */}
        {checkins.length > 0 && (
          <motion.div variants={fadeUp}>
            <motion.button whileTap={{ scale: 0.99 }} onClick={() =>  router.push('/history')}
              style={{ background: '#FFFFFF', border: '1px solid rgba(16,22,14,0.08)', borderRadius: '12px', padding: '14px 16px', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <p style={{ color: 'rgba(16,22,14,0.36)', fontSize: '10px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'var(--font-mono, monospace)' }}>Last check-in</p>
                <ChevronRight size={14} color="rgba(16,22,14,0.2)" strokeWidth={2}/>
              </div>
              <p style={{ color: '#0F1A0E', fontSize: '13px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {checkins[0]?.summary || 'No summary available'}
              </p>
              <p style={{ color: 'rgba(16,22,14,0.3)', fontSize: '11px', marginTop: '6px', fontFamily: 'var(--font-mono, monospace)' }}>
                {new Date(checkins[0]?.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </motion.button>
          </motion.div>
        )}

      </motion.div>

      <BottomNav/>
    </div>
  )
}
