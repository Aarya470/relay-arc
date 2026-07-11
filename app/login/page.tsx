'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff, Heart, ArrowRight } from 'lucide-react'

// ─── Design tokens ────────────────────────────────────────────────────────────
const T1      = '#0E1218'
const T2      = '#5B6371'
const T3      = '#9AA2AD'
const ACCENT  = '#0055FF'
const RED     = '#D91414'
const BORDER  = '#E3E6EC'

const mono = 'var(--font-mono, monospace)'

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
    background: '#FFFFFF',
    border: `1.5px solid ${focused === field ? T1 : BORDER}`,
    borderRadius: '10px',
    padding: '13px 16px',
    color: T1,
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  })

  return (
    <div style={{ minHeight: '100dvh', background: '#FFFFFF', padding: '0 24px' }}>
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: 'easeOut' }}
        style={{ maxWidth: '380px', margin: '0 auto', paddingTop: '88px', paddingBottom: '48px' }}>

        {/* Brand */}
        <button onClick={() => router.push('/')}
          style={{ display: 'flex', alignItems: 'center', gap: '9px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '56px' }}>
          <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: RED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Heart size={13} color="white" fill="white" strokeWidth={0}/>
          </div>
          <span style={{ color: T1, fontWeight: 800, fontSize: '15.5px', letterSpacing: '-0.4px' }}>Relay Arc</span>
        </button>

        {/* Headline */}
        <p style={{ color: T3, fontFamily: mono, fontSize: '10.5px', fontWeight: 700, letterSpacing: '1.6px', textTransform: 'uppercase', marginBottom: '12px' }}>
          {isSignUp ? 'New profile' : 'Patient sign-in'}
        </p>
        <AnimatePresence mode="wait">
          <motion.h1
            key={isSignUp ? 'signup' : 'signin'}
            initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.14 }}
            style={{ color: T1, fontSize: '30px', fontWeight: 800, letterSpacing: '-1.1px', lineHeight: 1.1, marginBottom: '8px' }}>
            {isSignUp ? 'Create your profile' : 'Welcome back'}<span style={{ color: RED }}>.</span>
          </motion.h1>
        </AnimatePresence>
        <p style={{ color: T2, fontSize: '14px', lineHeight: 1.55, marginBottom: '36px' }}>
          {isSignUp
            ? 'Blood type, medications, allergies — ready before an emergency needs them.'
            : 'Sign in to your dashboard.'}
        </p>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', color: T3, fontSize: '10.5px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', fontFamily: mono, marginBottom: '8px' }}>
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

          <div>
            <label style={{ display: 'block', color: T3, fontSize: '10.5px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', fontFamily: mono, marginBottom: '8px' }}>
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
                style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: T3, padding: '4px', display: 'flex' }}>
                {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
            {isSignUp && password.length > 0 && password.length < 8 && (
              <p style={{ color: RED, fontSize: '12px', marginTop: '6px', fontWeight: 500 }}>At least 8 characters required</p>
            )}
          </div>

          <motion.button
            whileTap={{ scale: 0.985 }}
            onClick={handleAuth}
            disabled={loading}
            style={{
              width: '100%', background: T1, color: 'white',
              fontWeight: 600, fontSize: '15px', borderRadius: '11px', border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              marginTop: '6px', opacity: loading ? 0.7 : 1, transition: 'opacity 0.15s',
              height: '50px', fontFamily: 'inherit',
            }}>
            {loading
              ? <Loader2 size={17} className="animate-spin"/>
              : <>{isSignUp ? 'Create account' : 'Sign in'} <ArrowRight size={15}/></>}
          </motion.button>

          <button
            onClick={() => setIsSignUp(!isSignUp)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: T2, fontSize: '13.5px', fontFamily: 'inherit', textAlign: 'left', padding: 0, marginTop: '4px' }}>
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <span style={{ color: T1, fontWeight: 700, borderBottom: `1px solid ${BORDER}`, paddingBottom: '1px' }}>
              {isSignUp ? 'Sign in' : 'Create one'}
            </span>
          </button>
        </div>

        {/* Care team link */}
        <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: '40px', paddingTop: '18px' }}>
          <button
            onClick={() => router.push('/care-team/login')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: T3, fontSize: '12px', fontFamily: mono, letterSpacing: '0.4px', padding: 0 }}>
            Care team portal →
          </button>
        </div>
      </motion.div>
    </div>
  )
}
