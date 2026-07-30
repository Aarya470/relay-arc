'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Calendar, X, Clock, CalendarCheck, ChevronLeft, ChevronRight, Video } from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import JitsiMeeting from '@/components/JitsiMeeting'

const spring = { type: 'spring', stiffness: 360, damping: 26 } as const
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const ALL_TIMES: string[] = []
for (let h = 6; h <= 21; h++) {
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  const ampm = h < 12 ? 'AM' : 'PM'
  ALL_TIMES.push(`${h12}:00 ${ampm}`)
  if (h < 21) ALL_TIMES.push(`${h12}:30 ${ampm}`)
}

function parseTS(ts: string) {
  if (!ts) return new Date()
  return new Date(/[Z+]/.test(ts) ? ts : ts + 'Z')
}

function processAndMarkMissed(appts: any[]): any[] {
  const now = Date.now()
  const missedIds = appts
    .filter(a => a.status === 'confirmed' && parseTS(a.scheduled_at).getTime() < now - 30 * 60 * 1000)
    .map(a => a.id)
  if (missedIds.length > 0) {
    supabase.from('appointments').update({ status: 'missed' }).in('id', missedIds)
      .then(({ error }) => { if (error) console.error('processAndMarkMissed:', error) })
    return appts.map(a => missedIds.includes(a.id) ? { ...a, status: 'missed' } : a)
  }
  return appts
}

function parseTimeTo24h(label: string) {
  const [timePart, ampm] = label.split(' ')
  const [hourStr, minStr] = timePart.split(':')
  let hour = parseInt(hourStr)
  const min = parseInt(minStr)
  if (ampm === 'PM' && hour !== 12) hour += 12
  if (ampm === 'AM' && hour === 12) hour = 0
  return { hour, min }
}

