'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Check, X, ChevronDown, Pill } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import BottomNav from '@/components/BottomNav'

const spring = { type: 'spring', stiffness: 380, damping: 24 } as const

const TIME_OPTIONS = [
  '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
  '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM', '11:00 PM',
  'Morning', 'Afternoon', 'Evening', 'Bedtime', 'With breakfast',
  'With lunch', 'With dinner', 'Before bed', 'As needed'
]

const FREQUENCY_OPTIONS = [
  'Once daily', 'Twice daily', 'Three times daily', 'Four times daily',
  'Every morning', 'Every night', 'Every 8 hours', 'Every 12 hours',
  'Weekly', 'As needed', 'With meals'
]

// Returns "YYYY-MM-DD" in local time for a given Date
function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function Medications() {
  const [medications, setMedications] = useState<any[]>([])
  const [taken, setTaken] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [addingTime, setAddingTime] = useState<number | null>(null)
  const [showTimeDropdown, setShowTimeDropdown] = useState(false)
  const [showFreqDropdown, setShowFreqDropdown] = useState(false)
  const [newMed, setNewMed] = useState({ name: '', dose: '', frequency: 'Once daily', times: ['Morning'] })
  const [allLogs, setAllLogs] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const todayMidnight = new Date()
      todayMidnight.setHours(0, 0, 0, 0)

      const twentyEightDaysAgo = new Date()
      twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28)

      const [{ data: profile }, { data: logs }, { data: fetchedAllLogs }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('medication_logs').select('*').eq('user_id', user.id).gte(
          'taken_at',
          todayMidnight.toISOString()
        ),
        supabase.from('medication_logs').select('*').eq('user_id', user.id)
          .gte('taken_at', twentyEightDaysAgo.toISOString())
          .order('taken_at', { ascending: true })
      ])

      const meds = (profile?.medications || []).map((m: any) => ({
        ...m,
        times: m.times || ['Morning']
      }))
      setMedications(meds)
      setAllLogs(fetchedAllLogs || [])

      // Restore today's taken state from medication_logs
      const initialTaken: Record<string, boolean> = {}
      meds.forEach((med: any, medIndex: number) => {
        const wasTaken = (logs || []).some((log: any) => log.medication_name === med.name)
        if (wasTaken) {
          med.times.forEach((_: string, timeIndex: number) => {
            initialTaken[`${medIndex}-${timeIndex}`] = true
          })
        }
      })
      setTaken(initialTaken)
      setLoading(false)
    }
    load()
  }, [])

  const toggleTaken = async (medIndex: number, timeIndex: number) => {
    const key = `${medIndex}-${timeIndex}`
    const med = medications[medIndex]
    const newTaken = { ...taken, [key]: !taken[key] }
    setTaken(newTaken)
    if (!taken[key]) {
      toast.success(`${med.name} marked as taken`)
      const nowIso = new Date().toISOString()
      await supabase.from('medication_logs').insert({
        user_id: userId,
        medication_name: med.name,
        dose: med.dose,
        taken_at: nowIso
      })
      // Optimistically add to allLogs so the analytics update without a reload
      setAllLogs(prev => [...prev, { medication_name: med.name, dose: med.dose, taken_at: nowIso, user_id: userId }])
    }
  }

  const addMedication = async () => {
    if (!newMed.name.trim()) { toast.error('Enter medication name'); return }
    setSaving(true)
    const updated = [...medications, { ...newMed }]
    const { error } = await supabase.from('profiles').update({ medications: updated }).eq('id', userId)
    if (!error) {
      setMedications(updated)
      setNewMed({ name: '', dose: '', frequency: 'Once daily', times: ['Morning'] })
      setShowAdd(false)
      toast.success('Medication added')
    }
    setSaving(false)
  }

  const removeMedication = async (index: number) => {
    const med = medications[index]
    const confirmed = window.confirm(`Remove ${med.name}? This cannot be undone.`)
    if (!confirmed) return
    const updated = medications.filter((_, i) => i !== index)
    await supabase.from('profiles').update({ medications: updated }).eq('id', userId)
    setMedications(updated)
    toast.success(`${med.name} removed`)
  }

  const addTime = async (medIndex: number, time: string) => {
    const updated = [...medications]
    if (!updated[medIndex].times.includes(time)) {
      updated[medIndex].times = [...updated[medIndex].times, time]
      setMedications(updated)
      await supabase.from('profiles').update({ medications: updated }).eq('id', userId)
    }
    setAddingTime(null)
  }

  const removeTime = async (medIndex: number, timeIndex: number) => {
    const updated = [...medications]
    updated[medIndex].times.splice(timeIndex, 1)
    setMedications([...updated])
    await supabase.from('profiles').update({ medications: updated }).eq('id', userId)
  }

  const totalDoses = medications.reduce((acc, m) => acc + (m.times?.length || 1), 0)
  const takenCount = Object.values(taken).filter(Boolean).length
  const progress = totalDoses > 0 ? (takenCount / totalDoses) * 100 : 0

  // ── Analytics derived values ──────────────────────────────────────────────

  // Set of date strings (YYYY-MM-DD) that have at least one log
  const activeDaysSet = new Set(
    allLogs.map(log => toDateStr(new Date(log.taken_at)))
  )

  // 28-day adherence rate
  const adherenceRate = Math.round((activeDaysSet.size / 28) * 100)

  // Current week dots: Mon → Sun of the current local week
  const today = new Date()
  const dayOfWeek = today.getDay() // 0 = Sun
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const weekDots = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + mondayOffset + i)
    return {
      dateStr: toDateStr(d),
      label: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2),
      isFuture: d > today,
    }
  })
  const weekTakenDays = weekDots.filter(dot => !dot.isFuture && activeDaysSet.has(dot.dateStr)).length
  const weekPossibleDays = weekDots.filter(dot => !dot.isFuture).length
  const weekPct = weekPossibleDays > 0 ? Math.round((weekTakenDays / weekPossibleDays) * 100) : 0

  // Current streak: consecutive days ending today or yesterday
  let streak = 0
  const todayStr = toDateStr(today)
  const yesterdayDate = new Date(today)
  yesterdayDate.setDate(today.getDate() - 1)
  const yesterdayStr = toDateStr(yesterdayDate)

  // Start from today; if today not active, try from yesterday
  const startStr = activeDaysSet.has(todayStr) ? todayStr : (activeDaysSet.has(yesterdayStr) ? yesterdayStr : null)
  if (startStr) {
    const cursor = new Date(startStr)
    while (activeDaysSet.has(toDateStr(cursor))) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    }
  }

  // Best streak over 28 days
  let bestStreak = 0
  let tempStreak = 0
  const sortedDays = Array.from(activeDaysSet).sort()
  for (let i = 0; i < sortedDays.length; i++) {
    if (i === 0) {
      tempStreak = 1
    } else {
      const prev = new Date(sortedDays[i - 1])
      const curr = new Date(sortedDays[i])
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000)
      if (diffDays === 1) {
        tempStreak++
      } else {
        tempStreak = 1
      }
    }
    if (tempStreak > bestStreak) bestStreak = tempStreak
  }

  // ─────────────────────────────────────────────────────────────────────────

  const sheetInputStyle: React.CSSProperties = {
    background: '#F0EDE5',
    border: '1.5px solid rgba(16,22,14,0.1)',
    borderRadius: '14px',
    padding: '14px 16px',
    color: '#0F1A0E',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
    fontFamily: 'inherit',
  }

  if (loading) return (
    <div style={{ minHeight: '100dvh', background: '#F0EDE5', padding: '80px 16px 100px' }}>
      {[1,2,3].map(i => <Skeleton key={i} style={{ height: '112px', borderRadius: '14px', background: 'rgba(16,22,14,0.06)', marginBottom: '12px' }}/>)}
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', background: '#F0EDE5', paddingBottom: '100px', maxWidth: '720px', margin: '0 auto', width: '100%' }}>

      {/* Header */}
      <div style={{ padding: '56px 20px 16px', borderBottom: '1px solid rgba(16,22,14,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <motion.button
              whileTap={{ scale: 0.9 }}
              transition={spring}
              onClick={() => router.push('/dashboard')}
              style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FFFFFF', border: '1px solid rgba(16,22,14,0.09)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(16,22,14,0.06)' }}
            >
              <ArrowLeft size={16} color="rgba(16,22,14,0.5)"/>
            </motion.button>
            <div>
              <h1 style={{ color: '#0F1A0E', fontWeight: 800, fontSize: '20px', letterSpacing: '-0.6px' }}>Medications</h1>
              <p style={{ color: 'rgba(16,22,14,0.38)', fontSize: '12px' }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
                {totalDoses > 0 && ` · ${takenCount}/${totalDoses} doses taken`}
              </p>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            transition={spring}
            onClick={() => setShowAdd(true)}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(44,122,80,0.1)', border: '1px solid rgba(44,122,80,0.22)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Plus size={16} color="#2C7A50"/>
          </motion.button>
        </div>

        {/* Progress */}
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(16,22,14,0.07)', borderRadius: '4px 20px 20px 20px', padding: '14px 16px', boxShadow: '0 1px 6px rgba(16,22,14,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <p style={{ color: '#0F1A0E', fontSize: '13px', fontWeight: 600 }}>{takenCount} of {totalDoses} doses taken</p>
            <p style={{ color: 'rgba(16,22,14,0.38)', fontSize: '12px', fontFamily: 'var(--font-mono, monospace)' }}>{Math.round(progress)}%</p>
          </div>
          <div style={{ height: '4px', background: 'rgba(16,22,14,0.07)', borderRadius: '99px', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
              style={{ height: '100%', background: 'linear-gradient(90deg, #2C7A50, #1C3D28)', borderRadius: '99px' }}
            />
          </div>
        </div>
      </div>

      {/* Add medication sheet */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(16,22,14,0.4)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
            onClick={e => { if (e.target === e.currentTarget) setShowAdd(false) }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              style={{
                background: '#FFFFFF',
                borderRadius: '24px 24px 0 0',
                padding: '24px 20px 40px',
                width: '100%',
                maxHeight: '85dvh',
                overflowY: 'auto',
                boxShadow: '0 -8px 40px rgba(16,22,14,0.14), inset 0 1px 0 rgba(255,255,255,0.8)',
              }}
            >
              {/* Drag handle */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px', marginTop: '-8px' }}>
                <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(16,22,14,0.1)' }}/>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <p style={{ color: '#0F1A0E', fontWeight: 800, fontSize: '18px', letterSpacing: '-0.4px' }}>Add medication</p>
                <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(16,22,14,0.35)' }}>
                  <X size={20}/>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input placeholder="Medication name" value={newMed.name}
                  onChange={e => setNewMed(prev => ({ ...prev, name: e.target.value }))}
                  style={sheetInputStyle}/>
                <input placeholder="Dose (e.g. 50mg)" value={newMed.dose}
                  onChange={e => setNewMed(prev => ({ ...prev, dose: e.target.value }))}
                  style={sheetInputStyle}/>

                {/* Frequency dropdown */}
                <div>
                  <button onClick={() => { setShowFreqDropdown(!showFreqDropdown); setShowTimeDropdown(false) }}
                    style={{ ...sheetInputStyle, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {newMed.frequency}
                    <motion.div animate={{ rotate: showFreqDropdown ? 180 : 0 }} transition={{ duration: 0.18 }}>
                      <ChevronDown size={16} color="rgba(16,22,14,0.4)"/>
                    </motion.div>
                  </button>
                  <AnimatePresence>
                    {showFreqDropdown && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        style={{ overflow: 'hidden', background: '#FFFFFF', border: '1px solid rgba(16,22,14,0.1)', borderRadius: '14px', marginTop: '4px', boxShadow: '0 4px 20px rgba(16,22,14,0.1)' }}
                      >
                        {FREQUENCY_OPTIONS.map(f => (
                          <button key={f} onClick={() => { setNewMed(prev => ({ ...prev, frequency: f })); setShowFreqDropdown(false) }}
                            style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none', color: newMed.frequency === f ? '#2C7A50' : 'rgba(16,22,14,0.7)', fontSize: '14px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', fontWeight: newMed.frequency === f ? 700 : 400, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            {f}
                            {newMed.frequency === f && <Check size={14} color="#2C7A50"/>}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Time dropdown */}
                <div>
                  <button onClick={() => { setShowTimeDropdown(!showTimeDropdown); setShowFreqDropdown(false) }}
                    style={{ ...sheetInputStyle, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {newMed.times.join(', ')}
                    <motion.div animate={{ rotate: showTimeDropdown ? 180 : 0 }} transition={{ duration: 0.18 }}>
                      <ChevronDown size={16} color="rgba(16,22,14,0.4)"/>
                    </motion.div>
                  </button>
                  <AnimatePresence>
                    {showTimeDropdown && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        style={{ overflow: 'hidden', background: '#FFFFFF', border: '1px solid rgba(16,22,14,0.1)', borderRadius: '14px', marginTop: '4px', boxShadow: '0 4px 20px rgba(16,22,14,0.1)' }}
                      >
                        {TIME_OPTIONS.map(t => (
                          <button key={t}
                            onClick={() => {
                              const times = newMed.times.includes(t)
                                ? newMed.times.filter(x => x !== t)
                                : [...newMed.times, t]
                              setNewMed(prev => ({ ...prev, times: times.length > 0 ? times : ['Morning'] }))
                            }}
                            style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none', color: newMed.times.includes(t) ? '#2C7A50' : 'rgba(16,22,14,0.7)', fontSize: '14px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'inherit' }}>
                            {t}
                            {newMed.times.includes(t) && <Check size={14} color="#2C7A50"/>}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <motion.button
                  whileTap={{ scale: 0.97, y: 1 }}
                  transition={spring}
                  onClick={addMedication}
                  disabled={saving}
                  style={{ background: 'linear-gradient(135deg, #2C7A50, #1C3D28)', color: '#FFFFFF', fontWeight: 800, fontSize: '15px', padding: '16px', borderRadius: '14px', border: 'none', cursor: 'pointer', marginTop: '4px', boxShadow: '0 6px 20px rgba(44,122,80,0.22)' }}
                >
                  {saving ? 'Saving...' : 'Add medication'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Medication list */}
      <div style={{ padding: '16px' }}>

        {/* Adherence Analytics Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, ...spring }}
          style={{ background: '#FFFFFF', border: '1px solid rgba(16,22,14,0.07)', borderRadius: '20px 4px 20px 20px', marginBottom: '16px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(16,22,14,0.05)' }}
        >
          {/* Card header */}
          <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid rgba(16,22,14,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ color: '#0F1A0E', fontSize: '13px', fontWeight: 700, letterSpacing: '-0.2px' }}>Adherence</p>
            <span style={{ color: 'rgba(16,22,14,0.35)', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>28 days</span>
          </div>

          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* This week row */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <p style={{ color: 'rgba(16,22,14,0.5)', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>This week</p>
                <span style={{ color: weekPct >= 80 ? '#2C7A50' : 'rgba(16,22,14,0.38)', fontSize: '12px', fontFamily: 'var(--font-mono, monospace)', fontWeight: 600 }}>{weekPct}%</span>
              </div>
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'space-between' }}>
                {weekDots.map((dot, i) => {
                  const isActive = activeDaysSet.has(dot.dateStr)
                  const isToday = dot.dateStr === todayStr
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', flex: 1 }}>
                      <motion.div
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1 + i * 0.04, type: 'spring', stiffness: 400, damping: 22 }}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: dot.isFuture
                            ? 'transparent'
                            : isActive
                              ? 'linear-gradient(135deg, #2C7A50, #1C3D28)'
                              : 'rgba(16,22,14,0.07)',
                          border: isToday
                            ? `2px solid ${isActive ? '#2C7A50' : 'rgba(16,22,14,0.22)'}`
                            : dot.isFuture
                              ? '1.5px dashed rgba(16,22,14,0.12)'
                              : '2px solid transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: isActive ? '0 2px 8px rgba(44,122,80,0.22)' : 'none',
                        }}
                      >
                        {isActive && <Check size={12} color="white" strokeWidth={3}/>}
                      </motion.div>
                      <span style={{
                        color: isToday ? '#2C7A50' : 'rgba(16,22,14,0.35)',
                        fontSize: '10px',
                        fontFamily: 'var(--font-mono, monospace)',
                        fontWeight: isToday ? 700 : 400,
                        letterSpacing: '0.2px',
                      }}>{dot.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Streak + 28-day bar row */}
            <div style={{ display: 'flex', gap: '10px' }}>

              {/* Streak pill */}
              <div style={{ flex: '0 0 auto', background: '#F0EDE5', borderRadius: '14px', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '90px' }}>
                <p style={{ color: '#0F1A0E', fontSize: '16px', fontWeight: 800, fontFamily: 'var(--font-mono, monospace)', letterSpacing: '-0.5px', lineHeight: 1 }}>
                  {streak >= 2 ? `${streak}d` : '—'}
                </p>
                <p style={{ color: 'rgba(16,22,14,0.4)', fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  {streak >= 2 ? 'streak' : 'no streak'}
                </p>
                {bestStreak > 0 && (
                  <p style={{ color: 'rgba(16,22,14,0.3)', fontSize: '10px', marginTop: '4px' }}>
                    Best: <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 600 }}>{bestStreak}d</span>
                  </p>
                )}
              </div>

              {/* 28-day adherence bar */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <p style={{ color: 'rgba(16,22,14,0.5)', fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>28-day rate</p>
                  <span style={{ color: adherenceRate >= 80 ? '#2C7A50' : adherenceRate >= 50 ? '#0F1A0E' : 'rgba(16,22,14,0.5)', fontSize: '14px', fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}>{adherenceRate}%</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(16,22,14,0.07)', borderRadius: '99px', overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${adherenceRate}%` }}
                    transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1], delay: 0.15 }}
                    style={{
                      height: '100%',
                      background: adherenceRate >= 80
                        ? 'linear-gradient(90deg, #2C7A50, #1C3D28)'
                        : adherenceRate >= 50
                          ? 'linear-gradient(90deg, #7A6C2C, #3D3218)'
                          : 'rgba(16,22,14,0.25)',
                      borderRadius: '99px',
                    }}
                  />
                </div>
                <p style={{ color: 'rgba(16,22,14,0.3)', fontSize: '10px' }}>
                  {activeDaysSet.size} of 28 days
                </p>
              </div>

            </div>
          </div>
        </motion.div>

        {medications.length === 0 && (
          <div style={{ textAlign: 'center', padding: '56px 0' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'rgba(44,122,80,0.1)', border: '1px solid rgba(44,122,80,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Pill size={22} color="rgba(44,122,80,0.55)"/>
            </div>
            <p style={{ color: 'rgba(16,22,14,0.3)', fontSize: '14px', marginBottom: '16px' }}>No medications added yet</p>
            <button onClick={() => setShowAdd(true)} style={{ color: '#2C7A50', fontSize: '14px', background: 'none', border: '1px solid rgba(44,122,80,0.3)', borderRadius: '12px', padding: '10px 20px', cursor: 'pointer', fontWeight: 600 }}>
              Add your first medication
            </button>
          </div>
        )}

        {medications.map((med: any, medIndex: number) => (
          <motion.div
            key={medIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: medIndex * 0.05, ...spring }}
            style={{ background: '#FFFFFF', border: '1px solid rgba(16,22,14,0.07)', borderRadius: medIndex % 2 === 0 ? '20px 4px 20px 20px' : '4px 20px 20px 20px', marginBottom: '12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(16,22,14,0.05)' }}
          >
            {/* Med header */}
            <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(44,122,80,0.1)', border: '1px solid rgba(44,122,80,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Pill size={16} color="#2C7A50"/>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#0F1A0E', fontWeight: 700, fontSize: '14px', letterSpacing: '-0.2px' }}>{med.name}</p>
                <p style={{ color: 'rgba(16,22,14,0.4)', fontSize: '12px' }}>{med.dose} · {med.frequency}</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setAddingTime(addingTime === medIndex ? null : medIndex)}
                  style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(16,22,14,0.05)', border: '1px solid rgba(16,22,14,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={13} color="rgba(16,22,14,0.45)"/>
                </button>
                <button onClick={() => removeMedication(medIndex)}
                  style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(232,50,42,0.06)', border: '1px solid rgba(232,50,42,0.12)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={13} color="#B91C1C"/>
                </button>
              </div>
            </div>

            {/* Add time panel */}
            <AnimatePresence>
              {addingTime === medIndex && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  style={{ overflow: 'hidden', borderTop: '1px solid rgba(16,22,14,0.06)', padding: '12px 16px', background: '#F0EDE5' }}
                >
                  <p style={{ color: 'rgba(16,22,14,0.38)', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Add time</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {TIME_OPTIONS.map(t => (
                      <button key={t} onClick={() => addTime(medIndex, t)}
                        style={{ padding: '6px 12px', background: med.times?.includes(t) ? 'rgba(44,122,80,0.12)' : '#FFFFFF', border: `1px solid ${med.times?.includes(t) ? 'rgba(44,122,80,0.3)' : 'rgba(16,22,14,0.1)'}`, borderRadius: '14px', color: med.times?.includes(t) ? '#2C7A50' : 'rgba(16,22,14,0.5)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Dose times */}
            <div style={{ borderTop: '1px solid rgba(16,22,14,0.06)' }}>
              {med.times?.map((time: string, timeIndex: number) => {
                const key = `${medIndex}-${timeIndex}`
                const isTaken = taken[key]
                return (
                  <div key={timeIndex} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: '1px solid rgba(16,22,14,0.04)', opacity: isTaken ? 0.55 : 1, transition: 'opacity 0.2s ease' }}>
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      transition={spring}
                      onClick={() => toggleTaken(medIndex, timeIndex)}
                      style={{ width: '32px', height: '32px', borderRadius: '50%', border: `2px solid ${isTaken ? '#2C7A50' : 'rgba(16,22,14,0.18)'}`, background: isTaken ? '#2C7A50' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'border-color 0.18s ease, background 0.18s ease' }}
                    >
                      {isTaken && <Check size={14} color="white"/>}
                    </motion.button>
                    <p style={{ color: 'rgba(16,22,14,0.65)', fontSize: '13px', flex: 1 }}>{time}</p>
                    {!isTaken ? (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        transition={spring}
                        onClick={() => toggleTaken(medIndex, timeIndex)}
                        style={{ background: 'rgba(44,122,80,0.1)', border: '1px solid rgba(44,122,80,0.24)', color: '#2C7A50', fontSize: '12px', padding: '6px 14px', borderRadius: '14px', cursor: 'pointer', fontWeight: 700 }}
                      >
                        Take
                      </motion.button>
                    ) : (
                      <span style={{ color: '#2C7A50', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', fontWeight: 600 }}>Done</span>
                    )}
                    <button onClick={() => removeTime(medIndex, timeIndex)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(16,22,14,0.2)', padding: '4px' }}>
                      <X size={12}/>
                    </button>
                  </div>
                )
              })}
            </div>
          </motion.div>
        ))}
      </div>

      <BottomNav/>
    </div>
  )
}
