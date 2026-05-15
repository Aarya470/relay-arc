'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Phone, Calendar, X, Clock, CalendarCheck, ChevronLeft, ChevronRight } from 'lucide-react'
import BottomNav from '@/components/BottomNav'

const spring = { type: 'spring', stiffness: 360, damping: 26 } as const

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const TIME_SLOTS = [
  { label: '9:00 AM', hour: 9 },
  { label: '10:00 AM', hour: 10 },
  { label: '11:00 AM', hour: 11 },
  { label: '1:00 PM', hour: 13 },
  { label: '2:00 PM', hour: 14 },
  { label: '3:00 PM', hour: 15 },
  { label: '4:00 PM', hour: 16 },
]

function CalendarPicker({
  selectedDay, onSelect,
}: {
  selectedDay: Date | null
  onSelect: (d: Date) => void
}) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const isPast = (day: number) => new Date(viewYear, viewMonth, day) < today
  const isSelected = (day: number) =>
    selectedDay?.getFullYear() === viewYear &&
    selectedDay?.getMonth() === viewMonth &&
    selectedDay?.getDate() === day
  const isToday = (day: number) =>
    today.getFullYear() === viewYear &&
    today.getMonth() === viewMonth &&
    today.getDate() === day

  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div>
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <motion.button
          whileTap={{ scale: 0.88 }}
          transition={spring}
          onClick={prevMonth}
          style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(26,40,32,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ChevronLeft size={15} color="rgba(26,40,32,0.5)"/>
        </motion.button>
        <p style={{ color: '#1A2820', fontWeight: 700, fontSize: '14px', letterSpacing: '-0.3px' }}>
          {MONTHS[viewMonth]} {viewYear}
        </p>
        <motion.button
          whileTap={{ scale: 0.88 }}
          transition={spring}
          onClick={nextMonth}
          style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(26,40,32,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ChevronRight size={15} color="rgba(26,40,32,0.5)"/>
        </motion.button>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '6px' }}>
        {DAYS.map(d => (
          <p key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'rgba(26,40,32,0.32)', fontFamily: 'var(--font-mono, monospace)', letterSpacing: '0.3px' }}>{d}</p>
        ))}
      </div>

      {/* Day grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i}/>
          const past = isPast(day)
          const selected = isSelected(day)
          const todayFlag = isToday(day)
          return (
            <motion.button
              key={i}
              whileTap={past ? {} : { scale: 0.88 }}
              transition={spring}
              onClick={() => !past && onSelect(new Date(viewYear, viewMonth, day))}
              disabled={past}
              style={{
                height: '36px',
                borderRadius: '9px',
                border: todayFlag && !selected ? '1.5px solid rgba(92,139,116,0.4)' : 'none',
                background: selected ? '#5C8B74' : 'transparent',
                color: past
                  ? 'rgba(26,40,32,0.2)'
                  : selected
                    ? '#FFFFFF'
                    : todayFlag
                      ? '#5C8B74'
                      : 'rgba(26,40,32,0.72)',
                fontSize: '13px',
                fontWeight: selected ? 800 : todayFlag ? 700 : 500,
                cursor: past ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {day}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

export default function Appointments() {
  const [appointments, setAppointments] = useState<any[]>([])
  const [userId, setUserId] = useState('')
  const [showRequest, setShowRequest] = useState(false)
  const [type, setType] = useState<'immediate' | 'scheduled'>('scheduled')
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [concern, setConcern] = useState('')
  const [loading, setLoading] = useState(true)
  const [focused, setFocused] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data } = await supabase.from('appointments').select('*').eq('patient_id', user.id).order('created_at', { ascending: false })
      setAppointments(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const buildScheduledAt = () => {
    if (!selectedDay || !selectedTime) return new Date().toISOString()
    const slot = TIME_SLOTS.find(t => t.label === selectedTime)
    const d = new Date(selectedDay)
    d.setHours(slot?.hour ?? 9, 0, 0, 0)
    return d.toISOString()
  }

  const canSubmit = type === 'immediate' || (selectedDay !== null && selectedTime !== null)

  const request = async () => {
    if (!canSubmit) return
    const { data, error } = await supabase.from('appointments').insert({
      patient_id: userId,
      type,
      status: 'pending',
      scheduled_at: buildScheduledAt(),
      patient_concern: concern,
    }).select().single()
    if (!error && data) {
      setAppointments(prev => [data, ...prev])
      setShowRequest(false)
      setConcern('')
      setSelectedDay(null)
      setSelectedTime(null)
      toast.success(type === 'immediate' ? 'Care team notified — they will contact you shortly' : 'Appointment requested')
    }
  }

  const close = () => {
    setShowRequest(false)
    setSelectedDay(null)
    setSelectedTime(null)
    setConcern('')
  }

  const summaryLabel = selectedDay && selectedTime
    ? `${selectedDay.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${selectedTime}`
    : null

  return (
    <div style={{ minHeight: '100dvh', background: '#F2EFE9', paddingBottom: '100px' }}>

      <div style={{ padding: '56px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
              <h1 style={{ color: '#1A2820', fontWeight: 900, fontSize: '20px', letterSpacing: '-0.7px' }}>Care Team</h1>
              <p style={{ color: 'rgba(26,40,32,0.38)', fontSize: '12px' }}>Talk to a professional</p>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            transition={spring}
            onClick={() => { setType('scheduled'); setShowRequest(true) }}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(92,139,116,0.1)', border: '1px solid rgba(92,139,116,0.22)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Plus size={15} color="#5C8B74"/>
          </motion.button>
        </div>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <motion.button
            whileTap={{ scale: 0.97, y: 1 }}
            transition={spring}
            onClick={() => { setType('immediate'); setShowRequest(true) }}
            style={{ background: '#FFFFFF', border: '1px solid rgba(232,50,42,0.18)', borderRadius: '18px', padding: '18px', cursor: 'pointer', textAlign: 'left', boxShadow: '0 2px 10px rgba(26,40,32,0.06)' }}
          >
            <Phone size={22} color="#E8322A" style={{ marginBottom: '10px' }}/>
            <p style={{ color: '#1A2820', fontWeight: 700, fontSize: '14px', marginBottom: '4px', letterSpacing: '-0.2px' }}>Talk now</p>
            <p style={{ color: 'rgba(26,40,32,0.38)', fontSize: '11px' }}>Request immediate call</p>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97, y: 1 }}
            transition={spring}
            onClick={() => { setType('scheduled'); setShowRequest(true) }}
            style={{ background: '#FFFFFF', border: '1px solid rgba(92,139,116,0.2)', borderRadius: '18px', padding: '18px', cursor: 'pointer', textAlign: 'left', boxShadow: '0 2px 10px rgba(26,40,32,0.06)' }}
          >
            <Calendar size={22} color="#5C8B74" style={{ marginBottom: '10px' }}/>
            <p style={{ color: '#1A2820', fontWeight: 700, fontSize: '14px', marginBottom: '4px', letterSpacing: '-0.2px' }}>Schedule</p>
            <p style={{ color: 'rgba(26,40,32,0.38)', fontSize: '11px' }}>Book a future visit</p>
          </motion.button>
        </div>

        <p style={{ color: 'rgba(26,40,32,0.32)', fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '8px' }}>Your appointments</p>

        {appointments.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(26,40,32,0.04)', border: '1px solid rgba(26,40,32,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Calendar size={20} color="rgba(26,40,32,0.22)"/>
            </div>
            <p style={{ color: 'rgba(26,40,32,0.28)', fontSize: '13px' }}>No appointments yet</p>
          </div>
        )}

        {appointments.map((a, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, ...spring }}
            style={{ background: '#FFFFFF', border: `1px solid ${a.status === 'confirmed' ? 'rgba(92,139,116,0.22)' : 'rgba(26,40,32,0.07)'}`, borderRadius: '18px', padding: '16px', boxShadow: '0 2px 8px rgba(26,40,32,0.05)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {a.type === 'immediate' ? <Clock size={13} color="#E8322A"/> : <CalendarCheck size={13} color="#5C8B74"/>}
                <span style={{ color: a.type === 'immediate' ? '#E8322A' : '#5C8B74', fontSize: '12px', fontWeight: 700 }}>
                  {a.type === 'immediate' ? 'Immediate call' : 'Scheduled visit'}
                </span>
              </div>
              <span style={{
                color: a.status === 'confirmed' ? '#3D6B58' : 'rgba(26,40,32,0.4)',
                fontSize: '9px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '1px',
                background: a.status === 'confirmed' ? 'rgba(92,139,116,0.1)' : 'rgba(26,40,32,0.05)',
                border: `1px solid ${a.status === 'confirmed' ? 'rgba(92,139,116,0.22)' : 'rgba(26,40,32,0.1)'}`,
                padding: '2px 7px', borderRadius: '99px',
              }}>{a.status}</span>
            </div>
            {a.scheduled_at && a.type === 'scheduled' && (
              <p style={{ color: 'rgba(26,40,32,0.45)', fontSize: '12px', marginBottom: '4px' }}>
                {new Date(a.scheduled_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                {' · '}
                {new Date(a.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </p>
            )}
            {a.patient_concern && <p style={{ color: 'rgba(26,40,32,0.4)', fontSize: '12px' }}>{a.patient_concern}</p>}
          </motion.div>
        ))}
      </div>

      {/* Request sheet */}
      <AnimatePresence>
        {showRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(26,40,32,0.4)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}
            onClick={e => { if (e.target === e.currentTarget) close() }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              style={{
                background: '#FFFFFF',
                borderRadius: '24px 24px 0 0',
                width: '100%',
                maxHeight: '92dvh',
                overflowY: 'auto',
                boxShadow: '0 -8px 40px rgba(26,40,32,0.14)',
              }}
            >
              {/* Drag handle */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
                <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(26,40,32,0.1)' }}/>
              </div>

              <div style={{ padding: '16px 20px 48px' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <p style={{ color: '#1A2820', fontWeight: 800, fontSize: '18px', letterSpacing: '-0.4px' }}>
                    {type === 'immediate' ? 'Request immediate call' : 'Schedule appointment'}
                  </p>
                  <button onClick={close} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(26,40,32,0.35)' }}>
                    <X size={20}/>
                  </button>
                </div>

                {/* Type toggle */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', background: 'rgba(26,40,32,0.05)', borderRadius: '14px', padding: '4px' }}>
                  {(['immediate', 'scheduled'] as const).map(t => (
                    <button key={t} onClick={() => setType(t)}
                      style={{
                        flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700,
                        background: type === t ? '#FFFFFF' : 'transparent',
                        color: type === t ? '#1A2820' : 'rgba(26,40,32,0.42)',
                        boxShadow: type === t ? '0 1px 4px rgba(26,40,32,0.08)' : 'none',
                        transition: 'background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease',
                        fontFamily: 'inherit',
                      }}>
                      {t === 'immediate' ? 'Right now' : 'Schedule'}
                    </button>
                  ))}
                </div>

                {/* Calendar + time (scheduled only) */}
                {type === 'scheduled' && (
                  <div style={{ marginBottom: '20px' }}>
                    {/* Calendar */}
                    <div style={{ background: '#F8F6F2', border: '1px solid rgba(26,40,32,0.07)', borderRadius: '18px', padding: '16px', marginBottom: '12px' }}>
                      <CalendarPicker selectedDay={selectedDay} onSelect={setSelectedDay}/>
                    </div>

                    {/* Time slots */}
                    <AnimatePresence>
                      {selectedDay && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          transition={spring}
                        >
                          <p style={{ color: 'rgba(26,40,32,0.4)', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                            Select a time
                          </p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {TIME_SLOTS.map(slot => {
                              const active = selectedTime === slot.label
                              return (
                                <motion.button
                                  key={slot.label}
                                  whileTap={{ scale: 0.93 }}
                                  transition={spring}
                                  onClick={() => setSelectedTime(slot.label)}
                                  style={{
                                    padding: '9px 16px',
                                    borderRadius: '99px',
                                    border: `1.5px solid ${active ? '#5C8B74' : 'rgba(26,40,32,0.12)'}`,
                                    background: active ? 'rgba(92,139,116,0.1)' : '#FFFFFF',
                                    color: active ? '#3D6B58' : 'rgba(26,40,32,0.6)',
                                    fontSize: '13px',
                                    fontWeight: active ? 700 : 500,
                                    cursor: 'pointer',
                                    transition: 'background 0.15s ease, border-color 0.15s ease, color 0.15s ease',
                                    fontFamily: 'inherit',
                                  }}
                                >
                                  {slot.label}
                                </motion.button>
                              )
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Summary pill */}
                    <AnimatePresence>
                      {summaryLabel && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={spring}
                          style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(92,139,116,0.08)', border: '1px solid rgba(92,139,116,0.22)', borderRadius: '12px', padding: '10px 14px' }}
                        >
                          <CalendarCheck size={14} color="#5C8B74" style={{ flexShrink: 0 }}/>
                          <p style={{ color: '#3D6B58', fontSize: '13px', fontWeight: 600 }}>{summaryLabel}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Concern textarea */}
                <textarea
                  value={concern}
                  onChange={e => setConcern(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="What would you like to discuss? (optional)"
                  style={{
                    width: '100%',
                    background: '#F8F6F2',
                    border: `1.5px solid ${focused ? 'rgba(92,139,116,0.4)' : 'rgba(26,40,32,0.1)'}`,
                    borderRadius: '14px',
                    padding: '14px 16px',
                    color: '#1A2820',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'none',
                    minHeight: '80px',
                    marginBottom: '14px',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.18s ease',
                  }}
                />

                <motion.button
                  whileTap={canSubmit ? { scale: 0.97, y: 1 } : {}}
                  transition={spring}
                  onClick={request}
                  disabled={!canSubmit}
                  style={{
                    width: '100%',
                    background: !canSubmit
                      ? 'rgba(26,40,32,0.07)'
                      : type === 'immediate'
                        ? 'linear-gradient(135deg, #E8322A, #C42020)'
                        : 'linear-gradient(135deg, #5C8B74, #3D6B58)',
                    color: !canSubmit ? 'rgba(26,40,32,0.3)' : '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '15px',
                    padding: '16px',
                    borderRadius: '14px',
                    border: 'none',
                    cursor: canSubmit ? 'pointer' : 'default',
                    boxShadow: canSubmit
                      ? type === 'immediate' ? '0 8px 24px rgba(232,50,42,0.24)' : '0 8px 24px rgba(92,139,116,0.24)'
                      : 'none',
                    transition: 'background 0.2s ease, box-shadow 0.2s ease, color 0.2s ease',
                    letterSpacing: '-0.1px',
                  }}
                >
                  {type === 'immediate' ? 'Request immediate call' : 'Request appointment'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav/>
    </div>
  )
}
