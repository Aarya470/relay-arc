'use client'
// Page view counting, and the notice that explains it.
//
// These two live in one file on purpose, because the banner is what makes the
// counting honest and the counting is the only reason the banner exists. Splitting
// them invites one to be changed without the other.
//
// HOW THIS BEHAVES
//  - It counts a path. It does not identify a person. See the migration for why
//    the table has no visitor id and no session.
//  - It honours Do Not Track and Global Privacy Control without being asked.
//  - A person can decline, and the choice is remembered.
//  - It never blocks anything. If the request fails, the page does not care.
//
// WHY THE NOTICE IS NOT A COOKIE WALL
// This site sets no advertising cookies and loads no third-party trackers. The
// storage it does use is the auth token, form drafts and the emergency card,
// all of which are strictly necessary and none of which need consent under the
// ePrivacy rules. So the honest version of this notice is not "accept cookies
// to continue". It explains what is stored, and it offers to turn off the one
// thing that is optional. A modal that blocks a person from reading the flare
// page during a flare would be indefensible.
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

// window.doNotTrack is the legacy Safari and IE spelling. It is not in the DOM
// typings, and it is still the only place some browsers expose the signal.
declare global {
  interface Window { doNotTrack?: string }
}

const OPT_OUT_KEY = 'relay-arc.count-views'
const SEEN_KEY = 'relay-arc.notice-seen'

function optedOut(): boolean {
  try {
    if (localStorage.getItem(OPT_OUT_KEY) === 'off') return true
  } catch { /* storage blocked, treat as no preference */ }

  // Respecting these without being asked is the whole point of having them.
  const nav = navigator as Navigator & { doNotTrack?: string; globalPrivacyControl?: boolean }
  if (nav.globalPrivacyControl === true) return true
  if (nav.doNotTrack === '1' || window.doNotTrack === '1') return true
  return false
}

export default function Analytics() {
  const pathname = usePathname()
  const [showNotice, setShowNotice] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(SEEN_KEY) && !optedOut()) setShowNotice(true)
    } catch { /* storage blocked, skip the notice rather than nagging */ }
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
    }).catch(() => { /* a missed count is not worth a console error */ })
  }, [pathname])

  const dismiss = (count: boolean) => {
    try {
      localStorage.setItem(SEEN_KEY, '1')
      localStorage.setItem(OPT_OUT_KEY, count ? 'on' : 'off')
    } catch { /* nothing to do */ }
    setShowNotice(false)
  }

  if (!showNotice) return null

  return (
    <div
      role="region"
      aria-label="Privacy notice"
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
        background: '#FFFFFF', borderTop: '3px solid #141413',
        padding: '16px 20px', display: 'flex', flexWrap: 'wrap',
        alignItems: 'center', gap: '14px', justifyContent: 'center',
      }}
    >
      <p style={{ color: '#141413', fontSize: '13.5px', lineHeight: 1.55, margin: 0, maxWidth: '640px' }}>
        This site stores your sign-in and any form you are part way through, on your
        device. It counts page views without recording anything about you, and it
        loads no trackers and no advertising cookies.{' '}
        <a href="/privacy" style={{ color: '#141413', fontWeight: 700 }}>Privacy policy</a>
      </p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => dismiss(false)}
          style={{
            background: 'transparent', border: '1px solid #98C890', color: '#141413',
            fontWeight: 600, fontSize: '13.5px', padding: '10px 16px',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Do not count my views
        </button>
        <button
          onClick={() => dismiss(true)}
          style={{
            background: '#D97757', border: 'none', color: '#141413',
            fontWeight: 700, fontSize: '13.5px', padding: '10px 18px',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          That is fine
        </button>
      </div>
    </div>
  )
}
