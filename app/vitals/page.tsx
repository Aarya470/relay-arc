'use client'
import { useEffect, useState, useId } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowLeft, Activity, Save, Heart, Droplets, Wind } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import BottomNav from '@/components/BottomNav'

const spring = { type: 'spring', stiffness: 380, damping: 24 } as const

const inputStyle: React.CSSProperties = {
  width: '72px', background: '#1A1A2E', border: '1.5px solid rgba(255,255,255,0.10)',
  borderRadius: '10px', padding: '12px', color: '#EEEEF8', fontSize: '22px',
  fontWeight: 800, outline: 'none', fontFamily: 'inherit', textAlign: 'center',
  letterSpacing: '-0.5px', boxSizing: 'border-box',
}

function parseTS(ts: string) {
  if (!ts) return new Date()
  return new Date(/[Z+]/.test(ts) ? ts : ts + 'Z')
}

const VITAL_RANGES = {
  heart_rate: { low: 40, high: 120, normal: [60, 100] as [number,number], unit: 'bpm',  label: 'Heart Rate',   icon: Heart,    color: '#FF3737' },
  systolic:   { low: 70, high: 200, normal: [90, 140] as [number,number], unit: 'mmHg', label: 'Systolic BP',  icon: Activity, color: '#4F8EF7' },
  diastolic:  { low: 40, high: 130, normal: [60, 90]  as [number,number], unit: 'mmHg', label: 'Diastolic BP', icon: Activity, color: '#4F8EF7' },
  oxygen_sat: { low: 85, high: 100, normal: [95, 100] as [number,number], unit: '%',    label: 'O₂ Sat',       icon: Droplets, color: '#00D68F' },
  resp_rate:  { low: 8,  high: 40,  normal: [12, 20]  as [number,number], unit: '/min', label: 'Resp. Rate',   icon: Wind,     color: '#F59E0B' },
}

type VitalKey = keyof typeof VITAL_RANGES
const VITAL_KEYS: VitalKey[] = ['heart_rate', 'systolic', 'diastolic', 'oxygen_sat', 'resp_rate']

function statusForValue(key: string, val: number | null) {
  if (val === null) return 'empty'
  const range = VITAL_RANGES[key as VitalKey]
  if (!range) return 'ok'
  if (val < range.normal[0]) return 'low'
  if (val > range.normal[1]) return 'high'
  return 'ok'
}

const STATUS_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  ok:    { bg: 'rgba(0,214,143,0.12)',   border: 'rgba(0,214,143,0.25)',   text: '#00D68F' },
  high:  { bg: 'rgba(255,55,55,0.12)',   border: 'rgba(255,55,55,0.28)',   text: '#FF3737' },
  low:   { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.28)', text: '#F59E0B' },
  empty: { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.06)', text: '#505068' },
}

// ─── SparklineInner ───────────────────────────────────────────────────────────
// Renders SVG children (no wrapper <svg>) — embed inside a parent <svg>.

interface SparklineInnerProps {
  data: number[]
  color: string
  width: number
  height: number
  normalRange?: [number, number]
}

