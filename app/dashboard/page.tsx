'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { registerPushNotifications } from '@/lib/notifications'
import BottomNav from '@/components/BottomNav'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronRight, CheckCircle2, Video, Settings, Phone, Flame, Users, Clock, AlertTriangle, TrendingDown, Sparkles, RefreshCw, Heart, TrendingUp, Pill, Star } from 'lucide-react'
import { toast } from 'sonner'
import { analyzeCrashRisk, CrashRisk } from '@/lib/crash-risk'

// ── Weekly Insights types ────────────────────────────────────────────────────
interface Insight {
  type: 'positive' | 'warning' | 'tip'
  icon: 'heart' | 'trend' | 'pill' | 'star' | 'alert'
  text: string
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function insightCacheKey(userId: string): string {
  const week = getWeekNumber(new Date())
  const year = new Date().getFullYear()
  return `relay_insights_${userId}_${year}_${week}`
}

function InsightIcon({ name, size = 13 }: { name: Insight['icon']; size?: number }) {
  const color = 'currentColor'
  if (name === 'heart') return <Heart size={size} color={color} strokeWidth={2}/>
  if (name === 'trend') return <TrendingUp size={size} color={color} strokeWidth={2}/>
  if (name === 'pill') return <Pill size={size} color={color} strokeWidth={2}/>
  if (name === 'alert') return <AlertTriangle size={size} color={color} strokeWidth={2}/>
  return <Star size={size} color={color} strokeWidth={2}/>
}

const insightAccent: Record<Insight['type'], { border: string; dot: string; iconColor: string }> = {
  positive: { border: '#00D68F', dot: '#00D68F', iconColor: '#00D68F' },
  tip:      { border: '#F59E0B', dot: '#F59E0B', iconColor: '#F59E0B' },
  warning:  { border: '#FF3737', dot: '#FF3737', iconColor: '#FF3737' },
}

function WeeklyInsightsCard({ userId }: { userId: string }) {
  const [insights, setInsights] = useState<Insight[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [spinning, setSpinning] = useState(false)
  const [hidden, setHidden] = useState(false)

  const fetchInsights = useCallback(async (force = false) => {
    if (!userId) return
    if (!force) {
      try {
        const cached = sessionStorage.getItem(insightCacheKey(userId))
        if (cached) {
          setInsights(JSON.parse(cached))
          setLoading(false)
          return
        }
      } catch {}
    }

    setSpinning(true)
    try {
      const since7d = new Date(Date.now() - 7 * 86400000).toISOString()

      const [{ data: checkinData }, { data: vitalsData }, { data: medData }] = await Promise.all([
        supabase.from('checkins').select('summary, mood, created_at').eq('user_id', userId).gte('created_at', since7d).order('created_at', { ascending: false }).limit(7),
        supabase.from('vitals_logs').select('heart_rate, blood_pressure_systolic, blood_pressure_diastolic, weight_kg, created_at').eq('user_id', userId).gte('created_at', since7d).order('created_at', { ascending: false }).limit(7),
        supabase.from('medication_logs').select('taken, created_at').eq('user_id', userId).gte('created_at', since7d).limit(30),
      ])

      const taken = medData?.filter((m: any) => m.taken).length ?? 0
      const total = medData?.length ?? 0
      const adherencePct = total > 0 ? Math.round((taken / total) * 100) : 0

      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) { setHidden(true); return }

      const res = await fetch('/api/groq/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ checkins: checkinData || [], vitals: vitalsData || [], medicationAdherence: adherencePct }),
      })

      if (!res.ok) { setHidden(true); return }
      const { insights: fresh } = await res.json()
      if (!Array.isArray(fresh) || fresh.length === 0) { setHidden(true); return }

      try { sessionStorage.setItem(insightCacheKey(userId), JSON.stringify(fresh)) } catch {}
      setInsights(fresh)
    } catch {
      if (!insights) setHidden(true)
    } finally {
      setLoading(false)
      setSpinning(false)
    }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchInsights() }, [fetchInsights])

  if (hidden) return null

