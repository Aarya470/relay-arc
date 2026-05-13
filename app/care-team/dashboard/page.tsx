'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { RefreshCw, LogOut, ChevronRight, AlertCircle, User } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY!,
  dangerouslyAllowBrowser: true
})

export default function CareTeamDashboard() {
  const [patients, setPatients] = useState<any[]>([])
  const [checkins, setCheckins] = useState<any[]>([])
  const [emergencies, setEmergencies] = useState<any[]>([])
  const [medLogs, setMedLogs] = useState<any[]>([])
  const [summaries, setSummaries] = useState<Record<string, any>>({})
  const [appointments, setAppointments] = useState<any[]>([])
  const [careTeamMember, setCareTeamMember] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [filter, setFilter] = useState<'all' | 'urgent' | 'appointments'>('all')
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/care-team/login'); return }

      const { data: member } = await supabase.from('care_team_members').select('*').eq('id', user.id).single()
      if (!member) { router.push('/care-team/login'); return }
      setCareTeamMember(member)

      const [{ data: p }, { data: c }, { data: e }, { data: ml }, { data: s }, { data: a }] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('checkins').select('*').order('created_at', { ascending: false }),
        supabase.from('emergencies').select('*').order('created_at', { ascending: false }),
        supabase.from('medication_logs').select('*').order('taken_at', { ascending: false }),
        supabase.from('patient_summaries').select('*'),
        supabase.from('appointments').select('*').order('created_at', { ascending: false })
      ])

      setPatients(p || [])
      setCheckins(c || [])
      setEmergencies(e || [])
      setMedLogs(ml || [])
      setAppointments(a || [])

      const summaryMap: Record<string, any> = {}
      s?.forEach(sum => { summaryMap[sum.patient_id] = sum })
      setSummaries(summaryMap)

      setLoading(false)
    }
    load()
  }, [])

  const generatePatientSummaries = async () => {
    setGenerating(true)
    for (const patient of patients) {
      const patientCheckins = checkins.filter(c => c.user_id === patient.id).slice(0, 5)
      const patientMedLogs = medLogs.filter(m => m.user_id === patient.id).slice(0, 10)
      const patientEmergencies = emergencies.filter(e => e.user_id === patient.id)

      const prompt = `Analyze this cardiac patient and provide a brief clinical summary and priority score.

Patient: ${patient.full_name}, ${patient.diagnosis}
Medications: ${JSON.stringify(patient.medications)}
Recent check-ins: ${patientCheckins.map(c => c.summary).join(' | ')}
Recent medication logs: ${patientMedLogs.length} doses logged in last 7 days
Emergency events: ${patientEmergencies.length}

Respond with JSON only:
{
  "summary": "2-3 sentence clinical summary",
  "priority_score": 1-10,
  "priority_reason": "one short reason why this score"
}

Higher scores for: recent emergencies, missed medications, worsening check-ins, multiple conditions.`

      try {
        const completion = await groq.chat.completions.create({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2
        })

        const text = completion.choices[0].message.content || '{}'
        const clean = text.replace(/```json|```/g, '').trim()
        const data = JSON.parse(clean)

        await supabase.from('patient_summaries').upsert({
          patient_id: patient.id,
          summary: data.summary,
          priority_score: data.priority_score,
          priority_reason: data.priority_reason,
          generated_at: new Date().toISOString()
        }, { onConflict: 'patient_id' })

        setSummaries(prev => ({ ...prev, [patient.id]: data }))
      } catch (e) {
        console.error('Summary error for', patient.full_name, e)
      }
    }
    setGenerating(false)
    toast.success('Summaries updated')
  }

  const getPriorityColor = (score: number) => {
    if (score >= 8) return '#FF4A42'
    if (score >= 5) return '#fcb546'
    return '#80EF80'
  }

  const sortedPatients = [...patients].sort((a, b) => {
    const scoreA = summaries[a.id]?.priority_score || 0
    const scoreB = summaries[b.id]?.priority_score || 0
    return scoreB - scoreA
  })

  const filteredPatients = sortedPatients.filter(p => {
    if (filter === 'urgent') return (summaries[p.id]?.priority_score || 0) >= 7
    if (filter === 'appointments') return appointments.some(a => a.patient_id === p.id && a.status === 'pending')
    return true
  })

  const pendingAppointments = appointments.filter(a => a.status === 'pending')

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#060610', padding: '56px 16px' }}>
      {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl bg-white/5 mb-3"/>)}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#060610', paddingBottom: '32px' }}>

      {/* Header */}
      <div style={{ padding: '56px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <div>
            <p style={{ color: 'rgba(74,158,245,0.7)', fontFamily: 'monospace', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '2px' }}>
              {careTeamMember?.role} · Relay Arc
            </p>
            <h1 style={{ color: 'white', fontWeight: 700, fontSize: '22px' }}>
              {careTeamMember?.full_name?.split(' ')[0]}&apos;s patients
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <motion.button whileTap={{ scale: 0.9 }} onClick={generatePatientSummaries} disabled={generating}
              style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(74,158,245,0.1)', border: '1px solid rgba(74,158,245,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RefreshCw size={15} color="#4A9EF5" style={{ animation: generating ? 'spin 1s linear infinite' : 'none' }}/>
            </motion.button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={async () => {
              await supabase.auth.signOut()
              router.push('/care-team/login')
            }}
              style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LogOut size={15} color="rgba(255,255,255,0.4)"/>
            </motion.button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          {[
            { label: 'Patients', value: patients.length, color: 'white' },
            { label: 'Urgent', value: sortedPatients.filter(p => (summaries[p.id]?.priority_score || 0) >= 7).length, color: '#FF4A42' },
            { label: 'Appointments', value: pendingAppointments.length, color: '#fcb546' },
          ].map((stat, i) => (
            <div key={i} style={{ flex: 1, background: '#111116', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '10px 12px', textAlign: 'center' }}>
              <p style={{ color: stat.color, fontWeight: 700, fontSize: '20px' }}>{stat.value}</p>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px' }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Pending appointments banner */}
        {pendingAppointments.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: 'rgba(252,181,70,0.08)', border: '1px solid rgba(252,181,70,0.2)', borderRadius: '12px', padding: '12px 14px', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={14} color="#fcb546"/>
            <p style={{ color: '#fcb546', fontSize: '13px', flex: 1 }}>
              {pendingAppointments.length} appointment{pendingAppointments.length > 1 ? 's' : ''} waiting for confirmation
            </p>
            <button onClick={() => setFilter('appointments')}
              style={{ background: 'none', border: 'none', color: '#fcb546', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
              View →
            </button>
          </motion.div>
        )}

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '6px', marginTop: '14px' }}>
          {(['all', 'urgent', 'appointments'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: '7px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, textTransform: 'capitalize',
                background: filter === f ? 'rgba(74,158,245,0.15)' : 'rgba(255,255,255,0.06)',
                color: filter === f ? '#4A9EF5' : 'rgba(255,255,255,0.4)'
              }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Patient list */}
      <div style={{ padding: '16px' }}>
        {filteredPatients.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <User size={32} color="rgba(255,255,255,0.1)" style={{ margin: '0 auto 12px' }}/>
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '14px' }}>No patients in this category</p>
          </div>
        )}

        {filteredPatients.map((patient, i) => {
          const summary = summaries[patient.id]
          const score = summary?.priority_score || 0
          const patientCheckins = checkins.filter(c => c.user_id === patient.id)
          const patientEmergencies = emergencies.filter(e => e.user_id === patient.id)
          const patientMedLogs = medLogs.filter(m => m.user_id === patient.id)
          const patientAppointments = appointments.filter(a => a.patient_id === patient.id && a.status === 'pending')
          const lastCheckin = patientCheckins[0]

          return (
            <motion.button key={patient.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push(`/care-team/patient/${patient.id}`)}
              style={{ width: '100%', background: '#111116', border: `1px solid ${score >= 8 ? 'rgba(255,74,66,0.25)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '20px', padding: '14px 16px', marginBottom: '10px', textAlign: 'left', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                {/* Priority score */}
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${getPriorityColor(score)}15`, border: `1px solid ${getPriorityColor(score)}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: getPriorityColor(score), fontWeight: 800, fontSize: '16px' }}>{score || '?'}</span>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <p style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>{patient.full_name}</p>
                    {patientAppointments.length > 0 && (
                      <span style={{ background: 'rgba(252,181,70,0.15)', border: '1px solid rgba(252,181,70,0.3)', color: '#fcb546', fontSize: '10px', padding: '2px 8px', borderRadius: '20px', fontFamily: 'monospace' }}>
                        Appt pending
                      </span>
                    )}
                    {patientEmergencies.length > 0 && (
                      <span style={{ background: 'rgba(255,74,66,0.15)', border: '1px solid rgba(255,74,66,0.3)', color: '#FF4A42', fontSize: '10px', padding: '2px 8px', borderRadius: '20px', fontFamily: 'monospace' }}>
                        {patientEmergencies.length} SOS
                      </span>
                    )}
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', marginBottom: '6px' }}>{patient.diagnosis}</p>

                  {summary?.priority_reason && (
                    <p style={{ color: getPriorityColor(score), fontSize: '11px', fontFamily: 'monospace' }}>
                      ↑ {summary.priority_reason}
                    </p>
                  )}

                  {/* Mini stats */}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                    {[
                      { label: 'check-ins', value: patientCheckins.length },
                      { label: 'med logs', value: patientMedLogs.length },
                      { label: 'emergencies', value: patientEmergencies.length },
                    ].map((stat, j) => (
                      <span key={j} style={{ color: 'rgba(255,255,255,0.25)', fontSize: '11px', fontFamily: 'monospace' }}>
                        {stat.value} {stat.label}
                      </span>
                    ))}
                  </div>

                  {lastCheckin && (
                    <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', marginTop: '4px' }}>
                      Last check-in: {new Date(lastCheckin.created_at).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <ChevronRight size={16} color="rgba(255,255,255,0.2)" style={{ flexShrink: 0, marginTop: '4px' }}/>
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
