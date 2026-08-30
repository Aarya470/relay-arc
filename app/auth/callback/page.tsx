'use client'
// Where the email confirmation link lands.
//
// WHY THIS PAGE EXISTS AT ALL
// Before this, signUp() was called with no emailRedirectTo, so Supabase built the
// confirmation link from the Site URL in its dashboard — still http://localhost:3000
// from development. Every confirmation email ever sent pointed at a machine that
// was not running, so the link died on a browser error page and nobody could
// finish creating an account. There was no page to land on because nothing had
// ever successfully landed.
//
// WHY IT READS THE URL FRAGMENT
// Supabase's implicit flow returns the session in the hash (#access_token=...),
// not the query string. The hash is never sent to the server, which is the point
// — a token in a query string ends up in server logs, proxy logs and referrer
// headers. So this has to be a client component that reads location.hash, and the
// supabase-js client picks the session up from there automatically on load.
//
// The error case matters as much as the success case: an expired link is the
// single most common outcome in practice, because people open email hours later.
// Supabase returns that as error_description in the hash, and it gets shown in
// plain words with a way forward rather than as a raw string.
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react'
import Mark from '@/components/Mark'

const T1 = '#141413', T2 = '#5C5A52', T3 = '#84827A'
const ACCENT = '#5F7049', RED = '#A33417', BORDER = '#DCE1D0'
const mono = 'var(--font-mono, monospace)'

type State = 'working' | 'confirmed' | 'error'

export default function AuthCallback() {
  const [state, setState] = useState<State>('working')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      // Supabase puts failures in the hash too, so check for one before waiting
      // on a session that is never going to arrive.
      const hash = new URLSearchParams(
        (typeof window !== 'undefined' ? window.location.hash : '').replace(/^#/, '')
      )
      const err = hash.get('error_description') || hash.get('error')
      if (err) {
        if (cancelled) return
        setState('error')
        setMessage(
          /expired/i.test(err)
            ? 'That link has expired. Confirmation links are short-lived, so one opened the next day will not work. Sign up again with the same email and a fresh link will be sent.'
            : decodeURIComponent(err.replace(/\+/g, ' '))
        )
        return
      }

      // supabase-js consumes the hash on load, but not synchronously, so poll
      // briefly rather than reading once and declaring failure. Nine attempts at
      // 250ms covers a slow parse without leaving anyone watching a spinner.
      for (let i = 0; i < 9; i++) {
        const { data } = await supabase.auth.getSession()
        if (cancelled) return
        if (data.session) {
          setEmail(data.session.user.email ?? null)
          setState('confirmed')
          // Signed in already, so send them into onboarding rather than making
          // them log in a second time with credentials they just typed.
          setTimeout(() => { if (!cancelled) router.push('/onboarding') }, 2200)
          return
        }
        await new Promise(r => setTimeout(r, 250))
      }

      if (cancelled) return
      setState('error')
      setMessage(
        'This page did not receive a confirmation token. That usually means the link was opened a second time — a confirmation link only works once. Try signing in.'
      )
    }

    run()
    return () => { cancelled = true }
  }, [router])

  return (
    <div style={{ minHeight: '100dvh', background: '#EFF2E8', padding: '0 24px' }}>
      <div style={{ maxWidth: 380, margin: '0 auto', paddingTop: 88, paddingBottom: 48 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 56 }}>
          <Mark size={26} />
          <span style={{ color: T1, fontWeight: 800, fontSize: 15.5, letterSpacing: -0.4 }}>Relay Arc</span>
        </div>

        {state === 'working' && (
          <>
            <Loader2 size={22} color={T3} className="animate-spin" />
            <h1 style={{ color: T1, fontSize: 28, fontWeight: 800, letterSpacing: -1, lineHeight: 1.15, marginTop: 20 }}>
              Confirming your email
            </h1>
            <p style={{ color: T2, fontSize: 15, lineHeight: 1.6, marginTop: 10 }}>
              This takes a second.
            </p>
          </>
        )}

        {state === 'confirmed' && (
          <>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(95,112,73,0.1)', display: 'grid', placeItems: 'center', marginBottom: 20 }}>
              <CheckCircle2 size={21} color={ACCENT} />
            </div>
            <p style={{ color: ACCENT, fontFamily: mono, fontSize: 10.5, fontWeight: 700, letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 12 }}>
              All set
            </p>
            <h1 style={{ color: T1, fontSize: 30, fontWeight: 800, letterSpacing: -1.1, lineHeight: 1.12, marginBottom: 14 }}>
              Your email is confirmed<span style={{ color: RED }}>.</span>
            </h1>
            <p style={{ color: T2, fontSize: 15, lineHeight: 1.6, marginBottom: 8 }}>
              {email ? <>Signed in as <strong style={{ color: T1 }}>{email}</strong>. </> : null}
              Thank you for setting this up.
            </p>
            <p style={{ color: T2, fontSize: 15, lineHeight: 1.6, marginBottom: 26 }}>
              Taking you to set up your profile now. That is where the blood type, allergies and
              medications go — the things that get sent ahead of you.
            </p>
            <button
              onClick={() => router.push('/onboarding')}
              style={{
                width: '100%', padding: 15, borderRadius: 10, border: 'none', background: T1,
                color: '#FFF', fontWeight: 700, fontSize: 15, cursor: 'pointer',
                fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              Continue <ArrowRight size={15} />
            </button>
          </>
        )}

        {state === 'error' && (
          <>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(163,52,23,0.09)', display: 'grid', placeItems: 'center', marginBottom: 20 }}>
              <AlertCircle size={21} color={RED} />
            </div>
            <h1 style={{ color: T1, fontSize: 28, fontWeight: 800, letterSpacing: -1, lineHeight: 1.15, marginBottom: 14 }}>
              That link did not work
            </h1>
            <p style={{ color: T2, fontSize: 15, lineHeight: 1.6, marginBottom: 26 }}>{message}</p>
            <button
              onClick={() => router.push('/login')}
              style={{
                width: '100%', padding: 15, borderRadius: 10, border: 'none', background: T1,
                color: '#FFF', fontWeight: 700, fontSize: 15, cursor: 'pointer',
                fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              Go to sign in <ArrowRight size={15} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
