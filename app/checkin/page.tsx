'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowLeft, Send, Loader2, Check } from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import { sendPushNotification } from '@/lib/notifications'

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG      = '#E4EBD3'
const SURFACE = '#FFFFFF'
const T1      = '#141413'
const T2      = '#5C5A52'
const T3      = '#7E7C74'
const ACCENT  = '#5D6E47'
const ACCENT_DIM = 'rgba(120,140,93,0.09)'
const GREEN   = '#5D6E47'
const GREEN_DIM = 'rgba(120,140,93,0.08)'
const BORDER  = '#CFD9BB'
const SHADOW  = '0 1px 4px rgba(20,20,19,0.07)'

const spring       = { type: 'spring', stiffness: 380, damping: 24 } as const
const bubbleSpring = { type: 'spring', stiffness: 320, damping: 28 } as const

export default function Checkin() {
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [profile, setProfile]   = useState<any>(null)
  const [done, setDone]         = useState(false)
  const [focused, setFocused]   = useState(false)
  const bottomRef               = useRef<HTMLDivElement>(null)
  const router                  = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      setMessages([{ role: 'ai', text: `Hey ${data?.full_name?.split(' ')[0] || 'there'}! How are you feeling today?` }])
    }
    load()
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const callGroq = async (msgs: { role: string; text: string }[], mode?: string): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) throw new Error('Not authenticated')

    const res = await fetch('/api/groq/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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
      setMessages(prev => [...prev, { role: 'ai', text: clean }])

      if (response.includes('[CHECKIN_COMPLETE]')) {
        const fullConvo = [...newMessages, { role: 'ai', text: clean }]
        let clinicalSummary = clean
        try {
          clinicalSummary = await callGroq(fullConvo, 'summary') || clean
        } catch { /* fallback */ }

        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('checkins').insert({ user_id: user.id, summary: clinicalSummary, flags: 'none' })
          toast.success('Check-in saved')
          sendPushNotification(user.id, 'Check-in complete', 'Your daily check-in has been saved. Your care team has been notified.')

          // Trigger health intelligence analysis in background (fire-and-forget)
          // This will auto-alert the care team if patterns are dangerous
          const { data: { session: s } } = await supabase.auth.getSession()
          if (s?.access_token) {
            fetch('/api/groq/health-intelligence', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${s.access_token}` },
            }).catch(() => { /* silent — non-critical */ })
          }
        }
        setDone(true)
      }
    } catch (err: any) {
      console.error('Checkin AI error:', err)
      toast.error('Could not reach the AI right now — please try again')
      setMessages(prev => prev.slice(0, -1))
      setInput(userMsg)
    }

    setLoading(false)
  }

  const QUICK_REPLIES = ['Feeling good!', 'A bit tired', 'Not great today', 'Some discomfort']

  const AIAvatar = ({ size = 28 }: { size?: number }) => (
    <div style={{
      width: size, height: size, borderRadius: '8px', flexShrink: 0,
      background: ACCENT,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* ECG pulse line */}
      <svg width={Math.round(size * 0.62)} height={Math.round(size * 0.42)} viewBox="0 0 18 12" fill="none">
        <path d="M0 6 H3 L5 1 L8 11 L10 4 L12 8 H15 L17 3 L18 6"
          stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  )

  return (
    <div style={{
      minHeight: '100dvh',
      background: BG,
      display: 'flex',
      flexDirection: 'column',
      paddingBottom: '80px',
      maxWidth: '720px',
      margin: '0 auto',
      width: '100%',
    }}>

      {/* Header */}
      <div style={{
        padding: '52px 20px 14px',
        borderBottom: `1px solid ${BORDER}`,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}>
        <button
          onClick={() => router.push('/dashboard')}
          aria-label="Back to dashboard"
          style={{
            width: '38px', height: '38px',
            background: 'none', border: 'none',
            cursor: 'pointer', marginLeft: '-8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <ArrowLeft size={18} color={T2} />
        </button>

        <div style={{ flex: 1 }}>
          <h1 style={{ color: T1, fontWeight: 800, fontSize: '17px', letterSpacing: '-0.4px', margin: 0 }}>Daily Check-in</h1>
          <p style={{ color: T3, fontSize: '11px', marginTop: '2px', fontFamily: 'var(--font-mono, monospace)', margin: '2px 0 0', letterSpacing: '0.4px' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()}
          </p>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          background: GREEN_DIM,
          border: `1px solid rgba(120,140,93,0.18)`,
          borderRadius: '99px',
          padding: '4px 10px',
        }}>
          <motion.div
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: '5px', height: '5px', borderRadius: '50%', background: GREEN }}
          />
          <span style={{ color: GREEN, fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, letterSpacing: '0.5px' }}>LIVE</span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...bubbleSpring }}
              style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', gap: '8px', alignItems: 'flex-end' }}
            >
              {m.role === 'ai' && <AIAvatar />}
              <div style={{
                maxWidth: '78%', padding: '11px 15px',
                borderRadius: m.role === 'user' ? '18px 18px 5px 18px' : '5px 18px 18px 18px',
                background: m.role === 'user' ? ACCENT : SURFACE,
                border: m.role === 'user' ? 'none' : `1px solid ${BORDER}`,
                boxShadow: m.role === 'user' ? 'none' : SHADOW,
                color: m.role === 'user' ? '#FFFFFF' : T1,
                fontSize: '14px', lineHeight: 1.6,
                fontWeight: m.role === 'user' ? 500 : 400,
              }}>
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
            style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}
          >
            <AIAvatar />
            <div style={{
              background: SURFACE,
              border: `1px solid ${BORDER}`,
              boxShadow: SHADOW,
              padding: '13px 16px',
              borderRadius: '5px 18px 18px 18px',
              display: 'flex', gap: '5px', alignItems: 'center',
            }}>
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  style={{ width: '5px', height: '5px', borderRadius: '50%', background: T3 }}
                  animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {done && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ ...spring, bounce: 0.3 }}
            style={{
              background: GREEN_DIM,
              border: `1px solid rgba(120,140,93,0.18)`,
              borderRadius: '16px',
              padding: '28px 20px',
              textAlign: 'center',
              margin: '8px 0',
            }}
          >
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%',
              background: GREEN,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px',
            }}>
              <Check size={24} color="white" strokeWidth={2.5} />
            </div>
            <p style={{ color: T1, fontWeight: 800, fontSize: '16px', marginBottom: '5px', letterSpacing: '-0.3px' }}>Check-in complete</p>
            <p style={{ color: T2, fontSize: '12px', marginBottom: '20px', lineHeight: 1.5 }}>Your responses have been saved and your care team has been notified</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <motion.button
                whileTap={{ scale: 0.97, y: 1 }} transition={spring}
                onClick={() => router.push('/history')}
                style={{
                  flex: 1, background: SURFACE, color: T1,
                  fontWeight: 700, fontSize: '13px',
                  padding: '13px 16px', borderRadius: '12px',
                  border: `1px solid ${BORDER}`, cursor: 'pointer',
                }}
              >
                View history
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97, y: 1 }} transition={spring}
                onClick={() => router.push('/dashboard')}
                style={{
                  flex: 1, background: ACCENT, color: '#FFFFFF',
                  fontWeight: 700, fontSize: '13px',
                  padding: '13px 16px', borderRadius: '12px',
                  border: 'none', cursor: 'pointer',
                }}
              >
                Dashboard
              </motion.button>
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      {messages.length === 1 && !done && (
        <div style={{ padding: '8px 16px 4px', display: 'flex', gap: '6px', overflowX: 'auto' }}>
          {QUICK_REPLIES.map(r => (
            <motion.button
              key={r}
              whileTap={{ scale: 0.95 }}
              transition={spring}
              onClick={() => setInput(r)}
              style={{
                flexShrink: 0,
                background: SURFACE,
                border: `1px solid ${BORDER}`,
                borderRadius: '99px',
                padding: '8px 15px',
                color: T2, fontSize: '12px', fontWeight: 500,
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {r}
            </motion.button>
          ))}
        </div>
      )}

      {/* Input */}
      {!done && (
        <div style={{
          padding: '8px 16px 14px',
          borderTop: `1px solid ${focused ? 'rgba(120,140,93,0.2)' : BORDER}`,
          display: 'flex', gap: '8px', alignItems: 'center',
          background: 'rgba(255,255,255,0.94)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          transition: 'border-color 0.18s ease',
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="How are you feeling..."
            style={{
              flex: 1,
              background: BG,
              border: `1.5px solid ${focused ? ACCENT : BORDER}`,
              borderRadius: '14px',
              padding: '12px 16px',
              color: T1,
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
              fontFamily: 'inherit',
              boxShadow: focused ? `0 0 0 3px ${ACCENT_DIM}` : 'none',
            }}
          />
          <motion.button
            whileTap={{ scale: 0.88 }}
            transition={spring}
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            style={{
              width: '44px', height: '44px',
              background: input.trim() ? ACCENT : BG,
              borderRadius: '12px',
              border: `1px solid ${input.trim() ? 'transparent' : BORDER}`,
              cursor: input.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 0.15s ease',
            }}
          >
            {loading
              ? <Loader2 size={16} color={input.trim() ? '#FFFFFF' : T3} className="animate-spin" />
              : <Send size={16} color={input.trim() ? '#FFFFFF' : T3} />
            }
          </motion.button>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
