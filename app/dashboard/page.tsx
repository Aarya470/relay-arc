'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { registerPushNotifications } from '@/lib/notifications'
import BottomNav from '@/components/BottomNav'
import { ChevronRight, CheckCircle2, Video, Settings, Phone, Flame, Users, Clock, AlertTriangle, TrendingDown, Sparkles, RefreshCw, Heart, TrendingUp, Pill, Star, Activity, Zap } from 'lucide-react'
// Inline type — mirrors the export in app/api/groq/health-intelligence/route.ts
// (Defined here to avoid bundling server-only imports into the client)
interface HealthIntelligence {
  score: number
  trajectory: 'improving' | 'stable' | 'declining' | 'critical'
  headline: string
  patterns: string[]
  prediction: string
  recommendation: string
  alertCareTeam: boolean
  alertReason: string | null
  dataQuality: 'rich' | 'partial' | 'sparse'
}
import { toast } from 'sonner'
import { analyzeCrashRisk, CrashRisk } from '@/lib/crash-risk'

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG      = '#F4F5F7'
const SURFACE = '#FFFFFF'
const T1      = '#0E1218'
const T2      = '#5B6371'
const T3      = '#9AA2AD'
const ACCENT  = '#0055FF'
const ACCENT_DIM = 'rgba(0,85,255,0.08)'
const RED     = '#D91414'
const RED_DIM = 'rgba(217,20,20,0.07)'
const GREEN   = '#007A44'
const GREEN_DIM = 'rgba(0,122,68,0.08)'
const AMBER   = '#B45309'
const AMBER_DIM = 'rgba(180,83,9,0.08)'
const BORDER  = '#E3E6EC'
const SHADOW  = '0 1px 4px rgba(14,18,24,0.07)'

// ── Weekly Insights types ─────────────────────────────────────────────────────
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
  if (name === 'heart') return <Heart size={size} color="currentColor" strokeWidth={2}/>
  if (name === 'trend') return <TrendingUp size={size} color="currentColor" strokeWidth={2}/>
  if (name === 'pill') return <Pill size={size} color="currentColor" strokeWidth={2}/>
  if (name === 'alert') return <AlertTriangle size={size} color="currentColor" strokeWidth={2}/>
  return <Star size={size} color="currentColor" strokeWidth={2}/>
}

const insightAccent: Record<Insight['type'], { left: string; iconColor: string }> = {
  positive: { left: GREEN,  iconColor: GREEN  },
  tip:      { left: AMBER,  iconColor: AMBER  },
  warning:  { left: RED,    iconColor: RED    },
}

// ─── Health Intelligence Card ────────────────────────────────────────────────

const TRAJECTORY_CONFIG = {
  improving: { color: GREEN,  bg: GREEN_DIM,  label: 'Improving',  icon: TrendingUp  },
  stable:    { color: ACCENT, bg: ACCENT_DIM, label: 'Stable',     icon: Activity    },
  declining: { color: AMBER,  bg: AMBER_DIM,  label: 'Declining',  icon: TrendingDown},
  critical:  { color: RED,    bg: RED_DIM,    label: 'Critical',   icon: Zap         },
} as const

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 28, strokeW = 4
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  return (
    <div style={{ position: 'relative', width: '72px', height: '72px', flexShrink: 0 }}>
      <svg width="72" height="72" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="36" cy="36" r={r} fill="none" stroke={BORDER} strokeWidth={strokeW}/>
        <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth={strokeW}
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}/>
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ color, fontSize: '20px', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1 }}>{score}</span>
        <span style={{ color: T3, fontSize: '8px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', marginTop: '1px' }}>/ 100</span>
      </div>
    </div>
  )
}

