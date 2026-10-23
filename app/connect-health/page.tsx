'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Copy, Check, ChevronRight, Heart, Activity, Zap, AlertCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { SITE_URL } from '@/lib/site'

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG      = '#B3DDAC'
const SURFACE = '#FFFFFF'
const T1      = '#141413'
const T2      = '#5C5A52'
const T3      = '#5C5A52'
const ACCENT  = '#42623C'
const ACCENT_DIM = 'rgba(86,128,78,0.08)'
const GREEN   = '#42623C'
const GREEN_DIM = 'rgba(86,128,78,0.08)'
const BORDER  = '#98C890'
const SHADOW  = 'none'

const spring = { type: 'spring', stiffness: 340, damping: 26 } as const
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }
const fadeUp  = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: spring } }

// Two real routes into Apple Health. The old step 1 linked to an iCloud
// shortcut URL that never existed, so nobody could actually connect.
//   1. One-off import: Health → Export All Health Data → /check reads the file
//      on the phone. Works for anyone, no account, nothing uploaded.
//   2. Daily automatic sync: a Shortcut the person builds in about two minutes
//      that posts their latest readings to /api/health/ingest with their key.
const STEPS = [
  {
    num: '01',
    title: 'Quickest: import your Health export',
    body: 'In the Health app tap your picture, then Export All Health Data. Open the Relay vitals check and choose the export.zip file. It is read on your phone and nothing is uploaded. Your pulse, oxygen, breathing rate, blood pressure and temperature fill in, and you get a NEWS2 score.',
    cta: 'Open the vitals check →',
    ctaHref: '/check',
  },
  {
    num: '02',
    title: 'Daily sync: build the shortcut',
    body: 'In the Shortcuts app tap +. Add "Find Health Samples", set the type to Heart Rate, sort by latest first, limit 1. Add "Get Contents of URL" with the address shown below, method POST, request body JSON with: api_key = your key below, source = apple_health, and readings = a list containing type heart_rate and value from the Health sample. Repeat the find step for Oxygen Saturation, Respiratory Rate and Blood Pressure if you have them.',
  },
  {
    num: '03',
    title: 'Allow Health access',
    body: 'The first time the shortcut runs, iOS asks which Health data it may read. Allow the types you added.',
  },
  {
    num: '04',
    title: 'Run it every morning',
    body: 'In Shortcuts tap Automation, then New Automation, then Time of Day. Pick a time, choose your Relay shortcut, and turn off Ask Before Running. Done.',
  },
]

const SUPPORTED = [
  { icon: Heart,    label: 'Heart rate' },
  { icon: Activity, label: 'Blood pressure' },
  { icon: Zap,      label: 'O₂ saturation' },
  { icon: Activity, label: 'Respiratory rate' },
  { icon: Heart,    label: 'Heart rate variability' },
  { icon: Activity, label: 'Steps' },
  { icon: Activity, label: 'Weight' },
]

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('Copied to clipboard')
    } catch {
      toast.error('Could not copy. Please copy manually')
    }
  }
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={copy}
      style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        background: copied ? GREEN_DIM : ACCENT_DIM,
        border: `1px solid ${copied ? 'rgba(86,128,78,0.2)' : 'rgba(86,128,78,0.2)'}`,
        borderRadius: '14px',
        padding: '7px 13px',
        cursor: 'pointer',
        color: copied ? GREEN : ACCENT,
        fontSize: '12px', fontWeight: 700,
        transition: 'all 0.2s ease',
        flexShrink: 0,
      }}>
      {copied ? <Check size={12}/> : <Copy size={12}/>}
      {copied ? 'Copied' : 'Copy'}
    </motion.button>
  )
}

