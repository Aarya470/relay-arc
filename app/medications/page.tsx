'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Check, X, ChevronDown, Pill } from '@/lib/plain-icons'
import { Skeleton } from '@/components/ui/skeleton'
import Accordion from '@/components/Accordion'
import { AppHeader, Hero } from '@/components/AppKit'
import BottomNav from '@/components/BottomNav'

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG = '#B3DDAC'
const SURFACE = '#FFFFFF'
const T1 = '#141413'
const T2 = '#48463F'
const T3 = '#48463F'
const ACCENT = '#42623C'
const ACCENT_DIM = 'rgba(86,128,78,0.08)'
const RED = '#7A3D00'
const RED_DIM = 'rgba(240,120,0,0.07)'
const GREEN = '#42623C'
const GREEN_DIM = 'rgba(86,128,78,0.08)'
const AMBER = '#7C5200'
const BORDER = 'rgba(20,20,19,0.1)'
const SHADOW = 'none'

const spring = { type: 'spring', stiffness: 380, damping: 24 } as const

const TIME_OPTIONS = [
  '6:00 AM',
  '7:00 AM',
  '8:00 AM',
  '9:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '1:00 PM',
  '2:00 PM',
  '3:00 PM',
  '4:00 PM',
  '5:00 PM',
  '6:00 PM',
  '7:00 PM',
  '8:00 PM',
  '9:00 PM',
  '10:00 PM',
  '11:00 PM',
  'Morning',
  'Afternoon',
  'Evening',
  'Bedtime',
  'With breakfast',
  'With lunch',
  'With dinner',
  'Before bed',
  'As needed',
]

const FREQUENCY_OPTIONS = [
  'Once daily',
  'Twice daily',
  'Three times daily',
  'Four times daily',
  'Every morning',
  'Every night',
  'Every 8 hours',
  'Every 12 hours',
  'Weekly',
  'As needed',
  'With meals',
]