  return (
    <motion.div variants={fadeUp}
      style={{
        background: '#121220',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '16px',
        overflow: 'hidden',
      }}>
      {/* Card header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Sparkles size={13} color="#4F8EF7" strokeWidth={2}/>
          <span style={{
            color: '#505068',
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            fontFamily: 'var(--font-mono, monospace)',
          }}>
            Weekly Insights
          </span>
        </div>
        <button
          onClick={() => { fetchInsights(true); toast('Refreshing insights…') }}
          disabled={spinning}
          style={{
            background: 'rgba(79,142,247,0.10)',
            border: '1px solid rgba(79,142,247,0.18)',
            borderRadius: '6px',
            cursor: 'pointer',
            padding: '4px 9px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            color: '#4F8EF7',
            fontSize: '11px',
            fontWeight: 600,
          }}>
          <RefreshCw size={10} style={{ transition: 'transform 0.6s', transform: spinning ? 'rotate(360deg)' : 'none' }}/>
          Refresh
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} style={{ height: '40px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.4s ease-in-out infinite' }}/>
          ))
        ) : (
          (insights || []).map((ins, i) => {
            const accent = insightAccent[ins.type] ?? insightAccent.tip
            return (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '11px',
                padding: '10px 12px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.03)',
                borderLeft: `3px solid ${accent.border}`,
              }}>
                <span style={{ color: accent.iconColor, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <InsightIcon name={ins.icon} size={13}/>
                </span>
                <p style={{ color: '#EEEEF8', fontSize: '13px', lineHeight: 1.5, margin: 0 }}>{ins.text}</p>
              </div>
            )
          })
        )}
      </div>
    </motion.div>
  )
}

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
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
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
    let cleanupReminders: (() => void) | undefined
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
      cleanupReminders = scheduleCheckinReminders(user.id, c || [])
    }
    load()
    return () => { cleanupReminders?.() }
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
    <div style={{ minHeight: '100dvh', background: '#070710', padding: '60px 20px 80px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {[80, 160, 80, 80, 80].map((h, i) => (
        <Skeleton key={i} style={{ height: `${h}px`, borderRadius: '16px', background: 'rgba(255,255,255,0.05)' }}/>
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
    <div style={{ minHeight: '100dvh', background: '#070710', paddingBottom: '80px' }}>

      {/* Meeting banner */}
      <AnimatePresence>
        {upcomingMeeting && (
          <motion.div initial={{ y: -56, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -56, opacity: 0 }} transition={ease}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
              background: 'rgba(0,214,143,0.10)',
              borderBottom: '1px solid rgba(0,214,143,0.20)',
              padding: '48px 20px 14px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              backdropFilter: 'blur(16px)',
            }}>
            <div>
              <p style={{ color: '#505068', fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, marginBottom: '2px' }}>Care Team</p>
              <p style={{ color: '#EEEEF8', fontWeight: 700, fontSize: '15px' }}>Your call is ready</p>
            </div>
            <motion.button whileTap={{ scale: 0.95 }}
              onClick={() => toast('Care team call — coming soon')}
              style={{
                background: '#00D68F',
                color: '#070710',
                fontWeight: 700,
                fontSize: '13px',
                padding: '9px 16px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
              <Video size={13}/> Join
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' }}
        style={{ padding: '56px 20px 24px', maxWidth: '640px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: '#505068', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>
              {greeting}
            </p>
            <h1 style={{
              color: '#EEEEF8',
              fontSize: '30px',
              fontWeight: 900,
              letterSpacing: '-1.5px',
              lineHeight: 1.05,
              marginBottom: '10px',
            }}>
              {profile?.full_name?.split(' ')[0]}
            </h1>
            {profile?.diagnosis && (
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {profile.diagnosis.split(',').map((d: string, i: number) => (
                  <span key={i} style={{
                    background: 'rgba(79,142,247,0.10)',
                    color: '#4F8EF7',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '8px',
                    fontFamily: 'var(--font-mono, monospace)',
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    border: '1px solid rgba(79,142,247,0.18)',
                  }}>
                    {d.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
            {streak >= 2 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                background: 'rgba(245,158,11,0.12)',
                border: '1px solid rgba(245,158,11,0.22)',
                borderRadius: '99px',
                padding: '5px 10px',
              }}>
                <Flame size={12} color="#F59E0B"/>
                <span style={{ color: '#F59E0B', fontSize: '12px', fontWeight: 800, fontFamily: 'var(--font-mono, monospace)' }}>{streak}</span>
              </div>
            )}
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => router.push('/settings')}
              style={{
                width: '36px', height: '36px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}>
              <Settings size={15} color="#8888A8"/>
            </motion.button>
          </div>
        </div>
      </motion.div>

      <motion.div variants={stagger} initial="hidden" animate="show"
        style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '640px', margin: '0 auto' }}>

        {/* Install banner */}
        {installPrompt && (
          <motion.div variants={fadeUp}
            style={{
              background: '#121220',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '16px',
              padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: '12px',
            }}>
            <div style={{ flex: 1 }}>
              <p style={{ color: '#EEEEF8', fontWeight: 700, fontSize: '14px' }}>Add to Home Screen</p>
              <p style={{ color: '#8888A8', fontSize: '12px', marginTop: '2px' }}>Install for push notifications</p>
            </div>
            <button
              onClick={async () => { installPrompt.prompt(); const { outcome } = await installPrompt.userChoice; if (outcome === 'accepted') setInstallPrompt(null) }}
              style={{
                background: '#4F8EF7',
                color: '#070710',
                fontWeight: 700,
                fontSize: '12px',
                padding: '8px 14px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                flexShrink: 0,
              }}>
              Install
            </button>
            <button onClick={() => setInstallPrompt(null)}
              style={{ background: 'none', border: 'none', color: '#505068', fontSize: '20px', cursor: 'pointer', lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
          </motion.div>
        )}

        {/* SOS emergency button */}
        <motion.div variants={fadeUp}>
          <motion.button whileTap={{ scale: 0.98 }} onClick={() => router.push('/emergency')}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #330000 0%, #1A0000 100%)',
              borderRadius: '22px',
              padding: '24px 22px',
              border: '1px solid rgba(255,55,55,0.20)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            <div style={{ textAlign: 'left' }}>
              <p style={{
                color: 'rgba(255,55,55,0.60)',
                fontSize: '10px',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                marginBottom: '10px',
                fontFamily: 'var(--font-mono, monospace)',
                fontWeight: 700,
              }}>Emergency</p>
              <p style={{
                color: '#FF3737',
                fontSize: '40px',
                fontWeight: 900,
                letterSpacing: '-2px',
                lineHeight: 1,
                fontFamily: 'var(--font-mono, monospace)',
              }}>SOS</p>
              <p style={{ color: 'rgba(255,55,55,0.45)', fontSize: '12px', marginTop: '8px', fontWeight: 500 }}>Tap to activate emergency response</p>
            </div>
            <div style={{
              width: '52px', height: '52px',
              borderRadius: '50%',
              background: '#FF3737',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 0 24px rgba(255,55,55,0.40)',
            }}>
              <Phone size={22} color="white" strokeWidth={2.2}/>
            </div>
          </motion.button>
        </motion.div>

        {/* Crash risk alert */}
        <AnimatePresence>
          {crashRisk && (
            <motion.div variants={fadeUp} initial="hidden" animate="show" exit={{ opacity: 0, scale: 0.97 }}
              style={{
                background: crashRisk.level === 'high' ? 'rgba(255,55,55,0.07)' : 'rgba(245,158,11,0.07)',
                border: `1px solid ${crashRisk.level === 'high' ? 'rgba(255,55,55,0.22)' : 'rgba(245,158,11,0.22)'}`,
                borderRadius: '16px',
                padding: '14px 16px',
                display: 'flex', alignItems: 'flex-start', gap: '11px',
              }}>
              <TrendingDown size={15} color={crashRisk.level === 'high' ? '#FF3737' : '#F59E0B'} style={{ marginTop: '2px', flexShrink: 0 }}/>
              <div style={{ flex: 1 }}>
                <p style={{
                  color: crashRisk.level === 'high' ? '#FF3737' : '#F59E0B',
                  fontWeight: 700,
                  fontSize: '13px',
                  marginBottom: '3px',
                }}>
                  {crashRisk.level === 'high' ? 'High crash risk' : 'Flare pattern detected'}
                </p>
                <p style={{ color: '#8888A8', fontSize: '12px', lineHeight: 1.6, marginBottom: '4px' }}>{crashRisk.reason}</p>
                <p style={{ color: crashRisk.level === 'high' ? '#FF3737' : '#F59E0B', fontSize: '12px', fontWeight: 600 }}>{crashRisk.advice}</p>
              </div>
              <button onClick={() => setCrashRisk(null)}
                style={{ background: 'none', border: 'none', color: '#505068', fontSize: '18px', cursor: 'pointer', lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Check-in + Recovery grid */}
        <motion.div variants={fadeUp} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => router.push('/checkin')}
            style={{
              background: checkinToday
                ? 'linear-gradient(135deg, #003322 0%, #001A14 100%)'
                : '#121220',
              border: checkinToday
                ? '1px solid rgba(0,214,143,0.22)'
                : '1px solid rgba(255,255,255,0.06)',
              borderRadius: '16px',
              padding: '18px 16px',
              textAlign: 'left',
              cursor: 'pointer',
            }}>
            <p style={{
              color: checkinToday ? 'rgba(0,214,143,0.55)' : '#505068',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              marginBottom: '12px',
              fontFamily: 'var(--font-mono, monospace)',
            }}>Daily</p>
            <p style={{
              color: checkinToday ? '#00D68F' : '#EEEEF8',
              fontSize: '22px',
              fontWeight: 900,
              letterSpacing: '-0.8px',
              lineHeight: 1,
              marginBottom: '5px',
            }}>
              {checkinToday ? 'Done ✓' : 'Check in'}
            </p>
            <p style={{
              color: checkinToday ? 'rgba(0,214,143,0.65)' : '#505068',
              fontSize: '11px',
              fontWeight: 500,
            }}>
              {checkinToday ? 'Completed today' : streak > 0 ? `${streak}-day streak` : 'Tap to start'}
            </p>
          </motion.button>

          <motion.button whileTap={{ scale: 0.97 }} onClick={() => router.push('/timeline')}
            style={{
              background: 'linear-gradient(135deg, #0A0A22 0%, #07071A 100%)',
              borderRadius: '16px',
              border: '1px solid rgba(79,142,247,0.18)',
              padding: '18px 16px',
              textAlign: 'left',
              cursor: 'pointer',
            }}>
            <p style={{
              color: 'rgba(79,142,247,0.55)',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              marginBottom: '12px',
              fontFamily: 'var(--font-mono, monospace)',
            }}>Recovery</p>
            {weeksSinceSurgery !== null ? (
              <>
                <p style={{ color: '#EEEEF8', fontSize: '22px', fontWeight: 900, letterSpacing: '-0.8px', lineHeight: 1, marginBottom: '10px' }}>Week {weeksSinceSurgery}</p>
                <div style={{ height: '3px', background: 'rgba(79,142,247,0.15)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${recoveryPct}%`, background: '#4F8EF7', borderRadius: '99px' }}/>
                </div>
              </>
            ) : (
              <>
                <p style={{ color: '#EEEEF8', fontSize: '22px', fontWeight: 900, letterSpacing: '-0.8px', lineHeight: 1 }}>Timeline</p>
                <p style={{ color: '#4F8EF7', fontSize: '11px', marginTop: '5px', fontWeight: 500 }}>Recovery plan</p>
              </>
            )}
          </motion.button>
        </motion.div>

        {/* Weekly AI Insights */}
        {userId && <WeeklyInsightsCard userId={userId}/>}

        {/* Grouped list: Contacts · Profile · History */}
        <motion.div variants={fadeUp}
          style={{
            background: '#121220',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '16px',
            overflow: 'hidden',
          }}>
          {[
            {
              label: 'Emergency contacts',
              sub: emergencyContacts.length > 0 ? `${emergencyContacts.length} contact${emergencyContacts.length > 1 ? 's' : ''} — notified on SOS` : 'No contacts added',
              href: '/emergency-contacts',
              icon: <Users size={15} color="#FF3737"/>,
              iconBg: 'rgba(255,55,55,0.10)',
            },
            {
              label: 'Medical profile',
              sub: 'Conditions, medications & allergies',
              href: '/medical-profile',
              icon: (
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <path d="M7.5 1.5C4.18 1.5 1.5 4.18 1.5 7.5s2.68 6 6 6 6-2.68 6-6-2.68-6-6-6zm0 1.5a4.5 4.5 0 110 9 4.5 4.5 0 010-9zm.75 2.25h-1.5v2.25H4.5v1.5h2.25V11h1.5V9H10.5V7.5H8.25V5.25z" fill="#00D68F"/>
                </svg>
              ),
              iconBg: 'rgba(0,214,143,0.10)',
            },
            {
              label: 'Emergency history',
              sub: 'Past SOS events',
              href: '/emergency/history',
              icon: <Clock size={15} color="#8888A8"/>,
              iconBg: 'rgba(255,255,255,0.06)',
            },
          ].map((item, i, arr) => (
            <motion.button key={item.href} whileTap={{ scale: 0.99 }} onClick={() => router.push(item.href)}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                padding: '15px 18px',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '14px',
                borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              }}>
              <div style={{
                width: '34px', height: '34px',
                borderRadius: '10px',
                background: item.iconBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {item.icon}
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <p style={{ color: '#EEEEF8', fontWeight: 600, fontSize: '14px', lineHeight: 1.2 }}>{item.label}</p>
                <p style={{ color: '#8888A8', fontSize: '12px', marginTop: '2px' }}>{item.sub}</p>
              </div>
              <ChevronRight size={14} color="#505068" strokeWidth={2}/>
            </motion.button>
          ))}
        </motion.div>

        {/* Medications */}
        <motion.div variants={fadeUp}>
          <motion.button whileTap={{ scale: 0.99 }} onClick={() => router.push('/medications')}
            style={{
              background: '#121220',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '16px',
              padding: '16px 18px',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: meds.length > 0 ? '12px' : 0 }}>
              <span style={{
                color: '#505068',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-mono, monospace)',
              }}>Medications</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                {profile?.medications?.length > 0 && (
                  <span style={{
                    background: 'rgba(255,255,255,0.07)',
                    color: '#8888A8',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '6px',
                    fontFamily: 'var(--font-mono, monospace)',
                  }}>
                    {profile.medications.length}
                  </span>
                )}
                <ChevronRight size={14} color="#505068" strokeWidth={2}/>
              </div>
            </div>
            {meds.length > 0 ? (
              <div>
                {meds.map((med: any, i: number) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
                    padding: '9px 0',
                    borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}>
                    <p style={{ color: '#EEEEF8', fontSize: '14px', fontWeight: 500 }}>{med.name}</p>
                    <p style={{
                      color: '#505068',
                      fontSize: '12px',
                      fontFamily: 'var(--font-mono, monospace)',
                      marginLeft: '8px',
                      flexShrink: 0,
                    }}>{med.dose}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#505068', fontSize: '13px' }}>No medications added</p>
            )}
          </motion.button>
        </motion.div>

        {/* Care team */}
        <motion.div variants={fadeUp}>
          <motion.button whileTap={{ scale: 0.99 }} onClick={() => router.push('/appointments')}
            style={{
              background: '#121220',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '16px',
              padding: '16px 18px',
              cursor: 'pointer',
              width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
            <div>
              <p style={{
                color: '#505068',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                marginBottom: '4px',
                fontFamily: 'var(--font-mono, monospace)',
              }}>Care Team</p>
              <p style={{ color: '#EEEEF8', fontWeight: 600, fontSize: '15px' }}>Schedule or join a call</p>
            </div>
            <div style={{
              width: '38px', height: '38px',
              borderRadius: '10px',
              background: 'rgba(79,142,247,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Video size={16} color="#4F8EF7" strokeWidth={1.8}/>
            </div>
          </motion.button>
        </motion.div>

        {/* Last check-in */}
        {checkins.length > 0 && (
          <motion.div variants={fadeUp}>
            <motion.button whileTap={{ scale: 0.99 }} onClick={() => router.push('/history')}
              style={{
                background: '#121220',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '16px',
                padding: '16px 18px',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <p style={{
                  color: '#505068',
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-mono, monospace)',
                }}>Last Check-in</p>
                <ChevronRight size={14} color="#505068" strokeWidth={2}/>
              </div>
              <p style={{
                color: '#EEEEF8',
                fontSize: '13px',
                lineHeight: 1.6,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {checkins[0]?.summary || 'No summary available'}
              </p>
              <p style={{
                color: '#505068',
                fontSize: '11px',
                marginTop: '8px',
                fontFamily: 'var(--font-mono, monospace)',
              }}>
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
