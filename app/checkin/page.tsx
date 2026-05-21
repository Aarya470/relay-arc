'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import Groq from 'groq-sdk'
import { ArrowLeft, Send, Loader2, Heart, Check } from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import { sendPushNotification } from '@/lib/notifications'

const groq = new Groq({ apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY!, dangerouslyAllowBrowser: true })

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

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setLoading(true)
    const newMessages = [...messages, { role: 'user', text: userMsg }]
    setMessages(newMessages)

    const systemPrompt = `You are a warm, caring health companion for Relay Arc. Talk like a kind friend texting, not a doctor.
Patient: ${profile?.full_name}. Conditions: ${profile?.diagnosis}. Meds: ${JSON.stringify(profile?.medications)}.
Rules:
- Simple everyday words only, no medical jargon
- Max 2 short sentences per message
- Warm and encouraging — like texting a caring friend
- Ask one simple question at a time
- If they mention chest pain, feeling faint, or trouble breathing say: "That sounds serious — please tap the SOS button right now."
- After 4-5 exchanges, wrap up warmly and end with [CHECKIN_COMPLETE]`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        ...newMessages.map(m => ({ role: m.role === 'ai' ? 'assistant' : 'user' as any, content: m.text }))
      ]
    })

    const response = completion.choices[0].message.content || ''
    const clean = response.replace('[CHECKIN_COMPLETE]', '').trim()
    setMessages(prev => [...prev, { role: 'ai', text: clean }])

    if (response.includes('[CHECKIN_COMPLETE]')) {
      const fullConvo = [...newMessages, { role: 'ai', text: clean }]
        .map(m => `${m.role === 'user' ? 'Patient' : 'AI'}: ${m.text}`)
        .join('\n')
      let clinicalSummary = clean
      try {
        const sc = await groq.chat.completions.create({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: `Extract clinical observations from this patient check-in for the care team. Write exactly 4-5 bullet points (one per line, no extra text). Each must start with a category label like "Feeling:", "Activity:", "Symptoms:", "Medications:", or "Concerns:". Be specific and factual.\n\nConversation:\n${fullConvo}` }]
        })
        clinicalSummary = sc.choices[0].message.content?.trim() || clean
      } catch { /* fallback to AI message */ }
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('checkins').insert({ user_id: user.id, summary: clinicalSummary, flags: 'none' })
        toast.success('Check-in saved')
        sendPushNotification(user.id, 'Check-in complete ✓', 'Your daily check-in has been saved. Your care team has been notified.')
      }
      setDone(true)
    }
    setLoading(false)
  }

  const QUICK_REPLIES = ['Feeling good!', 'A bit tired', 'Not great today', 'Some discomfort']

  const AIAvatar = ({ size = 30 }: { size?: number }) => (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, rgba(92,139,116,0.22), rgba(61,107,88,0.1))',
      border: '1.5px solid rgba(92,139,116,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 2px 8px rgba(92,139,116,0.1)',
    }}>
      <Heart size={size * 0.42} color="#5C8B74" fill="rgba(92,139,116,0.3)"/>
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', background: '#F2EFE9', display: 'flex', flexDirection: 'column', paddingBottom: '80px' }}>

      {/* Header */}
      <div style={{ padding: '56px 20px 16px', borderBottom: '1px solid rgba(26,40,32,0.07)', display: 'flex', alignItems: 'center', gap: '12px', background: '#F2EFE9' }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          transition={spring}
          onClick={() => router.push('/dashboard')}
          style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FFFFFF', border: '1px solid rgba(26,40,32,0.09)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 1px 4px rgba(26,40,32,0.06)' }}
        >
          <ArrowLeft size={15} color="rgba(26,40,32,0.5)"/>
        </motion.button>
        <div style={{ flex: 1 }}>
          <h1 style={{ color: '#1A2820', fontWeight: 800, fontSize: '17px', letterSpacing: '-0.5px' }}>Daily Check-in</h1>
          <p style={{ color: 'rgba(26,40,32,0.38)', fontSize: '12px', marginTop: '1px' }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(92,139,116,0.1)', border: '1px solid rgba(92,139,116,0.2)', borderRadius: '99px', padding: '5px 10px' }}>
          <motion.div
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#5C8B74' }}
          />
          <span style={{ color: '#5C8B74', fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', fontWeight: 600 }}>Live</span>
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
                  ? '#FFD3AC'
                  : '#FFFFFF',
                border: m.role === 'user' ? 'none' : '1px solid rgba(26,40,32,0.08)',
                boxShadow: m.role === 'user'
                  ? '0 3px 12px rgba(196,107,48,0.15)'
                  : '0 2px 8px rgba(26,40,32,0.06)',
                color: m.role === 'user' ? '#6B2E00' : 'rgba(26,40,32,0.82)',
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
            <div style={{ background: '#FFFFFF', border: '1px solid rgba(26,40,32,0.08)', padding: '14px 18px', borderRadius: '5px 20px 20px 20px', display: 'flex', gap: '5px', alignItems: 'center', boxShadow: '0 2px 8px rgba(26,40,32,0.06)' }}>
              {[0,1,2].map(i => (
                <motion.div
                  key={i}
                  style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(26,40,32,0.22)' }}
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
            style={{ background: 'rgba(92,139,116,0.06)', border: '1px solid rgba(92,139,116,0.2)', borderRadius: '4px 20px 20px 20px', padding: '24px 20px', textAlign: 'center', margin: '8px 0', boxShadow: '0 4px 20px rgba(92,139,116,0.08)' }}
          >
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(92,139,116,0.12)', border: '1px solid rgba(92,139,116,0.24)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Check size={24} color="#5C8B74" strokeWidth={2.5}/>
            </div>
            <p style={{ color: '#3D6B58', fontWeight: 800, fontSize: '16px', marginBottom: '5px', letterSpacing: '-0.3px' }}>Check-in complete</p>
            <p style={{ color: 'rgba(26,40,32,0.38)', fontSize: '12px', marginBottom: '18px' }}>Your responses have been saved</p>
            <motion.button
              whileTap={{ scale: 0.97, y: 1 }}
              transition={spring}
              onClick={() => router.push('/dashboard')}
              style={{ background: 'linear-gradient(135deg, #5C8B74, #3D6B58)', color: '#FFFFFF', fontWeight: 800, fontSize: '14px', padding: '14px 24px', borderRadius: '14px', border: 'none', cursor: 'pointer', width: '100%', boxShadow: '0 6px 20px rgba(92,139,116,0.22)' }}
            >
              Back to dashboard
            </motion.button>
          </motion.div>
        )}

        <div ref={bottomRef}/>
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
              style={{ flexShrink: 0, background: '#FFFFFF', border: '1px solid rgba(26,40,32,0.1)', borderRadius: '99px', padding: '9px 16px', color: 'rgba(26,40,32,0.6)', fontSize: '12px', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 1px 4px rgba(26,40,32,0.05)' }}
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
          borderTop: `1px solid ${focused ? 'rgba(92,139,116,0.2)' : 'rgba(26,40,32,0.07)'}`,
          display: 'flex', gap: '8px', alignItems: 'center',
          background: 'rgba(242,239,233,0.9)',
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
              border: `1.5px solid ${focused ? 'rgba(92,139,116,0.4)' : 'rgba(26,40,32,0.09)'}`,
              borderRadius: '14px',
              padding: '13px 16px',
              color: '#1A2820',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
              fontFamily: 'inherit',
              boxShadow: focused ? '0 0 0 3px rgba(92,139,116,0.1)' : '0 1px 3px rgba(26,40,32,0.04)',
            }}
          />
          <motion.button
            whileTap={{ scale: 0.88 }}
            transition={spring}
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            style={{
              width: '46px', height: '46px',
              background: input.trim() ? 'linear-gradient(135deg, #5C8B74, #3D6B58)' : 'rgba(26,40,32,0.06)',
              borderRadius: '14px', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              boxShadow: input.trim() ? '0 4px 14px rgba(92,139,116,0.25)' : 'none',
              transition: 'background 0.2s ease, box-shadow 0.2s ease',
            }}
          >
            {loading
              ? <Loader2 size={16} color={input.trim() ? '#FFFFFF' : 'rgba(26,40,32,0.3)'} className="animate-spin"/>
              : <Send size={16} color={input.trim() ? '#FFFFFF' : 'rgba(26,40,32,0.3)'}/>
            }
          </motion.button>
        </div>
      )}

      <BottomNav/>
    </div>
  )
}
