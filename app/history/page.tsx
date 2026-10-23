'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ChevronDown, Heart, AlertTriangle, Calendar } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import BottomNav from '@/components/BottomNav'

const spring = { type: 'spring', stiffness: 340, damping: 26 } as const

function parseTS(ts: string) {
  if (!ts) return new Date()
  return new Date(/[Z+]/.test(ts) ? ts : ts + 'Z')
}

type Checkin = { id: string; created_at: string; summary: string; flags: string }
type Emergency = { id: string; created_at: string; emergency_type: string; status: string }

const EMERGENCY_LABELS: Record<string, string> = {
  chest_pain: 'Chest pain',
  unconscious: 'Unconscious',
  breathing: "Can't breathe",
  pots: 'POTS episode',
  stroke: 'Stroke signs',
  mecfs: 'Severe crash',
  other: 'Emergency',
}

export default function HistoryPage() {
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [emergencies, setEmergencies] = useState<Emergency[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [tab, setTab] = useState<'checkins' | 'emergencies'>('checkins')
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: c }, { data: e }] = await Promise.all([
        supabase.from('checkins').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
        supabase.from('emergencies').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      ])
      setCheckins(c || [])
      setEmergencies(e || [])
      setLoading(false)
    }
    load()
  }, [])

  const groupByDate = (items: { created_at: string; id: string }[]) => {
    const groups: Record<string, typeof items> = {}
    items.forEach(item => {
      const date = parseTS(item.created_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
      if (!groups[date]) groups[date] = []
      groups[date].push(item)
    })
    return groups
  }

  if (loading) return (
    <div style={{ minHeight: '100dvh', background: '#B3DDAC', padding: '80px 20px 100px' }}>
      {[1,2,3,4,5].map(i => (
        <Skeleton key={i} style={{ height: '48px', borderRadius: '14px', background: '#F2F0E8', marginBottom: '8px' }}/>
      ))}
    </div>
  )

  const checkinGroups = groupByDate(checkins)
  const emergencyGroups = groupByDate(emergencies)
  const mono = 'var(--font-mono, monospace)'

  return (
    <div style={{ minHeight: '100dvh', background: '#B3DDAC', paddingBottom: '100px', maxWidth: '640px', margin: '0 auto', width: '100%' }}>

      {/* Header */}
      <div style={{ padding: '56px 20px 0' }}>
        <button onClick={() => router.push('/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '22px', color: '#5C5A52', fontSize: '13px', fontWeight: 500, fontFamily: 'inherit' }}>
          <ArrowLeft size={14}/> Dashboard
        </button>
        <p style={{ color: '#5C5A52', fontSize: '13px', fontWeight: 600, letterSpacing: '0', marginBottom: '8px' }}>Health history</p>
        <h1 style={{ color: '#141413', fontSize: '32px', fontWeight: 800, letterSpacing: '-0.4px', lineHeight: 1, marginBottom: '24px' }}>
          Your record
        </h1>

        {/* Tabs — text + underline */}
        <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid #98C890' }}>
          {([['checkins', 'Check-ins', checkins.length], ['emergencies', 'Emergencies', emergencies.length]] as const).map(([key, label, count]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                display: 'flex', alignItems: 'baseline', gap: '7px',
                padding: '0 2px 12px', border: 'none', background: 'none', cursor: 'pointer',
                borderBottom: tab === key ? '2px solid #141413' : '2px solid transparent',
                marginBottom: '-1px', fontFamily: 'inherit',
              }}
            >
              <span style={{ color: tab === key ? '#141413' : '#5C5A52', fontSize: '14px', fontWeight: tab === key ? 700 : 500 }}>
                {label}
              </span>
              <span style={{ color: tab === key ? (key === 'emergencies' ? '#A33417' : '#42623C') : '#C4BFB0', fontSize: '12px', fontFamily: mono, fontWeight: 700 }}>
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        <AnimatePresence mode="wait">
          {tab === 'checkins' && (
            <motion.div key="checkins" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              {checkins.length === 0 ? (
                <div style={{ padding: '48px 0' }}>
                  <p style={{ color: '#5C5A52', fontSize: '14px', marginBottom: '10px' }}>No check-ins yet.</p>
                  <button onClick={() => router.push('/checkin')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#42623C', fontSize: '14px', fontWeight: 600, padding: 0, fontFamily: 'inherit' }}>
                    Start your first check-in →
                  </button>
                </div>
              ) : (
                Object.entries(checkinGroups).map(([date, items]) => (
                  <div key={date} style={{ marginBottom: '28px' }}>
                    <p style={{ color: '#5C5A52', fontSize: '13px', letterSpacing: '0', marginBottom: '4px' }}>
                      {date}
                    </p>
                    <div style={{ borderTop: '1px solid #98C890' }}>
                      {(items as Checkin[]).map((c: Checkin) => (
                        <div key={c.id} style={{ borderBottom: '1px solid #98C890' }}>
                          <button
                            onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                            style={{ width: '100%', padding: '13px 0', display: 'flex', alignItems: 'center', gap: '16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
                          >
                            <span style={{ color: '#141413', fontSize: '13px', fontFamily: mono, fontWeight: 700, flexShrink: 0, width: '72px' }}>
                              {parseTS(c.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </span>
                            <span style={{ flex: 1, color: '#5C5A52', fontSize: '13.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {c.summary?.split('\n')[0] || 'Check-in'}
                            </span>
                            <motion.span animate={{ rotate: expanded === c.id ? 180 : 0 }} transition={{ duration: 0.15 }} style={{ display: 'flex', flexShrink: 0 }}>
                              <ChevronDown size={13} color="#C4BFB0"/>
                            </motion.span>
                          </button>
                          <AnimatePresence>
                            {expanded === c.id && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.18 }}
                                style={{ overflow: 'hidden' }}
                              >
                                <div style={{ borderLeft: '2px solid #98C890', paddingLeft: '14px', margin: '2px 0 16px 88px' }} className="history-expand">
                                  <p style={{ color: '#5C5A52', fontSize: '13px', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                                    {c.summary}
                                  </p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {tab === 'emergencies' && (
            <motion.div key="emergencies" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              {emergencies.length === 0 ? (
                <div style={{ padding: '48px 0' }}>
                  <p style={{ color: '#5C5A52', fontSize: '14px' }}>No emergency events. Good.</p>
                </div>
              ) : (
                Object.entries(emergencyGroups).map(([date, items]) => (
                  <div key={date} style={{ marginBottom: '28px' }}>
                    <p style={{ color: '#5C5A52', fontSize: '13px', letterSpacing: '0', marginBottom: '4px' }}>
                      {date}
                    </p>
                    <div style={{ borderTop: '1px solid #98C890' }}>
                      {(items as Emergency[]).map((e: Emergency) => (
                        <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '13px 0', borderBottom: '1px solid #98C890' }}>
                          <span style={{ color: '#141413', fontSize: '13px', fontFamily: mono, fontWeight: 700, flexShrink: 0, width: '72px' }}>
                            {parseTS(e.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </span>
                          <span style={{ flex: 1, color: '#141413', fontSize: '13.5px', fontWeight: 600 }}>
                            {EMERGENCY_LABELS[e.emergency_type] || e.emergency_type}
                          </span>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            color: e.status === 'resolved' ? '#42623C' : '#A33417',
                            fontSize: '13px', fontWeight: 600,
                            letterSpacing: '0' as const, flexShrink: 0,
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: e.status === 'resolved' ? '#42623C' : '#A33417' }}/>
                            {e.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        @media (max-width: 480px) {
          .history-expand { margin-left: 0 !important; }
        }
      `}</style>

      <BottomNav/>
    </div>
  )
}
