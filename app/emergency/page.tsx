'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Heart,
  AlertCircle,
  Wind,
  Zap,
  Brain,
  Activity,
  Plus,
  Phone,
  ChevronRight,
  Mic,
  ArrowRight,
} from '@/lib/plain-icons'
import { toast } from 'sonner'
import { emergencyNumber } from '@/lib/emergency-number'
import { demoOn } from '@/lib/demo'
import { triage } from '@/lib/triage'
import {
  VOICE_LANGS,
  langById,
  detectLang,
  rememberLang,
  resolveLocale,
  type LangId,
} from '@/lib/voice-lang'
import { notch } from '@/lib/shape'
import Accordion from '@/components/Accordion'
import { Hero, Panel } from '@/components/AppKit'

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG = '#FFFFFF'
const SURFACE = '#B3DDAC'
const T1 = '#141413'
const T2 = '#5C5A52'
const T3 = '#5C5A52'
const RED = '#8F4A00'
const RED_DIM = 'rgba(240,120,0,0.07)'
const RED_MID = 'rgba(240,120,0,0.14)'
const ACCENT = '#42623C'
const BORDER = '#98C890'

const TYPES = [
  {
    id: 'chest_pain',
    label: 'Chest pain',
    desc: 'Pressure, tightness or pain in chest or jaw',
    Icon: Heart,
  },
  {
    id: 'unconscious',
    label: 'Unconscious',
    desc: 'Collapsed or not responding',
    Icon: AlertCircle,
  },
  { id: 'breathing', label: "Can't breathe", desc: 'Severe shortness of breath', Icon: Wind },
  {
    id: 'pots',
    label: 'POTS episode',
    desc: 'Severe dizziness, fainting, racing heart',
    Icon: Zap,
  },
  { id: 'stroke', label: 'Stroke signs', desc: 'Face drooping, slurred speech', Icon: Brain },
  { id: 'mecfs', label: 'Severe crash', desc: 'ME/CFS post-exertional malaise', Icon: Activity },
  { id: 'other', label: 'Other', desc: 'Something else urgent', Icon: Plus },
]

// Spanish screen copy.
const ES = {
  mode: 'Modo de emergencia',
  demo: 'Demo · modo de emergencia',
  title: '¿Qué está pasando?',
  sub: 'Toque una opción. La ayuda empieza de inmediato.',
  call: (n: string) => `Llamar al ${n} ahora`,
  suggested: 'Sugerencia, empieza en un momento',
  notRight: '¿No es correcto? Elija la opción correcta abajo.',
  starting: 'Iniciando…',
  severity: '¿No sabe qué tan grave es?',
  assess: 'Evaluar gravedad →',
  types: {
    chest_pain: ['Dolor de pecho', 'Presión, opresión o dolor en el pecho o la mandíbula'],
    unconscious: ['Inconsciente', 'Se desmayó o no responde'],
    breathing: ['No puede respirar', 'Falta de aire grave'],
    pots: ['Episodio de POTS', 'Mareo fuerte, desmayo, corazón acelerado'],
    stroke: ['Señales de derrame', 'Cara caída, habla arrastrada'],
    mecfs: ['Recaída grave', 'Agotamiento después del esfuerzo (EM/SFC)'],
    other: ['Otro', 'Otra urgencia'],
  } as Record<string, [string, string]>,
}

