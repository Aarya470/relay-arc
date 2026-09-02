'use client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Phone } from 'lucide-react'
import Mark from '@/components/Mark'
import { emergencyNumber } from '@/lib/emergency-number'
import { useEffect, useState } from 'react'

const T1 = '#141413'
const T2 = '#5C5A52'
const T3 = '#716F67'
const BORDER = '#B5C68F'
const RED = '#A33417'
const MONO = 'var(--font-mono, monospace)'

export default function LegalDocument({ kicker, title, body }: { kicker: string; title: string; body: string }) {
  const router = useRouter()
  const [emg, setEmg] = useState({ number: '911', label: '911' })
  useEffect(() => { setEmg(emergencyNumber()) }, [])

  // Render the plain-text document: ALL-CAPS or numbered lines become headings.
  const blocks = body.trim().split(/\n\n+/)

  return (
    <div style={{ minHeight: '100dvh', background: '#CDDAAD' }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '3px', background: T1, zIndex: 10 }}/>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '64px 24px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '48px' }}>
          <button onClick={() => router.push('/')}
            style={{ display: 'flex', alignItems: 'center', gap: '9px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <Mark size={26} />
            <span style={{ color: T1, fontWeight: 800, fontSize: '15.5px', letterSpacing: '-0.4px' }}>Relay Arc</span>
          </button>
          <button onClick={() => router.push('/')}
            style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: T3, fontSize: '13px', fontWeight: 500, fontFamily: 'inherit' }}>
            <ArrowLeft size={14}/> Home
          </button>
        </div>

        <div style={{ borderTop: `3px solid ${T1}`, paddingTop: '14px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ color: T1, fontFamily: MONO, fontSize: '11px', fontWeight: 700, letterSpacing: '1.8px', textTransform: 'uppercase' }}>{kicker}</span>
          <span style={{ color: T3, fontFamily: MONO, fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' }}>Last updated May 2026</span>
        </div>
        <h1 style={{ color: T1, fontSize: 'clamp(30px, 5vw, 44px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.02, marginBottom: '32px' }}>
          {title}<span style={{ color: RED }}>.</span>
        </h1>

        {/* Emergency disclaimer, stated up front rather than buried */}
        <div style={{ borderLeft: `3px solid ${RED}`, paddingLeft: '16px', marginBottom: '40px' }}>
          <p style={{ color: RED, fontFamily: MONO, fontSize: '10.5px', fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase', marginBottom: '7px' }}>
            Read this first
          </p>
          <p style={{ color: T1, fontSize: '15px', fontWeight: 600, lineHeight: 1.6, marginBottom: '12px' }}>
            Relay Arc is not an emergency service and not a medical device. In a life-threatening
            situation, call {emg.label} immediately — do not rely on this app.
          </p>
          <a href={`tel:${emg.number}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: RED, color: 'white', fontWeight: 700, fontSize: '14px', padding: '11px 18px', borderRadius: '10px', textDecoration: 'none' }}>
            <Phone size={14} strokeWidth={2.5}/> Call {emg.label}
          </a>
        </div>

        {blocks.map((block, i) => {
          const lines = block.split('\n')
          const first = lines[0].trim()
          const isHeading = /^\d+\.\s/.test(first) || (first === first.toUpperCase() && first.length < 70 && !first.startsWith('•'))
          if (isHeading && lines.length > 1) {
            return (
              <div key={i} style={{ marginBottom: '26px' }}>
                <h2 style={{ color: T1, fontSize: '16px', fontWeight: 800, letterSpacing: '-0.2px', marginBottom: '9px', paddingTop: '18px', borderTop: `1px solid ${BORDER}` }}>
                  {first}
                </h2>
                {lines.slice(1).map((l, j) => (
                  <p key={j} style={{ color: T2, fontSize: '14.5px', lineHeight: 1.75, marginBottom: '6px', paddingLeft: l.trim().startsWith('•') ? '14px' : 0 }}>
                    {l}
                  </p>
                ))}
              </div>
            )
          }
          if (isHeading) {
            return (
              <h2 key={i} style={{ color: T1, fontSize: '16px', fontWeight: 800, letterSpacing: '-0.2px', marginBottom: '12px', paddingTop: '18px', borderTop: `1px solid ${BORDER}` }}>
                {first}
              </h2>
            )
          }
          return (
            <p key={i} style={{ color: T2, fontSize: '14.5px', lineHeight: 1.75, marginBottom: '18px' }}>
              {block}
            </p>
          )
        })}

        <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: '40px', paddingTop: '20px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <a href="/privacy" style={{ color: T2, fontSize: '13.5px', fontWeight: 600, textDecoration: 'none', borderBottom: `1px solid ${BORDER}` }}>Privacy policy</a>
          <a href="/terms" style={{ color: T2, fontSize: '13.5px', fontWeight: 600, textDecoration: 'none', borderBottom: `1px solid ${BORDER}` }}>Terms of service</a>
          <a href="mailto:5satadruroy@gmail.com" style={{ color: T2, fontSize: '13.5px', fontWeight: 600, textDecoration: 'none', borderBottom: `1px solid ${BORDER}` }}>Contact</a>
        </div>
      </div>
    </div>
  )
}
