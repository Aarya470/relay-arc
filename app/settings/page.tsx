'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowLeft, LogOut, User, Phone, Calendar, Stethoscope, ChevronRight, History, Shield, Activity } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import BottomNav from '@/components/BottomNav'

const spring = { type: 'spring', stiffness: 380, damping: 24 } as const

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
    <div style={{ minHeight: '100dvh', background: '#F2EFE9', padding: '80px 16px 100px' }}>
      {[1,2,3,4].map(i => <Skeleton key={i} style={{ height: '60px', borderRadius: '16px', background: 'rgba(26,40,32,0.06)', marginBottom: '10px' }}/>)}
    </div>
  )

  const fields = [
    { key: 'full_name', label: 'Full name', icon: User, value: profile?.full_name, inputType: 'text' },
    { key: 'phone', label: 'Phone', icon: Phone, value: profile?.phone, inputType: 'tel' },
    { key: 'date_of_birth', label: 'Date of birth', icon: Calendar, value: profile?.date_of_birth, inputType: 'date' },
    { key: 'cardiologist', label: 'Cardiologist', icon: Stethoscope, value: profile?.cardiologist, inputType: 'text' },
  ]

  return (
    <div style={{ minHeight: '100dvh', background: '#F2EFE9', paddingBottom: '100px' }}>

      {/* Header */}
      <div style={{ padding: '56px 20px 20px', borderBottom: '1px solid rgba(26,40,32,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            transition={spring}
            onClick={() => router.push('/dashboard')}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FFFFFF', border: '1px solid rgba(26,40,32,0.09)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(26,40,32,0.06)' }}
          >
            <ArrowLeft size={15} color="rgba(26,40,32,0.5)"/>
          </motion.button>
          <div>
            <h1 style={{ color: '#1A2820', fontWeight: 900, fontSize: '20px', letterSpacing: '-0.7px' }}>Settings</h1>
            <p style={{ color: 'rgba(26,40,32,0.38)', fontSize: '12px' }}>Manage your profile</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>

        {/* Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: '#FFFFFF', borderRadius: '20px', padding: '18px', border: '1px solid rgba(26,40,32,0.07)', marginBottom: '4px', boxShadow: '0 2px 8px rgba(26,40,32,0.05)' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'linear-gradient(135deg, #5C8B74, #3D6B58)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 14px rgba(92,139,116,0.25)' }}>
            <span style={{ color: 'white', fontWeight: 900, fontSize: '22px' }}>{profile?.full_name?.[0] || '?'}</span>
          </div>
          <div>
            <p style={{ color: '#1A2820', fontWeight: 800, fontSize: '16px', letterSpacing: '-0.3px' }}>{profile?.full_name || 'Your name'}</p>
            <p style={{ color: 'rgba(26,40,32,0.4)', fontSize: '12px', marginTop: '2px' }}>{profile?.diagnosis?.split(',')[0] || 'No diagnosis added'}</p>
          </div>
        </div>

        <p style={{ color: 'rgba(26,40,32,0.38)', fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '8px', marginBottom: '4px' }}>Profile info</p>

        {fields.map(f => (
          <motion.div
            key={f.key}
            style={{ background: '#FFFFFF', border: '1px solid rgba(26,40,32,0.07)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 6px rgba(26,40,32,0.04)' }}
          >
            {editing === f.key ? (
              <div style={{ padding: '14px 16px' }}>
                <p style={{ color: 'rgba(26,40,32,0.38)', fontSize: '11px', marginBottom: '8px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{f.label}</p>
                <input
                  type={f.inputType}
                  autoFocus
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveEdit()}
                  style={{ width: '100%', background: '#F8F6F2', border: '1.5px solid rgba(92,139,116,0.35)', borderRadius: '10px', padding: '10px 12px', color: '#1A2820', fontSize: '14px', outline: 'none', fontFamily: 'inherit', marginBottom: '10px' }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={saveEdit} disabled={saving}
                    style={{ flex: 1, background: 'linear-gradient(135deg, #5C8B74, #3D6B58)', color: 'white', fontWeight: 700, fontSize: '13px', padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer' }}>
                    {saving ? 'Saving...' : 'Save'}
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => setEditing(null)}
                    style={{ flex: 1, background: 'rgba(26,40,32,0.06)', color: 'rgba(26,40,32,0.55)', fontWeight: 600, fontSize: '13px', padding: '10px', borderRadius: '10px', border: '1px solid rgba(26,40,32,0.1)', cursor: 'pointer' }}>
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
                <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(92,139,116,0.08)', border: '1px solid rgba(92,139,116,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <f.icon size={14} color="#5C8B74"/>
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <p style={{ color: 'rgba(26,40,32,0.38)', fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '2px' }}>{f.label}</p>
                  <p style={{ color: f.value ? '#1A2820' : 'rgba(26,40,32,0.3)', fontSize: '14px', fontWeight: f.value ? 500 : 400 }}>{f.value || 'Tap to add'}</p>
                </div>
                <ChevronRight size={14} color="rgba(26,40,32,0.25)"/>
              </motion.button>
            )}
          </motion.div>
        ))}

        <p style={{ color: 'rgba(26,40,32,0.38)', fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '12px', marginBottom: '4px' }}>Data & activity</p>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => router.push('/history')}
          style={{ width: '100%', background: '#FFFFFF', border: '1px solid rgba(26,40,32,0.07)', borderRadius: '16px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', textAlign: 'left', boxShadow: '0 2px 6px rgba(26,40,32,0.04)' }}
        >
          <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(92,139,116,0.08)', border: '1px solid rgba(92,139,116,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <History size={14} color="#5C8B74"/>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: '#1A2820', fontWeight: 600, fontSize: '14px' }}>Health history</p>
            <p style={{ color: 'rgba(26,40,32,0.38)', fontSize: '12px', marginTop: '1px' }}>Past check-ins and emergencies</p>
          </div>
          <ChevronRight size={14} color="rgba(26,40,32,0.25)"/>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => router.push('/vitals')}
          style={{ width: '100%', background: '#FFFFFF', border: '1px solid rgba(26,40,32,0.07)', borderRadius: '16px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', textAlign: 'left', boxShadow: '0 2px 6px rgba(26,40,32,0.04)' }}
        >
          <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(232,50,42,0.07)', border: '1px solid rgba(232,50,42,0.13)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Activity size={14} color="#E8322A"/>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: '#1A2820', fontWeight: 600, fontSize: '14px' }}>Vital signs</p>
            <p style={{ color: 'rgba(26,40,32,0.38)', fontSize: '12px', marginTop: '1px' }}>Log and track HR, BP, O₂</p>
          </div>
          <ChevronRight size={14} color="rgba(26,40,32,0.25)"/>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => router.push('/emergency-contacts')}
          style={{ width: '100%', background: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.14)', borderRadius: '16px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', textAlign: 'left', boxShadow: '0 2px 6px rgba(26,40,32,0.04)' }}
        >
          <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Shield size={14} color="#DC2626"/>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: '#DC2626', fontWeight: 600, fontSize: '14px' }}>Emergency contacts</p>
            <p style={{ color: 'rgba(220,38,38,0.6)', fontSize: '12px', marginTop: '1px' }}>Manage contacts to alert in an emergency</p>
          </div>
          <ChevronRight size={14} color="rgba(220,38,38,0.4)"/>
        </motion.button>

        <p style={{ color: 'rgba(26,40,32,0.38)', fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '12px', marginBottom: '4px' }}>Account</p>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={signOut}
          style={{ width: '100%', background: '#FFFFFF', border: '1px solid rgba(26,40,32,0.07)', borderRadius: '16px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', textAlign: 'left', boxShadow: '0 2px 6px rgba(26,40,32,0.04)' }}
        >
          <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(26,40,32,0.05)', border: '1px solid rgba(26,40,32,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <LogOut size={14} color="rgba(26,40,32,0.5)"/>
          </div>
          <p style={{ color: '#1A2820', fontWeight: 600, fontSize: '14px' }}>Sign out</p>
        </motion.button>

      </div>

      <BottomNav/>
    </div>
  )
}
