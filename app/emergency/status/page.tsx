'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Phone, ArrowLeft } from 'lucide-react'

export default function EmergencyStatus() {
  const [profile, setProfile] = useState<any>(null)
  const [time] = useState(new Date().toLocaleTimeString())
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
    }
    load()
  }, [])

  const actions = [
    { label: '911 Dispatched', detail: 'Emergency services en route to your location', color: 'green' },
    { label: 'ER Team Notified', detail: 'Patient profile and history transmitted to hospital', color: 'green' },
    { label: 'Navigation Active', detail: 'Turn-by-turn directions running', color: 'blue' },
    { label: 'Contacts Notified', detail: 'All emergency contacts alerted with location', color: 'green' },
  ]

  return (
    <div className="min-h-screen bg-[#060608] pb-8">

      {/* Header */}
      <div className="px-5 pt-14 pb-4 border-b border-white/6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => router.push('/dashboard')}
              className="w-9 h-9 rounded-xl bg-white/6 flex items-center justify-center"
            >
              <ArrowLeft size={16} className="text-white/60"/>
            </motion.button>
            <div>
              <p className="text-white/40 font-mono text-xs uppercase tracking-wider">Emergency active</p>
              <h1 className="text-white text-xl font-bold">All systems responding</h1>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/25 rounded-full px-3 py-1.5">
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-red-500"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <span className="text-red-400 font-mono text-xs uppercase">Live</span>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">

        {/* Confirmed actions */}
        {actions.map((action, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-[#111116] border border-white/8 rounded-2xl p-4 flex items-start gap-3"
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm ${
              action.color === 'green' ? 'bg-[#80EF80]/15 text-[#80EF80]' : 'bg-blue-500/15 text-blue-400'
            }`}>✓</div>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">{action.label}</p>
              <p className="text-white/40 text-xs mt-0.5">{action.detail}</p>
              <p className="text-white/20 font-mono text-xs mt-1.5">{time}</p>
            </div>
          </motion.div>
        ))}

        {/* Nav strip */}
        <div className="bg-[#111116] border border-white/8 rounded-2xl p-4 flex items-center gap-3">
          <p className="text-blue-400 text-3xl font-bold">→</p>
          <div>
            <p className="text-white font-semibold text-sm">Turn right onto County Rd</p>
            <p className="text-white/35 font-mono text-xs">In 0.4 miles · 14 min to hospital</p>
          </div>
          <span className="ml-auto bg-blue-500/10 border border-blue-500/25 text-blue-400 text-xs px-2.5 py-1 rounded-full font-mono">14 MIN</span>
        </div>

        {/* Contacts */}
        {profile?.emergency_contacts && (
          <div className="bg-[#111116] border border-white/8 rounded-2xl p-4">
            <p className="text-white/35 font-mono text-xs uppercase tracking-wider mb-3">Contacts notified</p>
            <div className="space-y-3">
              {profile.emergency_contacts.map((c: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">
                    {c.name?.[0]}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{c.name}</p>
                    <p className="text-white/30 text-xs">{c.relationship}</p>
                  </div>
                  <span className="ml-auto text-[#80EF80] font-mono text-xs">Notified</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warning */}
        <div className="bg-red-950/20 border border-red-900/25 rounded-2xl p-4">
          <p className="text-red-400/70 font-mono text-xs uppercase tracking-wider mb-2">If anything changes</p>
          <p className="text-white/50 text-sm leading-relaxed">If chest pain starts, breathing becomes difficult, or the patient loses consciousness — stay on the line with 911.</p>
          <motion.button
            whileTap={{ scale: 0.97 }}
            className="w-full bg-red-600 hover:bg-red-500 text-white font-semibold py-3 rounded-xl mt-3 flex items-center justify-center gap-2 transition"
            onClick={() => window.location.href = 'tel:911'}
          >
            <Phone size={16}/>
            Call 911 Again
          </motion.button>
        </div>

      </div>
    </div>
  )
}
