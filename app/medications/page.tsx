'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Check, X, ChevronDown } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import BottomNav from '@/components/BottomNav'

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

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#09090C', padding: '80px 16px 100px' }}>
      {[1,2,3].map(i => <Skeleton key={i} className="h-28 w-full rounded-3xl bg-white/5 mb-3"/>)}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#09090C', paddingBottom: '100px' }}>

      {/* Header */}
      <div style={{ padding: '56px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => router.push('/dashboard')}
              style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowLeft size={16} color="rgba(255,255,255,0.6)"/>
            </motion.button>
            <div>
              <h1 style={{ color: 'white', fontWeight: 700, fontSize: '20px' }}>Medications</h1>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>{new Date().toLocaleDateString('en-US', { weekday: 'long' })}</p>
            </div>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowAdd(true)}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(252,181,70,0.15)', border: '1px solid rgba(252,181,70,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Plus size={16} color="#fcb546"/>
          </motion.button>
        </div>

        {/* Progress */}
        <div style={{ background: '#111116', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <p style={{ color: 'white', fontSize: '13px', fontWeight: 600 }}>{takenCount} of {totalDoses} doses taken</p>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', fontFamily: 'monospace' }}>{Math.round(progress)}%</p>
          </div>
          <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '99px', overflow: 'hidden' }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }}
              style={{ height: '100%', background: '#80EF80', borderRadius: '99px' }}/>
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
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}
            onClick={e => { if (e.target === e.currentTarget) setShowAdd(false) }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', bounce: 0.1 }}
              style={{ background: '#111116', borderRadius: '24px 24px 0 0', padding: '24px 20px 40px', width: '100%' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <p style={{ color: 'white', fontWeight: 700, fontSize: '18px' }}>Add medication</p>
                <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}>
                  <X size={20}/>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  placeholder="Medication name"
                  value={newMed.name}
                  onChange={e => setNewMed(prev => ({ ...prev, name: e.target.value }))}
                  style={{ background: '#18181F', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '14px 16px', color: 'white', fontSize: '14px', outline: 'none', width: '100%' }}
                />
                <input
                  placeholder="Dose (e.g. 50mg)"
                  value={newMed.dose}
                  onChange={e => setNewMed(prev => ({ ...prev, dose: e.target.value }))}
                  style={{ background: '#18181F', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '14px 16px', color: 'white', fontSize: '14px', outline: 'none', width: '100%' }}
                />

                {/* Frequency dropdown */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowFreqDropdown(!showFreqDropdown)}
                    style={{ width: '100%', background: '#18181F', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '14px 16px', color: 'white', fontSize: '14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    {newMed.frequency}
                    <ChevronDown size={16} color="rgba(255,255,255,0.4)"/>
                  </button>
                  {showFreqDropdown && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1C1C24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', marginTop: '4px', zIndex: 100, maxHeight: '200px', overflowY: 'auto' }}>
                      {FREQUENCY_OPTIONS.map(f => (
                        <button key={f} onClick={() => { setNewMed(prev => ({ ...prev, frequency: f })); setShowFreqDropdown(false) }}
                          style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none', color: newMed.frequency === f ? '#fcb546' : 'rgba(255,255,255,0.7)', fontSize: '14px', cursor: 'pointer', textAlign: 'left' }}>
                          {f}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Time dropdown */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowTimeDropdown(!showTimeDropdown)}
                    style={{ width: '100%', background: '#18181F', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '14px 16px', color: 'white', fontSize: '14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    {newMed.times.join(', ')}
                    <ChevronDown size={16} color="rgba(255,255,255,0.4)"/>
                  </button>
                  {showTimeDropdown && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1C1C24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', marginTop: '4px', zIndex: 100, maxHeight: '200px', overflowY: 'auto' }}>
                      {TIME_OPTIONS.map(t => (
                        <button key={t}
                          onClick={() => {
                            const times = newMed.times.includes(t)
                              ? newMed.times.filter(x => x !== t)
                              : [...newMed.times, t]
                            setNewMed(prev => ({ ...prev, times: times.length > 0 ? times : ['Morning'] }))
                          }}
                          style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none', color: newMed.times.includes(t) ? '#fcb546' : 'rgba(255,255,255,0.7)', fontSize: '14px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          {t}
                          {newMed.times.includes(t) && <Check size={14} color="#fcb546"/>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <motion.button whileTap={{ scale: 0.97 }} onClick={addMedication} disabled={saving}
                  style={{ background: '#fcb546', color: '#09090C', fontWeight: 700, fontSize: '15px', padding: '16px', borderRadius: '14px', border: 'none', cursor: 'pointer', marginTop: '4px' }}>
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
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '14px', marginBottom: '12px' }}>No medications added yet</p>
            <button onClick={() => setShowAdd(true)} style={{ color: '#fcb546', fontSize: '14px', background: 'none', border: '1px solid rgba(252,181,70,0.3)', borderRadius: '12px', padding: '10px 20px', cursor: 'pointer' }}>
              Add your first medication
            </button>
          </div>
        )}

        {medications.map((med: any, medIndex: number) => (
          <motion.div key={medIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: medIndex * 0.05 }}
            style={{ background: '#111116', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', marginBottom: '12px', overflow: 'hidden' }}>

            {/* Med header */}
            <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(252,181,70,0.1)', border: '1px solid rgba(252,181,70,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '18px' }}>💊</span>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>{med.name}</p>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>{med.dose} · {med.frequency}</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setAddingTime(addingTime === medIndex ? null : medIndex)}
                  style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={13} color="rgba(255,255,255,0.5)"/>
                </button>
                <button onClick={() => removeMedication(medIndex)}
                  style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(232,50,42,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={13} color="#E8322A"/>
                </button>
              </div>
            </div>

            {/* Add time dropdown */}
            <AnimatePresence>
              {addingTime === medIndex && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  style={{ overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 16px', background: '#0D0D14' }}>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Add time</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {TIME_OPTIONS.map(t => (
                      <button key={t} onClick={() => addTime(medIndex, t)}
                        style={{ padding: '6px 12px', background: med.times?.includes(t) ? 'rgba(252,181,70,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${med.times?.includes(t) ? 'rgba(252,181,70,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '20px', color: med.times?.includes(t) ? '#fcb546' : 'rgba(255,255,255,0.5)', fontSize: '12px', cursor: 'pointer' }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Dose times */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {med.times?.map((time: string, timeIndex: number) => {
                const key = `${medIndex}-${timeIndex}`
                const isTaken = taken[key]
                return (
                  <div key={timeIndex} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', opacity: isTaken ? 0.5 : 1 }}>
                    <motion.button whileTap={{ scale: 0.85 }} onClick={() => toggleTaken(medIndex, timeIndex)}
                      style={{ width: '32px', height: '32px', borderRadius: '50%', border: `2px solid ${isTaken ? '#80EF80' : 'rgba(255,255,255,0.2)'}`, background: isTaken ? '#80EF80' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                      {isTaken && <Check size={14} color="black"/>}
                    </motion.button>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', flex: 1 }}>{time}</p>
                    {!isTaken ? (
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => toggleTaken(medIndex, timeIndex)}
                        style={{ background: 'rgba(252,181,70,0.1)', border: '1px solid rgba(252,181,70,0.25)', color: '#fcb546', fontSize: '12px', padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', fontWeight: 600 }}>
                        Take
                      </motion.button>
                    ) : (
                      <span style={{ color: '#80EF80', fontSize: '11px', fontFamily: 'monospace' }}>Done</span>
                    )}
                    <button onClick={() => removeTime(medIndex, timeIndex)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', padding: '4px' }}>
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
