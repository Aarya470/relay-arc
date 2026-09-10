'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, LogOut, ChevronRight, Video, Check, Clock, Calendar, MapPin, Phone, AlertTriangle, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { DEMO_MEMBER, DEMO_PATIENTS, DEMO_CHECKINS, DEMO_EMERGENCIES, DEMO_MED_LOGS, DEMO_APPOINTMENTS, DEMO_SUMMARIES, DEMO_BANNER } from '@/lib/demo-data'
import { Skeleton } from '@/components/ui/skeleton'
import JitsiMeeting from '@/components/JitsiMeeting'

function parseTS(ts: string) {
  if (!ts) return new Date()
  return new Date(/[Z+]/.test(ts) ? ts : ts + 'Z')
}

function hasOverdueMeds(patient: any, allLogs: any[]): boolean {
  if (!patient.medications?.length) return false
  const now = Date.now()
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todayLogs = allLogs.filter(l => l.user_id === patient.id && new Date(l.taken_at) >= today)
  for (const med of patient.medications) {
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
      if (!todayLogs.some((l: any) => l.medication_name === med.name)) return true
    }
  }
  return false
}

// Mark confirmed appointments as missed if they're >30 min overdue.
// Returns the transformed array and fires a DB update (fire-and-forget).
function processAndMarkMissed(appts: any[]): any[] {
  const now = Date.now()
  const missedIds = appts
    .filter(a => a.status === 'confirmed' && parseTS(a.scheduled_at).getTime() < now - 30 * 60 * 1000)
    .map(a => a.id)
  if (missedIds.length > 0) {
    supabase.from('appointments').update({ status: 'missed' }).in('id', missedIds)
      .then(({ error }) => { if (error) console.error('Failed to mark appointments missed:', error) })
    return appts.map(a => missedIds.includes(a.id) ? { ...a, status: 'missed' } : a)
  }
  return appts
}

