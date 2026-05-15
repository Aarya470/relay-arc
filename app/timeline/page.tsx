'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ChevronDown, RefreshCw, CheckCircle2, Circle } from 'lucide-react'
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

  const currentIdx = timeline.findIndex(p => p.isCurrent)

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#07070E', padding: '80px 16px 100px' }}>
      {[1,2,3,4].map(i => <Skeleton key={i} style={{ height: '64px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', marginBottom: '8px' }}/>)}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#07070E', paddingBottom: '100px' }}>

      <div style={{ padding: '56px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => router.push('/dashboard')}
              style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowLeft size={15} color="rgba(237,234,224,0.5)"/>
            </motion.button>
            <div>
              <h1 style={{ color: '#EDEAE0', fontWeight: 800, fontSize: '20px', letterSpacing: '-0.5px' }}>Recovery Timeline</h1>
              <p style={{ color: 'rgba(237,234,224,0.3)', fontSize: '12px' }}>Personalized for you</p>
            </div>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => generateTimeline(profile)} disabled={generating}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw size={14} color="rgba(237,234,224,0.4)" style={{ animation: generating ? 'spin 1s linear infinite' : 'none' }}/>
          </motion.button>
        </div>
      </div>

      {generating && (
        <div style={{ padding: '0 20px 16px' }}>
          <div style={{ background: 'rgba(252,181,70,0.04)', border: '1px solid rgba(252,181,70,0.12)', borderRadius: '16px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[0,1,2].map(i => (
                <motion.div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fcb546' }}
                  animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}/>
              ))}
            </div>
            <p style={{ color: 'rgba(237,234,224,0.4)', fontSize: '13px' }}>Generating your personalized timeline...</p>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div style={{ padding: '0 20px', position: 'relative' }}>

        {/* Vertical connector line */}
        {timeline.length > 0 && (
          <div style={{ position: 'absolute', left: '34px', top: '15px', bottom: '15px', width: '2px', background: 'linear-gradient(to bottom, rgba(252,181,70,0.4) 0%, rgba(128,239,128,0.25) 50%, rgba(255,255,255,0.05) 100%)', borderRadius: '99px', zIndex: 0, pointerEvents: 'none' }}/>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative', zIndex: 1 }}>
          {timeline.map((phase, index) => {
            const isCurrent = phase.isCurrent
            const isPast = currentIdx !== -1 && index < currentIdx
            const dotBorder = isCurrent ? '#fcb546' : isPast ? '#80EF80' : 'rgba(237,234,224,0.15)'
            const cardBorder = isCurrent ? 'rgba(252,181,70,0.22)' : isPast ? 'rgba(128,239,128,0.12)' : 'rgba(255,255,255,0.06)'
            const cardBg = isCurrent ? 'rgba(252,181,70,0.035)' : 'rgba(255,255,255,0.018)'

            return (
              <motion.div key={index} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.06, type: 'spring', stiffness: 280, damping: 24 }}
                style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>

                {/* Node */}
                <div style={{ paddingTop: '12px', flexShrink: 0, position: 'relative', zIndex: 2 }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#07070E', border: `2px solid ${dotBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: isCurrent ? '0 0 14px rgba(252,181,70,0.35)' : 'none' }}>
                    {isPast
                      ? <CheckCircle2 size={14} color="#80EF80"/>
                      : isCurrent
                        ? <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.8, 1, 0.8] }} transition={{ duration: 1.8, repeat: Infinity }} style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#fcb546' }}/>
                        : <Circle size={12} color="rgba(237,234,224,0.15)"/>
                    }
                  </div>
                </div>

                {/* Card */}
                <div style={{ flex: 1, background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '18px', overflow: 'hidden', boxShadow: isCurrent ? '0 6px 28px rgba(252,181,70,0.09)' : '0 2px 10px rgba(0,0,0,0.35)' }}>
                  <motion.button whileTap={{ scale: 0.99 }} onClick={() => setExpanded(expanded === index ? null : index)}
                    style={{ width: '100%', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <p style={{ color: '#EDEAE0', fontWeight: 700, fontSize: '14px', letterSpacing: '-0.2px' }}>{phase.title}</p>
                        {isCurrent && (
                          <span style={{ background: 'rgba(252,181,70,0.12)', border: '1px solid rgba(252,181,70,0.25)', color: '#fcb546', fontSize: '9px', padding: '2px 8px', borderRadius: '99px', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.5px' }}>NOW</span>
                        )}
                      </div>
                      <p style={{ color: 'rgba(237,234,224,0.28)', fontSize: '11px', fontFamily: 'monospace' }}>{phase.week}</p>
                    </div>
                    <ChevronDown size={15} color="rgba(237,234,224,0.22)" style={{ transform: expanded === index ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}/>
                  </motion.button>

                  <AnimatePresence>
                    {expanded === index && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} style={{ overflow: 'hidden' }}>
                        <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          {[
                            { label: "What's normal", items: phase.normal, color: 'rgba(237,234,224,0.4)', dot: 'rgba(237,234,224,0.25)' },
                            { label: 'Watch out for', items: phase.watchout, color: '#FF4A42', dot: '#FF4A42' },
                            { label: 'What to do', items: phase.todo, color: '#80EF80', dot: '#80EF80' },
                          ].map((section, si) => (
                            <div key={si}>
                              <p style={{ color: section.color, fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>{section.label}</p>
                              {section.items?.map((item: string, ii: number) => (
                                <div key={ii} style={{ display: 'flex', gap: '10px', marginBottom: '6px', alignItems: 'flex-start' }}>
                                  <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: section.dot, flexShrink: 0, marginTop: '7px' }}/>
                                  <p style={{ color: 'rgba(237,234,224,0.55)', fontSize: '12px', lineHeight: 1.55 }}>{item}</p>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )
          })}
        </div>

        {!generating && timeline.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ color: 'rgba(237,234,224,0.25)', fontSize: '14px', marginBottom: '12px' }}>Could not generate timeline</p>
            <button onClick={() => generateTimeline(profile)} style={{ color: '#fcb546', fontSize: '13px', fontWeight: 600, background: 'none', border: '1px solid rgba(252,181,70,0.25)', borderRadius: '10px', padding: '8px 16px', cursor: 'pointer' }}>
              Try again
            </button>
          </div>
        )}
      </div>

      <BottomNav/>
    </div>
  )
}
