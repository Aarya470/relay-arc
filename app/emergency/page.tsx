'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { X, Heart, AlertCircle, Wind, Zap, Brain, Activity, Plus, Phone } from 'lucide-react'
import { toast } from 'sonner'

const spring = { type: 'spring', stiffness: 380, damping: 24 } as const

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: spring },
}

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
        // Resolve any lingering active emergencies before creating a new one
        await supabase.from('emergencies')
          .update({ status: 'resolved' })
          .eq('user_id', user.id)
          .eq('status', 'active')

        const { data, error } = await supabase
          .from('emergencies')
          .insert({ user_id: user.id, emergency_type: type, status: 'active' })
          .select()
          .single()

        if (error) {
          console.error('Emergency insert failed:', error)
          toast.error('Could not log emergency — please call 911 now')
          // Still navigate so the user can get routing info
        } else {
          emergencyId = data?.id || ''
        }
      }
      router.push(`/emergency/routing?type=${type}&id=${emergencyId}`)
    } catch (err) {
      console.error('Emergency select error:', err)
      toast.error('Something went wrong — please call 911 now')
      setLoading(false)
      setSelected('')
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#F2EFE9', display: 'flex', flexDirection: 'column' }}>

      {/* Alert bar */}
      <div style={{
        background: 'linear-gradient(90deg, #C42020, #E8322A)',
        padding: '13px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 16px rgba(196,32,32,0.35)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <motion.div
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'white' }}
          />
          <span style={{ color: 'white', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700 }}>
            Relay Arc Emergency
          </span>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px' }}>
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div style={{ flex: 1, padding: '24px 20px 20px', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h1 style={{ color: '#1A2820', fontSize: '26px', fontWeight: 900, letterSpacing: '-1px', marginBottom: '4px', lineHeight: 1.1 }}>
              What is happening?
            </h1>
            <p style={{ color: 'rgba(26,40,32,0.42)', fontSize: '13px' }}>Select the closest description</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            transition={spring}
            onClick={() => router.push('/dashboard')}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FFFFFF', border: '1px solid rgba(26,40,32,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 1px 4px rgba(26,40,32,0.07)' }}
          >
            <X size={15} color="rgba(26,40,32,0.5)"/>
          </motion.button>
        </div>

        {/* Call 911 button — always visible and prominent */}
        <motion.a
          href="tel:911"
          whileTap={{ scale: 0.97 }}
          transition={spring}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            background: '#DC2626', color: 'white',
            padding: '16px', borderRadius: '18px',
            fontWeight: 900, fontSize: '17px', letterSpacing: '-0.3px',
            textDecoration: 'none', marginBottom: '16px',
            boxShadow: '0 6px 24px rgba(220,38,38,0.38)',
          }}
        >
          <Phone size={20}/>
          Call 911 now
        </motion.a>

        {/* Type grid */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', flex: 1 }}
        >
          {TYPES.map(type => {
            const isSelected = selected === type.id
            return (
              <motion.button
                key={type.id}
                variants={fadeUp}
                whileTap={{ scale: 0.95 }}
                transition={spring}
                onClick={() => handleSelect(type.id)}
                disabled={loading}
                style={{
                  background: isSelected
                    ? 'linear-gradient(145deg, rgba(220,38,38,0.1) 0%, #FFFFFF 100%)'
                    : '#FFFFFF',
                  border: `1.5px solid ${isSelected ? 'rgba(220,38,38,0.4)' : 'rgba(26,40,32,0.08)'}`,
                  borderRadius: '20px',
                  padding: '18px 16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  boxShadow: isSelected
                    ? '0 6px 20px rgba(220,38,38,0.14)'
                    : '0 2px 8px rgba(26,40,32,0.06)',
                  transition: 'border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease',
                  opacity: loading && !isSelected ? 0.6 : 1,
                }}
              >
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%', marginBottom: '12px',
                  background: isSelected ? 'rgba(220,38,38,0.12)' : 'rgba(26,40,32,0.05)',
                  border: `1.5px solid ${isSelected ? 'rgba(220,38,38,0.3)' : 'rgba(26,40,32,0.07)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <type.Icon size={18} color={isSelected ? '#DC2626' : 'rgba(26,40,32,0.5)'}/>
                </div>
                <p style={{ color: isSelected ? '#B91C1C' : '#1A2820', fontWeight: 700, fontSize: '13px', marginBottom: '4px', letterSpacing: '-0.2px' }}>{type.label}</p>
                <p style={{ color: 'rgba(26,40,32,0.38)', fontSize: '11px', lineHeight: 1.45 }}>{type.desc}</p>
              </motion.button>
            )
          })}
        </motion.div>

        {/* Info strip */}
        <p style={{ marginTop: '16px', color: 'rgba(26,40,32,0.35)', fontSize: '11px', textAlign: 'center', lineHeight: 1.5 }}>
          Select a symptom above to alert your care team and find the nearest hospital
        </p>
      </div>
    </div>
  )
}
