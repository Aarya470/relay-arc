'use client'
import { useEffect, useState } from 'react'
import { Phone, RefreshCw, Heart } from 'lucide-react'
import { emergencyNumber } from '@/lib/emergency-number'

// If this app breaks during an emergency, the failure screen itself has to be
// useful: call emergency services first, then recover.
export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [emg, setEmg] = useState({ number: '911', label: '911' })
  useEffect(() => {
    setEmg(emergencyNumber())
    try { console.error('Relay Arc error boundary:', error?.message, error?.digest) } catch {}
  }, [error])

  return (
    <div style={{ minHeight: '100dvh', background: '#FFFFFF', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px', maxWidth: '440px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '36px' }}>
        <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: '#D91414', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Heart size={13} color="white" fill="white" strokeWidth={0}/>
        </div>
        <span style={{ color: '#0E1218', fontWeight: 800, fontSize: '15.5px', letterSpacing: '-0.4px' }}>Relay Arc</span>
      </div>

      <p style={{ color: '#9AA2AD', fontFamily: 'var(--font-mono, monospace)', fontSize: '10.5px', fontWeight: 700, letterSpacing: '1.6px', textTransform: 'uppercase', marginBottom: '10px' }}>
        Something broke
      </p>
      <h1 style={{ color: '#0E1218', fontSize: '30px', fontWeight: 800, letterSpacing: '-1.1px', lineHeight: 1.1, marginBottom: '10px' }}>
        This screen failed to load<span style={{ color: '#D91414' }}>.</span>
      </h1>
      <p style={{ color: '#5B6371', fontSize: '14.5px', lineHeight: 1.6, marginBottom: '28px' }}>
        If you are in an emergency right now, do not wait for this app — call {emg.label}.
      </p>

      <a href={`tel:${emg.number}`}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: '#D91414', color: 'white', fontWeight: 800, fontSize: '17px', padding: '18px', borderRadius: '12px', textDecoration: 'none', minHeight: '58px', marginBottom: '10px' }}>
        <Phone size={19} strokeWidth={2.5}/> Call {emg.label} now
      </a>
      <button onClick={reset}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px', background: 'none', color: '#0E1218', fontWeight: 700, fontSize: '14.5px', padding: '15px', borderRadius: '12px', border: '1.5px solid #0E1218', cursor: 'pointer', fontFamily: 'inherit', minHeight: '52px', marginBottom: '10px' }}>
        <RefreshCw size={15}/> Try this screen again
      </button>
      <a href="/dashboard"
        style={{ textAlign: 'center', color: '#5B6371', fontSize: '13.5px', fontWeight: 600, textDecoration: 'none', padding: '12px' }}>
        Back to dashboard
      </a>
    </div>
  )
}
