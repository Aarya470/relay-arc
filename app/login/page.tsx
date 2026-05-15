'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Loader2, ArrowRight } from 'lucide-react'

const spring = { type: 'spring', stiffness: 380, damping: 22 } as const

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
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

  const inputStyle = (field: string): React.CSSProperties => ({
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${focusedField === field ? 'rgba(252,181,70,0.35)' : 'rgba(255,255,255,0.08)'}`,
    borderRadius: '14px',
    padding: '16px 18px',
    color: '#EDEAE0',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.18s ease',
    WebkitAppearance: 'none',
    fontFamily: 'inherit',
    boxShadow: focusedField === field ? 'inset 0 0 0 1px rgba(252,181,70,0.12)' : 'none',
  })

  return (
    <div style={{ minHeight: '100dvh', background: '#07070E', display: 'flex', flexDirection: 'column', padding: '56px 24px 32px', position: 'relative', overflow: 'hidden' }}>

      {/* Ambient */}
      <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '280px', height: '280px', background: 'radial-gradient(circle, rgba(252,181,70,0.07) 0%, transparent 70%)', pointerEvents: 'none' }}/>

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '52px' }}
      >
        <div style={{ width: '30px', height: '30px', borderRadius: '9px', background: 'linear-gradient(135deg, #fcb546, #f09020)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(252,181,70,0.35)' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1L9.5 5.5H12.5L10 9L11 13L7 10.5L3 13L4 9L1.5 5.5H4.5L7 1Z" fill="#07070E" strokeWidth="0"/>
          </svg>
        </div>
        <span style={{ color: '#EDEAE0', fontWeight: 800, fontSize: '17px', letterSpacing: '-0.5px' }}>Relay Arc</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, ...spring }}
        style={{ flex: 1 }}
      >
        <h1 style={{ color: '#EDEAE0', fontSize: '34px', fontWeight: 900, letterSpacing: '-1.2px', marginBottom: '6px', lineHeight: 1.1 }}>
          {isSignUp ? 'Create account' : 'Welcome back'}
        </h1>
        <p style={{ color: 'rgba(237,234,224,0.32)', fontSize: '15px', marginBottom: '36px' }}>
          {isSignUp ? 'Start your Relay Arc profile' : 'Sign in to continue'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <label style={{ color: 'rgba(237,234,224,0.4)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.3px', marginBottom: '4px' }}>Email</label>
            <input
              style={inputStyle('email')}
              type="email"
              placeholder="you@example.com"
              value={email}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAuth()}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <label style={{ color: 'rgba(237,234,224,0.4)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.3px', marginBottom: '4px' }}>Password</label>
            <input
              style={inputStyle('password')}
              type="password"
              placeholder="••••••••"
              value={password}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAuth()}
            />
          </div>

          <motion.button
            whileTap={{ scale: 0.97, y: 1 }}
            transition={spring}
            onClick={handleAuth}
            disabled={loading}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #fcb546 0%, #f09020 100%)',
              color: '#07070E',
              fontWeight: 800, fontSize: '16px',
              padding: '18px', borderRadius: '14px',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              marginTop: '8px',
              boxShadow: '0 8px 24px rgba(252,181,70,0.25), inset 0 1px 0 rgba(255,255,255,0.18)',
              opacity: loading ? 0.7 : 1,
              letterSpacing: '-0.2px'
            }}
          >
            {loading
              ? <Loader2 size={18} className="animate-spin"/>
              : <>{isSignUp ? 'Create account' : 'Sign in'} <ArrowRight size={16}/></>
            }
          </motion.button>

          <button
            onClick={() => setIsSignUp(!isSignUp)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(237,234,224,0.32)', fontSize: '14px', marginTop: '8px' }}
          >
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <span style={{ color: '#fcb546', fontWeight: 700 }}>{isSignUp ? 'Sign in' : 'Sign up'}</span>
          </button>
        </div>
      </motion.div>

      <button
        onClick={() => router.push('/care-team/login')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(237,234,224,0.18)', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', letterSpacing: '1.5px', textTransform: 'uppercase' }}
      >
        Care team portal →
      </button>
    </div>
  )
}
