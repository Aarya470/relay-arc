'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowLeft, Activity, Wind, Zap, AlertCircle, Battery, Check } from 'lucide-react'
import BottomNav from '@/components/BottomNav'

// ── types ────────────────────────────────────────────────────────────────────
interface SymptomLog {
  id: string
  created_at: string
  chest_pain: number
  fatigue: number
  dizziness: number
  shortness_of_breath: number
  energy: number
  note?: string
}

interface Metric {
  key: keyof Omit<SymptomLog, 'id' | 'created_at' | 'note'>
  label: string
  Icon: React.ElementType
  inverted: boolean   // true = higher is better
}

const METRICS: Metric[] = [
  { key: 'chest_pain',        label: 'Chest pain / pressure',       Icon: AlertCircle, inverted: false },
  { key: 'fatigue',           label: 'Fatigue / tiredness',         Icon: Battery,     inverted: false },
  { key: 'dizziness',         label: 'Dizziness / lightheadedness', Icon: Zap,         inverted: false },
  { key: 'shortness_of_breath', label: 'Shortness of breath',       Icon: Wind,        inverted: false },
  { key: 'energy',            label: 'Energy / wellbeing',          Icon: Activity,    inverted: true  },
]

// ── helpers ──────────────────────────────────────────────────────────────────
function valueColor(value: number, inverted: boolean): string {
  // For normal metrics: 0-3 green, 4-6 yellow, 7-10 red
  // For inverted: reversed
  const normalized = inverted ? 10 - value : value
  if (normalized <= 3) return '#2C7A50'
  if (normalized <= 6) return '#D97706'
  return '#B91C1C'
}

function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function formatDay(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── custom slider ─────────────────────────────────────────────────────────────
interface SliderProps {
  value: number
  onChange: (v: number) => void
  inverted: boolean
}

function SymptomSlider({ value, onChange, inverted }: SliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const computeValue = useCallback((clientX: number) => {
    const el = trackRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    onChange(Math.round(ratio * 10))
  }, [onChange])

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    computeValue(e.clientX)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return
    computeValue(e.clientX)
  }
  const onPointerUp = () => { dragging.current = false }

  const pct = (value / 10) * 100
  const color = valueColor(value, inverted)

  return (
    <div style={{ flex: 1, padding: '8px 0', userSelect: 'none' }}>
      {/* track */}
      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          position: 'relative',
          height: '8px',
          borderRadius: '99px',
          background: 'rgba(15,26,14,0.08)',
          cursor: 'pointer',
          touchAction: 'none',
        }}
      >
        {/* filled portion */}
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 500, damping: 36 }}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            borderRadius: '99px',
            background: color,
            transition: 'background 0.3s',
          }}
        />
        {/* thumb */}
        <motion.div
          animate={{ left: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 500, damping: 36 }}
          style={{
            position: 'absolute',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            background: '#FFFFFF',
            boxShadow: `0 0 0 3px ${color}, 0 2px 8px rgba(0,0,0,0.16)`,
            transition: 'box-shadow 0.3s',
            pointerEvents: 'none',
          }}
        />
      </div>
      {/* tick labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
        {[0, 2, 4, 6, 8, 10].map(n => (
          <span key={n} style={{ fontSize: '10px', color: 'rgba(15,26,14,0.35)', fontWeight: 500 }}>{n}</span>
        ))}
      </div>
    </div>
  )
}

// ── mini sparkline ────────────────────────────────────────────────────────────
function Sparkline({ values, inverted }: { values: number[]; inverted: boolean }) {
  if (values.length < 2) return null
  const W = 72, H = 28, PAD = 2
  const min = 0, max = 10
  const pts = values.map((v, i) => {
    const x = PAD + (i / (values.length - 1)) * (W - PAD * 2)
    const y = H - PAD - ((v - min) / (max - min)) * (H - PAD * 2)
    return `${x},${y}`
  })
  const last = values[values.length - 1]
  const prev = values[values.length - 2]
  const improving = inverted ? last > prev : last < prev
  const same = last === prev
  const lineColor = same ? '#94A3B8' : improving ? '#2C7A50' : '#B91C1C'

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none">
      <polyline
        points={pts.join(' ')}
        stroke={lineColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* latest dot */}
      {(() => {
        const [px, py] = pts[pts.length - 1].split(',').map(Number)
        return <circle cx={px} cy={py} r="3" fill={lineColor} />
      })()}
    </svg>
  )
}

