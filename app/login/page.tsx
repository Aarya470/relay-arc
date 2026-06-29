'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff } from 'lucide-react'

const ease = { type: 'spring', stiffness: 320, damping: 30 } as const

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState<string | null>(null)
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

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#F0EDE5',
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* Top bar */}
      <div style={{ padding: '24px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '8px',
            background: '#1C3D28',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L9.5 5.5H12.5L10 9L11 13L7 10.5L3 13L4 9L1.5 5.5H4.5L7 1Z" fill="#F0EDE5"/>
            </svg>
          </div>
          <span style={{ color: '#0F1A0E', fontWeight: 700, fontSize: '15px', letterSpacing: '-0.3px' }}>Relay Arc</span>
        </div>
        <button
          onClick={() => router.push('/care-team/login')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(16,22,14,0.32)', fontSize: '12px', fontFamily: 'var(--font-mono, monospace)', letterSpacing: '0.5px' }}
        >
          care team →
        </button>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 24px 48px' }}>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={ease}
        >
          {/* Headline */}
          <div style={{ marginBottom: '40px' }}>
            <AnimatePresence mode="wait">
              <motion.h1
                key={isSignUp ? 'signup' : 'signin'}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                style={{
                  color: '#0F1A0E',
                  fontSize: 'clamp(32px, 8vw, 48px)',
                  fontWeight: 900,
                  letterSpacing: '-2px',
                  lineHeight: 1.05,
                  marginBottom: '10px',
                }}
              >
                {isSignUp ? 'Create your\nprofile.' : 'Welcome\nback.'}
              </motion.h1>
            </AnimatePresence>
            <p style={{ color: 'rgba(16,22,14,0.42)', fontSize: '15px', lineHeight: 1.5 }}>
              {isSignUp
                ? 'Your medical profile is stored securely and shared with care teams only in an emergency.'
                : 'Sign in to continue to your health dashboard.'
              }
            </p>
          </div>

          {/* Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', color: 'rgba(16,22,14,0.44)', fontSize: '11px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'var(--font-mono, monospace)', marginBottom: '7px' }}>
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
                style={{
                  width: '100%',
                  background: '#FFFFFF',
                  border: `1.5px solid ${focused === 'email' ? '#2C7A50' : 'rgba(16,22,14,0.12)'}`,
                  borderRadius: '10px',
                  padding: '13px 14px',
                  color: '#0F1A0E',
                  fontSize: '15px',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                  WebkitAppearance: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', color: 'rgba(16,22,14,0.44)', fontSize: '11px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'var(--font-mono, monospace)', marginBottom: '7px' }}>
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
                  style={{
                    width: '100%',
                    background: '#FFFFFF',
                    border: `1.5px solid ${focused === 'password' ? '#2C7A50' : 'rgba(16,22,14,0.12)'}`,
                    borderRadius: '10px',
                    padding: '13px 44px 13px 14px',
                    color: '#0F1A0E',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'border-color 0.15s',
                    WebkitAppearance: 'none',
                  }}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(p => !p)}
                  style={{
                    position: 'absolute', right: '13px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                 
                    color: 'rgba(16,22,14,0.28)', padding: '4px', display: 'flex',
                  }}
                >
                  {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
              {isSignUp && password.length > 0 && password.length < 8 && (
                <p style={{ color: '#B91C1C', fontSize: '12px', marginTop: '5px' }}>At least 8 characters required</p>
              )}
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleAuth}
              disabled={loading}
              style={{
                width: '100%',
                background: '#1C3D28',
                color: '#F0EDE5',
                fontWeight: 700,
                fontSize: '15px',
                padding: '15px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '4px',
                opacity: loading ? 0.65 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              {loading ? <Loader2 size={17} className="animate-spin"/> : (isSignUp ? 'Create account' : 'Sign in')}
            </motion.button>

            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(16,22,14,0.42)', fontSize: '14px' }}
              >
                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                <span style={{ color: '#2C7A50', fontWeight: 700 }}>
                  {isSignUp ? 'Sign in' : 'Sign up free'}
                </span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
