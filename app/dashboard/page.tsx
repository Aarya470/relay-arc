'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { registerPushNotifications } from '@/lib/notifications'
import BottomNav from '@/components/BottomNav'
import {
  ChevronRight,
  CheckCircle2,
  Video,
  Settings,
  Phone,
  Flame,
  Users,
  Clock,
  AlertTriangle,
  TrendingDown,
  Sparkles,
  RefreshCw,
  Heart,
  TrendingUp,
  Pill,
  Star,
  Activity,
  Zap,
} from 'lucide-react'
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
  alertDelivery: 'recorded' | 'no-care-team' | 'failed' | null
}
import { notch, octagon } from '@/lib/shape'
import { toast } from 'sonner'
// lib/risk is pure and dependency-free, so it is safe in the client bundle —
// unlike the old crash-risk module, which pulled in groq-sdk.
import {
  assessRisk,
  type RiskAssessment,
  type VitalsSample,
  scoreRespRate,
  scoreSpo2,
  scoreSystolic,
  scorePulse,
  scoreTemperature,
  scoreConsciousness,
  scoreSupplementalOxygen,
} from '@/lib/risk'
import { collectNews2, type News2Inputs } from '@/lib/news2/sources'

/** NEWS2 aggregate from whatever parameters are known. Same table as /check. */
function news2Total(n: News2Inputs) {
  const pts = [
    n.resp_rate && scoreRespRate(n.resp_rate.value),
    n.spo2 && scoreSpo2(n.spo2.value),
    n.on_oxygen && scoreSupplementalOxygen(n.on_oxygen.value),
    n.temp_c && scoreTemperature(n.temp_c.value),
    n.systolic && scoreSystolic(n.systolic.value),
    n.pulse && scorePulse(n.pulse.value),
    n.acvpu && scoreConsciousness(n.acvpu.value),
  ].filter((x): x is number => typeof x === 'number')
  const ats = Object.values(n).map((r) => r!.at.getTime())
  return {
    total: pts.reduce((a, b) => a + b, 0),
    count: pts.length,
    updated: ats.length ? new Date(Math.max(...ats)) : null,
  }
}
import { DEMO_PATIENTS, DEMO_CHECKINS, DEMO_VITALS, DEMO_BANNER } from '@/lib/demo-data'
type CrashRisk = RiskAssessment

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG = '#B3DDAC'
const SURFACE = '#FFFFFF'
const T1 = '#141413'
const T2 = '#5C5A52'
const T3 = '#5C5A52'
const ACCENT = '#42623C'
const ACCENT_DIM = 'rgba(86,128,78,0.08)'
const RED = '#A33417'
const RED_DIM = 'rgba(163,52,23,0.07)'
const GREEN = '#42623C'
const GREEN_DIM = 'rgba(86,128,78,0.08)'
const AMBER = '#7C5200'
const AMBER_DIM = 'rgba(168,114,0,0.08)'
const BORDER = '#98C890'
const SHADOW = 'none'

// ── This week types ─────────────────────────────────────────────────────
interface Insight {
  type: 'positive' | 'warning' | 'tip'
  icon: 'heart' | 'trend' | 'pill' | 'star' | 'alert'
  text: string
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

function insightCacheKey(userId: string): string {
  const week = getWeekNumber(new Date())
  const year = new Date().getFullYear()
  return `relay_insights_${userId}_${year}_${week}`
}

function InsightIcon({ name, size = 13 }: { name: Insight['icon']; size?: number }) {
  if (name === 'heart') return <Heart size={size} color="currentColor" strokeWidth={2} />
  if (name === 'trend') return <TrendingUp size={size} color="currentColor" strokeWidth={2} />
  if (name === 'pill') return <Pill size={size} color="currentColor" strokeWidth={2} />
  if (name === 'alert') return <AlertTriangle size={size} color="currentColor" strokeWidth={2} />
  return <Star size={size} color="currentColor" strokeWidth={2} />
}

const insightAccent: Record<Insight['type'], { left: string; iconColor: string }> = {
  positive: { left: GREEN, iconColor: GREEN },
  tip: { left: AMBER, iconColor: AMBER },
  warning: { left: RED, iconColor: RED },
}

// ─── Health Intelligence Card ────────────────────────────────────────────────

const TRAJECTORY_CONFIG = {
  improving: { color: GREEN, bg: GREEN_DIM, label: 'Improving', icon: TrendingUp },
  stable: { color: ACCENT, bg: ACCENT_DIM, label: 'Stable', icon: Activity },
  declining: { color: AMBER, bg: AMBER_DIM, label: 'Declining', icon: TrendingDown },
  critical: { color: RED, bg: RED_DIM, label: 'Critical', icon: Zap },
} as const

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 28,
    strokeW = 4
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  return (
    <div style={{ position: 'relative', width: '72px', height: '72px', flexShrink: 0 }}>
      <svg
        aria-hidden
        focusable={false}
        width="72"
        height="72"
        style={{ transform: 'rotate(-90deg)' }}
      >
        <circle cx="36" cy="36" r={r} fill="none" stroke={BORDER} strokeWidth={strokeW} />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeW}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            color,
            fontSize: '20px',
            fontWeight: 900,
            letterSpacing: '-0.4px',
            lineHeight: 1,
          }}
        >
          {score}
        </span>
        <span
          style={{
            color: T3,
            fontSize: '13px',
            fontWeight: 600,
            letterSpacing: '0',
            marginTop: '1px',
          }}
        >
          / 100
        </span>
      </div>
    </div>
  )
}

