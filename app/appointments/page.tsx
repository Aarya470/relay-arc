'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Phone, Calendar, X, Clock, CalendarCheck } from 'lucide-react'
import BottomNav from '@/components/BottomNav'

const spring = { type: 'spring', stiffness: 360, damping: 26 } as const

export default function Appointments() {
  const [appointments, setAppointments] = useState<any[]>([])
  const [userId, setUserId] = useState('')
  const [showRequest, setShowRequest] = useState(false)
  const [type, setType] = useState<'immediate' | 'scheduled'>('scheduled')
  const [date, setDate] = useState('')
  const [concern, setConcern] = useState('')
  const [loading, setLoading] = useState(true)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data } = await supabase.from('appointments').select('*').eq('patient_id', user.id).order('created_at', { ascending: false })
      setAppointments(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const request = async () => {
    const { data, error } = await supabase.from('appointments').insert({
      patient_id: userId, type, status: 'pending',
      scheduled_at: type === 'scheduled' && date ? date : new Date().toISOString(),
      patient_concern: concern
    }).select().single()
    if (!error && data) {
      setAppointments(prev => [data, ...prev])
      setShowRequest(false); setConcern(''); setDate('')
      toast.success(type === 'immediate' ? 'Care team notified — they will contact you shortly' : 'Appointment requested')
    }
  }

  const fieldStyle = (field: string): React.CSSProperties => ({
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${focusedField === field ? 'rgba(252,181,70,0.3)' : 'rgba(255,255,255,0.08)'}`,
    borderRadius: '14px',
    padding: '14px 16px',
    color: '#EDEAE0',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.18s ease',
    fontFamily: 'inherit',
  })

  return (
    <div style={{ minHeight: '100dvh', background: '#07070E', paddingBottom: '100px' }}>

      <div style={{ padding: '56px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <motion.button
              whileTap={{ scale: 0.9 }}
              transition={spring}
              onClick={() => router.push('/dashboard')}
              style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <ArrowLeft size={15} color="rgba(237,234,224,0.5)"/>
            </motion.button>
            <div>
              <h1 style={{ color: '#EDEAE0', fontWeight: 900, fontSize: '20px', letterSpacing: '-0.7px' }}>Care Team</h1>
              <p style={{ color: 'rgba(237,234,224,0.28)', fontSize: '12px' }}>Talk to a professional</p>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            transition={spring}
            onClick={() => setShowRequest(true)}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(252,181,70,0.1)', border: '1px solid rgba(252,181,70,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Plus size={15} color="#fcb546"/>
          </motion.button>
        </div>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <motion.button
            whileTap={{ scale: 0.97, y: 1 }}
            transition={spring}
            onClick={() => { setType('immediate'); setShowRequest(true) }}
            style={{ background: 'rgba(232,50,42,0.06)', border: '1px solid rgba(232,50,42,0.16)', borderRadius: '18px', padding: '18px', cursor: 'pointer', textAlign: 'left', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }}
          >
            <Phone size={22} color="#FF4A42" style={{ marginBottom: '10px' }}/>
            <p style={{ color: '#EDEAE0', fontWeight: 700, fontSize: '14px', marginBottom: '4px', letterSpacing: '-0.2px' }}>Talk now</p>
            <p style={{ color: 'rgba(237,234,224,0.28)', fontSize: '11px' }}>Request immediate call</p>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97, y: 1 }}
            transition={spring}
            onClick={() => { setType('scheduled'); setShowRequest(true) }}
            style={{ background: 'rgba(74,158,245,0.06)', border: '1px solid rgba(74,158,245,0.16)', borderRadius: '18px', padding: '18px', cursor: 'pointer', textAlign: 'left', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }}
          >
            <Calendar size={22} color="#4A9EF5" style={{ marginBottom: '10px' }}/>
            <p style={{ color: '#EDEAE0', fontWeight: 700, fontSize: '14px', marginBottom: '4px', letterSpacing: '-0.2px' }}>Schedule</p>
            <p style={{ color: 'rgba(237,234,224,0.28)', fontSize: '11px' }}>Book a future visit</p>
          </motion.button>
        </div>

        <p style={{ color: 'rgba(237,234,224,0.22)', fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '8px' }}>Your appointments</p>

        {appointments.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Calendar size={20} color="rgba(237,234,224,0.18)"/>
            </div>
            <p style={{ color: 'rgba(237,234,224,0.2)', fontSize: '13px' }}>No appointments yet</p>
          </div>
        )}

        {appointments.map((a, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, ...spring }}
            style={{ background: '#0D0D1A', border: `1px solid ${a.status === 'confirmed' ? 'rgba(128,239,128,0.18)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '18px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.03)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {a.type === 'immediate'
                  ? <Clock size={13} color="#FF4A42"/>
                  : <CalendarCheck size={13} color="#4A9EF5"/>
                }
                <span style={{ color: a.type === 'immediate' ? '#FF4A42' : '#4A9EF5', fontSize: '12px', fontWeight: 700, letterSpacing: '0.05px' }}>
                  {a.type === 'immediate' ? 'Immediate call' : 'Scheduled visit'}
                </span>
              </div>
              <span style={{
                color: a.status === 'confirmed' ? '#80EF80' : 'rgba(237,234,224,0.32)',
                fontSize: '9px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '1px',
                background: a.status === 'confirmed' ? 'rgba(128,239,128,0.08)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${a.status === 'confirmed' ? 'rgba(128,239,128,0.18)' : 'rgba(255,255,255,0.07)'}`,
                padding: '2px 7px', borderRadius: '99px'
              }}>{a.status}</span>
            </div>
            {a.scheduled_at && a.type === 'scheduled' && (
              <p style={{ color: 'rgba(237,234,224,0.38)', fontSize: '12px', marginBottom: '4px' }}>{new Date(a.scheduled_at).toLocaleString()}</p>
            )}
            {a.patient_concern && <p style={{ color: 'rgba(237,234,224,0.32)', fontSize: '12px' }}>{a.patient_concern}</p>}
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}
            onClick={e => { if (e.target === e.currentTarget) setShowRequest(false) }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              style={{ background: '#0F0F18', borderRadius: '24px 24px 0 0', padding: '24px 20px 48px', width: '100%', boxShadow: '0 -8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <p style={{ color: '#EDEAE0', fontWeight: 800, fontSize: '18px', letterSpacing: '-0.4px' }}>
                  {type === 'immediate' ? 'Request immediate call' : 'Schedule appointment'}
                </p>
                <button onClick={() => setShowRequest(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(237,234,224,0.4)' }}>
                  <X size={20}/>
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {(['immediate', 'scheduled'] as const).map(t => (
                  <button key={t} onClick={() => setType(t)}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700,
                      background: type === t ? (t === 'immediate' ? 'rgba(232,50,42,0.18)' : 'rgba(74,158,245,0.18)') : 'rgba(255,255,255,0.05)',
                      color: type === t ? (t === 'immediate' ? '#FF4A42' : '#4A9EF5') : 'rgba(237,234,224,0.32)',
                      transition: 'background 0.15s ease, color 0.15s ease',
                      fontFamily: 'inherit',
                    }}>
                    {t === 'immediate' ? 'Right now' : 'Schedule'}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {type === 'scheduled' && (
                  <input
                    type="datetime-local"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    onFocus={() => setFocusedField('date')}
                    onBlur={() => setFocusedField(null)}
                    style={fieldStyle('date')}
                  />
                )}

                <textarea
                  value={concern}
                  onChange={e => setConcern(e.target.value)}
                  onFocus={() => setFocusedField('concern')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="What would you like to discuss?"
                  style={{ ...fieldStyle('concern'), resize: 'none', minHeight: '80px' }}
                />

                <motion.button
                  whileTap={{ scale: 0.97, y: 1 }}
                  transition={spring}
                  onClick={request}
                  style={{
                    width: '100%',
                    background: type === 'immediate' ? 'linear-gradient(135deg, #E8322A, #C42020)' : 'linear-gradient(135deg, #4A9EF5, #2070D0)',
                    color: 'white', fontWeight: 800, fontSize: '15px', padding: '16px', borderRadius: '14px', border: 'none', cursor: 'pointer',
                    boxShadow: type === 'immediate' ? '0 8px 24px rgba(232,50,42,0.28)' : '0 8px 24px rgba(74,158,245,0.28)',
                    letterSpacing: '-0.1px',
                  }}
                >
                  {type === 'immediate' ? 'Request immediate call' : 'Request appointment'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav/>
    </div>
  )
}
