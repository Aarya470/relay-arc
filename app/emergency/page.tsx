'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Heart, AlertCircle, Wind, Zap, Brain, Activity, Plus, Phone, ChevronRight, Mic } from 'lucide-react'
import { toast } from 'sonner'

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG      = '#FFFFFF'
const SURFACE = '#F4F5F7'
const T1      = '#0E1218'
const T2      = '#5B6371'
const T3      = '#9AA2AD'
const RED     = '#D91414'
const RED_DIM = 'rgba(217,20,20,0.07)'
const RED_MID = 'rgba(217,20,20,0.14)'
const ACCENT  = '#0055FF'
const BORDER  = '#E3E6EC'


const TYPES = [
  { id: 'chest_pain',  label: 'Chest pain',    desc: 'Pressure, tightness or pain in chest or jaw', Icon: Heart       },
  { id: 'unconscious', label: 'Unconscious',   desc: 'Collapsed or not responding',                  Icon: AlertCircle },
  { id: 'breathing',   label: "Can't breathe", desc: 'Severe shortness of breath',                   Icon: Wind        },
  { id: 'pots',        label: 'POTS episode',  desc: 'Severe dizziness, fainting, racing heart',     Icon: Zap         },
  { id: 'stroke',      label: 'Stroke signs',  desc: 'Face drooping, slurred speech',                Icon: Brain       },
  { id: 'mecfs',       label: 'Severe crash',  desc: 'ME/CFS post-exertional malaise',               Icon: Activity    },
  { id: 'other',       label: 'Other',         desc: 'Something else urgent',                        Icon: Plus        },
]