function SparklineInner({ data, color, width, height, normalRange }: SparklineInnerProps) {
  const uid = useId().replace(/:/g, '')
  const gradId = `sgi-${uid}`
  const clipId = `sci-${uid}`

  if (data.length < 2) return null

  const padX = 4
  const padY = 6
  const innerW = width - padX * 2
  const innerH = height - padY * 2

  // Expand domain to include normal range so the band always renders
  const dataMin = Math.min(...data)
  const dataMax = Math.max(...data)
  const domMin = normalRange ? Math.min(dataMin, normalRange[0]) : dataMin
  const domMax = normalRange ? Math.max(dataMax, normalRange[1]) : dataMax
  const domRange = domMax - domMin || 1

  const toX = (i: number) => padX + (i / (data.length - 1)) * innerW
  const toY = (v: number) => padY + innerH - ((v - domMin) / domRange) * innerH

  const pts = data.map((v, i) => [toX(i), toY(v)] as [number, number])
  const polyline = pts.map(([x, y]) => `${x},${y}`).join(' ')

  const areaPath =
    `M ${pts[0][0]},${pts[0][1]} ` +
    pts.slice(1).map(([x, y]) => `L ${x},${y}`).join(' ') +
    ` L ${pts[pts.length - 1][0]},${height} L ${pts[0][0]},${height} Z`

  let bandTop = 0, bandBot = 0, showBand = false
  if (normalRange) {
    bandTop = Math.max(padY, Math.min(padY + innerH, toY(normalRange[1])))
    bandBot = Math.max(padY, Math.min(padY + innerH, toY(normalRange[0])))
    showBand = bandBot > bandTop
  }

  const last = pts[pts.length - 1]

  return (
    <>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.02"/>
        </linearGradient>
        <clipPath id={clipId}>
          <rect x={0} y={0} width={width} height={height}/>
        </clipPath>
      </defs>

      {showBand && (
        <rect
          x={padX} y={bandTop}
          width={innerW} height={Math.max(0, bandBot - bandTop)}
          fill="rgba(0,214,143,0.08)" rx="2"
        />
      )}

      <path d={areaPath} fill={`url(#${gradId})`} clipPath={`url(#${clipId})`}/>

      <polyline
        points={polyline}
        fill="none" stroke={color}
        strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"
      />

      <circle cx={last[0]} cy={last[1]} r="5" fill={color} opacity="0.18"/>
      <circle cx={last[0]} cy={last[1]} r="3" fill={color}/>
    </>
  )
}

// ─── Trend arrow ──────────────────────────────────────────────────────────────

function trendArrow(vals: number[]): { symbol: string; color: string } {
  if (vals.length < 4) return { symbol: '→', color: '#505068' }
  const recent = vals.slice(-3)
  const prior  = vals.slice(-6, -3)
  if (prior.length === 0) return { symbol: '→', color: '#505068' }
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length
  const delta = ((avg(recent) - avg(prior)) / avg(prior)) * 100
  if (delta > 2)  return { symbol: '↑', color: '#FF3737' }
  if (delta < -2) return { symbol: '↓', color: '#00D68F' }
  return { symbol: '→', color: '#505068' }
}

// ─── TrendCard ────────────────────────────────────────────────────────────────

