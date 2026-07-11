'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Phone, ArrowLeft, CheckCircle, Navigation } from 'lucide-react'

export default function EmergencyStatus() {
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
    <div style={{ minHeight: '100dvh', background: '#F4F5F7', display: 'flex', flexDirection: 'column', paddingBottom: '32px' }}>

      {/* Alert bar */}
      <div style={{ background: '#D91414', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <motion.div
            style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span style={{ color: 'white', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700 }}>
            Emergency active
          </span>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.70)', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px' }}>
          {time}
        </span>
      </div>

      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #E3E6EC', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFFFF', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => router.push(activeEmergency ? `/emergency/routing?type=${activeEmergency.emergency_type}&id=${activeEmergency.id}` : '/dashboard')}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ECEEF2', border: '1px solid #D5D9E0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ArrowLeft size={16} color="#5B6371" />
          </motion.button>
          <div>
            <p style={{ color: '#9AA2AD', fontFamily: 'var(--font-mono, monospace)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px' }}>Status</p>
            <h1 style={{ color: '#0E1218', fontWeight: 700, fontSize: '18px', letterSpacing: '-0.3px' }}>All systems responding</h1>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(217,20,20,0.10)', border: '1px solid rgba(217,20,20,0.25)', borderRadius: '20px', padding: '6px 12px' }}>
          <motion.div
            style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#D91414' }}
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span style={{ color: '#D91414', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Live</span>
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
                ? 'rgba(0,122,68,0.05)'
                : 'rgba(0,85,255,0.05)',
              border: `1px solid ${action.color === 'green' ? 'rgba(0,122,68,0.18)' : 'rgba(0,85,255,0.18)'}`,
              borderRadius: '16px',
              padding: '14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <div style={{
              width: '32px', height: '32px', borderRadius: '10px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: action.color === 'green' ? 'rgba(0,122,68,0.12)' : 'rgba(0,85,255,0.12)',
              border: `1px solid ${action.color === 'green' ? 'rgba(0,122,68,0.25)' : 'rgba(0,85,255,0.22)'}`
            }}>
              <CheckCircle size={15} color={action.color === 'green' ? '#007A44' : '#0055FF'} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: '#0E1218', fontWeight: 600, fontSize: '13px' }}>{action.label}</p>
              <p style={{ color: '#5B6371', fontSize: '11px', marginTop: '2px', lineHeight: 1.4 }}>{action.detail}</p>
              <p style={{ color: '#9AA2AD', fontFamily: 'var(--font-mono, monospace)', fontSize: '10px', marginTop: '5px' }}>{time}</p>
            </div>
          </motion.div>
        ))}

        {/* Nav strip */}
        <div style={{ background: 'rgba(0,85,255,0.05)', border: '1px solid rgba(0,85,255,0.18)', borderRadius: '16px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(0,85,255,0.12)', border: '1px solid rgba(0,85,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Navigation size={16} color="#0055FF" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: '#0E1218', fontWeight: 600, fontSize: '13px' }}>Turn right onto County Rd</p>
            <p style={{ color: '#9AA2AD', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', marginTop: '2px' }}>In 0.4 miles · 14 min to hospital</p>
          </div>
          <span style={{ background: 'rgba(0,85,255,0.12)', border: '1px solid rgba(0,85,255,0.25)', color: '#0055FF', fontSize: '11px', padding: '5px 10px', borderRadius: '20px', fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, flexShrink: 0 }}>14 MIN</span>
        </div>

        {/* Contacts */}
        {profile?.emergency_contacts && (
          <div style={{ background: '#FFFFFF', border: '1px solid #E3E6EC', borderRadius: '16px', padding: '16px' }}>
            <p style={{ color: '#9AA2AD', fontFamily: 'var(--font-mono, monospace)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>Contacts notified</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {profile.emergency_contacts.map((c: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(0,122,68,0.10)', border: '1px solid rgba(0,122,68,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#007A44', fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>
                    {c.name?.[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: '#0E1218', fontSize: '13px', fontWeight: 600 }}>{c.name}</p>
                    <p style={{ color: '#9AA2AD', fontSize: '11px' }}>{c.relationship}</p>
                  </div>
                  <span style={{ color: '#007A44', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', fontWeight: 700 }}>Notified</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warning */}
        <div style={{ background: 'rgba(217,20,20,0.06)', border: '1px solid rgba(217,20,20,0.18)', borderRadius: '16px', padding: '16px' }}>
          <p style={{ color: 'rgba(217,20,20,0.70)', fontFamily: 'var(--font-mono, monospace)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>If anything changes</p>
          <p style={{ color: '#5B6371', fontSize: '13px', lineHeight: 1.6 }}>
            If chest pain starts, breathing becomes difficult, or the patient loses consciousness — stay on the line with 911.
          </p>
          <motion.button
            whileTap={{ scale: 0.97 }}
            style={{ width: '100%', background: '#D91414', color: 'white', fontWeight: 700, fontSize: '14px', padding: '14px', borderRadius: '12px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '12px' }}
            onClick={() => window.location.href = 'tel:911'}
          >
            <Phone size={16} />
            Call 911 Again
          </motion.button>
        </div>

      </div>
    </div>
  )
}
