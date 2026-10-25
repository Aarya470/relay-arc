'use client'
import { useEffect, useState } from 'react'
import { emergencyNumber } from '@/lib/emergency-number'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Phone, ArrowLeft, CheckCircle, Navigation } from 'lucide-react'

export default function EmergencyStatus() {
  const [emg, setEmg] = useState({ number: '911', label: '911' })
  useEffect(() => { setEmg(emergencyNumber()) }, [])
  const [profile, setProfile] = useState<any>(null)
  const [activeEmergency, setActiveEmergency] = useState<any>(null)
  const [time] = useState(new Date().toLocaleTimeString())
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      // Check if there's still an active emergency
      const { data: em } = await supabase
        .from('emergencies')
        .select('id, emergency_type')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      setActiveEmergency(em || null)
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
    <div style={{ minHeight: '100dvh', background: '#B3DDAC', display: 'flex', flexDirection: 'column', paddingBottom: '32px' }}>

      {/* Alert bar */}
      <div style={{ background: '#A33417', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <motion.div
            style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span style={{ color: 'white', fontSize: '13px', letterSpacing: '0', fontWeight: 600 }}>
            Emergency active
          </span>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.70)', fontFamily: 'inherit', fontSize: '11px' }}>
          {time}
        </span>
      </div>

      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #98C890', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFFFF', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => router.push(activeEmergency ? `/emergency/routing?type=${activeEmergency.emergency_type}&id=${activeEmergency.id}` : '/dashboard')}
            style={{ width: '36px', height: '36px', borderRadius: '14px', background: '#F2F0E8', border: '1px solid #D8D4C8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ArrowLeft size={16} color="#5C5A52" />
          </motion.button>
          <div>
            <p style={{ color: '#5C5A52', fontSize: '13px', letterSpacing: '0' }}>Status</p>
            <h1 style={{ color: '#141413', fontWeight: 700, fontSize: '18px', letterSpacing: '-0.3px' }}>All systems responding</h1>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(163,52,23,0.10)', border: '1px solid rgba(163,52,23,0.25)', borderRadius: '12px', padding: '6px 12px' }}>
          <motion.div
            style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#A33417' }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span style={{ color: '#A33417', fontSize: '13px', letterSpacing: '0', fontWeight: 600 }}>Live</span>
        </div>
      </div>

      <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

        {/* Confirmed actions */}
        {actions.map((action, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            style={{
              background: action.color === 'green'
                ? 'rgba(86,128,78,0.05)'
                : 'rgba(86,128,78,0.05)',
              border: `1px solid ${action.color === 'green' ? 'rgba(86,128,78,0.18)' : 'rgba(86,128,78,0.18)'}`,
              borderRadius: '12px',
              padding: '14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <div style={{
              width: '32px', height: '32px', borderRadius: '14px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: action.color === 'green' ? 'rgba(86,128,78,0.12)' : 'rgba(86,128,78,0.12)',
              border: `1px solid ${action.color === 'green' ? 'rgba(86,128,78,0.25)' : 'rgba(86,128,78,0.22)'}`
            }}>
              <CheckCircle size={15} color={action.color === 'green' ? '#42623C' : '#42623C'} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: '#141413', fontWeight: 600, fontSize: '13px' }}>{action.label}</p>
              <p style={{ color: '#5C5A52', fontSize: '11px', marginTop: '2px', lineHeight: 1.4 }}>{action.detail}</p>
              <p style={{ color: '#5C5A52', fontFamily: 'inherit', fontSize: '10px', marginTop: '5px' }}>{time}</p>
            </div>
          </motion.div>
        ))}

        {/* Nav strip */}
        <div style={{ background: 'rgba(86,128,78,0.05)', border: '1px solid rgba(86,128,78,0.18)', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '14px', background: 'rgba(86,128,78,0.12)', border: '1px solid rgba(86,128,78,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Navigation size={16} color="#42623C" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: '#141413', fontWeight: 600, fontSize: '13px' }}>Turn right onto County Rd</p>
            <p style={{ color: '#5C5A52', fontFamily: 'inherit', fontSize: '11px', marginTop: '2px' }}>In 0.4 miles · 14 min to hospital</p>
          </div>
          <span style={{ background: 'rgba(86,128,78,0.12)', border: '1px solid rgba(86,128,78,0.25)', color: '#42623C', fontSize: '11px', padding: '5px 10px', borderRadius: '12px', fontFamily: 'inherit', fontWeight: 700, flexShrink: 0 }}>14 MIN</span>
        </div>

        {/* Contacts */}
        {profile?.emergency_contacts && (
          <div style={{ background: '#FFFFFF', border: '1px solid #98C890', borderRadius: '12px', padding: '16px' }}>
            <p style={{ color: '#5C5A52', fontSize: '13px', letterSpacing: '0', marginBottom: '12px' }}>Contacts notified</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {profile.emergency_contacts.map((c: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '14px', background: 'rgba(86,128,78,0.10)', border: '1px solid rgba(86,128,78,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#42623C', fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>
                    {c.name?.[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: '#141413', fontSize: '13px', fontWeight: 600 }}>{c.name}</p>
                    <p style={{ color: '#5C5A52', fontSize: '11px' }}>{c.relationship}</p>
                  </div>
                  <span style={{ color: '#42623C', fontFamily: 'inherit', fontSize: '11px', fontWeight: 700 }}>Notified</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warning */}
        <div style={{ background: 'rgba(163,52,23,0.06)', border: '1px solid rgba(163,52,23,0.18)', borderRadius: '12px', padding: '16px' }}>
          <p style={{ color: 'rgba(163,52,23,0.70)', fontSize: '13px', letterSpacing: '0', marginBottom: '8px' }}>If anything changes</p>
          <p style={{ color: '#5C5A52', fontSize: '13px', lineHeight: 1.6 }}>
            If chest pain starts, breathing becomes difficult, or the patient loses consciousness, stay on the line with 911.
          </p>
          <motion.button
            whileTap={{ scale: 0.97 }}
            style={{ width: '100%', background: '#A33417', color: 'white', fontWeight: 700, fontSize: '14px', padding: '14px', borderRadius: '12px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '12px' }}
            onClick={() => window.location.href = `tel:${emg.number}`}
          >
            <Phone size={16} />
            Call {emg.label} again
          </motion.button>
        </div>

      </div>
    </div>
  )
}
