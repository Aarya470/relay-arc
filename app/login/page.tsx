'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff, ArrowRight, MailCheck } from 'lucide-react'
import Mark from '@/components/Mark'
import { SITE_URL } from '@/lib/site'

// ─── Design tokens ────────────────────────────────────────────────────────────
const T1      = '#141413'
const T2      = '#5C5A52'
const T3      = '#5C5A52'
const ACCENT  = '#42623C'
const RED     = '#A33417'
const BORDER  = '#98C890'

const mono = 'var(--font-mono, monospace)'

export default function Login() {
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [isSignUp, setIsSignUp]     = useState(false)
  const [loading, setLoading]       = useState(false)
  const [focused, setFocused]       = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  // Set once a signup succeeds. The old flow pushed straight to /onboarding on
  // success, which was wrong twice over: the account is not confirmed yet so
  // /onboarding bounces the visitor back here, and it bounced them silently, so
  // the last thing anyone saw was a login form with no explanation. Every person
  // who has tried to sign up hit that.
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({})

  // Validation is checked here rather than left to the server. A typo should
  // cost nothing, and Supabase's own errors are written for developers.
  // The email test is deliberately loose: anything stricter starts rejecting
  // addresses that are perfectly valid, and the confirmation email is the real
  // test of whether an address exists.
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())
  const passwordValid = password.length >= 8
  const canSubmit = emailValid && (isSignUp ? passwordValid : password.length > 0)
  const emailError = touched.email && email.length > 0 && !emailValid
  const passwordError = touched.password && isSignUp && password.length > 0 && !passwordValid
  const router = useRouter()

  /**
   * Reject if a call has not settled in time.
   *
   * WHY THIS IS HERE
   * A misconfigured SMTP port took the signup endpoint from "returns an error"
   * to "never responds at all". Supabase opened a socket to the mail server and
   * waited, the HTTP request stayed pending indefinitely, and because the code
   * below had no timeout and no try/finally, `setLoading(false)` was never
   * reached. The button span forever with no message — the single worst failure
   * mode available, because the person cannot tell whether it worked, and
   * pressing it again just starts a second doomed request.
   *
   * Any await that a stranger is staring at needs a bound. The specific bug is
   * fixed; this makes the whole class of it survivable.
   */
  const withTimeout = <T,>(p: PromiseLike<T>, ms = 20_000): Promise<T> =>
    Promise.race([
      Promise.resolve(p),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), ms)
      ),
    ])

  const handleAuth = async () => {
    if (!email || !password) { toast.error('Fill in all fields'); return }
    if (isSignUp && password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
    if (isSignUp) {
      const { data, error } = await withTimeout(supabase.auth.signUp({
        email,
        password,
        // WITHOUT THIS, NOBODY CAN EVER FINISH SIGNING UP.
        // Supabase builds the confirmation link from the Site URL configured in
        // its dashboard, and that was still http://localhost:3000 from
        // development — so every confirmation email ever sent pointed at a
        // machine that is not running, and the link died on a browser error
        // page. Passing emailRedirectTo overrides it per request. The dashboard
        // Site URL still has to be correct as well, because Supabase only honours
        // a redirect that is on its allow-list.
        options: { emailRedirectTo: `${SITE_URL}/auth/callback` },
      }))
      if (error) {
        toast.error(error.message)
      } else if (data.user && data.session) {
        // Email confirmation is switched off in this project, so the account is
        // usable immediately. Handled rather than assumed, so turning
        // confirmation off later does not strand people on a screen telling them
        // to check an inbox nothing was sent to.
        router.push('/onboarding')
      } else {
        setSentTo(email)
      }
    } else {
      const { error } = await withTimeout(supabase.auth.signInWithPassword({ email, password }))
      if (error) {
        // Supabase returns the same "Invalid login credentials" for a wrong
        // password and for a correct password on an unconfirmed account, which
        // is a dead end for someone who never got the email. Name the second
        // possibility rather than letting them assume they typed it wrong.
        toast.error(
          /invalid login credentials/i.test(error.message)
            ? 'That email and password did not match. If you have just signed up, confirm your email first. The link is in your inbox.'
            : error.message
        )
      } else {
        router.push('/dashboard')
      }
    }
    } catch (e) {
      // The timeout path, plus anything that throws rather than returning an
      // error object. Signup is the dangerous case: the account may well have
      // been created server-side before the response stalled, so the message
      // must not say it failed. Telling someone to sign up again when the
      // account already exists sends them into "user already registered", which
      // reads like a second, different bug.
      if (e instanceof Error && e.message === 'TIMEOUT') {
        toast.error(
          isSignUp
            ? 'The server did not respond in time. Your account may still have been created. Check your email for a confirmation link, and try signing in before signing up again.'
            : 'The server did not respond in time. Check your connection and try again.'
        )
      } else {
        toast.error(e instanceof Error ? e.message : 'Something went wrong. Try again.')
      }
    } finally {
      // Runs on every path, including the ones that throw. Without this the
      // button can spin forever, which is how this bug presented.
      setLoading(false)
    }
  }

  const resend = async () => {
    if (!sentTo) return
    setResending(true)
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: sentTo,
      options: { emailRedirectTo: `${SITE_URL}/auth/callback` },
    })
    if (error) toast.error(error.message)
    else toast.success('Sent again. Give it a minute.')
    setResending(false)
  }

  const inputStyle = (field: string): React.CSSProperties => ({
    width: '100%',
    background: '#FFFFFF',
    border: `1.5px solid ${focused === field ? T1 : BORDER}`,
    borderRadius: '14px',
    padding: '13px 16px',
    color: T1,
    // 16px, not 15 or 14, and it is not a taste decision.
    //
    // Mobile Safari zooms the whole page in when a focused form control has a
    // font size below 16px. Every text field in this app sat at 14 or 15, so on
    // an iPhone tapping any of them jumped the layout and left the person
    // pinching back out afterwards. Signup, onboarding, emergency contacts, the
    // check-in box, the symptom note and every field on the no-account
    // emergency card all did it. Measured across the running app.
    fontSize: '16px',
    outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  })

  return (
    <div style={{ minHeight: '100dvh', background: '#B3DDAC', padding: '0 24px' }}>
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: 'easeOut' }}
        style={{ maxWidth: '380px', margin: '0 auto', paddingTop: '88px', paddingBottom: '48px' }}>

        {/* Brand */}
        <button onClick={() => router.push('/')} aria-label="Relay Arc home"
          style={{ display: 'flex', alignItems: 'center', gap: '9px', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', marginBottom: '52px' }}>
          <Mark size={26} />
          <span style={{ color: T1, fontWeight: 800, fontSize: '15.5px', letterSpacing: '-0.4px' }}>Relay Arc</span>
        </button>

        {/* Signup succeeded and confirmation is pending. Replaces the form
            entirely rather than sitting above it — leaving the form on screen is
            what made people think the signup had failed and try again. */}
        {sentTo && (
          <div>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(95,112,73,0.1)', display: 'grid', placeItems: 'center', marginBottom: 20 }}>
              <MailCheck size={21} color={ACCENT} />
            </div>
            <h1 style={{ color: T1, fontSize: '30px', fontWeight: 800, letterSpacing: '-1.1px', lineHeight: 1.15, marginBottom: 14 }}>
              One more step. Check your email<span style={{ color: RED }}>.</span>
            </h1>
            <p style={{ color: T2, fontSize: '15px', lineHeight: 1.6, marginBottom: 10 }}>
              A confirmation link is on its way to <strong style={{ color: T1 }}>{sentTo}</strong>. Open it
              and your account is active.
            </p>
            <p style={{ color: T2, fontSize: '15px', lineHeight: 1.6, marginBottom: 26 }}>
              You cannot sign in until you do. Come back to this page afterwards and log in with the
              same email and password.
            </p>

            <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 16px', marginBottom: 22 }}>
              <p style={{ color: T3, fontFamily: mono, fontSize: '10px', fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase', marginBottom: 7 }}>
                Nothing arrived?
              </p>
              <p style={{ color: T2, fontSize: '13.5px', lineHeight: 1.6 }}>
                Check the spam folder first. That is where it usually is. Then check the address above
                for a typo.
              </p>
            </div>

            <button
              onClick={resend}
              disabled={resending}
              style={{
                width: '100%', padding: '14px', borderRadius: '14px', border: `1.5px solid ${BORDER}`,
                background: '#FFFFFF', color: T1, fontWeight: 700, fontSize: '14.5px',
                cursor: resending ? 'default' : 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {resending ? <Loader2 size={15} className="animate-spin" /> : null}
              {resending ? 'Sending' : 'Send the link again'}
            </button>

            <button
              onClick={() => { setSentTo(null); setIsSignUp(false); setPassword('') }}
              style={{
                width: '100%', marginTop: 10, padding: '13px', borderRadius: '14px', border: 'none',
                background: 'transparent', color: T2, fontWeight: 600, fontSize: '14px',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Back to sign in
            </button>
          </div>
        )}

        {!sentTo && <>
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
            ? 'Blood type, medications and allergies, ready before an emergency needs them.'
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
              onBlur={() => { setFocused(null); setTouched(t => ({ ...t, email: true })) }}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && canSubmit && handleAuth()}
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={emailError || undefined}
              aria-describedby={emailError ? 'email-error' : undefined}
              style={{ ...inputStyle('email'), borderColor: emailError ? RED : undefined }}
            />
            {emailError && (
              <p id="email-error" role="alert" style={{ color: RED, fontSize: '12px', marginTop: '6px', fontWeight: 500 }}>
                That does not look like an email address.
              </p>
            )}
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
                onBlur={() => { setFocused(null); setTouched(t => ({ ...t, password: true })) }}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && canSubmit && handleAuth()}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                aria-invalid={passwordError || undefined}
                aria-describedby={passwordError ? 'password-error' : undefined}
                style={{ ...inputStyle('password'), paddingRight: '48px', borderColor: passwordError ? RED : undefined }}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(p => !p)}
                style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: T3, padding: '4px', display: 'flex' }}>
                {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
            {passwordError && (
              <p id="password-error" role="alert" style={{ color: RED, fontSize: '12px', marginTop: '6px', fontWeight: 500 }}>
                Use at least 8 characters.
              </p>
            )}
          </div>

          <motion.button
            whileTap={{ scale: 0.985 }}
            onClick={handleAuth}
            disabled={loading || !canSubmit}
            style={{
              width: '100%', background: T1, color: 'white',
              fontWeight: 600, fontSize: '15px', borderRadius: '14px', border: 'none',
              cursor: (loading || !canSubmit) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              marginTop: '6px', opacity: (loading || !canSubmit) ? 0.55 : 1, transition: 'opacity 0.15s',
              height: '50px', fontFamily: 'inherit',
            }}>
            {loading
              ? <Loader2 size={17} className="animate-spin"/>
              : <>{isSignUp ? 'Create account' : 'Sign in'} <ArrowRight size={15}/></>}
          </motion.button>

          <button
            onClick={() => setIsSignUp(!isSignUp)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: T2, fontSize: '13.5px', fontFamily: 'inherit', textAlign: 'left', padding: '6px 0', marginTop: '0px' }}>
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <span style={{ color: T1, fontWeight: 700, borderBottom: `1px solid ${BORDER}`, paddingBottom: '1px' }}>
              {isSignUp ? 'Sign in' : 'Create one'}
            </span>
          </button>
        </div>

        </>}

        {/* Care team link */}
        <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: '40px', paddingTop: '18px' }}>
          <button
            onClick={() => router.push('/care-team/login')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: T3, fontSize: '12px', fontFamily: mono, letterSpacing: '0.4px', padding: '6px 0' }}>
            Care team portal →
          </button>
        </div>
      </motion.div>
    </div>
  )
}
