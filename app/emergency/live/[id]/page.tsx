'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react'

const EMERGENCY_LABELS: Record<string, string> = {
  chest_pain: 'Chest pain',
  stroke: 'Stroke signs',
  pots: 'POTS episode',
  mecfs: 'Severe crash',
  breathing: "Can't breathe",
  unconscious: 'Unconscious',
  other: 'Emergency',
}

interface EmergencyData {
  id: string
  type: string
  status: 'active' | 'resolved'
  startedAt: string
  patientFirstName: string
}

function timeAgo(isoString: string): string {
  const start = new Date(isoString).getTime()
  const now = Date.now()
  const diffMs = now - start
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)

  if (diffHr > 0) return `Started ${diffHr} hour${diffHr !== 1 ? 's' : ''} ago`
  if (diffMin > 0) return `Started ${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`
  return 'Just started'
}

export default function EmergencyLivePage() {
  const params = useParams()
  const id = params?.id as string

  const [data, setData] = useState<EmergencyData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [spinning, setSpinning] = useState(false)
  const [timeDisplay, setTimeDisplay] = useState('')

  async function fetchStatus() {
    try {
      setSpinning(true)
      const res = await fetch(`/api/emergency/live/${id}`)
      if (!res.ok) {
        setError('This emergency link is invalid or has expired.')
        return
      }
      const json: EmergencyData = await res.json()
      setData(json)
      setLastRefresh(new Date())
      setError(null)
    } catch {
      setError('Unable to load emergency status. Please try again.')
    } finally {
      setLoading(false)
      setTimeout(() => setSpinning(false), 600)
    }
  }

  useEffect(() => {
    if (!id) return
    fetchStatus()
    const interval = setInterval(fetchStatus, 15000)
    return () => clearInterval(interval)
  }, [id])

  // Update time-ago display every 30 seconds
  useEffect(() => {
    if (!data) return
    setTimeDisplay(timeAgo(data.startedAt))
    const t = setInterval(() => setTimeDisplay(timeAgo(data.startedAt)), 30000)
    return () => clearInterval(t)
  }, [data])

  const isActive = data?.status === 'active'
  const typeLabel = data ? (EMERGENCY_LABELS[data.type] ?? 'Emergency') : ''

  return (
    <div
      style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: '#F4F5F7', color: '#0E1218' }}
    >
      {/* Status bar */}
      <AnimatePresence mode="wait">
        {data && (
          <motion.div
            key={data.status}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            style={{
              width: '100%',
              padding: '14px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              color: 'white',
              fontWeight: 700,
              fontSize: '13px',
              background: isActive
                ? 'linear-gradient(90deg, #CC1F1F, #D91414)'
                : 'linear-gradient(90deg, #009965, #007A44)',
              boxShadow: isActive
                ? '0 4px 24px rgba(217,20,20,0.30)'
                : '0 4px 24px rgba(0,122,68,0.22)',
              letterSpacing: '-0.1px',
            }}
          >
            {isActive ? (
              <>
                <span style={{ position: 'relative', display: 'inline-flex', width: '12px', height: '12px' }}>
                  <motion.span
                    style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'white', opacity: 0.75 }}
                    animate={{ scale: [1, 2, 1], opacity: [0.75, 0, 0.75] }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                  />
                  <span style={{ position: 'relative', display: 'inline-flex', width: '12px', height: '12px', borderRadius: '50%', background: 'white' }} />
                </span>
                Emergency in progress
              </>
            ) : (
              <>
                <CheckCircle size={16} />
                Emergency resolved — they are safe
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* LIVE badge for active emergencies */}
      {data && isActive && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(217,20,20,0.12)', border: '1px solid rgba(217,20,20,0.28)', borderRadius: '99px', padding: '6px 14px' }}>
            <motion.div
              style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#D91414' }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <span style={{ color: '#D91414', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>LIVE</span>
          </div>
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <Loader2 size={36} color="#0055FF" />
            </motion.div>
            <p style={{ color: '#5B6371', fontSize: '14px' }}>Loading emergency status…</p>
          </div>
        )}

        {error && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center', maxWidth: '320px' }}>
            <AlertCircle size={40} color="#D91414" />
            <p style={{ color: '#0E1218', fontSize: '15px', fontWeight: 600 }}>{error}</p>
          </div>
        )}

        {data && !loading && (
          <AnimatePresence mode="wait">
            <motion.div
              key={data.status}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.4 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', maxWidth: '400px', width: '100%', textAlign: 'center' }}
            >
              {/* Patient name */}
              <h1 style={{ color: '#0E1218', fontSize: '22px', fontWeight: 800, letterSpacing: '-0.6px', lineHeight: 1.3 }}>
                {data.patientFirstName} is receiving emergency care
              </h1>

              {/* Emergency type badge */}
              <span
                style={{
                  padding: '6px 16px',
                  borderRadius: '99px',
                  fontSize: '13px',
                  fontWeight: 700,
                  background: isActive ? 'rgba(217,20,20,0.12)' : 'rgba(0,122,68,0.12)',
                  color: isActive ? '#D91414' : '#007A44',
                  border: `1px solid ${isActive ? 'rgba(217,20,20,0.28)' : 'rgba(0,122,68,0.28)'}`,
                  fontFamily: 'var(--font-mono, monospace)',
                  letterSpacing: '0.3px',
                }}
              >
                {typeLabel}
              </span>

              {/* Time since started */}
              <p style={{ color: '#9AA2AD', fontSize: '12px', fontFamily: 'var(--font-mono, monospace)', letterSpacing: '0.5px' }}>
                {timeDisplay}
              </p>

              {/* Patient info card */}
              <div
                style={{
                  width: '100%',
                  background: '#FFFFFF',
                  border: `1px solid ${isActive ? 'rgba(217,20,20,0.18)' : 'rgba(0,122,68,0.16)'}`,
                  borderRadius: '18px',
                  padding: '20px',
                  textAlign: 'left',
                }}
              >
                <p style={{ color: '#9AA2AD', fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Status update</p>
                <p style={{ color: '#5B6371', fontSize: '13px', lineHeight: 1.65 }}>
                  {isActive ? (
                    <>Emergency services have been notified. {data.patientFirstName} is being routed to the nearest hospital. Stay calm — help is on the way.</>
                  ) : (
                    <>{data.patientFirstName} has marked the emergency as resolved and is safe.</>
                  )}
                </p>
              </div>

              {/* Auto-refresh badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#ECEEF2',
                  border: '1px solid #E3E6EC',
                  borderRadius: '99px',
                  padding: '6px 14px',
                  color: '#9AA2AD',
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono, monospace)',
                }}
              >
                <motion.div animate={spinning ? { rotate: 360 } : { rotate: 0 }} transition={spinning ? { duration: 0.6, ease: 'linear' } : {}}>
                  <RefreshCw size={11} color="#9AA2AD" />
                </motion.div>
                Updates every 15 seconds
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Call 911 button — always at bottom */}
      <div style={{ padding: '0 24px 40px', display: 'flex', justifyContent: 'center' }}>
        <a
          href="tel:911"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '16px 40px',
            borderRadius: '16px',
            background: '#D91414',
            color: 'white',
            fontWeight: 800,
            fontSize: '15px',
            textDecoration: 'none',
            boxShadow: '0 6px 24px rgba(217,20,20,0.35)',
            letterSpacing: '-0.2px',
          }}
        >
          <Phone size={20} />
          Call 911
        </a>
      </div>
    </div>
  )
}
