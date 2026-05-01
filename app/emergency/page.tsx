'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertCircle } from 'lucide-react'

const EMERGENCY_TYPES = [
  { id: 'chest_pain', label: 'Chest pain', desc: 'Tightness, pressure, or pain in chest or jaw', icon: '🫀' },
  { id: 'unconscious', label: 'Unconscious', desc: 'Collapsed or not responding', icon: '🔴' },
  { id: 'breathing', label: "Can't breathe", desc: 'Severe shortness of breath or gasping', icon: '🫁' },
  { id: 'pots', label: 'POTS episode', desc: 'Severe dizziness, fainting, racing heart', icon: '⚡' },
  { id: 'stroke', label: 'Stroke signs', desc: 'Face drooping, slurred speech, arm weakness', icon: '🧠' },
  { id: 'mecfs', label: 'Severe crash', desc: 'Severe ME/CFS post-exertional malaise', icon: '😔' },
  { id: 'other', label: 'Something else', desc: 'Other urgent medical situation', icon: '＋' },
]

export default function Emergency() {
  const [selected, setSelected] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSelect = async (type: string) => {
    setSelected(type)
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('emergencies').insert({
        user_id: user.id,
        emergency_type: type,
        status: 'active'
      })
    }

    setTimeout(() => router.push(`/emergency/routing?type=${type}`), 600)
  }

  return (
    <div className="min-h-screen bg-[#09090C] flex flex-col">

      {/* Alert bar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-red-600 px-5 py-3 flex items-center justify-between"
      >
        <div className="flex items-center gap-2.5">
          <motion.div
            className="w-2 h-2 rounded-full bg-white"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span className="text-white font-mono text-xs tracking-widest uppercase">Relay Arc Emergency</span>
        </div>
        <span className="text-white/70 font-mono text-xs">{new Date().toLocaleTimeString()}</span>
      </motion.div>

      <div className="flex-1 px-5 py-6 flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-white text-2xl font-bold leading-tight">What is happening?</h1>
            <p className="text-white/40 text-sm mt-1">Select the closest description</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => router.push('/dashboard')}
            className="w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center"
          >
            <X size={16} className="text-white/60"/>
          </motion.button>
        </div>

        {/* Options grid */}
        <div className="grid grid-cols-2 gap-2.5 flex-1">
          {EMERGENCY_TYPES.map((type, i) => (
            <motion.button
              key={type.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleSelect(type.id)}
              disabled={loading}
              className={`relative bg-[#111116] border rounded-2xl p-4 text-left transition-all ${
                selected === type.id
                  ? 'border-red-500 bg-red-950/30'
                  : 'border-red-900/25 hover:border-red-500/50 hover:bg-red-950/15'
              }`}
            >
              {selected === type.id && (
                <motion.div
                  layoutId="selected"
                  className="absolute inset-0 bg-red-500/10 rounded-2xl border border-red-500"
                />
              )}
              <span className="text-2xl mb-2 block">{type.icon}</span>
              <p className="text-white font-semibold text-sm mb-1">{type.label}</p>
              <p className="text-white/35 text-xs leading-snug">{type.desc}</p>
            </motion.button>
          ))}
        </div>

        {/* Status */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-4 flex items-center gap-2.5 bg-red-950/20 border border-red-900/20 rounded-2xl px-4 py-3"
        >
          <AlertCircle size={14} className="text-red-400/60 flex-shrink-0"/>
          <p className="text-white/35 text-xs">Relay Arc is scanning nearby hospitals in real time</p>
        </motion.div>

      </div>
    </div>
  )
}
