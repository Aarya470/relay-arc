'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Heart, AlertCircle, Wind, Zap, Brain, Activity, Plus, Phone, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

const spring = { type: 'spring', stiffness: 380, damping: 24 } as const

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }
const fadeUp = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: spring } }

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
    try {
      const { data: { user } } = await supabase.auth.getUser()
      let emergencyId = ''
      if (user) {
        await supabase.from('emergencies').update({ status: 'resolved' }).eq('user_id', user.id).eq('status', 'active')
        const { data, error } = await supabase.from('emergencies').insert({ user_id: user.id, emergency_type: type, status: 'active' }).select().single()
        if (error) {
          toast.error('Could not log emergency — call 911 now')
        } else {
          emergencyId = data?.id || ''
        }
      }
      router.push(`/emergency/routing?type=${type}&id=${emergencyId}`)
    } catch {
      toast.error('Something went wrong — call 911 now')
      setLoading(false)
      setSelected('')
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#0A0F0A', display: 'flex', flexDirection: 'column' }}>

      {/* Status bar area */}
      <div style={{ padding: '16px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <motion.div
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#B91C1C' }}
          />
          <span style={{ color: 'rgba(240,237,229,0.5)', fontFamily: 'var(--font-mono, monospace)', fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 600 }}>
            Emergency Mode
          </span>
        </div>
        <span style={{ color: 'rgba(240,237,229,0.28)', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px' }}>
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div style={{ flex: 1, padding: '20px 20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ color: '#F0EDE5', fontSize: '28px', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1.1 }}>
              What's happening?
            </h1>
            <p style={{ color: 'rgba(240,237,229,0.36)', fontSize: '13px', marginTop: '4px' }}>Select to activate emergency response</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => router.push('/dashboard')}
            style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(240,237,229,0.07)', border: '1px solid rgba(240,237,229,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <X size={15} color="rgba(240,237,229,0.5)"/>
          </motion.button>
        </div>

        {/* Call 911 */}
        <motion.a
          href="tel:911"
          whileTap={{ scale: 0.97 }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            background: '#B91C1C', color: 'white',
            padding: '16px', borderRadius: '12px',
            fontWeight: 900, fontSize: '17px', letterSpacing: '-0.3px',
            textDecoration: 'none',
          }}
        >
          <Phone size={19} strokeWidth={2.2}/>
          Call 911 now
        </motion.a>

        {/* Type grid */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', flex: 1 }}
        >
          {TYPES.map(type => {
            const isSelected = selected === type.id
            return (
              <motion.button
                key={type.id}
                variants={fadeUp}
                whileTap={{ scale: 0.96 }}
                onClick={() => handleSelect(type.id)}
                disabled={loading}
                style={{
                  background: isSelected ? 'rgba(185,28,28,0.15)' : 'rgba(240,237,229,0.04)',
                  border: `1px solid ${isSelected ? 'rgba(185,28,28,0.5)' : 'rgba(240,237,229,0.08)'}`,
                  borderRadius: '12px',
                  padding: '16px 14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, background 0.15s',
                  opacity: loading && !isSelected ? 0.5 : 1,
                }}
              >
                <div style={{
                  width: '36px', height: '36px', borderRadius: '8px', marginBottom: '10px',
                  background: isSelected ? 'rgba(185,28,28,0.2)' : 'rgba(240,237,229,0.07)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <type.Icon size={17} color={isSelected ? '#EF4444' : 'rgba(240,237,229,0.45)'} strokeWidth={2}/>
                </div>
                <p style={{ color: isSelected ? '#FCA5A5' : '#F0EDE5', fontWeight: 700, fontSize: '13px', marginBottom: '3px', letterSpacing: '-0.1px' }}>{type.label}</p>
                <p style={{ color: 'rgba(240,237,229,0.32)', fontSize: '11px', lineHeight: 1.4 }}>{type.desc}</p>
              </motion.button>
            )
          })}
        </motion.div>

        {/* Triage link */}
        <div style={{ textAlign: 'center' }}>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => router.push('/emergency/triage')}
            style={{ color: 'rgba(240,237,229,0.38)', fontSize: '12px', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}>
            Not sure how serious? <span style={{ color: '#4A9E6B', fontWeight: 600 }}>Assess severity →</span>
          </motion.button>
        </div>
      </div>
    </div>
  )
}
