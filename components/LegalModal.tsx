'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

const STORAGE_KEY = 'relay_arc_legal_v1'

// Only ask for agreement where someone creates an account. Public pages and the
// no-account emergency card never show this.
const GATED_ROUTES = ['/login', '/onboarding']

const needsGate = (pathname: string | null) =>
  !!pathname && GATED_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))

export default function LegalModal() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    if (!needsGate(pathname)) {
      setOpen(false)
      return
    }
    try {
      setOpen(!localStorage.getItem(STORAGE_KEY))
    } catch {
      setOpen(true)
    }
  }, [pathname])

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString())
    } catch {}
    setOpen(false)
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        background: 'rgba(20,20,19,0.45)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '22px 20px',
          width: '100%',
          maxWidth: '440px',
          marginBottom: '8px',
        }}
      >
        <h2 id="legal-title" style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 8px' }}>
          Before you sign up
        </h2>
        <p style={{ fontSize: '15px', lineHeight: 1.55, color: '#3F3D36', margin: '0 0 18px' }}>
          Please read and agree to our{' '}
          <a href="/privacy" target="_blank" style={{ color: '#141413', fontWeight: 700 }}>
            Privacy Policy
          </a>{' '}
          and{' '}
          <a href="/terms" target="_blank" style={{ color: '#141413', fontWeight: 700 }}>
            Terms of Service
          </a>
          . We never sell your data or show ads.
        </p>
        <button
          onClick={accept}
          style={{
            width: '100%',
            background: '#141413',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '16px',
            padding: '14px',
            fontSize: '15px',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          I agree
        </button>
      </div>
    </div>
  )
}
