'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'

const TYPES = [
  { id: 'chest_pain', label: 'Chest pain', desc: 'Pressure, tightness, pain in chest or jaw', icon: '🫀' },
  { id: 'unconscious', label: 'Unconscious', desc: 'Collapsed or not responding', icon: '🔴' },
  { id: 'breathing', label: "Can't breathe", desc: 'Severe shortness of breath', icon: '🫁' },
  { id: 'pots', label: 'POTS episode', desc: 'Severe dizziness, fainting, racing heart', icon: '⚡' },
  { id: 'stroke', label: 'Stroke signs', desc: 'Face drooping, slurred speech', icon: '🧠' },
  { id: 'mecfs', label: 'Severe crash', desc: 'ME/CFS post-exertional malaise', icon: '😔' },
  { id: 'other', label: 'Other', desc: 'Something else urgent', icon: '＋' },
]

export default function Emergency() {
  const [selected, setSelected] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSelect = async (type: string) => {
    setSelected(type)
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('emergencies').insert({ user_id: user.id, emergency_type: type, status: 'active' })
    setTimeout(() => router.push(`/emergency/routing?type=${type}`), 500)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#07070E', display: 'flex', flexDirection: 'column' }}>

      {/* Alert bar */}
      <div style={{ background: 'linear-gradient(90deg, #C42020, #E8322A)', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }}
            style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'white' }}/>
          <span style={{ color: 'white', fontFamily: 'monospace', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase' }}>
            Relay Arc Emergency
          </span>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', fontSize: '11px' }}>
          {new Date().toLocaleTimeString()}
        </span>
      </div>

      <div style={{ flex: 1, padding: '24px 20px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h1 style={{ color: '#EDEAE0', fontSize: '24px', fontWeight: 800, letterSpacing: '-0.8px', marginBottom: '4px' }}>
              What is happening?
            </h1>
            <p style={{ color: 'rgba(237,234,224,0.4)', fontSize: '13px' }}>Select the closest description</p>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => router.push('/dashboard')}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={15} color="rgba(255,255,255,0.5)"/>
          </motion.button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', flex: 1 }}>
          {TYPES.map((type, i) => (
            <motion.button key={type.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleSelect(type.id)}
              disabled={loading}
              style={{
                background: selected === type.id ? 'rgba(232,50,42,0.15)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${selected === type.id ? 'rgba(232,50,42,0.4)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: '18px', padding: '16px',
                textAlign: 'left', cursor: 'pointer',
                transition: 'all 0.15s'
              }}>
              <span style={{ fontSize: '24px', display: 'block', marginBottom: '10px' }}>{type.icon}</span>
              <p style={{ color: '#EDEAE0', fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>{type.label}</p>
              <p style={{ color: 'rgba(237,234,224,0.35)', fontSize: '11px', lineHeight: 1.4 }}>{type.desc}</p>
            </motion.button>
          ))}
        </div>

        <div style={{ marginTop: '16px', background: 'rgba(232,50,42,0.06)', border: '1px solid rgba(232,50,42,0.15)', borderRadius: '14px', padding: '12px 16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FF4A42', flexShrink: 0 }}/>
          <p style={{ color: 'rgba(237,234,224,0.35)', fontSize: '12px' }}>Relay Arc is scanning nearby hospitals in real time</p>
        </div>
      </div>
    </div>
  )
}