function TimeScrollPicker({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  const ITEM_H = 52
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const idx = ALL_TIMES.indexOf(value)
    if (ref.current && idx >= 0) ref.current.scrollTop = idx * ITEM_H
  }, [])

  const handleScroll = () => {
    if (!ref.current) return
    const idx = Math.round(ref.current.scrollTop / ITEM_H)
    const clamped = Math.max(0, Math.min(idx, ALL_TIMES.length - 1))
    if (ALL_TIMES[clamped] !== value) onChange(ALL_TIMES[clamped])
  }

  return (
    <div style={{ position: 'relative', height: ITEM_H * 3, borderRadius: '14px', background: '#FFFFFF', border: '1px solid #D8D4C8', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: ITEM_H, left: 12, right: 12, height: ITEM_H, background: 'rgba(120,140,93,0.10)', border: '1px solid rgba(120,140,93,0.22)', borderRadius: '10px', pointerEvents: 'none', zIndex: 1 }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: ITEM_H * 1.1, background: 'linear-gradient(to bottom, #FFFFFF 25%, transparent)', pointerEvents: 'none', zIndex: 2 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: ITEM_H * 1.1, background: 'linear-gradient(to top, #FFFFFF 25%, transparent)', pointerEvents: 'none', zIndex: 2 }} />
      <div
        ref={ref}
        onScroll={handleScroll}
        style={{ height: '100%', overflowY: 'scroll', scrollSnapType: 'y mandatory', paddingTop: ITEM_H, paddingBottom: ITEM_H, scrollbarWidth: 'none' } as React.CSSProperties}
      >
        {ALL_TIMES.map((t, i) => {
          const sel = t === value
          return (
            <div
              key={t}
              style={{ height: ITEM_H, scrollSnapAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              onClick={() => { onChange(t); ref.current?.scrollTo({ top: i * ITEM_H, behavior: 'smooth' }) }}
            >
              <span style={{ fontSize: sel ? '18px' : '14px', fontWeight: sel ? 800 : 400, color: sel ? '#5F7049' : '#8A8780', letterSpacing: sel ? '-0.4px' : 0, transition: 'all 0.15s ease', fontFamily: 'inherit' }}>
                {t}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CalendarPicker({ selectedDay, onSelect }: { selectedDay: Date | null; onSelect: (d: Date) => void }) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const prevMonth = () => { if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) } else setViewMonth(m => m - 1) }
  const nextMonth = () => { if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) } else setViewMonth(m => m + 1) }
  const isPast = (d: number) => new Date(viewYear, viewMonth, d) < today
  const isSelected = (d: number) => selectedDay?.getFullYear() === viewYear && selectedDay?.getMonth() === viewMonth && selectedDay?.getDate() === d
  const isToday = (d: number) => today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === d
  const cells: (number | null)[] = [...Array(firstDayOfWeek).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <motion.button whileTap={{ scale: 0.88 }} transition={spring} onClick={prevMonth} style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#F2F0E8', border: '1px solid #D8D4C8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={15} color="#5C5A52" />
        </motion.button>
        <p style={{ color: '#141413', fontWeight: 700, fontSize: '14px', letterSpacing: '-0.3px' }}>{MONTHS[viewMonth]} {viewYear}</p>
        <motion.button whileTap={{ scale: 0.88 }} transition={spring} onClick={nextMonth} style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#F2F0E8', border: '1px solid #D8D4C8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronRight size={15} color="#5C5A52" />
        </motion.button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '6px' }}>
        {DAYS.map(d => <p key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: 600, color: '#8A8780', fontFamily: 'var(--font-mono, monospace)', letterSpacing: '0.3px' }}>{d}</p>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const past = isPast(day), selected = isSelected(day), todayFlag = isToday(day)
          return (
            <motion.button key={i} whileTap={past ? {} : { scale: 0.88 }} transition={spring} onClick={() => !past && onSelect(new Date(viewYear, viewMonth, day))} disabled={past}
              style={{ height: '36px', borderRadius: '9px', border: todayFlag && !selected ? '1.5px solid rgba(120,140,93,0.4)' : 'none', background: selected ? '#5F7049' : 'transparent', color: past ? '#8A8780' : selected ? '#FFFFFF' : todayFlag ? '#5F7049' : '#141413', fontSize: '13px', fontWeight: selected ? 800 : todayFlag ? 700 : 500, cursor: past ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
  const [profile, setProfile] = useState<any>(null)
  const [showRequest, setShowRequest] = useState(false)
  const type = 'scheduled' as const
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState('9:00 AM')
  const [concern, setConcern] = useState('')
  const [loading, setLoading] = useState(true)
  const [focused, setFocused] = useState(false)
  const [upcomingMeeting, setUpcomingMeeting] = useState<any>(null)
  const [activeCall, setActiveCall] = useState<any>(null)
  const notifiedRef = useRef<Set<string>>(new Set())
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const [{ data: p }, { data: a }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('appointments').select('*').eq('patient_id', user.id).order('scheduled_at', { ascending: false }),
      ])
      setProfile(p)
      setAppointments(processAndMarkMissed(a || []))
      setLoading(false)
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission()
      }
      const params = new URLSearchParams(window.location.search)
      const joinId = params.get('join')
      if (joinId) {
        window.history.replaceState({}, '', window.location.pathname)
        const { data: appt } = await supabase
          .from('appointments')
          .select('*')
          .eq('meeting_room_id', joinId)
          .eq('patient_id', user.id)
          .single()
        if (appt) setActiveCall(appt)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (!userId) return
    const check = async () => {
      const { data } = await supabase.from('appointments').select('*').eq('patient_id', userId).eq('status', 'confirmed')
      if (!data) return
      const now = Date.now()
      const upcoming = data.find(a => {
        if (!a.meeting_room_id) return false
        const t = parseTS(a.scheduled_at).getTime()
        return t > now - 5 * 60 * 1000 && t < now + 15 * 60 * 1000
      })
      setUpcomingMeeting(upcoming || null)
      if (upcoming && !notifiedRef.current.has(upcoming.id)) {
        notifiedRef.current.add(upcoming.id)
        if ('Notification' in window && Notification.permission === 'granted') {
          const t = parseTS(upcoming.scheduled_at).getTime()
          const min = Math.round((t - now) / 60000)
          new Notification('Meeting starting soon', {
            body: `Your care team call starts ${min > 0 ? `in ${min} min` : 'now'}. Tap to join.`,
          })
        }
      }
    }
    check()
    const id = setInterval(check, 30000)
    return () => clearInterval(id)
  }, [userId])

  const buildScheduledAt = () => {
    if (!selectedDay) return new Date().toISOString()
    const { hour, min } = parseTimeTo24h(selectedTime)
    const d = new Date(selectedDay)
    d.setHours(hour, min, 0, 0)
    return d.toISOString()
  }

  const scheduledInPast = (() => {
    if (!selectedDay) return false
    const { hour, min } = parseTimeTo24h(selectedTime)
    const d = new Date(selectedDay)
    d.setHours(hour, min, 0, 0)
    return d <= new Date()
  })()

  const canSubmit = selectedDay !== null && !scheduledInPast

  const requestAgain = async (appt: any) => {
    await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', appt.id)
    setAppointments(prev => prev.filter(a => a.id !== appt.id))
    setConcern(appt.patient_concern || '')
    setShowRequest(true)
  }

  const isJoinable = (a: any) => {
    if (a.status !== 'confirmed' || !a.meeting_room_id) return false
    const t = parseTS(a.scheduled_at).getTime()
    const now = Date.now()
    return now >= t - 10 * 60 * 1000 && now <= t + 60 * 60 * 1000
  }

  const request = async () => {
    if (!canSubmit || !userId) return
    const meetingRoomId = crypto.randomUUID()
    const { data, error } = await supabase.from('appointments').insert({
      patient_id: userId,
      type,
      status: 'pending',
      scheduled_at: buildScheduledAt(),
      patient_concern: concern,
      meeting_room_id: meetingRoomId,
    }).select().single()
    if (error) { toast.error(error.message); return }
    if (data) {
      setAppointments(prev => [data, ...prev])
      setShowRequest(false)
      setConcern('')
      setSelectedDay(null)
      setSelectedTime('9:00 AM')
      toast.success('Appointment requested')
    }
  }

  const handleMeetingEnd = async (appointmentId: string) => {
    await supabase.from('appointments').update({ status: 'completed' }).eq('id', appointmentId)
    setAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, status: 'completed' } : a))
    setActiveCall(null)
    setUpcomingMeeting(null)
    toast.success('Call ended — appointment marked complete')
  }

  const close = () => { setShowRequest(false); setSelectedDay(null); setSelectedTime('9:00 AM'); setConcern('') }

  const summaryLabel = selectedDay
    ? `${selectedDay.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${selectedTime}`
    : null

  const statusStyle = (status: string) => ({
    color: status === 'confirmed' ? '#5F7049' : status === 'completed' ? '#8A8780' : (status === 'declined' || status === 'missed') ? '#A33417' : '#5C5A52',
    background: status === 'confirmed' ? 'rgba(120,140,93,0.12)' : (status === 'declined' || status === 'missed') ? 'rgba(163,52,23,0.12)' : '#F2F0E8',
    border: `1px solid ${status === 'confirmed' ? 'rgba(120,140,93,0.28)' : (status === 'declined' || status === 'missed') ? 'rgba(163,52,23,0.22)' : '#E5E2D9'}`,
    fontSize: '9px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase' as const, letterSpacing: '1px',
    padding: '2px 7px', borderRadius: '99px',
  })

  const cardBorderColor = (status: string) => {
    if (status === 'confirmed') return 'rgba(120,140,93,0.25)'
    if (status === 'pending') return 'rgba(168,114,0,0.25)'
    if (status === 'missed' || status === 'declined') return 'rgba(163,52,23,0.20)'
    return '#F2F0E8'
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#FAF9F5', paddingBottom: '100px' }}>

      {/* Meeting notification banner */}
      <AnimatePresence>
        {upcomingMeeting && !activeCall && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={spring}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: '#5F7049', padding: '52px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <div>
              <p style={{ color: 'rgba(255,255,255,0.60)', fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '3px' }}>
                {new Date(upcomingMeeting.scheduled_at) <= new Date() ? 'Live now' : 'Starting soon'}
              </p>
              <p style={{ color: 'white', fontWeight: 700, fontSize: '14px', letterSpacing: '-0.2px' }}>Your care team call is ready</p>
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setActiveCall(upcomingMeeting)}
              style={{ background: 'white', color: '#5F7049', fontWeight: 700, fontSize: '12px', padding: '10px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <Video size={13} />
              Join now
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Jitsi overlay */}
      <AnimatePresence>
        {activeCall && (
          <JitsiMeeting
            roomId={activeCall.meeting_room_id}
            displayName={profile?.full_name || 'Patient'}
            onEnd={() => handleMeetingEnd(activeCall.id)}
          />
        )}
      </AnimatePresence>

      <div style={{ padding: '56px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <motion.button whileTap={{ scale: 0.9 }} transition={spring} onClick={() => router.push('/dashboard')}
              style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#F2F0E8', border: '1px solid #D8D4C8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowLeft size={15} color="#5C5A52" />
            </motion.button>
            <div>
              <h1 style={{ color: '#141413', fontWeight: 900, fontSize: '20px', letterSpacing: '-0.7px' }}>Care Team</h1>
              <p style={{ color: '#8A8780', fontSize: '12px' }}>Talk to a professional</p>
            </div>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} transition={spring} onClick={() => { setShowRequest(true) }}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(120,140,93,0.12)', border: '1px solid rgba(120,140,93,0.22)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Plus size={15} color="#5F7049" />
          </motion.button>
        </div>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <motion.button whileTap={{ scale: 0.97, y: 1 }} transition={spring} onClick={() => setShowRequest(true)}
          style={{ width: '100%', background: '#5F7049', border: 'none', borderRadius: '16px', padding: '18px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Calendar size={20} color="white" />
          </div>
          <div>
            <p style={{ color: 'white', fontWeight: 700, fontSize: '14px', marginBottom: '3px', letterSpacing: '-0.2px' }}>Book appointment</p>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '11px' }}>Schedule a visit with your care team</p>
          </div>
        </motion.button>

        <p style={{ color: '#8A8780', fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '8px' }}>Your appointments</p>

        {appointments.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#F2F0E8', border: '1px solid #E5E2D9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Calendar size={20} color="#8A8780" />
            </div>
            <p style={{ color: '#8A8780', fontSize: '13px' }}>No appointments yet</p>
          </div>
        )}

        {appointments.map((a, i) => {
          const joinable = isJoinable(a)
          return (
            <motion.div key={a.id || i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, ...spring }}
              style={{ background: '#FFFFFF', border: `1px solid ${joinable ? 'rgba(120,140,93,0.30)' : cardBorderColor(a.status)}`, borderRadius: '16px', padding: '16px', boxShadow: joinable ? '0 4px 20px rgba(120,140,93,0.14)' : '0 2px 8px rgba(0,0,0,0.20)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {a.type === 'immediate' ? <Clock size={13} color="#A33417" /> : <CalendarCheck size={13} color="#5F7049" />}
                  <span style={{ color: a.type === 'immediate' ? '#A33417' : '#5F7049', fontSize: '12px', fontWeight: 700 }}>
                    {a.type === 'immediate' ? 'Immediate call' : 'Scheduled visit'}
                  </span>
                </div>
                <span style={statusStyle(a.status)}>
                  {a.status === 'pending' ? 'Awaiting review' : a.status}
                </span>
              </div>
              {a.scheduled_at && a.type === 'scheduled' && (
                <p style={{ color: '#5C5A52', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                  {parseTS(a.scheduled_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  {' · '}
                  {parseTS(a.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </p>
              )}
              {a.patient_concern && (
                <p style={{ color: '#5C5A52', fontSize: '12px', marginBottom: joinable ? '12px' : 0 }}>{a.patient_concern}</p>
              )}
              {joinable && (
                <motion.button whileTap={{ scale: 0.97, y: 1 }} transition={spring} onClick={() => setActiveCall(a)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#5F7049', borderRadius: '12px', padding: '13px', color: 'white', fontWeight: 700, fontSize: '14px', border: 'none', cursor: 'pointer', marginTop: '4px' }}>
                  <Video size={15} />
                  Join video call
                </motion.button>
              )}
              {a.status === 'missed' && (
                <motion.button whileTap={{ scale: 0.97, y: 1 }} transition={spring} onClick={() => requestAgain(a)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#F2F0E8', border: '1px solid #D8D4C8', borderRadius: '12px', padding: '12px', color: '#5C5A52', fontWeight: 700, fontSize: '13px', cursor: 'pointer', marginTop: '8px' }}>
                  Request a new time
                </motion.button>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Request sheet */}
      <AnimatePresence>
        {showRequest && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,19,0.40)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}
            onClick={e => { if (e.target === e.currentTarget) close() }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              style={{ background: '#FFFFFF', borderRadius: '24px 24px 0 0', width: '100%', maxHeight: '92dvh', overflowY: 'auto', boxShadow: '0 -8px 40px rgba(20,20,19,0.12)', border: '1px solid #E5E2D9', borderBottom: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
                <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: '#E5E2D9' }} />
              </div>
              <div style={{ padding: '16px 20px 48px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <p style={{ color: '#141413', fontWeight: 800, fontSize: '18px', letterSpacing: '-0.4px' }}>
                    Schedule appointment
                  </p>
                  <button onClick={close} style={{ background: '#F2F0E8', border: '1px solid #D8D4C8', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', color: '#5C5A52', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={16} />
                  </button>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <div style={{ background: '#FFFFFF', border: '1px solid #E5E2D9', borderRadius: '18px', padding: '16px', marginBottom: '12px' }}>
                      <CalendarPicker selectedDay={selectedDay} onSelect={setSelectedDay} />
                    </div>

                    <AnimatePresence>
                      {selectedDay && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={spring}>
                          <p style={{ color: '#8A8780', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Select a time</p>
                          <TimeScrollPicker value={selectedTime} onChange={setSelectedTime} />
                          {scheduledInPast && (
                            <p style={{ color: '#A33417', fontSize: '12px', marginTop: '8px', textAlign: 'center' }}>
                              This time has already passed — pick a future time
                            </p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <AnimatePresence>
                      {summaryLabel && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={spring}
                          style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(120,140,93,0.10)', border: '1px solid rgba(120,140,93,0.22)', borderRadius: '12px', padding: '10px 14px' }}>
                          <CalendarCheck size={14} color="#5F7049" style={{ flexShrink: 0 }} />
                          <p style={{ color: '#5F7049', fontSize: '13px', fontWeight: 600 }}>{summaryLabel}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                <textarea value={concern} onChange={e => setConcern(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                  placeholder="What would you like to discuss? (optional)"
                  style={{ width: '100%', background: '#FFFFFF', border: `1.5px solid ${focused ? 'rgba(120,140,93,0.50)' : '#E5E2D9'}`, borderRadius: '14px', padding: '14px 16px', color: '#141413', fontSize: '14px', outline: 'none', resize: 'none', minHeight: '80px', marginBottom: '14px', fontFamily: 'inherit', transition: 'border-color 0.18s ease' }} />

                <motion.button whileTap={canSubmit ? { scale: 0.97, y: 1 } : {}} transition={spring} onClick={request} disabled={!canSubmit}
                  style={{ width: '100%', background: !canSubmit ? '#F2F0E8' : '#5F7049', color: !canSubmit ? '#8A8780' : '#FFFFFF', fontWeight: 800, fontSize: '15px', padding: '16px', borderRadius: '14px', border: 'none', cursor: canSubmit ? 'pointer' : 'default', boxShadow: canSubmit ? '0 8px 24px rgba(120,140,93,0.28)' : 'none', transition: 'all 0.2s ease', letterSpacing: '-0.1px' }}>
                  Book appointment
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  )
}
