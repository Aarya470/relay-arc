'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowLeft, Activity, Wind, Zap, AlertCircle, Battery, Check } from '@/lib/plain-icons'
import Accordion from '@/components/Accordion'
import { AppHeader, Hero } from '@/components/AppKit'
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
  inverted: boolean // true = higher is better
}

const METRICS: Metric[] = [
  { key: 'chest_pain', label: 'Chest pain / pressure', Icon: AlertCircle, inverted: false },
  { key: 'fatigue', label: 'Fatigue / tiredness', Icon: Battery, inverted: false },
  { key: 'dizziness', label: 'Dizziness / lightheadedness', Icon: Zap, inverted: false },
  { key: 'shortness_of_breath', label: 'Shortness of breath', Icon: Wind, inverted: false },
  { key: 'energy', label: 'Energy / wellbeing', Icon: Activity, inverted: true },
]

const LEVELS = [
  { label: 'None', v: 0, tone: 'good' },
  { label: 'Mild', v: 3, tone: 'good' },
  { label: 'Moderate', v: 6, tone: 'mid' },
  { label: 'Severe', v: 9, tone: 'bad' },
]
const ENERGY_LEVELS = [
  { label: 'Very low', v: 1, tone: 'bad' },
  { label: 'Low', v: 4, tone: 'mid' },
  { label: 'Okay', v: 7, tone: 'good' },
  { label: 'Great', v: 10, tone: 'good' },
]

// ── helpers ──────────────────────────────────────────────────────────────────
function valueColor(value: number, inverted: boolean): string {
  const normalized = inverted ? 10 - value : value
  if (normalized <= 3) return '#42623C'
  if (normalized <= 6) return '#7C5200'
  return '#7A3D00'
}

function valueBg(value: number, inverted: boolean): string {
  const normalized = inverted ? 10 - value : value
  if (normalized <= 3) return 'rgba(86,128,78,0.12)'
  if (normalized <= 6) return 'rgba(168,114,0,0.12)'
  return 'rgba(240,120,0,0.12)'
}

function sliderFillColor(value: number, inverted: boolean): string {
  const normalized = inverted ? 10 - value : value
  if (normalized <= 3) return 'linear-gradient(90deg, #42623C, #42623C)'
  if (normalized <= 6) return 'linear-gradient(90deg, #42623C, #7C5200)'
  return 'linear-gradient(90deg, #42623C, #7A3D00)'
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
  label: string
}

