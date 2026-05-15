'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { registerPushNotifications } from '@/lib/notifications'
import BottomNav from '@/components/BottomNav'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronRight, AlertCircle, Car, Stethoscope, Pill, Heart } from 'lucide-react'

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
  const recoveryPct = weeksSinceSurgery !== null ? Math.min((weeksSinceSurgery / 12) * 100, 100) : 0
  const meds = profile?.medications?.slice(0, 3) || []

  return (
    <div style={{ minHeight: '100vh', background: '#07070E', paddingBottom: '100px', position: 'relative', overflow: 'hidden' }}>

      {/* Ambient glows */}
      <div style={{ position: 'absolute', top: '-60px', left: '-60px', width: '320px', height: '320px', background: 'radial-gradient(circle, rgba(252,181,70,0.06) 0%, transparent 65%)', pointerEvents: 'none' }}/>
      <div style={{ position: 'absolute', bottom: '200px', right: '-80px', width: '250px', height: '250px', background: 'radial-gradient(circle, rgba(128,239,128,0.05) 0%, transparent 65%)', pointerEvents: 'none' }}/>

      {/* Header */}
      <div style={{ padding: '56px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <p style={{ color: 'rgba(237,234,224,0.3)', fontSize: '12px', marginBottom: '3px', letterSpacing: '0.2px' }}>{greeting}</p>
            <h1 style={{ color: '#EDEAE0', fontSize: '28px', fontWeight: 800, letterSpacing: '-1px', lineHeight: 1 }}>
              {profile?.full_name?.split(' ')[0]}
            </h1>
          </div>
          {/* Circular filled avatar */}
          <div style={{
            width: '46px', height: '46px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #fcb546 0%, #f09020 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 0 3px rgba(252,181,70,0.15), 0 6px 20px rgba(252,181,70,0.3)',
            flexShrink: 0
          }}>
            <span style={{ color: '#07070E', fontWeight: 900, fontSize: '19px', letterSpacing: '-0.5px' }}>
              {profile?.full_name?.[0]}
            </span>
          </div>
        </div>

        {/* Condition tags */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {profile?.diagnosis?.split(',').map((d: string, i: number) => {
            const colors = [
              { bg: 'rgba(128,239,128,0.08)', border: 'rgba(128,239,128,0.2)', text: '#80EF80' },
              { bg: 'rgba(74,158,245,0.08)', border: 'rgba(74,158,245,0.2)', text: '#4A9EF5' },
              { bg: 'rgba(252,181,70,0.08)', border: 'rgba(252,181,70,0.2)', text: '#fcb546' },
            ]
            const c = colors[i % colors.length]
            return (
              <span key={i} style={{
                background: c.bg, border: `1px solid ${c.border}`, color: c.text,
                fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '99px', letterSpacing: '0.2px'
              }}>
                {d.trim()}
              </span>
            )
          })}
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
            borderRadius: '22px', padding: '20px', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            position: 'relative', overflow: 'hidden',
            boxShadow: '0 12px 40px rgba(232,50,42,0.35), 0 4px 12px rgba(232,50,42,0.2)'
          }}
        >
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 55%)', pointerEvents: 'none' }}/>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', fontFamily: 'monospace', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '5px' }}>Emergency routing</p>
            <p style={{ color: 'white', fontSize: '30px', fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1 }}>SOS</p>
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle size={26} color="white"/>
            </div>
            <motion.div animate={{ scale: [1, 1.65, 1], opacity: [0.4, 0, 0.4] }} transition={{ duration: 2, repeat: Infinity }}
              style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.35)' }}/>
          </div>
        </motion.button>

        {/* Check-in + Recovery grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>

          {/* Check-in card */}
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => router.push('/checkin')} style={{
            background: checkinToday ? 'rgba(128,239,128,0.05)' : '#0D0D1A',
            border: `1px solid ${checkinToday ? 'rgba(128,239,128,0.2)' : 'rgba(255,255,255,0.07)'}`,
            borderRadius: '20px', padding: '16px', textAlign: 'left', cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <p style={{ color: 'rgba(237,234,224,0.3)', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px' }}>Check-in</p>
              <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: checkinToday ? 'rgba(128,239,128,0.12)' : 'rgba(255,255,255,0.05)', border: `1px solid ${checkinToday ? 'rgba(128,239,128,0.25)' : 'rgba(255,255,255,0.08)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Heart size={12} color={checkinToday ? '#80EF80' : 'rgba(237,234,224,0.25)'} fill={checkinToday ? 'rgba(128,239,128,0.5)' : 'none'}/>
              </div>
            </div>
            <p style={{ color: checkinToday ? '#80EF80' : '#EDEAE0', fontSize: '22px', fontWeight: 800, letterSpacing: '-0.8px', marginBottom: '4px', lineHeight: 1 }}>
              {checkinToday ? 'Done' : 'Today'}
            </p>
            <p style={{ color: 'rgba(237,234,224,0.22)', fontSize: '11px' }}>
              {checkins[0] ? new Date(checkins[0].created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not yet'}
            </p>
          </motion.button>

          {/* Recovery card */}
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => router.push('/timeline')} style={{
            background: '#0D0D1A', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '20px', padding: '16px', textAlign: 'left', cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)'
          }}>
            <p style={{ color: 'rgba(237,234,224,0.3)', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Recovery</p>
            {weeksSinceSurgery !== null ? (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px', marginBottom: '12px' }}>
                  <p style={{ color: '#fcb546', fontSize: '26px', fontWeight: 800, letterSpacing: '-1px', lineHeight: 1 }}>{weeksSinceSurgery}</p>
                  <p style={{ color: 'rgba(237,234,224,0.25)', fontSize: '11px', fontWeight: 500 }}>/ 12 wks</p>
                </div>
                <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${recoveryPct}%` }} transition={{ duration: 1, delay: 0.4, ease: 'easeOut' }}
                    style={{ height: '100%', background: 'linear-gradient(90deg, #fcb546, #f09020)', borderRadius: '99px' }}/>
                </div>
              </>
            ) : (
              <p style={{ color: 'rgba(237,234,224,0.3)', fontSize: '14px', fontWeight: 500 }}>View timeline</p>
            )}
          </motion.button>
        </div>

        {/* Medications */}
        <motion.button whileTap={{ scale: 0.99 }} onClick={() => router.push('/medications')} style={{
          background: '#0D0D1A', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '20px', padding: '16px 18px', textAlign: 'left', cursor: 'pointer', width: '100%',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <p style={{ color: 'rgba(237,234,224,0.3)', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px' }}>Today&apos;s medications</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {meds.length > 0 && <span style={{ color: 'rgba(237,234,224,0.2)', fontSize: '11px' }}>{meds.length}</span>}
              <ChevronRight size={13} color="rgba(237,234,224,0.2)"/>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {meds.map((med: any, i: number) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                paddingTop: i > 0 ? '12px' : 0,
                paddingBottom: i < meds.length - 1 ? '12px' : 0,
                borderBottom: i < meds.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none'
              }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(252,181,70,0.08)', border: '1px solid rgba(252,181,70,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Pill size={14} color="#fcb546"/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: '#EDEAE0', fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{med.name}</p>
                  <p style={{ color: 'rgba(237,234,224,0.3)', fontSize: '11px', marginTop: '2px' }}>{med.dose} · {med.times?.[0] || med.frequency}</p>
                </div>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'rgba(128,239,128,0.5)', border: '1px solid rgba(128,239,128,0.3)', flexShrink: 0 }}/>
              </div>
            ))}
            {meds.length === 0 && <p style={{ color: 'rgba(237,234,224,0.2)', fontSize: '13px' }}>No medications added</p>}
          </div>
        </motion.button>

        {/* Transport + Care team */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => router.push('/transport')} style={{
            background: '#0D0D1A', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '20px', padding: '16px', cursor: 'pointer', textAlign: 'left',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)'
          }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: 'rgba(74,158,245,0.1)', border: '1px solid rgba(74,158,245,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
              <Car size={18} color="#4A9EF5"/>
            </div>
            <p style={{ color: '#EDEAE0', fontWeight: 700, fontSize: '13px', marginBottom: '3px' }}>Need a ride</p>
            <p style={{ color: 'rgba(237,234,224,0.28)', fontSize: '11px' }}>Community transport</p>
          </motion.button>

          <motion.button whileTap={{ scale: 0.97 }} onClick={() => router.push('/appointments')} style={{
            background: '#0D0D1A', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '20px', padding: '16px', cursor: 'pointer', textAlign: 'left',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)'
          }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: 'rgba(128,239,128,0.1)', border: '1px solid rgba(128,239,128,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
              <Stethoscope size={18} color="#80EF80"/>
            </div>
            <p style={{ color: '#EDEAE0', fontWeight: 700, fontSize: '13px', marginBottom: '3px' }}>Care team</p>
            <p style={{ color: 'rgba(237,234,224,0.28)', fontSize: '11px' }}>Schedule a visit</p>
          </motion.button>
        </div>

        {/* Last check-in */}
        {checkins.length > 0 && (
          <div style={{ background: '#0D0D1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '16px 18px', boxShadow: '0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <p style={{ color: 'rgba(237,234,224,0.3)', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px' }}>Last check-in</p>
              <p style={{ color: 'rgba(237,234,224,0.18)', fontSize: '10px', fontFamily: 'monospace' }}>{new Date(checkins[0].created_at).toLocaleDateString()}</p>
            </div>
            <p style={{ color: 'rgba(237,234,224,0.55)', fontSize: '13px', lineHeight: 1.65, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {checkins[0].summary}
            </p>
          </div>
        )}
      </div>

      <BottomNav/>
    </div>
  )
}
