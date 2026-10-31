'use client'
// Sign-in wall for the personal parts of the app. Anyone not signed in who opens
// one of these pages is sent to /login and brought back afterwards.
//
// Deliberately NOT walled: the public website, the no-account emergency card,
// and the SOS flow (/emergency). In an emergency nobody should be stopped by a
// login screen. Data itself is protected by row-level security in the database;
// this wall is the front door, not the lock.
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { demoOn } from '@/lib/demo'

const PRIVATE = [
  '/dashboard',
  '/settings',
  '/medications',
  '/checkin',
  '/check',
  '/history',
  '/symptoms',
  '/vitals',
  '/timeline',
  '/appointments',
  '/appointment',
  '/medical-profile',
  '/emergency-contacts',
  '/connect-health',
  '/onboarding',
]

const isPrivate = (p: string | null) => !!p && PRIVATE.some((r) => p === r || p.startsWith(`${r}/`))

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [allowed, setAllowed] = useState(!isPrivate(pathname))

  useEffect(() => {
    if (!isPrivate(pathname)) {
      setAllowed(true)
      return
    }
    // The vitals check has a demo mode with sample data and no account behind it.
    if (
      pathname === '/check' &&
      (demoOn() || new URLSearchParams(window.location.search).has('demo'))
    ) {
      setAllowed(true)
      return
    }
    setAllowed(false)
    let cancelled = false
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      if (data.session) setAllowed(true)
      else router.replace(`/login?next=${encodeURIComponent(pathname || '/dashboard')}`)
    })
    return () => {
      cancelled = true
    }
  }, [pathname, router])

  if (!allowed) return null
  return <>{children}</>
}
