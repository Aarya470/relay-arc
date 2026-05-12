'use client'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { ChevronRight, Navigation, Phone } from 'lucide-react'
import { Suspense } from 'react'

const Nav = dynamic(() => import('@/components/Navigation'), { ssr: false })

const HOSPITAL_DATABASE: Record<string, { capability: string; hospitals: any[] }> = {
  chest_pain: {
    capability: 'Cardiac catheterization lab',
    hospitals: [
      { name: 'Capital Health Regional', address: '750 Brunswick Ave, Trenton NJ', lat: 40.2115, lng: -74.7451, distance: '18 min' },
      { name: 'Robert Wood Johnson University', address: '1 RWJ Pl, New Brunswick NJ', lat: 40.4958, lng: -74.4479, distance: '22 min' },
    ]
  },
  stroke: {
    capability: 'Comprehensive stroke center',
    hospitals: [
      { name: 'Penn Medicine Princeton Medical', address: '1 Plainsboro Rd, Plainsboro NJ', lat: 40.3315, lng: -74.5693, distance: '20 min' },
    ]
  },
  pots: {
    capability: 'Autonomic disorders unit',
    hospitals: [
      { name: 'Penn Medicine Princeton Medical', address: '1 Plainsboro Rd, Plainsboro NJ', lat: 40.3315, lng: -74.5693, distance: '20 min' },
    ]
  },
  unconscious: {
    capability: 'Level 1 trauma center',
    hospitals: [
      { name: 'Capital Health Regional', address: '750 Brunswick Ave, Trenton NJ', lat: 40.2115, lng: -74.7451, distance: '18 min' },
    ]
  },
  breathing: {
    capability: 'Pulmonary emergency unit',
    hospitals: [
      { name: 'Robert Wood Johnson University', address: '1 RWJ Pl, New Brunswick NJ', lat: 40.4958, lng: -74.4479, distance: '22 min' },
    ]
  },
  mecfs: {
    capability: 'Emergency stabilization',
    hospitals: [
      { name: 'Penn Medicine Princeton Medical', address: '1 Plainsboro Rd, Plainsboro NJ', lat: 40.3315, lng: -74.5693, distance: '20 min' },
    ]
  },
  other: {
    capability: 'Emergency care',
    hospitals: [
      { name: 'Penn Medicine Princeton Medical', address: '1 Plainsboro Rd, Plainsboro NJ', lat: 40.3315, lng: -74.5693, distance: '20 min' },
    ]
  }
}

function RoutingPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const type = searchParams.get('type') || 'other'
  const hospitalData = HOSPITAL_DATABASE[type] || HOSPITAL_DATABASE.other
  const hospital = hospitalData.hospitals[0]
  const [alertSent, setAlertSent] = useState(false)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      setTimeout(() => setAlertSent(true), 2500)
    }
    load()
  }, [])

  return (
    <div className="min-h-screen bg-[#070710] flex flex-col">

      {/* Alert bar */}
      <div className="bg-red-600 px-5 py-2.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <motion.div
            className="w-2 h-2 rounded-full bg-white"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span className="text-white font-mono text-xs tracking-wider uppercase">Emergency active</span>
        </div>
        <span className="bg-white/20 text-white font-mono text-xs px-2.5 py-1 rounded-full">Active</span>
      </div>

      {/* Map — takes most of screen */}
      <div style={{ height: '420px', flex: 1 }}>
        <Nav hospital={hospital}/>
      </div>

      {/* Bottom sheet */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, type: 'spring', bounce: 0.2 }}
        className="bg-[#09090C] border-t border-white/8 px-4 py-4 space-y-3"
      >
        {/* Hospital info */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-white/40 font-mono text-xs uppercase tracking-wider mb-0.5">Routing to</p>
            <h2 className="text-white font-bold text-base leading-tight">{hospital.name}</h2>
            <p className="text-white/35 text-xs mt-0.5">{hospitalData.capability}</p>
          </div>
          <div className="bg-red-500/15 border border-red-500/25 rounded-2xl px-3 py-2 text-center ml-3">
            <p className="text-red-400 font-bold text-xl font-mono">{hospital.distance}</p>
            <p className="text-red-400/60 text-xs font-mono">ETA</p>
          </div>
        </div>

        {/* ER Status */}
        <motion.div
          animate={{
            borderColor: alertSent ? 'rgba(128,239,128,0.25)' : 'rgba(255,255,255,0.08)',
            backgroundColor: alertSent ? 'rgba(128,239,128,0.06)' : 'rgba(255,255,255,0.03)'
          }}
          className="rounded-2xl p-3 border flex items-center gap-3"
        >
          <motion.div
            animate={{ backgroundColor: alertSent ? '#80EF80' : '#666' }}
            className="w-2 h-2 rounded-full flex-shrink-0"
          />
          <div>
            <p className={`text-sm font-medium transition-colors ${alertSent ? 'text-[#80EF80]' : 'text-white/40'}`}>
              {alertSent ? 'ER team notified — standing by' : 'Sending patient profile to ER...'}
            </p>
            {alertSent && profile && (
              <p className="text-white/30 text-xs mt-0.5">{profile.full_name} · {profile.diagnosis?.split(',')[0]}</p>
            )}
          </div>
        </motion.div>

        {/* Contacts */}
        {profile?.emergency_contacts && alertSent && (
          <div className="flex gap-2">
            {profile.emergency_contacts.slice(0, 3).map((c: any, i: number) => (
              <div key={i} className="flex items-center gap-1.5 bg-white/4 border border-white/8 rounded-xl px-2.5 py-1.5">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">
                  {c.name?.[0]}
                </div>
                <span className="text-white/50 text-xs">{c.name?.split(' ')[0]}</span>
                <span className="text-[#80EF80] text-xs">✓</span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push('/emergency/status')}
            className="bg-[#111116] border border-white/8 rounded-2xl py-3 flex items-center justify-center gap-2 text-white/70 text-sm font-medium"
          >
            <Navigation size={15}/>
            Full status
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            className="bg-red-600 rounded-2xl py-3 flex items-center justify-center gap-2 text-white text-sm font-semibold"
            onClick={() => window.location.href = 'tel:911'}
          >
            <Phone size={15}/>
            Call 911
          </motion.button>
        </div>

      </motion.div>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#070710] flex items-center justify-center">
        <p className="text-white/40 text-sm">Loading...</p>
      </div>
    }>
      <RoutingPage/>
    </Suspense>
  )
}
