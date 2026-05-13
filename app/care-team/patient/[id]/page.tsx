'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowLeft, Phone, Calendar, Send, X, Check, AlertTriangle } from 'lucide-react'
import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY!,
  dangerouslyAllowBrowser: true
})

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

      const [{ data: p }, { data: c }, { data: e }, { data: n }, { data: a }, { data: s }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', patientId).single(),
        supabase.from('checkins').select('*').eq('user_id', patientId).order('created_at', { ascending: false }),
        supabase.from('emergencies').select('*').eq('user_id', patientId).order('created_at', { ascending: false }),
        supabase.from('patient_notes').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
        supabase.from('appointments').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
        supabase.from('patient_summaries').select('*').eq('patient_id', patientId).single()
      ])

      setPatient(p)
      setCheckins(c || [])
      setEmergencies(e || [])
      setNotes(n || [])
      setAppointments(a || [])
      setSummary(s)
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

    const { data, error } = await supabase.from('appointments').insert({
      patient_id: patientId,
      care_team_id: careTeamMember?.id,
      type: appointmentType,
      status: 'confirmed',
      scheduled_at: scheduledAt,
      notes: appointmentConcern
    }).select().single()

    if (!error && data) {
      setAppointments(prev => [data, ...prev])
      setShowSchedule(false)
      toast.success(appointmentType === 'immediate' ? 'Immediate call scheduled' : 'Appointment confirmed')
    }
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

        {/* Call + Schedule buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <motion.button whileTap={{ scale: 0.97 }}
            onClick={() => { setAppointmentType('immediate'); setShowSchedule(true) }}
            style={{ background: 'rgba(232,50,42,0.12)', border: '1px solid rgba(232,50,42,0.25)', borderRadius: '14px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}>
            <Phone size={14} color="#FF4A42"/>
            <span style={{ color: '#FF4A42', fontWeight: 600, fontSize: '13px' }}>Call now</span>
          </motion.button>
          <motion.button whileTap={{ scale: 0.97 }}
            onClick={() => { setAppointmentType('scheduled'); setShowSchedule(true) }}
            style={{ background: 'rgba(74,158,245,0.12)', border: '1px solid rgba(74,158,245,0.25)', borderRadius: '14px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}>
            <Calendar size={14} color="#4A9EF5"/>
            <span style={{ color: '#4A9EF5', fontWeight: 600, fontSize: '13px' }}>Schedule</span>
          </motion.button>
        </div>

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
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Medications</p>
              {patient.medications?.map((m: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>{m.name}</p>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', fontFamily: 'monospace' }}>{m.dose} · {m.frequency}</span>
                </div>
              ))}
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

                {/* Bullet points from summary */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>What was discussed</p>
                  {c.summary?.split(/[.!?]/).filter((s: string) => s.trim().length > 10).slice(0, 4).map((sentence: string, j: number) => (
                    <div key={j} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ color: '#4A9EF5', fontSize: '12px', flexShrink: 0, marginTop: '1px' }}>•</span>
                      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', lineHeight: 1.5 }}>{sentence.trim()}</p>
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
            {appointments.map((appt, i) => (
              <div key={i} style={{ background: '#111116', border: `1px solid ${appt.status === 'confirmed' ? 'rgba(128,239,128,0.2)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '14px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ color: appt.type === 'immediate' ? '#FF4A42' : '#4A9EF5', fontSize: '13px', fontWeight: 600 }}>
                    {appt.type === 'immediate' ? '🚨 Immediate call' : '📅 Scheduled visit'}
                  </span>
                  <span style={{ color: appt.status === 'confirmed' ? '#80EF80' : '#fcb546', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase' }}>
                    {appt.status}
                  </span>
                </div>
                {appt.scheduled_at && (
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginBottom: '4px' }}>
                    {new Date(appt.scheduled_at).toLocaleString()}
                  </p>
                )}
                {appt.notes && <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>{appt.notes}</p>}
              </div>
            ))}
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
                <p style={{ color: 'white', fontWeight: 700, fontSize: '18px' }}>
                  {appointmentType === 'immediate' ? 'Schedule immediate call' : 'Schedule appointment'}
                </p>
                <button onClick={() => setShowSchedule(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}>
                  <X size={20}/>
                </button>
              </div>

              {/* Type toggle */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                {(['immediate', 'scheduled'] as const).map(t => (
                  <button key={t} onClick={() => setAppointmentType(t)}
                    style={{ flex: 1, padding: '10px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                      background: appointmentType === t ? (t === 'immediate' ? 'rgba(232,50,42,0.2)' : 'rgba(74,158,245,0.2)') : 'rgba(255,255,255,0.06)',
                      color: appointmentType === t ? (t === 'immediate' ? '#FF4A42' : '#4A9EF5') : 'rgba(255,255,255,0.4)'
                    }}>
                    {t === 'immediate' ? '🚨 Right now' : '📅 Schedule'}
                  </button>
                ))}
              </div>

              {appointmentType === 'scheduled' && (
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
                disabled={appointmentType === 'scheduled' && !selectedDate}
                style={{ width: '100%', background: appointmentType === 'immediate' ? '#DC2626' : '#4A9EF5', color: 'white', fontWeight: 700, fontSize: '15px', padding: '16px', borderRadius: '14px', border: 'none', cursor: 'pointer', opacity: appointmentType === 'scheduled' && !selectedDate ? 0.5 : 1 }}>
                {appointmentType === 'immediate' ? 'Schedule immediate call' : `Confirm for ${selectedDate ? `${selectedDate} at ${selectedTime}` : '...'}`}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
