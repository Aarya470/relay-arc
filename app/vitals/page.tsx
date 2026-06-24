'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowLeft, Activity, Save, ChevronRight, Heart, Droplets, Wind } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import BottomNav from '@/components/BottomNav'

const spring = { type: 'spring', stiffness: 380, damping: 24 } as const

const inputStyle: React.CSSProperties = {
  width: '72px', background: '#FFFFFF', border: '1.5px solid rgba(26,40,32,0.12)',
  borderRadius: '12px', padding: '12px', color: '#1A2820', fontSize: '22px',
  fontWeight: 800, outline: 'none', fontFamily: 'inherit', textAlign: 'center',
  letterSpacing: '-0.5px', boxSizing: 'border-box',
}

function parseTS(ts: string) {
  if (!ts) return new Date()
  return new Date(/[Z+]/.test(ts) ? ts : ts + 'Z')
}

const VITAL_RANGES = {
  heart_rate: { low: 40, high: 120, normal: [60, 100], unit: 'bpm', label: 'Heart rate', icon: Heart, color: '#E8322A' },
  systolic: { low: 70, high: 200, normal: [90, 140], unit: 'mmHg', label: 'Systolic BP', icon: Activity, color: '#5C8B74' },
  diastolic: { low: 40, high: 130, normal: [60, 90], unit: 'mmHg', label: 'Diastolic BP', icon: Activity, color: '#5C8B74' },
  oxygen_sat: { low: 85, high: 100, normal: [95, 100], unit: '%', label: 'O₂ sat', icon: Droplets, color: '#2563EB' },
  resp_rate: { low: 8, high: 40, normal: [12, 20], unit: '/min', label: 'Resp. rate', icon: Wind, color: '#7C3AED' },
}

function statusForValue(key: string, val: number | null) {
  if (val === null) return 'empty'
  const range = VITAL_RANGES[key as keyof typeof VITAL_RANGES]
  if (!range) return 'ok'
  if (val < range.normal[0]) return 'low'
  if (val > range.normal[1]) return 'high'
  return 'ok'
}

const STATUS_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  ok: { bg: 'rgba(92,139,116,0.06)', border: 'rgba(92,139,116,0.2)', text: '#3D6B58' },
  high: { bg: 'rgba(220,38,38,0.05)', border: 'rgba(220,38,38,0.22)', text: '#DC2626' },
  low: { bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.25)', text: '#B45309' },
  empty: { bg: 'rgba(26,40,32,0.03)', border: 'rgba(26,40,32,0.08)', text: 'rgba(26,40,32,0.5)' },
}

