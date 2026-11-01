'use client'
import { useState } from 'react'
import SiteHeader from '@/components/SiteHeader'

const T1 = '#141413'
const T2 = '#3F3D36'

// ─── Payment details — replace the placeholders below ────────────────────────
// TODO: set your real PayPal.me link (also handles credit/debit via guest checkout)
const PAYPAL_URL = 'https://paypal.me/YOUR_PAYPAL_USERNAME'
// TODO: set your Stripe payment link if you have one; otherwise card goes through PayPal
const CARD_URL = PAYPAL_URL
// TODO: set the email or US phone number enrolled with Zelle
const ZELLE_RECIPIENT = 'relay.arc.org@gmail.com'
const ZELLE_NAME = 'Relay Arc'

export default function Donate() {
  const [copied, setCopied] = useState(false)
  // Hide the PayPal and card buttons until a real link is set above.
  const paypalReady = !PAYPAL_URL.includes('YOUR_')

  const copyZelle = async () => {
    try {
      await navigator.clipboard.writeText(ZELLE_RECIPIENT)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const block = (bg: string): React.CSSProperties => ({ background: bg, padding: 'clamp(48px, 7vw, 88px) 24px' })
  const inner: React.CSSProperties = { maxWidth: '1120px', margin: '0 auto' }

  return (
    <div style={{ minHeight: '100dvh', background: '#B3DDAC', color: T1 }}>
      <SiteHeader />
      <div style={{ ...inner, padding: '56px 24px 80px' }} data-reveal>
        <h1 className="ds-display" style={{ fontSize: 'clamp(44px, 7vw, 96px)' }}>
          Keep Relay Arc free
        </h1>
        <p className="ds-lead" style={{ marginTop: '24px' }}>
          Relay Arc is free for every patient and always will be. Gifts pay for maps, hospital data
          and the servers that answer when someone presses SOS.
        </p>
      </div>

      <section style={block('#FFFFFF')}>
        <div style={inner} data-reveal>
          <h2 className="ds-title" style={{ fontSize: 'clamp(30px, 4vw, 52px)' }}>
            Zelle
          </h2>
          <p className="ds-body" style={{ marginTop: '18px' }}>
            No fees, straight from your bank app. Choose Send with Zelle and add this email.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginTop: '28px' }}>
            <div className="sh-cut" style={{ background: '#DDEFD9', padding: '16px 28px 16px 20px' }}>
              <p className="ds-small" style={{ color: T2 }}>
                Send to {ZELLE_NAME}
              </p>
              <p style={{ fontSize: '20px', fontWeight: 800, overflowWrap: 'anywhere' }}>{ZELLE_RECIPIENT}</p>
            </div>
            <button onClick={copyZelle} className="ds-btn ds-btn-ink sh-pill" aria-live="polite">
              {copied ? 'Copied' : 'Copy email'}
            </button>
          </div>
          <p className="ds-small" style={{ color: T2, marginTop: '16px' }}>
            Check that the name says Relay Arc before you send.
          </p>
        </div>
      </section>

      {paypalReady && (
        <section style={block('#DDEFD9')}>
          <div style={inner} data-reveal>
            <h2 className="ds-title" style={{ fontSize: 'clamp(30px, 4vw, 52px)' }}>
              PayPal or card
            </h2>
            <p className="ds-body" style={{ marginTop: '18px' }}>
              Give once or every month. Card payments work without a PayPal account.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '28px' }}>
              <a href={PAYPAL_URL} target="_blank" rel="noopener noreferrer" className="ds-btn ds-btn-sos sh-slant">
                Give with PayPal
              </a>
              <a href={CARD_URL} target="_blank" rel="noopener noreferrer" className="ds-btn ds-btn-line sh-pill">
                Give by card
              </a>
            </div>
          </div>
        </section>
      )}

      <div style={{ ...inner, padding: '56px 24px 96px' }}>
        <p className="ds-body">
          Every gift goes to building and hosting Relay Arc. Questions go to relay.arc.org@gmail.com.
        </p>
      </div>
    </div>
  )
}
