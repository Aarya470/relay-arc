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
  background: '#FFFFFF',
  border: '1px solid #B5C68F',
  borderRadius: '16px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#FFFFFF',
  border: '1px solid #D8D4C8',
  borderRadius: '12px',
  padding: '14px 16px',
  color: '#141413',
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
    // Same trap as onboarding: date_of_birth is editable here, and clearing the
    // field sends '' which Postgres rejects for a date column. Blanking to null
    // for every field, because '' and null both mean "not answered" and keeping
    // two empties forces every reader to check for both.
    const next = editValue.trim() === '' ? null : editValue
    const { error } = await supabase.from('profiles').update({ [editing]: next }).eq('id', user.id)
    if (error) {
      // Show what actually went wrong. "Could not save — try again" sent me
      // hunting for a network fault when the real message named the column and
      // the bad value.
      toast.error(error.message || 'Could not save — try again')
    } else {
      setProfile((prev: any) => ({ ...prev, [editing]: next }))
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
    <div style={{ minHeight: '100dvh', background: '#CDDAAD', padding: '80px 20px 100px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {[1,2,3,4].map(i => <Skeleton key={i} style={{ height: '56px', borderRadius: '12px', background: '#F2F0E8' }}/>)}
    </div>
  )

  const fields = [
    { key: 'full_name', label: 'Full name', icon: User, value: profile?.full_name, inputType: 'text' },
    { key: 'phone', label: 'Phone', icon: Phone, value: profile?.phone, inputType: 'tel' },
    { key: 'date_of_birth', label: 'Date of birth', icon: Calendar, value: profile?.date_of_birth, inputType: 'date' },
    { key: 'cardiologist', label: 'Cardiologist', icon: Stethoscope, value: profile?.cardiologist, inputType: 'text' },
  ]

  return (
    <div style={{ minHeight: '100dvh', background: '#CDDAAD', paddingBottom: '90px', maxWidth: '640px', margin: '0 auto', width: '100%' }}>

      {/* Header */}
      <div style={{ padding: '56px 20px 22px' }}>
        <button onClick={() => router.push('/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '22px', color: '#716F67', fontSize: '13px', fontWeight: 500, fontFamily: 'inherit' }}>
          <ArrowLeft size={14}/> Dashboard
        </button>
        <p style={{ color: '#716F67', fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', fontFamily: 'var(--font-mono, monospace)', marginBottom: '8px' }}>Settings</p>
        <h1 style={{ color: '#141413', fontSize: '32px', fontWeight: 800, letterSpacing: '-1px', lineHeight: 1 }}>
          {profile?.full_name?.split(' ')[0] || 'Profile'}
        </h1>
        <p style={{ color: '#716F67', fontSize: '13px', marginTop: '8px' }}>{profile?.diagnosis?.split(',')[0] || 'No diagnosis added'}</p>
      </div>

      <div style={{ padding: '0 20px' }}>

        {/* Profile fields — flat rows */}
        <p style={{ color: '#716F67', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', fontFamily: 'var(--font-mono, monospace)', marginBottom: '4px' }}>Profile</p>
        <div style={{ borderTop: '1px solid #B5C68F', marginBottom: '32px' }}>
          {fields.map(f => (
            <div key={f.key} style={{ borderBottom: '1px solid #B5C68F' }}>
              {editing === f.key ? (
                <div style={{ padding: '16px 0' }}>
                  <p style={{ color: '#716F67', fontSize: '10px', fontWeight: 700, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1.2px', fontFamily: 'var(--font-mono, monospace)' }}>{f.label}</p>
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
                      style={{ flex: 1, background: '#141413', color: 'white', fontWeight: 600, fontSize: '13px', padding: '12px', borderRadius: '10px', border: 'none', cursor: 'pointer', height: '44px', fontFamily: 'inherit' }}>
                      {saving ? 'Saving…' : 'Save'}
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={() => setEditing(null)}
                      style={{ flex: 1, background: 'none', border: '1px solid #D8D4C8', color: '#5C5A52', fontWeight: 500, fontSize: '13px', padding: '12px', borderRadius: '10px', cursor: 'pointer', height: '44px', fontFamily: 'inherit' }}>
                      Cancel
                    </motion.button>
                  </div>
                </div>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.995 }}
                  onClick={() => startEdit(f.key, f.value)}
                  style={{ width: '100%', padding: '15px 0', display: 'flex', alignItems: 'baseline', gap: '16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                  <p style={{ color: '#716F67', fontSize: '13px', width: '110px', flexShrink: 0 }}>{f.label}</p>
                  <p style={{ flex: 1, color: f.value ? '#141413' : '#C4BFB0', fontSize: '14.5px', fontWeight: f.value ? 600 : 400 }}>{f.value || 'Tap to add'}</p>
                  <ChevronRight size={13} color="#C4BFB0" style={{ alignSelf: 'center' }}/>
                </motion.button>
              )}
            </div>
          ))}
        </div>

        {/* Data — flat rows */}
        <p style={{ color: '#716F67', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', fontFamily: 'var(--font-mono, monospace)', marginBottom: '4px' }}>Data</p>
        <div style={{ borderTop: '1px solid #B5C68F', marginBottom: '32px' }}>
          {[
            { label: 'Health history', sub: 'Past check-ins and emergencies', path: '/history' },
            { label: 'Vital signs', sub: 'Log and track HR, BP, O₂', path: '/vitals' },
            { label: 'Emergency contacts', sub: 'Who to alert in an emergency', path: '/emergency-contacts', red: true },
          ].map(item => (
            <motion.button
              key={item.path}
              whileTap={{ scale: 0.995 }}
              onClick={() => router.push(item.path)}
              style={{ width: '100%', padding: '15px 0', display: 'flex', alignItems: 'center', gap: '14px', background: 'none', border: 'none', borderBottom: '1px solid #B5C68F', cursor: 'pointer', textAlign: 'left' }}
            >
              <div style={{ flex: 1 }}>
                <p style={{ color: (item as any).red ? '#A33417' : '#141413', fontWeight: 600, fontSize: '14.5px' }}>{item.label}</p>
                <p style={{ color: '#716F67', fontSize: '12.5px', marginTop: '2px' }}>{item.sub}</p>
              </div>
              <ChevronRight size={13} color="#C4BFB0"/>
            </motion.button>
          ))}
        </div>

        {/* Account */}
        <p style={{ color: '#716F67', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', fontFamily: 'var(--font-mono, monospace)', marginBottom: '4px' }}>Account</p>
        <div style={{ borderTop: '1px solid #B5C68F' }}>
          <motion.button
            whileTap={{ scale: 0.995 }}
            onClick={signOut}
            style={{ width: '100%', padding: '15px 0', display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', borderBottom: '1px solid #B5C68F', cursor: 'pointer', textAlign: 'left' }}
          >
            <LogOut size={14} color="#A33417"/>
            <p style={{ color: '#A33417', fontWeight: 600, fontSize: '14.5px' }}>Sign out</p>
          </motion.button>
        </div>

      </div>

      <BottomNav/>
    </div>
  )
}
