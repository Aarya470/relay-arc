'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, AlertCircle, ChevronRight, User } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

export default function NurseDashboard() {
  const [patients, setPatients] = useState<any[]>([])
  const [checkins, setCheckins] = useState<any[]>([])
  const [emergencies, setEmergencies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [tab, setTab] = useState('overview')
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
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
    <div className="min-h-screen bg-[#09090C] px-4 py-14 space-y-3">
      {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-3xl bg-white/5"/>)}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#09090C] pb-8">

      {/* Header */}
      <div className="px-5 pt-14 pb-4 border-b border-white/6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => selected ? setSelected(null) : router.push('/dashboard')}
              className="w-9 h-9 rounded-xl bg-white/6 flex items-center justify-center"
            >
              <ArrowLeft size={16} className="text-white/60"/>
            </motion.button>
            <div>
              <p className="text-white/35 font-mono text-xs uppercase tracking-wider">
                {selected ? 'Patient detail' : 'Care team'}
              </p>
              <h1 className="text-white font-bold text-xl">
                {selected ? selected.full_name : 'Nurse Dashboard'}
              </h1>
            </div>
          </div>
          <div className="flex gap-2">
            {emergencies.length > 0 && (
              <span className="bg-red-500/15 border border-red-500/25 text-red-400 text-xs px-2.5 py-1 rounded-full font-mono">
                {emergencies.length}
              </span>
            )}
            {!selected && (
              <span className="bg-white/6 border border-white/8 text-white/40 text-xs px-2.5 py-1 rounded-full font-mono">
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
                  className="bg-red-950/20 border border-red-500/25 rounded-2xl p-4 flex items-center gap-3"
                >
                  <motion.div
                    className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  <div className="flex-1">
                    <p className="text-white font-semibold text-sm">{patient?.full_name}</p>
                    <p className="text-red-300/70 text-xs">{e.emergency_type?.replace('_', ' ')} · {new Date(e.created_at).toLocaleTimeString()}</p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelected(patient)}
                    className="bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-xl"
                  >
                    View
                  </motion.button>
                </motion.div>
              )
            })}

            {/* Patient list */}
            <p className="text-white/25 font-mono text-xs uppercase tracking-wider px-1">All patients</p>
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
                  className="w-full bg-[#111116] border border-white/8 rounded-2xl p-4 flex items-center gap-3 hover:border-white/15 transition text-left"
                >
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm flex-shrink-0">
                    {patient.full_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{patient.full_name}</p>
                    <p className="text-white/30 text-xs truncate">{patient.diagnosis}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      hasEmergency ? 'bg-red-500' :
                      patientCheckins.length > 0 ? 'bg-[#80EF80]' : 'bg-white/20'
                    }`}/>
                    <ChevronRight size={14} className="text-white/20"/>
                  </div>
                </motion.button>
              )
            })}

            {patients.length === 0 && (
              <div className="text-center py-12">
                <User size={32} className="text-white/15 mx-auto mb-3"/>
                <p className="text-white/25 text-sm">No patients yet</p>
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
            <div className="bg-[#111116] border border-white/8 rounded-3xl p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-lg">
                  {selected.full_name?.[0]}
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg">{selected.full_name}</h2>
                  <p className="text-white/35 text-xs font-mono">{selected.diagnosis}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Phone', value: selected.phone || 'N/A' },
                  { label: 'Cardiologist', value: selected.cardiologist || 'N/A' },
                  { label: 'Allergies', value: selected.allergies || 'None', red: true },
                  { label: 'Surgery', value: selected.surgery_date || 'N/A' },
                ].map((item, i) => (
                  <div key={i} className="bg-[#09090C] rounded-xl p-2.5">
                    <p className="text-white/25 font-mono text-xs uppercase tracking-wider mb-1">{item.label}</p>
                    <p className={`text-xs font-medium ${item.red && item.value !== 'None' ? 'text-red-400' : 'text-white/70'}`}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-[#111116] border border-white/8 rounded-2xl p-1">
              {['overview', 'checkins', 'medications'].map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition capitalize ${
                    tab === t ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {tab === 'overview' && (
              <div className="space-y-3">
                <div className="bg-[#111116] border border-white/8 rounded-2xl p-4">
                  <p className="text-white/35 font-mono text-xs uppercase tracking-wider mb-3">Emergency contacts</p>
                  {selected.emergency_contacts?.map((c: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-white/6 last:border-0">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 text-xs font-bold">
                        {c.name?.[0]}
                      </div>
                      <div>
                        <p className="text-white text-sm">{c.name}</p>
                        <p className="text-white/30 text-xs">{c.relationship} · {c.phone}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'checkins' && (
              <div className="bg-[#111116] border border-white/8 rounded-2xl p-4">
                <p className="text-white/35 font-mono text-xs uppercase tracking-wider mb-3">Check-in history</p>
                {getCheckins(selected.id).length === 0 && <p className="text-white/25 text-sm">No check-ins yet</p>}
                {getCheckins(selected.id).slice(0, 10).map((c, i) => (
                  <div key={i} className="py-2.5 border-b border-white/6 last:border-0">
                    <p className="text-white/25 font-mono text-xs mb-1">{new Date(c.created_at).toLocaleString()}</p>
                    <p className="text-white/60 text-xs leading-relaxed">{c.summary}</p>
                  </div>
                ))}
              </div>
            )}

            {tab === 'medications' && (
              <div className="bg-[#111116] border border-white/8 rounded-2xl p-4">
                <p className="text-white/35 font-mono text-xs uppercase tracking-wider mb-3">Medications</p>
                {selected.medications?.length === 0 && <p className="text-white/25 text-sm">No medications</p>}
                {selected.medications?.map((m: any, i: number) => (
                  <div key={i} className="flex justify-between items-center py-2.5 border-b border-white/6 last:border-0">
                    <div>
                      <p className="text-white text-sm font-medium">{m.name}</p>
                      <p className="text-white/30 text-xs">{m.frequency}</p>
                    </div>
                    <span className="text-white/40 font-mono text-xs">{m.dose}</span>
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
