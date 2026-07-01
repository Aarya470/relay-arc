'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Heart, Brain, Zap, Activity, Wind, AlertCircle, Plus } from 'lucide-react'

const ease = { type: 'spring', stiffness: 300, damping: 28 } as const
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: ease } }
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }

type Emergency = {
  id: string
  user_id: string
  emergency_type: string
  status: 'active' | 'resolved'
  created_at: string
}

const TYPE_META: Record<string, { label: string; Icon: React.ElementType }> = {
  chest_pain:  { label: 'Chest pain',     Icon: Heart },
  stroke:      { label: 'Stroke signs',   Icon: Brain },
  pots:        { label: 'POTS episode',   Icon: Zap },
  mecfs:       { label: 'Severe crash',   Icon: Activity },
  breathing:   { label: "Can't breathe",  Icon: Wind },
  unconscious: { label: 'Unconscious',    Icon: AlertCircle },
  other:       { label: 'Emergency',      Icon: Plus },
}

function getTypeMeta(type: string) {
  return TYPE_META[type] ?? { label: type, Icon: AlertCircle }
}

function parseTS(ts: string) {
  if (!ts) return new Date()
  return new Date(/[Z+]/.test(ts) ? ts : ts + 'Z')
}

function formatDateTime(ts: string) {
  const d = parseTS(ts)
  const month = d.toLocaleString('en-US', { month: 'short' })
  const day = d.getDate()
  const time = d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  return `${month} ${day} · ${time}`
}

function getMonthLabel(ts: string) {
  const d = parseTS(ts)
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

function groupByMonth(emergencies: Emergency[]): Array<{ month: string; items: Emergency[] }> {
  const map = new Map<string, Emergency[]>()
  for (const e of emergencies) {
    const key = getMonthLabel(e.created_at)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(e)
  }
  return Array.from(map.entries()).map(([month, items]) => ({ month, items }))
}

function durationHint(ts: string): string {
  const now = Date.now()
  const then = parseTS(ts).getTime()
  const mins = Math.round((now - then) / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function EmergencyHistoryPage() {
  const router = useRouter()
  const [emergencies, setEmergencies] = useState<Emergency[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase
        .from('emergencies')
        .select('id, user_id, emergency_type, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setEmergencies(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const groups = groupByMonth(emergencies)

  if (loading) return (
    <div style={{ minHeight: '100dvh', background: '#070710', padding: '80px 20px 40px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ height: '72px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', animation: 'pulse 1.5s ease-in-out infinite' }}/>
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', background: '#070710', paddingBottom: '40px' }}>
      {/* Header */}
      <div style={{ padding: '56px 20px 16px', maxWidth: '720px', margin: '0 auto', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => router.back()}
          style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0, marginTop: '2px',
          }}
        >
          <ArrowLeft size={16} color="#8888A8"/>
        </motion.button>
        <div>
          <h1 style={{ color: '#EEEEF8', fontSize: '26px', fontWeight: 800, letterSpacing: '-0.6px', lineHeight: 1.1 }}>Emergency History</h1>
          <p style={{ color: '#505068', fontSize: '13px', marginTop: '4px' }}>Your past SOS events</p>
        </div>
      </div>

      <div style={{ padding: '0 20px', maxWidth: '720px', margin: '0 auto' }}>
        {emergencies.length === 0 ? (
          /* Empty state */
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={ease}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center' }}
          >
            <div style={{
              width: '64px', height: '64px', borderRadius: '20px',
              background: 'rgba(255,55,55,0.10)', border: '1px solid rgba(255,55,55,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px',
            }}>
              <AlertCircle size={28} color="#FF3737"/>
            </div>
            <p style={{ color: '#EEEEF8', fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>No emergency history</p>
            <p style={{ color: '#505068', fontSize: '14px', lineHeight: 1.6, maxWidth: '260px' }}>Your past SOS events will appear here</p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push('/dashboard')}
              style={{
                marginTop: '28px', background: '#4F8EF7', color: 'white',
                fontWeight: 600, fontSize: '14px', padding: '12px 24px',
                borderRadius: '14px', border: 'none', cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(79,142,247,0.28)',
              }}
            >
              Go to dashboard
            </motion.button>
          </motion.div>
        ) : (
          <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {groups.map(({ month, items }) => (
              <motion.div key={month} variants={fadeUp}>
                {/* Month chip */}
                <p style={{
                  color: '#505068', fontSize: '11px', fontWeight: 700,
                  letterSpacing: '1.2px', textTransform: 'uppercase',
                  fontFamily: 'var(--font-mono, monospace)',
                  marginBottom: '10px',
                }}>
                  {month}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {items.map(em => {
                    const { label, Icon } = getTypeMeta(em.emergency_type)
                    const resolved = em.status === 'resolved'
                    return (
                      <motion.div
                        key={em.id}
                        whileTap={{ scale: 0.99 }}
                        style={{
                          background: '#121220',
                          border: `1px solid ${resolved ? 'rgba(255,255,255,0.06)' : 'rgba(255,55,55,0.20)'}`,
                          borderRadius: '16px',
                          boxShadow: resolved ? 'none' : '0 2px 16px rgba(255,55,55,0.08)',
                          padding: '14px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                        }}
                      >
                        {/* Icon */}
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '12px',
                          background: resolved ? 'rgba(255,255,255,0.05)' : 'rgba(255,55,55,0.12)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <Icon size={18} color={resolved ? '#505068' : '#FF3737'}/>
                        </div>

                        {/* Details */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: '#EEEEF8', fontWeight: 600, fontSize: '14px' }}>{label}</p>
                          <p style={{
                            color: '#505068', fontSize: '12px', marginTop: '2px',
                            fontFamily: 'var(--font-mono, monospace)',
                          }}>
                            {formatDateTime(em.created_at)}
                          </p>
                        </div>

                        {/* Status badge */}
                        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                          {resolved ? (
                            <span style={{
                              background: 'rgba(0,214,143,0.12)',
                              color: '#00D68F',
                              fontSize: '11px', fontWeight: 600,
                              padding: '3px 9px', borderRadius: '99px',
                              border: '1px solid rgba(0,214,143,0.20)',
                            }}>
                              Resolved
                            </span>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span style={{ position: 'relative', display: 'inline-flex', width: '8px', height: '8px' }}>
                                <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#FF3737', opacity: 0.4, animation: 'ping 1.2s cubic-bezier(0,0,0.2,1) infinite' }}/>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FF3737', display: 'block' }}/>
                              </span>
                              <span style={{ color: '#FF3737', fontSize: '11px', fontWeight: 600 }}>Active</span>
                            </div>
                          )}
                          {resolved && (
                            <span style={{ color: '#505068', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)' }}>
                              {durationHint(em.created_at)}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      <style>{`@keyframes ping { 75%,100%{transform:scale(2);opacity:0} }`}</style>
    </div>
  )
}
