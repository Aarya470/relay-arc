'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { X, Heart, AlertCircle, Wind, Zap, Brain, Activity, Plus, Radio } from 'lucide-react'

const TYPES = [
  { id: 'chest_pain', label: 'Chest pain', desc: 'Pressure, tightness, pain in chest or jaw', Icon: Heart },
  { id: 'unconscious', label: 'Unconscious', desc: 'Collapsed or not responding', Icon: AlertCircle },
  { id: 'breathing', label: "Can't breathe", desc: 'Severe shortness of breath', Icon: Wind },
  { id: 'pots', label: 'POTS episode', desc: 'Severe dizziness, fainting, racing heart', Icon: Zap },
  { id: 'stroke', label: 'Stroke signs', desc: 'Face drooping, slurred speech', Icon: Brain },
  { id: 'mecfs', label: 'Severe crash', desc: 'ME/CFS post-exertional malaise', Icon: Activity },
  { id: 'other', label: 'Other', desc: 'Something else urgent', Icon: Plus },
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
      <div style={{
        background: 'linear-gradient(90deg, #991B1B, #DC2626)',
        padding: '13px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 1px 0 rgba(255,255,255,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <motion.div animate={{ opacity: [1, 0.25, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
            style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'white' }}/>
          <span style={{ color: 'white', fontFamily: 'monospace', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 600 }}>
            Relay Arc Emergency
          </span>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', fontSize: '11px' }}>
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div style={{ flex: 1, padding: '24px 20px 20px', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h1 style={{ color: '#EDEAE0', fontSize: '24px', fontWeight: 800, letterSpacing: '-0.8px', marginBottom: '4px' }}>
              What is happening?
            </h1>
            <p style={{ color: 'rgba(237,234,224,0.38)', fontSize: '13px' }}>Select the closest description</p>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => router.push('/dashboard')}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <X size={15} color="rgba(255,255,255,0.45)"/>
          </motion.button>
        </div>

        {/* Type grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', flex: 1 }}>
          {TYPES.map((type, i) => {
            const isSelected = selected === type.id
            return (
              <motion.button key={type.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 24 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSelect(type.id)}
                disabled={loading}
                style={{
                  background: isSelected ? 'rgba(220,38,38,0.13)' : 'rgba(255,255,255,0.025)',
                  border: `1px solid ${isSelected ? 'rgba(220,38,38,0.45)' : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: '20px',
                  padding: '18px 16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
                  boxShadow: isSelected
                    ? '0 8px 28px rgba(220,38,38,0.18), inset 0 1px 0 rgba(255,255,255,0.05)'
                    : '0 2px 8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.03)',
                }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '11px', marginBottom: '12px',
                  background: isSelected ? 'rgba(220,38,38,0.18)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${isSelected ? 'rgba(220,38,38,0.3)' : 'rgba(255,255,255,0.06)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <type.Icon size={18} color={isSelected ? '#FF4545' : 'rgba(237,234,224,0.5)'}/>
                </div>
                <p style={{ color: '#EDEAE0', fontWeight: 700, fontSize: '13px', marginBottom: '4px', letterSpacing: '-0.1px' }}>{type.label}</p>
                <p style={{ color: 'rgba(237,234,224,0.3)', fontSize: '11px', lineHeight: 1.4 }}>{type.desc}</p>
              </motion.button>
            )
          })}
        </div>

        {/* Status bar */}
        <div style={{ marginTop: '16px', background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.12)', borderRadius: '14px', padding: '12px 16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Radio size={13} color="rgba(255,69,69,0.6)" style={{ flexShrink: 0 }}/>
          <p style={{ color: 'rgba(237,234,224,0.35)', fontSize: '12px' }}>Relay Arc is scanning nearby hospitals in real time</p>
        </div>
      </div>
    </div>
  )
}
