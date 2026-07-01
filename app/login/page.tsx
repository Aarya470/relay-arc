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
      background: '#070710',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>

      {/* Centered card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={ease}
        style={{
          width: '100%',
          maxWidth: '400px',
          background: '#121220',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '24px',
          padding: '32px 28px',
        }}
      >

        {/* Logo / wordmark */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '14px',
            background: 'rgba(79,142,247,0.15)',
            border: '1.5px solid rgba(79,142,247,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '14px',
          }}>
            <svg width="22" height="22" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L9.5 5.5H12.5L10 9L11 13L7 10.5L3 13L4 9L1.5 5.5H4.5L7 1Z" fill="#4F8EF7"/>
            </svg>
          </div>
          <span style={{ color: '#EEEEF8', fontWeight: 800, fontSize: '22px', letterSpacing: '-0.5px' }}>Relay Arc</span>
          <p style={{ color: '#505068', fontSize: '13px', marginTop: '4px' }}>Cardiac emergency companion</p>
        </div>

        {/* Toggle headline */}
        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
          <AnimatePresence mode="wait">
            <motion.h1
              key={isSignUp ? 'signup' : 'signin'}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              style={{
                color: '#EEEEF8',
                fontSize: '22px',
                fontWeight: 800,
                letterSpacing: '-0.6px',
                lineHeight: 1.2,
                marginBottom: '6px',
              }}
            >
              {isSignUp ? 'Create your profile' : 'Welcome back'}
            </motion.h1>
          </AnimatePresence>
          <p style={{ color: '#8888A8', fontSize: '13px', lineHeight: 1.5 }}>
            {isSignUp
              ? 'Your medical profile is stored securely.'
              : 'Sign in to continue to your dashboard.'
            }
          </p>
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Email */}
          <div>
            <label style={{ display: 'block', color: '#505068', fontSize: '11px', fontWeight: 500, letterSpacing: '0.6px', textTransform: 'uppercase', fontFamily: 'var(--font-mono, monospace)', marginBottom: '7px' }}>
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
                background: '#1A1A2E',
                border: `1px solid ${focused === 'email' ? '#4F8EF7' : 'rgba(255,255,255,0.10)'}`,
                borderRadius: '12px',
                padding: '14px 16px',
                color: '#EEEEF8',
                fontSize: '15px',
                outline: 'none',
                transition: 'border-color 0.15s',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Password */}
          <div>
            <label style={{ display: 'block', color: '#505068', fontSize: '11px', fontWeight: 500, letterSpacing: '0.6px', textTransform: 'uppercase', fontFamily: 'var(--font-mono, monospace)', marginBottom: '7px' }}>
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
                  background: '#1A1A2E',
                  border: `1px solid ${focused === 'password' ? '#4F8EF7' : 'rgba(255,255,255,0.10)'}`,
                  borderRadius: '12px',
                  padding: '14px 48px 14px 16px',
                  color: '#EEEEF8',
                  fontSize: '15px',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(p => !p)}
                style={{
                  position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#505068', padding: '4px', display: 'flex',
                }}
              >
                {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
            {isSignUp && password.length > 0 && password.length < 8 && (
              <p style={{ color: '#FF3737', fontSize: '12px', marginTop: '5px' }}>At least 8 characters required</p>
            )}
          </div>

          {/* Primary CTA */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleAuth}
            disabled={loading}
            style={{
              width: '100%',
              background: '#4F8EF7',
              color: 'white',
              fontWeight: 700,
              fontSize: '15px',
              borderRadius: '14px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '4px',
              opacity: loading ? 0.65 : 1,
              transition: 'opacity 0.15s',
              height: '52px',
            }}
          >
            {loading ? <Loader2 size={17} className="animate-spin"/> : (isSignUp ? 'Create account' : 'Sign in')}
          </motion.button>

          {/* Toggle sign in / sign up */}
          <div style={{ textAlign: 'center', paddingTop: '4px' }}>
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8888A8', fontSize: '14px', fontFamily: 'inherit' }}
            >
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              <span style={{ color: '#4F8EF7', fontWeight: 700 }}>
                {isSignUp ? 'Sign in' : 'Sign up free'}
              </span>
            </button>
          </div>
        </div>

        {/* Care team link */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '24px', paddingTop: '18px', textAlign: 'center' }}>
          <button
            onClick={() => router.push('/care-team/login')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#505068', fontSize: '12px', fontFamily: 'var(--font-mono, monospace)', letterSpacing: '0.5px' }}
          >
            care team portal →
          </button>
        </div>
      </motion.div>
    </div>
  )
}
