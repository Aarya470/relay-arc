'use client'
// Page view counting, and the notice that explains it.
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Analytics as VercelAnalytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

// window.doNotTrack is the legacy Safari and IE spelling. It is not in the DOM
// typings, and it is still the only place some browsers expose the signal.
declare global {
  interface Window {
    doNotTrack?: string
  }
}

const OPT_OUT_KEY = 'relay-arc.count-views'
const SEEN_KEY = 'relay-arc.notice-seen'

function optedOut(): boolean {
  try {
    if (localStorage.getItem(OPT_OUT_KEY) === 'off') return true
  } catch {
    /* storage blocked, treat as no preference */
  }

  // Respecting these without being asked is the whole point of having them.
  const nav = navigator as Navigator & { doNotTrack?: string; globalPrivacyControl?: boolean }
  if (nav.globalPrivacyControl === true) return true
  if (nav.doNotTrack === '1' || window.doNotTrack === '1') return true
  return false
}

// Vercel Web Analytics is cookieless. It still honours the same opt-out, GPC and
// Do Not Track signals, and query strings are dropped so nothing personal is sent.
function scrub<T extends { url: string }>(event: T): T | null {
  if (optedOut()) return null
  const url = new URL(event.url)
  url.search = ''
  url.hash = ''
  return { ...event, url: url.toString() }
}

export default function Analytics() {
  const pathname = usePathname()
  const [showNotice, setShowNotice] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(SEEN_KEY) && !optedOut()) setShowNotice(true)
    } catch {
      /* storage blocked, skip the notice rather than nagging */
    }
  }, [])

  useEffect(() => {
    if (!pathname || optedOut()) return

    // keepalive so the request survives the visitor navigating away
    // immediately, which is exactly when a bounce most needs counting.
    const body = JSON.stringify({ path: pathname })
    fetch('/api/pageview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {
      /* a missed count is not worth a console error */
    })
  }, [pathname])

  const dismiss = (count: boolean) => {
    try {
      localStorage.setItem(SEEN_KEY, '1')
      localStorage.setItem(OPT_OUT_KEY, count ? 'on' : 'off')
    } catch {
      /* nothing to do */
    }
    setShowNotice(false)
  }

  const vercel = (
    <>
      <VercelAnalytics beforeSend={scrub} />
      <SpeedInsights beforeSend={scrub} />
    </>
  )

  if (!showNotice) return vercel

  return (
    <>
      {vercel}
      <div
        role="region"
        aria-label="Privacy notice"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          background: '#141413',
          padding: '12px 16px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '14px',
          justifyContent: 'center',
        }}
      >
        <p
          style={{
            color: '#FFFFFF',
            fontSize: '14px',
            lineHeight: 1.55,
            margin: 0,
            maxWidth: '640px',
          }}
        >
          We count page views. No ads, no trackers.{' '}
          <a href="/privacy" style={{ color: '#FFFFFF', fontWeight: 700 }}>
            Privacy policy
          </a>
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => dismiss(false)}
            className="sh-pill"
            style={{
              background: 'transparent',
              border: 'none',
              boxShadow: 'inset 0 0 0 2px #FFFFFF',
              color: '#FFFFFF',
              fontWeight: 600,
              fontSize: '14px',
              padding: '10px 18px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Don&apos;t count me
          </button>
          <button
            onClick={() => dismiss(true)}
            className="sh-slant"
            style={{
              background: '#B3DDAC',
              border: 'none',
              color: '#141413',
              fontWeight: 700,
              fontSize: '14px',
              padding: '10px 26px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            OK
          </button>
        </div>
      </div>
    </>
  )
}
