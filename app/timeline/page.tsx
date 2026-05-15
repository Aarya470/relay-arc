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

const spring = { type: 'spring', stiffness: 340, damping: 26 } as const

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
    <div style={{ minHeight: '100dvh', background: '#07070E', padding: '80px 16px 100px' }}>
      {[1,2,3,4].map(i => <Skeleton key={i} style={{ height: '64px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', marginBottom: '8px' }}/>)}
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', background: '#07070E', paddingBottom: '100px' }}>

      <div style={{ padding: '56px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <motion.button
              whileTap={{ scale: 0.9 }}
              transition={spring}
              onClick={() => router.push('/dashboard')}
              style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <ArrowLeft size={15} color="rgba(237,234,224,0.5)"/>
            </motion.button>
            <div>
              <h1 style={{ color: '#EDEAE0', fontWeight: 900, fontSize: '20px', letterSpacing: '-0.7px' }}>Recovery Timeline</h1>
              <p style={{ color: 'rgba(237,234,224,0.28)', fontSize: '12px' }}>Personalized for you</p>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            transition={spring}
            onClick={() => generateTimeline(profile)}
            disabled={generating}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <motion.div
              animate={generating ? { rotate: 360 } : { rotate: 0 }}
              transition={generating ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
            >
              <RefreshCw size={14} color="rgba(237,234,224,0.4)"/>
            </motion.div>
          </motion.button>
        </div>
      </div>

      {generating && (
        <div style={{ padding: '0 20px 16px' }}>
          <div style={{ background: 'rgba(252,181,70,0.04)', border: '1px solid rgba(252,181,70,0.1)', borderRadius: '16px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[0,1,2].map(i => (
                <motion.div
                  key={i}
                  style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fcb546' }}
                  animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
                />
              ))}
            </div>
            <p style={{ color: 'rgba(237,234,224,0.38)', fontSize: '13px' }}>Generating your personalized timeline...</p>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div style={{ padding: '0 20px', position: 'relative' }}>

        {/* Vertical connector line */}
        {timeline.length > 0 && (
          <div style={{ position: 'absolute', left: '34px', top: '15px', bottom: '15px', width: '2px', background: 'linear-gradient(to bottom, rgba(252,181,70,0.4) 0%, rgba(128,239,128,0.22) 50%, rgba(255,255,255,0.04) 100%)', borderRadius: '99px', zIndex: 0, pointerEvents: 'none' }}/>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative', zIndex: 1 }}>
          {timeline.map((phase, index) => {
            const isCurrent = phase.isCurrent
            const isPast = currentIdx !== -1 && index < currentIdx
            const dotBorder = isCurrent ? '#fcb546' : isPast ? '#80EF80' : 'rgba(237,234,224,0.14)'
            const cardBorder = isCurrent ? 'rgba(252,181,70,0.2)' : isPast ? 'rgba(128,239,128,0.1)' : 'rgba(255,255,255,0.06)'
            const cardBg = isCurrent ? 'rgba(252,181,70,0.03)' : 'rgba(255,255,255,0.016)'

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.07, ...spring }}
                style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}
              >
                {/* Node */}
                <div style={{ paddingTop: '12px', flexShrink: 0, position: 'relative', zIndex: 2 }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#07070E', border: `2px solid ${dotBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: isCurrent ? '0 0 14px rgba(252,181,70,0.32)' : 'none', transition: 'box-shadow 0.3s ease' }}>
                    {isPast
                      ? <CheckCircle2 size={14} color="#80EF80"/>
                      : isCurrent
                        ? <motion.div
                            animate={{ scale: [1, 1.45, 1], opacity: [0.8, 1, 0.8] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                            style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#fcb546' }}
                          />
                        : <Circle size={12} color="rgba(237,234,224,0.14)"/>
                    }
                  </div>
                </div>

                {/* Card */}
                <div style={{ flex: 1, background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '18px', overflow: 'hidden', boxShadow: isCurrent ? '0 6px 28px rgba(252,181,70,0.07)' : '0 2px 10px rgba(0,0,0,0.3)' }}>
                  <motion.button
                    whileTap={{ scale: 0.99 }}
                    transition={spring}
                    onClick={() => setExpanded(expanded === index ? null : index)}
                    style={{ width: '100%', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <p style={{ color: '#EDEAE0', fontWeight: 700, fontSize: '14px', letterSpacing: '-0.3px' }}>{phase.title}</p>
                        {isCurrent && (
                          <span style={{ background: 'rgba(252,181,70,0.1)', border: '1px solid rgba(252,181,70,0.22)', color: '#fcb546', fontSize: '9px', padding: '2px 8px', borderRadius: '99px', fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, letterSpacing: '0.5px' }}>NOW</span>
                        )}
                      </div>
                      <p style={{ color: 'rgba(237,234,224,0.26)', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)' }}>{phase.week}</p>
                    </div>
                    <motion.div
                      animate={{ rotate: expanded === index ? 180 : 0 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      style={{ flexShrink: 0 }}
                    >
                      <ChevronDown size={15} color="rgba(237,234,224,0.22)"/>
                    </motion.div>
                  </motion.button>

                  <AnimatePresence>
                    {expanded === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          {[
                            { label: "What's normal", items: phase.normal, color: 'rgba(237,234,224,0.38)', dot: 'rgba(237,234,224,0.22)' },
                            { label: 'Watch out for', items: phase.watchout, color: '#FF4A42', dot: '#FF4A42' },
                            { label: 'What to do', items: phase.todo, color: '#80EF80', dot: '#80EF80' },
                          ].map((section, si) => (
                            <div key={si}>
                              <p style={{ color: section.color, fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>{section.label}</p>
                              {section.items?.map((item: string, ii: number) => (
                                <div key={ii} style={{ display: 'flex', gap: '10px', marginBottom: '6px', alignItems: 'flex-start' }}>
                                  <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: section.dot, flexShrink: 0, marginTop: '7px' }}/>
                                  <p style={{ color: 'rgba(237,234,224,0.52)', fontSize: '12px', lineHeight: 1.55 }}>{item}</p>
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
          <div style={{ textAlign: 'center', padding: '56px 0' }}>
            <p style={{ color: 'rgba(237,234,224,0.22)', fontSize: '14px', marginBottom: '12px' }}>Could not generate timeline</p>
            <button
              onClick={() => generateTimeline(profile)}
              style={{ color: '#fcb546', fontSize: '13px', fontWeight: 700, background: 'none', border: '1px solid rgba(252,181,70,0.22)', borderRadius: '10px', padding: '8px 16px', cursor: 'pointer' }}
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
