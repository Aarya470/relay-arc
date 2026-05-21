'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { registerPushNotifications } from '@/lib/notifications'
import BottomNav from '@/components/BottomNav'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, Stethoscope, Pill, Heart, ChevronRight, CheckCircle2, Video } from 'lucide-react'
import { toast } from 'sonner'

function parseTS(ts: string) {
  if (!ts) return new Date()
  return new Date(/[Z+]/.test(ts) ? ts : ts + 'Z')
}

const spring = { type: 'spring', stiffness: 340, damping: 24 } as const
const springFast = { type: 'spring', stiffness: 420, damping: 22 } as const

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: spring },
}

function ArcProgress({ pct, color }: { pct: number; color: string }) {
  const r = 22
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(26,40,32,0.07)" strokeWidth="5"/>
      <motion.circle
        cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="5"
        strokeLinecap="round"
        initial={{ strokeDasharray: `0 ${circ}` }}
        animate={{ strokeDasharray: `${dash} ${circ}` }}
        transition={{ duration: 1.2, delay: 0.4, ease: [0.25, 1, 0.5, 1] }}
      />
    </svg>
  )
}

export default function Dashboard() {
  const [profile, setProfile] = useState<any>(null)
  const [checkins, setCheckins] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  const [upcomingMeeting, setUpcomingMeeting] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      // If there's an active emergency created in the last 15 minutes, route back to it.
      // Resolve everything else (duplicates, stale test rows, anything older than 15 min).
      const { data: allActiveEms } = await supabase
        .from('emergencies')
        .select('id, emergency_type, created_at')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
      if (allActiveEms && allActiveEms.length > 0) {
        const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
        const recentEm = allActiveEms[0].created_at >= fifteenMinAgo ? allActiveEms[0] : null
        // Resolve everything that won't be routed to
        const resolveIds = allActiveEms
          .slice(recentEm ? 1 : 0)
          .map(e => e.id)
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
    <div style={{ minHeight: '100dvh', background: '#F2EFE9', padding: '80px 16px 100px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {[1,2,3].map(i => <Skeleton key={i} style={{ height: '88px', borderRadius: '24px', background: 'rgba(26,40,32,0.06)' }}/>)}
      </div>
    </div>
  )

  const weeksSinceSurgery = profile?.surgery_date
    ? Math.floor((Date.now() - new Date(profile.surgery_date).getTime()) / (1000 * 60 * 60 * 24 * 7))
    : null
  const checkinToday = checkins.length > 0 && new Date(checkins[0].created_at).toDateString() === new Date().toDateString()
  const recoveryPct = weeksSinceSurgery !== null ? Math.min((weeksSinceSurgery / 12) * 100, 100) : 0
  const meds = profile?.medications?.slice(0, 3) || []

  return (
    <div style={{ minHeight: '100dvh', background: '#F2EFE9', paddingBottom: '100px', position: 'relative', overflow: 'hidden' }}>

      {/* Meeting notification banner */}
      <AnimatePresence>
        {upcomingMeeting && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={spring}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'linear-gradient(135deg, #3D6B58, #5C8B74)', padding: '52px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 24px rgba(92,139,116,0.35)' }}
          >
            <div>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '3px' }}>
                {parseTS(upcomingMeeting.scheduled_at) <= new Date() ? 'Live now' : 'Starting soon'}
              </p>
              <p style={{ color: 'white', fontWeight: 700, fontSize: '14px' }}>Your care team call is ready</p>
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => router.push('/appointments')}
              style={{ background: 'white', color: '#3D6B58', fontWeight: 700, fontSize: '12px', padding: '10px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <Video size={13} />
              Join now
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decorative background shapes */}
      <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '320px', height: '320px', background: 'radial-gradient(circle, rgba(255,211,172,0.5) 0%, transparent 65%)', pointerEvents: 'none' }}/>
      <div style={{ position: 'absolute', bottom: '200px', left: '-70px', width: '260px', height: '260px', background: 'radial-gradient(circle, rgba(92,139,116,0.13) 0%, transparent 65%)', pointerEvents: 'none' }}/>
      {/* Large decorative ring */}
      <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '220px', height: '220px', borderRadius: '50%', border: '1.5px solid rgba(255,211,172,0.35)', pointerEvents: 'none' }}/>
      <div style={{ position: 'absolute', top: '10px', right: '10px', width: '140px', height: '140px', borderRadius: '50%', border: '1px solid rgba(255,211,172,0.2)', pointerEvents: 'none' }}/>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        style={{ padding: '56px 20px 20px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <p style={{ color: 'rgba(26,40,32,0.38)', fontSize: '12px', marginBottom: '3px' }}>{greeting}</p>
            <h1 style={{ color: '#1A2820', fontSize: '32px', fontWeight: 900, letterSpacing: '-1.3px', lineHeight: 1 }}>
              {profile?.full_name?.split(' ')[0]}
            </h1>
          </div>
          {/* Avatar — circle with double ring */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ position: 'absolute', inset: '-5px', borderRadius: '50%', border: '1.5px solid rgba(92,139,116,0.2)' }}/>
            <div style={{ position: 'absolute', inset: '-10px', borderRadius: '50%', border: '1px solid rgba(92,139,116,0.1)' }}/>
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #5C8B74 0%, #3D6B58 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(92,139,116,0.28)',
            }}>
              <span style={{ color: '#FFFFFF', fontWeight: 900, fontSize: '20px', letterSpacing: '-0.5px' }}>
                {profile?.full_name?.[0]}
              </span>
            </div>
          </div>
        </div>

        {/* Condition tags — pill shaped */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {profile?.diagnosis?.split(',').map((d: string, i: number) => {
            const colorSet = [
              { bg: 'rgba(92,139,116,0.12)', border: 'rgba(92,139,116,0.24)', text: '#3D6B58' },
              { bg: 'rgba(255,211,172,0.4)', border: 'rgba(196,107,48,0.24)', text: '#A85520' },
              { bg: 'rgba(59,130,246,0.09)', border: 'rgba(59,130,246,0.22)', text: '#2563EB' },
            ]
            const c = colorSet[i % colorSet.length]
            return (
              <span key={i} style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text, fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '99px' }}>
                {d.trim()}
              </span>
            )
          })}
        </div>
      </motion.div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}
      >

        {/* SOS — pill with concentric pulse rings */}
        <motion.div variants={fadeUp}>
          <motion.button
            whileTap={{ scale: 0.97, y: 1 }}
            transition={springFast}
            onClick={() => router.push('/emergency')}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #E8322A 0%, #B01C1C 100%)',
              clipPath: 'polygon(20px 0%, calc(100% - 20px) 0%, 100% 20px, 100% calc(100% - 20px), calc(100% - 20px) 100%, 20px 100%, 0% calc(100% - 20px), 0% 20px)',
              padding: '22px 24px', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              position: 'relative', overflow: 'hidden',
              filter: 'drop-shadow(0 14px 40px rgba(232,50,42,0.3)) drop-shadow(0 4px 12px rgba(232,50,42,0.18))',
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 100%)', pointerEvents: 'none' }}/>
            {/* Decorative diagonal arc inside card */}
            <div style={{ position: 'absolute', right: '-20px', bottom: '-40px', width: '160px', height: '160px', borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.07)', pointerEvents: 'none' }}/>
            <div style={{ position: 'absolute', right: '30px', bottom: '-60px', width: '200px', height: '200px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.05)', pointerEvents: 'none' }}/>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '6px' }}>Emergency routing</p>
              <p style={{ color: 'white', fontSize: '36px', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1 }}>SOS</p>
            </div>
            {/* Triple ring circle icon */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <motion.div
                animate={{ scale: [1, 2.2, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
                style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.3)' }}
              />
              <motion.div
                animate={{ scale: [1, 1.7, 1], opacity: [0.45, 0, 0.45] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.38)' }}
              />
              <div style={{ width: '58px', height: '58px', borderRadius: '50%', background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertCircle size={28} color="white"/>
              </div>
            </div>
          </motion.button>
        </motion.div>

        {/* Check-in + Recovery */}
        <motion.div variants={fadeUp} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

          {/* Check-in — circle icon */}
          <motion.button
            whileTap={{ scale: 0.97, y: 1 }}
            transition={spring}
            onClick={() => router.push('/checkin')}
            style={{
              background: checkinToday
                ? 'linear-gradient(145deg, #E0F0E8 0%, #FFFFFF 100%)'
                : '#FFFFFF',
              border: `1.5px solid ${checkinToday ? 'rgba(92,139,116,0.28)' : 'rgba(26,40,32,0.08)'}`,
              borderRadius: '28px 6px 28px 28px', padding: '18px 16px', textAlign: 'left', cursor: 'pointer',
              boxShadow: checkinToday ? '0 4px 18px rgba(92,139,116,0.14)' : '0 2px 10px rgba(26,40,32,0.06)',
              position: 'relative', overflow: 'hidden',
            }}
          >
            {/* Decorative circle in corner */}
            <div style={{ position: 'absolute', bottom: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: checkinToday ? 'rgba(92,139,116,0.07)' : 'rgba(26,40,32,0.03)', pointerEvents: 'none' }}/>
            {/* Circle icon container */}
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: checkinToday ? 'rgba(92,139,116,0.16)' : 'rgba(26,40,32,0.05)', border: `1.5px solid ${checkinToday ? 'rgba(92,139,116,0.28)' : 'rgba(26,40,32,0.08)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}>
              {checkinToday
                ? <CheckCircle2 size={16} color="#5C8B74"/>
                : <Heart size={15} color="rgba(26,40,32,0.32)"/>
              }
            </div>
            <p style={{ color: checkinToday ? '#5C8B74' : '#1A2820', fontSize: '26px', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1, marginBottom: '6px' }}>
              {checkinToday ? 'Done' : 'Today'}
            </p>
            <p style={{ color: 'rgba(26,40,32,0.32)', fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Check-in</p>
          </motion.button>

          {/* Recovery — circular arc progress */}
          <motion.button
            whileTap={{ scale: 0.97, y: 1 }}
            transition={spring}
            onClick={() => router.push('/timeline')}
            style={{
              background: weeksSinceSurgery !== null
                ? 'linear-gradient(145deg, #FFECD8 0%, #FFFFFF 100%)'
                : '#FFFFFF',
              border: `1.5px solid ${weeksSinceSurgery !== null ? 'rgba(196,107,48,0.2)' : 'rgba(26,40,32,0.08)'}`,
              borderRadius: '6px 28px 28px 28px', padding: '18px 16px', textAlign: 'left', cursor: 'pointer',
              boxShadow: weeksSinceSurgery !== null ? '0 4px 18px rgba(196,107,48,0.1)' : '0 2px 10px rgba(26,40,32,0.06)',
              position: 'relative', overflow: 'hidden',
            }}
          >
            <p style={{ color: 'rgba(26,40,32,0.32)', fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '14px' }}>Recovery</p>
            {weeksSinceSurgery !== null ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Circular arc progress */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <ArcProgress pct={recoveryPct} color="#C46B30"/>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#C46B30', fontWeight: 900, fontSize: '13px', fontFamily: 'var(--font-mono, monospace)', letterSpacing: '-0.5px' }}>
                      {weeksSinceSurgery}
                    </span>
                  </div>
                </div>
                <div>
                  <p style={{ color: 'rgba(26,40,32,0.3)', fontSize: '10px', lineHeight: 1.4 }}>
                    wk of 12
                  </p>
                  <p style={{ color: '#C46B30', fontSize: '12px', fontWeight: 700, marginTop: '2px' }}>
                    {Math.round(recoveryPct)}%
                  </p>
                </div>
              </div>
            ) : (
              <p style={{ color: 'rgba(26,40,32,0.38)', fontSize: '13px' }}>View timeline</p>
            )}
          </motion.button>
        </motion.div>

        {/* Medications */}
        <motion.div variants={fadeUp}>
          <motion.button
            whileTap={{ scale: 0.97, y: 1 }}
            transition={spring}
            onClick={() => router.push('/medications')}
            style={{
              background: meds.length > 0
                ? 'linear-gradient(145deg, rgba(92,139,116,0.07) 0%, #FFFFFF 55%)'
                : '#FFFFFF',
              border: '1.5px solid rgba(26,40,32,0.07)',
              borderRadius: '6px 6px 24px 24px', padding: '18px', textAlign: 'left', cursor: 'pointer', width: '100%',
              boxShadow: '0 2px 12px rgba(26,40,32,0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Diamond-style icon container (rotated square) */}
                <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(92,139,116,0.1)', border: '1px solid rgba(92,139,116,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(45deg)' }}>
                  <Pill size={13} color="#5C8B74" style={{ transform: 'rotate(-45deg)' }}/>
                </div>
                <p style={{ color: 'rgba(26,40,32,0.5)', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>Today&apos;s medications</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {meds.length > 0 && <span style={{ color: 'rgba(26,40,32,0.3)', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)' }}>{meds.length}</span>}
                <ChevronRight size={13} color="rgba(26,40,32,0.28)"/>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {meds.map((med: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: i > 0 ? '11px' : 0, paddingBottom: i < meds.length - 1 ? '11px' : 0, borderBottom: i < meds.length - 1 ? '1px solid rgba(26,40,32,0.05)' : 'none' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: '#1A2820', fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{med.name}</p>
                    <p style={{ color: 'rgba(26,40,32,0.38)', fontSize: '11px', marginTop: '2px' }}>{med.dose} · {med.times?.[0] || med.frequency}</p>
                  </div>
                  {/* Diamond dot accent */}
                  <div style={{ width: '7px', height: '7px', background: 'rgba(92,139,116,0.65)', transform: 'rotate(45deg)', borderRadius: '1px', flexShrink: 0 }}/>
                </div>
              ))}
              {meds.length === 0 && <p style={{ color: 'rgba(26,40,32,0.28)', fontSize: '13px' }}>No medications added</p>}
            </div>
          </motion.button>
        </motion.div>

        {/* Care team */}
        <motion.div variants={fadeUp}>
          <motion.button
            whileTap={{ scale: 0.97, y: 1 }}
            transition={spring}
            onClick={() => toast('Coming soon — your care team will be available here shortly.')}
            style={{
              background: 'linear-gradient(135deg, rgba(92,139,116,0.05) 0%, #FFFFFF 70%)',
              border: '1.5px solid rgba(92,139,116,0.12)',
              borderRadius: '24px 24px 6px 24px', padding: '18px 20px', cursor: 'pointer', textAlign: 'left', width: '100%',
              display: 'flex', alignItems: 'center', gap: '16px',
              boxShadow: '0 2px 10px rgba(26,40,32,0.05)',
              opacity: 0.7,
            }}
          >
            <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(92,139,116,0.08)', border: '1px solid rgba(92,139,116,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Stethoscope size={20} color="#5C8B74"/>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: '#1A2820', fontWeight: 700, fontSize: '14px', letterSpacing: '-0.2px' }}>Care team</p>
              <p style={{ color: 'rgba(26,40,32,0.4)', fontSize: '12px', marginTop: '2px' }}>Coming soon</p>
            </div>
            <span style={{ background: 'rgba(92,139,116,0.1)', border: '1px solid rgba(92,139,116,0.2)', color: '#5C8B74', fontSize: '9px', fontWeight: 700, padding: '3px 8px', borderRadius: '99px', fontFamily: 'monospace', letterSpacing: '0.5px', flexShrink: 0 }}>SOON</span>
          </motion.button>
        </motion.div>

        {/* Last check-in */}

        {checkins.length > 0 && (
          <motion.div
            variants={fadeUp}
            style={{
              background: 'linear-gradient(145deg, rgba(255,211,172,0.14) 0%, #FFFFFF 60%)',
              border: '1.5px solid rgba(196,107,48,0.12)',
              borderRadius: '4px 24px 24px 24px', padding: '16px 18px',
              boxShadow: '0 2px 10px rgba(26,40,32,0.05)',
              position: 'relative', overflow: 'hidden',
            }}
          >
            {/* Decorative half-circle */}
            <div style={{ position: 'absolute', right: '-24px', top: '-24px', width: '80px', height: '80px', borderRadius: '50%', border: '1.5px solid rgba(196,107,48,0.1)', pointerEvents: 'none' }}/>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <p style={{ color: 'rgba(26,40,32,0.38)', fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '1px' }}>Last check-in</p>
              <p style={{ color: 'rgba(26,40,32,0.22)', fontSize: '10px', fontFamily: 'var(--font-mono, monospace)' }}>{new Date(checkins[0].created_at).toLocaleDateString()}</p>
            </div>
            <p style={{ color: 'rgba(26,40,32,0.6)', fontSize: '13px', lineHeight: 1.65, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {checkins[0].summary}
            </p>
          </motion.div>
        )}
      </motion.div>

      <BottomNav/>
    </div>
  )
}
