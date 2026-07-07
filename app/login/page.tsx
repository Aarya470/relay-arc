'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff } from 'lucide-react'

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG      = '#F4F5F7'
const SURFACE = '#FFFFFF'
const T1      = '#0E1218'
const T2      = '#5B6371'
const T3      = '#9AA2AD'
const ACCENT  = '#0055FF'
const RED     = '#D91414'
const BORDER  = '#E3E6EC'
const BORDER_FOCUS = '#0055FF'

const ease = { type: 'spring', stiffness: 320, damping: 30 } as const

export default function Login() {
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [isSignUp, setIsSignUp]     = useState(false)
  const [loading, setLoading]       = useState(false)
  const [focused, setFocused]       = useState<string | null>(null)
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
    background: SURFACE,
    border: `1.5px solid ${focused === field ? BORDER_FOCUS : BORDER}`,
    borderRadius: '10px',
    padding: '13px 16px',
    color: T1,
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    boxShadow: focused === field ? '0 0 0 3px rgba(0,85,255,0.08)' : 'none',
  })

  return (
    <div style={{
      minHeight: '100dvh',
      background: BG,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={ease}
        style={{
          width: '100%',
          maxWidth: '400px',
          background: SURFACE,
          border: `1px solid ${BORDER}`,
          borderRadius: '20px',
          padding: '32px 28px 28px',
          boxShadow: '0 4px 24px rgba(14,18,24,0.08)',
        }}
      >

        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px',
            background: ACCENT,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '14px',
          }}>
            {/* ECG pulse line */}
            <svg width="30" height="20" viewBox="0 0 30 20" fill="none">
              <path d="M1 10 H6 L8 4 L11 16 L14 8 L16 12 H20 L22 6 L25 14 L27 10 H30"
                stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ color: T1, fontWeight: 900, fontSize: '20px', letterSpacing: '-0.6px' }}>Relay Arc</span>
          <p style={{ color: T3, fontSize: '12px', marginTop: '3px', letterSpacing: '0.2px' }}>Cardiac emergency companion</p>
        </div>

        {/* Headline */}
        <div style={{ marginBottom: '22px', textAlign: 'center' }}>
          <AnimatePresence mode="wait">
            <motion.h1
              key={isSignUp ? 'signup' : 'signin'}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
              style={{
                color: T1,
                fontSize: '22px',
                fontWeight: 800,
                letterSpacing: '-0.6px',
                lineHeight: 1.2,
                marginBottom: '5px',
              }}
            >
              {isSignUp ? 'Create your profile' : 'Welcome back'}
            </motion.h1>
          </AnimatePresence>
          <p style={{ color: T2, fontSize: '13px', lineHeight: 1.5 }}>
            {isSignUp
              ? 'Your medical profile is encrypted and secure.'
              : 'Sign in to access your dashboard.'
            }
          </p>
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Email */}
          <div>
            <label style={{
              display: 'block', color: T3, fontSize: '11px', fontWeight: 600,
              letterSpacing: '0.7px', textTransform: 'uppercase',
              fontFamily: 'var(--font-mono, monospace)', marginBottom: '7px',
            }}>
              Email
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAuth()}
              style={inputStyle('email')}
            />
          </div>

          {/* Password */}
          <div>
            <label style={{
              display: 'block', color: T3, fontSize: '11px', fontWeight: 600,
              letterSpacing: '0.7px', textTransform: 'uppercase',
              fontFamily: 'var(--font-mono, monospace)', marginBottom: '7px',
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAuth()}
                style={{ ...inputStyle('password'), paddingRight: '48px' }}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(p => !p)}
                style={{
                  position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: T3, padding: '4px', display: 'flex',
                }}
              >
                {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
            {isSignUp && password.length > 0 && password.length < 8 && (
              <p style={{ color: RED, fontSize: '12px', marginTop: '5px', fontWeight: 500 }}>At least 8 characters required</p>
            )}
          </div>

          {/* CTA */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleAuth}
            disabled={loading}
            style={{
              width: '100%',
              background: ACCENT,
              color: 'white',
              fontWeight: 700,
              fontSize: '15px',
              borderRadius: '11px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '2px',
              opacity: loading ? 0.7 : 1,
              transition: 'opacity 0.15s',
              height: '50px',
              letterSpacing: '-0.1px',
            }}
          >
            {loading
              ? <Loader2 size={17} className="animate-spin"/>
              : (isSignUp ? 'Create account' : 'Sign in')
            }
          </motion.button>

          {/* Toggle */}
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: T2, fontSize: '13px', fontFamily: 'inherit',
              }}
            >
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              <span style={{ color: ACCENT, fontWeight: 700 }}>
                {isSignUp ? 'Sign in' : 'Sign up'}
              </span>
            </button>
          </div>
        </div>

        {/* Care team link */}
        <div style={{
          borderTop: `1px solid ${BORDER}`,
          marginTop: '20px', paddingTop: '16px', textAlign: 'center',
        }}>
          <button
            onClick={() => router.push('/care-team/login')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: T3, fontSize: '12px',
              fontFamily: 'var(--font-mono, monospace)', letterSpacing: '0.4px',
            }}
          >
            care team portal →
          </button>
        </div>
      </motion.div>
    </div>
  )
}