export default function VitalsPage() {
  const [vitals, setVitals] = useState<Record<string, string>>({
    heart_rate: '', systolic: '', diastolic: '', oxygen_sat: '', resp_rate: ''
  })
  const [saving, setSaving] = useState(false)
  const [recentLogs, setRecentLogs] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
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
        .limit(7)
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
      .limit(7)
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

  return (
    <div style={{ minHeight: '100dvh', background: '#F2EFE9', paddingBottom: '100px' }}>

      {/* Header */}
      <div style={{ padding: '56px 20px 20px', borderBottom: '1px solid rgba(26,40,32,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            transition={spring}
            onClick={() => router.push('/dashboard')}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FFFFFF', border: '1px solid rgba(26,40,32,0.09)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(26,40,32,0.06)' }}
          >
            <ArrowLeft size={15} color="rgba(26,40,32,0.5)"/>
          </motion.button>
          <div>
            <h1 style={{ color: '#1A2820', fontWeight: 900, fontSize: '20px', letterSpacing: '-0.7px' }}>Vitals</h1>
            <p style={{ color: 'rgba(26,40,32,0.38)', fontSize: '12px' }}>Log your vital signs</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Entry grid */}
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(26,40,32,0.07)', borderRadius: '20px', padding: '16px', boxShadow: '0 2px 8px rgba(26,40,32,0.05)' }}>
          <p style={{ color: 'rgba(26,40,32,0.38)', fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>Today's readings</p>

          {/* Heart rate */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid rgba(26,40,32,0.05)', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(232,50,42,0.08)', border: '1px solid rgba(232,50,42,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Heart size={14} color="#E8322A"/>
              </div>
              <div>
                <p style={{ color: '#1A2820', fontWeight: 600, fontSize: '13px' }}>Heart rate</p>
                <p style={{ color: 'rgba(26,40,32,0.32)', fontSize: '10px' }}>Normal: 60–100 bpm</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="number"
                min="20" max="250"
                style={{ ...inputStyle, borderColor: vitals.heart_rate ? 'rgba(232,50,42,0.35)' : 'rgba(26,40,32,0.12)' }}
                placeholder="—"
                value={vitals.heart_rate}
                onChange={e => setVitals(p => ({ ...p, heart_rate: e.target.value }))}
              />
              <span style={{ color: 'rgba(26,40,32,0.3)', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', minWidth: '28px' }}>bpm</span>
            </div>
          </div>

          {/* Blood pressure */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid rgba(26,40,32,0.05)', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(92,139,116,0.08)', border: '1px solid rgba(92,139,116,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={14} color="#5C8B74"/>
              </div>
              <div>
                <p style={{ color: '#1A2820', fontWeight: 600, fontSize: '13px' }}>Blood pressure</p>
                <p style={{ color: 'rgba(26,40,32,0.32)', fontSize: '10px' }}>Normal: 90–140 / 60–90</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input
                type="number"
                min="50" max="260"
                style={{ ...inputStyle, borderColor: vitals.systolic ? 'rgba(92,139,116,0.35)' : 'rgba(26,40,32,0.12)', width: '62px', fontSize: '18px' }}
                placeholder="—"
                value={vitals.systolic}
                onChange={e => setVitals(p => ({ ...p, systolic: e.target.value }))}
              />
              <span style={{ color: 'rgba(26,40,32,0.25)', fontSize: '16px', fontWeight: 300 }}>/</span>
              <input
                type="number"
                min="30" max="160"
                style={{ ...inputStyle, borderColor: vitals.diastolic ? 'rgba(92,139,116,0.35)' : 'rgba(26,40,32,0.12)', width: '62px', fontSize: '18px' }}
                placeholder="—"
                value={vitals.diastolic}
                onChange={e => setVitals(p => ({ ...p, diastolic: e.target.value }))}
              />
            </div>
          </div>

          {/* O2 sat */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid rgba(26,40,32,0.05)', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Droplets size={14} color="#2563EB"/>
              </div>
              <div>
                <p style={{ color: '#1A2820', fontWeight: 600, fontSize: '13px' }}>Oxygen sat.</p>
                <p style={{ color: 'rgba(26,40,32,0.32)', fontSize: '10px' }}>Normal: 95–100%</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="number"
                min="50" max="100"
                style={{ ...inputStyle, borderColor: vitals.oxygen_sat ? 'rgba(37,99,235,0.35)' : 'rgba(26,40,32,0.12)' }}
                placeholder="—"
                value={vitals.oxygen_sat}
                onChange={e => setVitals(p => ({ ...p, oxygen_sat: e.target.value }))}
              />
              <span style={{ color: 'rgba(26,40,32,0.3)', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', minWidth: '28px' }}>%</span>
            </div>
          </div>

          {/* Resp rate */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Wind size={14} color="#7C3AED"/>
              </div>
              <div>
                <p style={{ color: '#1A2820', fontWeight: 600, fontSize: '13px' }}>Resp. rate</p>
                <p style={{ color: 'rgba(26,40,32,0.32)', fontSize: '10px' }}>Normal: 12–20 /min</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="number"
                min="4" max="60"
                style={{ ...inputStyle, borderColor: vitals.resp_rate ? 'rgba(124,58,237,0.35)' : 'rgba(26,40,32,0.12)' }}
                placeholder="—"
                value={vitals.resp_rate}
                onChange={e => setVitals(p => ({ ...p, resp_rate: e.target.value }))}
              />
              <span style={{ color: 'rgba(26,40,32,0.3)', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', minWidth: '28px' }}>/min</span>
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
                  const r = VITAL_RANGES[key as keyof typeof VITAL_RANGES]
                  return (
                    <span key={key} style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text, fontSize: '11px', fontWeight: 700, padding: '5px 10px', borderRadius: '99px' }}>
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
          style={{ background: 'linear-gradient(135deg, #5C8B74, #3D6B58)', color: 'white', fontWeight: 800, fontSize: '15px', padding: '16px', borderRadius: '16px', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 6px 20px rgba(92,139,116,0.22)', opacity: saving ? 0.7 : 1 }}
        >
          <Save size={16}/>
          {saving ? 'Saving…' : 'Save vitals'}
        </motion.button>

        {/* Recent history */}
        {!loadingHistory && recentLogs.length > 0 && (
          <div>
            <p style={{ color: 'rgba(26,40,32,0.38)', fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Recent readings</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentLogs.map(log => (
                <div key={log.id} style={{ background: '#FFFFFF', border: '1px solid rgba(26,40,32,0.07)', borderRadius: '14px', padding: '12px 14px', boxShadow: '0 1px 4px rgba(26,40,32,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <p style={{ color: 'rgba(26,40,32,0.38)', fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                      {parseTS(log.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                    <p style={{ color: 'rgba(26,40,32,0.25)', fontSize: '10px', fontFamily: 'var(--font-mono, monospace)' }}>
                      {parseTS(log.logged_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {log.heart_rate && (
                      <span style={{ ...STATUS_STYLES[statusForValue('heart_rate', log.heart_rate)], fontSize: '11px', fontWeight: 700, padding: '4px 9px', borderRadius: '99px', border: '1px solid', background: STATUS_STYLES[statusForValue('heart_rate', log.heart_rate)].bg, borderColor: STATUS_STYLES[statusForValue('heart_rate', log.heart_rate)].border, color: STATUS_STYLES[statusForValue('heart_rate', log.heart_rate)].text }}>
                        {log.heart_rate} bpm
                      </span>
                    )}
                    {log.systolic && log.diastolic && (
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 9px', borderRadius: '99px', background: STATUS_STYLES[statusForValue('systolic', log.systolic)].bg, border: `1px solid ${STATUS_STYLES[statusForValue('systolic', log.systolic)].border}`, color: STATUS_STYLES[statusForValue('systolic', log.systolic)].text }}>
                        {log.systolic}/{log.diastolic}
                      </span>
                    )}
                    {log.oxygen_sat && (
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 9px', borderRadius: '99px', background: STATUS_STYLES[statusForValue('oxygen_sat', log.oxygen_sat)].bg, border: `1px solid ${STATUS_STYLES[statusForValue('oxygen_sat', log.oxygen_sat)].border}`, color: STATUS_STYLES[statusForValue('oxygen_sat', log.oxygen_sat)].text }}>
                        O₂ {log.oxygen_sat}%
                      </span>
                    )}
                    {log.resp_rate && (
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 9px', borderRadius: '99px', background: STATUS_STYLES[statusForValue('resp_rate', log.resp_rate)].bg, border: `1px solid ${STATUS_STYLES[statusForValue('resp_rate', log.resp_rate)].border}`, color: STATUS_STYLES[statusForValue('resp_rate', log.resp_rate)].text }}>
                        Resp {log.resp_rate}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {loadingHistory && (
          <div>
            {[1,2,3].map(i => <Skeleton key={i} style={{ height: '56px', borderRadius: '14px', background: 'rgba(26,40,32,0.06)', marginBottom: '6px' }}/>)}
          </div>
        )}

      </div>

      <BottomNav/>
    </div>
  )
}
