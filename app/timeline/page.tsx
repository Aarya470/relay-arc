'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ChevronDown, RefreshCw, CheckCircle2, Circle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import BottomNav from '@/components/BottomNav'
import { toast } from 'sonner'

const spring = { type: 'spring', stiffness: 340, damping: 26 } as const
const todayKey = (uid: string) => `timeline_${uid}_${new Date().toDateString()}`

export default function Timeline() {
  const [profile, setProfile] = useState<any>(null)
  const [userId, setUserId] = useState<string>('')
  const [timeline, setTimeline] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [cachedDate, setCachedDate] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const key = todayKey(user.id)
      const cached = localStorage.getItem(key)
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTimeline(parsed)
            setCachedDate(new Date().toDateString())
            const idx = parsed.findIndex((p: any) => p.isCurrent)
            if (idx !== -1) setExpanded(idx)
            setLoading(false)
            return
          }
        } catch {}
      }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      setLoading(false)
      generateTimeline(data, user.id)
    }
    load()
  }, [])

  const generateTimeline = async (p: any, uid?: string) => {
    if (!p) return
    const effectiveUid = uid || userId
    setGenerating(true)
    setExpanded(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) { toast.error('Please sign in again'); setGenerating(false); return }
      const res = await fetch('/api/groq/timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ profile: { diagnosis: p.diagnosis, medications: p.medications, surgery_date: p.surgery_date } }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to generate timeline')
      }
      const data = await res.json()
      const parsed: any[] = data.timeline || []
      setTimeline(parsed)
      setCachedDate(new Date().toDateString())
      const idx = parsed.findIndex((phase: any) => phase.isCurrent)
      if (idx !== -1) setExpanded(idx)
      if (effectiveUid && parsed.length > 0) {
        localStorage.setItem(todayKey(effectiveUid), JSON.stringify(parsed))
      }
    } catch (e: any) {
      toast.error(e.message || 'Could not generate timeline')
    }
    setGenerating(false)
  }

  const forceRefresh = () => {
    if (userId) localStorage.removeItem(todayKey(userId))
    setCachedDate(null)
    generateTimeline(profile, userId)
  }

  const currentIdx = timeline.findIndex((p) => p.isCurrent)

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', background: '#E4EBD3', padding: '80px 16px 100px', maxWidth: '720px', margin: '0 auto' }}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} style={{ height: '64px', borderRadius: '16px', background: '#F2F0E8', marginBottom: '8px' }} />
        ))}
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#E4EBD3', paddingBottom: '100px', maxWidth: '720px', margin: '0 auto', width: '100%' }}>
      <div style={{ padding: '56px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <motion.button whileTap={{ scale: 0.9 }} transition={spring} onClick={() => router.push('/dashboard')}
              style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#F2F0E8', border: '1px solid #D8D4C8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowLeft size={15} color="#5C5A52" />
            </motion.button>
            <div>
              <h1 style={{ color: '#141413', fontWeight: 900, fontSize: '20px', letterSpacing: '-0.7px' }}>Recovery Timeline</h1>
              <p style={{ color: '#7E7C74', fontSize: '12px' }}>{cachedDate ? 'Generated today' : 'Personalized for you'}</p>
            </div>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} transition={spring} onClick={forceRefresh} disabled={generating}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(120,140,93,0.10)', border: '1px solid rgba(120,140,93,0.20)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <motion.div animate={generating ? { rotate: 360 } : { rotate: 0 }} transition={generating ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}>
              <RefreshCw size={14} color="#5D6E47" />
            </motion.div>
          </motion.button>
        </div>
      </div>

      {generating && (
        <div style={{ padding: '0 20px 16px' }}>
          <div style={{ background: 'rgba(120,140,93,0.06)', border: '1px solid rgba(120,140,93,0.16)', borderRadius: '16px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[0, 1, 2].map((i) => (
                <motion.div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#5D6E47' }}
                  animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
              ))}
            </div>
            <p style={{ color: '#5C5A52', fontSize: '13px' }}>Generating your personalized timeline...</p>
          </div>
        </div>
      )}

      <div style={{ padding: '0 20px', position: 'relative' }}>
        {timeline.length > 0 && (
          <div style={{ position: 'absolute', left: '34px', top: '15px', bottom: '15px', width: '2px', background: 'linear-gradient(to bottom, rgba(120,140,93,0.5) 0%, rgba(120,140,93,0.2) 50%, rgba(20,20,19,0.05) 100%)', borderRadius: '99px', zIndex: 0, pointerEvents: 'none' }} />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative', zIndex: 1 }}>
          {timeline.map((phase, index) => {
            const isCurrent = phase.isCurrent
            const isPast = currentIdx !== -1 && index < currentIdx
            const dotBorder = isCurrent ? '#5D6E47' : isPast ? '#5D6E47' : '#D8D4C8'
            const cardBorder = isCurrent ? 'rgba(120,140,93,0.28)' : isPast ? 'rgba(120,140,93,0.18)' : '#F2F0E8'
            const cardBg = isCurrent ? 'rgba(120,140,93,0.06)' : '#FFFFFF'
            return (
              <motion.div key={index} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.07, ...spring }}
                style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ paddingTop: '12px', flexShrink: 0, position: 'relative', zIndex: 2 }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#E4EBD3', border: `2px solid ${dotBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: isCurrent ? '0 0 14px rgba(120,140,93,0.35)' : isPast ? '0 0 8px rgba(120,140,93,0.20)' : 'none' }}>
                    {isPast ? <CheckCircle2 size={14} color="#5D6E47" />
                      : isCurrent ? <motion.div animate={{ scale: [1, 1.45, 1], opacity: [0.8, 1, 0.8] }} transition={{ duration: 2, repeat: Infinity }}
                          style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#5D6E47' }} />
                      : <Circle size={12} color="#C4BFB0" />}
                  </div>
                </div>
                <div style={{ flex: 1, background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: '18px', overflow: 'hidden', boxShadow: isCurrent ? '0 6px 24px rgba(120,140,93,0.12)' : '0 2px 8px rgba(20,20,19,0.06)' }}>
                  <motion.button whileTap={{ scale: 0.99 }} transition={spring} onClick={() => setExpanded(expanded === index ? null : index)}
                    style={{ width: '100%', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <p style={{ color: '#141413', fontWeight: 700, fontSize: '14px', letterSpacing: '-0.3px' }}>{phase.title}</p>
                        {isCurrent && (
                          <span style={{ background: 'rgba(120,140,93,0.14)', border: '1px solid rgba(120,140,93,0.30)', color: '#5D6E47', fontSize: '9px', padding: '2px 8px', borderRadius: '99px', fontWeight: 700, fontFamily: 'var(--font-mono, monospace)', letterSpacing: '0.5px' }}>NOW</span>
                        )}
                        {isPast && (
                          <span style={{ background: 'rgba(120,140,93,0.10)', border: '1px solid rgba(120,140,93,0.22)', color: '#5D6E47', fontSize: '9px', padding: '2px 8px', borderRadius: '99px', fontWeight: 700, fontFamily: 'var(--font-mono, monospace)', letterSpacing: '0.5px' }}>DONE</span>
                        )}
                      </div>
                      <p style={{ color: '#7E7C74', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)' }}>{phase.week}</p>
                    </div>
                    <motion.div animate={{ rotate: expanded === index ? 180 : 0 }} transition={{ duration: 0.2 }} style={{ flexShrink: 0 }}>
                      <ChevronDown size={15} color="#7E7C74" />
                    </motion.div>
                  </motion.button>
                  <AnimatePresence>
                    {expanded === index && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22 }} style={{ overflow: 'hidden' }}>
                        <div style={{ padding: '14px 16px 16px', borderTop: '1px solid #CFD9BB', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          {[
                            { label: "What's normal", items: phase.normal, color: '#5C5A52', dot: '#7E7C74' },
                            { label: 'Watch out for', items: phase.watchout, color: '#A33417', dot: '#A33417' },
                            { label: 'What to do', items: phase.todo, color: '#5D6E47', dot: '#5D6E47' },
                          ].map((section, si) => (
                            <div key={si}>
                              <p style={{ color: section.color, fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>{section.label}</p>
                              {section.items?.map((item: string, ii: number) => (
                                <div key={ii} style={{ display: 'flex', gap: '10px', marginBottom: '6px', alignItems: 'flex-start' }}>
                                  <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: section.dot, flexShrink: 0, marginTop: '7px' }} />
                                  <p style={{ color: '#5C5A52', fontSize: '12px', lineHeight: 1.55 }}>{item}</p>
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
            <p style={{ color: '#7E7C74', fontSize: '14px', marginBottom: '12px' }}>Could not generate timeline</p>
            <button onClick={forceRefresh} style={{ color: '#5D6E47', fontSize: '13px', fontWeight: 700, background: 'none', border: '1px solid rgba(120,140,93,0.30)', borderRadius: '10px', padding: '8px 16px', cursor: 'pointer' }}>
              Try again
            </button>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