export default function CareTeamDashboard() {
  const [patients, setPatients] = useState<any[]>([])
  const [checkins, setCheckins] = useState<any[]>([])
  const [emergencies, setEmergencies] = useState<any[]>([])
  const [medLogs, setMedLogs] = useState<any[]>([])
  const [summaries, setSummaries] = useState<Record<string, any>>({})
  const [appointments, setAppointments] = useState<any[]>([])
  const [careTeamMember, setCareTeamMember] = useState<any>(null)
  const [isDemo, setIsDemo] = useState(false)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [upcomingMeeting, setUpcomingMeeting] = useState<any>(null)
  const [activeCall, setActiveCall] = useState<any>(null)
  const [activeEmergencies, setActiveEmergencies] = useState<any[]>([])
  const [tick, setTick] = useState(0)
  const [expandedMedCard, setExpandedMedCard] = useState<Record<string, boolean>>({})
  const notifiedRef = useRef<Set<string>>(new Set())
  const router = useRouter()

  // Demo mode must never write to the database. Every polling loop below is
  // short-circuited so the demo view is strictly read-only against fixtures.
  const demoRef = useRef(false)

  const checkEmergencies = useCallback(async () => {
    if (demoRef.current) return
    const { data } = await supabase
      .from('emergencies')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    if (!data || data.length === 0) { setActiveEmergencies([]); return }
    // Auto-resolve anything older than 30 minutes — matches the patient-side stale threshold
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    const staleIds = data.filter((e: any) => e.created_at < thirtyMinAgo).map((e: any) => e.id)
    if (staleIds.length > 0) {
      await supabase.from('emergencies').update({ status: 'resolved' }).in('id', staleIds)
    }
    setActiveEmergencies(data.filter((e: any) => e.created_at >= thirtyMinAgo))
  }, [])

  // On mount: initial fetch + Supabase Realtime subscription for instant updates
  useEffect(() => {
    load()
    checkEmergencies()
    const channel = supabase
      .channel('emergencies-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergencies' }, () => {
        checkEmergencies()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [checkEmergencies]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!careTeamMember) return
    const check = async () => {
      if (demoRef.current) return
      const { data } = await supabase.from('appointments').select('*').eq('status', 'confirmed')
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
          const patient = patients.find(p => p.id === upcoming.patient_id)
          new Notification('Meeting starting soon', {
            body: `Call with ${patient?.full_name || 'patient'} starts ${min > 0 ? `in ${min} min` : 'now'}.`,
          })
        }
      }
    }
    check()
    const id = setInterval(check, 30000)
    return () => clearInterval(id)
  }, [careTeamMember, patients])

  // 8-second poll as fallback if Supabase Realtime is not enabled
  useEffect(() => {
    if (!careTeamMember) return
    const id = setInterval(checkEmergencies, 8000)
    return () => clearInterval(id)
  }, [careTeamMember, checkEmergencies])

  // 1-second tick to keep elapsed time display live
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // Silent background refresh — updates appointments + patient list every 25 seconds
  // without showing the loading spinner so the UI doesn't flash
  useEffect(() => {
    if (!careTeamMember || isDemo) return
    const silentRefresh = async () => {
      const [{ data: p }, { data: appts }, { data: em }] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('appointments').select('*').order('scheduled_at', { ascending: true }),
        supabase.from('emergencies').select('*').order('created_at', { ascending: false }),
      ])
      if (p) setPatients(p)
      if (appts) setAppointments(processAndMarkMissed(appts))
      if (em) setEmergencies(em)
    }
    const id = setInterval(silentRefresh, 25000)
    return () => clearInterval(id)
  }, [careTeamMember])

  const load = async () => {
    // ?demo=1 renders this exact dashboard against synthetic fixtures — no login,
    // no database, no real patient. Lets the dashboard be shown to a school board
    // or an investor without exposing anyone's chart.
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === '1') {
      setIsDemo(true)
      demoRef.current = true
      setCareTeamMember(DEMO_MEMBER)
      setPatients(DEMO_PATIENTS as any)
      setCheckins(DEMO_CHECKINS as any)
      setEmergencies(DEMO_EMERGENCIES as any)
      setMedLogs(DEMO_MED_LOGS as any)
      setAppointments(DEMO_APPOINTMENTS as any)
      setSummaries(DEMO_SUMMARIES as any)
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/care-team/login'); return }

    const { data: member } = await supabase.from('care_team_members').select('*').eq('id', user.id).single()
    if (!member) { router.push('/care-team/login'); return }
    setCareTeamMember(member)

    const [{ data: p }, { data: c }, { data: e }, { data: ml }, { data: s }, { data: appts }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('checkins').select('*').order('created_at', { ascending: false }),
      supabase.from('emergencies').select('*').order('created_at', { ascending: false }),
      supabase.from('medication_logs').select('*').order('taken_at', { ascending: false }),
      supabase.from('patient_summaries').select('*'),
      supabase.from('appointments').select('*').order('scheduled_at', { ascending: true }),
    ])

    setPatients(p || [])
    setCheckins(c || [])
    setEmergencies(e || [])
    setMedLogs(ml || [])
    setAppointments(processAndMarkMissed(appts || []))
    // Active emergencies are managed solely by checkEmergencies() to avoid race conditions

    const map: Record<string, any> = {}
    s?.forEach(sum => { map[sum.patient_id] = sum })
    setSummaries(map)
    setLoading(false)
  }

  const generateSummaries = async () => {
    setGenerating(true)
    toast('Analyzing all patients...')

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) { toast.error('Please sign in again'); setGenerating(false); return }

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

      try {
        const res = await fetch('/api/groq/care-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ patient, checkins: patientCheckins, emergencies: patientEmergencies, adherence }),
        })
        if (!res.ok) throw new Error('API error')
        const { summary: data } = await res.json()

        await supabase.from('patient_summaries').upsert({
          patient_id: patient.id,
          summary: data.summary,
          priority_score: data.priority_score,
          priority_reason: data.short_note,
          generated_at: new Date().toISOString()
        }, { onConflict: 'patient_id' })

        setSummaries(prev => ({ ...prev, [patient.id]: { ...data, priority_reason: data.short_note } }))
      } catch (e) {
        console.error('Summary error for patient:', patient.id)
      }
    }

    setGenerating(false)
    toast.success('All patients analyzed')
  }

  const handleMeetingEnd = async (appointmentId: string) => {
    await supabase.from('appointments').update({ status: 'completed' }).eq('id', appointmentId)
    setAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, status: 'completed' } : a))
    setActiveCall(null)
    setUpcomingMeeting(null)
    toast.success('Call ended. Appointment marked complete')
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

  const dismissEmergency = async (emergencyId: string) => {
    await supabase.from('emergencies').update({ status: 'resolved' }).eq('id', emergencyId)
    setActiveEmergencies(prev => prev.filter(e => e.id !== emergencyId))
    toast('Emergency resolved')
  }

  const isJoinable = (a: any) => {
    if (a.status !== 'confirmed' || !a.meeting_room_id) return false
    const t = parseTS(a.scheduled_at).getTime()
    const now = Date.now()
    return now >= t - 10 * 60 * 1000 && now <= t + 60 * 60 * 1000
  }

  const getStatusColor = (score: number) => {
    if (score >= 8) return '#A33417'
    if (score >= 5) return '#A87200'
    return '#42623C'
  }

  const getStatusLabel = (score: number) => {
    if (score >= 8) return 'Urgent'
    if (score >= 5) return 'Monitor'
    return 'Stable'
  }

  const sortedPatients = [...patients].sort((a, b) => {
    const aEm = activeEmergencies.some(e => e.user_id === a.id) ? 1 : 0
    const bEm = activeEmergencies.some(e => e.user_id === b.id) ? 1 : 0
    if (bEm !== aEm) return bEm - aEm
    return (summaries[b.id]?.priority_score || 0) - (summaries[a.id]?.priority_score || 0)
  })

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#B3DDAC', padding: '80px 16px' }}>
      {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl bg-white/5 mb-3"/>)}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#B3DDAC', paddingBottom: '32px' }}>

      {/* A viewer must never be able to mistake demo fixtures for a real chart. */}
      {isDemo && (
        <div style={{ background: '#D97757', color: '#141413', padding: '9px 14px', textAlign: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase' }}>
            {DEMO_BANNER}
          </span>
        </div>
      )}

      {/* Meeting notification banner */}
      <AnimatePresence>
        {upcomingMeeting && !activeCall && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: '#141413', padding: '52px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '3px' }}>
                {parseTS(upcomingMeeting.scheduled_at) <= new Date() ? 'Live now' : 'Starting soon'}
              </p>
              <p style={{ color: 'white', fontWeight: 700, fontSize: '14px' }}>
                Patient call with {patients.find(p => p.id === upcomingMeeting.patient_id)?.full_name?.split(' ')[0] || 'patient'}
              </p>
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setActiveCall(upcomingMeeting)}
              style={{ background: 'white', color: '#1a3a6e', fontWeight: 700, fontSize: '12px', padding: '10px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
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
            displayName={careTeamMember?.full_name || 'Care Team'}
            onEnd={() => handleMeetingEnd(activeCall.id)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={{ padding: '56px 20px 20px', borderBottom: '1px solid #98C890' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: 'rgba(86,128,78,0.7)', fontFamily: 'monospace', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '2px' }}>
              {careTeamMember?.role} · Relay Arc
            </p>
            <h1 style={{ color: '#141413', fontWeight: 700, fontSize: '22px' }}>
              {careTeamMember?.full_name?.split(' ')[0]}&apos;s patients
            </h1>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <motion.button whileTap={{ scale: 0.9 }} onClick={generateSummaries} disabled={generating}
              aria-label={generating ? 'Refreshing patient summaries' : 'Refresh patient summaries'}
              style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(86,128,78,0.1)', border: '1px solid rgba(86,128,78,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RefreshCw size={15} color="#42623C" className={generating ? 'animate-spin' : ''}/>
            </motion.button>
            <motion.button whileTap={{ scale: 0.9 }}
              onClick={async () => { await supabase.auth.signOut(); router.push('/care-team/login') }}
              aria-label="Sign out"
              style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#F2F0E8', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LogOut size={15} color="#5C5A52"/>
            </motion.button>
          </div>
        </div>

        {/* Summary row */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          {[
            { label: 'Total', value: patients.length, color: '#141413' },
            { label: 'Urgent', value: sortedPatients.filter(p => activeEmergencies.some(e => e.user_id === p.id) || (summaries[p.id]?.priority_score || 0) >= 8).length, color: '#A33417' },
            { label: 'Monitor', value: sortedPatients.filter(p => { const isEm = activeEmergencies.some(e => e.user_id === p.id); const sc = summaries[p.id]?.priority_score || 0; return !isEm && sc < 8 && (sc >= 5 || hasOverdueMeds(p, medLogs)) }).length, color: '#A87200' },
            { label: 'Stable', value: sortedPatients.filter(p => { const isEm = activeEmergencies.some(e => e.user_id === p.id); const sc = summaries[p.id]?.priority_score || 0; return !isEm && sc < 5 && !hasOverdueMeds(p, medLogs) }).length, color: '#42623C' },
          ].map((stat, i) => (
            <div key={i} style={{ flex: 1, background: '#FFFFFF', border: '1px solid #98C890', borderRadius: '12px', padding: '10px', textAlign: 'center' }}>
              <p style={{ color: stat.color, fontWeight: 700, fontSize: '18px' }}>{stat.value}</p>
              <p style={{ color: '#6F6D65', fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px' }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {!Object.keys(summaries).length && (
          <motion.button whileTap={{ scale: 0.97 }} onClick={generateSummaries} disabled={generating}
            style={{ width: '100%', marginTop: '12px', background: 'rgba(86,128,78,0.1)', border: '1px solid rgba(86,128,78,0.25)', color: '#42623C', fontWeight: 600, fontSize: '13px', padding: '12px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {generating ? 'Checking patients...' : 'Run a check across all patients'}
          </motion.button>
        )}
      </div>

      {/* Appointments section */}
      {(() => {
        const pending = appointments.filter(a => a.status === 'pending')
        const upcoming = appointments.filter(a => {
          if (a.status !== 'confirmed') return false
          const t = parseTS(a.scheduled_at).getTime()
          return t > Date.now() - 60 * 60 * 1000 && t < Date.now() + 24 * 60 * 60 * 1000
        })
        if (pending.length === 0 && upcoming.length === 0) return null
        return (
          <div style={{ padding: '12px 16px 0' }}>
            <p style={{ color: 'rgba(86,128,78,0.6)', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '10px' }}>
              Appointments
            </p>

            {pending.map(a => {
              const patient = patients.find(p => p.id === a.patient_id)
              return (
                <div key={a.id} style={{ background: 'rgba(168,114,0,0.06)', border: '1px solid rgba(168,114,0,0.2)', borderRadius: '14px', padding: '14px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Clock size={13} color="#A87200"/>
                    <p style={{ color: '#141413', fontWeight: 600, fontSize: '13px', flex: 1 }}>
                      {patient?.full_name || 'Patient'}. <span style={{ color: '#A87200' }}>Pending</span>
                    </p>
                  </div>
                  {a.scheduled_at && (
                    <p style={{ color: '#6F6D65', fontSize: '11px', fontFamily: 'monospace', marginBottom: '10px' }}>
                      {parseTS(a.scheduled_at).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </p>
                  )}
                  {a.patient_concern && <p style={{ color: '#5C5A52', fontSize: '12px', marginBottom: '10px' }}>{a.patient_concern}</p>}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => confirmAppointment(a.id)}
                      style={{ flex: 1, background: 'rgba(86,128,78,0.12)', border: '1px solid rgba(86,128,78,0.25)', borderRadius: '10px', padding: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}>
                      <Check size={13} color="#42623C"/>
                      <span style={{ color: '#42623C', fontSize: '12px', fontWeight: 600 }}>Confirm</span>
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => declineAppointment(a.id)}
                      style={{ flex: 1, background: 'rgba(163,52,23,0.08)', border: '1px solid rgba(163,52,23,0.2)', borderRadius: '10px', padding: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <span style={{ color: '#A33417', fontSize: '12px', fontWeight: 600 }}>Decline</span>
                    </motion.button>
                  </div>
                </div>
              )
            })}

            {upcoming.map(a => {
              const patient = patients.find(p => p.id === a.patient_id)
              const joinable = isJoinable(a)
              return (
                <div key={a.id} style={{ background: joinable ? 'rgba(86,128,78,0.08)' : '#FFFFFF', border: `1px solid ${joinable ? 'rgba(86,128,78,0.3)' : 'rgba(86,128,78,0.15)'}`, borderRadius: '14px', padding: '14px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={13} color="#42623C"/>
                      <p style={{ color: '#141413', fontWeight: 600, fontSize: '13px' }}>{patient?.full_name || 'Patient'}</p>
                    </div>
                    {joinable && (
                      <span style={{ background: 'rgba(86,128,78,0.15)', border: '1px solid rgba(86,128,78,0.3)', color: '#42623C', fontSize: '9px', fontFamily: 'monospace', padding: '2px 8px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Now
                      </span>
                    )}
                  </div>
                  <p style={{ color: '#6F6D65', fontSize: '11px', fontFamily: 'monospace', marginBottom: joinable ? '10px' : 0 }}>
                    {parseTS(a.scheduled_at).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </p>
                  {joinable && (
                    <motion.button whileTap={{ scale: 0.97 }}
                      onClick={() => setActiveCall(a)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#42623C', borderRadius: '10px', padding: '10px', color: 'white', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer' }}
                    >
                      <Video size={14}/>
                      Join call with {patient?.full_name?.split(' ')[0]}
                    </motion.button>
                  )}
                </div>
              )
            })}
          </div>
        )
      })()}

      {/* Active emergency alert panels */}
      {activeEmergencies.length > 0 && (
        <div style={{ padding: '12px 16px 0' }}>
          {activeEmergencies.map((emergency) => {
            const patient = patients.find(p => p.id === emergency.user_id)
            const elapsedMs = Date.now() - new Date(emergency.created_at).getTime()
            const elapsedMin = Math.floor(elapsedMs / 60000)
            const elapsedSec = Math.floor((elapsedMs % 60000) / 1000)
            const elapsedLabel = elapsedMin > 0
              ? `${elapsedMin}m ${elapsedSec}s ago`
              : `${elapsedSec}s ago`
            const typeLabels: Record<string, string> = {
              chest_pain: 'Chest Pain', unconscious: 'Unconscious', breathing: "Can't Breathe",
              pots: 'POTS Episode', stroke: 'Stroke Signs', mecfs: 'Severe ME/CFS Crash', other: 'Emergency',
            }
            const typeLabel = typeLabels[emergency.type] || emergency.type || 'Emergency'
            const isMedExpanded = expandedMedCard[emergency.id]
            const hasMedInfo = patient?.blood_type || patient?.allergies || patient?.medications?.length > 0
            const hasHospital = !!(emergency.hospital_name)
            const hasLocation = !!(emergency.patient_lat && emergency.patient_lng)
            const hasHospitalCoords = !!(emergency.hospital_lat && emergency.hospital_lng)

            // Suppress unused tick warning — tick is read here to force re-render every second
            void tick

            return (
              <motion.div
                key={emergency.id}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                style={{
                  background: 'rgba(255,28,28,0.05)',
                  border: '2px solid rgba(163,52,23,0.55)',
                  borderRadius: '20px',
                  marginBottom: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 0 0 1px rgba(163,52,23,0.15), 0 8px 32px rgba(163,52,23,0.18)',
                }}
              >
                {/* Header row */}
                <div style={{
                  background: '#A33417',
                  padding: '12px 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <motion.div
                      animate={{ opacity: [1, 0.25, 1], scale: [1, 1.15, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                      style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fff', flexShrink: 0, boxShadow: '0 0 8px rgba(255,255,255,0.6)' }}
                    />
                    <span style={{ color: 'white', fontFamily: 'monospace', fontSize: '11px', letterSpacing: '2.5px', textTransform: 'uppercase', fontWeight: 800 }}>
                      Active Emergency
                    </span>
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.75)', fontFamily: 'monospace', fontSize: '11px', fontWeight: 600 }}>
                    {elapsedLabel}
                  </span>
                </div>

                <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

                  {/* Patient info row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ color: '#A33417', fontWeight: 800, fontSize: '17px', marginBottom: '3px' }}>
                        {patient?.full_name || 'Unknown patient'}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          background: 'rgba(163,52,23,0.15)', border: '1px solid rgba(163,52,23,0.35)',
                          color: '#A33417', fontSize: '10px', padding: '2px 8px', borderRadius: '20px',
                          fontFamily: 'monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                        }}>
                          {typeLabel}
                        </span>
                        {patient?.blood_type && (
                          <span style={{
                            background: 'rgba(163,52,23,0.1)', border: '1px solid rgba(163,52,23,0.25)',
                            color: '#A33417', fontSize: '10px', padding: '2px 8px', borderRadius: '20px',
                            fontFamily: 'monospace', fontWeight: 700,
                          }}>
                            {patient.blood_type}
                          </span>
                        )}
                      </div>
                    </div>
                    <AlertTriangle size={22} color="#A33417" style={{ flexShrink: 0, opacity: 0.8 }}/>
                  </div>

                  {/* Medical card — expandable */}
                  {hasMedInfo && (
                    <div style={{ border: '1px solid rgba(163,52,23,0.2)', borderRadius: '12px', overflow: 'hidden' }}>
                      <button
                        onClick={() => setExpandedMedCard(prev => ({ ...prev, [emergency.id]: !prev[emergency.id] }))}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 14px', background: isMedExpanded ? 'rgba(163,52,23,0.08)' : 'rgba(163,52,23,0.04)',
                          border: 'none', cursor: 'pointer',
                        }}
                      >
                        <span style={{ color: '#A33417', fontSize: '11px', fontWeight: 700, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px' }}>
                          Medical Card
                        </span>
                        <span style={{ color: 'rgba(163,52,23,0.5)', fontSize: '10px' }}>
                          {isMedExpanded ? 'Hide' : 'Show'}
                        </span>
                      </button>
                      {isMedExpanded && (
                        <div style={{ padding: '10px 14px', background: 'rgba(163,52,23,0.05)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {patient?.blood_type && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ color: '#6F6D65', fontSize: '11px', width: '80px', flexShrink: 0 }}>Blood type</span>
                              <span style={{ color: '#A33417', fontWeight: 800, fontSize: '18px', fontFamily: 'monospace' }}>{patient.blood_type}</span>
                            </div>
                          )}
                          {patient?.allergies && (
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                              <span style={{ color: '#6F6D65', fontSize: '11px', width: '80px', flexShrink: 0, paddingTop: '2px' }}>Allergies</span>
                              <span style={{ color: '#8F2E14', fontWeight: 600, fontSize: '12px', lineHeight: 1.5 }}>{patient.allergies}</span>
                            </div>
                          )}
                          {patient?.medications?.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                              <span style={{ color: '#6F6D65', fontSize: '11px', width: '80px', flexShrink: 0, paddingTop: '2px' }}>Medications</span>
                              <span style={{ color: '#5C5A52', fontSize: '11px', lineHeight: 1.6 }}>
                                {patient.medications.slice(0, 3).map((m: any) => m.name || m).join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Hospital destination */}
                  {hasHospital && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(163,52,23,0.06)', border: '1px solid rgba(163,52,23,0.15)', borderRadius: '10px', padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                        <MapPin size={13} color="#A33417" style={{ flexShrink: 0 }}/>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ color: '#6F6D65', fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1px' }}>Routing to</p>
                          <p style={{ color: '#141413', fontWeight: 600, fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emergency.hospital_name}</p>
                        </div>
                      </div>
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(emergency.hospital_name)}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#42623C', fontSize: '11px', fontWeight: 600, textDecoration: 'none', flexShrink: 0, marginLeft: '8px' }}
                        onClick={e => e.stopPropagation()}
                      >
                        Maps <ExternalLink size={10}/>
                      </a>
                    </div>
                  )}

                  {/* Last known location */}
                  {hasLocation && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(86,128,78,0.05)', border: '1px solid rgba(86,128,78,0.15)', borderRadius: '10px', padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MapPin size={13} color="#42623C" style={{ flexShrink: 0 }}/>
                        <div>
                          <p style={{ color: '#6F6D65', fontSize: '9px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1px' }}>Last known location</p>
                          <p style={{ color: '#5C5A52', fontFamily: 'monospace', fontSize: '11px' }}>
                            {Number(emergency.patient_lat).toFixed(5)}, {Number(emergency.patient_lng).toFixed(5)}
                          </p>
                        </div>
                      </div>
                      <a
                        href={`https://maps.google.com/?q=${emergency.patient_lat},${emergency.patient_lng}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#42623C', fontSize: '11px', fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}
                        onClick={e => e.stopPropagation()}
                      >
                        View <ExternalLink size={10}/>
                      </a>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {(hasHospitalCoords || hasHospital) && (
                      <a
                        href={hasHospitalCoords
                          ? `https://maps.google.com/?q=${emergency.hospital_lat},${emergency.hospital_lng}`
                          : `https://maps.google.com/?q=${encodeURIComponent(emergency.hospital_name)}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                          background: 'rgba(86,128,78,0.1)', border: '1px solid rgba(86,128,78,0.25)',
                          color: '#42623C', fontWeight: 700, fontSize: '12px', padding: '10px 8px',
                          borderRadius: '10px', textDecoration: 'none',
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        <MapPin size={13}/>
                        View on map
                      </a>
                    )}
                    {patient?.phone ? (
                      <a
                        href={`tel:${patient.phone}`}
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                          background: 'rgba(86,128,78,0.08)', border: '1px solid rgba(86,128,78,0.2)',
                          color: '#42623C', fontWeight: 700, fontSize: '12px', padding: '10px 8px',
                          borderRadius: '10px', textDecoration: 'none',
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        <Phone size={13}/>
                        Call patient
                      </a>
                    ) : (
                      <div style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        background: '#F2F0E8', border: '1px solid #98C890',
                        color: '#6F6D65', fontWeight: 600, fontSize: '12px', padding: '10px 8px',
                        borderRadius: '10px',
                      }}>
                        <Phone size={13}/>
                        No phone on file
                      </div>
                    )}
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => dismissEmergency(emergency.id)}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        background: 'rgba(163,52,23,0.12)', border: '1px solid rgba(163,52,23,0.3)',
                        color: '#A33417', fontWeight: 700, fontSize: '12px', padding: '10px 8px',
                        borderRadius: '10px', cursor: 'pointer',
                      }}
                    >
                      <Check size={13}/>
                      Resolve
                    </motion.button>
                  </div>

                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Patient list */}
      <div style={{ padding: '16px' }}>
        {sortedPatients.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ color: '#6F6D65', fontSize: '14px' }}>No patients yet</p>
          </div>
        )}

        {sortedPatients.map((patient, i) => {
          const sum = summaries[patient.id]
          const score = sum?.priority_score || 0
          const hasActiveEmergency = activeEmergencies.some(e => e.user_id === patient.id)
          const overdueM = !hasActiveEmergency && hasOverdueMeds(patient, medLogs)
          const effectiveScore = overdueM && score < 5 ? 5 : score
          const color = getStatusColor(effectiveScore)
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
                background: hasActiveEmergency ? 'rgba(163,52,23,0.06)' : '#FFFFFF',
                border: `1px solid ${hasActiveEmergency ? 'rgba(163,52,23,0.3)' : score >= 8 ? 'rgba(163,52,23,0.15)' : '#98C890'}`,
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
                  <p style={{ color: hasActiveEmergency ? '#A33417' : appointments.some(a => a.patient_id === patient.id && a.status === 'pending') ? '#A87200' : 'white', fontWeight: hasActiveEmergency ? 800 : 600, fontSize: '14px' }}>{patient.full_name}</p>
                  {appointments.some(a => a.patient_id === patient.id && a.status === 'pending') && (
                    <span style={{ background: 'rgba(168,114,0,0.15)', color: '#A87200', fontSize: '9px', padding: '2px 6px', borderRadius: '20px', fontFamily: 'monospace', fontWeight: 700, flexShrink: 0 }}>
                      APPT REQUEST
                    </span>
                  )}
                  {hasActiveEmergency && (
                    <motion.span
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 0.9, repeat: Infinity }}
                      style={{ background: 'rgba(163,52,23,0.25)', color: '#A33417', fontSize: '9px', padding: '2px 8px', borderRadius: '20px', fontFamily: 'monospace', fontWeight: 700, flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid rgba(163,52,23,0.4)' }}
                    >
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#A33417', display: 'inline-block' }}/>
                      SOS
                    </motion.span>
                  )}
                </div>

                {sum?.priority_reason ? (
                  <p style={{ color: '#5C5A52', fontSize: '12px', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {sum.priority_reason}
                  </p>
                ) : (
                  <p style={{ color: '#6F6D65', fontSize: '12px' }}>
                    {patient.diagnosis?.split(',')[0]} · {lastCheckin ? `Last check-in ${new Date(lastCheckin.created_at).toLocaleDateString()}` : 'No check-ins yet'}
                  </p>
                )}
              </div>

              {/* Status badge + chevron */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                {hasActiveEmergency ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <motion.span
                      animate={{ opacity: [1, 0.55, 1] }}
                      transition={{ duration: 0.9, repeat: Infinity }}
                      style={{ background: 'rgba(163,52,23,0.2)', border: '1px solid rgba(163,52,23,0.45)', color: '#A33417', fontSize: '10px', padding: '3px 8px', borderRadius: '20px', fontFamily: 'monospace', fontWeight: 700 }}
                    >
                      SOS
                    </motion.span>
                    <motion.div
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => { e.stopPropagation(); const em = activeEmergencies.find(e => e.user_id === patient.id); if (em) dismissEmergency(em.id) }}
                      style={{ background: 'rgba(163,52,23,0.12)', border: '1px solid rgba(163,52,23,0.3)', borderRadius: '6px', padding: '2px 7px', color: '#A33417', fontSize: '9px', cursor: 'pointer', fontWeight: 700, fontFamily: 'monospace' }}
                    >
                      Resolve
                    </motion.div>
                  </div>
                ) : (
                  <span style={{ background: `${color}15`, border: `1px solid ${color}25`, color, fontSize: '10px', padding: '3px 8px', borderRadius: '20px', fontFamily: 'monospace', fontWeight: 600 }}>
                    {overdueM ? 'Monitor' : sum ? getStatusLabel(score) : '. '}
                  </span>
                )}
                <ChevronRight size={14} color="#6F6D65"/>
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
