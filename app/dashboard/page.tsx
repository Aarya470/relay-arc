'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { registerPushNotifications } from '@/lib/notifications'
import BottomNav from '@/components/BottomNav'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronRight, AlertCircle } from 'lucide-react'

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
    <div style={{ minHeight: '100vh', background: '#07070E', padding: '80px 16px 100px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {[1,2,3].map(i => <Skeleton key={i} style={{ height: '80px', borderRadius: '20px', background: 'rgba(255,255,255,0.04)' }}/>)}
      </div>
    </div>
  )

  const weeksSinceSurgery = profile?.surgery_date
    ? Math.floor((Date.now() - new Date(profile.surgery_date).getTime()) / (1000 * 60 * 60 * 24 * 7))
    : null
  const checkinToday = checkins.length > 0 && new Date(checkins[0].created_at).toDateString() === new Date().toDateString()

  return (
    <div style={{ minHeight: '100vh', background: '#07070E', paddingBottom: '100px', position: 'relative', overflow: 'hidden' }}>

      {/* Ambient glow */}
      <div style={{ position: 'absolute', top: 0, left: '-50px', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(252,181,70,0.05) 0%, transparent 70%)', pointerEvents: 'none' }}/>

      {/* Header */}
      <div style={{ padding: '56px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <p style={{ color: 'rgba(237,234,224,0.35)', fontSize: '13px', marginBottom: '2px' }}>{greeting}</p>
            <h1 style={{ color: '#EDEAE0', fontSize: '26px', fontWeight: 800, letterSpacing: '-0.8px' }}>
              {profile?.full_name?.split(' ')[0]}
            </h1>
          </div>
          <div style={{
            width: '42px', height: '42px', borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(252,181,70,0.2), rgba(252,181,70,0.1))',
            border: '1px solid rgba(252,181,70,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <span style={{ color: '#fcb546', fontWeight: 800, fontSize: '16px' }}>
              {profile?.full_name?.[0]}
            </span>
          </div>
        </div>

        {/* Condition tags */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {profile?.diagnosis?.split(',').map((d: string, i: number) => (
            <span key={i} style={{
              background: 'rgba(128,239,128,0.08)',
              border: '1px solid rgba(128,239,128,0.18)',
              color: '#80EF80',
              fontSize: '11px', fontWeight: 600,
              padding: '4px 10px', borderRadius: '99px',
              letterSpacing: '0.2px'
            }}>
              {d.trim()}
            </span>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

        {/* SOS BUTTON */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push('/emergency')}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #E8322A 0%, #C42020 100%)',
            borderRadius: '22px',
            padding: '20px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 12px 40px rgba(232,50,42,0.35), 0 4px 12px rgba(232,50,42,0.2)'
          }}
        >
          {/* Shimmer */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 60%)', pointerEvents: 'none' }}/>

          <div>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '11px', fontFamily: 'monospace', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>
              Emergency routing
            </p>
            <p style={{ color: 'white', fontSize: '28px', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1 }}>SOS</p>
          </div>

          <div style={{ position: 'relative' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle size={26} color="white"/>
            </div>
            <motion.div
              animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)' }}
            />
          </div>
        </motion.button>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>

          {/* Check-in */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push('/checkin')}
            style={{
              background: checkinToday ? 'rgba(128,239,128,0.06)' : '#0F0F18',
              border: `1px solid ${checkinToday ? 'rgba(128,239,128,0.18)' : 'rgba(255,255,255,0.07)'}`,
              borderRadius: '20px', padding: '16px',
              textAlign: 'left', cursor: 'pointer'
            }}
          >
            <p style={{ color: 'rgba(237,234,224,0.35)', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
              Check-in
            </p>
            <p style={{ color: checkinToday ? '#80EF80' : 'rgba(237,234,224,0.4)', fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '4px' }}>
              {checkinToday ? 'Done ✓' : 'Pending'}
            </p>
            <p style={{ color: 'rgba(237,234,224,0.2)', fontSize: '11px' }}>
              {checkins[0] ? new Date(checkins[0].created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Tap to check in'}
            </p>
          </motion.button>

          {/* Recovery */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push('/timeline')}
            style={{ background: '#0F0F18', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '16px', textAlign: 'left', cursor: 'pointer' }}
          >
            <p style={{ color: 'rgba(237,234,224,0.35)', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
              Recovery
            </p>
            {weeksSinceSurgery !== null ? (
              <>
                <p style={{ color: '#fcb546', fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '6px' }}>
                  Week {weeksSinceSurgery}
                </p>
                <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min((weeksSinceSurgery / 12) * 100, 100)}%`, background: 'linear-gradient(90deg, #fcb546, #f09020)', borderRadius: '99px' }}/>
                </div>
              </>
            ) : (
              <p style={{ color: 'rgba(237,234,224,0.3)', fontSize: '14px' }}>View timeline →</p>
            )}
          </motion.button>
        </div>

        {/* Medications */}
        <motion.button
          whileTap={{ scale: 0.99 }}
          onClick={() => router.push('/medications')}
          style={{ background: '#0F0F18', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '16px', textAlign: 'left', cursor: 'pointer', width: '100%' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <p style={{ color: 'rgba(237,234,224,0.35)', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px' }}>Today&apos;s medications</p>
            <ChevronRight size={14} color="rgba(237,234,224,0.2)"/>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {profile?.medications?.slice(0, 3).map((med: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(252,181,70,0.08)', border: '1px solid rgba(252,181,70,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '14px' }}>💊</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: '#EDEAE0', fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{med.name}</p>
                  <p style={{ color: 'rgba(237,234,224,0.3)', fontSize: '11px' }}>{med.dose} · {med.times?.[0] || med.frequency}</p>
                </div>
              </div>
            ))}
            {(!profile?.medications || profile.medications.length === 0) && (
              <p style={{ color: 'rgba(237,234,224,0.25)', fontSize: '13px' }}>No medications added</p>
            )}
          </div>
        </motion.button>

        {/* Community + Appointments */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => router.push('/transport')}
            style={{ background: '#0F0F18', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '16px', cursor: 'pointer', textAlign: 'left' }}>
            <span style={{ fontSize: '22px', display: 'block', marginBottom: '8px' }}>🚗</span>
            <p style={{ color: '#EDEAE0', fontWeight: 600, fontSize: '13px', marginBottom: '2px' }}>Need a ride</p>
            <p style={{ color: 'rgba(237,234,224,0.3)', fontSize: '11px' }}>Community transport</p>
          </motion.button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => router.push('/appointments')}
            style={{ background: '#0F0F18', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '16px', cursor: 'pointer', textAlign: 'left' }}>
            <span style={{ fontSize: '22px', display: 'block', marginBottom: '8px' }}>🩺</span>
            <p style={{ color: '#EDEAE0', fontWeight: 600, fontSize: '13px', marginBottom: '2px' }}>Care team</p>
            <p style={{ color: 'rgba(237,234,224,0.3)', fontSize: '11px' }}>Schedule a visit</p>
          </motion.button>
        </div>

        {/* Last check-in preview */}
        {checkins.length > 0 && (
          <div style={{ background: '#0F0F18', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '16px' }}>
            <p style={{ color: 'rgba(237,234,224,0.3)', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Last check-in</p>
            <p style={{ color: 'rgba(237,234,224,0.6)', fontSize: '13px', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {checkins[0].summary}
            </p>
            <p style={{ color: 'rgba(237,234,224,0.2)', fontSize: '10px', fontFamily: 'monospace', marginTop: '8px' }}>
              {new Date(checkins[0].created_at).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>

      <BottomNav/>
    </div>
  )
}
