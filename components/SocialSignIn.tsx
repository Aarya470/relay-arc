'use client'
// "Continue with Google" and "Continue with Apple".
//
// Buttons only appear once that provider is switched on in Supabase, so the
// sign in page never shows a button that leads to an error.
//
// Brand rules followed: Google's four colour "G" on a white button with the
// words "Continue with Google"; Apple's logo on a black button with the words
// "Continue with Apple". Both at the same size as each other and no smaller
// than the other ways to sign in.
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Provider = 'google' | 'apple'

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

function AppleLogo() {
  return (
    <svg width="16" height="19" viewBox="0 0 814 1000" aria-hidden="true" fill="#FFFFFF">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
    </svg>
  )
}

export default function SocialSignIn({ isSignUp = false }: { isSignUp?: boolean }) {
  const [enabled, setEnabled] = useState<Record<Provider, boolean>>({ google: false, apple: false })
  const [busy, setBusy] = useState<Provider | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return
    fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } })
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        if (s?.external) setEnabled({ google: !!s.external.google, apple: !!s.external.apple })
      })
      .catch(() => {})
  }, [])

  if (!enabled.google && !enabled.apple) return null

  const go = async (provider: Provider) => {
    setError('')
    setBusy(provider)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // Google: always let the person pick which account, so a shared
        // family computer does not silently sign in as someone else.
        queryParams: provider === 'google' ? { prompt: 'select_account' } : undefined,
      },
    })
    if (error) {
      setBusy(null)
      setError('That did not work. Try again, or use your email below.')
    }
  }

  const base: React.CSSProperties = {
    width: '100%',
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    fontFamily: 'inherit',
    fontSize: '15px',
    fontWeight: 600,
    borderRadius: '6px',
    cursor: busy ? 'wait' : 'pointer',
  }

  return (
    <div style={{ marginBottom: '22px' }}>
      <div style={{ display: 'grid', gap: '10px' }}>
        {enabled.google && (
          <button
            type="button"
            onClick={() => go('google')}
            disabled={!!busy}
            style={{ ...base, background: '#FFFFFF', color: '#1F1F1F', border: '1px solid #747775' }}
          >
            <GoogleG />
            {busy === 'google' ? 'Opening Google…' : 'Continue with Google'}
          </button>
        )}
        {enabled.apple && (
          <button
            type="button"
            onClick={() => go('apple')}
            disabled={!!busy}
            style={{ ...base, background: '#000000', color: '#FFFFFF', border: '1px solid #000000' }}
          >
            <AppleLogo />
            {busy === 'apple' ? 'Opening Apple…' : 'Continue with Apple'}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" style={{ color: '#7A3D00', fontSize: '13px', marginTop: '10px' }}>
          {error}
        </p>
      )}
      <p style={{ color: '#3F3D36', fontSize: '12.5px', lineHeight: 1.5, marginTop: '12px' }}>
        By continuing you agree to our{' '}
        <a href="/terms" target="_blank" style={{ color: '#141413', fontWeight: 700 }}>
          Terms
        </a>{' '}
        and{' '}
        <a href="/privacy" target="_blank" style={{ color: '#141413', fontWeight: 700 }}>
          Privacy Policy
        </a>
        {isSignUp
          ? ', and confirm you are 13 or older. If you are under 18, a parent or guardian must set up your account.'
          : '.'}{' '}
        We only receive your name and email. We never post anything or see your contacts.
      </p>
      <div
        aria-hidden
        style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0 0', color: '#3F3D36', fontSize: '13px' }}
      >
        <span style={{ flex: 1, height: '1px', background: 'rgba(20,20,19,0.18)' }} />
        or use email
        <span style={{ flex: 1, height: '1px', background: 'rgba(20,20,19,0.18)' }} />
      </div>
    </div>
  )
}
