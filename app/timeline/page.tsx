'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import BottomNav from '@/components/BottomNav'
import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY!,
  dangerouslyAllowBrowser: true
})

export default function Timeline() {
  const [profile, setProfile] = useState<any>(null)
  const [timeline, setTimeline] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(null)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      setLoading(false)
      generateTimeline(data)
    }
    load()
  }, [])

  const generateTimeline = async (profileData: any) => {
    setGenerating(true)
    setExpanded(null)

    const weeksSinceSurgery = profileData?.surgery_date
      ? Math.floor((Date.now() - new Date(profileData.surgery_date).getTime()) / (1000 * 60 * 60 * 24 * 7))
      : null

    const prompt = `Generate a personalized recovery timeline for this patient as JSON only.
Patient: ${profileData?.full_name}, Conditions: ${profileData?.diagnosis},
Medications: ${JSON.stringify(profileData?.medications)},
Surgery date: ${profileData?.surgery_date || 'N/A'}, Weeks since surgery: ${weeksSinceSurgery || 'N/A'}.

Return a JSON array of 4-6 phases. Each phase:
{
  "week": "time period string",
  "title": "phase name",
  "normal": ["symptom 1", "symptom 2"],
  "watchout": ["red flag 1", "red flag 2"],
  "todo": ["action 1", "action 2"],
  "isCurrent": true or false
}

Make it specific to their exact conditions. Return ONLY valid JSON array, no other text.`

    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3
      })
      const text = completion.choices[0].message.content || '[]'
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      setTimeline(parsed)
      const currentIdx = parsed.findIndex((p: any) => p.isCurrent)
      if (currentIdx !== -1) setExpanded(currentIdx)
    } catch (e) {
      console.error(e)
    }

    setGenerating(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#09090C] px-4 py-8 pb-24 space-y-3">
      {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full rounded-3xl bg-white/5"/>)}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#09090C] pb-24">

      {/* Header */}
      <div className="px-5 pt-14 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => router.push('/dashboard')}
              className="w-9 h-9 rounded-xl bg-white/6 flex items-center justify-center"
            >
              <ArrowLeft size={16} className="text-white/60"/>
            </motion.button>
            <div>
              <h1 className="text-white text-xl font-bold">Recovery Timeline</h1>
              <p className="text-white/35 text-xs">Personalized for you</p>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => generateTimeline(profile)}
            disabled={generating}
            className="w-9 h-9 rounded-xl bg-white/6 flex items-center justify-center"
          >
            <RefreshCw size={15} className={`text-white/50 ${generating ? 'animate-spin' : ''}`}/>
          </motion.button>
        </div>
      </div>

      {/* Generating state */}
      {generating && (
        <div className="px-4 mb-4">
          <div className="bg-[#111116] border border-white/8 rounded-3xl p-5">
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-[#fcb546]"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
              <p className="text-white/50 text-sm">AI generating your personalized timeline...</p>
            </div>
            <div className="mt-3 space-y-2">
              <Skeleton className="h-3 w-3/4 bg-white/5 rounded-full"/>
              <Skeleton className="h-3 w-1/2 bg-white/5 rounded-full"/>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="px-4 space-y-2">
        {timeline.map((phase, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            className={`border rounded-3xl overflow-hidden transition-all ${
              phase.isCurrent
                ? 'border-[#fcb546]/30 bg-[#fcb546]/4'
                : 'border-white/8 bg-[#111116]'
            }`}
          >
            {/* Phase header */}
            <motion.button
              whileTap={{ scale: 0.99 }}
              onClick={() => setExpanded(expanded === index ? null : index)}
              className="w-full p-4 flex items-center gap-3 text-left"
            >
              <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                phase.isCurrent
                  ? 'bg-[#fcb546] text-black'
                  : index < (timeline.findIndex((p: any) => p.isCurrent))
                  ? 'bg-[#80EF80]/20 text-[#80EF80]'
                  : 'bg-white/8 text-white/40'
              }`}>
                {index < (timeline.findIndex((p: any) => p.isCurrent)) ? '✓' : index + 1}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white font-semibold text-sm truncate">{phase.title}</p>
                  {phase.isCurrent && (
                    <span className="bg-[#fcb546]/15 text-[#fcb546] text-xs px-2 py-0.5 rounded-full font-mono flex-shrink-0">
                      Now
                    </span>
                  )}
                </div>
                <p className={`text-xs font-mono mt-0.5 ${
                  phase.isCurrent ? 'text-[#fcb546]/60' : 'text-white/25'
                }`}>{phase.week}</p>
              </div>

              {expanded === index
                ? <ChevronUp size={16} className="text-white/30 flex-shrink-0"/>
                : <ChevronDown size={16} className="text-white/30 flex-shrink-0"/>
              }
            </motion.button>

            {/* Phase details */}
            <AnimatePresence>
              {expanded === index && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-4 border-t border-white/6 pt-3">

                    <div>
                      <p className="text-white/35 font-mono text-xs uppercase tracking-wider mb-2">What's normal</p>
                      <div className="space-y-1.5">
                        {phase.normal?.map((item: string, i: number) => (
                          <div key={i} className="flex gap-2.5 items-start">
                            <span className="text-white/20 mt-0.5 flex-shrink-0">—</span>
                            <p className="text-white/60 text-xs leading-relaxed">{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-red-400/70 font-mono text-xs uppercase tracking-wider mb-2">Watch out for</p>
                      <div className="space-y-1.5">
                        {phase.watchout?.map((item: string, i: number) => (
                          <div key={i} className="flex gap-2.5 items-start">
                            <span className="text-red-400/60 mt-0.5 flex-shrink-0 text-xs">!</span>
                            <p className="text-white/60 text-xs leading-relaxed">{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[#80EF80]/70 font-mono text-xs uppercase tracking-wider mb-2">What to do</p>
                      <div className="space-y-1.5">
                        {phase.todo?.map((item: string, i: number) => (
                          <div key={i} className="flex gap-2.5 items-start">
                            <span className="text-[#80EF80]/60 mt-0.5 flex-shrink-0 text-xs">✓</span>
                            <p className="text-white/60 text-xs leading-relaxed">{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}

        {!generating && timeline.length === 0 && (
          <div className="text-center py-12">
            <p className="text-white/25 text-sm mb-4">Could not generate timeline</p>
            <button
              onClick={() => generateTimeline(profile)}
              className="text-[#fcb546] text-sm border border-[#fcb546]/30 px-4 py-2 rounded-xl"
            >
              Try again
            </button>
          </div>
        )}
      </div>

      <BottomNav/>
    </div>
  )
}
