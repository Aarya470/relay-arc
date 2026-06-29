'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowLeft, Send, Loader2, Check } from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import { sendPushNotification } from '@/lib/notifications'

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
        } catch { /* fallback to AI message */ }

        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('checkins').insert({ user_id: user.id, summary: clinicalSummary, flags: 'none' })
          toast.success('Check-in saved')
          sendPushNotification(user.id, 'Check-in complete', 'Your daily check-in has been saved. Your care team has been notified.')
        }
        setDone(true)
      }
    } catch (err: any) {
      console.error('Checkin AI error:', err)
      toast.error('Could not reach the AI right now — please try again')
      // Remove the user message to allow retry
      setMessages(prev => prev.slice(0, -1))
      setInput(userMsg)
    }

    setLoading(false)
  }

  const QUICK_REPLIES = ['Feeling good!', 'A bit tired', 'Not great today', 'Some discomfort']

  const AIAvatar = ({ size = 28 }: { size?: number }) => (
    <div style={{
      width: size, height: size, borderRadius: '8px', flexShrink: 0,
      background: '#0F1A0E',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: Math.round(size * 0.36) + 'px', fontWeight: 800, letterSpacing: '-0.5px', fontFamily: 'var(--font-mono, monospace)' }}>R</span>
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', background: '#F0EDE5', display: 'flex', flexDirection: 'column', paddingBottom: '80px', maxWidth: '720px', margin: '0 auto', width: '100%' }}>

      {/* Header */}
      <div style={{ padding: '52px 20px 14px', borderBottom: '1px solid rgba(16,22,14,0.07)', display: 'flex', alignItems: 'center', gap: '12px', background: '#F0EDE5' }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => router.push('/dashboard')}
          style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(16,22,14,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <ArrowLeft size={15} color="rgba(16,22,14,0.45)"/>
        </motion.button>
        <div style={{ flex: 1 }}>
          <h1 style={{ color: '#0F1A0E', fontWeight: 900, fontSize: '17px', letterSpacing: '-0.5px' }}>Daily Check-in</h1>
          <p style={{ color: 'rgba(16,22,14,0.36)', fontSize: '11px', marginTop: '1px', fontFamily: 'var(--font-mono, monospace)' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(44,122,80,0.08)', border: '1px solid rgba(44,122,80,0.18)', borderRadius: '99px', padding: '4px 10px' }}>
          <motion.div
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#2C7A50' }}
          />
          <span style={{ color: '#2C7A50', fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', fontWeight: 600, letterSpacing: '0.5px' }}>LIVE</span>
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
              {m.role === 'ai' && <AIAvatar/>}
              <div style={{
                maxWidth: '78%', padding: '12px 16px',
                borderRadius: m.role === 'user' ? '20px 20px 5px 20px' : '5px 20px 20px 20px',
                background: m.role === 'user'
                  ? '#E8F5EE'
                  : '#FFFFFF',
                border: m.role === 'user' ? 'none' : '1px solid rgba(16,22,14,0.08)',
                boxShadow: m.role === 'user'
                  ? '0 3px 12px rgba(196,107,48,0.15)'
                  : '0 2px 8px rgba(16,22,14,0.06)',
                color: m.role === 'user' ? '#6B2E00' : 'rgba(16,22,14,0.82)',
                fontSize: '14px', lineHeight: 1.6,
                fontWeight: m.role === 'user' ? 600 : 400,
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
            <AIAvatar/>
            <div style={{ background: '#FFFFFF', border: '1px solid rgba(16,22,14,0.08)', padding: '14px 18px', borderRadius: '5px 20px 20px 20px', display: 'flex', gap: '5px', alignItems: 'center', boxShadow: '0 2px 8px rgba(16,22,14,0.06)' }}>
              {[0,1,2].map(i => (
                <motion.div
                  key={i}
                  style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(16,22,14,0.22)' }}
                  animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {done && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ ...spring, bounce: 0.3 }}
            style={{ background: 'rgba(44,122,80,0.06)', border: '1px solid rgba(44,122,80,0.2)', borderRadius: '4px 20px 20px 20px', padding: '24px 20px', textAlign: 'center', margin: '8px 0', boxShadow: '0 4px 20px rgba(44,122,80,0.08)' }}
          >
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(44,122,80,0.12)', border: '1px solid rgba(44,122,80,0.24)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Check size={24} color="#2C7A50" strokeWidth={2.5}/>
            </div>
            <p style={{ color: '#1C3D28', fontWeight: 800, fontSize: '16px', marginBottom: '5px', letterSpacing: '-0.3px' }}>Check-in complete</p>
            <p style={{ color: 'rgba(16,22,14,0.38)', fontSize: '12px', marginBottom: '18px' }}>Your responses have been saved and your care team has been notified</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <motion.button
                whileTap={{ scale: 0.97, y: 1 }}
                transition={spring}
                onClick={() => router.push('/history')}
                style={{ flex: 1, background: 'rgba(44,122,80,0.1)', color: '#1C3D28', fontWeight: 700, fontSize: '13px', padding: '13px 16px', borderRadius: '14px', border: '1px solid rgba(44,122,80,0.2)', cursor: 'pointer' }}
              >
                View history
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97, y: 1 }}
                transition={spring}
                onClick={() => router.push('/dashboard')}
                style={{ flex: 1, background: '#0F1A0E', color: '#FFFFFF', fontWeight: 600, fontSize: '13px', padding: '13px 16px', borderRadius: '14px', border: 'none', cursor: 'pointer' }}
              >
                Dashboard
              </motion.button>
            </div>
          </motion.div>
        )}

        <div ref={bottomRef}/>
      </div>

      {/* Quick replies — shown on first message only */}
      {messages.length === 1 && !done && (
        <div style={{ padding: '8px 16px 4px', display: 'flex', gap: '6px', overflowX: 'auto' }}>
          {QUICK_REPLIES.map(r => (
            <motion.button
              key={r}
              whileTap={{ scale: 0.95 }}
              transition={spring}
              onClick={() => setInput(r)}
              style={{ flexShrink: 0, background: '#FFFFFF', border: '1px solid rgba(16,22,14,0.1)', borderRadius: '99px', padding: '9px 16px', color: 'rgba(16,22,14,0.6)', fontSize: '12px', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 1px 4px rgba(16,22,14,0.05)' }}
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
          borderTop: `1px solid ${focused ? 'rgba(44,122,80,0.2)' : 'rgba(16,22,14,0.07)'}`,
          display: 'flex', gap: '8px', alignItems: 'center',
          background: 'rgba(240,237,229,0.95)',
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
              background: '#FFFFFF',
              border: `1.5px solid ${focused ? 'rgba(44,122,80,0.4)' : 'rgba(16,22,14,0.09)'}`,
              borderRadius: '14px',
              padding: '13px 16px',
              color: '#0F1A0E',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
              fontFamily: 'inherit',
              boxShadow: focused ? '0 0 0 3px rgba(44,122,80,0.1)' : '0 1px 3px rgba(16,22,14,0.04)',
            }}
          />
          <motion.button
            whileTap={{ scale: 0.88 }}
            transition={spring}
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            style={{
              width: '46px', height: '46px',
              background: input.trim() ? '#0F1A0E' : 'rgba(16,22,14,0.06)',
              borderRadius: '14px', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 0.15s ease',
            }}
          >
            {loading
              ? <Loader2 size={16} color={input.trim() ? '#FFFFFF' : 'rgba(16,22,14,0.3)'} className="animate-spin"/>
              : <Send size={16} color={input.trim() ? '#FFFFFF' : 'rgba(16,22,14,0.3)'}/>
            }
          </motion.button>
        </div>
      )}

      <BottomNav/>
    </div>
  )
}
