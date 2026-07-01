'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowLeft, LogOut, User, Phone, Calendar, Stethoscope, ChevronRight, History, Shield, Activity } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import BottomNav from '@/components/BottomNav'

const ease = { type: 'spring', stiffness: 300, damping: 28 } as const

const card: React.CSSProperties = {
  background: '#121220',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '16px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#1A1A2E',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: '12px',
  padding: '14px 16px',
  color: '#EEEEF8',
  fontSize: '14px',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

export default function Settings() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      setLoading(false)
    }
    load()
  }, [])

  const startEdit = (field: string, currentValue: string) => {
    setEditing(field)
    setEditValue(currentValue || '')
  }

  const saveEdit = async () => {
    if (!editing || !profile) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('profiles').update({ [editing]: editValue }).eq('id', user.id)
    if (error) {
      toast.error('Could not save — try again')
    } else {
      setProfile((prev: any) => ({ ...prev, [editing]: editValue }))
      toast.success('Saved')
      setEditing(null)
    }
    setSaving(false)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div style={{ minHeight: '100dvh', background: '#070710', padding: '80px 20px 100px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {[1,2,3,4].map(i => <Skeleton key={i} style={{ height: '56px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)' }}/>)}
    </div>
  )

  const fields = [
    { key: 'full_name', label: 'Full name', icon: User, value: profile?.full_name, inputType: 'text' },
    { key: 'phone', label: 'Phone', icon: Phone, value: profile?.phone, inputType: 'tel' },
    { key: 'date_of_birth', label: 'Date of birth', icon: Calendar, value: profile?.date_of_birth, inputType: 'date' },
    { key: 'cardiologist', label: 'Cardiologist', icon: Stethoscope, value: profile?.cardiologist, inputType: 'text' },
  ]

  return (
    <div style={{ minHeight: '100dvh', background: '#070710', paddingBottom: '80px', maxWidth: '720px', margin: '0 auto', width: '100%' }}>

      {/* Header */}
      <div style={{ padding: '56px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => router.push('/dashboard')}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ArrowLeft size={15} color="#8888A8"/>
          </motion.button>
          <div>
            <h1 style={{ color: '#EEEEF8', fontWeight: 700, fontSize: '20px', letterSpacing: '-0.4px' }}>Settings</h1>
            <p style={{ color: '#8888A8', fontSize: '13px' }}>Manage your profile</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>

        {/* Avatar */}
        <div style={{ ...card, padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '4px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(79,142,247,0.15)', border: '1.5px solid rgba(79,142,247,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: '#4F8EF7', fontWeight: 700, fontSize: '20px' }}>{profile?.full_name?.[0] || '?'}</span>
          </div>
          <div>
            <p style={{ color: '#EEEEF8', fontWeight: 600, fontSize: '16px', letterSpacing: '-0.2px' }}>{profile?.full_name || 'Your name'}</p>
            <p style={{ color: '#505068', fontSize: '12px', marginTop: '2px' }}>{profile?.diagnosis?.split(',')[0] || 'No diagnosis added'}</p>
          </div>
        </div>

        <p style={{ color: '#505068', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.6px', fontFamily: 'var(--font-mono, monospace)', padding: '4px 2px' }}>Profile</p>

        {/* Fields */}
        <div style={{ ...card, overflow: 'hidden' }}>
          {fields.map((f, idx) => (
            <div key={f.key} style={{ borderBottom: idx < fields.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              {editing === f.key ? (
                <div style={{ padding: '14px 16px' }}>
                  <p style={{ color: '#505068', fontSize: '11px', fontWeight: 500, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.4px', fontFamily: 'var(--font-mono, monospace)' }}>{f.label}</p>
                  <input
                    type={f.inputType}
                    autoFocus
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveEdit()}
                    style={{ ...inputStyle, marginBottom: '10px' }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={saveEdit} disabled={saving}
                      style={{ flex: 1, background: '#4F8EF7', color: 'white', fontWeight: 600, fontSize: '13px', padding: '12px', borderRadius: '12px', border: 'none', cursor: 'pointer', height: '44px' }}>
                      {saving ? 'Saving…' : 'Save'}
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={() => setEditing(null)}
                      style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: '#8888A8', fontWeight: 500, fontSize: '13px', padding: '12px', borderRadius: '12px', cursor: 'pointer', height: '44px' }}>
                      Cancel
                    </motion.button>
                  </div>
                </div>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.99 }}
                  onClick={() => startEdit(f.key, f.value)}
                  style={{ width: '100%', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                  <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <f.icon size={14} color="#505068"/>
                  </div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <p style={{ color: '#505068', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.4px', fontFamily: 'var(--font-mono, monospace)', marginBottom: '2px' }}>{f.label}</p>
                    <p style={{ color: f.value ? '#EEEEF8' : '#505068', fontSize: '14px', fontWeight: f.value ? 500 : 400 }}>{f.value || 'Tap to add'}</p>
                  </div>
                  <ChevronRight size={14} color="#505068"/>
                </motion.button>
              )}
            </div>
          ))}
        </div>

        <p style={{ color: '#505068', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.6px', fontFamily: 'var(--font-mono, monospace)', padding: '4px 2px', marginTop: '4px' }}>Data</p>

        <div style={{ ...card, overflow: 'hidden' }}>
          {[
            { label: 'Health history', sub: 'Past check-ins and emergencies', icon: History, path: '/history' },
            { label: 'Vital signs', sub: 'Log and track HR, BP, O₂', icon: Activity, path: '/vitals' },
          ].map((item, idx) => (
            <motion.button
              key={item.path}
              whileTap={{ scale: 0.99 }}
              onClick={() => router.push(item.path)}
              style={{ width: '100%', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: idx === 0 ? '1px solid rgba(255,255,255,0.05)' : 'none', textAlign: 'left' }}
            >
              <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <item.icon size={14} color="#505068"/>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#EEEEF8', fontWeight: 500, fontSize: '14px' }}>{item.label}</p>
                <p style={{ color: '#8888A8', fontSize: '12px', marginTop: '1px' }}>{item.sub}</p>
              </div>
              <ChevronRight size={14} color="#505068"/>
            </motion.button>
          ))}
        </div>

        <motion.button
          whileTap={{ scale: 0.99 }}
          onClick={() => router.push('/emergency-contacts')}
          style={{ ...card, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', width: '100%', textAlign: 'left', border: '1px solid rgba(255,55,55,0.18)' }}
        >
          <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(255,55,55,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Shield size={14} color="#FF3737"/>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: '#FF3737', fontWeight: 500, fontSize: '14px' }}>Emergency contacts</p>
            <p style={{ color: 'rgba(255,55,55,0.5)', fontSize: '12px', marginTop: '1px' }}>Who to alert in an emergency</p>
          </div>
          <ChevronRight size={14} color="rgba(255,55,55,0.35)"/>
        </motion.button>

        <p style={{ color: '#505068', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.6px', fontFamily: 'var(--font-mono, monospace)', padding: '4px 2px', marginTop: '4px' }}>Account</p>

        <motion.button
          whileTap={{ scale: 0.99 }}
          onClick={signOut}
          style={{ width: '100%', background: '#FF3737', color: 'white', fontWeight: 700, fontSize: '15px', padding: '0 20px', borderRadius: '14px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', height: '52px' }}
        >
          <LogOut size={16} color="white"/>
          Sign out
        </motion.button>

      </div>

      <BottomNav/>
    </div>
  )
}
