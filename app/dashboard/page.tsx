'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { registerPushNotifications } from '@/lib/notifications'
import BottomNav from '@/components/BottomNav'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, Car, Stethoscope, Pill, Heart, ChevronRight } from 'lucide-react'

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

export default function Dashboard() {
  const [profile, setProfile] = useState<any>(null)
  const [checkins, setCheckins] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
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

      {/* Ambient blobs */}
      <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(255,211,172,0.45) 0%, transparent 65%)', pointerEvents: 'none' }}/>
      <div style={{ position: 'absolute', bottom: '200px', left: '-60px', width: '240px', height: '240px', background: 'radial-gradient(circle, rgba(92,139,116,0.12) 0%, transparent 65%)', pointerEvents: 'none' }}/>

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
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #5C8B74 0%, #3D6B58 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 0 3px rgba(92,139,116,0.18), 0 4px 16px rgba(92,139,116,0.22)',
          }}>
            <span style={{ color: '#FFFFFF', fontWeight: 900, fontSize: '20px', letterSpacing: '-0.5px' }}>
              {profile?.full_name?.[0]}
            </span>
          </div>
        </div>

        {/* Condition tags */}
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

        {/* SOS — dramatic, pill-shaped */}
        <motion.div variants={fadeUp}>
          <motion.button
            whileTap={{ scale: 0.97, y: 1 }}
            transition={springFast}
            onClick={() => router.push('/emergency')}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #E8322A 0%, #B01C1C 100%)',
              borderRadius: '28px', padding: '22px 24px', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              position: 'relative', overflow: 'hidden',
              boxShadow: '0 14px 40px rgba(232,50,42,0.3), 0 4px 12px rgba(232,50,42,0.18), inset 0 1px 0 rgba(255,255,255,0.14)',
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 100%)', pointerEvents: 'none' }}/>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '6px' }}>Emergency routing</p>
              <p style={{ color: 'white', fontSize: '36px', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1 }}>SOS</p>
            </div>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: '58px', height: '58px', borderRadius: '50%', background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertCircle size={28} color="white"/>
              </div>
              <motion.div
                animate={{ scale: [1, 1.8, 1], opacity: [0.45, 0, 0.45] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.38)' }}
              />
            </div>
          </motion.button>
        </motion.div>

        {/* Check-in + Recovery — gradient cards */}
        <motion.div variants={fadeUp} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

          {/* Check-in card */}
          <motion.button
            whileTap={{ scale: 0.97, y: 1 }}
            transition={spring}
            onClick={() => router.push('/checkin')}
            style={{
              background: checkinToday
                ? 'linear-gradient(145deg, #E0F0E8 0%, #FFFFFF 100%)'
                : '#FFFFFF',
              border: `1.5px solid ${checkinToday ? 'rgba(92,139,116,0.28)' : 'rgba(26,40,32,0.08)'}`,
              borderRadius: '24px', padding: '18px 16px', textAlign: 'left', cursor: 'pointer',
              boxShadow: checkinToday
                ? '0 4px 18px rgba(92,139,116,0.14)'
                : '0 2px 10px rgba(26,40,32,0.06)',
            }}
          >
            <div style={{ width: '34px', height: '34px', borderRadius: '11px', background: checkinToday ? 'rgba(92,139,116,0.16)' : 'rgba(26,40,32,0.05)', border: `1px solid ${checkinToday ? 'rgba(92,139,116,0.28)' : 'rgba(26,40,32,0.08)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              <Heart size={15} color={checkinToday ? '#5C8B74' : 'rgba(26,40,32,0.32)'} fill={checkinToday ? 'rgba(92,139,116,0.4)' : 'none'}/>
            </div>
            <p style={{ color: checkinToday ? '#5C8B74' : '#1A2820', fontSize: '26px', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1, marginBottom: '6px' }}>
              {checkinToday ? 'Done' : 'Today'}
            </p>
            <p style={{ color: 'rgba(26,40,32,0.32)', fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Check-in</p>
          </motion.button>

          {/* Recovery card — peach gradient */}
          <motion.button
            whileTap={{ scale: 0.97, y: 1 }}
            transition={spring}
            onClick={() => router.push('/timeline')}
            style={{
              background: weeksSinceSurgery !== null
                ? 'linear-gradient(145deg, #FFECD8 0%, #FFFFFF 100%)'
                : '#FFFFFF',
              border: `1.5px solid ${weeksSinceSurgery !== null ? 'rgba(196,107,48,0.2)' : 'rgba(26,40,32,0.08)'}`,
              borderRadius: '24px', padding: '18px 16px', textAlign: 'left', cursor: 'pointer',
              boxShadow: weeksSinceSurgery !== null
                ? '0 4px 18px rgba(196,107,48,0.1)'
                : '0 2px 10px rgba(26,40,32,0.06)',
            }}
          >
            <p style={{ color: 'rgba(26,40,32,0.32)', fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '20px' }}>Recovery</p>
            {weeksSinceSurgery !== null ? (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', marginBottom: '10px' }}>
                  <p style={{ color: '#C46B30', fontSize: '36px', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1 }}>{weeksSinceSurgery}</p>
                  <p style={{ color: 'rgba(26,40,32,0.3)', fontSize: '12px' }}>/ 12</p>
                </div>
                <div style={{ height: '4px', background: 'rgba(26,40,32,0.08)', borderRadius: '99px', overflow: 'hidden' }}>
                  <motion.div
                    initial={{ scaleX: 0 }} animate={{ scaleX: recoveryPct / 100 }}
                    transition={{ duration: 1, delay: 0.5, ease: [0.25, 1, 0.5, 1] }}
                    style={{ height: '100%', width: '100%', background: 'linear-gradient(90deg, #C46B30, #E8944A)', borderRadius: '99px', transformOrigin: 'left' }}
                  />
                </div>
              </>
            ) : (
              <p style={{ color: 'rgba(26,40,32,0.38)', fontSize: '13px' }}>View timeline</p>
            )}
          </motion.button>
        </motion.div>

        {/* Medications — eucalyptus-tinted gradient */}
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
              borderRadius: '22px', padding: '18px', textAlign: 'left', cursor: 'pointer', width: '100%',
              boxShadow: '0 2px 12px rgba(26,40,32,0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '9px', background: 'rgba(92,139,116,0.1)', border: '1px solid rgba(92,139,116,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Pill size={14} color="#5C8B74"/>
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
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(92,139,116,0.65)', flexShrink: 0 }}/>
                </div>
              ))}
              {meds.length === 0 && <p style={{ color: 'rgba(26,40,32,0.28)', fontSize: '13px' }}>No medications added</p>}
            </div>
          </motion.button>
        </motion.div>

        {/* Transport + Care — stacked horizontal, elongated */}
        <motion.div variants={fadeUp} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <motion.button
            whileTap={{ scale: 0.97, y: 1 }}
            transition={spring}
            onClick={() => router.push('/transport')}
            style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, #FFFFFF 70%)',
              border: '1.5px solid rgba(59,130,246,0.16)',
              borderRadius: '22px', padding: '18px 20px', cursor: 'pointer', textAlign: 'left', width: '100%',
              display: 'flex', alignItems: 'center', gap: '16px',
              boxShadow: '0 2px 10px rgba(26,40,32,0.05)',
            }}
          >
            <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Car size={20} color="#3B82F6"/>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: '#1A2820', fontWeight: 700, fontSize: '14px', letterSpacing: '-0.2px' }}>Need a ride</p>
              <p style={{ color: 'rgba(26,40,32,0.4)', fontSize: '12px', marginTop: '2px' }}>Community transport to hospital</p>
            </div>
            <ChevronRight size={15} color="rgba(26,40,32,0.22)"/>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97, y: 1 }}
            transition={spring}
            onClick={() => router.push('/appointments')}
            style={{
              background: 'linear-gradient(135deg, rgba(92,139,116,0.09) 0%, #FFFFFF 70%)',
              border: '1.5px solid rgba(92,139,116,0.18)',
              borderRadius: '22px', padding: '18px 20px', cursor: 'pointer', textAlign: 'left', width: '100%',
              display: 'flex', alignItems: 'center', gap: '16px',
              boxShadow: '0 2px 10px rgba(26,40,32,0.05)',
            }}
          >
            <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(92,139,116,0.1)', border: '1px solid rgba(92,139,116,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Stethoscope size={20} color="#5C8B74"/>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: '#1A2820', fontWeight: 700, fontSize: '14px', letterSpacing: '-0.2px' }}>Care team</p>
              <p style={{ color: 'rgba(26,40,32,0.4)', fontSize: '12px', marginTop: '2px' }}>Schedule a visit or call</p>
            </div>
            <ChevronRight size={15} color="rgba(26,40,32,0.22)"/>
          </motion.button>
        </motion.div>

        {/* Last check-in — soft gradient */}
        {checkins.length > 0 && (
          <motion.div
            variants={fadeUp}
            style={{
              background: 'linear-gradient(145deg, rgba(255,211,172,0.14) 0%, #FFFFFF 60%)',
              border: '1.5px solid rgba(196,107,48,0.12)',
              borderRadius: '20px', padding: '16px 18px',
              boxShadow: '0 2px 10px rgba(26,40,32,0.05)',
            }}
          >
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
