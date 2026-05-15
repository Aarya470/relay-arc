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
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      const meds = (data?.medications || []).map((m: any) => ({
        ...m,
        times: m.times || ['Morning']
      }))
      setMedications(meds)
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
      await supabase.from('medication_logs').insert({
        user_id: userId,
        medication_name: med.name,
        dose: med.dose,
        taken_at: new Date().toISOString()
      })
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
    const updated = medications.filter((_, i) => i !== index)
    await supabase.from('profiles').update({ medications: updated }).eq('id', userId)
    setMedications(updated)
    toast.success('Medication removed')
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

  const sheetInputStyle: React.CSSProperties = {
    background: '#F8F6F2',
    border: '1.5px solid rgba(26,40,32,0.1)',
    borderRadius: '14px',
    padding: '14px 16px',
    color: '#1A2820',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
    fontFamily: 'inherit',
  }

  if (loading) return (
    <div style={{ minHeight: '100dvh', background: '#F2EFE9', padding: '80px 16px 100px' }}>
      {[1,2,3].map(i => <Skeleton key={i} style={{ height: '112px', borderRadius: '20px', background: 'rgba(26,40,32,0.06)', marginBottom: '12px' }}/>)}
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', background: '#F2EFE9', paddingBottom: '100px' }}>

      {/* Header */}
      <div style={{ padding: '56px 20px 16px', borderBottom: '1px solid rgba(26,40,32,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <motion.button
              whileTap={{ scale: 0.9 }}
              transition={spring}
              onClick={() => router.push('/dashboard')}
              style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FFFFFF', border: '1px solid rgba(26,40,32,0.09)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(26,40,32,0.06)' }}
            >
              <ArrowLeft size={16} color="rgba(26,40,32,0.5)"/>
            </motion.button>
            <div>
              <h1 style={{ color: '#1A2820', fontWeight: 800, fontSize: '20px', letterSpacing: '-0.6px' }}>Medications</h1>
              <p style={{ color: 'rgba(26,40,32,0.38)', fontSize: '12px' }}>{new Date().toLocaleDateString('en-US', { weekday: 'long' })}</p>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            transition={spring}
            onClick={() => setShowAdd(true)}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(92,139,116,0.1)', border: '1px solid rgba(92,139,116,0.22)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Plus size={16} color="#5C8B74"/>
          </motion.button>
        </div>

        {/* Progress */}
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(26,40,32,0.07)', borderRadius: '16px', padding: '14px 16px', boxShadow: '0 1px 6px rgba(26,40,32,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <p style={{ color: '#1A2820', fontSize: '13px', fontWeight: 600 }}>{takenCount} of {totalDoses} doses taken</p>
            <p style={{ color: 'rgba(26,40,32,0.38)', fontSize: '12px', fontFamily: 'var(--font-mono, monospace)' }}>{Math.round(progress)}%</p>
          </div>
          <div style={{ height: '4px', background: 'rgba(26,40,32,0.07)', borderRadius: '99px', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
              style={{ height: '100%', background: 'linear-gradient(90deg, #5C8B74, #3D6B58)', borderRadius: '99px' }}
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
            style={{ position: 'fixed', inset: 0, background: 'rgba(26,40,32,0.4)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}
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
                boxShadow: '0 -8px 40px rgba(26,40,32,0.14), inset 0 1px 0 rgba(255,255,255,0.8)',
              }}
            >
              {/* Drag handle */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px', marginTop: '-8px' }}>
                <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(26,40,32,0.1)' }}/>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <p style={{ color: '#1A2820', fontWeight: 800, fontSize: '18px', letterSpacing: '-0.4px' }}>Add medication</p>
                <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(26,40,32,0.35)' }}>
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
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setShowFreqDropdown(!showFreqDropdown)}
                    style={{ ...sheetInputStyle, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {newMed.frequency}
                    <ChevronDown size={16} color="rgba(26,40,32,0.4)"/>
                  </button>
                  {showFreqDropdown && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#FFFFFF', border: '1px solid rgba(26,40,32,0.1)', borderRadius: '14px', marginTop: '4px', zIndex: 100, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 20px rgba(26,40,32,0.1)' }}>
                      {FREQUENCY_OPTIONS.map(f => (
                        <button key={f} onClick={() => { setNewMed(prev => ({ ...prev, frequency: f })); setShowFreqDropdown(false) }}
                          style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none', color: newMed.frequency === f ? '#5C8B74' : 'rgba(26,40,32,0.7)', fontSize: '14px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', fontWeight: newMed.frequency === f ? 700 : 400 }}>
                          {f}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Time dropdown */}
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setShowTimeDropdown(!showTimeDropdown)}
                    style={{ ...sheetInputStyle, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {newMed.times.join(', ')}
                    <ChevronDown size={16} color="rgba(26,40,32,0.4)"/>
                  </button>
                  {showTimeDropdown && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#FFFFFF', border: '1px solid rgba(26,40,32,0.1)', borderRadius: '14px', marginTop: '4px', zIndex: 100, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 20px rgba(26,40,32,0.1)' }}>
                      {TIME_OPTIONS.map(t => (
                        <button key={t}
                          onClick={() => {
                            const times = newMed.times.includes(t)
                              ? newMed.times.filter(x => x !== t)
                              : [...newMed.times, t]
                            setNewMed(prev => ({ ...prev, times: times.length > 0 ? times : ['Morning'] }))
                          }}
                          style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none', color: newMed.times.includes(t) ? '#5C8B74' : 'rgba(26,40,32,0.7)', fontSize: '14px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'inherit' }}>
                          {t}
                          {newMed.times.includes(t) && <Check size={14} color="#5C8B74"/>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <motion.button
                  whileTap={{ scale: 0.97, y: 1 }}
                  transition={spring}
                  onClick={addMedication}
                  disabled={saving}
                  style={{ background: 'linear-gradient(135deg, #5C8B74, #3D6B58)', color: '#FFFFFF', fontWeight: 800, fontSize: '15px', padding: '16px', borderRadius: '14px', border: 'none', cursor: 'pointer', marginTop: '4px', boxShadow: '0 6px 20px rgba(92,139,116,0.22)' }}
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
        {medications.length === 0 && (
          <div style={{ textAlign: 'center', padding: '56px 0' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'rgba(92,139,116,0.1)', border: '1px solid rgba(92,139,116,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Pill size={22} color="rgba(92,139,116,0.55)"/>
            </div>
            <p style={{ color: 'rgba(26,40,32,0.3)', fontSize: '14px', marginBottom: '16px' }}>No medications added yet</p>
            <button onClick={() => setShowAdd(true)} style={{ color: '#5C8B74', fontSize: '14px', background: 'none', border: '1px solid rgba(92,139,116,0.3)', borderRadius: '12px', padding: '10px 20px', cursor: 'pointer', fontWeight: 600 }}>
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
            style={{ background: '#FFFFFF', border: '1px solid rgba(26,40,32,0.07)', borderRadius: '20px', marginBottom: '12px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(26,40,32,0.05)' }}
          >
            {/* Med header */}
            <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(92,139,116,0.1)', border: '1px solid rgba(92,139,116,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Pill size={16} color="#5C8B74"/>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#1A2820', fontWeight: 700, fontSize: '14px', letterSpacing: '-0.2px' }}>{med.name}</p>
                <p style={{ color: 'rgba(26,40,32,0.4)', fontSize: '12px' }}>{med.dose} · {med.frequency}</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setAddingTime(addingTime === medIndex ? null : medIndex)}
                  style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(26,40,32,0.05)', border: '1px solid rgba(26,40,32,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={13} color="rgba(26,40,32,0.45)"/>
                </button>
                <button onClick={() => removeMedication(medIndex)}
                  style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(232,50,42,0.06)', border: '1px solid rgba(232,50,42,0.12)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={13} color="#E8322A"/>
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
                  style={{ overflow: 'hidden', borderTop: '1px solid rgba(26,40,32,0.06)', padding: '12px 16px', background: '#F8F6F2' }}
                >
                  <p style={{ color: 'rgba(26,40,32,0.38)', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Add time</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {TIME_OPTIONS.map(t => (
                      <button key={t} onClick={() => addTime(medIndex, t)}
                        style={{ padding: '6px 12px', background: med.times?.includes(t) ? 'rgba(92,139,116,0.12)' : '#FFFFFF', border: `1px solid ${med.times?.includes(t) ? 'rgba(92,139,116,0.3)' : 'rgba(26,40,32,0.1)'}`, borderRadius: '20px', color: med.times?.includes(t) ? '#5C8B74' : 'rgba(26,40,32,0.5)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Dose times */}
            <div style={{ borderTop: '1px solid rgba(26,40,32,0.06)' }}>
              {med.times?.map((time: string, timeIndex: number) => {
                const key = `${medIndex}-${timeIndex}`
                const isTaken = taken[key]
                return (
                  <div key={timeIndex} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: '1px solid rgba(26,40,32,0.04)', opacity: isTaken ? 0.55 : 1, transition: 'opacity 0.2s ease' }}>
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      transition={spring}
                      onClick={() => toggleTaken(medIndex, timeIndex)}
                      style={{ width: '32px', height: '32px', borderRadius: '50%', border: `2px solid ${isTaken ? '#5C8B74' : 'rgba(26,40,32,0.18)'}`, background: isTaken ? '#5C8B74' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'border-color 0.18s ease, background 0.18s ease' }}
                    >
                      {isTaken && <Check size={14} color="white"/>}
                    </motion.button>
                    <p style={{ color: 'rgba(26,40,32,0.65)', fontSize: '13px', flex: 1 }}>{time}</p>
                    {!isTaken ? (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        transition={spring}
                        onClick={() => toggleTaken(medIndex, timeIndex)}
                        style={{ background: 'rgba(92,139,116,0.1)', border: '1px solid rgba(92,139,116,0.24)', color: '#5C8B74', fontSize: '12px', padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', fontWeight: 700 }}
                      >
                        Take
                      </motion.button>
                    ) : (
                      <span style={{ color: '#5C8B74', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', fontWeight: 600 }}>Done</span>
                    )}
                    <button onClick={() => removeTime(medIndex, timeIndex)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(26,40,32,0.2)', padding: '4px' }}>
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
