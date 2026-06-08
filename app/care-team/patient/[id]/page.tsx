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

    const meetingRoomId = ([1e7]as any+(-1e3)+(-4e3)+(-8e3)+(-1e11)).replace(/[018]/g,(c:any)=>(c^(Math.random()*16>>c/4)).toString(16))
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
  const priorityColor = score >= 8 ? '#FF4A42' : score >= 5 ? '#fcb546' : '#80EF80'

  if (loading || !patient) return (
    <div style={{ minHeight: '100vh', background: '#060610', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>Loading...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#060610', paddingBottom: '40px' }}>

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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 150, display: 'flex', alignItems: 'flex-end' }}
            onClick={e => { if (e.target === e.currentTarget) setReschedulingAppt(null) }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              style={{ background: '#111116', borderRadius: '24px 24px 0 0', padding: '24px 20px 48px', width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <p style={{ color: 'white', fontWeight: 700, fontSize: '18px' }}>Reschedule appointment</p>
                <button onClick={() => setReschedulingAppt(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={20} color="rgba(255,255,255,0.4)" />
                </button>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>New date</p>
              <input type="date" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                style={{ width: '100%', background: '#18181F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '13px 16px', color: 'white', fontSize: '14px', outline: 'none', marginBottom: '12px' }} />
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>New time</p>
              <input type="time" value={rescheduleTime} onChange={e => setRescheduleTime(e.target.value)}
                style={{ width: '100%', background: '#18181F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '13px 16px', color: 'white', fontSize: '14px', outline: 'none', marginBottom: '20px' }} />
              <motion.button whileTap={{ scale: 0.97 }} onClick={rescheduleAppointment}
                disabled={!rescheduleDate}
                style={{ width: '100%', background: rescheduleDate ? '#4A9EF5' : 'rgba(255,255,255,0.08)', color: rescheduleDate ? 'white' : 'rgba(255,255,255,0.3)', fontWeight: 700, fontSize: '15px', padding: '16px', borderRadius: '14px', border: 'none', cursor: rescheduleDate ? 'pointer' : 'default' }}>
                Confirm reschedule
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={{ padding: '56px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => router.push('/care-team/dashboard')}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={16} color="rgba(255,255,255,0.6)"/>
          </motion.button>
          <div style={{ flex: 1 }}>
            <h1 style={{ color: 'white', fontWeight: 700, fontSize: '20px' }}>{patient.full_name}</h1>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>{patient.diagnosis}</p>
          </div>
          <div style={{ background: `${priorityColor}15`, border: `1px solid ${priorityColor}30`, borderRadius: '12px', padding: '6px 12px', textAlign: 'center' }}>
            <p style={{ color: priorityColor, fontWeight: 800, fontSize: '20px', lineHeight: 1 }}>{score || '—'}</p>
            <p style={{ color: `${priorityColor}70`, fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px' }}>Priority</p>
          </div>
        </div>

        {/* Active emergency banner */}
        {emergencies.find(e => e.status === 'active') && (() => {
          const em = emergencies.find(e => e.status === 'active')!
          const typeLabel = (em.emergency_type || 'emergency').replace(/_/g, ' ')
          return (
            <motion.div
              animate={{ opacity: [1, 0.75, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              style={{ background: 'linear-gradient(135deg, rgba(196,32,32,0.2), rgba(220,38,38,0.1))', border: '1.5px solid rgba(220,38,38,0.4)', borderRadius: '16px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}
            >
              <AlertTriangle size={20} color="#FF4A42" style={{ flexShrink: 0 }}/>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#FF4A42', fontWeight: 800, fontSize: '14px', letterSpacing: '-0.2px' }}>Active Emergency</p>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '12px', marginTop: '2px' }}>{typeLabel} · {new Date(em.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.8, repeat: Infinity }}
                style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF4A42', flexShrink: 0 }}/>
            </motion.div>
          )
        })()}

        {/* Schedule button */}
        <motion.button whileTap={{ scale: 0.97 }}
          onClick={() => { setAppointmentType('scheduled'); setShowSchedule(true) }}
          style={{ width: '100%', background: 'rgba(74,158,245,0.12)', border: '1px solid rgba(74,158,245,0.25)', borderRadius: '14px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}>
          <Calendar size={14} color="#4A9EF5"/>
          <span style={{ color: '#4A9EF5', fontWeight: 600, fontSize: '13px' }}>Schedule appointment</span>
        </motion.button>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '6px', marginTop: '14px', overflowX: 'auto', paddingBottom: '2px' }}>
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'checkins', label: 'Check-ins' },
            { id: 'notes', label: 'Notes' },
            { id: 'appointments', label: 'Appointments' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap',
                background: tab === t.id ? 'rgba(74,158,245,0.15)' : 'rgba(255,255,255,0.06)',
                color: tab === t.id ? '#4A9EF5' : 'rgba(255,255,255,0.4)'
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px' }}>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Patient info */}
            <div style={{ background: '#111116', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '16px' }}>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Patient info</p>
              {[
                { label: 'Phone', value: patient.phone },
                { label: 'Date of birth', value: patient.date_of_birth },
                { label: 'Cardiologist', value: patient.cardiologist },
                { label: 'Surgery date', value: patient.surgery_date },
                { label: 'Allergies', value: patient.allergies, red: true },
                { label: 'Conditions', value: patient.diagnosis },
              ].filter(i => i.value).map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>{item.label}</span>
                  <span style={{ color: (item as any).red ? '#FF4A42' : 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 500, maxWidth: '60%', textAlign: 'right' }}>{item.value}</span>
                </div>
              ))}
            </div>

            {/* Medications */}
            <div style={{ background: '#111116', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Pill size={12} color="rgba(255,255,255,0.3)"/>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px' }}>Medications</p>
              </div>
              {patient.medications?.map((m: any, i: number) => {
                const overdue = isOverdueMed(m)
                return (
                  <div key={i} style={{ paddingBottom: '10px', marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: overdue ? '6px' : 0 }}>
                      <p style={{ color: overdue ? '#FF4A42' : 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: overdue ? 600 : 400 }}>{m.name}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', fontFamily: 'monospace' }}>{m.dose} · {m.frequency}</span>
                        {overdue && (
                          <span style={{ background: 'rgba(255,74,66,0.15)', border: '1px solid rgba(255,74,66,0.3)', color: '#FF4A42', fontSize: '8px', padding: '1px 5px', borderRadius: '4px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.5px' }}>OVERDUE</span>
                        )}
                      </div>
                    </div>
                    {overdue && (
                      <motion.button whileTap={{ scale: 0.95 }}
                        onClick={() => !reminderSent[m.name] && sendMedReminder(m.name)}
                        style={{ display: 'flex', alignItems: 'center', gap: '5px', background: reminderSent[m.name] ? 'rgba(128,239,128,0.08)' : 'rgba(252,181,70,0.1)', border: `1px solid ${reminderSent[m.name] ? 'rgba(128,239,128,0.2)' : 'rgba(252,181,70,0.25)'}`, borderRadius: '8px', padding: '5px 10px', cursor: reminderSent[m.name] ? 'default' : 'pointer' }}>
                        <Bell size={11} color={reminderSent[m.name] ? '#80EF80' : '#fcb546'}/>
                        <span style={{ color: reminderSent[m.name] ? '#80EF80' : '#fcb546', fontSize: '11px', fontWeight: 600 }}>
                          {reminderSent[m.name] ? 'Reminder sent' : 'Send notification'}
                        </span>
                      </motion.button>
                    )}
                  </div>
                )
              })}
              {(!patient.medications || patient.medications.length === 0) && (
                <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '13px' }}>No medications</p>
              )}
            </div>

            {/* Emergency history */}
            {emergencies.length > 0 && (
              <div style={{ background: '#111116', border: '1px solid rgba(255,74,66,0.15)', borderRadius: '16px', padding: '16px' }}>
                <p style={{ color: 'rgba(255,74,66,0.7)', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
                  Emergency history — {emergencies.length} events
                </p>
                {emergencies.slice(0, 5).map((e, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>{e.emergency_type?.replace('_', ' ')}</span>
                    <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', fontFamily: 'monospace' }}>{new Date(e.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}

            {/* AI Summary */}
            <div style={{ background: '#111116', border: '1px solid rgba(74,158,245,0.2)', borderRadius: '16px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: '14px' }}>🤖</span>
                <p style={{ color: '#4A9EF5', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px' }}>AI Summary</p>
              </div>
              {generatingSummary ? (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {[0,1,2].map(i => (
                    <motion.div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4A9EF5' }}
                      animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}/>
                  ))}
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginLeft: '4px' }}>Generating...</p>
                </div>
              ) : (
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{aiSummary}</p>
              )}
            </div>

            {/* Emergency contacts */}
            <div style={{ background: '#111116', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '16px' }}>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Emergency contacts</p>
              {patient.emergency_contacts?.map((c: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '10px', marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(74,158,245,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4A9EF5', fontWeight: 700, fontSize: '13px' }}>
                    {c.name?.[0]}
                  </div>
                  <div>
                    <p style={{ color: 'white', fontSize: '13px', fontWeight: 500 }}>{c.name}</p>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{c.relationship} · {c.phone}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CHECK-INS */}
        {tab === 'checkins' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {checkins.length === 0 && (
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px', textAlign: 'center', padding: '32px 0' }}>No check-ins yet</p>
            )}
            {checkins.map((c, i) => (
              <div key={i} style={{ background: '#111116', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(128,239,128,0.12)', border: '1px solid rgba(128,239,128,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check size={14} color="#80EF80"/>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: 'white', fontSize: '12px', fontWeight: 600 }}>Check-in completed</p>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontFamily: 'monospace' }}>
                      {new Date(c.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Structured clinical summary */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Clinical summary</p>
                  {c.summary?.split('\n').filter((s: string) => s.trim().length > 5).slice(0, 7).map((line: string, j: number) => (
                    <div key={j} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ color: '#4A9EF5', fontSize: '12px', flexShrink: 0, marginTop: '1px' }}>•</span>
                      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', lineHeight: 1.5 }}>{line.trim().replace(/^[•\-\*]\s*/, '')}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* NOTES */}
        {tab === 'notes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: '#111116', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '16px' }}>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Add note</p>
              <textarea value={newNote} onChange={e => setNewNote(e.target.value)}
                placeholder="Write a clinical note..."
                style={{ width: '100%', background: '#18181F', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px 14px', color: 'white', fontSize: '13px', outline: 'none', resize: 'none', minHeight: '80px', lineHeight: 1.6, marginBottom: '10px' }}/>
              <motion.button whileTap={{ scale: 0.97 }} onClick={addNote}
                style={{ width: '100%', background: '#4A9EF5', color: 'white', fontWeight: 600, fontSize: '14px', padding: '12px', borderRadius: '12px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Send size={14}/> Save note
              </motion.button>
            </div>

            {notes.map((note, i) => (
              <div key={i} style={{ background: '#111116', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '14px' }}>
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', fontFamily: 'monospace', marginBottom: '6px' }}>
                  {new Date(note.created_at).toLocaleString()}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', lineHeight: 1.6 }}>{note.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* APPOINTMENTS */}
        {tab === 'appointments' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {appointments.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <Calendar size={32} color="rgba(255,255,255,0.1)" style={{ margin: '0 auto 12px' }}/>
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px' }}>No appointments yet</p>
              </div>
            )}
            {appointments.map((appt, i) => {
              const joinable = isJoinable(appt)
              return (
                <div key={i} style={{ background: joinable ? 'rgba(74,158,245,0.06)' : '#111116', border: `1px solid ${joinable ? 'rgba(74,158,245,0.25)' : appt.status === 'confirmed' ? 'rgba(128,239,128,0.2)' : appt.status === 'declined' ? 'rgba(255,74,66,0.15)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '14px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ color: appt.type === 'immediate' ? '#FF4A42' : '#4A9EF5', fontSize: '13px', fontWeight: 600 }}>
                      {appt.type === 'immediate' ? '🚨 Immediate call' : '📅 Scheduled visit'}
                    </span>
                    <span style={{
                      color: appt.status === 'confirmed' ? '#80EF80' : appt.status === 'declined' ? '#FF4A42' : '#fcb546',
                      fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase'
                    }}>
                      {appt.status}
                    </span>
                  </div>
                  {appt.scheduled_at && (
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginBottom: '4px' }}>
                      {parseTS(appt.scheduled_at).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </p>
                  )}
                  {(appt.notes || appt.patient_concern) && (
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', marginBottom: '10px' }}>
                      {appt.notes || appt.patient_concern}
                    </p>
                  )}
                  {appt.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => confirmAppointment(appt.id)}
                        style={{ flex: 1, background: 'rgba(128,239,128,0.12)', border: '1px solid rgba(128,239,128,0.25)', borderRadius: '10px', padding: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}>
                        <Check size={13} color="#80EF80"/>
                        <span style={{ color: '#80EF80', fontSize: '12px', fontWeight: 600 }}>Confirm</span>
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setReschedulingAppt(appt); setRescheduleDate(''); setRescheduleTime('09:00') }}
                        style={{ flex: 1, background: 'rgba(74,158,245,0.1)', border: '1px solid rgba(74,158,245,0.2)', borderRadius: '10px', padding: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <span style={{ color: '#4A9EF5', fontSize: '12px', fontWeight: 600 }}>Reschedule</span>
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => declineAppointment(appt.id)}
                        style={{ width: '40px', background: 'rgba(255,74,66,0.08)', border: '1px solid rgba(255,74,66,0.2)', borderRadius: '10px', padding: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                        <X size={13} color="#FF4A42"/>
                      </motion.button>
                    </div>
                  )}
                  {appt.status === 'confirmed' && !joinable && (
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setReschedulingAppt(appt); setRescheduleDate(''); setRescheduleTime('09:00') }}
                      style={{ marginTop: '10px', background: 'rgba(74,158,245,0.08)', border: '1px solid rgba(74,158,245,0.18)', borderRadius: '10px', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <span style={{ color: '#4A9EF5', fontSize: '12px', fontWeight: 600 }}>Reschedule</span>
                    </motion.button>
                  )}
                  {joinable && (
                    <motion.button whileTap={{ scale: 0.97 }} onClick={() => setActiveCall(appt)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#4A9EF5', borderRadius: '10px', padding: '11px', color: 'white', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer', marginTop: '10px' }}>
                      <Video size={14}/>
                      Join call
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}
            onClick={e => { if (e.target === e.currentTarget) setShowSchedule(false) }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', bounce: 0.1 }}
              style={{ background: '#111116', borderRadius: '24px 24px 0 0', padding: '24px 20px 48px', width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <p style={{ color: 'white', fontWeight: 700, fontSize: '18px' }}>Schedule appointment</p>
                <button onClick={() => setShowSchedule(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}>
                  <X size={20}/>
                </button>
              </div>

              {(
                <>
                  {/* Calendar */}
                  <div style={{ background: '#18181F', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '16px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1) } else setCalMonth(m => m-1) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '18px', padding: '4px 8px' }}>‹</button>
                      <p style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>{monthName}</p>
                      <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1) } else setCalMonth(m => m+1) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '18px', padding: '4px 8px' }}>›</button>
                    </div>

                    {/* Day headers */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '8px' }}>
                      {['S','M','T','W','T','F','S'].map((d, i) => (
                        <p key={i} style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', textAlign: 'center', fontFamily: 'monospace' }}>{d}</p>
                      ))}
                    </div>

                    {/* Days grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                      {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`}/>)}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1
                        const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
                        const isSelected = selectedDate === dateStr
                        const isPast = new Date(dateStr) < new Date(today.toDateString())
                        return (
                          <button key={day} onClick={() => !isPast && setSelectedDate(dateStr)} disabled={isPast}
                            style={{ padding: '8px 0', borderRadius: '8px', border: 'none', cursor: isPast ? 'default' : 'pointer', fontSize: '13px',
                              background: isSelected ? '#4A9EF5' : 'transparent',
                              color: isSelected ? 'white' : isPast ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.7)',
                              fontWeight: isSelected ? 700 : 400
                            }}>
                            {day}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Time scroll */}
                  {selectedDate && (
                    <div style={{ background: '#18181F', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '14px', marginBottom: '12px' }}>
                      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Select time</p>
                      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                        {times.map(t => (
                          <button key={t} onClick={() => setSelectedTime(t)}
                            style={{ padding: '8px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
                              background: selectedTime === t ? '#4A9EF5' : 'rgba(255,255,255,0.06)',
                              color: selectedTime === t ? 'white' : 'rgba(255,255,255,0.5)'
                            }}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <textarea value={appointmentConcern} onChange={e => setAppointmentConcern(e.target.value)}
                placeholder="Reason for appointment..."
                style={{ width: '100%', background: '#18181F', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '14px 16px', color: 'white', fontSize: '14px', outline: 'none', resize: 'none', minHeight: '70px', marginBottom: '12px' }}/>

              <motion.button whileTap={{ scale: 0.97 }} onClick={scheduleAppointment}
                disabled={!selectedDate}
                style={{ width: '100%', background: '#4A9EF5', color: 'white', fontWeight: 700, fontSize: '15px', padding: '16px', borderRadius: '14px', border: 'none', cursor: 'pointer', opacity: !selectedDate ? 0.5 : 1 }}>
                {`Confirm for ${selectedDate ? `${selectedDate} at ${selectedTime}` : '...'}`}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
