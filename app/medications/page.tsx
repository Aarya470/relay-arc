'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Clock, Check, X } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import BottomNav from '@/components/BottomNav'

export default function Medications() {
  const [medications, setMedications] = useState<any[]>([])
  const [taken, setTaken] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [addingTime, setAddingTime] = useState<number | null>(null)
  const [newTime, setNewTime] = useState('')
  const [userId, setUserId] = useState<string>('')
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      const meds = (data?.medications || []).map((m: any) => ({
        ...m,
        times: m.times || ['Morning']
      }))
      setMedications(meds)
      setLoading(false)
    }
    load()
  }, [])

  const toggleTaken = (medIndex: number, timeIndex: number) => {
    const key = `${medIndex}-${timeIndex}`
    const newTaken = { ...taken, [key]: !taken[key] }
    setTaken(newTaken)
    if (!taken[key]) toast.success('Dose marked as taken')
  }

  const addTime = async (medIndex: number) => {
    if (!newTime.trim()) return
    const updated = [...medications]
    updated[medIndex].times = [...(updated[medIndex].times || []), newTime]
    setMedications(updated)
    setNewTime('')
    setAddingTime(null)
    await supabase.from('profiles').update({ medications: updated }).eq('id', userId)
    toast.success('Time added')
  }

  const removeTime = async (medIndex: number, timeIndex: number) => {
    const updated = [...medications]
    updated[medIndex].times.splice(timeIndex, 1)
    setMedications([...updated])
    await supabase.from('profiles').update({ medications: updated }).eq('id', userId)
  }

  const totalDoses = medications.reduce((acc, m) => acc + (m.times?.length || 1), 0)
  const takenCount = Object.values(taken).filter(Boolean).length
  const progress = totalDoses > 0 ? (takenCount / totalDoses) * 100 : 0

  if (loading) return (
    <div className="min-h-screen bg-[#09090C] px-4 py-8 pb-24 space-y-3">
      {[1,2,3].map(i => <Skeleton key={i} className="h-28 w-full rounded-3xl bg-white/5"/>)}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#09090C] pb-24">

      {/* Header */}
      <div className="px-5 pt-14 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => router.push('/dashboard')}
            className="w-9 h-9 rounded-xl bg-white/6 flex items-center justify-center"
          >
            <ArrowLeft size={16} className="text-white/60"/>
          </motion.button>
          <div>
            <h1 className="text-white text-xl font-bold">Medications</h1>
            <p className="text-white/35 text-xs">{new Date().toLocaleDateString('en-US', { weekday: 'long' })}</p>
          </div>
        </div>

        {/* Progress card */}
        <div className="bg-[#111116] border border-white/8 rounded-3xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-white font-semibold">{takenCount} of {totalDoses} doses taken</p>
              <p className="text-white/35 text-xs mt-0.5">
                {takenCount === totalDoses && totalDoses > 0 ? '🎉 All done for today!' : `${totalDoses - takenCount} remaining`}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full border-2 border-[#80EF80]/30 flex items-center justify-center relative">
              <span className="text-[#80EF80] font-bold text-sm">{Math.round(progress)}%</span>
            </div>
          </div>
          <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full bg-[#80EF80] rounded-full"
            />
          </div>
        </div>
      </div>

      {/* Medications */}
      <div className="px-4 space-y-3">
        {medications.length === 0 && (
          <div className="text-center py-12">
            <p className="text-white/25 text-sm">No medications added yet</p>
          </div>
        )}

        {medications.map((med: any, medIndex: number) => (
          <motion.div
            key={medIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: medIndex * 0.05 }}
            className="bg-[#111116] border border-white/8 rounded-3xl overflow-hidden"
          >
            {/* Med header */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#fcb546]/10 border border-[#fcb546]/20 flex items-center justify-center">
                  <span className="text-base">💊</span>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{med.name}</p>
                  <p className="text-white/35 text-xs">{med.dose} · {med.frequency}</p>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setAddingTime(addingTime === medIndex ? null : medIndex)}
                className="w-8 h-8 rounded-xl bg-white/6 flex items-center justify-center"
              >
                <Plus size={14} className="text-white/50"/>
              </motion.button>
            </div>

            {/* Add time */}
            <AnimatePresence>
              {addingTime === medIndex && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-4 pb-3 overflow-hidden"
                >
                  <div className="flex gap-2">
                    <input
                      type="time"
                      value={newTime}
                      onChange={e => setNewTime(e.target.value)}
                      className="flex-1 bg-[#09090C] border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-[#fcb546]/40"
                    />
                    <button
                      onClick={() => addTime(medIndex)}
                      className="bg-[#fcb546] text-black font-semibold px-4 py-2 rounded-xl text-sm"
                    >
                      Add
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Dose times */}
            <div className="border-t border-white/6">
              {med.times?.map((time: string, timeIndex: number) => {
                const key = `${medIndex}-${timeIndex}`
                const isTaken = taken[key]
                return (
                  <motion.div
                    key={timeIndex}
                    className={`flex items-center gap-3 px-4 py-3 border-b border-white/4 last:border-0 transition-all ${
                      isTaken ? 'opacity-50' : ''
                    }`}
                  >
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => toggleTaken(medIndex, timeIndex)}
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
                        isTaken
                          ? 'bg-[#80EF80] border-[#80EF80]'
                          : 'border-white/20 hover:border-[#80EF80]/50'
                      }`}
                    >
                      {isTaken && <Check size={14} className="text-black"/>}
                    </motion.button>

                    <div className="flex items-center gap-1.5 flex-1">
                      <Clock size={12} className="text-white/30"/>
                      <p className="text-white/70 text-sm">{time}</p>
                    </div>

                    {isTaken ? (
                      <span className="text-[#80EF80] text-xs font-mono">Done</span>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleTaken(medIndex, timeIndex)}
                        className="bg-[#fcb546]/10 border border-[#fcb546]/25 text-[#fcb546] text-xs px-3 py-1.5 rounded-full font-medium"
                      >
                        Take
                      </motion.button>
                    )}

                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => removeTime(medIndex, timeIndex)}
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-400/10 transition"
                    >
                      <X size={12}/>
                    </motion.button>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        ))}
      </div>

      <BottomNav/>
    </div>
  )
}
