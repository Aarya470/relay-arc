'use client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Phone } from '@/lib/plain-icons'
import Mark from '@/components/Mark'
import { emergencyNumber } from '@/lib/emergency-number'
import { useEffect, useState } from 'react'

// The page green, and why it is this one.
const PAGE = '#B3DDAC'
const PANEL = '#FFFFFF'
const ON = '#141413' // ink, 12.16:1 on the light green
const ON_3 = '#5C5A52'
const T1 = '#141413' // inside the panel
const T2 = '#5C5A52'
const T3 = '#5C5A52'
const BORDER = '#DCE6D6'
const RED = '#A33417'

// A real, reachable address is a legal requirement on both of these documents.
// It used to be a personal Gmail, which put a private inbox on a public page
// for anyone scraping contact details. This is the project address instead.
const CONTACT = 'relay.arc.org@gmail.com'
const MONO = 'var(--font-mono, monospace)'

export default function LegalDocument({
  kicker,
  title,
  body,
}: {
  kicker: string
  title: string
  body: string
}) {
  const router = useRouter()
  const [emg, setEmg] = useState({ number: '911', label: '911' })
  useEffect(() => {
    setEmg(emergencyNumber())
  }, [])

  // Render the plain-text document: ALL-CAPS or numbered lines become headings.
  const blocks = body.trim().split(/\n\n+/)

  return (
    <div style={{ minHeight: '100dvh', background: PAGE }}>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: '#D97757',
          zIndex: 10,
        }}
      />

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '64px 24px 80px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '48px',
          }}
        >
          <button
            onClick={() => router.push('/')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '5px 0',
            }}
          >
            <Mark size={26} />
            <span
              style={{ color: ON, fontWeight: 800, fontSize: '15.5px', letterSpacing: '-0.4px' }}
            >
              Relay Arc
            </span>
          </button>
          <button
            onClick={() => router.push('/')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              color: ON_3,
              fontSize: '13px',
              fontWeight: 500,
              fontFamily: 'inherit',
            }}
          >
            <ArrowLeft size={14} /> Home
          </button>
        </div>

        <div
          style={{
            borderTop: `3px solid ${ON}`,
            paddingTop: '14px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <span
            style={{
              color: ON,
              fontFamily: MONO,
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '1.8px',
              textTransform: 'uppercase',
            }}
          >
            {kicker}
          </span>
          <span
            style={{
              color: ON_3,
              fontFamily: MONO,
              fontSize: '11px',
              letterSpacing: '1px',
              textTransform: 'uppercase',
            }}
          >
            Last updated September 2026
          </span>
        </div>
        <h1
          style={{
            color: ON,
            fontSize: 'clamp(30px, 5vw, 44px)',
            fontWeight: 800,
            letterSpacing: '-0.04em',
            lineHeight: 1.02,
            marginBottom: '32px',
          }}
        >
          {title}
          .
        </h1>

        {/* Everything from here down is prose at 14.5px, so it lives on a
            panel. Emergency disclaimer first, stated up front rather than
            buried at the bottom where nobody reads it. */}
        <div style={{ background: PANEL, borderRadius: '20px', padding: '28px 26px 30px' }}>
          <div
            style={{ borderLeft: `3px solid ${RED}`, paddingLeft: '16px', marginBottom: '36px' }}
          >
            <p
              style={{
                color: RED,
                fontFamily: MONO,
                fontSize: '10.5px',
                fontWeight: 700,
                letterSpacing: '1.4px',
                textTransform: 'uppercase',
                marginBottom: '7px',
              }}
            >
              Read this first
            </p>
            <p
              style={{
                color: T1,
                fontSize: '15px',
                fontWeight: 600,
                lineHeight: 1.6,
                marginBottom: '12px',
              }}
            >
              Relay Arc is not an emergency service and not a medical device. In a life-threatening
              situation, call {emg.label} immediately. Do not rely on this app.
            </p>
            <a
              href={`tel:${emg.number}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: RED,
                color: 'white',
                fontWeight: 700,
                fontSize: '14px',
                padding: '11px 18px',
                borderRadius: 0,
                textDecoration: 'none',
              }}
            >
              <Phone size={14} strokeWidth={2.5} /> Call {emg.label}
            </a>
          </div>

          {blocks.map((block, i) => {
            const lines = block.split('\n')
            const first = lines[0].trim()
            const isHeading =
              /^\d+\.\s/.test(first) ||
              (first === first.toUpperCase() && first.length < 70 && !first.startsWith('•'))
            if (isHeading && lines.length > 1) {
              return (
                <div key={i} style={{ marginBottom: '26px' }}>
                  <h2
                    style={{
                      color: T1,
                      fontSize: '16px',
                      fontWeight: 800,
                      letterSpacing: '-0.2px',
                      marginBottom: '9px',
                      paddingTop: '18px',
                      borderTop: `1px solid ${BORDER}`,
                    }}
                  >
                    {first}
                  </h2>
                  {lines.slice(1).map((l, j) => (
                    <p
                      key={j}
                      style={{
                        color: T2,
                        fontSize: '14.5px',
                        lineHeight: 1.75,
                        marginBottom: '6px',
                        paddingLeft: l.trim().startsWith('•') ? '14px' : 0,
                      }}
                    >
                      {l}
                    </p>
                  ))}
                </div>
              )
            }
            if (isHeading) {
              return (
                <h2
                  key={i}
                  style={{
                    color: T1,
                    fontSize: '16px',
                    fontWeight: 800,
                    letterSpacing: '-0.2px',
                    marginBottom: '12px',
                    paddingTop: '18px',
                    borderTop: `1px solid ${BORDER}`,
                  }}
                >
                  {first}
                </h2>
              )
            }
            return (
              <p
                key={i}
                style={{ color: T2, fontSize: '14.5px', lineHeight: 1.75, marginBottom: '18px' }}
              >
                {block}
              </p>
            )
          })}

          <div
            style={{
              borderTop: `1px solid ${BORDER}`,
              marginTop: '36px',
              paddingTop: '20px',
              display: 'flex',
              gap: '20px',
              flexWrap: 'wrap',
            }}
          >
            <a
              href="/privacy"
              style={{
                display: 'inline-block',
                padding: '5px 0',
                color: T2,
                fontSize: '13.5px',
                fontWeight: 600,
                textDecoration: 'none',
                borderBottom: `1px solid ${BORDER}`,
              }}
            >
              Privacy policy
            </a>
            <a
              href="/terms"
              style={{
                display: 'inline-block',
                padding: '5px 0',
                color: T2,
                fontSize: '13.5px',
                fontWeight: 600,
                textDecoration: 'none',
                borderBottom: `1px solid ${BORDER}`,
              }}
            >
              Terms of service
            </a>
            <a
              href={`mailto:${CONTACT}`}
              style={{
                color: T2,
                fontSize: '13.5px',
                fontWeight: 600,
                textDecoration: 'none',
                borderBottom: `1px solid ${BORDER}`,
              }}
            >
              Contact
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
