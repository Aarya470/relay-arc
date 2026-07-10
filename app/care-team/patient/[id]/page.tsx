'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowLeft, Calendar, Send, X, Check, AlertTriangle, Video, ChevronLeft, ChevronRight, Bell, Pill } from 'lucide-react'
import JitsiMeeting from '@/components/JitsiMeeting'
import Groq from 'groq-sdk'
import { sendPushNotification } from '@/lib/notifications'

const groq = new Groq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY!,
  dangerouslyAllowBrowser: true
})

function parseTS(ts: string) {
  if (!ts) return new Date()
  return new Date(/[Z+]/.test(ts) ? ts : ts + 'Z')
}

export default function PatientDetail() {
  const params = useParams()
  const patientId = params.id as string
  const router = useRouter()

  const [patient, setPatient] = useState<any>(null)
  const [checkins, setCheckins] = useState<any[]>([])
  const [emergencies, setEmergencies] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [appointments, setAppointments] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [careTeamMember, setCareTeamMember] = useState<any>(null)
  const [tab, setTab] = useState('overview')
  const [newNote, setNewNote] = useState('')
  const [showSchedule, setShowSchedule] = useState(false)
  const [appointmentType, setAppointmentType] = useState<'immediate' | 'scheduled'>('scheduled')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('09:00')
  const [appointmentConcern, setAppointmentConcern] = useState('')
  const [loading, setLoading] = useState(true)
  const [aiSummary, setAiSummary] = useState('')
  const [generatingSummary, setGeneratingSummary] = useState(false)
  const [activeCall, setActiveCall] = useState<any>(null)
  const [reschedulingAppt, setReschedulingAppt] = useState<any>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('09:00')
  const [todayMedLogs, setTodayMedLogs] = useState<any[]>([])
  const [reminderSent, setReminderSent] = useState<Record<string, boolean>>({})

  // Calendar state must be declared before any conditional returns
  const today = new Date()
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()
  const [calMonth, setCalMonth] = useState(today.getMonth())
  const [calYear, setCalYear] = useState(today.getFullYear())
  const daysInMonth = getDaysInMonth(calYear, calMonth)
  const firstDay = new Date(calYear, calMonth, 1).getDay()
  const monthName = new Date(calYear, calMonth).toLocaleString('default', { month: 'long', year: 'numeric' })

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/care-team/login'); return }

      const { data: member } = await supabase.from('care_team_members').select('*').eq('id', user.id).single()
      setCareTeamMember(member)

      const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0)
      const [{ data: p }, { data: c }, { data: e }, { data: n }, { data: a }, { data: s }, { data: ml }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', patientId).single(),
        supabase.from('checkins').select('*').eq('user_id', patientId).order('created_at', { ascending: false }),
        supabase.from('emergencies').select('*').eq('user_id', patientId).order('created_at', { ascending: false }),
        supabase.from('patient_notes').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
        supabase.from('appointments').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
        supabase.from('patient_summaries').select('*').eq('patient_id', patientId).single(),
        supabase.from('medication_logs').select('*').eq('user_id', patientId).gte('taken_at', todayMidnight.toISOString()),
      ])

      setPatient(p)
      setCheckins(c || [])
      setEmergencies(e || [])
      setNotes(n || [])
      setAppointments(a || [])
      setSummary(s)
      setTodayMedLogs(ml || [])
      setLoading(false)

      // Auto generate summary
      if (p && c) generateSummary(p, c || [], e || [])
    }
    load()
  }, [patientId])

  const generateSummary = async (p: any, c: any[], e: any[]) => {
    setGeneratingSummary(true)
    const prompt = `Summarize this cardiac patient for a care team member. Be direct, simple, and use bullet points.

Patient: ${p.full_name}, ${p.diagnosis}
Medications: ${p.medications?.map((m: any) => `${m.name} ${m.dose}`).join(', ')}
Allergies: ${p.allergies || 'None'}
Surgery date: ${p.surgery_date || 'N/A'}
Recent check-ins: ${c.slice(0, 5).map((ci: any) => ci.summary).join(' | ') || 'None'}
Emergencies: ${e.length} total. Latest: ${e[0]?.emergency_type?.replace('_', ' ') || 'none'}

Write:
1. One sentence status overview
2. 3-5 bullet points of key things the care team needs to know
3. One bullet point of recommended action

Keep everything simple and plain English. No medical jargon.`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }]
    })
    setAiSummary(completion.choices[0].message.content || '')
    setGeneratingSummary(false)
  }

  const isOverdueMed = (med: any): boolean => {
    const now = Date.now()
    for (const timeStr of (med.times || [])) {
      const m = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
      if (!m) continue
      let h = parseInt(m[1]), min = parseInt(m[2])
      const ap = m[3].toUpperCase()
      if (ap === 'PM' && h !== 12) h += 12
      if (ap === 'AM' && h === 12) h = 0
      const due = new Date(); due.setHours(h, min, 0, 0)
      if (due.getTime() > now) continue
      if (now - due.getTime() < 60 * 60 * 1000) continue
      if (!todayMedLogs.some(l => l.medication_name === med.name)) return true
    }
    return false
  }

  const sendMedReminder = async (medName: string) => {
    await supabase.from('patient_notes').insert({
      patient_id: patientId,
      care_team_id: careTeamMember?.id,
      note_type: 'med_reminder',
      content: medName,
    })
    // Also fire a real background push so patient is notified even if app is closed
    await sendPushNotification(
      patientId,
      'Medication reminder from your care team',
      `Please take your ${medName}. Tap to open the app.`
    )
    setReminderSent(prev => ({ ...prev, [medName]: true }))
    toast.success(`Reminder sent for ${medName}`)
  }

  const addNote = async () => {
    if (!newNote.trim()) return
    const { data, error } = await supabase.from('patient_notes').insert({
      patient_id: patientId,
      care_team_id: careTeamMember?.id,
      note_type: 'care_team_note',
      content: newNote
    }).select().single()
    if (!error && data) {
      setNotes(prev => [data, ...prev])
      setNewNote('')
      toast.success('Note saved')
    }
  }

  const scheduleAppointment = async () => {
    const scheduledAt = appointmentType === 'scheduled' && selectedDate
      ? new Date(`${selectedDate}T${selectedTime}`).toISOString()
      : new Date().toISOString()

    if (appointmentType === 'scheduled' && new Date(scheduledAt) <= new Date()) {
      toast.error('Please pick a future date and time')
      return
    }

    const meetingRoomId = crypto.randomUUID()
    const { data, error } = await supabase.from('appointments').insert({
      patient_id: patientId,
      care_team_id: careTeamMember?.id,
      type: appointmentType,
      status: 'confirmed',
      scheduled_at: scheduledAt,
      notes: appointmentConcern,
      meeting_room_id: meetingRoomId,
    }).select().single()

    if (!error && data) {
      setAppointments(prev => [data, ...prev])
      setShowSchedule(false)
      toast.success(appointmentType === 'immediate' ? 'Immediate call scheduled' : 'Appointment confirmed')
    }
  }

  const confirmAppointment = async (id: string) => {
    await supabase.from('appointments').update({ status: 'confirmed' }).eq('id', id)
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'confirmed' } : a))
    toast.success('Appointment confirmed')
  }

  const declineAppointment = async (id: string) => {
    await supabase.from('appointments').update({ status: 'declined' }).eq('id', id)
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'declined' } : a))
    toast('Appointment declined')
  }

  const rescheduleAppointment = async () => {
    if (!reschedulingAppt || !rescheduleDate) return
    const newDate = new Date(`${rescheduleDate}T${rescheduleTime}`).toISOString()
    if (new Date(newDate) <= new Date()) {
      toast.error('Please pick a future date and time')
      return
    }
    await supabase.from('appointments').update({ scheduled_at: newDate, status: 'confirmed' }).eq('id', reschedulingAppt.id)
    setAppointments(prev => prev.map(a => a.id === reschedulingAppt.id ? { ...a, scheduled_at: newDate, status: 'confirmed' } : a))
    setReschedulingAppt(null)
    setRescheduleDate('')
    toast.success('Appointment rescheduled and confirmed')
  }

  const handleMeetingEnd = async (appointmentId: string) => {
    await supabase.from('appointments').update({ status: 'completed' }).eq('id', appointmentId)
    setAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, status: 'completed' } : a))
    setActiveCall(null)
    toast.success('Call ended — appointment marked complete')
  }

  const isJoinable = (a: any) => {
    if (a.status !== 'confirmed' || !a.meeting_room_id) return false
    const t = parseTS(a.scheduled_at).getTime()
    const now = Date.now()
    return now >= t - 10 * 60 * 1000 && now <= t + 60 * 60 * 1000
  }

  const times: string[] = []
  for (let h = 6; h <= 20; h++) {
    times.push(`${String(h).padStart(2,'0')}:00`)
    times.push(`${String(h).padStart(2,'0')}:30`)
  }

  const score = summary?.priority_score || 0
  const priorityColor = score >= 8 ? '#D91414' : score >= 5 ? '#B45309' : '#007A44'
  const priorityBg = score >= 8 ? 'rgba(217,20,20,0.12)' : score >= 5 ? 'rgba(180,83,9,0.12)' : 'rgba(0,122,68,0.12)'
  const priorityBorder = score >= 8 ? 'rgba(217,20,20,0.28)' : score >= 5 ? 'rgba(180,83,9,0.28)' : 'rgba(0,122,68,0.28)'

  if (loading || !patient) return (
    <div style={{ minHeight: '100vh', background: '#F4F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#0055FF' }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
        <p style={{ color: '#9AA2AD', fontSize: '13px', letterSpacing: '0.02em' }}>Loading patient data…</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F4F5F7', paddingBottom: '48px' }}>

      {/* Jitsi overlay */}
      <AnimatePresence>
        {activeCall && (
          <JitsiMeeting
            roomId={activeCall.meeting_room_id}
            displayName={careTeamMember?.full_name || 'Care Team'}
            onEnd={() => handleMeetingEnd(activeCall.id)}
          />
        )}
      </AnimatePresence>

      {/* Reschedule sheet */}
      <AnimatePresence>
        {reschedulingAppt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(14,18,24,0.45)', zIndex: 150, display: 'flex', alignItems: 'flex-end' }}
            onClick={e => { if (e.target === e.currentTarget) setReschedulingAppt(null) }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              style={{ background: '#FFFFFF', border: '1px solid #E3E6EC', borderRadius: '24px 24px 0 0', padding: '28px 20px 52px', width: '100%' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <p style={{ color: '#0E1218', fontWeight: 700, fontSize: '18px', letterSpacing: '-0.3px' }}>Reschedule appointment</p>
                <button
                  onClick={() => setReschedulingAppt(null)}
                  style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ECEEF2', border: '1px solid #D5D9E0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={15} color="#5B6371" />
                </button>
              </div>

              <p style={{ color: '#9AA2AD', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '8px' }}>New date</p>
              <input
                type="date"
                value={rescheduleDate}
                onChange={e => setRescheduleDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                style={{ width: '100%', background: '#FFFFFF', border: '1px solid #D5D9E0', borderRadius: '12px', padding: '13px 16px', color: '#0E1218', fontSize: '14px', outline: 'none', marginBottom: '14px', boxSizing: 'border-box' }}
              />

              <p style={{ color: '#9AA2AD', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '8px' }}>New time</p>
              <input
                type="time"
                value={rescheduleTime}
                onChange={e => setRescheduleTime(e.target.value)}
                style={{ width: '100%', background: '#FFFFFF', border: '1px solid #D5D9E0', borderRadius: '12px', padding: '13px 16px', color: '#0E1218', fontSize: '14px', outline: 'none', marginBottom: '22px', boxSizing: 'border-box' }}
              />

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={rescheduleAppointment}
                disabled={!rescheduleDate}
                style={{ width: '100%', background: rescheduleDate ? '#0055FF' : '#ECEEF2', color: rescheduleDate ? '#ffffff' : '#9AA2AD', fontWeight: 700, fontSize: '15px', padding: '16px', borderRadius: '12px', border: 'none', cursor: rescheduleDate ? 'pointer' : 'default', transition: 'background 0.15s' }}
              >
                Confirm reschedule
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E3E6EC', padding: '56px 20px 0' }}>
        {/* Back + name row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <motion.button
            whileTap={{ scale: 0.90 }}
            onClick={() => router.push('/care-team/dashboard')}
            style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#ECEEF2', border: '1px solid #D5D9E0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <ArrowLeft size={16} color="#5B6371" />
          </motion.button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ color: '#0E1218', fontWeight: 800, fontSize: '22px', letterSpacing: '-0.5px', lineHeight: 1.15, margin: 0 }}>{patient.full_name}</h1>
            <div style={{ marginTop: '5px' }}>
              <span style={{ display: 'inline-block', background: 'rgba(0,85,255,0.12)', border: '1px solid rgba(0,85,255,0.25)', borderRadius: '6px', padding: '2px 9px', color: '#0055FF', fontSize: '11px', fontWeight: 600 }}>
                {patient.diagnosis}
              </span>
            </div>
          </div>

          {/* Priority badge */}
          <div style={{ background: priorityBg, border: `1px solid ${priorityBorder}`, borderRadius: '14px', padding: '8px 14px', textAlign: 'center', flexShrink: 0 }}>
            <p style={{ color: priorityColor, fontWeight: 900, fontSize: '22px', lineHeight: 1, margin: 0 }}>{score || '—'}</p>
            <p style={{ color: priorityColor, opacity: 0.6, fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', margin: 0, marginTop: '2px' }}>Priority</p>
          </div>
        </div>

        {/* Active emergency banner */}
        {emergencies.find(e => e.status === 'active') && (() => {
          const em = emergencies.find(e => e.status === 'active')!
          const typeLabel = (em.emergency_type || 'emergency').replace(/_/g, ' ')
          return (
            <motion.div
              animate={{ opacity: [1, 0.72, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              style={{ background: 'rgba(217,20,20,0.10)', border: '1.5px solid rgba(217,20,20,0.35)', borderRadius: '14px', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}
            >
              <AlertTriangle size={18} color="#D91414" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ color: '#D91414', fontWeight: 800, fontSize: '13px', letterSpacing: '-0.2px', margin: 0 }}>Active Emergency</p>
                <p style={{ color: '#5B6371', fontSize: '11px', marginTop: '2px', margin: 0 }}>
                  {typeLabel} · {new Date(em.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <motion.div
                animate={{ scale: [1, 1.25, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                style={{ width: 9, height: 9, borderRadius: '50%', background: '#D91414', flexShrink: 0 }}
              />
            </motion.div>
          )
        })()}

        {/* Schedule appointment button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => { setAppointmentType('scheduled'); setShowSchedule(true) }}
          style={{ width: '100%', background: 'rgba(0,85,255,0.10)', border: '1px solid rgba(0,85,255,0.22)', borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', marginBottom: '18px' }}
        >
          <Calendar size={14} color="#0055FF" />
          <span style={{ color: '#0055FF', fontWeight: 600, fontSize: '13px' }}>Schedule appointment</span>
        </motion.button>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '0', scrollbarWidth: 'none' }}>
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'checkins', label: 'Check-ins' },
            { id: 'notes', label: 'Notes' },
            { id: 'appointments', label: 'Appointments' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                position: 'relative',
                padding: '10px 18px 12px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: tab === t.id ? 700 : 500,
                whiteSpace: 'nowrap',
                color: tab === t.id ? '#0055FF' : '#9AA2AD',
                transition: 'color 0.15s',
              }}
            >
              {t.label}
              {tab === t.id && (
                <motion.div
                  layoutId="tab-underline"
                  style={{ position: 'absolute', bottom: 0, left: '10px', right: '10px', height: '2px', background: '#0055FF', borderRadius: '2px' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '18px 16px' }}>

        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Patient info card */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E3E6EC', borderRadius: '16px', padding: '18px' }}>
              <p style={{ color: '#9AA2AD', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '14px' }}>Patient info</p>
              {[
                { label: 'Phone', value: patient.phone },
                { label: 'Date of birth', value: patient.date_of_birth },
                { label: 'Cardiologist', value: patient.cardiologist },
                { label: 'Surgery date', value: patient.surgery_date },
                { label: 'Blood type', value: patient.blood_type, red: true },
                { label: 'Allergies', value: patient.allergies, amber: true },
                { label: 'Conditions', value: patient.diagnosis },
              ].filter(i => i.value).map((item, i, arr) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '12px',
                    paddingBottom: i < arr.length - 1 ? '10px' : 0,
                    marginBottom: i < arr.length - 1 ? '10px' : 0,
                    borderBottom: i < arr.length - 1 ? '1px solid #E9EBF0' : 'none',
                  }}
                >
                  <span style={{ color: '#9AA2AD', fontSize: '12px', flexShrink: 0 }}>{item.label}</span>
                  <span style={{
                    color: (item as any).red ? '#D91414' : (item as any).amber ? '#B45309' : '#0E1218',
                    fontSize: '12px',
                    fontWeight: 500,
                    maxWidth: '60%',
                    textAlign: 'right',
                  }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Medications card */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E3E6EC', borderRadius: '16px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Pill size={12} color="#0055FF" />
                <p style={{ color: '#9AA2AD', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1.2px' }}>Medications</p>
              </div>

              {patient.medications?.map((m: any, i: number) => {
                const overdue = isOverdueMed(m)
                return (
                  <div
                    key={i}
                    style={{
                      paddingBottom: '12px',
                      marginBottom: '12px',
                      borderBottom: '1px solid #E9EBF0',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: overdue ? '8px' : 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ display: 'inline-block', background: 'rgba(0,85,255,0.10)', border: '1px solid rgba(0,85,255,0.20)', borderRadius: '6px', padding: '2px 8px', color: overdue ? '#D91414' : '#0055FF', fontSize: '12px', fontWeight: 600 }}>
                          {m.name}
                        </span>
                        {overdue && (
                          <span style={{ background: 'rgba(217,20,20,0.12)', border: '1px solid rgba(217,20,20,0.30)', color: '#D91414', fontSize: '8px', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                            OVERDUE
                          </span>
                        )}
                      </div>
                      <span style={{ color: '#9AA2AD', fontSize: '11px', fontFamily: 'monospace' }}>{m.dose} · {m.frequency}</span>
                    </div>

                    {overdue && (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => !reminderSent[m.name] && sendMedReminder(m.name)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: reminderSent[m.name] ? 'rgba(0,122,68,0.10)' : '#ECEEF2',
                          border: `1px solid ${reminderSent[m.name] ? 'rgba(0,122,68,0.25)' : '#E3E6EC'}`,
                          borderRadius: '8px',
                          padding: '6px 12px',
                          cursor: reminderSent[m.name] ? 'default' : 'pointer',
                        }}
                      >
                        <Bell size={11} color={reminderSent[m.name] ? '#007A44' : '#5B6371'} />
                        <span style={{ color: reminderSent[m.name] ? '#007A44' : '#5B6371', fontSize: '11px', fontWeight: 600 }}>
                          {reminderSent[m.name] ? 'Reminder sent' : 'Send reminder'}
                        </span>
                      </motion.button>
                    )}
                  </div>
                )
              })}

              {(!patient.medications || patient.medications.length === 0) && (
                <p style={{ color: '#9AA2AD', fontSize: '13px' }}>No medications on file</p>
              )}
            </div>

            {/* Emergency history card */}
            {emergencies.length > 0 && (
              <div style={{ background: '#FFFFFF', border: '1px solid rgba(217,20,20,0.18)', borderRadius: '16px', padding: '18px' }}>
                <p style={{ color: 'rgba(217,20,20,0.7)', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '14px' }}>
                  Emergency history — {emergencies.length} events
                </p>
                {emergencies.slice(0, 5).map((e, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingBottom: '9px',
                      marginBottom: '9px',
                      borderBottom: i < Math.min(emergencies.length, 5) - 1 ? '1px solid #E9EBF0' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#D91414', flexShrink: 0 }} />
                      <span style={{ color: '#5B6371', fontSize: '12px' }}>{e.emergency_type?.replace('_', ' ')}</span>
                    </div>
                    <span style={{ color: '#9AA2AD', fontSize: '11px', fontFamily: 'monospace' }}>
                      {new Date(e.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* AI Summary card */}
            <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,122,68,0.18)', borderRadius: '16px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <span style={{ fontSize: '16px' }}>✦</span>
                <p style={{ color: '#007A44', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1.2px' }}>AI Summary</p>
              </div>

              {generatingSummary ? (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#007A44' }}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                  <p style={{ color: '#9AA2AD', fontSize: '12px', marginLeft: '4px' }}>Generating summary…</p>
                </div>
              ) : (
                <p style={{ color: '#0E1218', fontSize: '13px', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{aiSummary}</p>
              )}

              {!generatingSummary && !aiSummary && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => generateSummary(patient, checkins, emergencies)}
                  style={{ marginTop: '8px', background: '#0055FF', color: '#ffffff', fontWeight: 600, fontSize: '13px', padding: '10px 18px', borderRadius: '10px', border: 'none', cursor: 'pointer' }}
                >
                  Generate summary
                </motion.button>
              )}
            </div>

            {/* Emergency contacts card */}
            {patient.emergency_contacts?.length > 0 && (
              <div style={{ background: '#FFFFFF', border: '1px solid #E3E6EC', borderRadius: '16px', padding: '18px' }}>
                <p style={{ color: '#9AA2AD', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '14px' }}>Emergency contacts</p>
                {patient.emergency_contacts.map((c: any, i: number) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      paddingBottom: '12px',
                      marginBottom: '12px',
                      borderBottom: i < patient.emergency_contacts.length - 1 ? '1px solid #E9EBF0' : 'none',
                    }}
                  >
                    <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(0,85,255,0.12)', border: '1px solid rgba(0,85,255,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0055FF', fontWeight: 700, fontSize: '14px', flexShrink: 0 }}>
                      {c.name?.[0]}
                    </div>
                    <div>
                      <p style={{ color: '#0E1218', fontSize: '13px', fontWeight: 600, margin: 0 }}>{c.name}</p>
                      <p style={{ color: '#9AA2AD', fontSize: '11px', margin: 0, marginTop: '2px' }}>{c.relationship} · {c.phone}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CHECK-INS TAB */}
        {tab === 'checkins' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {checkins.length === 0 && (
              <p style={{ color: '#9AA2AD', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>No check-ins yet</p>
            )}
            {checkins.map((c, i) => (
              <div
                key={i}
                style={{ background: '#FFFFFF', border: '1px solid #E3E6EC', borderRadius: '16px', padding: '16px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(0,122,68,0.10)', border: '1px solid rgba(0,122,68,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check size={14} color="#007A44" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: '#0E1218', fontSize: '12px', fontWeight: 700, margin: 0 }}>Check-in completed</p>
                    <p style={{ color: '#9AA2AD', fontSize: '10px', fontFamily: 'monospace', margin: 0, marginTop: '2px' }}>
                      {new Date(c.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Clinical summary lines */}
                <div style={{ background: '#FFFFFF', borderRadius: '10px', padding: '12px', marginTop: '4px' }}>
                  <p style={{ color: '#9AA2AD', fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '8px' }}>Clinical summary</p>
                  {c.summary?.split('\n').filter((s: string) => s.trim().length > 5).slice(0, 7).map((line: string, j: number) => (
                    <div key={j} style={{ display: 'flex', gap: '8px', marginBottom: '5px' }}>
                      <span style={{ color: '#0055FF', fontSize: '12px', flexShrink: 0, marginTop: '1px' }}>–</span>
                      <p style={{ color: '#5B6371', fontSize: '12px', lineHeight: 1.6, margin: 0 }}>{line.trim().replace(/^[•\-\*]\s*/, '')}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* NOTES TAB */}
        {tab === 'notes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Add note input */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E3E6EC', borderRadius: '16px', padding: '16px' }}>
              <p style={{ color: '#9AA2AD', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '12px' }}>Add note</p>
              <textarea
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Write a clinical note…"
                style={{ width: '100%', background: '#FFFFFF', border: '1px solid #D5D9E0', borderRadius: '12px', padding: '13px 14px', color: '#0E1218', fontSize: '13px', outline: 'none', resize: 'none', minHeight: '88px', lineHeight: 1.65, marginBottom: '12px', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={addNote}
                style={{ width: '100%', background: '#0055FF', color: '#ffffff', fontWeight: 700, fontSize: '14px', padding: '13px', borderRadius: '12px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Send size={14} />
                Save note
              </motion.button>
            </div>

            {/* Existing notes */}
            {notes.map((note, i) => (
              <div
                key={i}
                style={{ background: '#FFFFFF', border: '1px solid #E3E6EC', borderRadius: '14px', padding: '14px 16px' }}
              >
                <p style={{ color: '#9AA2AD', fontSize: '10px', fontFamily: 'monospace', marginBottom: '8px' }}>
                  {new Date(note.created_at).toLocaleString()}
                </p>
                <p style={{ color: '#0E1218', fontSize: '13px', lineHeight: 1.65 }}>{note.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* APPOINTMENTS TAB */}
        {tab === 'appointments' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {appointments.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Calendar size={32} color="#9AA2AD" style={{ margin: '0 auto 12px' }} />
                <p style={{ color: '#9AA2AD', fontSize: '13px' }}>No appointments yet</p>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setAppointmentType('scheduled'); setShowSchedule(true) }}
                  style={{ marginTop: '16px', background: '#0055FF', color: '#ffffff', fontWeight: 600, fontSize: '13px', padding: '11px 22px', borderRadius: '12px', border: 'none', cursor: 'pointer' }}
                >
                  Schedule first appointment
                </motion.button>
              </div>
            )}

            {appointments.map((appt, i) => {
              const joinable = isJoinable(appt)
              const statusColor = appt.status === 'confirmed' ? '#007A44'
                : appt.status === 'declined' ? '#D91414'
                : appt.status === 'completed' ? '#0055FF'
                : '#B45309'
              const statusBg = appt.status === 'confirmed' ? 'rgba(0,122,68,0.08)'
                : appt.status === 'declined' ? 'rgba(217,20,20,0.08)'
                : appt.status === 'completed' ? 'rgba(0,85,255,0.08)'
                : 'rgba(180,83,9,0.08)'
              const borderColor = appt.status === 'confirmed' ? 'rgba(0,122,68,0.20)'
                : appt.status === 'declined' ? 'rgba(217,20,20,0.18)'
                : appt.status === 'completed' ? 'rgba(0,85,255,0.18)'
                : 'rgba(180,83,9,0.20)'

              return (
                <div
                  key={i}
                  style={{
                    background: joinable ? 'rgba(0,85,255,0.07)' : statusBg,
                    border: `1px solid ${joinable ? 'rgba(0,85,255,0.30)' : borderColor}`,
                    borderRadius: '16px',
                    padding: '16px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ color: appt.type === 'immediate' ? '#D91414' : '#0055FF', fontSize: '13px', fontWeight: 700 }}>
                      {appt.type === 'immediate' ? 'Immediate call' : 'Scheduled visit'}
                    </span>
                    <span style={{ color: statusColor, fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', fontWeight: 600 }}>
                      {appt.status}
                    </span>
                  </div>

                  {appt.scheduled_at && (
                    <p style={{ color: '#5B6371', fontSize: '12px', marginBottom: '4px' }}>
                      {parseTS(appt.scheduled_at).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </p>
                  )}

                  {(appt.notes || appt.patient_concern) && (
                    <p style={{ color: '#9AA2AD', fontSize: '12px', marginBottom: '12px', lineHeight: 1.5 }}>
                      {appt.notes || appt.patient_concern}
                    </p>
                  )}

                  {/* Pending actions */}
                  {appt.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => confirmAppointment(appt.id)}
                        style={{ flex: 1, background: 'rgba(0,122,68,0.10)', border: '1px solid rgba(0,122,68,0.22)', borderRadius: '10px', padding: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}
                      >
                        <Check size={13} color="#007A44" />
                        <span style={{ color: '#007A44', fontSize: '12px', fontWeight: 700 }}>Confirm</span>
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => { setReschedulingAppt(appt); setRescheduleDate(''); setRescheduleTime('09:00') }}
                        style={{ flex: 1, background: 'rgba(0,85,255,0.08)', border: '1px solid rgba(0,85,255,0.18)', borderRadius: '10px', padding: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      >
                        <span style={{ color: '#0055FF', fontSize: '12px', fontWeight: 700 }}>Reschedule</span>
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => declineAppointment(appt.id)}
                        style={{ width: '40px', background: 'rgba(217,20,20,0.08)', border: '1px solid rgba(217,20,20,0.18)', borderRadius: '10px', padding: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                      >
                        <X size={13} color="#D91414" />
                      </motion.button>
                    </div>
                  )}

                  {/* Confirmed but not yet joinable — show reschedule option */}
                  {appt.status === 'confirmed' && !joinable && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { setReschedulingAppt(appt); setRescheduleDate(''); setRescheduleTime('09:00') }}
                      style={{ marginTop: '12px', background: '#ECEEF2', border: '1px solid #D5D9E0', borderRadius: '10px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                    >
                      <span style={{ color: '#5B6371', fontSize: '12px', fontWeight: 600 }}>Reschedule</span>
                    </motion.button>
                  )}

                  {/* Joinable — show video call button */}
                  {joinable && (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setActiveCall(appt)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#0055FF', borderRadius: '10px', padding: '12px', color: '#ffffff', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer', marginTop: '12px' }}
                    >
                      <Video size={15} />
                      Join video call
                    </motion.button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Schedule sheet */}
      <AnimatePresence>
        {showSchedule && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(14,18,24,0.45)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}
            onClick={e => { if (e.target === e.currentTarget) setShowSchedule(false) }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', bounce: 0.1 }}
              style={{ background: '#FFFFFF', border: '1px solid #E3E6EC', borderRadius: '24px 24px 0 0', padding: '24px 20px 52px', width: '100%', maxHeight: '88vh', overflowY: 'auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
                <p style={{ color: '#0E1218', fontWeight: 700, fontSize: '18px', letterSpacing: '-0.3px' }}>Schedule appointment</p>
                <button
                  onClick={() => setShowSchedule(false)}
                  style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ECEEF2', border: '1px solid #D5D9E0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={15} color="#5B6371" />
                </button>
              </div>

              {/* Calendar picker */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E3E6EC', borderRadius: '16px', padding: '16px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <button
                    onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) } else setCalMonth(m => m - 1) }}
                    style={{ background: '#ECEEF2', border: '1px solid #D5D9E0', borderRadius: '8px', cursor: 'pointer', color: '#5B6371', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <p style={{ color: '#0E1218', fontWeight: 600, fontSize: '14px' }}>{monthName}</p>
                  <button
                    onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) } else setCalMonth(m => m + 1) }}
                    style={{ background: '#ECEEF2', border: '1px solid #D5D9E0', borderRadius: '8px', cursor: 'pointer', color: '#5B6371', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>

                {/* Day headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '8px' }}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <p key={i} style={{ color: '#9AA2AD', fontSize: '11px', textAlign: 'center', fontFamily: 'monospace', margin: 0 }}>{d}</p>
                  ))}
                </div>

                {/* Day grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
                  {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1
                    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                    const isSelected = selectedDate === dateStr
                    const isPast = new Date(dateStr) < new Date(today.toDateString())
                    return (
                      <button
                        key={day}
                        onClick={() => !isPast && setSelectedDate(dateStr)}
                        disabled={isPast}
                        style={{
                          padding: '8px 0',
                          borderRadius: '8px',
                          border: 'none',
                          cursor: isPast ? 'default' : 'pointer',
                          fontSize: '13px',
                          background: isSelected ? '#0055FF' : 'transparent',
                          color: isSelected ? '#ffffff' : isPast ? '#9AA2AD' : '#0E1218',
                          fontWeight: isSelected ? 700 : 400,
                        }}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Time picker */}
              {selectedDate && (
                <div style={{ background: '#FFFFFF', border: '1px solid #E3E6EC', borderRadius: '16px', padding: '14px', marginBottom: '12px' }}>
                  <p style={{ color: '#9AA2AD', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '10px' }}>Select time</p>
                  <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                    {times.map(t => (
                      <button
                        key={t}
                        onClick={() => setSelectedTime(t)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '20px',
                          border: selectedTime === t ? '1px solid rgba(0,85,255,0.40)' : '1px solid #E3E6EC',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          background: selectedTime === t ? 'rgba(0,85,255,0.18)' : '#ECEEF2',
                          color: selectedTime === t ? '#0055FF' : '#5B6371',
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Reason textarea */}
              <textarea
                value={appointmentConcern}
                onChange={e => setAppointmentConcern(e.target.value)}
                placeholder="Reason for appointment…"
                style={{ width: '100%', background: '#FFFFFF', border: '1px solid #D5D9E0', borderRadius: '12px', padding: '14px 16px', color: '#0E1218', fontSize: '14px', outline: 'none', resize: 'none', minHeight: '72px', marginBottom: '14px', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.55 }}
              />

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={scheduleAppointment}
                disabled={!selectedDate}
                style={{ width: '100%', background: selectedDate ? '#0055FF' : '#ECEEF2', color: selectedDate ? '#ffffff' : '#9AA2AD', fontWeight: 700, fontSize: '15px', padding: '16px', borderRadius: '12px', border: 'none', cursor: selectedDate ? 'pointer' : 'default', transition: 'background 0.15s' }}
              >
                {selectedDate ? `Confirm for ${selectedDate} at ${selectedTime}` : 'Select a date to continue'}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
