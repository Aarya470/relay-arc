'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Send } from 'lucide-react'
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
  const [medLogs, setMedLogs] = useState<any[]>([])
  const [emergencies, setEmergencies] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [appointments, setAppointments] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [careTeamMember, setCareTeamMember] = useState<any>(null)
  const [tab, setTab] = useState('overview')
  const [newNote, setNewNote] = useState('')
  const [noteType, setNoteType] = useState('care_team_note')
  const [showSchedule, setShowSchedule] = useState(false)
  const [appointmentType, setAppointmentType] = useState<'immediate' | 'scheduled'>('immediate')
  const [appointmentDate, setAppointmentDate] = useState('')
  const [appointmentConcern, setAppointmentConcern] = useState('')
  const [loading, setLoading] = useState(true)
  const [aiSummary, setAiSummary] = useState('')
  const [generatingSummary, setGeneratingSummary] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/care-team/login'); return }

      const { data: member } = await supabase.from('care_team_members').select('*').eq('id', user.id).single()
      setCareTeamMember(member)

      const [{ data: p }, { data: c }, { data: ml }, { data: e }, { data: n }, { data: a }, { data: s }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', patientId).single(),
        supabase.from('checkins').select('*').eq('user_id', patientId).order('created_at', { ascending: false }),
        supabase.from('medication_logs').select('*').eq('user_id', patientId).order('taken_at', { ascending: false }),
        supabase.from('emergencies').select('*').eq('user_id', patientId).order('created_at', { ascending: false }),
        supabase.from('patient_notes').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
        supabase.from('appointments').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
        supabase.from('patient_summaries').select('*').eq('patient_id', patientId).single()
      ])

      setPatient(p)
      setCheckins(c || [])
      setMedLogs(ml || [])
      setEmergencies(e || [])
      setNotes(n || [])
      setAppointments(a || [])
      setSummary(s)
      setLoading(false)
    }
    load()
  }, [patientId])

  const generateFullSummary = async () => {
    setGeneratingSummary(true)
    const prompt = `Generate a comprehensive clinical summary for a care team member.

Patient: ${patient?.full_name}
Conditions: ${patient?.diagnosis}
Medications: ${JSON.stringify(patient?.medications)}
Allergies: ${patient?.allergies}
Surgery date: ${patient?.surgery_date || 'N/A'}

Recent check-ins (${checkins.length} total):
${checkins.slice(0, 5).map(c => `- ${new Date(c.created_at).toLocaleDateString()}: ${c.summary}`).join('\n')}

Medication adherence: ${medLogs.length} doses logged
Recent doses:
${medLogs.slice(0, 5).map(m => `- ${m.medication_name} ${m.dose} at ${new Date(m.taken_at).toLocaleString()}`).join('\n')}

Emergency events: ${emergencies.length}
${emergencies.slice(0, 3).map(e => `- ${e.emergency_type} on ${new Date(e.created_at).toLocaleDateString()}`).join('\n')}

Care team notes:
${notes.slice(0, 3).map(n => `- ${n.content}`).join('\n')}

Write a thorough clinical summary including:
1. Patient overview and current status
2. Symptom patterns from check-ins
3. Medication adherence assessment
4. Emergency history
5. Key concerns and recommendations
6. Suggested action items for the care team`

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
      note_type: noteType,
      content: newNote
    }).select().single()

    if (!error && data) {
      setNotes(prev => [data, ...prev])
      setNewNote('')
      toast.success('Note saved')
    }
  }

  const scheduleAppointment = async () => {
    const { data, error } = await supabase.from('appointments').insert({
      patient_id: patientId,
      care_team_id: careTeamMember?.id,
      type: appointmentType,
      status: 'confirmed',
      scheduled_at: appointmentType === 'scheduled' ? appointmentDate : new Date().toISOString(),
      notes: appointmentConcern
    }).select().single()

    if (!error && data) {
      setAppointments(prev => [data, ...prev])
      setShowSchedule(false)
      toast.success(appointmentType === 'immediate' ? 'Immediate call scheduled' : 'Appointment confirmed')
    }
  }

  const confirmAppointment = async (appointmentId: string) => {
    await supabase.from('appointments').update({ status: 'confirmed' }).eq('id', appointmentId)
    setAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, status: 'confirmed' } : a))
    toast.success('Appointment confirmed')
  }

  if (loading || !patient) return (
    <div style={{ minHeight: '100vh', background: '#060610', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>Loading patient...</p>
    </div>
  )

  const score = summary?.priority_score || 0
  const priorityColor = score >= 8 ? '#FF4A42' : score >= 5 ? '#fcb546' : '#80EF80'

  return (
    <div style={{ minHeight: '100vh', background: '#060610', paddingBottom: '32px' }}>

      {/* Header */}
      <div style={{ padding: '56px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => router.push('/care-team/dashboard')}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={16} color="rgba(255,255,255,0.6)"/>
          </motion.button>
          <div style={{ flex: 1 }}>
            <h1 style={{ color: 'white', fontWeight: 700, fontSize: '20px' }}>{patient.full_name}</h1>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', fontFamily: 'monospace' }}>{patient.diagnosis}</p>
          </div>
          <div style={{ background: `${priorityColor}15`, border: `1px solid ${priorityColor}30`, borderRadius: '12px', padding: '6px 12px', textAlign: 'center' }}>
            <p style={{ color: priorityColor, fontWeight: 800, fontSize: '20px', lineHeight: 1 }}>{score}</p>
            <p style={{ color: `${priorityColor}70`, fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px' }}>Priority</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
          {['overview', 'check-ins', 'medications', 'notes', 'appointments'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: '7px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, textTransform: 'capitalize', flexShrink: 0,
                background: tab === t ? 'rgba(74,158,245,0.15)' : 'rgba(255,255,255,0.06)',
                color: tab === t ? '#4A9EF5' : 'rgba(255,255,255,0.4)'
              }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '16px' }}>

        {/* Overview tab */}
        {tab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Patient info */}
            <div style={{ background: '#111116', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '16px' }}>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Patient info</p>
              {[
                { label: 'Conditions', value: patient.diagnosis },
                { label: 'Medications', value: patient.medications?.map((m: any) => m.name).join(', ') || 'None' },
                { label: 'Allergies', value: patient.allergies || 'None listed' },
                { label: 'Surgery date', value: patient.surgery_date || 'N/A' },
                { label: 'Phone', value: patient.phone || 'Not provided' },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', fontFamily: 'monospace', minWidth: '90px', flexShrink: 0 }}>{row.label}</p>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>{row.value}</p>
                </div>
              ))}
            </div>

            {/* AI summary */}
            {summary && (
              <div style={{ background: '#111116', border: `1px solid ${priorityColor}20`, borderRadius: '20px', padding: '16px' }}>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>AI assessment</p>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', lineHeight: '1.6', marginBottom: '8px' }}>{summary.summary}</p>
                {summary.priority_reason && (
                  <p style={{ color: priorityColor, fontSize: '11px', fontFamily: 'monospace' }}>↑ {summary.priority_reason}</p>
                )}
              </div>
            )}

            {/* Generate full summary */}
            <div style={{ background: '#111116', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: aiSummary ? '12px' : '0' }}>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px' }}>Full clinical summary</p>
                <motion.button whileTap={{ scale: 0.95 }} onClick={generateFullSummary} disabled={generatingSummary}
                  style={{ background: 'rgba(74,158,245,0.1)', border: '1px solid rgba(74,158,245,0.25)', color: '#4A9EF5', fontSize: '12px', padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', fontWeight: 600 }}>
                  {generatingSummary ? 'Generating...' : 'Generate'}
                </motion.button>
              </div>
              {aiSummary && (
                <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>{aiSummary}</p>
              )}
            </div>

            {/* Quick stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { icon: '📋', label: 'Check-ins', value: checkins.length, sub: `Last: ${checkins[0] ? new Date(checkins[0].created_at).toLocaleDateString() : 'Never'}` },
                { icon: '💊', label: 'Doses logged', value: medLogs.length, sub: 'Total recorded' },
                { icon: '🚨', label: 'Emergencies', value: emergencies.length, sub: 'SOS activations' },
                { icon: '📝', label: 'Notes', value: notes.length, sub: 'Care team notes' },
              ].map((stat, i) => (
                <div key={i} style={{ background: '#111116', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '14px' }}>
                  <span style={{ fontSize: '20px', display: 'block', marginBottom: '6px' }}>{stat.icon}</span>
                  <p style={{ color: 'white', fontWeight: 700, fontSize: '22px', lineHeight: 1 }}>{stat.value}</p>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', marginTop: '2px' }}>{stat.label}</p>
                  <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px', fontFamily: 'monospace', marginTop: '4px' }}>{stat.sub}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Check-ins tab */}
        {tab === 'check-ins' && (
          <div>
            {checkins.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: '40px 0', fontSize: '14px' }}>No check-ins yet</p>
            ) : checkins.map((c, i) => (
              <div key={i} style={{ background: '#111116', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '14px', marginBottom: '10px' }}>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontFamily: 'monospace', marginBottom: '8px' }}>
                  {new Date(c.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', lineHeight: '1.5' }}>{c.summary}</p>
                {c.flags && c.flags !== 'none' && (
                  <span style={{ display: 'inline-block', marginTop: '8px', background: 'rgba(255,74,66,0.1)', border: '1px solid rgba(255,74,66,0.25)', color: '#FF4A42', fontSize: '10px', padding: '2px 8px', borderRadius: '20px', fontFamily: 'monospace' }}>
                    {c.flags}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Medications tab */}
        {tab === 'medications' && (
          <div>
            {(patient.medications || []).length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: '40px 0', fontSize: '14px' }}>No medications on file</p>
            ) : (
              <>
                {patient.medications.map((med: any, i: number) => (
                  <div key={i} style={{ background: '#111116', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '14px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '20px' }}>💊</span>
                      <div>
                        <p style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>{med.name}</p>
                        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>{med.dose} · {med.frequency}</p>
                      </div>
                    </div>
                    {med.times && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {med.times.map((t: string, j: number) => (
                          <span key={j} style={{ background: 'rgba(252,181,70,0.1)', border: '1px solid rgba(252,181,70,0.2)', color: '#fcb546', fontSize: '11px', padding: '3px 10px', borderRadius: '20px' }}>{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <div style={{ background: '#111116', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '14px', marginTop: '4px' }}>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Recent doses logged</p>
                  {medLogs.slice(0, 5).map((log, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>{log.medication_name} {log.dose}</p>
                      <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', fontFamily: 'monospace' }}>{new Date(log.taken_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Notes tab */}
        {tab === 'notes' && (
          <div>
            <div style={{ background: '#111116', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '16px', marginBottom: '16px' }}>
              <select value={noteType} onChange={e => setNoteType(e.target.value)}
                style={{ width: '100%', background: '#18181F', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '10px 12px', color: 'rgba(255,255,255,0.7)', fontSize: '13px', outline: 'none', marginBottom: '10px' }}>
                <option value="care_team_note">Care team note</option>
                <option value="observation">Clinical observation</option>
                <option value="medication_change">Medication change</option>
                <option value="flag">Flag for review</option>
              </select>
              <textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Write a note about this patient..."
                style={{ width: '100%', background: '#18181F', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '12px', color: 'white', fontSize: '13px', outline: 'none', resize: 'none', minHeight: '80px', marginBottom: '10px' }}/>
              <motion.button whileTap={{ scale: 0.97 }} onClick={addNote}
                style={{ width: '100%', background: '#4A9EF5', color: 'white', fontWeight: 700, fontSize: '14px', padding: '12px', borderRadius: '12px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Send size={14}/> Save note
              </motion.button>
            </div>

            {notes.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: '24px 0', fontSize: '14px' }}>No notes yet</p>
            ) : notes.map((note, i) => (
              <div key={i} style={{ background: '#111116', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '14px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ background: 'rgba(74,158,245,0.1)', border: '1px solid rgba(74,158,245,0.2)', color: '#4A9EF5', fontSize: '10px', padding: '2px 8px', borderRadius: '20px', fontFamily: 'monospace' }}>
                    {note.note_type?.replace('_', ' ')}
                  </span>
                  <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', fontFamily: 'monospace' }}>
                    {new Date(note.created_at).toLocaleDateString()}
                  </p>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', lineHeight: '1.5' }}>{note.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* Appointments tab */}
        {tab === 'appointments' && (
          <div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowSchedule(true)}
              style={{ width: '100%', background: 'rgba(74,158,245,0.1)', border: '1px solid rgba(74,158,245,0.25)', color: '#4A9EF5', fontWeight: 700, fontSize: '14px', padding: '14px', borderRadius: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
              <Plus size={15}/> Schedule appointment
            </motion.button>

            {appointments.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: '24px 0', fontSize: '14px' }}>No appointments</p>
            ) : appointments.map((appt, i) => (
              <div key={i} style={{ background: '#111116', border: `1px solid ${appt.status === 'pending' ? 'rgba(252,181,70,0.25)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '16px', padding: '14px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ background: appt.type === 'immediate' ? 'rgba(255,74,66,0.1)' : 'rgba(74,158,245,0.1)', border: `1px solid ${appt.type === 'immediate' ? 'rgba(255,74,66,0.25)' : 'rgba(74,158,245,0.25)'}`, color: appt.type === 'immediate' ? '#FF4A42' : '#4A9EF5', fontSize: '10px', padding: '2px 8px', borderRadius: '20px', fontFamily: 'monospace' }}>
                    {appt.type}
                  </span>
                  <span style={{ background: appt.status === 'pending' ? 'rgba(252,181,70,0.1)' : 'rgba(128,239,128,0.1)', border: `1px solid ${appt.status === 'pending' ? 'rgba(252,181,70,0.25)' : 'rgba(128,239,128,0.25)'}`, color: appt.status === 'pending' ? '#fcb546' : '#80EF80', fontSize: '10px', padding: '2px 8px', borderRadius: '20px', fontFamily: 'monospace' }}>
                    {appt.status}
                  </span>
                </div>
                {appt.scheduled_at && (
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '4px' }}>
                    {new Date(appt.scheduled_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
                {appt.notes && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>{appt.notes}</p>}
                {appt.status === 'pending' && (
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => confirmAppointment(appt.id)}
                    style={{ marginTop: '10px', width: '100%', background: 'rgba(128,239,128,0.1)', border: '1px solid rgba(128,239,128,0.25)', color: '#80EF80', fontSize: '13px', padding: '10px', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 }}>
                    Confirm appointment
                  </motion.button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Schedule appointment modal */}
      <AnimatePresence>
        {showSchedule && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}
            onClick={e => { if (e.target === e.currentTarget) setShowSchedule(false) }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', bounce: 0.1 }}
              style={{ background: '#111116', borderRadius: '24px 24px 0 0', padding: '24px 20px 40px', width: '100%' }}>
              <p style={{ color: 'white', fontWeight: 700, fontSize: '18px', marginBottom: '20px' }}>Schedule appointment</p>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {(['immediate', 'scheduled'] as const).map(t => (
                  <button key={t} onClick={() => setAppointmentType(t)}
                    style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, textTransform: 'capitalize',
                      background: appointmentType === t ? 'rgba(74,158,245,0.15)' : 'rgba(255,255,255,0.06)',
                      color: appointmentType === t ? '#4A9EF5' : 'rgba(255,255,255,0.4)'
                    }}>
                    {t === 'immediate' ? '📞 Immediate call' : '📅 Scheduled'}
                  </button>
                ))}
              </div>

              {appointmentType === 'scheduled' && (
                <input type="datetime-local" value={appointmentDate} onChange={e => setAppointmentDate(e.target.value)}
                  style={{ width: '100%', background: '#18181F', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '14px', color: 'white', fontSize: '14px', outline: 'none', marginBottom: '12px' }}/>
              )}

              <textarea value={appointmentConcern} onChange={e => setAppointmentConcern(e.target.value)} placeholder="Reason or notes (optional)"
                style={{ width: '100%', background: '#18181F', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '14px', color: 'white', fontSize: '14px', outline: 'none', resize: 'none', minHeight: '80px', marginBottom: '12px' }}/>

              <motion.button whileTap={{ scale: 0.97 }} onClick={scheduleAppointment}
                style={{ width: '100%', background: '#4A9EF5', color: 'white', fontWeight: 700, fontSize: '15px', padding: '16px', borderRadius: '14px', border: 'none', cursor: 'pointer' }}>
                Confirm
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
