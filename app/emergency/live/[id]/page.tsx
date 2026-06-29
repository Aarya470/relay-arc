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
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: '#F2EFE9', color: '#1A2820' }}
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
            className="w-full py-3 px-6 flex items-center justify-center gap-3 text-white font-semibold text-sm"
            style={{ backgroundColor: isActive ? '#DC2626' : '#5C8B74' }}
          >
            {isActive ? (
              <>
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
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

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        {loading && (
          <div className="flex flex-col items-center gap-4 text-[#5C8B74]">
            <Loader2 size={36} className="animate-spin" />
            <p className="text-sm" style={{ color: '#1A2820' }}>Loading emergency status…</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center gap-4 text-center max-w-sm">
            <AlertCircle size={40} style={{ color: '#DC2626' }} />
            <p className="text-base font-medium">{error}</p>
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
              className="flex flex-col items-center gap-6 max-w-md w-full text-center"
            >
              {/* Patient name */}
              <h1 className="text-2xl font-bold leading-snug" style={{ color: '#1A2820' }}>
                {data.patientFirstName} is receiving emergency care
              </h1>

              {/* Emergency type badge */}
              <span
                className="px-4 py-1.5 rounded-full text-sm font-semibold"
                style={{
                  backgroundColor: isActive ? '#FEE2E2' : '#D1FAE5',
                  color: isActive ? '#DC2626' : '#065F46',
                }}
              >
                {typeLabel}
              </span>

              {/* Time since started */}
              <p className="text-sm font-medium" style={{ color: '#5C8B74' }}>
                {timeDisplay}
              </p>

              {/* Status message */}
              <div
                className="rounded-2xl p-5 text-sm leading-relaxed"
                style={{ backgroundColor: '#E8E3DA', color: '#1A2820' }}
              >
                {isActive ? (
                  <p>
                    Emergency services have been notified. Your family member is being routed to
                    the nearest hospital. Stay calm — help is on the way.
                  </p>
                ) : (
                  <p>
                    {data.patientFirstName} has marked the emergency as resolved and is safe.
                  </p>
                )}
              </div>

              {/* Auto-refresh badge */}
              <div
                className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full"
                style={{ backgroundColor: '#E8E3DA', color: '#5C8B74' }}
              >
                <RefreshCw
                  size={12}
                  className={spinning ? 'animate-spin' : ''}
                  style={{ transition: 'transform 0.3s' }}
                />
                Updates every 15 seconds
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Call 911 button — always at bottom */}
      <div className="px-6 pb-10 flex justify-center">
        <a
          href="tel:911"
          className="flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-bold text-base shadow-md active:scale-95 transition-transform"
          style={{ backgroundColor: '#DC2626' }}
        >
          <Phone size={20} />
          Call 911
        </a>
      </div>
    </div>
  )
}