// ── day card for history ──────────────────────────────────────────────────────
function DayCard({ log }: { log: SymptomLog }) {
  return (
    <div style={{
      flexShrink: 0,
      width: '80px',
      background: '#FFFFFF',
      borderRadius: '14px',
      padding: '12px 10px',
      boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
    }}>
      <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(15,26,14,0.45)', letterSpacing: '0.2px' }}>
        {formatDay(log.created_at)}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '100%', alignItems: 'center' }}>
        {METRICS.map(m => {
          const v = log[m.key] as number
          const color = valueColor(v, m.inverted)
          return (
            <div key={m.key} title={m.label} style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: color,
              flexShrink: 0,
            }} />
          )
        })}
      </div>
    </div>
  )
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function SymptomsPage() {
  const router = useRouter()
  const [values, setValues] = useState<Record<string, number>>({
    chest_pain: 0,
    fatigue: 0,
    dizziness: 0,
    shortness_of_breath: 0,
    energy: 5,
  })
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [history, setHistory] = useState<SymptomLog[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [tableError, setTableError] = useState(false)

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data, error } = await supabase
        .from('symptom_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(14)
      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          setTableError(true)
        }
        return
      }
      setHistory((data ?? []) as SymptomLog[])
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  const handleChange = (key: string, v: number) => {
    setValues(prev => ({ ...prev, [key]: v }))
  }

  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error('Please sign in first'); return }

      const { error } = await supabase.from('symptom_logs').insert({
        user_id: user.id,
        created_at: new Date().toISOString(),
        chest_pain: values.chest_pain,
        fatigue: values.fatigue,
        dizziness: values.dizziness,
        shortness_of_breath: values.shortness_of_breath,
        energy: values.energy,
        ...(note.trim() ? { note: note.trim() } : {}),
      })

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          setTableError(true)
          toast.error('Symptom tracking is being set up. Check back soon!')
        } else {
          toast.error(error.message ?? 'Failed to save. Try again.')
        }
        return
      }

      toast.success('Symptoms logged!')
      setSubmitted(true)
      setNote('')
      setValues({ chest_pain: 0, fatigue: 0, dizziness: 0, shortness_of_breath: 0, energy: 5 })
      setTimeout(() => setSubmitted(false), 2000)
      await loadHistory()
    } finally {
      setSubmitting(false)
    }
  }

  // build 7-day trend data per metric
  const last7 = history.slice(0, 7).reverse()
  const trendData = METRICS.map(m => ({
    ...m,
    values: last7.map(l => l[m.key] as number),
  }))

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#F0EDE5',
      paddingBottom: '90px',
    }}>
      {/* ── header ── */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: 'rgba(240,237,229,0.92)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(15,26,14,0.07)',
        padding: '0 20px',
      }}>
        <div style={{ maxWidth: '560px', margin: '0 auto', display: 'flex', alignItems: 'center', height: '62px', gap: '12px' }}>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => router.push('/dashboard')}
            style={{
              width: '38px', height: '38px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.9)',
              border: '1px solid rgba(15,26,14,0.09)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <ArrowLeft size={18} color="#0F1A0E" strokeWidth={2} />
          </motion.button>
          <div>
            <h1 style={{ fontSize: '17px', fontWeight: 700, color: '#0F1A0E', margin: 0, lineHeight: 1.2 }}>
              How are you feeling?
            </h1>
            <p style={{ fontSize: '12px', color: 'rgba(15,26,14,0.45)', margin: 0, marginTop: '1px' }}>
              {todayLabel()}
            </p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '24px 16px 0' }}>

        {/* ── sliders card ── */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '20px 20px 16px',
            boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
            marginBottom: '16px',
          }}
        >
          <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(15,26,14,0.4)', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 18px' }}>
            Rate each symptom (0 – 10)
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {METRICS.map((m, i) => {
              const v = values[m.key]
              const color = valueColor(v, m.inverted)
              return (
                <motion.div
                  key={m.key}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06, type: 'spring', stiffness: 320, damping: 28 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                      <div style={{
                        width: '34px', height: '34px', borderRadius: '10px',
                        background: `${color}18`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'background 0.3s',
                      }}>
                        <m.Icon size={17} color={color} strokeWidth={2} style={{ transition: 'color 0.3s' }} />
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F1A0E', lineHeight: 1.3 }}>
                        {m.label}
                      </span>
                    </div>
                    <motion.span
                      key={v}
                      initial={{ scale: 1.4, opacity: 0.5 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 520, damping: 22 }}
                      style={{
                        fontSize: '28px',
                        fontWeight: 800,
                        color: color,
                        minWidth: '36px',
                        textAlign: 'right',
                        lineHeight: 1,
                        fontVariantNumeric: 'tabular-nums',
                        transition: 'color 0.3s',
                      }}
                    >
                      {v}
                    </motion.span>
                  </div>
                  <SymptomSlider
                    value={v}
                    onChange={val => handleChange(m.key, val)}
                    inverted={m.inverted}
                  />
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* ── note ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, type: 'spring', stiffness: 320, damping: 28 }}
          style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
            marginBottom: '16px',
          }}
        >
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(15,26,14,0.4)', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: '10px' }}>
            Note (optional)
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value.slice(0, 200))}
            placeholder="Any extra detail to share with your care team…"
            rows={3}
            style={{
              width: '100%',
              border: '1.5px solid rgba(15,26,14,0.1)',
              borderRadius: '10px',
              padding: '10px 12px',
              fontSize: '14px',
              color: '#0F1A0E',
              background: '#FAFAF8',
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
              lineHeight: 1.5,
              boxSizing: 'border-box',
            }}
          />
          <div style={{ textAlign: 'right', fontSize: '11px', color: 'rgba(15,26,14,0.3)', marginTop: '4px' }}>
            {note.length}/200
          </div>
        </motion.div>

        {/* ── table missing error ── */}
        <AnimatePresence>
          {tableError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                background: '#FEF3C7',
                border: '1.5px solid #D97706',
                borderRadius: '12px',
                padding: '12px 14px',
                marginBottom: '16px',
                fontSize: '13px',
                color: '#92400E',
                fontWeight: 500,
              }}
            >
              Symptom tracking is being set up. Check back soon!
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── log button ── */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24, type: 'spring', stiffness: 320, damping: 28 }}
          whileTap={{ scale: 0.96 }}
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            width: '100%',
            height: '54px',
            borderRadius: '14px',
            background: submitted ? '#2C7A50' : '#1C3D28',
            color: '#FFFFFF',
            border: 'none',
            fontSize: '15px',
            fontWeight: 700,
            cursor: submitting ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '28px',
            transition: 'background 0.25s',
            letterSpacing: '0.2px',
            opacity: submitting ? 0.7 : 1,
          }}
        >
          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.span
                key="done"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                style={{ display: 'flex', alignItems: 'center', gap: '7px' }}
              >
                <Check size={18} strokeWidth={2.5} /> Logged!
              </motion.span>
            ) : submitting ? (
              <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: '14px' }}>
                Saving…
              </motion.span>
            ) : (
              <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                Log symptoms
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {/* ── 7-day trend ── */}
        {last7.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 28 }}
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '20px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              marginBottom: '20px',
            }}
          >
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(15,26,14,0.4)', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 16px' }}>
              7-day trends
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {trendData.map(m => {
                if (m.values.length < 2) return null
                const latest = m.values[m.values.length - 1]
                const prev = m.values[m.values.length - 2]
                const improving = m.inverted ? latest > prev : latest < prev
                const same = latest === prev
                const arrow = same ? '→' : improving ? '↓' : '↑'
                const arrowColor = same ? '#94A3B8' : improving ? '#2C7A50' : '#B91C1C'
                return (
                  <div key={m.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <m.Icon size={15} color="rgba(15,26,14,0.4)" strokeWidth={1.8} />
                      <span style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(15,26,14,0.65)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {m.label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                      <Sparkline values={m.values} inverted={m.inverted} />
                      <span style={{ fontSize: '18px', fontWeight: 700, color: arrowColor, lineHeight: 1, minWidth: '18px', textAlign: 'center' }}>
                        {arrow}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* ── history timeline ── */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(15,26,14,0.4)', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 14px 2px' }}>
            Recent history
          </p>
          {historyLoading ? (
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{
                  flexShrink: 0, width: '80px', height: '108px',
                  background: 'rgba(255,255,255,0.6)',
                  borderRadius: '14px',
                  animation: 'pulse 1.5s infinite',
                }} />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '28px 20px',
              textAlign: 'center',
              boxShadow: '0 1px 8px rgba(0,0,0,0.05)',
            }}>
              <p style={{ fontSize: '14px', color: 'rgba(15,26,14,0.4)', margin: 0 }}>
                No logs yet — tap "Log symptoms" to start tracking.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none' }}>
              {history.map((log, i) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04, type: 'spring', stiffness: 340, damping: 28 }}
                >
                  <DayCard log={log} />
                </motion.div>
              ))}
            </div>
          )}
          {/* legend */}
          {history.length > 0 && (
            <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap' }}>
              {METRICS.map(m => (
                <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <m.Icon size={12} color="rgba(15,26,14,0.4)" strokeWidth={1.8} />
                  <span style={{ fontSize: '11px', color: 'rgba(15,26,14,0.45)', fontWeight: 500 }}>
                    {m.label.split(' / ')[0]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <BottomNav />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.45; }
        }
      `}</style>
    </div>
  )
}
