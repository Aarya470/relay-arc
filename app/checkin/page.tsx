'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import Groq from 'groq-sdk'
import { ArrowLeft, Send, Loader2 } from 'lucide-react'
import BottomNav from '@/components/BottomNav'

const groq = new Groq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY!,
  dangerouslyAllowBrowser: true
})

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
      setMessages([{
        role: 'ai',
        text: `Good morning${data?.full_name ? ', ' + data.full_name.split(' ')[0] : ''}. How are you feeling today?`
      }])
    }
    load()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setLoading(true)

    const newMessages = [...messages, { role: 'user', text: userMsg }]
    setMessages(newMessages)

    const systemPrompt = `You are a compassionate AI health assistant for Relay Arc.
Patient: ${profile?.full_name}. Conditions: ${profile?.diagnosis}. Medications: ${JSON.stringify(profile?.medications)}.
Do a daily check-in. Keep responses to 2-3 sentences. If they mention chest pain, severe dizziness, or difficulty breathing tell them to tap SOS immediately.
After 4-5 exchanges end with [CHECKIN_COMPLETE].`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        ...newMessages.map(m => ({
          role: m.role === 'ai' ? 'assistant' : 'user' as 'assistant' | 'user',
          content: m.text
        }))
      ]
    })

    const response = completion.choices[0].message.content || ''
    const cleanResponse = response.replace('[CHECKIN_COMPLETE]', '').trim()

    setMessages(prev => [...prev, { role: 'ai', text: cleanResponse }])

    if (response.includes('[CHECKIN_COMPLETE]')) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('checkins').insert({
          user_id: user.id,
          summary: cleanResponse,
          flags: 'none'
        })
        toast.success('Check-in saved')
      }
      setDone(true)
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#09090C] flex flex-col pb-24">

      {/* Header */}
      <div className="px-5 pt-14 pb-4 border-b border-white/6 flex items-center gap-4">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => router.push('/dashboard')}
          className="w-9 h-9 rounded-xl bg-white/6 flex items-center justify-center"
        >
          <ArrowLeft size={16} className="text-white/60"/>
        </motion.button>
        <div>
          <h1 className="text-white font-semibold">Daily Check-in</h1>
          <p className="text-white/35 text-xs">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#80EF80] animate-pulse"/>
          <span className="text-[#80EF80] text-xs font-mono">Live</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'ai' && (
                <div className="w-7 h-7 rounded-xl bg-[#fcb546]/15 border border-[#fcb546]/25 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                  <span className="text-xs">♥</span>
                </div>
              )}
              <div className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-[#fcb546] text-black font-medium rounded-br-sm'
                  : 'bg-[#18181F] border border-white/8 text-white/80 rounded-bl-sm'
              }`}>
                {m.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="w-7 h-7 rounded-xl bg-[#fcb546]/15 border border-[#fcb546]/25 flex items-center justify-center mr-2 flex-shrink-0">
              <span className="text-xs">♥</span>
            </div>
            <div className="bg-[#18181F] border border-white/8 px-4 py-3 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1 items-center">
                <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce"/>
                <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce delay-100"/>
                <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce delay-200"/>
              </div>
            </div>
          </motion.div>
        )}

        {done && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#80EF80]/8 border border-[#80EF80]/20 rounded-2xl p-4 text-center mx-auto max-w-xs"
          >
            <div className="w-10 h-10 rounded-full bg-[#80EF80]/20 flex items-center justify-center mx-auto mb-2">
              <span className="text-lg">✓</span>
            </div>
            <p className="text-[#80EF80] font-semibold text-sm mb-1">Check-in complete</p>
            <p className="text-white/40 text-xs">Your responses have been saved</p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push('/dashboard')}
              className="mt-3 bg-[#fcb546] text-black font-semibold px-6 py-2.5 rounded-xl text-sm w-full"
            >
              Back to dashboard
            </motion.button>
          </motion.div>
        )}

        <div ref={bottomRef}/>
      </div>

      {/* Quick replies */}
      {messages.length === 1 && !done && (
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
          {['Feeling good today', 'A bit tired', 'Not feeling well', 'Having some pain'].map(reply => (
            <button
              key={reply}
              onClick={() => { setInput(reply); }}
              className="flex-shrink-0 bg-[#18181F] border border-white/8 text-white/60 text-xs px-3 py-2 rounded-full hover:border-[#fcb546]/40 hover:text-white/80 transition"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      {!done && (
        <div className="px-4 pb-4 pt-2 border-t border-white/6">
          <div className="flex gap-2 items-end">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="How are you feeling..."
              className="flex-1 bg-[#18181F] border border-white/8 rounded-2xl px-4 py-3.5 text-white placeholder-white/25 outline-none focus:border-[#fcb546]/40 transition text-sm"
            />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="w-12 h-12 bg-[#fcb546] rounded-2xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition"
            >
              {loading ? <Loader2 size={18} className="text-black animate-spin"/> : <Send size={16} className="text-black"/>}
            </motion.button>
          </div>
        </div>
      )}

      <BottomNav/>
    </div>
  )
}
