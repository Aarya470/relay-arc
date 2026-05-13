'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { RefreshCw, LogOut, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
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
  const [careTeamMember, setCareTeamMember] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const router = useRouter()

  useEffect(() => { load() }, [])

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/care-team/login'); return }

    const { data: member } = await supabase.from('care_team_members').select('*').eq('id', user.id).single()
    if (!member) { router.push('/care-team/login'); return }
    setCareTeamMember(member)

    const [{ data: p }, { data: c }, { data: e }, { data: ml }, { data: s }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('checkins').select('*').order('created_at', { ascending: false }),
      supabase.from('emergencies').select('*').order('created_at', { ascending: false }),
      supabase.from('medication_logs').select('*').order('taken_at', { ascending: false }),
      supabase.from('patient_summaries').select('*'),
    ])

    setPatients(p || [])
    setCheckins(c || [])
    setEmergencies(e || [])
    setMedLogs(ml || [])

    const map: Record<string, any> = {}
    s?.forEach(sum => { map[sum.patient_id] = sum })
    setSummaries(map)
    setLoading(false)
  }

  const generateSummaries = async () => {
    setGenerating(true)
    toast('Analyzing all patients...')

    for (const patient of patients) {
      const patientCheckins = checkins.filter(c => c.user_id === patient.id).slice(0, 5)
      const patientEmergencies = emergencies.filter(e => e.user_id === patient.id)
      const patientMedLogs = medLogs.filter(m => m.user_id === patient.id)

      const expectedDoses = (patient.medications?.length || 0) * 7
      const actualDoses = patientMedLogs.filter(m => {
        const d = new Date(m.taken_at)
        return Date.now() - d.getTime() < 7 * 24 * 60 * 60 * 1000
      }).length
      const adherence = expectedDoses > 0 ? Math.round((actualDoses / expectedDoses) * 100) : null

      const prompt = `You are a clinical AI. Analyze this cardiac patient and return JSON only.

Patient: ${patient.full_name}, ${patient.diagnosis}
Medications: ${JSON.stringify(patient.medications)}
Recent check-ins: ${patientCheckins.map(c => c.summary).join(' | ') || 'None'}
Emergency events: ${patientEmergencies.length} total. Most recent: ${patientEmergencies[0]?.emergency_type || 'none'} on ${patientEmergencies[0] ? new Date(patientEmergencies[0].created_at).toLocaleDateString() : 'N/A'}
Medication adherence: ${adherence !== null ? `${adherence}% this week` : 'No data'}

Return JSON:
{
  "priority_score": number 1-10,
  "short_note": "one short sentence — what the care team needs to know right now",
  "status": "stable" | "monitor" | "urgent",
  "summary": "2-3 sentence clinical summary"
}

Score 8-10: active emergency, worsening symptoms, missed meds + bad check-ins
Score 5-7: some concerns, monitor closely
Score 1-4: stable, no major issues`

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
          priority_reason: data.short_note,
          generated_at: new Date().toISOString()
        }, { onConflict: 'patient_id' })

        setSummaries(prev => ({ ...prev, [patient.id]: { ...data, priority_reason: data.short_note } }))
      } catch (e) {
        console.error('Error for', patient.full_name)
      }
    }

    setGenerating(false)
    toast.success('All patients analyzed')
  }

  const getStatusColor = (score: number) => {
    if (score >= 8) return '#FF4A42'
    if (score >= 5) return '#fcb546'
    return '#80EF80'
  }

  const getStatusLabel = (score: number) => {
    if (score >= 8) return 'Urgent'
    if (score >= 5) return 'Monitor'
    return 'Stable'
  }

  const sortedPatients = [...patients].sort((a, b) =>
    (summaries[b.id]?.priority_score || 0) - (summaries[a.id]?.priority_score || 0)
  )

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#060610', padding: '80px 16px' }}>
      {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl bg-white/5 mb-3"/>)}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#060610', paddingBottom: '32px' }}>

      {/* Header */}
      <div style={{ padding: '56px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: 'rgba(74,158,245,0.7)', fontFamily: 'monospace', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '2px' }}>
              {careTeamMember?.role} · Relay Arc
            </p>
            <h1 style={{ color: 'white', fontWeight: 700, fontSize: '22px' }}>
              {careTeamMember?.full_name?.split(' ')[0]}&apos;s patients
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <motion.button whileTap={{ scale: 0.9 }} onClick={generateSummaries} disabled={generating}
              style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(74,158,245,0.1)', border: '1px solid rgba(74,158,245,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RefreshCw size={15} color="#4A9EF5" className={generating ? 'animate-spin' : ''}/>
            </motion.button>
            <motion.button whileTap={{ scale: 0.9 }}
              onClick={async () => { await supabase.auth.signOut(); router.push('/care-team/login') }}
              style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LogOut size={15} color="rgba(255,255,255,0.4)"/>
            </motion.button>
          </div>
        </div>

        {/* Summary row */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          {[
            { label: 'Total', value: patients.length, color: 'white' },
            { label: 'Urgent', value: sortedPatients.filter(p => (summaries[p.id]?.priority_score || 0) >= 8).length, color: '#FF4A42' },
            { label: 'Monitor', value: sortedPatients.filter(p => { const s = summaries[p.id]?.priority_score || 0; return s >= 5 && s < 8 }).length, color: '#fcb546' },
            { label: 'Stable', value: sortedPatients.filter(p => (summaries[p.id]?.priority_score || 0) < 5).length, color: '#80EF80' },
          ].map((stat, i) => (
            <div key={i} style={{ flex: 1, background: '#111116', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '10px', textAlign: 'center' }}>
              <p style={{ color: stat.color, fontWeight: 700, fontSize: '18px' }}>{stat.value}</p>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px' }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {!Object.keys(summaries).length && (
          <motion.button whileTap={{ scale: 0.97 }} onClick={generateSummaries} disabled={generating}
            style={{ width: '100%', marginTop: '12px', background: 'rgba(74,158,245,0.1)', border: '1px solid rgba(74,158,245,0.25)', color: '#4A9EF5', fontWeight: 600, fontSize: '13px', padding: '12px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {generating ? '🤖 Analyzing patients...' : '🤖 Run AI analysis on all patients'}
          </motion.button>
        )}
      </div>

      {/* Patient list */}
      <div style={{ padding: '16px' }}>
        {sortedPatients.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '14px' }}>No patients yet</p>
          </div>
        )}

        {sortedPatients.map((patient, i) => {
          const sum = summaries[patient.id]
          const score = sum?.priority_score || 0
          const color = getStatusColor(score)
          const hasActiveEmergency = emergencies.some(e =>
            e.user_id === patient.id &&
            Date.now() - new Date(e.created_at).getTime() < 60 * 60 * 1000
          )
          const lastCheckin = checkins.find(c => c.user_id === patient.id)

          return (
            <motion.button
              key={patient.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push(`/care-team/patient/${patient.id}`)}
              style={{
                width: '100%',
                background: hasActiveEmergency ? 'rgba(255,74,66,0.06)' : '#111116',
                border: `1px solid ${hasActiveEmergency ? 'rgba(255,74,66,0.3)' : score >= 8 ? 'rgba(255,74,66,0.15)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: '18px',
                padding: '14px 16px',
                marginBottom: '10px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
              }}
            >
              {/* Rank number */}
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: `${color}15`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color, fontWeight: 800, fontSize: '14px' }}>{i + 1}</span>
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                  <p style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>{patient.full_name}</p>
                  {hasActiveEmergency && (
                    <span style={{ background: 'rgba(255,74,66,0.2)', color: '#FF4A42', fontSize: '9px', padding: '2px 6px', borderRadius: '20px', fontFamily: 'monospace', fontWeight: 700, flexShrink: 0 }}>
                      SOS ACTIVE
                    </span>
                  )}
                </div>

                {sum?.priority_reason ? (
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {sum.priority_reason}
                  </p>
                ) : (
                  <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>
                    {patient.diagnosis?.split(',')[0]} · {lastCheckin ? `Last check-in ${new Date(lastCheckin.created_at).toLocaleDateString()}` : 'No check-ins yet'}
                  </p>
                )}
              </div>

              {/* Status badge + chevron */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <span style={{ background: `${color}15`, border: `1px solid ${color}25`, color, fontSize: '10px', padding: '3px 8px', borderRadius: '20px', fontFamily: 'monospace', fontWeight: 600 }}>
                  {sum ? getStatusLabel(score) : '—'}
                </span>
                <ChevronRight size={14} color="rgba(255,255,255,0.2)"/>
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
