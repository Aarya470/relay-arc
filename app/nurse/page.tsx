'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { DEMO_PATIENTS, DEMO_CHECKINS, DEMO_EMERGENCIES, DEMO_BANNER } from '@/lib/demo-data'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, AlertCircle, ChevronRight, User } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'
import IntendedUse from '@/components/IntendedUse'

export default function NurseDashboard() {
  const [patients, setPatients] = useState<any[]>([])
  const [checkins, setCheckins] = useState<any[]>([])
  const [emergencies, setEmergencies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [tab, setTab] = useState('overview')
  const [isDemo, setIsDemo] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      // ?demo=1 renders this real dashboard against synthetic fixtures, so it can
      // be shown or recorded without a login and without a real patient's chart.
      if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === '1') {
        setIsDemo(true)
        setPatients(DEMO_PATIENTS as any)
        setCheckins(DEMO_CHECKINS as any)
        setEmergencies(DEMO_EMERGENCIES as any)
        setLoading(false)
        return
      }
      const [{ data: p }, { data: c }, { data: e }] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('checkins').select('*').order('created_at', { ascending: false }),
        supabase.from('emergencies').select('*').eq('status', 'active').order('created_at', { ascending: false })
      ])
      setPatients(p || [])
      setCheckins(c || [])
      setEmergencies(e || [])
      setLoading(false)
    }
    load()
  }, [])

  const getCheckins = (id: string) => checkins.filter(c => c.user_id === id)
  const getEmergency = (id: string) => emergencies.find(e => e.user_id === id)

  if (loading) return (
    <div className="min-h-screen bg-[#CDDAAD] px-4 py-14 space-y-3">
      {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-3xl bg-[#F2F0E8]"/>)}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#CDDAAD] pb-8">
      {isDemo && (
        <div style={{ background: '#D97757', color: '#141413', padding: '9px 14px', textAlign: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase' }}>
            {DEMO_BANNER}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="px-5 pt-14 pb-4 border-b border-[#EDEAE0]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => selected ? setSelected(null) : router.push('/dashboard')}
              className="w-9 h-9 rounded-xl bg-[#F2F0E8] flex items-center justify-center"
            >
              <ArrowLeft size={16} className="text-[#5C5A52]"/>
            </motion.button>
            <div>
              <p className="text-[#716F67] font-mono text-xs uppercase tracking-wider">
                {selected ? 'Patient detail' : 'Care team'}
              </p>
              <h1 className="text-[#141413] font-bold text-xl">
                {selected ? selected.full_name : 'Nurse Dashboard'}
              </h1>
            </div>
          </div>
          <div className="flex gap-2">
            {emergencies.length > 0 && (
              <span className="bg-[#A33417]/15 border border-[#A33417]/25 text-[#A33417] text-xs px-2.5 py-1 rounded-full font-mono">
                {emergencies.length}
              </span>
            )}
            {!selected && (
              <span className="bg-[#F2F0E8] border border-[#B5C68F] text-[#716F67] text-xs px-2.5 py-1 rounded-full font-mono">
                {patients.length} pts
              </span>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!selected ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="px-4 py-4 space-y-3"
          >

            {/* Active emergencies */}
            {emergencies.map((e, i) => {
              const patient = patients.find(p => p.id === e.user_id)
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#A33417]/10 border border-[#A33417]/25 rounded-2xl p-4 flex items-center gap-3"
                >
                  <motion.div
                    className="w-2 h-2 rounded-full bg-[#A33417] flex-shrink-0"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  <div className="flex-1">
                    <p className="text-[#141413] font-semibold text-sm">{patient?.full_name}</p>
                    <p className="text-[#A33417]/70 text-xs">{e.emergency_type?.replace('_', ' ')} · {new Date(e.created_at).toLocaleTimeString()}</p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelected(patient)}
                    className="bg-[#8F2E14] text-white text-xs font-semibold px-3 py-1.5 rounded-xl"
                  >
                    View
                  </motion.button>
                </motion.div>
              )
            })}

            {/* Criterion 4 labelling — must stay visible. See components/IntendedUse.tsx */}
            <IntendedUse/>

            {/* Patient list */}
            <p className="text-[#716F67] font-mono text-xs uppercase tracking-wider px-1">All patients</p>
            {patients.map((patient, i) => {
              const patientCheckins = getCheckins(patient.id)
              const hasEmergency = getEmergency(patient.id)
              return (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelected(patient)}
                  className="w-full bg-white border border-[#B5C68F] rounded-2xl p-4 flex items-center gap-3 hover:border-[#C4BFB0] transition text-left"
                >
                  <div className="w-10 h-10 rounded-2xl bg-[#687C4D]/15 border border-[#687C4D]/20 flex items-center justify-center text-[#51623B] font-bold text-sm flex-shrink-0">
                    {patient.full_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#141413] font-semibold text-sm truncate">{patient.full_name}</p>
                    <p className="text-[#716F67] text-xs truncate">{patient.diagnosis}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      hasEmergency ? 'bg-[#A33417]' :
                      patientCheckins.length > 0 ? 'bg-[#51623B]' : 'bg-[#D8D4C8]'
                    }`}/>
                    <ChevronRight size={14} className="text-[#C4BFB0]"/>
                  </div>
                </motion.button>
              )
            })}

            {patients.length === 0 && (
              <div className="text-center py-12">
                <User size={32} className="text-[#C6CBD3] mx-auto mb-3"/>
                <p className="text-[#716F67] text-sm">No patients yet</p>
              </div>
            )}

          </motion.div>
        ) : (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="px-4 py-4 space-y-3"
          >

            {/* Patient header card */}
            <div className="bg-white border border-[#B5C68F] rounded-3xl p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-[#687C4D]/15 border border-[#687C4D]/20 flex items-center justify-center text-[#51623B] font-bold text-lg">
                  {selected.full_name?.[0]}
                </div>
                <div>
                  <h2 className="text-[#141413] font-bold text-lg">{selected.full_name}</h2>
                  <p className="text-[#716F67] text-xs font-mono">{selected.diagnosis}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Phone', value: selected.phone || 'N/A' },
                  { label: 'Cardiologist', value: selected.cardiologist || 'N/A' },
                  { label: 'Allergies', value: selected.allergies || 'None', red: true },
                  { label: 'Surgery', value: formatDate(selected.surgery_date) },
                ].map((item, i) => (
                  <div key={i} className="bg-[#CDDAAD] rounded-xl p-2.5">
                    <p className="text-[#716F67] font-mono text-xs uppercase tracking-wider mb-1">{item.label}</p>
                    <p className={`text-xs font-medium ${item.red && item.value !== 'None' ? 'text-[#A33417]' : 'text-[#5C5A52]'}`}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-white border border-[#B5C68F] rounded-2xl p-1">
              {['overview', 'checkins', 'medications'].map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition capitalize ${
                    tab === t ? 'bg-white text-[#141413] shadow-sm' : 'text-[#716F67] hover:text-[#5C5A52]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {tab === 'overview' && (
              <div className="space-y-3">
                <div className="bg-white border border-[#B5C68F] rounded-2xl p-4">
                  <p className="text-[#716F67] font-mono text-xs uppercase tracking-wider mb-3">Emergency contacts</p>
                  {selected.emergency_contacts?.map((c: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-[#EDEAE0] last:border-0">
                      <div className="w-8 h-8 rounded-xl bg-[#687C4D]/10 flex items-center justify-center text-[#51623B] text-xs font-bold">
                        {c.name?.[0]}
                      </div>
                      <div>
                        <p className="text-[#141413] text-sm">{c.name}</p>
                        <p className="text-[#716F67] text-xs">{c.relationship} · {c.phone}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'checkins' && (
              <div className="bg-white border border-[#B5C68F] rounded-2xl p-4">
                <p className="text-[#716F67] font-mono text-xs uppercase tracking-wider mb-3">Check-in history</p>
                {getCheckins(selected.id).length === 0 && <p className="text-[#716F67] text-sm">No check-ins yet</p>}
                {getCheckins(selected.id).slice(0, 10).map((c, i) => (
                  <div key={i} className="py-2.5 border-b border-[#EDEAE0] last:border-0">
                    <p className="text-[#716F67] font-mono text-xs mb-1">{new Date(c.created_at).toLocaleString()}</p>
                    <p className="text-[#5C5A52] text-xs leading-relaxed">{c.summary}</p>
                  </div>
                ))}
              </div>
            )}

            {tab === 'medications' && (
              <div className="bg-white border border-[#B5C68F] rounded-2xl p-4">
                <p className="text-[#716F67] font-mono text-xs uppercase tracking-wider mb-3">Medications</p>
                {selected.medications?.length === 0 && <p className="text-[#716F67] text-sm">No medications</p>}
                {selected.medications?.map((m: any, i: number) => (
                  <div key={i} className="flex justify-between items-center py-2.5 border-b border-[#EDEAE0] last:border-0">
                    <div>
                      <p className="text-[#141413] text-sm font-medium">{m.name}</p>
                      <p className="text-[#716F67] text-xs">{m.frequency}</p>
                    </div>
                    <span className="text-[#716F67] font-mono text-xs">{m.dose}</span>
                  </div>
                ))}
              </div>
            )}

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