export default function Emergency() {
  const [selected, setSelected] = useState('')
  const [loading, setLoading]   = useState(false)
  const [listening, setListening] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recRef = useRef<any>(null)
  const router = useRouter()

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setVoiceSupported(!!SR)
  }, [])

  const classifyAndGo = async (text: string) => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) { toast.error('Sign in required'); setLoading(false); return }
      const res = await fetch('/api/groq/classify-emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ transcript: text }),
      })
      const { type } = await res.json()
      await handleSelect(type || 'other')
    } catch {
      toast.error('Could not understand — tap an option below or call 911')
      setLoading(false)
    }
  }

  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    recRef.current = rec
    rec.lang = 'en-US'
    rec.interimResults = true
    rec.continuous = false
    let finalText = ''
    rec.onresult = (e: any) => {
      let text = ''
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript
      setTranscript(text)
      if (e.results[e.results.length - 1].isFinal) finalText = text
    }
    rec.onend = () => {
      setListening(false)
      const text = finalText || ''
      if (text.trim().length > 2) classifyAndGo(text.trim())
    }
    rec.onerror = () => { setListening(false); toast.error('Microphone unavailable — tap an option below') }
    setTranscript('')
    setListening(true)
    rec.start()
  }

  const stopVoice = () => { try { recRef.current?.stop() } catch {} }

  const handleSelect = async (type: string) => {
    setSelected(type)
    setLoading(true)
    try { sessionStorage.removeItem('relay_user_cancelled_until') } catch {}
    try {
      const { data: { user } } = await supabase.auth.getUser()
      let emergencyId = ''
      if (user) {
        await supabase.from('emergencies').update({ status: 'resolved' }).eq('user_id', user.id).eq('status', 'active')
        const { data, error } = await supabase.from('emergencies').insert({ user_id: user.id, emergency_type: type, status: 'active' }).select().single()
        if (error) { toast.error('Could not log emergency — call 911 now') }
        else { emergencyId = data?.id || '' }
      }
      router.push(`/emergency/routing?type=${type}&id=${emergencyId}`)
    } catch {
      toast.error('Something went wrong — call 911 now')
      setLoading(false)
      setSelected('')
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: BG, display: 'flex', flexDirection: 'column', maxWidth: '560px', margin: '0 auto', width: '100%' }}>

      {/* Status bar — renders instantly, no entrance animation in an emergency */}
      <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <motion.div
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 1.0, repeat: Infinity }}
            style={{ width: '8px', height: '8px', background: RED }}
          />
          <span style={{ color: RED, fontFamily: 'var(--font-mono, monospace)', fontSize: '10.5px', letterSpacing: '1.6px', textTransform: 'uppercase', fontWeight: 700 }}>
            Emergency mode
          </span>
        </div>
        <span style={{ color: T3, fontFamily: 'var(--font-mono, monospace)', fontSize: '11px' }}>
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div style={{ flex: 1, padding: '20px 20px 28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ color: T1, fontSize: '34px', fontWeight: 900, letterSpacing: '-1.3px', lineHeight: 1.02 }}>
              What&apos;s happening?
            </h1>
            <p style={{ color: T2, fontSize: '14.5px', marginTop: '6px', fontWeight: 500 }}>
              Tap one — response starts immediately.
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            aria-label="Close emergency mode"
            style={{ width: '44px', height: '44px', borderRadius: '10px', background: SURFACE, border: `1px solid ${BORDER}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <X size={17} color={T2}/>
          </button>
        </div>

        {/* Call 911 — always first, always huge */}
        <motion.a
          href="tel:911"
          whileTap={{ scale: 0.98 }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
            background: RED, color: 'white',
            padding: '22px', borderRadius: '14px',
            fontWeight: 900, fontSize: '22px', letterSpacing: '-0.3px',
            textDecoration: 'none', minHeight: '68px',
          }}>
          <Phone size={24} strokeWidth={2.5}/>
          Call 911 now
        </motion.a>

        {/* Voice SOS */}
        {voiceSupported && (
          <motion.button
            whileTap={{ scale: 0.985 }}
            onClick={listening ? stopVoice : startVoice}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '11px',
              width: '100%',
              background: listening ? RED_DIM : '#FFFFFF',
              border: `1.5px solid ${listening ? RED : T1}`,
              color: listening ? RED : T1,
              padding: '17px', borderRadius: '12px',
              fontWeight: 700, fontSize: '16px',
              cursor: 'pointer', fontFamily: 'inherit', minHeight: '58px',
              transition: 'all 0.15s ease',
            }}
          >
            <motion.span
              animate={listening ? { scale: [1, 1.25, 1] } : {}}
              transition={{ duration: 0.9, repeat: Infinity }}
              style={{ display: 'flex' }}
            >
              <Mic size={19} strokeWidth={2.2}/>
            </motion.span>
            {listening
              ? (transcript ? `"${transcript.slice(-42)}"` : "Listening — describe what's happening")
              : 'Speak it instead — tap and talk'}
          </motion.button>
        )}

        {/* Type list — flat hairline rows, no boxes */}
        <div style={{ borderTop: `1px solid ${BORDER}` }}>
          {TYPES.map(type => {
            const isSel = selected === type.id
            return (
              <motion.button
                key={type.id}
                whileTap={{ scale: 0.99 }}
                onClick={() => handleSelect(type.id)}
                disabled={loading}
                style={{
                  display: 'flex', alignItems: 'center', gap: '16px',
                  background: isSel ? RED_DIM : 'transparent',
                  border: 'none',
                  borderBottom: `1px solid ${BORDER}`,
                  padding: '17px 4px',
                  minHeight: '68px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                  opacity: loading && !isSel ? 0.3 : 1,
                  width: '100%',
                }}
              >
                <type.Icon size={20} color={isSel ? RED : T1} strokeWidth={2} style={{ flexShrink: 0 }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: isSel ? RED : T1, fontWeight: 800, fontSize: '17px', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
                    {type.label}
                  </p>
                  <p style={{ color: T3, fontSize: '13px', lineHeight: 1.4, marginTop: '2px' }}>{type.desc}</p>
                </div>
                {isSel && loading ? (
                  <span style={{ color: RED, fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', flexShrink: 0 }}>
                    Starting…
                  </span>
                ) : (
                  <ChevronRight size={16} color="#C2C7D0" style={{ flexShrink: 0 }}/>
                )}
              </motion.button>
            )
          })}
        </div>

        {/* Triage link */}
        <div style={{ textAlign: 'center', paddingTop: '2px' }}>
          <button
            onClick={() => router.push('/emergency/triage')}
            style={{ color: T2, fontSize: '13.5px', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '10px' }}>
            Not sure how serious? <span style={{ color: ACCENT, fontWeight: 700 }}>Assess severity →</span>
          </button>
        </div>
      </div>
    </div>
  )
}
