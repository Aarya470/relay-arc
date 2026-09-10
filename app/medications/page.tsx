'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Check, X, ChevronDown, Pill } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import BottomNav from '@/components/BottomNav'

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG      = '#B3DDAC'
const SURFACE = '#FFFFFF'
const T1      = '#141413'
const T2      = '#5C5A52'
const T3      = '#5C5A52'
const ACCENT  = '#42623C'
const ACCENT_DIM = 'rgba(86,128,78,0.08)'
const RED     = '#A33417'
const RED_DIM = 'rgba(163,52,23,0.07)'
const GREEN   = '#42623C'
const GREEN_DIM = 'rgba(86,128,78,0.08)'
const AMBER   = '#A87200'
const BORDER  = '#98C890'
const SHADOW  = '0 1px 4px rgba(20,20,19,0.07)'

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

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function Medications() {
  const [medications, setMedications] = useState<any[]>([])
  const [taken, setTaken]             = useState<Record<string, boolean>>({})
  const [loading, setLoading]         = useState(true)
  const [userId, setUserId]           = useState('')
  const [showAdd, setShowAdd]         = useState(false)
  const [addingTime, setAddingTime]   = useState<number | null>(null)
  const [showTimeDropdown, setShowTimeDropdown]   = useState(false)
  const [showFreqDropdown, setShowFreqDropdown]   = useState(false)
  const [newMed, setNewMed]           = useState({ name: '', dose: '', frequency: 'Once daily', times: ['Morning'] })
  const [allLogs, setAllLogs]         = useState<any[]>([])
  const [saving, setSaving]           = useState(false)
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
        supabase.from('medication_logs').select('*').eq('user_id', user.id).gte('taken_at', todayMidnight.toISOString()),
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

  // EVERY WRITE ON THIS PAGE USED TO IGNORE ITS RESULT.
  //
  // The pattern was the same each time: change the state, tell the person it
  // worked, fire the query, never look at what came back. When a write failed
  // the screen and the database quietly disagreed, and the screen was the
  // convincing one. Reload and the change is gone.
  //
  // On a medication list that is not a cosmetic problem. The same array feeds
  // the emergency card and the ER handoff brief, so a drug someone believes
  // they deleted keeps being shown to clinicians, and a drug they believe they
  // added is missing when it matters. Doses marked as taken were inserted into
  // medication_logs unchecked, which is what the adherence figure on this page
  // is calculated from.
  //
  // Every one of them now reverts the screen and says what happened.
  const saveMeds = async (next: any[]): Promise<boolean> => {
    const { error } = await supabase.from('profiles').update({ medications: next }).eq('id', userId)
    if (error) console.error('medications update failed:', error)
    return !error
  }

  const toggleTaken = async (medIndex: number, timeIndex: number) => {
    const key = `${medIndex}-${timeIndex}`
    const med = medications[medIndex]
    const wasTaken = taken[key]
    setTaken({ ...taken, [key]: !wasTaken })
    if (!wasTaken) {
      const nowIso = new Date().toISOString()
      const { error } = await supabase.from('medication_logs').insert({
        user_id: userId, medication_name: med.name, dose: med.dose, taken_at: nowIso
      })
      if (error) {
        // Put the tick back. Leaving it on would mean the dose looks recorded
        // on this screen and is absent from the adherence figure underneath it.
        setTaken(t => ({ ...t, [key]: false }))
        toast.error(`Could not record ${med.name}. Tap again in a moment.`)
        return
      }
      setAllLogs(prev => [...prev, { medication_name: med.name, dose: med.dose, taken_at: nowIso, user_id: userId }])
      toast.success(`${med.name} marked as taken`)
    }
  }

  const addMedication = async () => {
    if (!newMed.name.trim()) { toast.error('Enter medication name'); return }
    setSaving(true)
    const updated = [...medications, { ...newMed }]
    if (await saveMeds(updated)) {
      setMedications(updated)
      setNewMed({ name: '', dose: '', frequency: 'Once daily', times: ['Morning'] })
      setShowAdd(false)
      toast.success('Medication added')
    } else {
      // There was no else. The sheet stayed open, the button stopped spinning,
      // and nothing at all was said.
      toast.error('Could not save this medication. Your list has not changed.')
    }
    setSaving(false)
  }

  const removeMedication = async (index: number) => {
    const med = medications[index]
    const confirmed = window.confirm(`Remove ${med.name}? This cannot be undone.`)
    if (!confirmed) return
    const updated = medications.filter((_, i) => i !== index)
    if (await saveMeds(updated)) {
      setMedications(updated)
      toast.success(`${med.name} removed`)
    } else {
      toast.error(`Could not remove ${med.name}. It is still on your list and on your emergency card.`)
    }
  }

  // These two also mutated state in place. `const updated = [...medications]`
  // copies the outer array but not the medication objects inside it, so
  // `updated[i].times = ...` and `.times.splice(...)` were editing the very
  // objects React was holding. React compares by reference, so the re-render
  // could be skipped, and there was no untouched previous value left to put
  // back if the save failed. Rebuilt immutably.
  const addTime = async (medIndex: number, time: string) => {
    setAddingTime(null)
    if (medications[medIndex].times.includes(time)) return
    const updated = medications.map((m, i) =>
      i === medIndex ? { ...m, times: [...m.times, time] } : m
    )
    setMedications(updated)
    if (!await saveMeds(updated)) {
      setMedications(medications)
      toast.error('Could not add that time. Try again.')
    }
  }

  const removeTime = async (medIndex: number, timeIndex: number) => {
    const updated = medications.map((m, i) =>
      i === medIndex ? { ...m, times: m.times.filter((_: string, j: number) => j !== timeIndex) } : m
    )
    setMedications(updated)
    if (!await saveMeds(updated)) {
      setMedications(medications)
      toast.error('Could not remove that time. Try again.')
    }
  }

  const totalDoses  = medications.reduce((acc, m) => acc + (m.times?.length || 1), 0)
  const takenCount  = Object.values(taken).filter(Boolean).length
  const progress    = totalDoses > 0 ? (takenCount / totalDoses) * 100 : 0

  // ── Analytics ─────────────────────────────────────────────────────────────
  const activeDaysSet = new Set(allLogs.map(log => toDateStr(new Date(log.taken_at))))
  const adherenceRate = Math.round((activeDaysSet.size / 28) * 100)

  const today      = new Date()
  const dayOfWeek  = today.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const weekDots = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + mondayOffset + i)
    return { dateStr: toDateStr(d), label: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2), isFuture: d > today }
  })
  const weekTakenDays    = weekDots.filter(dot => !dot.isFuture && activeDaysSet.has(dot.dateStr)).length
  const weekPossibleDays = weekDots.filter(dot => !dot.isFuture).length
  const weekPct = weekPossibleDays > 0 ? Math.round((weekTakenDays / weekPossibleDays) * 100) : 0

  const todayStr = toDateStr(today)
  const yesterdayDate = new Date(today); yesterdayDate.setDate(today.getDate() - 1)
  const yesterdayStr = toDateStr(yesterdayDate)
  let streak = 0
  const startStr = activeDaysSet.has(todayStr) ? todayStr : (activeDaysSet.has(yesterdayStr) ? yesterdayStr : null)
  if (startStr) {
    const cursor = new Date(startStr)
    while (activeDaysSet.has(toDateStr(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1) }
  }

  let bestStreak = 0, tempStreak = 0
  const sortedDays = Array.from(activeDaysSet).sort()
  for (let i = 0; i < sortedDays.length; i++) {
    if (i === 0) { tempStreak = 1 } else {
      const prev = new Date(sortedDays[i - 1])
      const curr = new Date(sortedDays[i])
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000)
      tempStreak = diffDays === 1 ? tempStreak + 1 : 1
    }
    if (tempStreak > bestStreak) bestStreak = tempStreak
  }

  const adherenceColor = adherenceRate >= 80 ? GREEN : adherenceRate >= 50 ? AMBER : RED

  const sheetInputStyle: React.CSSProperties = {
    background: BG,
    border: `1.5px solid ${BORDER}`,
    borderRadius: '10px',
    padding: '13px 16px',
    color: T1,
    fontSize: '14px',
    outline: 'none',
    width: '100%',
    fontFamily: 'inherit',
  }

  if (loading) return (
    <div style={{ minHeight: '100dvh', background: BG, padding: '80px 16px 100px' }}>
      {[1,2,3].map(i => <div key={i} style={{ height: '112px', borderRadius: '16px', background: '#98C890', marginBottom: '12px', animation: 'pulse 1.5s ease-in-out infinite' }}/>)}
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', background: BG, paddingBottom: '80px', maxWidth: '720px', margin: '0 auto', width: '100%' }}>

      {/* Header */}
      <div style={{ padding: '56px 20px 16px', borderBottom: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div>
            <button onClick={() => router.push('/dashboard')}
              style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '18px', color: T3, fontSize: '13px', fontWeight: 500, fontFamily: 'inherit' }}>
              <ArrowLeft size={14}/> Dashboard
            </button>
            <p style={{ color: T3, fontSize: '10px', fontWeight: 700, marginBottom: '7px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
              {totalDoses > 0 && ` · ${takenCount}/${totalDoses} doses`}
            </p>
            <h1 style={{ color: T1, fontWeight: 800, fontSize: '32px', letterSpacing: '-1px', lineHeight: 1 }}>Medications</h1>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }} transition={spring}
            onClick={() => setShowAdd(true)}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: ACCENT_DIM, border: `1px solid rgba(86,128,78,0.14)`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Plus size={16} color={ACCENT}/>
          </motion.button>
        </div>

        {/* Progress bar */}
        <div style={{ borderTop: `1px solid ${BORDER}`, padding: '14px 0 2px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <p style={{ color: T1, fontSize: '13px', fontWeight: 700 }}>{takenCount} of {totalDoses} doses taken</p>
            <p style={{ color: T3, fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', letterSpacing: '0.5px' }}>{Math.round(progress)}%</p>
          </div>
          <div style={{ height: '5px', background: BG, borderRadius: '99px', overflow: 'hidden', border: `1px solid ${BORDER}` }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
              style={{ height: '100%', background: progress >= 100 ? GREEN : ACCENT, borderRadius: '99px' }}
            />
          </div>
        </div>
      </div>

      {/* Add medication sheet */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,19,0.4)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
            onClick={e => { if (e.target === e.currentTarget) setShowAdd(false) }}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              style={{
                background: SURFACE,
                borderRadius: '20px 20px 0 0',
                padding: '24px 20px 40px',
                width: '100%', maxHeight: '85dvh', overflowY: 'auto',
                border: `1px solid ${BORDER}`, borderBottom: 'none',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px', marginTop: '-8px' }}>
                <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: BORDER }}/>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <p style={{ color: T1, fontWeight: 800, fontSize: '18px', letterSpacing: '-0.5px' }}>Add medication</p>
                <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T3, padding: '4px' }}>
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
                    <span style={{ color: T1 }}>{newMed.frequency}</span>
                    <motion.div animate={{ rotate: showFreqDropdown ? 180 : 0 }} transition={{ duration: 0.18 }}>
                      <ChevronDown size={16} color={T3}/>
                    </motion.div>
                  </button>
                  <AnimatePresence>
                    {showFreqDropdown && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        style={{ overflow: 'hidden', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '10px', marginTop: '4px' }}
                      >
                        {FREQUENCY_OPTIONS.map(f => (
                          <button key={f} onClick={() => { setNewMed(prev => ({ ...prev, frequency: f })); setShowFreqDropdown(false) }}
                            style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none', color: newMed.frequency === f ? ACCENT : T2, fontSize: '14px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', fontWeight: newMed.frequency === f ? 700 : 400, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${BORDER}` }}>
                            {f}
                            {newMed.frequency === f && <Check size={14} color={ACCENT}/>}
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
                    <span style={{ color: T1 }}>{newMed.times.join(', ')}</span>
                    <motion.div animate={{ rotate: showTimeDropdown ? 180 : 0 }} transition={{ duration: 0.18 }}>
                      <ChevronDown size={16} color={T3}/>
                    </motion.div>
                  </button>
                  <AnimatePresence>
                    {showTimeDropdown && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        style={{ overflow: 'hidden', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '10px', marginTop: '4px' }}
                      >
                        {TIME_OPTIONS.map(t => (
                          <button key={t}
                            onClick={() => {
                              const times = newMed.times.includes(t)
                                ? newMed.times.filter(x => x !== t)
                                : [...newMed.times, t]
                              setNewMed(prev => ({ ...prev, times: times.length > 0 ? times : ['Morning'] }))
                            }}
                            style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none', color: newMed.times.includes(t) ? ACCENT : T2, fontSize: '14px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'inherit', borderBottom: `1px solid ${BORDER}` }}>
                            {t}
                            {newMed.times.includes(t) && <Check size={14} color={ACCENT}/>}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <motion.button
                  whileTap={{ scale: 0.97, y: 1 }} transition={spring}
                  onClick={addMedication}
                  disabled={saving}
                  style={{ background: ACCENT, color: '#FFFFFF', fontWeight: 800, fontSize: '15px', padding: '15px', borderRadius: '11px', border: 'none', cursor: 'pointer', marginTop: '4px', letterSpacing: '-0.2px' }}
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

        {/* Adherence analytics card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, ...spring }}
          style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '16px', marginBottom: '14px', overflow: 'hidden', boxShadow: SHADOW }}
        >
          <div style={{ padding: '13px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ color: T1, fontSize: '15px', fontWeight: 700, letterSpacing: '-0.3px' }}>Adherence</p>
            <span style={{ color: T3, fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>28 days</span>
          </div>

          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Week dots */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <p style={{ color: T3, fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>This week</p>
                <span style={{ color: weekPct >= 80 ? GREEN : T3, fontSize: '12px', fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}>{weekPct}%</span>
              </div>
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'space-between' }}>
                {weekDots.map((dot, i) => {
                  const isActive = activeDaysSet.has(dot.dateStr)
                  const isToday  = dot.dateStr === todayStr
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: 1 }}>
                      <motion.div
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1 + i * 0.04, type: 'spring', stiffness: 400, damping: 22 }}
                        style={{
                          width: '30px', height: '30px', borderRadius: '50%',
                          background: dot.isFuture ? 'transparent' : isActive ? GREEN_DIM : BG,
                          border: isToday
                            ? `2px solid ${isActive ? GREEN : BORDER}`
                            : dot.isFuture
                              ? `1.5px dashed ${BORDER}`
                              : isActive
                                ? `1.5px solid rgba(86,128,78,0.3)`
                                : `1.5px solid ${BORDER}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        {isActive && <Check size={12} color={GREEN} strokeWidth={3}/>}
                      </motion.div>
                      <span style={{
                        color: isToday ? ACCENT : T3,
                        fontSize: '10px',
                        fontFamily: 'var(--font-mono, monospace)',
                        fontWeight: isToday ? 700 : 400,
                        letterSpacing: '0.2px',
                        textTransform: 'uppercase',
                      }}>{dot.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Streak + 28-day */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: '0 0 auto', background: BG, borderRadius: '10px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '90px', border: `1px solid ${BORDER}` }}>
                <p style={{ color: T1, fontSize: '24px', fontWeight: 800, fontFamily: 'var(--font-mono, monospace)', letterSpacing: '-1px', lineHeight: 1 }}>
                  {streak >= 2 ? `${streak}d` : '. '}
                </p>
                <p style={{ color: T3, fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '0.6px', marginTop: '2px' }}>
                  {streak >= 2 ? 'streak' : 'no streak'}
                </p>
                {bestStreak > 0 && (
                  <p style={{ color: T3, fontSize: '10px', marginTop: '4px' }}>
                    Best: <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 600, color: T2 }}>{bestStreak}d</span>
                  </p>
                )}
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <p style={{ color: T3, fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>28-day rate</p>
                  <span style={{ color: adherenceColor, fontSize: '14px', fontFamily: 'var(--font-mono, monospace)', fontWeight: 700 }}>{adherenceRate}%</span>
                </div>
                <div style={{ height: '6px', background: BG, borderRadius: '99px', overflow: 'hidden', border: `1px solid ${BORDER}` }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${adherenceRate}%` }}
                    transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1], delay: 0.15 }}
                    style={{ height: '100%', background: adherenceColor, borderRadius: '99px' }}
                  />
                </div>
                <p style={{ color: T3, fontSize: '10px' }}>{activeDaysSet.size} of 28 days</p>
              </div>
            </div>
          </div>
        </motion.div>

        {medications.length === 0 && (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: ACCENT_DIM, border: `1px solid rgba(86,128,78,0.14)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Pill size={22} color={ACCENT}/>
            </div>
            <p style={{ color: T2, fontSize: '14px', marginBottom: '16px' }}>No medications added yet</p>
            <button onClick={() => setShowAdd(true)} style={{ color: ACCENT, fontSize: '14px', background: ACCENT_DIM, border: `1px solid rgba(86,128,78,0.14)`, borderRadius: '10px', padding: '10px 20px', cursor: 'pointer', fontWeight: 700 }}>
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
            style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '16px', marginBottom: '12px', overflow: 'hidden', boxShadow: SHADOW }}
          >
            {/* Med header */}
            <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: ACCENT_DIM, border: `1px solid rgba(86,128,78,0.14)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Pill size={16} color={ACCENT}/>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: T1, fontWeight: 700, fontSize: '15px', letterSpacing: '-0.3px' }}>{med.name}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                  <span style={{ background: BG, border: `1px solid ${BORDER}`, color: T2, fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', fontFamily: 'var(--font-mono, monospace)' }}>{med.dose}</span>
                  <span style={{ color: T3, fontSize: '11px' }}>{med.frequency}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '7px' }}>
                <button onClick={() => setAddingTime(addingTime === medIndex ? null : medIndex)}
                  style={{ width: '30px', height: '30px', borderRadius: '8px', background: BG, border: `1px solid ${BORDER}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={13} color={T2}/>
                </button>
                <button onClick={() => removeMedication(medIndex)}
                  style={{ width: '30px', height: '30px', borderRadius: '8px', background: RED_DIM, border: `1px solid rgba(163,52,23,0.14)`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={13} color={RED}/>
                </button>
              </div>
            </div>

            {/* Add time panel */}
            <AnimatePresence>
              {addingTime === medIndex && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  style={{ overflow: 'hidden', borderTop: `1px solid ${BORDER}`, padding: '12px 16px', background: BG }}
                >
                  <p style={{ color: T3, fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Add time</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {TIME_OPTIONS.map(t => (
                      <button key={t} onClick={() => addTime(medIndex, t)}
                        style={{ padding: '6px 12px', background: med.times?.includes(t) ? ACCENT_DIM : SURFACE, border: `1px solid ${med.times?.includes(t) ? 'rgba(86,128,78,0.2)' : BORDER}`, borderRadius: '8px', color: med.times?.includes(t) ? ACCENT : T2, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Dose times */}
            <div style={{ borderTop: `1px solid ${BORDER}` }}>
              {med.times?.map((time: string, timeIndex: number) => {
                const key = `${medIndex}-${timeIndex}`
                const isTaken = taken[key]
                return (
                  <div key={timeIndex} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 16px', borderBottom: `1px solid ${BORDER}`, opacity: isTaken ? 0.5 : 1, transition: 'opacity 0.2s ease' }}>
                    <motion.button
                      whileTap={{ scale: 0.85 }} transition={spring}
                      onClick={() => toggleTaken(medIndex, timeIndex)}
                      style={{ width: '30px', height: '30px', borderRadius: '50%', border: `2px solid ${isTaken ? GREEN : BORDER}`, background: isTaken ? GREEN_DIM : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'border-color 0.18s ease, background 0.18s ease' }}
                    >
                      {isTaken && <Check size={14} color={GREEN}/>}
                    </motion.button>
                    <p style={{ color: T2, fontSize: '13px', flex: 1 }}>{time}</p>
                    {!isTaken ? (
                      <motion.button
                        whileTap={{ scale: 0.95 }} transition={spring}
                        onClick={() => toggleTaken(medIndex, timeIndex)}
                        style={{ background: GREEN_DIM, border: `1px solid rgba(86,128,78,0.2)`, color: GREEN, fontSize: '12px', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
                      >
                        Take
                      </motion.button>
                    ) : (
                      <span style={{ color: GREEN, fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Done</span>
                    )}
                    <button onClick={() => removeTime(medIndex, timeIndex)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: T3, padding: '4px' }}>
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