export default function Emergency() {
  const [selected, setSelected] = useState('')
  const [isDemo, setIsDemo] = useState(false)
  useEffect(() => {
    setIsDemo(demoOn())
  }, [])
  const [emg, setEmg] = useState({ number: '911', label: '911' })
  useEffect(() => {
    setEmg(emergencyNumber())
  }, [])
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [typed, setTyped] = useState('')
  const [heard, setHeard] = useState<{ evidence: string[]; source: 'device' | 'cloud' } | null>(
    null,
  )
  // A classifier suggestion awaiting the user, rather than an executed decision.
  // See the comment on classifyAndGo.
  const [pending, setPending] = useState<{ type: string; label: string } | null>(null)
  const [lang, setLang] = useState<LangId>('en')
  // The clock renders after mount only: the server's time and timezone differ
  // from the phone's, and rendering it on both threw a React hydration error.
  const [clock, setClock] = useState('')
  useEffect(() => {
    const tick = () =>
      setClock(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    tick()
    const iv = setInterval(tick, 15000)
    return () => clearInterval(iv)
  }, [])
  const recRef = useRef<any>(null)
  const router = useRouter()
  const L = langById(lang)
  const es = lang === 'es'
  const typeLabel = (id: string, fallback: string) =>
    (es ? ES.types[id]?.[0] : undefined) ?? fallback
  const typeDesc = (id: string, fallback: string) =>
    (es ? ES.types[id]?.[1] : undefined) ?? fallback

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setVoiceSupported(!!SR)
    setLang(detectLang())
  }, [])

  const pickLang = (id: LangId) => {
    setLang(id)
    rememberLang(id)
    // Switching language mid-listen would keep the old acoustic model running.
    if (listening) {
      try {
        recRef.current?.abort()
      } catch {}
      setListening(false)
    }
  }

  // Classification runs on-device first — the Relay Triage Engine matches in well under a
  // millisecond with no network.
  const suggest = (type: string, evidence: string[], source: 'device' | 'cloud') => {
    setHeard({ evidence, source })
    setPending({ type, label: typeLabel(type, TYPES.find((t) => t.id === type)?.label || type) })
    setLoading(false)
  }

  // Auto-confirm so the common case (the suggestion is right) costs no taps.
  useEffect(() => {
    if (!pending) return
    const t = setTimeout(() => {
      setPending(null)
      handleSelect(pending.type)
    }, 2200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending])

  const classifyAndGo = async (text: string) => {
    setLoading(true)
    const local = triage(text)

    if (!local.abstain) {
      suggest(local.type, local.evidence, 'device')
      return
    }

    // Ambiguous phrasing: ask the language model, but only if we're online and
    // only for as long as an emergency can afford to wait.
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        const token = session?.access_token
        if (token) {
          const ctrl = new AbortController()
          const timer = setTimeout(() => ctrl.abort(), 3500)
          const res = await fetch('/api/groq/classify-emergency', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ transcript: text, lang }),
            signal: ctrl.signal,
          })
          clearTimeout(timer)
          const { type } = await res.json()
          if (type) {
            suggest(type, local.evidence, 'cloud')
            return
          }
        }
      } catch {
        /* fall through to the on-device best guess */
      }
    }

    // Offline, or the model was unreachable: never dead-end an emergency.
    setHeard({ evidence: local.evidence, source: 'device' })
    await handleSelect(local.type)
  }

  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    recRef.current = rec
    rec.lang = resolveLocale(L)
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
    rec.onerror = () => {
      setListening(false)
      toast.error('Microphone unavailable. Tap an option below')
    }
    setTranscript('')
    setListening(true)
    rec.start()
  }

  const stopVoice = () => {
    try {
      recRef.current?.stop()
    } catch {}
  }

  const handleSelect = async (type: string) => {
    // A manual pick always wins over a pending suggestion, and cancels its timer.
    setPending(null)
    setSelected(type)
    setLoading(true)
    try {
      sessionStorage.removeItem('relay_user_cancelled_until')
    } catch {}
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      let emergencyId = ''
      if (user) {
        await supabase
          .from('emergencies')
          .update({ status: 'resolved' })
          .eq('user_id', user.id)
          .eq('status', 'active')
        const { data, error } = await supabase
          .from('emergencies')
          .insert({ user_id: user.id, emergency_type: type, status: 'active' })
          .select()
          .single()
        if (error) {
          toast.error(`Could not log emergency. Call ${emg.number} now`)
        } else {
          emergencyId = data?.id || ''
        }
      }
      router.push(`/emergency/routing?type=${type}&id=${emergencyId}`)
    } catch {
      toast.error(`Something went wrong. Call ${emg.number} now`)
      setLoading(false)
      setSelected('')
    }
  }

  const URGENT = new Set(['chest_pain', 'unconscious', 'breathing', 'stroke'])
  return (
    <div className="app-shell" style={{ maxWidth: '560px', margin: '0 auto', width: '100%', padding: '18px 16px 40px' }}>
      {/* The one card that matters: status, the question, and the call button. */}
      <Hero tone="orange" style={{ padding: '18px 18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '9px' }}>
            <span className="ak-live" style={{ background: '#141413' }} />
            <span className="ak-kicker">
              {isDemo ? (es ? ES.demo : 'Demo emergency mode') : es ? ES.mode : 'Emergency mode'}
            </span>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{clock}</span>
            <button
              onClick={() => router.push('/dashboard')}
              aria-label="Close emergency mode"
              style={{ width: '40px', height: '40px', borderRadius: 8, background: 'rgba(20,20,19,0.12)', border: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={17} color="#141413" />
            </button>
          </span>
        </div>
        <h1 style={{ color: '#141413', fontSize: '38px', fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 0.98 }}>
          {es ? ES.title : 'What’s happening?'}
        </h1>
        <p style={{ fontSize: '15px', marginTop: '8px', fontWeight: 600, opacity: 0.85 }}>
          {es ? ES.sub : 'Tap one. Response starts immediately.'}
        </p>
        <motion.a
          href={`tel:${emg.number}`}
          whileTap={{ scale: 0.98 }}
          style={{
            marginTop: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
            background: '#141413', color: '#FFFFFF', padding: '20px', borderRadius: 8,
            fontWeight: 900, fontSize: '21px', letterSpacing: '-0.02em', textDecoration: 'none', minHeight: '66px',
            boxShadow: '0 10px 24px rgba(20,20,19,0.28)',
          }}
        >
          <Phone size={23} strokeWidth={2.5} />
          {es ? ES.call(emg.label) : `Call ${emg.label} now`}
        </motion.a>
      </Hero>

      {/* Say it or type it. Language first so the recogniser is right. */}
      <Panel accent="green" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span className="ak-panel-title" style={{ flex: 1, fontSize: '16px' }}>{es ? 'Dígalo' : 'Say it'}</span>
          {VOICE_LANGS.map((l) => {
            const on = l.id === lang
            return (
              <button
                key={l.id}
                onClick={() => pickLang(l.id)}
                aria-pressed={on}
                className="ak-chip"
                style={on ? { background: '#1E3A23', color: '#fff', boxShadow: 'none', cursor: 'pointer', border: 0 } : { cursor: 'pointer', border: 0 }}
              >
                {l.chip}
              </button>
            )
          })}
        </div>

        {voiceSupported && (
          <motion.button
            whileTap={{ scale: 0.985 }}
            onClick={listening ? stopVoice : startVoice}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '11px', width: '100%',
              background: listening ? '#F07800' : '#1E3A23', border: 'none', color: listening ? '#141413' : '#FFFFFF',
              padding: '17px', borderRadius: 8, fontWeight: 750, fontSize: '16px', cursor: 'pointer',
              fontFamily: 'inherit', minHeight: '58px', transition: 'background-color 0.15s ease',
            }}
          >
            <motion.span animate={listening ? { scale: [1, 1.25, 1] } : {}} transition={{ duration: 0.9, repeat: Infinity }} style={{ display: 'flex' }}>
              <Mic size={19} strokeWidth={2.2} />
            </motion.span>
            {listening ? (transcript ? `"${transcript.slice(-42)}"` : L.listening) : L.speak}
          </motion.button>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            const t = typed.trim()
            if (t.length > 2 && !loading) classifyAndGo(t)
          }}
          style={{ display: 'flex', gap: '8px' }}
        >
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={loading}
            aria-label={es ? 'Escriba lo que pasa' : 'Type what is happening'}
            placeholder={es ? 'O escriba lo que pasa' : 'Or type what is happening'}
            style={{
              flex: 1, minWidth: 0, border: 'none', boxShadow: 'inset 0 0 0 1.5px rgba(20,20,19,0.18)', borderRadius: 8,
              padding: '0 14px', minHeight: '54px', fontSize: '16px', fontFamily: 'inherit', color: T1,
              background: 'rgba(255,253,248,0.85)', outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={loading || typed.trim().length < 3}
            aria-label={es ? 'Enviar' : 'Send'}
            style={{
              width: '54px', minHeight: '54px', borderRadius: 8, border: 'none',
              background: typed.trim().length >= 3 ? '#F07800' : 'rgba(20,20,19,0.12)', color: '#141413',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <ArrowRight size={20} />
          </button>
        </form>

        {heard && !pending && (
          <p style={{ color: T3, fontSize: '12.5px' }}>
            {heard.evidence.length > 0 ? `matched: ${heard.evidence.join(' · ')}` : 'starting response'}
            {heard.source === 'device' ? ' · on phone' : ' · assisted'}
          </p>
        )}

        {pending && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ background: '#1E3A23', color: '#fff', borderRadius: 8, padding: '13px 15px' }}
          >
            <p className="ak-kicker" style={{ marginBottom: '4px' }}>{es ? ES.suggested : 'Suggested, starting in a moment'}</p>
            <p style={{ fontSize: '18px', fontWeight: 800 }}>{pending.label}</p>
            {heard && heard.evidence.length > 0 && (
              <p style={{ fontSize: '12px', opacity: 0.8, marginTop: '3px' }}>
                heard: {heard.evidence.join(' · ')}
                {heard.source === 'device' ? ' · on phone' : ' · assisted'}
              </p>
            )}
            <p style={{ fontSize: '12.5px', lineHeight: 1.5, marginTop: '6px', opacity: 0.85 }}>
              {es ? ES.notRight : 'Not right? Pick the correct one below. That overrides this.'}
            </p>
          </motion.div>
        )}
      </Panel>

      {/* Or tap it. Orange edge means life threatening. */}
      <div className="ak-tiles" style={{ marginBottom: '14px' }}>
        {TYPES.map((type) => {
          const isSel = selected === type.id
          return (
            <motion.button
              key={type.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleSelect(type.id)}
              disabled={loading}
              className={`ak-tile${URGENT.has(type.id) ? ' ak-tile-urgent' : ''}`}
              style={{
                opacity: loading && !isSel ? 0.35 : 1,
                ...(isSel ? { background: '#1E3A23', color: '#fff' } : {}),
                ...(type.id === 'other' ? { gridColumn: '1 / -1' } : {}),
              }}
            >
              <type.Icon size={22} color={isSel ? '#fff' : URGENT.has(type.id) ? '#C25E00' : '#2F5233'} strokeWidth={2.2} />
              <span className="ak-tile-t" style={{ marginTop: '10px' }}>{typeLabel(type.id, type.label)}</span>
              <span className="ak-tile-s" style={isSel ? { color: 'rgba(255,255,255,0.8)' } : undefined}>
                {isSel && loading ? (es ? ES.starting : 'Starting…') : typeDesc(type.id, type.desc)}
              </span>
            </motion.button>
          )
        })}
      </div>

      <section className="glass" style={{ padding: '4px' }}>
        <Accordion title={es ? 'Más ayuda' : 'More help'} hint={es ? 'Gravedad y signos vitales' : 'Check how serious it is, or measure vitals'}>
          <button className="row" onClick={() => router.push('/emergency/triage')}>
            <span style={{ flex: 1 }}>
              <span className="row-title" style={{ display: 'block' }}>{es ? ES.assess.replace(' →', '') : 'Assess severity'}</span>
              <span className="row-sub" style={{ display: 'block' }}>{es ? ES.severity : 'Not sure how serious?'}</span>
            </span>
            <ChevronRight size={16} color="#3F3D36" />
          </button>
          <button className="row" onClick={() => router.push('/check')}>
            <span style={{ flex: 1 }}>
              <span className="row-title" style={{ display: 'block' }}>{es ? 'Signos vitales' : 'Vitals check'}</span>
              <span className="row-sub" style={{ display: 'block' }}>
                {es ? 'Medir pulso y respiración con el teléfono' : 'Check pulse and breathing with your phone'}
              </span>
            </span>
            <ChevronRight size={16} color="#3F3D36" />
          </button>
        </Accordion>
      </section>
    </div>
  )
}