export default function ConnectHealth() {
  const [token, setToken]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [connected, setConnected]   = useState(false)
  const router = useRouter()

  const loadToken = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('health_ingest_token')
      .eq('id', user.id)
      .single()

    if (profile?.health_ingest_token) {
      setToken(profile.health_ingest_token)
    } else {
      // Generate and save a new token
      const newToken = crypto.randomUUID().replace(/-/g, '')
      const { error } = await supabase
        .from('profiles')
        .update({ health_ingest_token: newToken })
        .eq('id', user.id)
      if (!error) setToken(newToken)
    }

    // Check if we have any Apple Health data (vitals with source='apple_health')
    const { data: vitals } = await supabase
      .from('vitals_logs')
      .select('id')
      .eq('user_id', user.id)
      .eq('source', 'apple_health')
      .limit(1)
    setConnected((vitals?.length ?? 0) > 0)
    setLoading(false)
  }

  useEffect(() => { loadToken() }, [])

  const regenerateToken = async () => {
    setRefreshing(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setRefreshing(false); return }
    const newToken = crypto.randomUUID().replace(/-/g, '')
    const { error } = await supabase.from('profiles').update({ health_ingest_token: newToken }).eq('id', user.id)
    if (!error) { setToken(newToken); toast.success('New API key generated. Update your Shortcut') }
    setRefreshing(false)
  }

  const ingestUrl = (typeof window !== 'undefined' ? window.location.origin : SITE_URL) + '/api/health/ingest'

  return (
    <div style={{ minHeight: '100dvh', background: BG, paddingBottom: '32px' }}>

      {/* Header */}
      <div style={{
        padding: '52px 20px 18px',
        borderBottom: `1px solid ${BORDER}`,
        background: 'rgba(255,255,255,0.94)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => router.back()}
          style={{
            width: '34px', height: '34px', borderRadius: '14px',
            background: BG, border: `1px solid ${BORDER}`,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
          <ArrowLeft size={15} color={T2}/>
        </motion.button>
        <div>
          <h1 style={{ color: T1, fontWeight: 800, fontSize: '17px', letterSpacing: '-0.4px', margin: 0 }}>Connect Apple Health</h1>
          <p style={{ color: T3, fontSize: '11px', marginTop: '2px', fontFamily: 'var(--font-mono, monospace)', letterSpacing: '0.4px' }}>
            Auto-sync vitals from your iPhone
          </p>
        </div>
        {connected && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px', background: GREEN_DIM, border: '1px solid rgba(86,128,78,0.2)', borderRadius: '14px', padding: '4px 10px' }}>
            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: GREEN }}/>
            <span style={{ color: GREEN, fontSize: '10px', fontWeight: 700, fontFamily: 'var(--font-mono, monospace)', letterSpacing: '0.5px' }}>SYNCED</span>
          </div>
        )}
      </div>

      <motion.div
        variants={stagger} initial="hidden" animate="show"
        style={{ padding: '18px 20px', maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* What gets synced */}
        <motion.div variants={fadeUp}
          style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '12px', overflow: 'hidden', boxShadow: SHADOW }}>
          <div style={{ padding: '13px 16px', borderBottom: `1px solid ${BORDER}` }}>
            <span style={{ color: T3, fontSize: '13px', fontWeight: 600, letterSpacing: '0' }}>
              What gets synced
            </span>
          </div>
          <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {SUPPORTED.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 0' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '14px', background: ACCENT_DIM, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <s.icon size={11} color={ACCENT} strokeWidth={2}/>
                </div>
                <span style={{ color: T2, fontSize: '12px', fontWeight: 500 }}>{s.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* API key */}
        {!loading && (
          <motion.div variants={fadeUp}
            style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '12px', overflow: 'hidden', boxShadow: SHADOW }}>
            <div style={{ padding: '13px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: T3, fontSize: '13px', fontWeight: 600, letterSpacing: '0' }}>
                Your API key
              </span>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={regenerateToken}
                disabled={refreshing}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  background: 'none', border: 'none', color: T3,
                  fontSize: '11px', fontWeight: 500, cursor: 'pointer',
                }}>
                <RefreshCw size={10} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}/>
                Regenerate
              </motion.button>
            </div>
            <div style={{ padding: '14px 16px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                background: BG, borderRadius: '14px', padding: '12px 14px',
                border: `1px solid ${BORDER}`,
              }}>
                <code style={{ color: T1, fontSize: '12px', fontFamily: 'var(--font-code, monospace)', wordBreak: 'break-all', flex: 1 }}>
                  {token || '. '}
                </code>
                {token && <CopyButton value={token}/>}
              </div>
              <p style={{ color: T3, fontSize: '11px', marginTop: '8px', lineHeight: 1.5 }}>
                Keep this private. It identifies your account and cannot be used by anyone else.
              </p>
            </div>
          </motion.div>
        )}

        {/* Endpoint URL */}
        <motion.div variants={fadeUp}
          style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '12px', overflow: 'hidden', boxShadow: SHADOW }}>
          <div style={{ padding: '13px 16px', borderBottom: `1px solid ${BORDER}` }}>
            <span style={{ color: T3, fontSize: '13px', fontWeight: 600, letterSpacing: '0' }}>
              Endpoint URL
            </span>
          </div>
          <div style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', background: BG, borderRadius: '14px', padding: '12px 14px', border: `1px solid ${BORDER}` }}>
              <code style={{ color: T1, fontSize: '11px', fontFamily: 'var(--font-code, monospace)', wordBreak: 'break-all', flex: 1 }}>
                {ingestUrl}
              </code>
              <CopyButton value={ingestUrl}/>
            </div>
          </div>
        </motion.div>

        {/* Steps */}
        <motion.div variants={fadeUp}
          style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '12px', overflow: 'hidden', boxShadow: SHADOW }}>
          <div style={{ padding: '13px 16px', borderBottom: `1px solid ${BORDER}` }}>
            <span style={{ color: T3, fontSize: '13px', fontWeight: 600, letterSpacing: '0' }}>
              Setup guide
            </span>
          </div>
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '0' }}>
            {STEPS.map((step, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', gap: '14px',
                  padding: '14px 0',
                  borderBottom: i < STEPS.length - 1 ? `1px solid ${BORDER}` : 'none',
                }}>
                <span style={{
                  color: ACCENT,
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: '10px', fontWeight: 800,
                  letterSpacing: '0.5px', flexShrink: 0, marginTop: '2px',
                }}>
                  {step.num}
                </span>
                <div style={{ flex: 1 }}>
                  <p style={{ color: T1, fontWeight: 700, fontSize: '14px', marginBottom: '5px', letterSpacing: '-0.2px' }}>{step.title}</p>
                  <p style={{ color: T2, fontSize: '13px', lineHeight: 1.55 }}>{step.body}</p>
                  {step.cta && step.ctaHref && (
                    <a
                      href={step.ctaHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        marginTop: '10px',
                        background: ACCENT,
                        color: '#FFFFFF',
                        fontWeight: 700, fontSize: '12px',
                        padding: '9px 15px', borderRadius: '14px',
                        textDecoration: 'none',
                      }}>
                      {step.cta}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Privacy note */}
        <motion.div variants={fadeUp}
          style={{
            display: 'flex', gap: '10px', alignItems: 'flex-start',
            padding: '12px 14px',
            background: SURFACE, border: `1px solid ${BORDER}`,
            borderRadius: '12px', boxShadow: SHADOW,
          }}>
          <AlertCircle size={13} color={T3} style={{ flexShrink: 0, marginTop: '2px' }}/>
          <p style={{ color: T2, fontSize: '12px', lineHeight: 1.55, margin: 0 }}>
            Your health data is sent directly to Relay Arc servers over HTTPS. It is never shared with third parties and is used only to power your AI health intelligence insights.
          </p>
        </motion.div>

      </motion.div>
    </div>
  )
}
