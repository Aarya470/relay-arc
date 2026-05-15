'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Loader2, ArrowRight } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleAuth = async () => {
    if (!email || !password) { toast.error('Fill in all fields'); return }
    setLoading(true)
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) toast.error(error.message)
      else { toast.success('Account created'); router.push('/onboarding') }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) toast.error(error.message)
      else router.push('/dashboard')
    }
    setLoading(false)
  }

  const input: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '14px',
    padding: '16px 18px',
    color: '#EDEAE0',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s',
    WebkitAppearance: 'none'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#07070E', display: 'flex', flexDirection: 'column', padding: '56px 24px 32px', position: 'relative', overflow: 'hidden' }}>

      {/* Ambient */}
      <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '280px', height: '280px', background: 'radial-gradient(circle, rgba(252,181,70,0.07) 0%, transparent 70%)', pointerEvents: 'none' }}/>

      {/* Logo */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '48px' }}>
        <div style={{ width: '30px', height: '30px', borderRadius: '9px', background: 'linear-gradient(135deg, #fcb546, #f09020)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(252,181,70,0.35)' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1L9.5 5.5H12.5L10 9L11 13L7 10.5L3 13L4 9L1.5 5.5H4.5L7 1Z" fill="#07070E" strokeWidth="0"/>
          </svg>
        </div>
        <span style={{ color: '#EDEAE0', fontWeight: 800, fontSize: '17px', letterSpacing: '-0.4px' }}>Relay Arc</span>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ flex: 1 }}>
        <h1 style={{ color: '#EDEAE0', fontSize: '32px', fontWeight: 800, letterSpacing: '-1px', marginBottom: '6px' }}>
          {isSignUp ? 'Create account' : 'Welcome back'}
        </h1>
        <p style={{ color: 'rgba(237,234,224,0.35)', fontSize: '15px', marginBottom: '32px' }}>
          {isSignUp ? 'Start your Relay Arc profile' : 'Sign in to continue'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input style={input} type="email" placeholder="Email address" value={email}
            onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAuth()}/>
          <input style={input} type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAuth()}/>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleAuth}
            disabled={loading}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #fcb546 0%, #f09020 100%)',
              color: '#07070E',
              fontWeight: 700, fontSize: '16px',
              padding: '18px', borderRadius: '14px',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              marginTop: '4px',
              boxShadow: '0 8px 24px rgba(252,181,70,0.25)',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? <Loader2 size={18} className="animate-spin"/> : <>{isSignUp ? 'Create account' : 'Sign in'} <ArrowRight size={16}/></>}
          </motion.button>

          <button onClick={() => setIsSignUp(!isSignUp)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(237,234,224,0.35)', fontSize: '14px', marginTop: '8px' }}>
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <span style={{ color: '#fcb546', fontWeight: 600 }}>{isSignUp ? 'Sign in' : 'Sign up'}</span>
          </button>
        </div>
      </motion.div>

      <button onClick={() => router.push('/care-team/login')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(237,234,224,0.2)', fontSize: '11px', fontFamily: 'monospace', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
        Care team portal →
      </button>
    </div>
  )
}
