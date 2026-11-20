'use client'
// Tells people when they lose signal, and what still works without it.
import { useEffect, useState } from 'react'

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false)
  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    setOffline(typeof navigator !== 'undefined' && navigator.onLine === false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return (
    <div role="status" aria-live="polite" className="offline-banner" data-show={offline}>
      {offline ? (
        <>
          <strong>No signal.</strong> Calling 911, SOS and your emergency card still work.
        </>
      ) : null}
    </div>
  )
}
