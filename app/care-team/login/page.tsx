'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowLeft, KeyRound, Loader2, Lock, Mail, User } from 'lucide-react'

export default function CareTeamLogin() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('Nurse')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async () => {
    if (!code.trim()) { toast.error('Enter care team access code'); return }
    // Validate code server-side so the secret never lives in the bundle
    const res = await fetch('/api/care-team/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    const { valid } = await res.json()
    if (!valid) { toast.error('Invalid care team code'); return }
    setLoading(true)

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) { toast.error(error.message); setLoading(false); return }
      if (data.user) {
        await supabase.from('care_team_members').insert({
          id: data.user.id,
          full_name: name,
          role,
          email
        })
        toast.success('Account created')
        router.push('/care-team/dashboard')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { toast.error(error.message); setLoading(false); return }
      toast.success('Welcome back')
      router.push('/care-team/dashboard')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#B3DDAC', padding: '56px 24px 32px', display: 'flex', flexDirection: 'column' }}>
      <motion.button whileTap={{ scale: 0.9 }} onClick={() => router.push('/login')}
        style={{ width: '36px', height: '36px', borderRadius: '6px', background: '#F2F0E8', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '32px' }}>
        <ArrowLeft size={16} color="#5C5A52"/>
      </motion.button>

      <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: 'rgba(86,128,78,0.15)', border: '1px solid rgba(86,128,78,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
        
      </div>

      <h1 style={{ color: '#141413', fontWeight: 700, fontSize: '28px', marginBottom: '4px' }}>Care team portal</h1>
      <p style={{ color: '#5C5A52', fontSize: '14px', marginBottom: '32px' }}>
        {mode === 'login' ? 'Sign in to your care team account' : 'Create your care team account'}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {mode === 'signup' && (
          <>
            <div style={{ position: 'relative' }}>
              <User size={15} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#5C5A52' }}/>
              <input placeholder="Full name" value={name} onChange={e => setName(e.target.value)}
                style={{ width: '100%', background: '#FFFFFF', border: '1px solid #98C890', borderRadius: '8px', padding: '16px 16px 16px 44px', color: '#141413', fontSize: '14px', outline: 'none' }}/>
            </div>
            <select value={role} onChange={e => setRole(e.target.value)}
              style={{ width: '100%', background: '#FFFFFF', border: '1px solid #98C890', borderRadius: '8px', padding: '16px', color: '#141413', fontSize: '14px', outline: 'none' }}>
              <option>Nurse</option>
              <option>Doctor</option>
              <option>Care coordinator</option>
              <option>Specialist</option>
            </select>
          </>
        )}

        <div style={{ position: 'relative' }}>
          <Mail size={15} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#5C5A52' }}/>
          <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)}
            style={{ width: '100%', background: '#FFFFFF', border: '1px solid #98C890', borderRadius: '8px', padding: '16px 16px 16px 44px', color: '#141413', fontSize: '14px', outline: 'none' }}/>
        </div>

        <div style={{ position: 'relative' }}>
          <Lock size={15} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#5C5A52' }}/>
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
            style={{ width: '100%', background: '#FFFFFF', border: '1px solid #98C890', borderRadius: '8px', padding: '16px 16px 16px 44px', color: '#141413', fontSize: '14px', outline: 'none' }}/>
        </div>

        <div style={{ position: 'relative' }}>
          <KeyRound size={15} color="#5C5A52" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
          <input type="password" placeholder="Care team access code" value={code} onChange={e => setCode(e.target.value)}
            style={{ width: '100%', background: '#FFFFFF', border: '1px solid #98C890', borderRadius: '8px', padding: '16px 16px 16px 44px', color: '#141413', fontSize: '14px', outline: 'none' }}/>
        </div>

        <motion.button whileTap={{ scale: 0.97 }} onClick={handleLogin} disabled={loading}
          style={{ background: '#42623C', color: 'white', fontWeight: 700, fontSize: '15px', padding: '18px', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '4px' }}>
          {loading ? <Loader2 size={18} className="animate-spin"/> : mode === 'login' ? 'Sign in' : 'Create account'}
        </motion.button>

        <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          style={{ background: 'none', border: 'none', color: '#5C5A52', fontSize: '13px', cursor: 'pointer', marginTop: '4px' }}>
          {mode === 'login' ? "New to the care team? Create account" : "Already have an account? Sign in"}
        </button>
      </div>

      <p style={{ color: '#C4BFB0', fontSize: '11px', textAlign: 'center', fontFamily: 'monospace', marginTop: 'auto', paddingTop: '24px' }}>
        Contact your administrator for access
      </p>
    </div>
  )
}