function HealthIntelligenceCard({ userId }: { userId: string }) {
  const [intel, setIntel] = useState<HealthIntelligence | null>(null)
  const [loading, setLoading] = useState(true)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    if (!userId) return
    const fetch_ = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        const token = session?.access_token
        if (!token) {
          setHidden(true)
          return
        }
        const res = await fetch('/api/groq/health-intelligence', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          setHidden(true)
          return
        }
        const { intelligence } = await res.json()
        if (!intelligence) {
          setHidden(true)
          return
        }
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

  return (
    <motion.div variants={fadeUp}>
      {/* Label row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: '12px',
        }}
      >
        <p style={{ color: T3, fontSize: '13px', fontWeight: 600, letterSpacing: '0' }}>
          Health score
        </p>
        {intel && cfg && (
          <span style={{ color: cfg.color, fontSize: '12px', fontWeight: 600 }}>{cfg.label}</span>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div
            style={{
              height: '80px',
              borderRadius: '14px',
              background: BORDER,
              width: '40%',
              opacity: 0.5,
            }}
          />
          <div
            style={{
              height: '16px',
              borderRadius: '14px',
              background: BORDER,
              width: '80%',
              opacity: 0.4,
            }}
          />
          <div
            style={{
              height: '16px',
              borderRadius: '14px',
              background: BORDER,
              width: '65%',
              opacity: 0.3,
            }}
          />
        </div>
      ) : intel && cfg ? (
        <>
          {/* Big score + headline */}
          <div
            style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', marginBottom: '20px' }}
          >
            <p
              style={{
                color: cfg.color,
                fontSize: '88px',
                fontFamily: 'inherit',
                fontWeight: 800,
                letterSpacing: '-1.5px',
                lineHeight: 0.85,
                flexShrink: 0,
              }}
            >
              {intel.score}
            </p>
            <p
              style={{
                color: T1,
                fontSize: '15px',
                fontWeight: 600,
                lineHeight: 1.4,
                paddingBottom: '6px',
                flex: 1,
              }}
            >
              {intel.headline}
            </p>
          </div>

          {/* Patterns — plain left-border list */}
          {intel.patterns.length > 0 && (
            <div
              style={{
                borderLeft: `2px solid ${BORDER}`,
                paddingLeft: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                marginBottom: '18px',
              }}
            >
              {intel.patterns.map((p, i) => (
                <p key={i} style={{ color: T2, fontSize: '13px', lineHeight: 1.55, margin: 0 }}>
                  {p}
                </p>
              ))}
            </div>
          )}

          {/* Prediction inline */}
          {intel.prediction && (
            <p style={{ color: T2, fontSize: '13px', lineHeight: 1.6, marginBottom: '10px' }}>
              <span
                style={{
                  color: ACCENT,
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '0',
                  marginRight: '8px',
                }}
              >
                Next 48h
              </span>
              {intel.prediction}
            </p>
          )}

          {/* Recommendation */}
          {intel.recommendation && (
            <p style={{ color: GREEN, fontSize: '13px', fontWeight: 600, lineHeight: 1.55 }}>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '0',
                  marginRight: '8px',
                  opacity: 0.7,
                }}
              >
                Today
              </span>
              {intel.recommendation}
            </p>
          )}

          {/* Care team flag.
              This printed "Care team alerted: <reason>" off the model's own
              boolean. Whether anything reached anybody depends on there being a
              care team row with a push token and on the insert working, and the
              route now says which of those happened. See alertDelivery in
              app/api/groq/health-intelligence/route.ts. */}
          {intel.alertCareTeam && intel.alertReason && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                marginTop: '14px',
                paddingTop: '14px',
                borderTop: `1px solid ${BORDER}`,
              }}
            >
              <AlertTriangle
                size={13}
                color={RED}
                strokeWidth={2.2}
                style={{ flexShrink: 0, marginTop: '2px' }}
              />
              <p
                style={{
                  color: RED,
                  fontSize: '12px',
                  fontWeight: 600,
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {intel.alertDelivery === 'recorded'
                  ? `Flagged for your care team: ${intel.alertReason}`
                  : intel.alertDelivery === 'no-care-team'
                    ? `Worth raising with someone: ${intel.alertReason}. Nobody is set up as your care team, so this has not gone to anyone.`
                    : `Worth raising with someone: ${intel.alertReason}. Passing this to your care team did not work, so tell them yourself.`}
              </p>
            </div>
          )}
        </>
      ) : null}
    </motion.div>
  )
}

