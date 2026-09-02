'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Copy, Check, ExternalLink } from 'lucide-react'
import Mark from '@/components/Mark'

// ─── Design tokens — shared with the homepage ────────────────────────────────
const T1     = '#141413'
const T2     = '#5C5A52'
const T3     = '#7E7C74'
const BORDER = '#CFD9BB'
const RED    = '#A33417'
const GREEN  = '#5D6E47'
const ACCENT = '#5D6E47'

const mono = 'var(--font-mono, monospace)'

// ─── Payment details — replace the placeholders below ────────────────────────
// TODO: set your real PayPal.me link (also handles credit/debit via guest checkout)
const PAYPAL_URL = 'https://paypal.me/YOUR_PAYPAL_USERNAME'
// TODO: set your Stripe payment link if you have one; otherwise card goes through PayPal
const CARD_URL = PAYPAL_URL
// TODO: set the email or US phone number enrolled with Zelle
const ZELLE_RECIPIENT = 'your-zelle-email@example.com'
const ZELLE_NAME = 'Relay Arc'

export default function Donate() {
  const router = useRouter()
  const [copied, setCopied] = useState(false)

  const copyZelle = async () => {
    try {
      await navigator.clipboard.writeText(ZELLE_RECIPIENT)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#E4EBD3' }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '3px', background: T1, zIndex: 10 }}/>

      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: 'easeOut' }}
        style={{ maxWidth: '680px', margin: '0 auto', padding: '72px 24px 96px' }}>

        {/* Brand + back */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '64px' }}>
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

        {/* Header */}
        <div style={{ borderTop: `3px solid ${T1}`, paddingTop: '14px', marginBottom: '36px' }}>
          <span style={{ color: T1, fontFamily: mono, fontSize: '11px', fontWeight: 700, letterSpacing: '1.8px', textTransform: 'uppercase' }}>Support / Donate</span>
        </div>

        <h1 style={{ color: T1, fontSize: 'clamp(36px, 6vw, 56px)', fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 0.98, marginBottom: '20px' }}>
          Keep the margin<br/>free<span style={{ color: RED }}>.</span>
        </h1>
        <p style={{ color: T2, fontSize: '16px', lineHeight: 1.65, marginBottom: '56px', maxWidth: '480px' }}>
          Relay is free for every patient, and it stays that way. Donations pay for routing infrastructure, hospital data, and the servers that answer when someone holds SOS.
        </p>

        {/* ── 01 PayPal ── */}
        <div style={{ borderTop: `1px solid ${T1}`, padding: '24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', marginBottom: '8px' }}>
            <span style={{ color: ACCENT, fontFamily: mono, fontSize: '11px', fontWeight: 700 }}>01</span>
            <h2 style={{ color: T1, fontSize: '19px', fontWeight: 800, letterSpacing: '-0.02em' }}>PayPal</h2>
          </div>
          <p style={{ color: T2, fontSize: '14px', lineHeight: 1.6, marginBottom: '18px', maxWidth: '440px' }}>
            One-time or monthly, from any PayPal balance or linked bank.
          </p>
          <a href={PAYPAL_URL} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: T1, color: 'white', fontWeight: 600, fontSize: '14.5px', padding: '13px 24px', textDecoration: 'none', fontFamily: 'inherit' }}>
            Donate with PayPal <ExternalLink size={13}/>
          </a>
        </div>

        {/* ── 02 Card ── */}
        <div style={{ borderTop: `1px solid ${T1}`, padding: '24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', marginBottom: '8px' }}>
            <span style={{ color: GREEN, fontFamily: mono, fontSize: '11px', fontWeight: 700 }}>02</span>
            <h2 style={{ color: T1, fontSize: '19px', fontWeight: 800, letterSpacing: '-0.02em' }}>Credit or debit card</h2>
          </div>
          <p style={{ color: T2, fontSize: '14px', lineHeight: 1.6, marginBottom: '18px', maxWidth: '440px' }}>
            Guest checkout — no account needed. Visa, Mastercard, Amex, Discover.
          </p>
          <a href={CARD_URL} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: 'none', color: T1, fontWeight: 600, fontSize: '14.5px', padding: '12px 24px', textDecoration: 'none', border: `1.5px solid ${T1}`, fontFamily: 'inherit' }}>
            Donate by card <ExternalLink size={13}/>
          </a>
        </div>

        {/* ── 03 Zelle ── */}
        <div style={{ borderTop: `1px solid ${T1}`, borderBottom: `1px solid ${T1}`, padding: '24px 0 28px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', marginBottom: '8px' }}>
            <span style={{ color: RED, fontFamily: mono, fontSize: '11px', fontWeight: 700 }}>03</span>
            <h2 style={{ color: T1, fontSize: '19px', fontWeight: 800, letterSpacing: '-0.02em' }}>Zelle</h2>
          </div>
          <p style={{ color: T2, fontSize: '14px', lineHeight: 1.6, marginBottom: '18px', maxWidth: '460px' }}>
            No fees, straight from your US banking app. Open your bank's app, choose <strong style={{ color: T1 }}>Send with Zelle</strong>, and add this recipient:
          </p>
          <div style={{ display: 'flex', alignItems: 'stretch', gap: '0', maxWidth: '440px', border: `1.5px solid ${T1}` }}>
            <div style={{ flex: 1, padding: '13px 16px', minWidth: 0 }}>
              <p style={{ color: T3, fontFamily: mono, fontSize: '9px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '3px' }}>Zelle recipient · {ZELLE_NAME}</p>
              <p style={{ color: T1, fontFamily: mono, fontSize: '14px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ZELLE_RECIPIENT}</p>
            </div>
            <button onClick={copyZelle}
              style={{ display: 'flex', alignItems: 'center', gap: '7px', background: copied ? GREEN : T1, color: 'white', border: 'none', padding: '0 18px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: 600, flexShrink: 0, transition: 'background 0.15s' }}>
              {copied ? <Check size={13}/> : <Copy size={13}/>}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p style={{ color: T3, fontSize: '12px', marginTop: '12px' }}>
            Zelle is available through most US banks. Confirm the recipient name matches before sending.
          </p>
        </div>

        <p style={{ color: T3, fontFamily: mono, fontSize: '11.5px', lineHeight: 1.7, marginTop: '28px' }}>
          Every donation goes to development and infrastructure. Questions — 5satadruroy@gmail.com
        </p>
      </motion.div>
    </div>
  )
}