function HealthIntelligenceCard({ userId }: { userId: string }) {
  const [intel, setIntel]     = useState<HealthIntelligence | null>(null)
  const [loading, setLoading] = useState(true)
  const [hidden, setHidden]   = useState(false)

  useEffect(() => {
    if (!userId) return
    const fetch_ = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        if (!token) { setHidden(true); return }
        const res = await fetch('/api/groq/health-intelligence', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        })
        if (!res.ok) { setHidden(true); return }
        const { intelligence } = await res.json()
        if (!intelligence) { setHidden(true); return }
        setIntel(intelligence)
      } catch {
        setHidden(true)
      } finally {
        setLoading(false)
      }
    }
    fetch_()
  }, [userId])

  if (hidden) return null

  const cfg = intel ? (TRAJECTORY_CONFIG[intel.trajectory] ?? TRAJECTORY_CONFIG.stable) : null
  const TrajIcon = cfg?.icon ?? Activity

  return (
    <motion.div variants={fadeUp}
      style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '16px', overflow: 'hidden', boxShadow: SHADOW }}>

      {/* Header */}
      <div style={{
        padding: '13px 16px', borderBottom: `1px solid ${BORDER}`,
        display: 'flex', alignItems: 'center', gap: '7px',
      }}>
        <Activity size={12} color={ACCENT} strokeWidth={2.2}/>
        <span style={{ color: T3, fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', fontFamily: 'var(--font-mono, monospace)' }}>
          AI Health Intelligence
        </span>
      </div>

      <div style={{ padding: '16px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[56, 36, 36, 36].map((h, i) => (
              <div key={i} style={{ height: `${h}px`, borderRadius: '8px', background: BG, animation: 'pulse 1.4s ease-in-out infinite' }}/>
            ))}
          </div>
        ) : intel ? (
          <>
            {/* Score + trajectory row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
              <ScoreRing score={intel.score} color={cfg!.color}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  background: cfg!.bg, border: `1px solid ${cfg!.color}22`,
                  borderRadius: '7px', padding: '3px 9px', marginBottom: '7px',
                }}>
                  <TrajIcon size={11} color={cfg!.color} strokeWidth={2.2}/>
                  <span style={{ color: cfg!.color, fontSize: '10px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', fontFamily: 'var(--font-mono, monospace)' }}>
                    {cfg!.label}
                  </span>
                </div>
                <p style={{ color: T1, fontSize: '13px', fontWeight: 600, lineHeight: 1.4, margin: 0 }}>{intel.headline}</p>
              </div>
            </div>

            {/* Patterns */}
            {intel.patterns.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '12px' }}>
                {intel.patterns.map((p, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: '8px',
                    padding: '8px 10px', borderRadius: '8px', background: BG,
                    borderLeft: `3px solid ${BORDER}`,
                  }}>
                    <span style={{ color: T3, fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, marginTop: '1px', flexShrink: 0 }}>{String(i + 1).padStart(2, '0')}</span>
                    <p style={{ color: T2, fontSize: '12px', lineHeight: 1.5, margin: 0 }}>{p}</p>
                  </div>
                ))}
              </div>
            )}

            {/* 48h prediction */}
            {intel.prediction && (
              <div style={{
                padding: '10px 12px', borderRadius: '10px',
                background: ACCENT_DIM, border: `1px solid rgba(0,85,255,0.12)`,
                marginBottom: '10px',
              }}>
                <p style={{ color: T3, fontSize: '9px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'var(--font-mono, monospace)', marginBottom: '4px' }}>Next 48h prediction</p>
                <p style={{ color: ACCENT, fontSize: '12px', lineHeight: 1.55, margin: 0, fontWeight: 500 }}>{intel.prediction}</p>
              </div>
            )}

            {/* Recommendation */}
            {intel.recommendation && (
              <div style={{
                padding: '10px 12px', borderRadius: '10px',
                background: GREEN_DIM, border: `1px solid rgba(0,122,68,0.14)`,
              }}>
                <p style={{ color: T3, fontSize: '9px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'var(--font-mono, monospace)', marginBottom: '4px' }}>Today&apos;s priority</p>
                <p style={{ color: GREEN, fontSize: '12px', lineHeight: 1.55, margin: 0, fontWeight: 600 }}>{intel.recommendation}</p>
              </div>
            )}

            {/* Care team alert */}
            {intel.alertCareTeam && intel.alertReason && (
              <div style={{
                marginTop: '10px', padding: '10px 12px', borderRadius: '10px',
                background: RED_DIM, border: `1px solid rgba(217,20,20,0.18)`,
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <AlertTriangle size={13} color={RED} strokeWidth={2.2} style={{ flexShrink: 0 }}/>
                <p style={{ color: RED, fontSize: '12px', fontWeight: 600, margin: 0 }}>Care team alerted: {intel.alertReason}</p>
              </div>
            )}
          </>
        ) : null}
      </div>
    </motion.div>
  )
}

function WeeklyInsightsCard({ userId }: { userId: string }) {
  const [insights, setInsights] = useState<Insight[] | null>(null)
  const [loading, setLoading]   = useState(true)
  const [spinning, setSpinning] = useState(false)
  const [hidden, setHidden]     = useState(false)

  const fetchInsights = useCallback(async (force = false) => {
    if (!userId) return
    if (!force) {
      try {
        const cached = sessionStorage.getItem(insightCacheKey(userId))
        if (cached) { setInsights(JSON.parse(cached)); setLoading(false); return }
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
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: SHADOW,
      }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px',
        borderBottom: `1px solid ${BORDER}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Sparkles size={13} color={ACCENT} strokeWidth={2}/>
          <span style={{
            color: T3, fontSize: '10px', fontWeight: 700,
            letterSpacing: '1.2px', textTransform: 'uppercase',
            fontFamily: 'var(--font-mono, monospace)',
          }}>
            Weekly Insights
          </span>
        </div>
        <button
          onClick={() => { fetchInsights(true); toast('Refreshing insights…') }}
          disabled={spinning}
          style={{
            background: ACCENT_DIM,
            border: `1px solid rgba(0,85,255,0.14)`,
            borderRadius: '7px',
            cursor: 'pointer',
            padding: '4px 10px',
            display: 'flex', alignItems: 'center', gap: '5px',
            color: ACCENT, fontSize: '11px', fontWeight: 600,
          }}>
          <RefreshCw size={10} style={{ transition: 'transform 0.6s', transform: spinning ? 'rotate(360deg)' : 'none' }}/>
          Refresh
        </button>
      </div>

      <div style={{ padding: '12px 16px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} style={{
              height: '44px', borderRadius: '8px',
              background: BG,
              animation: 'pulse 1.4s ease-in-out infinite',
            }}/>
          ))
        ) : (
          (insights || []).map((ins, i) => {
            const a = insightAccent[ins.type] ?? insightAccent.tip
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: '11px',
                padding: '10px 12px',
                borderRadius: '10px',
                background: BG,
                borderLeft: `3px solid ${a.left}`,
              }}>
                <span style={{ color: a.iconColor, display: 'flex', alignItems: 'center', flexShrink: 0, marginTop: '1px' }}>
                  <InsightIcon name={ins.icon} size={13}/>
                </span>
                <p style={{ color: T2, fontSize: '13px', lineHeight: 1.5, margin: 0 }}>{ins.text}</p>
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

const ease    = { type: 'spring', stiffness: 300, damping: 28 } as const
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
const fadeUp  = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: ease } }

export default function Dashboard() {
  const [profile, setProfile]           = useState<any>(null)
  const [checkins, setCheckins]         = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [userId, setUserId]             = useState('')
  const [upcomingMeeting, setUpcomingMeeting] = useState<any>(null)
  const [installPrompt, setInstallPrompt]     = useState<any>(null)
  const [showIosHint, setShowIosHint]         = useState(false)
  const [crashRisk, setCrashRisk]       = useState<CrashRisk | null>(null)
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
      const upcoming = data.find((a: any) => {
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
    <div style={{ minHeight: '100dvh', background: BG, padding: '60px 20px 80px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {[80, 160, 80, 80, 80].map((h, i) => (
        <div key={i} style={{ height: `${h}px`, borderRadius: '16px', background: '#E3E6EC', animation: 'pulse 1.5s ease-in-out infinite' }}/>
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
  const recoveryPct  = weeksSinceSurgery !== null ? Math.min((weeksSinceSurgery / 12) * 100, 100) : 0
  const meds         = profile?.medications?.slice(0, 3) || []
  const streak       = calcStreak(checkins)
  const emergencyContacts: any[] = profile?.emergency_contacts || []

  const Card = ({ children, onClick, style = {} }: { children: React.ReactNode; onClick?: () => void; style?: React.CSSProperties }) => (
    <motion.div
      variants={fadeUp}
      onClick={onClick}
      style={{
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        borderRadius: '16px',
        boxShadow: SHADOW,
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {children}
    </motion.div>
  )

  return (
    <div style={{ minHeight: '100dvh', background: BG, paddingBottom: '80px' }}>

      {/* Meeting banner */}
      <AnimatePresence>
        {upcomingMeeting && (
          <motion.div
            initial={{ y: -56, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -56, opacity: 0 }}
            transition={ease}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
              background: 'rgba(0,122,68,0.06)',
              borderBottom: `1px solid rgba(0,122,68,0.14)`,
              padding: '48px 20px 14px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              backdropFilter: 'blur(16px)',
            }}>
            <div>
              <p style={{ color: T3, fontSize: '10px', letterSpacing: '1.2px', textTransform: 'uppercase', fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, marginBottom: '2px' }}>Care Team</p>
              <p style={{ color: T1, fontWeight: 700, fontSize: '15px' }}>Your call is ready</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => toast('Care team call — coming soon')}
              style={{
                background: GREEN, color: '#FFFFFF',
                fontWeight: 700, fontSize: '13px',
                padding: '9px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
              <Video size={13}/> Join
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={{ padding: '56px 20px 20px', maxWidth: '640px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: T3, fontSize: '12px', fontWeight: 500, marginBottom: '3px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              {greeting}
            </p>
            <h1 style={{ color: T1, fontSize: '32px', fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1.05, marginBottom: '10px' }}>
              {profile?.full_name?.split(' ')[0]}
            </h1>
            {profile?.diagnosis && (
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {profile.diagnosis.split(',').map((d: string, i: number) => (
                  <span key={i} style={{
                    background: ACCENT_DIM,
                    color: ACCENT,
                    fontSize: '10px', fontWeight: 700,
                    padding: '3px 8px', borderRadius: '6px',
                    fontFamily: 'var(--font-mono, monospace)',
                    letterSpacing: '0.8px', textTransform: 'uppercase',
                    border: `1px solid rgba(0,85,255,0.14)`,
                  }}>
                    {d.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            {streak >= 2 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                background: 'rgba(180,83,9,0.08)',
                border: '1px solid rgba(180,83,9,0.14)',
                borderRadius: '99px', padding: '5px 10px',
              }}>
                <Flame size={12} color={AMBER}/>
                <span style={{ color: AMBER, fontSize: '12px', fontWeight: 800, fontFamily: 'var(--font-mono, monospace)' }}>{streak}</span>
              </div>
            )}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => router.push('/settings')}
              style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: SURFACE, border: `1px solid ${BORDER}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', boxShadow: SHADOW,
              }}>
              <Settings size={15} color={T2}/>
            </motion.button>
          </div>
        </div>
      </motion.div>

      <motion.div
        variants={stagger} initial="hidden" animate="show"
        style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '640px', margin: '0 auto' }}>

        {/* Install banner */}
        {installPrompt && (
          <motion.div variants={fadeUp}
            style={{
              background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '16px',
              padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px',
              boxShadow: SHADOW,
            }}>
            <div style={{ flex: 1 }}>
              <p style={{ color: T1, fontWeight: 700, fontSize: '14px' }}>Add to Home Screen</p>
              <p style={{ color: T2, fontSize: '12px', marginTop: '2px' }}>Install for push notifications</p>
            </div>
            <button
              onClick={async () => { installPrompt.prompt(); const { outcome } = await installPrompt.userChoice; if (outcome === 'accepted') setInstallPrompt(null) }}
              style={{
                background: ACCENT, color: 'white', fontWeight: 700, fontSize: '12px',
                padding: '8px 14px', borderRadius: '9px', border: 'none', cursor: 'pointer', flexShrink: 0,
              }}>
              Install
            </button>
            <button onClick={() => setInstallPrompt(null)}
              style={{ background: 'none', border: 'none', color: T3, fontSize: '20px', cursor: 'pointer', lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
          </motion.div>
        )}

        {/* SOS emergency button */}
        <motion.div variants={fadeUp}>
          <motion.button
            whileTap={{ scale: 0.985 }}
            onClick={() => router.push('/emergency')}
            style={{
              width: '100%',
              background: RED,
              borderRadius: '20px',
              padding: '22px 22px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            <div style={{ textAlign: 'left' }}>
              <p style={{
                color: 'rgba(255,255,255,0.55)',
                fontSize: '10px',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                marginBottom: '8px',
                fontFamily: 'var(--font-mono, monospace)',
                fontWeight: 700,
              }}>Emergency</p>
              <p style={{
                color: '#FFFFFF',
                fontSize: '42px',
                fontWeight: 900,
                letterSpacing: '-2px',
                lineHeight: 1,
                fontFamily: 'var(--font-mono, monospace)',
              }}>SOS</p>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '12px', marginTop: '7px', fontWeight: 500 }}>
                Tap to activate emergency response
              </p>
            </div>
            <div style={{
              width: '54px', height: '54px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Phone size={22} color="white" strokeWidth={2.2}/>
            </div>
          </motion.button>
        </motion.div>

        {/* Crash risk alert */}
        <AnimatePresence>
          {crashRisk && (
            <motion.div
              variants={fadeUp} initial="hidden" animate="show" exit={{ opacity: 0, scale: 0.97 }}
              style={{
                background: crashRisk.level === 'high' ? RED_DIM : AMBER_DIM,
                border: `1px solid ${crashRisk.level === 'high' ? 'rgba(217,20,20,0.18)' : 'rgba(180,83,9,0.18)'}`,
                borderRadius: '14px', padding: '14px 16px',
                display: 'flex', alignItems: 'flex-start', gap: '11px',
              }}>
              <TrendingDown size={15} color={crashRisk.level === 'high' ? RED : AMBER} style={{ marginTop: '2px', flexShrink: 0 }}/>
              <div style={{ flex: 1 }}>
                <p style={{ color: crashRisk.level === 'high' ? RED : AMBER, fontWeight: 700, fontSize: '13px', marginBottom: '3px' }}>
                  {crashRisk.level === 'high' ? 'High crash risk' : 'Flare pattern detected'}
                </p>
                <p style={{ color: T2, fontSize: '12px', lineHeight: 1.6, marginBottom: '4px' }}>{crashRisk.reason}</p>
                <p style={{ color: crashRisk.level === 'high' ? RED : AMBER, fontSize: '12px', fontWeight: 600 }}>{crashRisk.advice}</p>
              </div>
              <button onClick={() => setCrashRisk(null)}
                style={{ background: 'none', border: 'none', color: T3, fontSize: '18px', cursor: 'pointer', lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Check-in + Recovery grid */}
        <motion.div variants={fadeUp} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {/* Check-in card */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push('/checkin')}
            style={{
              background: checkinToday ? GREEN_DIM : SURFACE,
              border: `1px solid ${checkinToday ? 'rgba(0,122,68,0.18)' : BORDER}`,
              borderRadius: '16px',
              padding: '18px 16px',
              textAlign: 'left',
              cursor: 'pointer',
              boxShadow: SHADOW,
            }}>
            <p style={{
              color: checkinToday ? GREEN : T3,
              fontSize: '10px', fontWeight: 700,
              letterSpacing: '1.2px', textTransform: 'uppercase',
              marginBottom: '12px', fontFamily: 'var(--font-mono, monospace)',
            }}>Daily</p>
            <p style={{
              color: checkinToday ? GREEN : T1,
              fontSize: '22px', fontWeight: 900, letterSpacing: '-0.8px', lineHeight: 1, marginBottom: '5px',
            }}>
              {checkinToday ? 'Done ✓' : 'Check in'}
            </p>
            <p style={{ color: checkinToday ? GREEN : T3, fontSize: '11px', fontWeight: 500 }}>
              {checkinToday ? 'Completed today' : streak > 0 ? `${streak}-day streak` : 'Tap to start'}
            </p>
          </motion.button>

          {/* Recovery card */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push('/timeline')}
            style={{
              background: SURFACE,
              borderRadius: '16px',
              border: `1px solid ${BORDER}`,
              padding: '18px 16px',
              textAlign: 'left',
              cursor: 'pointer',
              boxShadow: SHADOW,
            }}>
            <p style={{
              color: ACCENT,
              fontSize: '10px', fontWeight: 700,
              letterSpacing: '1.2px', textTransform: 'uppercase',
              marginBottom: '12px', fontFamily: 'var(--font-mono, monospace)',
            }}>Recovery</p>
            {weeksSinceSurgery !== null ? (
              <>
                <p style={{ color: T1, fontSize: '22px', fontWeight: 900, letterSpacing: '-0.8px', lineHeight: 1, marginBottom: '10px' }}>Week {weeksSinceSurgery}</p>
                <div style={{ height: '4px', background: BG, borderRadius: '99px', overflow: 'hidden', border: `1px solid ${BORDER}` }}>
                  <div style={{ height: '100%', width: `${recoveryPct}%`, background: ACCENT, borderRadius: '99px' }}/>
                </div>
              </>
            ) : (
              <>
                <p style={{ color: T1, fontSize: '22px', fontWeight: 900, letterSpacing: '-0.8px', lineHeight: 1 }}>Timeline</p>
                <p style={{ color: ACCENT, fontSize: '11px', marginTop: '5px', fontW