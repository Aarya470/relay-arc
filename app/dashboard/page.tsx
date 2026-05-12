'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { registerPushNotifications } from '@/lib/notifications'
import BottomNav from '@/components/BottomNav'
import { Skeleton } from '@/components/ui/skeleton'
import { Bell, ChevronRight, AlertCircle } from 'lucide-react'

export default function Dashboard() {
  const [profile, setProfile] = useState<any>(null)
  const [checkins, setCheckins] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!data) { router.push('/onboarding'); return }

      const { data: checkinsData } = await supabase
        .from('checkins')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3)

      setProfile(data)
      setCheckins(checkinsData || [])
      setLoading(false)
      registerPushNotifications(user.id)
    }
    load()
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  if (loading) return (
    <div className="min-h-screen bg-[#09090C] px-4 py-8 pb-24">
      <div className="space-y-4">
        <Skeleton className="h-20 w-full rounded-3xl bg-white/5"/>
        <Skeleton className="h-32 w-full rounded-3xl bg-white/5"/>
        <Skeleton className="h-48 w-full rounded-3xl bg-white/5"/>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#09090C] pb-24">

      {/* Header */}
      <div className="px-5 pt-14 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white/40 text-sm">{greeting}</p>
            <h1 className="text-white text-2xl font-bold tracking-tight mt-0.5">
              {profile?.full_name?.split(' ')[0]}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <motion.div
              whileTap={{ scale: 0.9 }}
              className="w-10 h-10 rounded-2xl bg-white/6 border border-white/8 flex items-center justify-center cursor-pointer"
              onClick={() => router.push('/nurse')}
            >
              <Bell size={18} className="text-white/60"/>
            </motion.div>
            <div className="w-10 h-10 rounded-2xl bg-[#fcb546]/20 border border-[#fcb546]/30 flex items-center justify-center">
              <span className="text-[#fcb546] font-bold text-sm">
                {profile?.full_name?.[0]}
              </span>
            </div>
          </div>
        </div>

        {/* Condition badge */}
        <div className="flex gap-2 mt-3 flex-wrap">
          {profile?.diagnosis?.split(',').map((d: string, i: number) => (
            <span key={i} className="bg-[#80EF80]/10 border border-[#80EF80]/20 text-[#80EF80] text-xs px-3 py-1 rounded-full font-medium">
              {d.trim()}
            </span>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-3">

        {/* SOS Button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push('/emergency')}
          className="w-full relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 to-red-700 p-5 flex items-center justify-between"
        >
          <div>
            <p className="text-white text-2xl font-bold tracking-wide">SOS</p>
            <p className="text-red-200/80 text-xs mt-0.5">Tap to activate emergency routing</p>
          </div>
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center">
              <AlertCircle size={28} className="text-white"/>
            </div>
            <div className="absolute inset-0 rounded-full bg-white/20 animate-ping"/>
          </div>
        </motion.button>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push('/checkin')}
            className="bg-[#111116] border border-white/8 rounded-3xl p-4 cursor-pointer"
          >
            <p className="text-white/40 text-xs font-mono uppercase tracking-wider mb-2">Today's check-in</p>
            <p className={`text-xl font-bold ${checkins.length > 0 ? 'text-[#80EF80]' : 'text-white/40'}`}>
              {checkins.length > 0 ? 'Done ✓' : 'Pending'}
            </p>
            <p className="text-white/30 text-xs mt-1">
              {checkins[0] ? new Date(checkins[0].created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Tap to check in'}
            </p>
          </motion.div>

          <motion.div
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push('/timeline')}
            className="bg-[#111116] border border-white/8 rounded-3xl p-4 cursor-pointer"
          >
            <p className="text-white/40 text-xs font-mono uppercase tracking-wider mb-2">Recovery</p>
            {profile?.surgery_date ? (
              <>
                <p className="text-[#fcb546] text-xl font-bold">
                  Week {Math.floor((Date.now() - new Date(profile.surgery_date).getTime()) / (1000 * 60 * 60 * 24 * 7))}
                </p>
                <div className="mt-2 h-1.5 bg-white/8 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#fcb546] rounded-full"
                    style={{ width: `${Math.min((Math.floor((Date.now() - new Date(profile.surgery_date).getTime()) / (1000 * 60 * 60 * 24 * 7)) / 12) * 100, 100)}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="text-white/40 text-sm">View timeline</p>
            )}
          </motion.div>
        </div>

        {/* Medications */}
        <motion.div
          whileTap={{ scale: 0.99 }}
          onClick={() => router.push('/medications')}
          className="bg-[#111116] border border-white/8 rounded-3xl p-4 cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-white/40 text-xs font-mono uppercase tracking-wider">Medications</p>
            <ChevronRight size={14} className="text-white/30"/>
          </div>
          <div className="space-y-2.5">
            {profile?.medications?.slice(0, 3).map((med: any, i: number) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#fcb546]/10 border border-[#fcb546]/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs">💊</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{med.name}</p>
                  <p className="text-white/30 text-xs">{med.dose} · {med.frequency}</p>
                </div>
                <span className="text-white/20 text-xs font-mono">
                  {med.times?.[0] || 'Daily'}
                </span>
              </div>
            ))}
            {(!profile?.medications || profile.medications.length === 0) && (
              <p className="text-white/30 text-sm">No medications added</p>
            )}
          </div>
        </motion.div>

        {/* Community transport */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push('/transport')}
            style={{ background: '#111116', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '16px', cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>🚗</span>
            <p style={{ color: 'white', fontWeight: 600, fontSize: '13px', marginBottom: '2px' }}>Need a ride</p>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>Request community transport</p>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push('/driver')}
            style={{ background: '#111116', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '16px', cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>🤝</span>
            <p style={{ color: 'white', fontWeight: 600, fontSize: '13px', marginBottom: '2px' }}>Help someone</p>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>Be a community driver</p>
          </motion.button>
        </div>

        {/* Recent check-in */}
        {checkins.length > 0 && (
          <div className="bg-[#111116] border border-white/8 rounded-3xl p-4">
            <p className="text-white/40 text-xs font-mono uppercase tracking-wider mb-3">Last check-in</p>
            <p className="text-white/70 text-sm leading-relaxed line-clamp-3">{checkins[0].summary}</p>
            <p className="text-white/25 text-xs font-mono mt-2">
              {new Date(checkins[0].created_at).toLocaleDateString()}
            </p>
          </div>
        )}

      </div>

      <BottomNav/>
    </div>
  )
}
