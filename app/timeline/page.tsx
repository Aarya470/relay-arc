'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ChevronDown, RefreshCw } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import BottomNav from '@/components/BottomNav'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY!, dangerouslyAllowBrowser: true })

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

  const generateTimeline = async (p: any) => {
    setGenerating(true)
    setExpanded(null)
    const weeks = p?.surgery_date ? Math.floor((Date.now() - new Date(p.surgery_date).getTime()) / (1000 * 60 * 60 * 24 * 7)) : null
    const prompt = `Generate a personalized recovery timeline as JSON only.
Patient: ${p?.full_name}, Conditions: ${p?.diagnosis}, Meds: ${JSON.stringify(p?.medications)}, Surgery: ${p?.surgery_date || 'N/A'}, Weeks since surgery: ${weeks || 'N/A'}.
Return JSON array of 4-6 phases. Each: { "week": string, "title": string, "normal": string[], "watchout": string[], "todo": string[], "isCurrent": boolean }
Make it specific to their conditions. JSON only, no other text.`

    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3
      })
      const text = completion.choices[0].message.content || '[]'
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
      setTimeline(parsed)
      const idx = parsed.findIndex((p: any) => p.isCurrent)
      if (idx !== -1) setExpanded(idx)
    } catch (e) { console.error(e) }
    setGenerating(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#07070E', padding: '80px 16px 100px' }}>
      {[1,2,3,4].map(i => <Skeleton key={i} style={{ height: '64px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', marginBottom: '8px' }}/>)}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#07070E', paddingBottom: '100px' }}>

      <div style={{ padding: '56px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => router.push('/dashboard')}
              style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowLeft size={15} color="rgba(237,234,224,0.5)"/>
            </motion.button>
            <div>
              <h1 style={{ color: '#EDEAE0', fontWeight: 800, fontSize: '20px', letterSpacing: '-0.5px' }}>Recovery Timeline</h1>
              <p style={{ color: 'rgba(237,234,224,0.3)', fontSize: '12px' }}>Personalized for you</p>
            </div>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => generateTimeline(profile)} disabled={generating}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw size={14} color="rgba(237,234,224,0.4)" style={{ animation: generating ? 'spin 1s linear infinite' : 'none' }}/>
          </motion.button>
        </div>
      </div>

      {generating && (
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[0,1,2].map(i => (
                <motion.div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fcb546' }}
                  animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}/>
              ))}
            </div>
            <p style={{ color: 'rgba(237,234,224,0.4)', fontSize: '13px' }}>Generating your personalized timeline...</p>
          </div>
        </div>
      )}

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {timeline.map((phase, index) => {
          const isCurrent = phase.isCurrent
          const isPast = index < timeline.findIndex((p: any) => p.isCurrent)
          const color = isCurrent ? '#fcb546' : isPast ? '#80EF80' : 'rgba(237,234,224,0.25)'

          return (
            <motion.div key={index} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
              style={{ background: isCurrent ? 'rgba(252,181,70,0.04)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isCurrent ? 'rgba(252,181,70,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: '18px', overflow: 'hidden' }}>

              <motion.button whileTap={{ scale: 0.99 }} onClick={() => setExpanded(expanded === index ? null : index)}
                style={{ width: '100%', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: `${color}15`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color, fontWeight: 800, fontSize: '13px' }}>{isPast ? '✓' : index + 1}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <p style={{ color: '#EDEAE0', fontWeight: 600, fontSize: '14px' }}>{phase.title}</p>
                    {isCurrent && (
                      <span style={{ background: 'rgba(252,181,70,0.12)', border: '1px solid rgba(252,181,70,0.25)', color: '#fcb546', fontSize: '9px', padding: '2px 8px', borderRadius: '99px', fontFamily: 'monospace', fontWeight: 700 }}>
                        NOW
                      </span>
                    )}
                  </div>
                  <p style={{ color: 'rgba(237,234,224,0.3)', fontSize: '11px', fontFamily: 'monospace' }}>{phase.week}</p>
                </div>
                <ChevronDown size={15} color="rgba(237,234,224,0.25)" style={{ transform: expanded === index ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}/>
              </motion.button>

              <AnimatePresence>
                {expanded === index && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
                    <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {[
                        { label: "What's normal", items: phase.normal, color: 'rgba(237,234,224,0.3)', dot: 'rgba(237,234,224,0.2)' },
                        { label: 'Watch out for', items: phase.watchout, color: '#FF4A42', dot: '#FF4A42' },
                        { label: 'What to do', items: phase.todo, color: '#80EF80', dot: '#80EF80' },
                      ].map((section, si) => (
                        <div key={si}>
                          <p style={{ color: section.color, fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', opacity: 0.7 }}>{section.label}</p>
                          {section.items?.map((item: string, ii: number) => (
                            <div key={ii} style={{ display: 'flex', gap: '8px', marginBottom: '5px' }}>
                              <span style={{ color: section.dot, fontSize: '14px', flexShrink: 0, marginTop: '-1px' }}>·</span>
                              <p style={{ color: 'rgba(237,234,224,0.55)', fontSize: '12px', lineHeight: 1.5 }}>{item}</p>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}

        {!generating && timeline.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ color: 'rgba(237,234,224,0.25)', fontSize: '14px', marginBottom: '12px' }}>Could not generate timeline</p>
            <button onClick={() => generateTimeline(profile)} style={{ color: '#fcb546', fontSize: '13px', background: 'none', border: '1px solid rgba(252,181,70,0.25)', borderRadius: '10px', padding: '8px 16px', cursor: 'pointer' }}>
              Try again
            </button>
          </div>
        )}
      </div>

      <BottomNav/>
    </div>
  )
}