function TrendCard({ vitalKey, logs }: { vitalKey: VitalKey; logs: any[] }) {
  const meta = VITAL_RANGES[vitalKey]
  const Icon = meta.icon

  // DB returns DESC; reverse for chronological chart order
  const chronoVals: number[] = [...logs]
    .reverse()
    .map(l => l[vitalKey])
    .filter((v): v is number => v !== null && v !== undefined)

  if (chronoVals.length < 2) return null

  const latest = chronoVals[chronoVals.length - 1]
  const avg    = chronoVals.reduce((a, b) => a + b, 0) / chronoVals.length
  const status = statusForValue(vitalKey, latest)
  const ss     = STATUS_STYLES[status]
  const { symbol: arrow, color: arrowColor } = trendArrow(chronoVals)
  const statusLabel = status === 'ok' ? 'Normal' : status === 'high' ? 'High' : 'Low'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      style={{
        background: '#121220',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '16px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '30px', height: '30px', borderRadius: '8px',
            background: `${meta.color}18`, border: `1px solid ${meta.color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={13} color={meta.color}/>
          </div>
          <span style={{ color: '#EEEEF8', fontWeight: 700, fontSize: '16px', letterSpacing: '-0.3px' }}>{meta.label}</span>
        </div>
        <span style={{
          background: ss.bg, border: `1px solid ${ss.border}`, color: ss.text,
          fontSize: '10px', fontWeight: 800, padding: '3px 9px', borderRadius: '99px',
          fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '0.5px',
        }}>
          {statusLabel}
        </span>
      </div>

      {/* Sparkline — stretches to container width */}
      <div style={{ width: '100%', lineHeight: 0 }}>
        <svg
          width="100%" height="56"
          viewBox="0 0 280 56"
          preserveAspectRatio="none"
          style={{ display: 'block', overflow: 'visible' }}
        >
          <SparklineInner
            data={chronoVals} color={meta.color}
            width={280} height={56} normalRange={meta.normal}
          />
        </svg>
      </div>

      {/* Footer: value + trend */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div style={{ lineHeight: 1 }}>
          <span style={{
            color: '#EEEEF8', fontWeight: 800, fontSize: '32px', letterSpacing: '-1.2px',
            fontFamily: 'var(--font-mono, monospace)',
          }}>
            {Number.isInteger(latest) ? latest : latest.toFixed(1)}
          </span>
          <span style={{
            color: '#505068', fontSize: '11px', marginLeft: '4px',
            fontFamily: 'var(--font-mono, monospace)',
          }}>
            {meta.unit}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: arrowColor, fontSize: '20px', fontWeight: 700, lineHeight: 1 }}>{arrow}</div>
          <div style={{
            color: '#505068', fontSize: '10px',
            fontFamily: 'var(--font-mono, monospace)', marginTop: '3px', textTransform: 'uppercase', letterSpacing: '0.4px',
          }}>
            avg {avg.toFixed(1)} {meta.unit}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Time range selector ──────────────────────────────────────────────────────

type TimeRange = '7d' | '14d' | '30d'

function TimeRangeSelector({ value, onChange }: { value: TimeRange; onChange: (v: TimeRange) => void }) {
  const opts: TimeRange[] = ['7d', '14d', '30d']
  return (
    <div style={{
      display: 'flex', gap: '3px',
      background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '3px',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      {opts.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          style={{
            flex: 1, padding: '6px 0', borderRadius: '8px', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', fontWeight: 700,
            background: value === opt ? '#4F8EF7' : 'transparent',
            color: value === opt ? '#EEEEF8' : '#505068',
            transition: 'background 0.15s, color 0.15s',
            letterSpacing: '0.3px',
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VitalsPage() {
  const [vitals, setVitals] = useState<Record<string, string>>({
    heart_rate: '', systolic: '', diastolic: '', oxygen_sat: '', resp_rate: '',
  })
  const [saving, setSaving] = useState(false)
  const [recentLogs, setRecentLogs] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [timeRange, setTimeRange] = useState<TimeRange>('7d')
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase
        .from('vitals_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })
        .limit(30)
      setRecentLogs(data || [])
      setLoadingHistory(false)
    }
    load()
  }, [router])

  const refreshHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('vitals_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: false })
      .limit(30)
    setRecentLogs(data || [])
  }

  const handleSave = async () => {
    const filled = Object.entries(vitals).filter(([, v]) => v.trim())
    if (filled.length === 0) { toast.error('Enter at least one vital sign'); return }

    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { toast.error('Please sign in again'); setSaving(false); return }

    const payload: Record<string, number> = {}
    for (const [k, v] of filled) {
      const num = parseFloat(v)
      if (!isNaN(num) && num > 0) payload[k] = num
    }

    try {
      const res = await fetch('/api/vitals/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Could not save vitals')
      } else if (data.critical) {
        toast.error(`${data.alerts[0]} — care team notified`)
        await refreshHistory()
        setVitals({ heart_rate: '', systolic: '', diastolic: '', oxygen_sat: '', resp_rate: '' })
      } else {
        toast.success('Vitals saved')
        await refreshHistory()
        setVitals({ heart_rate: '', systolic: '', diastolic: '', oxygen_sat: '', resp_rate: '' })
      }
    } catch {
      toast.error('Network error — try again')
    }
    setSaving(false)
  }

  // Filter to selected time window
  const windowMs = { '7d': 7, '14d': 14, '30d': 30 }[timeRange] * 24 * 60 * 60 * 1000
  const now = Date.now()
  const filteredLogs = recentLogs.filter(l => now - parseTS(l.logged_at).getTime() <= windowMs)

  const hasAnyChart = VITAL_KEYS.some(k =>
    filteredLogs.filter(l => l[k] !== null && l[k] !== undefined).length >= 2
  )

  return (
    <div style={{ minHeight: '100dvh', background: '#070710', paddingBottom: '80px' }}>

      {/* Header */}
      <div style={{ padding: '56px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            transition={spring}
            onClick={() => router.push('/dashboard')}
            style={{
              width: '38px', height: '38px', borderRadius: '10px', background: '#121220',
              border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <ArrowLeft size={15} color="#8888A8"/>
          </motion.button>
          <div>
            <h1 style={{ color: '#EEEEF8', fontWeight: 900, fontSize: '28px', letterSpacing: '-1px', lineHeight: 1 }}>Vitals</h1>
            <p style={{ color: '#8888A8', fontSize: '12px', marginTop: '3px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Log your vital signs</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Entry grid */}
        <div style={{ background: '#121220', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '16px' }}>
          <p style={{ color: '#505068', fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Today's readings</p>

          {/* Heart rate */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.04)', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(255,55,55,0.12)', border: '1px solid rgba(255,55,55,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Heart size={14} color="#FF3737"/>
              </div>
              <div>
                <p style={{ color: '#EEEEF8', fontWeight: 700, fontSize: '13px' }}>Heart rate</p>
                <p style={{ color: '#505068', fontSize: '10px', fontFamily: 'var(--font-mono, monospace)' }}>Normal: 60–100 bpm</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="number" min="20" max="250"
                style={{ ...inputStyle, borderColor: vitals.heart_rate ? 'rgba(255,55,55,0.35)' : 'rgba(255,255,255,0.10)' }}
                placeholder="—" value={vitals.heart_rate}
                onChange={e => setVitals(p => ({ ...p, heart_rate: e.target.value }))}
              />
              <span style={{ color: '#505068', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', minWidth: '28px' }}>bpm</span>
            </div>
          </div>

          {/* Blood pressure */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.04)', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(79,142,247,0.12)', border: '1px solid rgba(79,142,247,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={14} color="#4F8EF7"/>
              </div>
              <div>
                <p style={{ color: '#EEEEF8', fontWeight: 700, fontSize: '13px' }}>Blood pressure</p>
                <p style={{ color: '#505068', fontSize: '10px', fontFamily: 'var(--font-mono, monospace)' }}>Normal: 90–140 / 60–90</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input
                type="number" min="50" max="260"
                style={{ ...inputStyle, borderColor: vitals.systolic ? 'rgba(79,142,247,0.35)' : 'rgba(255,255,255,0.10)', width: '62px', fontSize: '18px' }}
                placeholder="—" value={vitals.systolic}
                onChange={e => setVitals(p => ({ ...p, systolic: e.target.value }))}
              />
              <span style={{ color: '#505068', fontSize: '16px', fontWeight: 300 }}>/</span>
              <input
                type="number" min="30" max="160"
                style={{ ...inputStyle, borderColor: vitals.diastolic ? 'rgba(79,142,247,0.35)' : 'rgba(255,255,255,0.10)', width: '62px', fontSize: '18px' }}
                placeholder="—" value={vitals.diastolic}
                onChange={e => setVitals(p => ({ ...p, diastolic: e.target.value }))}
              />
            </div>
          </div>

          {/* O2 sat */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.04)', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(0,214,143,0.12)', border: '1px solid rgba(0,214,143,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Droplets size={14} color="#00D68F"/>
              </div>
              <div>
                <p style={{ color: '#EEEEF8', fontWeight: 700, fontSize: '13px' }}>Oxygen sat.</p>
                <p style={{ color: '#505068', fontSize: '10px', fontFamily: 'var(--font-mono, monospace)' }}>Normal: 95–100%</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="number" min="50" max="100"
                style={{ ...inputStyle, borderColor: vitals.oxygen_sat ? 'rgba(0,214,143,0.35)' : 'rgba(255,255,255,0.10)' }}
                placeholder="—" value={vitals.oxygen_sat}
                onChange={e => setVitals(p => ({ ...p, oxygen_sat: e.target.value }))}
              />
              <span style={{ color: '#505068', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', minWidth: '28px' }}>%</span>
            </div>
          </div>

          {/* Resp rate */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Wind size={14} color="#F59E0B"/>
              </div>
              <div>
                <p style={{ color: '#EEEEF8', fontWeight: 700, fontSize: '13px' }}>Resp. rate</p>
                <p style={{ color: '#505068', fontSize: '10px', fontFamily: 'var(--font-mono, monospace)' }}>Normal: 12–20 /min</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="number" min="4" max="60"
                style={{ ...inputStyle, borderColor: vitals.resp_rate ? 'rgba(245,158,11,0.35)' : 'rgba(255,255,255,0.10)' }}
                placeholder="—" value={vitals.resp_rate}
                onChange={e => setVitals(p => ({ ...p, resp_rate: e.target.value }))}
              />
              <span style={{ color: '#505068', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', minWidth: '28px' }}>/min</span>
            </div>
          </div>
        </div>

        {/* Live status badges */}
        <AnimatePresence>
          {Object.entries(vitals).some(([, v]) => v.trim()) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}
            >
              {(Object.entries(vitals) as [string, string][])
                .filter(([, v]) => v.trim())
                .map(([key, val]) => {
                  const status = statusForValue(key, parseFloat(val))
                  const s = STATUS_STYLES[status]
                  const r = VITAL_RANGES[key as VitalKey]
                  return (
                    <span key={key} style={{
                      background: s.bg, border: `1px solid ${s.border}`, color: s.text,
                      fontSize: '11px', fontWeight: 700, padding: '5px 11px', borderRadius: '99px',
                      fontFamily: 'var(--font-mono, monospace)',
                    }}>
                      {r?.label}: {val} {r?.unit} {status === 'high' ? 'H' : status === 'low' ? 'L' : ''}
                    </span>
                  )
                })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Save button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          disabled={saving}
          style={{
            background: '#4F8EF7',
            color: '#EEEEF8',
            fontWeight: 800, fontSize: '15px', padding: '17px', borderRadius: '16px',
            border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            opacity: saving ? 0.65 : 1,
            letterSpacing: '-0.2px',
          }}
        >
          <Save size={16}/>
          {saving ? 'Saving…' : 'Save vitals'}
        </motion.button>

        {/* ── Trends ─────────────────────────────────────────────────────── */}
        {loadingHistory ? (
          <div>
            <p style={{
              color: '#505068', fontSize: '10px',
              fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase',
              letterSpacing: '1px', marginBottom: '12px',
            }}>Trends</p>
            {[1, 2, 3].map(i => (
              <Skeleton key={i} style={{
                height: '140px', borderRadius: '16px',
                background: '#121220', marginBottom: '10px',
              }}/>
            ))}
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <p style={{
                color: '#505068', fontSize: '10px',
                fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '1px',
              }}>Trends</p>
              <div style={{ width: '152px' }}>
                <TimeRangeSelector value={timeRange} onChange={setTimeRange}/>
              </div>
            </div>

            {hasAnyChart ? (
              <motion.div
                style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
              >
                {VITAL_KEYS.map((key, i) => (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, ...spring }}
                  >
                    <TrendCard vitalKey={key} logs={filteredLogs}/>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div style={{
                background: '#121220', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '16px', padding: '36px 16px', textAlign: 'center',
              }}>
                <p style={{ color: '#8888A8', fontSize: '13px', fontWeight: 700 }}>
                  No data for {timeRange} view
                </p>
                <p style={{ color: '#505068', fontSize: '11px', marginTop: '6px' }}>
                  Log at least 2 readings to see trends
                </p>
              </div>
            )}
          </div>
        )}

      </div>

      <BottomNav/>
    </div>
  )
}
