'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff } from 'lucide-react'

const ease = { type: 'spring', stiffness: 300, damping: 28 } as const

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
    border: `1.5px solid ${focusedField === field ? '#5C8B74' : 'rgba(0,0,0,0.1)'}`,
    borderRadius: '12px',
    padding: '14px 16px',
    color: '#111',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.15s',
    WebkitAppearance: 'none',
    fontFamily: 'inherit',
  })

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#F5F3EF',
      display: 'flex',
      flexDirection: 'column',
      padding: '56px 24px 32px',
    }}>

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={ease}
        style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '56px' }}
      >
        <div style={{
          width: '30px', height: '30px', borderRadius: '9px',
          background: '#1A2820',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1L9.5 5.5H12.5L10 9L11 13L7 10.5L3 13L4 9L1.5 5.5H4.5L7 1Z" fill="white" strokeWidth="0"/>
          </svg>
        </div>
        <span style={{ color: '#111', fontWeight: 700, fontSize: '16px', letterSpacing: '-0.3px' }}>Relay Arc</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06, ...ease }}
        style={{ flex: 1 }}
      >
        <h1 style={{ color: '#111', fontSize: '30px', fontWeight: 700, letterSpacing: '-0.8px', marginBottom: '6px', lineHeight: 1.1 }}>
          {isSignUp ? 'Create account' : 'Welcome back'}
        </h1>
        <p style={{ color: 'rgba(0,0,0,0.38)', fontSize: '15px', marginBottom: '36px' }}>
          {isSignUp ? 'Start your Relay Arc profile' : 'Sign in to continue'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ color: 'rgba(0,0,0,0.45)', fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '6px' }}>Email</label>
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

          <div>
            <label style={{ color: 'rgba(0,0,0,0.45)', fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '6px' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                style={{ ...inputStyle('password'), paddingRight: '46px' }}
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
                style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(0,0,0,0.3)', padding: '4px', display: 'flex' }}
              >
                {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
            {isSignUp && password.length > 0 && password.length < 8 && (
              <p style={{ color: '#C8372D', fontSize: '12px', marginTop: '5px' }}>At least 8 characters required</p>
            )}
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            transition={ease}
            onClick={handleAuth}
            disabled={loading}
            style={{
              width: '100%',
              background: '#1A2820',
              color: '#FFFFFF',
              fontWeight: 600,
              fontSize: '15px',
              padding: '16px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '4px',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading
              ? <Loader2 size={17} className="animate-spin"/>
              : (isSignUp ? 'Create account' : 'Sign in')
            }
          </motion.button>

          <button
            onClick={() => setIsSignUp(!isSignUp)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(0,0,0,0.38)', fontSize: '14px', marginTop: '4px' }}
          >
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <span style={{ color: '#3D6B58', fontWeight: 600 }}>{isSignUp ? 'Sign in' : 'Sign up'}</span>
          </button>
        </div>
      </motion.div>

      <button
        onClick={() => router.push('/care-team/login')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(0,0,0,0.2)', fontSize: '12px', letterSpacing: '0.5px' }}
      >
        Care team portal
      </button>
    </div>
  )
}
