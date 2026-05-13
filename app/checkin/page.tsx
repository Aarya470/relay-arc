'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import Groq from 'groq-sdk'
import { ArrowLeft, Send, Loader2 } from 'lucide-react'
import BottomNav from '@/components/BottomNav'

const groq = new Groq({ apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY!, dangerouslyAllowBrowser: true })

export default function Checkin() {
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [done, setDone] = useState(false)
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
      const { data: { user } } = await supabase.auth.getUser()
      if (user) { await supabase.from('checkins').insert({ user_id: user.id, summary: clean, flags: 'none' }); toast.success('Check-in saved') }
      setDone(true)
    }
    setLoading(false)
  }

  const QUICK_REPLIES = ['Feeling good!', 'A bit tired', 'Not great today', 'Some discomfort']

  return (
    <div style={{ minHeight: '100vh', background: '#07070E', display: 'flex', flexDirection: 'column', paddingBottom: '80px' }}>

      {/* Header */}
      <div style={{ padding: '56px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => router.push('/dashboard')}
          style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={15} color="rgba(237,234,224,0.5)"/>
        </motion.button>
        <div style={{ flex: 1 }}>
          <h1 style={{ color: '#EDEAE0', fontWeight: 700, fontSize: '18px', letterSpacing: '-0.4px' }}>Daily Check-in</h1>
          <p style={{ color: 'rgba(237,234,224,0.3)', fontSize: '12px' }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(128,239,128,0.08)', border: '1px solid rgba(128,239,128,0.18)', borderRadius: '99px', padding: '4px 10px' }}>
          <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
            style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#80EF80' }}/>
          <span style={{ color: '#80EF80', fontSize: '10px', fontFamily: 'monospace' }}>Live</span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
              style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', gap: '8px', alignItems: 'flex-end' }}>
              {m.role === 'ai' && (
                <div style={{ width: '28px', height: '28px', borderRadius: '10px', background: 'rgba(252,181,70,0.12)', border: '1px solid rgba(252,181,70,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '12px' }}>♥</span>
                </div>
              )}
              <div style={{
                maxWidth: '78%', padding: '12px 14px', borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: m.role === 'user' ? 'linear-gradient(135deg, #fcb546, #f09020)' : 'rgba(255,255,255,0.05)',
                border: m.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.07)',
                color: m.role === 'user' ? '#07070E' : 'rgba(237,234,224,0.85)',
                fontSize: '14px', lineHeight: 1.55,
                fontWeight: m.role === 'user' ? 600 : 400
              }}>
                {m.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '10px', background: 'rgba(252,181,70,0.12)', border: '1px solid rgba(252,181,70,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '12px' }}>♥</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', padding: '12px 16px', borderRadius: '18px 18px 18px 4px', display: 'flex', gap: '4px', alignItems: 'center' }}>
              {[0,1,2].map(i => (
                <motion.div key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(237,234,224,0.4)' }}
                  animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}/>
              ))}
            </div>
          </motion.div>
        )}

        {done && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            style={{ background: 'rgba(128,239,128,0.06)', border: '1px solid rgba(128,239,128,0.18)', borderRadius: '18px', padding: '20px', textAlign: 'center', margin: '8px 0' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(128,239,128,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
              <span style={{ fontSize: '18px' }}>✓</span>
            </div>
            <p style={{ color: '#80EF80', fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>Check-in complete</p>
            <p style={{ color: 'rgba(237,234,224,0.35)', fontSize: '12px', marginBottom: '14px' }}>Your responses have been saved</p>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => router.push('/dashboard')}
              style={{ background: 'linear-gradient(135deg, #fcb546, #f09020)', color: '#07070E', fontWeight: 700, fontSize: '14px', padding: '12px 24px', borderRadius: '12px', border: 'none', cursor: 'pointer', width: '100%' }}>
              Back to dashboard
            </motion.button>
          </motion.div>
        )}

        <div ref={bottomRef}/>
      </div>

      {/* Quick replies */}
      {messages.length === 1 && !done && (
        <div style={{ padding: '8px 16px', display: 'flex', gap: '6px', overflowX: 'auto' }}>
          {QUICK_REPLIES.map(r => (
            <button key={r} onClick={() => setInput(r)}
              style={{ flexShrink: 0, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '99px', padding: '8px 14px', color: 'rgba(237,234,224,0.55)', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {r}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      {!done && (
        <div style={{ padding: '8px 16px 12px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="How are you feeling..."
            style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '14px 16px', color: '#EDEAE0', fontSize: '14px', outline: 'none' }}/>
          <motion.button whileTap={{ scale: 0.9 }} onClick={sendMessage} disabled={loading || !input.trim()}
            style={{ width: '46px', height: '46px', background: input.trim() ? 'linear-gradient(135deg, #fcb546, #f09020)' : 'rgba(255,255,255,0.05)', borderRadius: '14px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {loading ? <Loader2 size={16} color="#07070E" className="animate-spin"/> : <Send size={16} color={input.trim() ? '#07070E' : 'rgba(237,234,224,0.3)'}/>}
          </motion.button>
        </div>
      )}

      <BottomNav/>
    </div>
  )
}