// What was wrong with this control.
function SymptomSlider({ value, onChange, inverted, label }: SliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const computeValue = useCallback(
    (clientX: number) => {
      const el = trackRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      onChange(Math.round(ratio * 10))
    },
    [onChange],
  )

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    computeValue(e.clientX)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return
    computeValue(e.clientX)
  }
  const onPointerUp = () => {
    dragging.current = false
  }

  const clamp = (n: number) => Math.max(0, Math.min(10, n))

  // Holding an arrow key used to move this by exactly one and then stop.
  const pending = useRef(value)
  useEffect(() => {
    pending.current = value
  }, [value])

  const onKeyDown = (e: React.KeyboardEvent) => {
    const key = e.key
    const from = pending.current
    let next: number | null = null
    if (key === 'ArrowRight' || key === 'ArrowUp') next = clamp(from + 1)
    else if (key === 'ArrowLeft' || key === 'ArrowDown') next = clamp(from - 1)
    else if (key === 'PageUp') next = clamp(from + 2)
    else if (key === 'PageDown') next = clamp(from - 2)
    else if (key === 'Home') next = 0
    else if (key === 'End') next = 10
    if (next === null) return
    // Arrow keys scroll the page by default, which would move the view out from
    // under the control the person is adjusting.
    e.preventDefault()
    pending.current = next
    onChange(next)
  }

  const pct = (value / 10) * 100
  const color = valueColor(value, inverted)
  const fill = sliderFillColor(value, inverted)

  return (
    <div style={{ flex: 1, padding: '8px 0', userSelect: 'none' }}>
      {/* track */}
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={10}
        aria-valuenow={value}
        // Without this a screen reader reads "5", which on a page of five
        // sliders says nothing about what five means. The wording matches the
        // heading people can see.
        aria-valuetext={inverted ? `${value} out of 10 energy` : `${value} out of 10 severity`}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          position: 'relative',
          height: '8px',
          borderRadius: 8,
          background: '#EDEAE0',
          cursor: 'pointer',
          touchAction: 'none',
          outlineOffset: '6px',
        }}
      >
        {/* The grabbable area, 24px tall per WCAG target size, sitting over the
            8px line without changing how the line looks. Pointer events land
            here and bubble to the track handlers above. */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            height: '24px',
          }}
        />
        {/* filled portion */}
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 500, damping: 36 }}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            borderRadius: 8,
            background: fill,
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
            background: 'var(--panel)',
            border: `2.5px solid ${color}`,
            boxSizing: 'border-box',
            pointerEvents: 'none',
          }}
        />
      </div>
      {/* tick labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
        {[0, 2, 4, 6, 8, 10].map((n) => (
          <span key={n} style={{ fontSize: '10px', color: '#48463F', fontWeight: 500 }}>
            {n}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── mini sparkline ────────────────────────────────────────────────────────────
function Sparkline({ values, inverted }: { values: number[]; inverted: boolean }) {
  if (values.length < 2) return null
  const W = 72,
    H = 28,
    PAD = 2
  const min = 0,
    max = 10
  const pts = values.map((v, i) => {
    const x = PAD + (i / (values.length - 1)) * (W - PAD * 2)
    const y = H - PAD - ((v - min) / (max - min)) * (H - PAD * 2)
    return `${x},${y}`
  })
  const last = values[values.length - 1]
  const prev = values[values.length - 2]
  const improving = inverted ? last > prev : last < prev
  const same = last === prev
  const lineColor = same ? '#48463F' : improving ? '#42623C' : '#7A3D00'

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      fill="none"
      role="img"
      aria-label="Symptom severity over time"
    >
      <polyline
        points={pts.join(' ')}
        stroke={lineColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
      />
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
    <div
      style={{
        flexShrink: 0,
        width: '80px',
        background: 'rgba(255,253,246,0.55)', backdropFilter: 'blur(14px)',
        border: '1px solid rgba(255,255,255,0.8)',
        borderRadius: 10,
        padding: '12px 10px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <span style={{ fontSize: '10px', fontWeight: 700, color: '#48463F', letterSpacing: '0.2px' }}>
        {formatDay(log.created_at)}
      </span>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '5px',
          width: '100%',
          alignItems: 'center',
        }}
      >
        {METRICS.map((m) => {
          const v = log[m.key] as number
          const color = valueColor(v, m.inverted)
          return (
            <div
              key={m.key}
              title={m.label}
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: color,
                flexShrink: 0,
                opacity: 0.9,
              }}
            />
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
    energy: 7,
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
      const {
        data: { user },
      } = await supabase.auth.getUser()
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

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const handleChange = (key: string, v: number) => {
    setValues((prev) => ({ ...prev, [key]: v }))
  }

  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Please sign in first')
        return
      }

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
      setValues({ chest_pain: 0, fatigue: 0, dizziness: 0, shortness_of_breath: 0, energy: 7 })
      setTimeout(() => setSubmitted(false), 2000)
      await loadHistory()
    } finally {
      setSubmitting(false)
    }
  }

  // build 7-day trend data per metric
  const last7 = history.slice(0, 7).reverse()
  const weekCount = history.filter((h) => Date.now() - new Date(h.created_at).getTime() < 7 * 864e5).length
  const trendData = METRICS.map((m) => ({
    ...m,
    values: last7.map((l) => l[m.key] as number),
  }))

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'transparent',
        paddingBottom: '112px',
      }}
    >
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '0 16px' }}>
        <AppHeader title="How are you feeling?" sub={todayLabel()} />
        <Hero style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <div>
              <span className="ak-kicker">This week</span>
              <div className="ak-metric" style={{ marginTop: '4px' }}>
                <span className="ak-metric-v" style={{ fontSize: '52px' }}>{weekCount}</span>
                <span className="ak-metric-u">{weekCount === 1 ? 'log' : 'logs'}</span>
              </div>
            </div>
            <p style={{ fontSize: '14px', opacity: 0.85, maxWidth: '15em', textAlign: 'right', lineHeight: 1.45 }}>
              Slide each one, then log it. Patterns show up after a few days.
            </p>
          </div>
        </Hero>
      </div>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '0 16px' }}>
        {/* ── sliders card ── */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="glass ak-accent-green"
          style={{
            borderRadius: 10,
            padding: '20px 20px 16px 24px',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <p style={{ fontSize: '17px', fontWeight: 800, color: '#141413', letterSpacing: '-0.02em' }}>Tap how each one feels</p>
            {history[0] && (
              <button
                className="ak-chip"
                style={{ border: 0, cursor: 'pointer', fontFamily: 'inherit' }}
                onClick={() => {
                  const h = history[0]
                  setValues({ chest_pain: h.chest_pain, fatigue: h.fatigue, dizziness: h.dizziness, shortness_of_breath: h.shortness_of_breath, energy: h.energy })
                }}
              >
                Same as last time
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {METRICS.map((m) => {
              const v = values[m.key]
              const levels = m.inverted ? ENERGY_LEVELS : LEVELS
              const near = levels.reduce((best, l) => (Math.abs(l.v - v) < Math.abs(best.v - v) ? l : best), levels[0])
              return (
                <div key={m.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 750, color: '#141413' }}>{m.label.split(' / ')[0]}</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: valueColor(v, m.inverted), fontVariantNumeric: 'tabular-nums' }}>{v} of 10</span>
                  </div>
                  <div className="sym-levels" role="radiogroup" aria-label={m.label}>
                    {levels.map((l) => (
                      <button
                        key={l.label}
                        role="radio"
                        aria-checked={near.label === l.label && (v !== 0 || l.v === 0)}
                        data-on={near.label === l.label}
                        data-tone={l.tone}
                        onClick={() => handleChange(m.key, l.v)}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="glass" style={{ padding: '2px', marginTop: '18px' }}>
            <Accordion title="Fine tune with sliders" hint="Set an exact number from 0 to 10">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', padding: '6px 12px 10px' }}>
                {METRICS.map((m) => (
                  <div key={m.key}>
                    <p style={{ fontSize: '13.5px', fontWeight: 700, color: '#141413', marginBottom: '8px' }}>
                      {m.label.split(' / ')[0]} <span style={{ color: '#48463F' }}>{values[m.key]}</span>
                    </p>
                    <SymptomSlider value={values[m.key]} onChange={(val) => handleChange(m.key, val)} inverted={m.inverted} label={m.label} />
                  </div>
                ))}
              </div>
            </Accordion>
          </div>
        </motion.div>

        {/* ── note ── */}
        <div className="glass" style={{ padding: '4px', marginBottom: '14px' }}>
          <Accordion title="Add a note" hint={note ? `${note.length} of 200 characters` : 'Optional, for your doctor'}>
            <div style={{ padding: '0 10px 6px' }}>
              <textarea
                aria-label="Note, optional. Up to 200 characters."
                maxLength={200}
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 200))}
                placeholder="Anything your doctor should know"
                rows={3}
                style={{
                  width: '100%', border: '1.5px solid rgba(20,20,19,0.14)', borderRadius: 10, padding: '10px 12px',
                  fontSize: '16px', color: '#141413', background: 'rgba(255,255,255,0.7)', resize: 'none', outline: 'none',
                  fontFamily: 'inherit', lineHeight: 1.5, boxSizing: 'border-box',
                }}
              />
            </div>
          </Accordion>
        </div>

        {/* ── table missing error ── */}
        <AnimatePresence>
          {tableError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                background: 'rgba(168,114,0,0.12)',
                border: '1.5px solid rgba(168,114,0,0.3)',
                borderRadius: 8,
                padding: '12px 14px',
                marginBottom: '16px',
                fontSize: '13px',
                color: '#7C5200',
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
            height: '58px',
            borderRadius: 10,
            background: submitted ? '#1E3A23' : '#F07800',
            color: submitted ? '#FFFFFF' : '#141413',
            border: 'none',
            fontWeight: 800,
            cursor: submitting ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '28px',
            transition: 'background 0.25s',
            letterSpacing: '0.2px',
            opacity: submitting ? 0.7 : 1,
            boxShadow: '0 10px 24px rgba(240,120,0,0.28)',
            fontSize: '17px',
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
              <motion.span
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ fontSize: '14px' }}
              >
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
            className="glass"
            style={{ borderRadius: 10, padding: '4px', marginBottom: '14px' }}
          >
            <Accordion title="Seven day trends" hint="How each one moved this week" defaultOpen>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', padding: '4px 10px 6px' }}>
              {trendData.map((m) => {
                if (m.values.length < 2) return null
                const latest = m.values[m.values.length - 1]
                const prev = m.values[m.values.length - 2]
                const improving = m.inverted ? latest > prev : latest < prev
                const same = latest === prev
                const arrow = same ? '→' : improving ? '↓' : '↑'
                const arrowColor = same ? '#48463F' : improving ? '#42623C' : '#7A3D00'
                return (
                  <div
                    key={m.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <m.Icon size={15} color="#48463F" strokeWidth={1.8} />
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 500,
                          color: '#48463F',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {m.label}
                      </span>
                    </div>
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}
                    >
                      <Sparkline values={m.values} inverted={m.inverted} />
                      <span
                        style={{
                          fontSize: '18px',
                          fontWeight: 700,
                          color: arrowColor,
                          lineHeight: 1,
                          minWidth: '18px',
                          textAlign: 'center',
                        }}
                      >
                        {arrow}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
            </Accordion>
          </motion.div>
        )}

        {/* ── history timeline ── */}
        <div className="glass" style={{ marginBottom: '20px', borderRadius: 10, padding: '4px' }}>
          <Accordion title="Recent history" hint={history.length ? `${history.length} entries` : 'Nothing logged yet'}>
          <div style={{ padding: '0 10px 6px' }}>
          {historyLoading ? (
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    flexShrink: 0,
                    width: '80px',
                    height: '108px',
                    background: 'rgba(255,253,246,0.45)',
                    border: '1px solid #EDEAE0',
                    borderRadius: 8,
                    animation: 'pulse 1.5s infinite',
                  }}
                />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div
              style={{
                background: 'rgba(255,253,246,0.55)',
                border: '1px solid rgba(20,20,19,0.1)',
                borderRadius: 8,
                padding: '28px 20px',
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: '14px', color: '#48463F', margin: 0 }}>
                No logs yet. Tap "Log symptoms" to start tracking.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                gap: '10px',
                overflowX: 'auto',
                paddingBottom: '8px',
                scrollbarWidth: 'none',
              }}
            >
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
              {METRICS.map((m) => (
                <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <m.Icon size={12} color="#48463F" strokeWidth={1.8} />
                  <span style={{ fontSize: '11px', color: '#48463F', fontWeight: 500 }}>
                    {m.label.split(' / ')[0]}
                  </span>
                </div>
              ))}
            </div>
          )}
          </div>
          </Accordion>
        </div>
      </div>

      <BottomNav />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
        textarea::placeholder { color: #48463F; }
        textarea:focus { border-color: rgba(86,128,78,0.4) !important; box-shadow: 0 0 0 3px rgba(86,128,78,0.08); }
      `}</style>
    </div>
  )
}