function WeeklyInsightsCard({ userId }: { userId: string }) {
  const [insights, setInsights] = useState<Insight[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [spinning, setSpinning] = useState(false)
  const [hidden, setHidden] = useState(false)

  const fetchInsights = useCallback(
    async (force = false) => {
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
          supabase
            .from('checkins')
            .select('summary, mood, created_at')
            .eq('user_id', userId)
            .gte('created_at', since7d)
            .order('created_at', { ascending: false })
            .limit(7),
          // These are the real vitals_logs columns.
          supabase
            .from('vitals_logs')
            .select('heart_rate, systolic, diastolic, oxygen_sat, resp_rate, logged_at')
            .eq('user_id', userId)
            .gte('logged_at', since7d)
            .order('logged_at', { ascending: false })
            .limit(7),
          supabase
            .from('medication_logs')
            .select('taken, created_at')
            .eq('user_id', userId)
            .gte('created_at', since7d)
            .limit(30),
        ])

        const taken = medData?.filter((m: any) => m.taken).length ?? 0
        const total = medData?.length ?? 0
        const adherencePct = total > 0 ? Math.round((taken / total) * 100) : 0

        const {
          data: { session },
        } = await supabase.auth.getSession()
        const token = session?.access_token
        if (!token) {
          setHidden(true)
          return
        }

        const res = await fetch('/api/groq/insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            checkins: checkinData || [],
            vitals: vitalsData || [],
            medicationAdherence: adherencePct,
          }),
        })

        if (!res.ok) {
          setHidden(true)
          return
        }
        const { insights: fresh } = await res.json()
        if (!Array.isArray(fresh) || fresh.length === 0) {
          setHidden(true)
          return
        }

        try {
          sessionStorage.setItem(insightCacheKey(userId), JSON.stringify(fresh))
        } catch {}
        setInsights(fresh)
      } catch {
        if (!insights) setHidden(true)
      } finally {
        setLoading(false)
        setSpinning(false)
      }
    },
    [userId],
  ) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchInsights()
  }, [fetchInsights])

  if (hidden) return null

  return (
    <motion.div variants={fadeUp}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
        }}
      >
        <p style={{ color: T3, fontSize: '13px', fontWeight: 600, letterSpacing: '0' }}>
          This week
        </p>
        <button
          onClick={() => {
            fetchInsights(true)
            toast('Refreshing insights…')
          }}
          disabled={spinning}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            color: ACCENT,
            fontSize: '11px',
            fontWeight: 600,
            padding: 0,
          }}
        >
          <RefreshCw
            size={10}
            style={{
              transition: 'transform 0.6s',
              transform: spinning ? 'rotate(360deg)' : 'none',
            }}
          />
          Refresh
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {loading
          ? [1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  height: '14px',
                  borderRadius: '14px',
                  background: BORDER,
                  opacity: 0.5,
                  marginBottom: '12px',
                  width: `${60 + i * 12}%`,
                }}
              />
            ))
          : (insights || []).map((ins, i) => {
              const a = insightAccent[ins.type] ?? insightAccent.tip
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '11px 0',
                    borderTop: i > 0 ? `1px solid ${BORDER}` : 'none',
                  }}
                >
                  <div
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: a.left,
                      marginTop: '5px',
                      flexShrink: 0,
                    }}
                  />
                  <p style={{ color: T1, fontSize: '14px', lineHeight: 1.55, margin: 0 }}>
                    {ins.text}
                  </p>
                </div>
              )
            })}
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
    if (existing.some((c) => new Date(c.created_at).toDateString() === today)) return
    const now = new Date()
    const hour = now.getHours()
    if (hour < 8 || hour >= 20) return
    const next = new Date(now)
    next.setHours(hour + 1, 0, 0, 0)
    timerId = setTimeout(async () => {
      if (cancelled) return
      try {
        const { supabase: sb } = await import('@/lib/supabase')
        const start = new Date()
        start.setHours(0, 0, 0, 0)
        const { data } = await sb
          .from('checkins')
          .select('id')
          .eq('user_id', userId)
          .gte('created_at', start.toISOString())
          .limit(1)
        if (data?.length) return
        const reg = await navigator.serviceWorker.ready
        await reg.showNotification('Daily check-in', {
          body: "You haven't checked in yet today.",
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          data: { url: '/checkin' },
        } as any)
        schedule([])
      } catch {}
    }, next.getTime() - now.getTime())
  }
  schedule(checkins)
  return () => {
    cancelled = true
    if (timerId) clearTimeout(timerId)
  }
}

