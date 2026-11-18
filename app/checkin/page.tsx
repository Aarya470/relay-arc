'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowLeft, Send, Loader2, Check } from '@/lib/plain-icons'
import Accordion from '@/components/Accordion'
import { AppHeader, Hero } from '@/components/AppKit'
import BottomNav from '@/components/BottomNav'
import { sendPushNotification } from '@/lib/notifications'

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG = '#B3DDAC'
const SURFACE = '#FFFFFF'
const T1 = '#141413'
const T2 = '#5C5A52'
const T3 = '#5C5A52'
const ACCENT = '#42623C'
const ACCENT_DIM = 'rgba(86,128,78,0.09)'
const GREEN = '#42623C'
const GREEN_DIM = 'rgba(86,128,78,0.08)'
const BORDER = '#98C890'
const SHADOW = 'none'

const spring = { type: 'spring', stiffness: 380, damping: 24 } as const
const bubbleSpring = { type: 'spring', stiffness: 320, damping: 28 } as const

export default function Checkin() {
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [done, setDone] = useState(false)
  const [focused, setFocused] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      setMessages([
        {
          role: 'ai',
          text: `Hey ${data?.full_name?.split(' ')[0] || 'there'}! How are you feeling today?`,
        },
      ])
    }
    load()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const callGroq = async (
    msgs: { role: string; text: string }[],
    mode?: string,
  ): Promise<string> => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) throw new Error('Not authenticated')

    const res = await fetch('/api/groq/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        messages: msgs,
        profile: { diagnosis: profile?.diagnosis, medications: profile?.medications },
        mode,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'AI unavailable')
    }

    const data = await res.json()
    return data.content || ''
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setLoading(true)
    const newMessages = [...messages, { role: 'user', text: userMsg }]
    setMessages(newMessages)

    try {
      const response = await callGroq(newMessages)
      const clean = response.replace('[CHECKIN_COMPLETE]', '').trim()
      setMessages((prev) => [...prev, { role: 'ai', text: clean }])

      if (response.includes('[CHECKIN_COMPLETE]')) {
        const fullConvo = [...newMessages, { role: 'ai', text: clean }]
        let clinicalSummary = clean
        try {
          clinicalSummary = (await callGroq(fullConvo, 'summary')) || clean
        } catch {
          /* fallback */
        }

        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          // "Check-in saved" was said without looking at the insert. A whole
          // conversation someone had just worked through could fail to save
          // while the screen congratulated them on finishing it.
          const { error: saveError } = await supabase
            .from('checkins')
            .insert({ user_id: user.id, summary: clinicalSummary, flags: 'none' })
          if (saveError) {
            console.error('checkin insert failed:', saveError)
            toast.error('Your answers could not be saved. Nothing from this check in was kept.')
          } else {
            toast.success('Check in saved')
          }
          sendPushNotification(user.id, 'Check in complete', 'Your daily check in has been saved.')

          // Trigger health intelligence analysis in background (fire-and-forget)
          // This will auto-alert the care team if patterns are dangerous
          const {
            data: { session: s },
          } = await supabase.auth.getSession()
          if (s?.access_token) {
            fetch('/api/groq/health-intelligence', {
              method: 'POST',
              headers: { Authorization: `Bearer ${s.access_token}` },
            }).catch(() => {
              /* silent — non-critical */
            })
          }
        }
        setDone(true)
      }
    } catch (err: any) {
      console.error('Checkin AI error:', err)
      toast.error('Could not reach the check in assistant. Your answers are still saved.')
      setMessages((prev) => prev.slice(0, -1))
      setInput(userMsg)
    }

    setLoading(false)
  }

  const QUICK_REPLIES = ['Feeling good!', 'A bit tired', 'Not great today', 'Some discomfort']

  // No avatar picture: the AI's messages are plain bubbles.
  const AIAvatar = (_p: { size?: number }) => (
    <span
      aria-hidden
      style={{
        width: '30px', height: '30px', borderRadius: 7, background: '#1E3A23', color: '#B3DDAC',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 900,
        letterSpacing: '-0.02em', flexShrink: 0,
      }}
    >
      RA
    </span>
  )


  const asked = messages.filter((m) => m.role === 'ai').length
  return (
    <div
      className="app-shell"
      style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', paddingBottom: '112px', maxWidth: '720px', margin: '0 auto', width: '100%', padding: '0 16px 112px' }}
    >
      <AppHeader
        title="Daily check in"
        sub={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      />

      <Hero style={{ padding: '18px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <div>
            <span className="ak-kicker">{done ? 'All done' : 'Two minutes, a few questions'}</span>
            <p style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.2, marginTop: '6px' }}>
              {done ? 'Saved to your history' : 'Talk like you would to a friend'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '4px' }} aria-label={`${Math.min(asked, 5)} of 5 questions`}>
            {[0, 1, 2, 3, 4].map((k) => (
              <span
                key={k}
                style={{
                  width: '8px', height: '26px', borderRadius: 3,
                  background: done || k < asked ? '#F07800' : 'rgba(255,255,255,0.2)',
                  transition: 'background-color 240ms var(--ease-out)',
                }}
              />
            ))}
          </div>
        </div>
      </Hero>

      <div
        style={{ flex: 1, overflowY: 'auto', padding: '6px 0 8px', display: 'flex', flexDirection: 'column', gap: '12px' }}
      >
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...bubbleSpring }}
              style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', gap: '10px', alignItems: 'flex-start' }}
            >
              {m.role === 'ai' && <AIAvatar />}
              <div
                className={m.role === 'user' ? undefined : 'glass-strong'}
                style={{
                  maxWidth: '80%',
                  padding: '12px 16px',
                  borderRadius: m.role === 'user' ? '10px 10px 3px 10px' : '3px 10px 10px 10px',
                  background: m.role === 'user' ? '#1E3A23' : undefined,
                  boxShadow: m.role === 'user' ? '0 8px 20px rgba(30,58,35,0.22)' : 'inset 0 0 0 1px rgba(255,255,255,0.8), 0 6px 18px rgba(30,58,35,0.10)',
                  color: m.role === 'user' ? '#FFFFFF' : T1,
                  fontSize: '15px',
                  lineHeight: 1.55,
                  fontWeight: m.role === 'user' ? 600 : 450,
                }}
              >
                {m.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring}
            style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}
          >
            <AIAvatar />
            <div className="glass-strong" style={{ padding: '14px 16px', borderRadius: '3px 10px 10px 10px', display: 'flex', gap: '5px', alignItems: 'center' }}>
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2F5233' }}
                  animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {done && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ ...spring, bounce: 0.3 }}
          >
            <Hero style={{ textAlign: 'center', padding: '26px 20px', margin: '8px 0' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: 10, background: '#F07800', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <Check size={26} color="#141413" strokeWidth={3} />
              </div>
              <p style={{ fontWeight: 800, fontSize: '22px', letterSpacing: '-0.03em', marginBottom: '6px' }}>Check in complete</p>
              <p style={{ fontSize: '14px', opacity: 0.85, marginBottom: '20px', lineHeight: 1.5 }}>
                Your answers are saved. Anything you said about your vitals is now in your NEWS2 sheet.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="ds-btn" onClick={() => router.push('/history')} style={{ flex: 1, background: 'rgba(255,255,255,0.14)', color: '#fff', borderRadius: 8, minHeight: '48px', border: 0, fontWeight: 700, cursor: 'pointer' }}>
                  View history
                </button>
                <button className="ds-btn ds-btn-sos" onClick={() => router.push('/dashboard')} style={{ flex: 1, borderRadius: 8, minHeight: '48px', border: 0, fontWeight: 800, cursor: 'pointer' }}>
                  Back home
                </button>
              </div>
            </Hero>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {messages.length === 1 && !done && (
        <div style={{ padding: '4px 0 8px', display: 'flex', gap: '6px', overflowX: 'auto' }}>
          {QUICK_REPLIES.map((r) => (
            <motion.button
              key={r}
              whileTap={{ scale: 0.95 }}
              transition={spring}
              onClick={() => setInput(r)}
              className="ak-chip"
              style={{ flexShrink: 0, cursor: 'pointer', border: 0, height: '36px', fontSize: '13.5px', whiteSpace: 'nowrap' }}
            >
              {r}
            </motion.button>
          ))}
        </div>
      )}

      {!done && (
        <div
          className="glass-strong"
          style={{
            position: 'sticky', bottom: '96px', padding: '8px', borderRadius: 10, display: 'flex', gap: '8px', alignItems: 'center',
            boxShadow: focused ? 'inset 0 0 0 2px #2F5233, 0 12px 30px rgba(30,58,35,0.18)' : 'inset 0 0 0 1px rgba(255,255,255,0.8), 0 12px 30px rgba(30,58,35,0.14)',
            transition: 'box-shadow 0.18s ease',
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="How are you feeling..."
            style={{
              flex: 1, minWidth: 0, background: 'transparent', border: 0, padding: '12px 10px', color: T1,
              // 16px so mobile Safari does not zoom the page on focus.
              fontSize: '16px', outline: 'none', fontFamily: 'inherit',
            }}
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            transition={spring}
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            aria-label={loading ? 'Sending your answer' : 'Send'}
            style={{
              width: '46px', height: '46px', background: input.trim() ? '#F07800' : 'rgba(20,20,19,0.08)', borderRadius: 8, border: 0,
              cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              transition: 'background-color 0.15s ease',
            }}
          >
            {loading ? (
              <Loader2 size={17} color={input.trim() ? '#141413' : T3} className="animate-spin" />
            ) : (
              <Send size={17} color={input.trim() ? '#141413' : T3} />
            )}
          </motion.button>
        </div>
      )}

      <section className="glass" style={{ padding: '4px', marginTop: '14px' }}>
        <Accordion title="Where your answers go" hint="Saved to your history and your score">
          <p style={{ fontSize: '14px', color: T2, lineHeight: 1.55, padding: '0 10px' }}>
            Each check in is saved to your history so you and your doctor can see patterns. If you mention a
            temperature, an oxygen reading, new confusion or being on oxygen, it is added to your NEWS2 sheet
            on the vitals page.
          </p>
        </Accordion>
      </section>

      <BottomNav />
    </div>
  )
}