const COMMON_MEDS = [
  'Fludrocortisone', 'Midodrine', 'Propranolol', 'Ivabradine', 'Metoprolol', 'Pyridostigmine',
  'Salt tablets', 'Electrolytes', 'Droxidopa', 'Clonidine', 'Ondansetron', 'Magnesium',
  'Vitamin D', 'Iron', 'Sertraline', 'Albuterol', 'Insulin', 'Levothyroxine',
]
const SLOTS = [
  { id: 'Morning', hint: 'with breakfast' },
  { id: 'Afternoon', hint: 'around lunch' },
  { id: 'Evening', hint: 'with dinner' },
  { id: 'Bedtime', hint: 'before sleep' },
  { id: 'As needed', hint: 'only when you need it' },
]
const CLOCK_TIMES = TIME_OPTIONS.filter((t) => /\d/.test(t))
function freqFor(times: string[]): string {
  if (times.includes('As needed') && times.length === 1) return 'As needed'
  const n = times.filter((t) => t !== 'As needed').length
  return ['As needed', 'Once daily', 'Twice daily', 'Three times daily', 'Four times daily'][n] || `${n} times daily`
}

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
  const [newMed, setNewMed] = useState({
    name: '',
    dose: '',
    frequency: 'Once daily',
    times: ['Morning'],
  })
  const [allLogs, setAllLogs] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const todayMidnight = new Date()
      todayMidnight.setHours(0, 0, 0, 0)

      const twentyEightDaysAgo = new Date()
      twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28)

      const [{ data: profile }, { data: logs }, { data: fetchedAllLogs }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase
          .from('medication_logs')
          .select('*')
          .eq('user_id', user.id)
          .gte('taken_at', todayMidnight.toISOString()),
        supabase
          .from('medication_logs')
          .select('*')
          .eq('user_id', user.id)
          .gte('taken_at', twentyEightDaysAgo.toISOString())
          .order('taken_at', { ascending: true }),
      ])

      const meds = (profile?.medications || []).map((m: any) => ({
        ...m,
        times: m.times || ['Morning'],
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

  // Every write on this page used to ignore its result.
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
        user_id: userId,
        medication_name: med.name,
        dose: med.dose,
        taken_at: nowIso,
      })
      if (error) {
        // Put the tick back. Leaving it on would mean the dose looks recorded
        // on this screen and is absent from the adherence figure underneath it.
        setTaken((t) => ({ ...t, [key]: false }))
        toast.error(`Could not record ${med.name}. Tap again in a moment.`)
        return
      }
      setAllLogs((prev) => [
        ...prev,
        { medication_name: med.name, dose: med.dose, taken_at: nowIso, user_id: userId },
      ])
      toast.success(`${med.name} marked as taken`)
    }
  }

  const toggleSlot = (t: string) =>
    setNewMed((prev) => {
      let times = prev.times.includes(t) ? prev.times.filter((x) => x !== t) : [...prev.times, t]
      if (t === 'As needed' && !prev.times.includes(t)) times = ['As needed']
      else if (t !== 'As needed') times = times.filter((x) => x !== 'As needed')
      if (times.length === 0) times = ['Morning']
      return { ...prev, times, frequency: freqFor(times) }
    })

  const addMedication = async () => {
    if (!newMed.name.trim()) {
      toast.error('Enter medication name')
      return
    }
    setSaving(true)
    const updated = [...medications, { ...newMed, name: newMed.name.trim(), frequency: freqFor(newMed.times) }]
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
      toast.error(
        `Could not remove ${med.name}. It is still on your list and on your emergency card.`,
      )
    }
  }

  // These two also mutated state in place.
  const addTime = async (medIndex: number, time: string) => {
    setAddingTime(null)
    if (medications[medIndex].times.includes(time)) return
    const updated = medications.map((m, i) =>
      i === medIndex ? { ...m, times: [...m.times, time] } : m,
    )
    setMedications(updated)
    if (!(await saveMeds(updated))) {
      setMedications(medications)
      toast.error('Could not add that time. Try again.')
    }
  }

  const removeTime = async (medIndex: number, timeIndex: number) => {
    const updated = medications.map((m, i) =>
      i === medIndex
        ? { ...m, times: m.times.filter((_: string, j: number) => j !== timeIndex) }
        : m,
    )
    setMedications(updated)
    if (!(await saveMeds(updated))) {
      setMedications(medications)
      toast.error('Could not remove that time. Try again.')
    }
  }

  const totalDoses = medications.reduce((acc, m) => acc + (m.times?.length || 1), 0)
  const takenCount = Object.values(taken).filter(Boolean).length
  const progress = totalDoses > 0 ? (takenCount / totalDoses) * 100 : 0

  // ── Analytics ─────────────────────────────────────────────────────────────
  const activeDaysSet = new Set(allLogs.map((log) => toDateStr(new Date(log.taken_at))))
  const adherenceRate = Math.round((activeDaysSet.size / 28) * 100)

  const today = new Date()
  const dayOfWeek = today.getDay()
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
  const weekTakenDays = weekDots.filter(
    (dot) => !dot.isFuture && activeDaysSet.has(dot.dateStr),
  ).length
  const weekPossibleDays = weekDots.filter((dot) => !dot.isFuture).length
  const weekPct = weekPossibleDays > 0 ? Math.round((weekTakenDays / weekPossibleDays) * 100) : 0

  const todayStr = toDateStr(today)
  const yesterdayDate = new Date(today)
  yesterdayDate.setDate(today.getDate() - 1)
  const yesterdayStr = toDateStr(yesterdayDate)
  let streak = 0
  const startStr = activeDaysSet.has(todayStr)
    ? todayStr
    : activeDaysSet.has(yesterdayStr)
      ? yesterdayStr
      : null
  if (startStr) {
    const cursor = new Date(startStr)
    while (activeDaysSet.has(toDateStr(cursor))) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    }
  }

  let bestStreak = 0,
    tempStreak = 0
  const sortedDays = Array.from(activeDaysSet).sort()
  for (let i = 0; i < sortedDays.length; i++) {
    if (i === 0) {
      tempStreak = 1
    } else {
      const prev = new Date(sortedDays[i - 1])
      const curr = new Date(sortedDays[i])
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000)
      tempStreak = diffDays === 1 ? tempStreak + 1 : 1
    }
    if (tempStreak > bestStreak) bestStreak = tempStreak
  }

  const adherenceColor = adherenceRate >= 80 ? GREEN : adherenceRate >= 50 ? AMBER : RED

  const sheetInputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.75)',
    border: '1.5px solid rgba(20,20,19,0.14)',
    borderRadius: 10,
    padding: '14px 16px',
    color: T1,
    fontSize: '16px',
    outline: 'none',
    width: '100%',
    fontFamily: 'inherit',
  }

  if (loading)
    return (
      <div style={{ minHeight: '100dvh', background: 'transparent', padding: '80px 16px 100px' }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              height: '112px',
              borderRadius: 8,
              background: 'rgba(20,20,19,0.1)',
              marginBottom: '12px',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
        ))}
      </div>
    )

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'transparent',
        paddingBottom: '112px',
        maxWidth: '720px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      <div style={{ padding: '0 16px' }}>
        <AppHeader
          title="Medications"
          right={
            <motion.button
              whileTap={{ scale: 0.92 }}
              transition={spring}
              onClick={() => setShowAdd(true)}
              aria-label="Add medication"
              className="ds-btn ds-btn-sos"
              style={{ height: '42px', padding: '0 14px', borderRadius: 8, border: 0, display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 800, cursor: 'pointer' }}
            >
              <Plus size={16} color="#141413" /> Add
            </motion.button>
          }
        />
        <Hero>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '12px' }}>
            <div>
              <span className="ak-kicker">{new Date().toLocaleDateString('en-US', { weekday: 'long' })}</span>
              <div className="ak-metric" style={{ marginTop: '6px' }}>
                <span className="ak-metric-v">{takenCount}</span>
                <span className="ak-metric-u">of {totalDoses} doses</span>
              </div>
            </div>
            <span className="ak-chip ak-chip-dark">{adherenceRate}% this month</span>
          </div>
          <div style={{ display: 'flex', gap: '4px', marginTop: '16px' }} aria-hidden>
            {Array.from({ length: Math.max(totalDoses, 1) }).map((_, k) => (
              <span
                key={k}
                style={{
                  flex: 1, height: '10px', borderRadius: 3,
                  background: k < takenCount ? '#F07800' : 'rgba(20,20,19,0.1)',
                  transition: 'background-color 300ms var(--ease-out)',
                }}
              />
            ))}
          </div>
          <p style={{ fontSize: '13.5px', opacity: 0.85, marginTop: '10px' }}>
            {totalDoses === 0
              ? 'Add a medication to start tracking'
              : progress >= 100
                ? 'Everything taken today. Nice work.'
                : `${totalDoses - takenCount} left today`}
          </p>
        </Hero>
      </div>

      {/* Add medication sheet: name, dose, when. Three steps on one screen. */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,19,0.35)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowAdd(false)
            }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              role="dialog"
              aria-modal="true"
              aria-label="Add medication"
              style={{
                width: '100%', maxWidth: '640px', maxHeight: '90dvh', overflowY: 'auto', padding: '14px 18px 34px',
                borderRadius: '16px 16px 0 0', background: 'rgba(255,253,246,0.86)',
                WebkitBackdropFilter: 'blur(28px) saturate(1.6)', backdropFilter: 'blur(28px) saturate(1.6)',
                boxShadow: '0 -14px 40px rgba(20,20,19,0.18)',
              }}
            >
              <div style={{ width: '40px', height: '5px', borderRadius: 3, background: 'rgba(20,20,19,0.18)', margin: '0 auto 14px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <p style={{ color: T1, fontWeight: 800, fontSize: '22px', letterSpacing: '-0.03em' }}>Add a medication</p>
                <button onClick={() => setShowAdd(false)} aria-label="Close" style={{ width: '38px', height: '38px', borderRadius: 8, background: 'rgba(20,20,19,0.06)', border: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={18} color={T1} />
                </button>
              </div>

              <p className="med-step"><span>1</span> What is it called?</p>
              <input
                autoFocus
                placeholder="Start typing, or tap one below"
                value={newMed.name}
                onChange={(e) => setNewMed((prev) => ({ ...prev, name: e.target.value }))}
                style={sheetInputStyle}
              />
              <div className="med-chips">
                {COMMON_MEDS.filter((m) => !newMed.name || m.toLowerCase().includes(newMed.name.toLowerCase()))
                  .slice(0, 8)
                  .map((m) => (
                    <button key={m} className="ak-chip" data-on={newMed.name === m} onClick={() => setNewMed((prev) => ({ ...prev, name: m }))}>
                      {m}
                    </button>
                  ))}
              </div>

              <p className="med-step"><span>2</span> How much? <em>optional</em></p>
              <input
                placeholder="For example 10 mg"
                value={newMed.dose}
                onChange={(e) => setNewMed((prev) => ({ ...prev, dose: e.target.value }))}
                style={sheetInputStyle}
              />
              <div className="med-chips">
                {['5 mg', '10 mg', '25 mg', '50 mg', '100 mg', '1 tablet', '2 tablets'].map((d) => (
                  <button key={d} className="ak-chip" data-on={newMed.dose === d} onClick={() => setNewMed((prev) => ({ ...prev, dose: d }))}>
                    {d}
                  </button>
                ))}
              </div>

              <p className="med-step"><span>3</span> When do you take it?</p>
              <div className="med-slots">
                {SLOTS.map((t) => {
                  const on = newMed.times.includes(t.id)
                  return (
                    <button key={t.id} data-on={on} onClick={() => toggleSlot(t.id)}>
                      <strong>{t.id}</strong>
                      <span>{t.hint}</span>
                    </button>
                  )
                })}
              </div>
              <div className="glass" style={{ padding: '2px', marginTop: '10px' }}>
                <Accordion title="Pick exact times instead" hint="For example 8:00 AM">
                  <div className="med-chips" style={{ padding: '0 10px 6px', marginTop: 0 }}>
                    {CLOCK_TIMES.map((t) => (
                      <button key={t} className="ak-chip" data-on={newMed.times.includes(t)} onClick={() => toggleSlot(t)}>
                        {t}
                      </button>
                    ))}
                  </div>
                </Accordion>
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={addMedication}
                disabled={saving || !newMed.name.trim()}
                className="ds-btn ds-btn-sos"
                style={{ width: '100%', minHeight: '56px', borderRadius: 10, border: 0, fontWeight: 800, fontSize: '17px', marginTop: '18px', cursor: 'pointer', opacity: newMed.name.trim() ? 1 : 0.5 }}
              >
                {saving ? 'Saving…' : newMed.name.trim() ? `Add ${newMed.name.trim()}` : 'Add medication'}
              </motion.button>
              <p style={{ fontSize: '12.5px', color: T2, textAlign: 'center', marginTop: '8px' }}>
                {freqFor(newMed.times)}. You can change this later.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ padding: '0 16px 16px' }}>
        {medications.length === 0 && (
          <div className="glass" style={{ textAlign: 'center', padding: '34px 20px' }}>
            <p style={{ color: T1, fontSize: '19px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '6px' }}>Nothing here yet</p>
            <p style={{ color: T2, fontSize: '14px', marginBottom: '18px' }}>Add one and it shows up on your emergency card too.</p>
            <button className="ds-btn ds-btn-sos" onClick={() => setShowAdd(true)} style={{ minHeight: '50px', padding: '0 22px', borderRadius: 10, border: 0, fontWeight: 800, cursor: 'pointer' }}>
              Add your first medication
            </button>
          </div>
        )}

        {medications.map((med: any, medIndex: number) => (
          <motion.div
            key={medIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: medIndex * 0.04, ...spring }}
            className="glass"
            style={{ marginBottom: '12px', overflow: 'hidden', padding: '4px' }}
          >
            <div style={{ padding: '12px 12px 8px', display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
              <p style={{ color: T1, fontWeight: 800, fontSize: '19px', letterSpacing: '-0.025em' }}>{med.name}</p>
              {med.dose ? <span className="ak-chip" style={{ height: '26px', fontSize: '12.5px' }}>{med.dose}</span> : null}
              <span style={{ color: T2, fontSize: '13px' }}>{med.frequency}</span>
            </div>

            {/* Each dose is one big button. Tap it when you take it. */}
            <div style={{ display: 'grid', gap: '6px', padding: '0 4px 4px' }}>
              {med.times?.map((time: string, timeIndex: number) => {
                const key = `${medIndex}-${timeIndex}`
                const isTaken = !!taken[key]
                return (
                  <motion.button
                    key={timeIndex}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => toggleTaken(medIndex, timeIndex)}
                    className="med-dose"
                    data-taken={isTaken}
                    aria-pressed={isTaken}
                  >
                    <span className="med-dose-box" aria-hidden>
                      {isTaken ? <Check size={18} color="#141413" strokeWidth={3} /> : null}
                    </span>
                    <span style={{ flex: 1, textAlign: 'left' }}>
                      <span style={{ display: 'block', fontWeight: 750, fontSize: '16px' }}>{time}</span>
                      <span style={{ display: 'block', fontSize: '12.5px', opacity: 0.75 }}>{isTaken ? 'Taken today' : 'Tap when you take it'}</span>
                    </span>
                  </motion.button>
                )
              })}
            </div>

            <Accordion title="Edit" hint="Change times or remove">
              <div style={{ padding: '0 10px 6px' }}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: T2, margin: '0 0 8px' }}>Times</p>
                <div className="med-chips" style={{ marginTop: 0 }}>
                  {med.times?.map((t: string, ti: number) => (
                    <button key={t} className="ak-chip" data-on onClick={() => removeTime(medIndex, ti)} aria-label={`Remove ${t}`}>
                      {t} <X size={12} />
                    </button>
                  ))}
                  {[...SLOTS.map((x) => x.id), ...CLOCK_TIMES]
                    .filter((t) => !med.times?.includes(t))
                    .slice(0, 6)
                    .map((t) => (
                      <button key={t} className="ak-chip" onClick={() => addTime(medIndex, t)}>
                        + {t}
                      </button>
                    ))}
                </div>
                <button
                  onClick={() => removeMedication(medIndex)}
                  style={{ marginTop: '14px', background: 'none', border: 0, color: RED, fontWeight: 700, fontSize: '14px', cursor: 'pointer', padding: '6px 0', fontFamily: 'inherit' }}
                >
                  Remove {med.name}
                </button>
              </div>
            </Accordion>
          </motion.div>
        ))}

        {medications.length > 0 && (
          <button
            onClick={() => setShowAdd(true)}
            className="glass"
            style={{ width: '100%', minHeight: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 750, fontSize: '15px', color: T1, cursor: 'pointer', marginBottom: '14px', fontFamily: 'inherit' }}
          >
            <Plus size={16} color={T1} /> Add another
          </button>
        )}

        {/* Adherence analytics card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, ...spring }}
          className="glass ak-accent-green" style={{
            borderRadius: 10,
            marginBottom: '14px',
            overflow: 'hidden',
            boxShadow: SHADOW,
          }}
        >
          <Accordion title="Adherence" hint={`${adherenceRate}% of the last 28 days`}>
          <div
            style={{ padding: '0 10px 6px', display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            {/* Week dots */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                }}
              >
                <p style={{ color: T3, fontSize: '13px', letterSpacing: '0' }}>This week</p>
                <span
                  style={{
                    color: weekPct >= 80 ? GREEN : T3,
                    fontSize: '12px',
                    fontFamily: 'inherit',
                    fontWeight: 700,
                  }}
                >
                  {weekPct}%
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'space-between' }}>
                {weekDots.map((dot, i) => {
                  const isActive = activeDaysSet.has(dot.dateStr)
                  const isToday = dot.dateStr === todayStr
                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        flex: 1,
                      }}
                    >
                      <motion.div
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                          delay: 0.1 + i * 0.04,
                          type: 'spring',
                          stiffness: 400,
                          damping: 22,
                        }}
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '50%',
                          background: dot.isFuture ? 'transparent' : isActive ? GREEN_DIM : BG,
                          border: isToday
                            ? `2px solid ${isActive ? GREEN : BORDER}`
                            : dot.isFuture
                              ? `1.5px dashed ${BORDER}`
                              : isActive
                                ? `1.5px solid rgba(86,128,78,0.3)`
                                : `1.5px solid ${BORDER}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {isActive && <Check size={12} color={GREEN} strokeWidth={3} />}
                      </motion.div>
                      <span
                        style={{
                          color: isToday ? ACCENT : T3,
                          fontSize: '13px',
                          fontWeight: isToday ? 700 : 400,
                          letterSpacing: '0',
                        }}
                      >
                        {dot.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Streak + 28-day */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <div
                style={{
                  flex: '0 0 auto',
                  background: BG,
                  borderRadius: 8,
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  minWidth: '90px',
                  border: `1px solid ${BORDER}`,
                }}
              >
                <p
                  style={{
                    color: T1,
                    fontSize: '24px',
                    fontWeight: 800,
                    fontFamily: 'inherit',
                    letterSpacing: '-0.4px',
                    lineHeight: 1,
                  }}
                >
                  {streak >= 2 ? `${streak}d` : '. '}
                </p>
                <p style={{ color: T3, fontSize: '13px', letterSpacing: '0', marginTop: '2px' }}>
                  {streak >= 2 ? 'streak' : 'no streak'}
                </p>
                {bestStreak > 0 && (
                  <p style={{ color: T3, fontSize: '10px', marginTop: '4px' }}>
                    Best:{' '}
                    <span style={{ fontFamily: 'inherit', fontWeight: 600, color: T2 }}>
                      {bestStreak}d
                    </span>
                  </p>
                )}
              </div>

              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                  }}
                >
                  <p style={{ color: T3, fontSize: '13px', letterSpacing: '0' }}>28-day rate</p>
                  <span
                    style={{
                      color: adherenceColor,
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      fontWeight: 700,
                    }}
                  >
                    {adherenceRate}%
                  </span>
                </div>
                <div
                  style={{
                    height: '6px',
                    background: BG,
                    borderRadius: '99px',
                    overflow: 'hidden',
                    border: `1px solid ${BORDER}`,
                  }}
                >
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
          </Accordion>
        </motion.div>

      </div>

      <BottomNav />
    </div>
  )
}
