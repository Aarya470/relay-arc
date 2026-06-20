'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react'

const spring = { type: 'spring', stiffness: 380, damping: 22 } as const

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const handleAuth = async () => {
    if (!email || !password) { toast.error('Fill in all fields'); return }
    if (isSignUp && password.length < 8) { toast.error('Password must be at least 8 characters'); return }
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
    background: '#FFFFFF',
    border: `1.5px solid ${focusedField === field ? 'rgba(92,139,116,0.5)' : 'rgba(26,40,32,0.1)'}`,
    borderRadius: '14px',
    padding: '16px 18px',
    color: '#1A2820',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
    WebkitAppearance: 'none',
    fontFamily: 'inherit',
    boxShadow: focusedField === field ? '0 0 0 3px rgba(92,139,116,0.1)' : '0 1px 3px rgba(26,40,32,0.04)',
  })

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#F2EFE9',
      display: 'flex',
      flexDirection: 'column',
      padding: '56px 24px 32px',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Ambient blob */}
      <div style={{
        position: 'absolute', top: '-60px', right: '-60px',
        width: '280px', height: '280px',
        background: 'radial-gradient(circle, rgba(255,211,172,0.4) 0%, transparent 65%)',
        pointerEvents: 'none',
      }}/>

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '52px' }}
      >
        <div style={{
          width: '32px', height: '32px', borderRadius: '10px',
          background: 'linear-gradient(135deg, #5C8B74, #3D6B58)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(92,139,116,0.3)',
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1L9.5 5.5H12.5L10 9L11 13L7 10.5L3 13L4 9L1.5 5.5H4.5L7 1Z" fill="#F2EFE9" strokeWidth="0"/>
          </svg>
        </div>
        <span style={{ color: '#1A2820', fontWeight: 800, fontSize: '17px', letterSpacing: '-0.5px' }}>Relay Arc</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, ...spring }}
        style={{ flex: 1 }}
      >
        <h1 style={{ color: '#1A2820', fontSize: '34px', fontWeight: 900, letterSpacing: '-1.2px', marginBottom: '6px', lineHeight: 1.1 }}>
          {isSignUp ? 'Create account' : 'Welcome back'}
        </h1>
        <p style={{ color: 'rgba(26,40,32,0.42)', fontSize: '15px', marginBottom: '36px' }}>
          {isSignUp ? 'Start your Relay Arc profile' : 'Sign in to continue'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <label style={{ color: 'rgba(26,40,32,0.5)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.3px', marginBottom: '4px' }}>Email</label>
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
            <label style={{ color: 'rgba(26,40,32,0.5)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.3px', marginBottom: '4px' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                style={{ ...inputStyle('password'), paddingRight: '48px' }}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAuth()}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(p => !p)}
                style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'rgba(26,40,32,0.35)' }}
              >
                {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
            {isSignUp && password.length > 0 && password.length < 8 && (
              <p style={{ color: '#DC2626', fontSize: '11px', marginTop: '4px' }}>At least 8 characters required</p>
            )}
          </div>

          <motion.button
            whileTap={{ scale: 0.97, y: 1 }}
            transition={spring}
            onClick={handleAuth}
            disabled={loading}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #5C8B74 0%, #3D6B58 100%)',
              color: '#FFFFFF',
              fontWeight: 800, fontSize: '16px',
              padding: '18px', borderRadius: '14px',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              marginTop: '8px',
              boxShadow: '0 8px 24px rgba(92,139,116,0.28), inset 0 1px 0 rgba(255,255,255,0.15)',
              opacity: loading ? 0.7 : 1,
              letterSpacing: '-0.2px',
            }}
          >
            {loading
              ? <Loader2 size={18} className="animate-spin"/>
              : <>{isSignUp ? 'Create account' : 'Sign in'} <ArrowRight size={16}/></>
            }
          </motion.button>

          <button
            onClick={() => setIsSignUp(!isSignUp)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(26,40,32,0.4)', fontSize: '14px', marginTop: '8px' }}
          >
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <span style={{ color: '#5C8B74', fontWeight: 700 }}>{isSignUp ? 'Sign in' : 'Sign up'}</span>
          </button>
        </div>
      </motion.div>

      <button
        onClick={() => router.push('/care-team/login')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(26,40,32,0.22)', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', letterSpacing: '1.5px', textTransform: 'uppercase' }}
      >
        Care team portal →
      </button>
    </div>
  )
}
