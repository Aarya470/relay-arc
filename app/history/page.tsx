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
    <div style={{ minHeight: '100dvh', background: '#F2EFE9', padding: '80px 16px 100px' }}>
      {[1,2,3,4,5].map(i => <Skeleton key={i} style={{ height: '56px', borderRadius: '14px', background: 'rgba(26,40,32,0.06)', marginBottom: '8px' }}/>)}
    </div>
  )

  const checkinGroups = groupByDate(checkins)
  const emergencyGroups = groupByDate(emergencies)

  return (
    <div style={{ minHeight: '100dvh', background: '#F2EFE9', paddingBottom: '100px' }}>

      {/* Header */}
      <div style={{ padding: '56px 20px 16px', borderBottom: '1px solid rgba(26,40,32,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            transition={spring}
            onClick={() => router.push('/dashboard')}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FFFFFF', border: '1px solid rgba(26,40,32,0.09)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(26,40,32,0.06)' }}
          >
            <ArrowLeft size={15} color="rgba(26,40,32,0.5)"/>
          </motion.button>
          <div>
            <h1 style={{ color: '#1A2820', fontWeight: 900, fontSize: '20px', letterSpacing: '-0.7px' }}>Health History</h1>
            <p style={{ color: 'rgba(26,40,32,0.38)', fontSize: '12px' }}>Your check-ins and emergencies</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '6px', background: 'rgba(26,40,32,0.05)', borderRadius: '14px', padding: '4px' }}>
          {([['checkins', 'Check-ins', Heart, checkins.length], ['emergencies', 'Emergencies', AlertTriangle, emergencies.length]] as const).map(([key, label, Icon, count]) => (
            <motion.button
              key={key}
              whileTap={{ scale: 0.97 }}
              onClick={() => setTab(key)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '9px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                background: tab === key ? '#FFFFFF' : 'transparent',
                boxShadow: tab === key ? '0 1px 4px rgba(26,40,32,0.1)' : 'none',
                transition: 'background 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              <Icon size={13} color={tab === key ? '#1A2820' : 'rgba(26,40,32,0.38)'}/>
              <span style={{ color: tab === key ? '#1A2820' : 'rgba(26,40,32,0.38)', fontSize: '13px', fontWeight: tab === key ? 700 : 500 }}>{label}</span>
              <span style={{ background: tab === key ? 'rgba(92,139,116,0.12)' : 'transparent', color: tab === key ? '#5C8B74' : 'rgba(26,40,32,0.3)', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '99px', fontFamily: 'monospace' }}>{count}</span>
            </motion.button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        <AnimatePresence mode="wait">
          {tab === 'checkins' && (
            <motion.div key="checkins" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
              {checkins.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '56px 0' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(92,139,116,0.1)', border: '1px solid rgba(92,139,116,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <Heart size={20} color="rgba(92,139,116,0.5)"/>
                  </div>
                  <p style={{ color: 'rgba(26,40,32,0.3)', fontSize: '14px' }}>No check-ins yet</p>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => router.push('/checkin')}
                    style={{ marginTop: '12px', background: 'rgba(92,139,116,0.1)', border: '1px solid rgba(92,139,116,0.24)', color: '#5C8B74', fontSize: '13px', fontWeight: 700, padding: '10px 20px', borderRadius: '12px', cursor: 'pointer' }}>
                    Start a check-in
                  </motion.button>
                </div>
              ) : (
                Object.entries(checkinGroups).map(([date, items]) => (
                  <div key={date} style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Calendar size={12} color="rgba(26,40,32,0.3)"/>
                      <p style={{ color: 'rgba(26,40,32,0.38)', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '1px' }}>{date}</p>
                    </div>
                    {(items as Checkin[]).map((c: Checkin) => (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ background: '#FFFFFF', border: '1px solid rgba(26,40,32,0.07)', borderRadius: '16px', marginBottom: '8px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(26,40,32,0.05)' }}
                      >
                        <motion.button
                          whileTap={{ scale: 0.99 }}
                          onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                          style={{ width: '100%', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(92,139,116,0.1)', border: '1px solid rgba(92,139,116,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Heart size={14} color="#5C8B74"/>
                            </div>
                            <div>
                              <p style={{ color: '#1A2820', fontWeight: 600, fontSize: '13px' }}>Check-in</p>
                              <p style={{ color: 'rgba(26,40,32,0.35)', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)' }}>
                                {parseTS(c.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                          <motion.div animate={{ rotate: expanded === c.id ? 180 : 0 }} transition={{ duration: 0.18 }}>
                            <ChevronDown size={14} color="rgba(26,40,32,0.3)"/>
                          </motion.div>
                        </motion.button>
                        <AnimatePresence>
                          {expanded === c.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              style={{ overflow: 'hidden' }}
                            >
                              <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(26,40,32,0.06)', paddingTop: '12px' }}>
                                <p style={{ color: 'rgba(26,40,32,0.58)', fontSize: '13px', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{c.summary}</p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </div>
                ))
              )}
            </motion.div>
          )}

          {tab === 'emergencies' && (
            <motion.div key="emergencies" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
              {emergencies.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '56px 0' }}>
                  <p style={{ color: 'rgba(26,40,32,0.3)', fontSize: '14px' }}>No emergency events</p>
                </div>
              ) : (
                Object.entries(emergencyGroups).map(([date, items]) => (
                  <div key={date} style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Calendar size={12} color="rgba(26,40,32,0.3)"/>
                      <p style={{ color: 'rgba(26,40,32,0.38)', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '1px' }}>{date}</p>
                    </div>
                    {(items as Emergency[]).map((e: Emergency) => (
                      <div
                        key={e.id}
                        style={{ background: e.status === 'active' ? 'rgba(220,38,38,0.04)' : '#FFFFFF', border: `1px solid ${e.status === 'active' ? 'rgba(220,38,38,0.2)' : 'rgba(26,40,32,0.07)'}`, borderRadius: '16px', padding: '14px 16px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 8px rgba(26,40,32,0.04)' }}
                      >
                        <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: e.status === 'resolved' ? 'rgba(26,40,32,0.05)' : 'rgba(220,38,38,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <AlertTriangle size={14} color={e.status === 'resolved' ? 'rgba(26,40,32,0.35)' : '#DC2626'}/>
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ color: '#1A2820', fontWeight: 600, fontSize: '13px' }}>{EMERGENCY_LABELS[e.emergency_type] || e.emergency_type}</p>
                          <p style={{ color: 'rgba(26,40,32,0.35)', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)' }}>
                            {parseTS(e.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </p>
                        </div>
                        <span style={{
                          fontSize: '9px', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' as const,
                          padding: '3px 8px', borderRadius: '99px',
                          background: e.status === 'resolved' ? 'rgba(26,40,32,0.06)' : 'rgba(220,38,38,0.1)',
                          color: e.status === 'resolved' ? 'rgba(26,40,32,0.45)' : '#DC2626',
                          border: `1px solid ${e.status === 'resolved' ? 'rgba(26,40,32,0.08)' : 'rgba(220,38,38,0.2)'}`,
                        }}>
                          {e.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomNav/>
    </div>
  )
}