function parseTS(ts: string) {
  if (!ts) return new Date()
  return new Date(/[Z+]/.test(ts) ? ts : ts + 'Z')
}

function calcStreak(checkins: any[]): number {
  if (!checkins.length) return 0
  const sorted = [...checkins].sort(
    (a, b) => parseTS(b.created_at).getTime() - parseTS(a.created_at).getTime(),
  )
  const toDay = (d: Date) => d.toDateString()
  const today = toDay(new Date())
  const yesterday = toDay(new Date(Date.now() - 86400000))
  const firstDay = toDay(parseTS(sorted[0].created_at))
  if (firstDay !== today && firstDay !== yesterday) return 0
  const uniqueDays = [...new Set(sorted.map((c) => toDay(parseTS(c.created_at))))]
  let streak = 0
  let cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  for (const day of uniqueDays) {
    if (toDay(cursor) === day) {
      streak++
      cursor = new Date(cursor.getTime() - 86400000)
    } else break
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
  const [news2, setNews2] = useState<{ total: number; count: number; updated: Date | null } | null>(
    null,
  )
  const [isDemo, setIsDemo] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault()
      setInstallPrompt(e)
    }
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
      // ?demo=1 renders this real dashboard against synthetic fixtures so it can
      // be shown or recorded without a login and without a real patient's chart.
      if (
        typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).get('demo') === '1'
      ) {
        setIsDemo(true)
        setProfile(DEMO_PATIENTS[1] as any)
        setCheckins(DEMO_CHECKINS.filter((c) => c.user_id === 'demo-p2') as any)
        setCrashRisk(assessRisk(DEMO_VITALS as VitalsSample[]) as any)
        {
          const latest = (DEMO_VITALS as any[])
            .slice()
            .sort((x, y) => +new Date(y.logged_at) - +new Date(x.logged_at))[0]
          setNews2(
            news2Total(
              collectNews2(
                [{ ...latest, logged_at: new Date().toISOString(), source: 'apple_health' }],
                [
                  {
                    created_at: new Date().toISOString(),
                    summary: 'Felt a bit confused after standing.',
                  },
                ],
              ),
            ),
          )
        }
        setLoading(false)
        return
      }
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUserId(user.id)

      const { data: allActiveEms } = await supabase
        .from('emergencies')
        .select('id, emergency_type, created_at')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
      if (allActiveEms && allActiveEms.length > 0) {
        // If the user explicitly cancelled, never bounce them back into routing —
        // even if the server-side resolve failed (e.g. missing RLS UPDATE policy).
        let userCancelled = false
        try {
          userCancelled =
            Date.now() < Number(sessionStorage.getItem('relay_user_cancelled_until') || 0)
        } catch {}
        const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
        const recentEm =
          !userCancelled && allActiveEms[0].created_at >= fifteenMinAgo ? allActiveEms[0] : null
        const resolveIds = allActiveEms.filter((e) => e.id !== recentEm?.id).map((e) => e.id)
        if (resolveIds.length > 0)
          await supabase.from('emergencies').update({ status: 'resolved' }).in('id', resolveIds)
        if (recentEm) {
          router.push(`/emergency/routing?type=${recentEm.emergency_type}&id=${recentEm.id}`)
          return
        }
      }

      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!data) {
        router.push('/onboarding')
        return
      }
      const { data: c } = await supabase
        .from('checkins')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30)
      setProfile(data)
      try {
        localStorage.setItem('relay_offline_profile', JSON.stringify(data))
      } catch {}
      setCheckins(c || [])
      setLoading(false)
      // Risk is scored locally. The engine is a pure function, so this needs no
      // API round-trip and still works with no signal — and the vitals are cached
      // so a returning offline user gets the same assessment they had last time.
      supabase
        .from('vitals_logs')
        .select('heart_rate, systolic, diastolic, oxygen_sat, resp_rate, logged_at, source')
        .eq('user_id', user.id)
        .gte('logged_at', new Date(Date.now() - 21 * 86400000).toISOString())
        .order('logged_at', { ascending: false })
        .limit(60)
        .then(({ data: vl }) => {
          const samples = (vl || []) as VitalsSample[]
          if (samples.length) {
            try {
              localStorage.setItem('relay_offline_vitals', JSON.stringify(samples))
            } catch {}
          }
          let use = samples
          if (!use.length) {
            try {
              use = JSON.parse(localStorage.getItem('relay_offline_vitals') || '[]')
            } catch {}
          }
          // Live NEWS2 sheet: phone readings, Apple Watch and today's check-in.
          setNews2(news2Total(collectNews2((vl || []) as any, (c || []) as any)))
          const risk = assessRisk(use, { checkinDates: (c || []).map((x: any) => x.created_at) })
          if (risk && risk.level !== 'low') setCrashRisk(risk)
        })
      registerPushNotifications(user.id)
      cleanupReminders = scheduleCheckinReminders(user.id, c || [])
    }
    load()
    return () => {
      cleanupReminders?.()
    }
  }, [])

  useEffect(() => {
    if (!userId) return
    const check = async () => {
      const { data } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', userId)
        .eq('status', 'confirmed')
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

  if (loading)
    return (
      <div
        style={{
          minHeight: '100dvh',
          background: BG,
          padding: '60px 20px 80px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {[80, 160, 80, 80, 80].map((h, i) => (
          <div
            key={i}
            style={{
              height: `${h}px`,
              borderRadius: '4px',
              background: '#98C890',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
        ))}
      </div>
    )

  const weeksSinceSurgery = profile?.surgery_date
    ? Math.floor(
        (Date.now() - new Date(profile.surgery_date).getTime()) / (1000 * 60 * 60 * 24 * 7),
      )
    : null
  const checkinToday =
    checkins.length > 0 &&
    (() => {
      const ts = checkins[0].created_at
      return (
        new Date(/[Z+]/.test(ts) ? ts : ts + 'Z').toLocaleDateString() ===
        new Date().toLocaleDateString()
      )
    })()
  const recoveryPct = weeksSinceSurgery !== null ? Math.min((weeksSinceSurgery / 12) * 100, 100) : 0
  const meds = profile?.medications?.slice(0, 3) || []
  const streak = calcStreak(checkins)
  const emergencyContacts: any[] = profile?.emergency_contacts || []

  const Card = ({
    children,
    onClick,
    style = {},
  }: {
    children: React.ReactNode
    onClick?: () => void
    style?: React.CSSProperties
  }) => (
    <motion.div
      variants={fadeUp}
      onClick={onClick}
      style={{
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        borderRadius: '4px',
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
      {isDemo && (
        <div
          style={{
            background: '#D97757',
            color: '#141413',
            padding: '9px 14px',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0' }}>
            {DEMO_BANNER}
          </span>
        </div>
      )}

      {/* Meeting banner */}
      <AnimatePresence>
        {false && upcomingMeeting && (
          <motion.div
            initial={{ y: -56, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -56, opacity: 0 }}
            transition={ease}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 100,
              background: 'rgba(86,128,78,0.06)',
              borderBottom: `1px solid rgba(86,128,78,0.14)`,
              padding: '48px 20px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backdropFilter: 'blur(16px)',
            }}
          >
            <div>
              <p
                style={{
                  color: T3,
                  fontSize: '13px',
                  letterSpacing: '0',
                  fontWeight: 600,
                  marginBottom: '2px',
                }}
              >
                Care Team
              </p>
              <p style={{ color: T1, fontWeight: 700, fontSize: '15px' }}>Your call is ready</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => toast('Care team call. Coming soon')}
              style={{
                background: GREEN,
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '13px',
                padding: '9px 16px',
                borderRadius: '14px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Video size={13} /> Join
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={{ padding: '56px 20px 20px', maxWidth: '640px', margin: '0 auto' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <p
              style={{
                color: T3,
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '6px',
                letterSpacing: '0',
              }}
            >
              {greeting} ·{' '}
              {new Date().toLocaleDateString('en-US', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}
            </p>
            <h1
              style={{
                color: T1,
                fontSize: '44px',
                fontFamily: 'inherit',
                fontWeight: 800,
                letterSpacing: '-0.4px',
                lineHeight: 1.0,
                marginBottom: '10px',
              }}
            >
              {profile?.full_name?.split(' ')[0]}
            </h1>
            {profile?.diagnosis && (
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {profile.diagnosis.split(',').map((d: string, i: number) => (
                  <span
                    key={i}
                    style={{
                      background: ACCENT_DIM,
                      color: ACCENT,
                      fontSize: '13px',
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: '14px',
                      letterSpacing: '0',
                      border: `1px solid rgba(86,128,78,0.14)`,
                    }}
                  >
                    {d.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
            {streak >= 2 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: 'rgba(168,114,0,0.08)',
                  border: '1px solid rgba(168,114,0,0.14)',
                  borderRadius: '14px',
                  padding: '5px 10px',
                }}
              >
                <Flame size={12} color={AMBER} />
                <span
                  style={{ color: AMBER, fontSize: '12px', fontWeight: 800, fontFamily: 'inherit' }}
                >
                  {streak}
                </span>
              </div>
            )}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => router.push('/settings')}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '14px',
                background: SURFACE,
                border: `1px solid ${BORDER}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Settings size={15} color={T2} />
            </motion.button>
          </div>
        </div>
      </motion.div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        style={{
          padding: '0 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          maxWidth: '640px',
          margin: '0 auto',
        }}
      >
        {/* Install banner */}
        {installPrompt && (
          <motion.div
            variants={fadeUp}
            style={{
              background: SURFACE,
              border: `1px solid ${BORDER}`,
              borderRadius: '4px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: SHADOW,
            }}
          >
            <div style={{ flex: 1 }}>
              <p style={{ color: T1, fontWeight: 700, fontSize: '14px' }}>Add to Home Screen</p>
              <p style={{ color: T2, fontSize: '12px', marginTop: '2px' }}>
                Install for push notifications
              </p>
            </div>
            <button
              onClick={async () => {
                installPrompt.prompt()
                const { outcome } = await installPrompt.userChoice
                if (outcome === 'accepted') setInstallPrompt(null)
              }}
              style={{
                background: ACCENT,
                color: 'white',
                fontWeight: 700,
                fontSize: '12px',
                padding: '8px 14px',
                borderRadius: '14px',
                border: 'none',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              Install
            </button>
            <button
              onClick={() => setInstallPrompt(null)}
              style={{
                background: 'none',
                border: 'none',
                color: T3,
                fontSize: '20px',
                cursor: 'pointer',
                lineHeight: 1,
                padding: 0,
                flexShrink: 0,
              }}
            >
              ×
            </button>
          </motion.div>
        )}

        {/* SOS emergency button */}
        <motion.div variants={fadeUp}>
          <style>{`
            @keyframes sos-pulse {
              0%, 100% { box-shadow: 0 0 0 0 rgba(163,52,23,0.5); }
              50% { box-shadow: 0 0 0 14px rgba(163,52,23,0); }
            }
          `}</style>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/emergency')}
            style={{
              width: '100%',
              background: RED,
              // Chamfered rather than rounded.
              borderRadius: '4px',
              padding: '28px 24px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              animation: 'sos-pulse 2.8s ease-in-out infinite',
            }}
          >
            <div style={{ textAlign: 'left' }}>
              <p
                style={{
                  color: 'rgba(255,255,255,0.50)',
                  fontSize: '13px',
                  letterSpacing: '0',
                  marginBottom: '10px',
                  fontWeight: 600,
                }}
              >
                Emergency Response
              </p>
              <p
                style={{
                  color: '#FFFFFF',
                  fontSize: '64px',
                  fontWeight: 900,
                  letterSpacing: '-1px',
                  lineHeight: 0.9,
                  fontFamily: 'inherit',
                }}
              >
                SOS
              </p>
              <p
                style={{
                  color: 'rgba(255,255,255,0.50)',
                  fontSize: '12px',
                  marginTop: '10px',
                  fontWeight: 500,
                  letterSpacing: '0.2px',
                }}
              >
                Tap to start · Finds a hospital and prepares your details
              </p>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                flexShrink: 0,
              }}
            >
              {/* An octagon, because that is the stop sign, and it is the only
                  shape in this app that means emergency. Nothing else wears it. */}
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.22)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Phone size={24} color="white" strokeWidth={2} />
              </div>
            </div>
          </motion.button>
        </motion.div>

        {/* Readings outside your usual range.
            REGULATORY: this panel deliberately shows the patient their OWN recorded
            measurements and nothing else. It does not show a risk level, a NEWS2
            score, or advice about what to do, because a deterioration
            classification presented to a patient rather than a clinician meets the
            FDA device definition. See docs/INTENDED_USE.md §3 and §6.
            The score IS still computed; it is routed to the care-team surfaces,
            where the audience is a clinician and Criterion 3 is satisfied.
            The engine's level is used here only to decide whether the readings are
            worth surfacing at all, never to label them. Do not reintroduce tiering,
            colour-coding by severity, or `advice` on this screen. */}
        <AnimatePresence>
          {crashRisk && (
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, scale: 0.97 }}
              style={{
                background: SURFACE,
                border: `1px solid ${BORDER}`,
                borderRadius: '4px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '11px',
              }}
            >
              <TrendingDown size={15} color={T3} style={{ marginTop: '2px', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: T1, fontWeight: 700, fontSize: '13px', marginBottom: '3px' }}>
                  Some recent readings are outside your usual range
                </p>

                {/* The patient's own measurements, quoted back with the number.
                    This is their record, not an assessment of it. */}
                {crashRisk.signals?.length ? (
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 7px' }}>
                    {crashRisk.signals.slice(0, 4).map((s) => (
                      <li
                        key={s.code}
                        style={{
                          display: 'flex',
                          gap: '7px',
                          alignItems: 'baseline',
                          marginBottom: '2px',
                        }}
                      >
                        <span style={{ color: T3, fontSize: '12px', flexShrink: 0 }}>·</span>
                        <span style={{ color: T2, fontSize: '12px', lineHeight: 1.5 }}>
                          {s.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <p style={{ color: T2, fontSize: '12px', lineHeight: 1.6 }}>
                  Relay Arc does not assess whether these are serious. Only a clinician can.
                </p>
                <p
                  style={{
                    color: T3,
                    fontSize: '10px',
                    fontFamily: 'inherit',
                    marginTop: '7px',
                    lineHeight: 1.5,
                    letterSpacing: '0.2px',
                  }}
                >
                  If you feel unwell, contact your clinician. In an emergency, call emergency
                  services first.
                </p>
              </div>
              <button
                onClick={() => setCrashRisk(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: T3,
                  fontSize: '18px',
                  cursor: 'pointer',
                  lineHeight: 1,
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* The two things people do every day, as plain buttons. */}
        <motion.div
          variants={fadeUp}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}
        >
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/checkin')}
            style={{
              background: checkinToday ? SURFACE : T1,
              color: checkinToday ? T1 : '#FFFFFF',
              border: `1.5px solid ${T1}`,
              borderRadius: '4px',
              padding: '16px 14px',
              textAlign: 'left',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <p style={{ fontSize: '16px', fontWeight: 700 }}>Daily check-in</p>
            <p style={{ fontSize: '12.5px', opacity: 0.8, marginTop: '3px' }}>
              {checkinToday ? 'Done today ✓' : 'Chat for 2 minutes'}
            </p>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/check')}
            style={{
              background: T1,
              color: '#FFFFFF',
              border: `1.5px solid ${T1}`,
              borderRadius: '4px',
              padding: '16px 14px',
              textAlign: 'left',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <p style={{ fontSize: '16px', fontWeight: 700 }}>Vitals check</p>
            <p style={{ fontSize: '12.5px', opacity: 0.8, marginTop: '3px' }}>
              Pulse and breathing
            </p>
          </motion.button>
        </motion.div>

        {/* Today: plain rows, same as "Your data" below. These were four
            coloured tiles; a list is quicker to read and looks less like a
            template. NEWS2 is still shown as a number for a clinician, with
            no colour banding or advice (same framing as /check). */}
        <motion.div variants={fadeUp}>
          <p style={{ color: T3, fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>Today</p>
          <div style={{ borderTop: `1px solid ${BORDER}` }}>
            {[
              {
                label: 'NEWS2 for your clinician',
                sub:
                  news2 && news2.count
                    ? `${news2.count} of 7 measured${news2.updated ? `, ${news2.updated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}`
                    : 'Nothing in the last 24 h',
                right: news2 && news2.count >= 2 ? String(news2.total) : '–',
                href: '/check',
              },
              {
                label: 'Recovery',
                sub:
                  weeksSinceSurgery !== null
                    ? `${weeksSinceSurgery} weeks post-surgery`
                    : 'Your recovery timeline',
                right: '',
                href: '/timeline',
              },
            ].map((item) => (
              <motion.button
                key={item.label}
                whileTap={{ scale: 0.99 }}
                onClick={() => router.push(item.href)}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  padding: '14px 0',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  borderBottom: `1px solid ${BORDER}`,
                  fontFamily: 'inherit',
                }}
              >
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <p style={{ color: T1, fontWeight: 600, fontSize: '15px', lineHeight: 1.2 }}>
                    {item.label}
                  </p>
                  <p style={{ color: T3, fontSize: '12.5px', marginTop: '2px' }}>{item.sub}</p>
                </div>
                {item.right && (
                  <span
                    style={{
                      color: T1,
                      fontSize: '20px',
                      fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {item.right}
                  </span>
                )}
                <ChevronRight size={14} color={T3} strokeWidth={2} />
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Health Intelligence */}
        {userId && <HealthIntelligenceCard userId={userId} />}

        {/* Weekly AI Insights */}
        {userId && <WeeklyInsightsCard userId={userId} />}

        {/* Quick nav list */}
        <motion.div variants={fadeUp}>
          <p
            style={{
              color: T3,
              fontSize: '13px',
              fontWeight: 600,
              letterSpacing: '0',
              marginBottom: '4px',
            }}
          >
            Your data
          </p>
          <div style={{ borderTop: `1px solid ${BORDER}` }}>
            {[
              {
                label: 'Emergency contacts',
                sub:
                  emergencyContacts.length > 0
                    ? // "Notified on SOS" was not true.
                      `${emergencyContacts.length} contact${emergencyContacts.length > 1 ? 's' : ''}. Ready to text from the SOS screen`
                    : 'No contacts added',
                href: '/emergency-contacts',
                icon: <Users size={15} color={RED} />,
                iconBg: RED_DIM,
              },
              {
                label: 'Medical profile',
                sub: 'Conditions, medications & allergies',
                href: '/medical-profile',
                icon: (
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path
                      d="M7.5 1.5C4.18 1.5 1.5 4.18 1.5 7.5s2.68 6 6 6 6-2.68 6-6-2.68-6-6-6zm0 1.5a4.5 4.5 0 110 9 4.5 4.5 0 010-9zm.75 2.25h-1.5v2.25H4.5v1.5h2.25V11h1.5V9H10.5V7.5H8.25V5.25z"
                      fill={GREEN}
                    />
                  </svg>
                ),
                iconBg: GREEN_DIM,
              },
              {
                label: 'Emergency history',
                sub: 'Past SOS events',
                href: '/emergency/history',
                icon: <Clock size={15} color={T2} />,
                iconBg: BG,
              },
              {
                label: 'Connect Apple Watch',
                sub: 'Readings arrive by themselves, nothing to upload',
                href: '/connect-health',
                icon: <Heart size={15} color={ACCENT} />,
                iconBg: ACCENT_DIM,
              },
            ].map((item, i, arr) => (
              <motion.button
                key={item.href}
                whileTap={{ scale: 0.99 }}
                onClick={() => router.push(item.href)}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  padding: '14px 0',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  borderBottom: `1px solid ${BORDER}`,
                }}
              >
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <p style={{ color: T1, fontWeight: 600, fontSize: '14px', lineHeight: 1.2 }}>
                    {item.label}
                  </p>
                  <p style={{ color: T3, fontSize: '12px', marginTop: '2px' }}>{item.sub}</p>
                </div>
                <ChevronRight size={14} color={T3} strokeWidth={2} />
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Medications — flat section, no card chrome */}
        <motion.div variants={fadeUp}>
          <motion.button
            whileTap={{ scale: 0.99 }}
            onClick={() => router.push('/medications')}
            style={{
              background: 'none',
              border: 'none',
              borderTop: `1px solid ${BORDER}`,
              borderBottom: `1px solid ${BORDER}`,
              padding: '18px 0',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: meds.length > 0 ? '12px' : 0,
              }}
            >
              <p style={{ color: T1, fontSize: '15px', fontWeight: 700, letterSpacing: '-0.2px' }}>
                Medications
                {profile?.medications?.length > 0 && (
                  <span style={{ color: T3, fontSize: '13px', fontWeight: 400, marginLeft: '8px' }}>
                    {profile.medications.length} active
                  </span>
                )}
              </p>
              <ChevronRight size={14} color={T3} strokeWidth={2} />
            </div>
            {meds.length > 0 ? (
              <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                {meds.map((med: any, i: number) => (
                  <div
                    key={i}
                    style={{
                      background: BG,
                      border: `1px solid ${BORDER}`,
                      borderRadius: '14px',
                      padding: '6px 11px',
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: '6px',
                    }}
                  >
                    <span style={{ color: T1, fontSize: '13px', fontWeight: 600 }}>{med.name}</span>
                    {med.dose && (
                      <span style={{ color: T3, fontSize: '11px', fontFamily: 'inherit' }}>
                        {med.dose}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: T3, fontSize: '13px' }}>No medications added</p>
            )}
          </motion.button>
        </motion.div>

        {/* Last check-in — pull-quote style */}
        {checkins.length > 0 && (
          <motion.div variants={fadeUp}>
            <motion.button
              whileTap={{ scale: 0.99 }}
              onClick={() => router.push('/history')}
              style={{
                background: 'none',
                border: 'none',
                paddingLeft: 0,
                paddingRight: 0,
                paddingTop: '2px',
                paddingBottom: '2px',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
                display: 'block',
              }}
            >
              <p
                style={{
                  color: T3,
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '0',
                  marginBottom: '8px',
                }}
              >
                {new Date(checkins[0]?.created_at).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
              <p
                style={{
                  color: T1,
                  fontSize: '16px',
                  lineHeight: 1.55,
                  fontFamily: 'inherit',
                  fontStyle: 'normal',
                  fontWeight: 400,
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {checkins[0]?.summary || 'No summary available'}
              </p>
            </motion.button>
          </motion.div>
        )}
      </motion.div>

      <BottomNav />
    </div>
  )
}
