'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowLeft, Sparkles, RefreshCw } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import BottomNav from '@/components/BottomNav'
import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY!,
  dangerouslyAllowBrowser: true
})

export default function AppointmentSummary() {
  const [profile, setProfile] = useState<any>(null)
  const [checkins, setCheckins] = useState<any[]>([])
  const [emergencies, setEmergencies] = useState<any[]>([])
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: p }, { data: c }, { data: e }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('checkins').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('emergencies').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      ])

      setProfile(p)
      setCheckins(c || [])
      setEmergencies(e || [])
      setLoading(false)
    }
    load()
  }, [])

  const generateSummary = async () => {
    setGenerating(true)
    const prompt = `Generate a concise medical appointment summary for a doctor visit.

Patient: ${profile?.full_name}
Conditions: ${profile?.diagnosis}
Medications: ${JSON.stringify(profile?.medications)}
Allergies: ${profile?.allergies}
Surgery date: ${profile?.surgery_date || 'N/A'}

Recent check-ins:
${checkins.map(c => `- ${new Date(c.created_at).toLocaleDateString()}: ${c.summary}`).join('\n')}

Emergency events: ${emergencies.length > 0 ? emergencies.map(e => `${e.emergency_type} on ${new Date(e.created_at).toLocaleDateString()}`).join(', ') : 'None'}

Write a structured summary a doctor can read in 60 seconds covering:
1. Patient overview
2. Key symptoms and patterns
3. Emergency events if any
4. Medication notes
5. Suggested questions for the doctor

Be professional and concise.`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }]
    })

    setSummary(completion.choices[0].message.content || '')
    setGenerating(false)
    toast.success('Summary generated')
  }

  if (loading) return (
    <div className="min-h-screen bg-[#09090C] px-4 py-8 pb-24 space-y-3">
      {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full rounded-3xl bg-white/5"/>)}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#09090C] pb-24">

      {/* Header */}
      <div className="px-5 pt-14 pb-4">
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => router.push('/dashboard')}
            className="w-9 h-9 rounded-xl bg-white/6 flex items-center justify-center"
          >
            <ArrowLeft size={16} className="text-white/60"/>
          </motion.button>
          <div>
            <h1 className="text-white text-xl font-bold">Appointment Summary</h1>
            <p className="text-white/35 text-xs">AI-generated for your next visit</p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-3">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Check-ins', value: checkins.length, color: 'text-[#80EF80]' },
            { label: 'Emergencies', value: emergencies.length, color: 'text-red-400' },
            { label: 'Medications', value: profile?.medications?.length || 0, color: 'text-[#fcb546]' },
          ].map((stat, i) => (
            <div key={i} className="bg-[#111116] border border-white/8 rounded-2xl p-3 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-white/30 font-mono text-xs mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Generate */}
        {!summary ? (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={generateSummary}
            disabled={generating}
            className="w-full bg-gradient-to-r from-[#fcb546] to-[#f5a832] text-black font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {generating ? (
              <>
                <RefreshCw size={16} className="animate-spin"/>
                Generating...
              </>
            ) : (
              <>
                <Sparkles size={16}/>
                Generate AI Summary
              </>
            )}
          </motion.button>
        ) : (
          <div className="bg-[#111116] border border-white/8 rounded-3xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-[#fcb546]"/>
                <p className="text-white/50 font-mono text-xs uppercase tracking-wider">AI Summary</p>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={generateSummary}
                className="w-7 h-7 rounded-lg bg-white/6 flex items-center justify-center"
              >
                <RefreshCw size={12} className="text-white/40"/>
              </motion.button>
            </div>
            <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{summary}</p>
          </div>
        )}

        {/* Recent check-ins */}
        <div className="bg-[#111116] border border-white/8 rounded-3xl p-4">
          <p className="text-white/35 font-mono text-xs uppercase tracking-wider mb-3">Recent check-ins</p>
          {checkins.length === 0 && <p className="text-white/25 text-sm">No check-ins yet</p>}
          <div className="space-y-3">
            {checkins.slice(0, 5).map((c, i) => (
              <div key={i} className="border-b border-white/6 pb-3 last:border-0 last:pb-0">
                <p className="text-white/25 font-mono text-xs mb-1">{new Date(c.created_at).toLocaleDateString()}</p>
                <p className="text-white/60 text-xs leading-relaxed">{c.summary}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      <BottomNav/>
    </div>
  )
}
