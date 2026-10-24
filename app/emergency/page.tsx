'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Heart, AlertCircle, Wind, Zap, Brain, Activity, Plus, Phone, ChevronRight, Mic, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { emergencyNumber } from '@/lib/emergency-number'
import { demoOn } from '@/lib/demo'
import { triage } from '@/lib/triage'
import { VOICE_LANGS, langById, detectLang, rememberLang, resolveLocale, type LangId } from '@/lib/voice-lang'
import { notch } from '@/lib/shape'

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG      = '#FFFFFF'
const SURFACE = '#B3DDAC'
const T1      = '#141413'
const T2      = '#5C5A52'
const T3      = '#5C5A52'
const RED     = '#A33417'
const RED_DIM = 'rgba(163,52,23,0.07)'
const RED_MID = 'rgba(163,52,23,0.14)'
const ACCENT  = '#42623C'
const BORDER  = '#98C890'


const TYPES = [
  { id: 'chest_pain',  label: 'Chest pain',    desc: 'Pressure, tightness or pain in chest or jaw', Icon: Heart       },
  { id: 'unconscious', label: 'Unconscious',   desc: 'Collapsed or not responding',                  Icon: AlertCircle },
  { id: 'breathing',   label: "Can't breathe", desc: 'Severe shortness of breath',                   Icon: Wind        },
  { id: 'pots',        label: 'POTS episode',  desc: 'Severe dizziness, fainting, racing heart',     Icon: Zap         },
  { id: 'stroke',      label: 'Stroke signs',  desc: 'Face drooping, slurred speech',                Icon: Brain       },
  { id: 'mecfs',       label: 'Severe crash',  desc: 'ME/CFS post-exertional malaise',               Icon: Activity    },
  { id: 'other',       label: 'Other',         desc: 'Something else urgent',                        Icon: Plus        },
]

// Spanish screen copy. East Windsor and neighbouring Hightstown have a large
// Spanish-speaking population, and a person in an emergency should not have to
// read their second language. Picking ES on this screen switches the speech
// recogniser AND every word a frightened person has to read here. Hindi and
// Marathi switch the recogniser only (their screen copy is still to come).
const ES = {
  mode: 'Modo de emergencia', demo: 'Demo · modo de emergencia',
  title: '¿Qué está pasando?', sub: 'Toque una opción. La ayuda empieza de inmediato.',
  call: (n: string) => `Llamar al ${n} ahora`,
  suggested: 'Sugerencia, empieza en un momento',
  notRight: '¿No es correcto? Elija la opción correcta abajo.',
  starting: 'Iniciando…', severity: '¿No sabe qué tan grave es?', assess: 'Evaluar gravedad →',
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
  useEffect(() => { setIsDemo(demoOn()) }, [])
  const [emg, setEmg] = useState({ number: '911', label: '911' })
  useEffect(() => { setEmg(emergencyNumber()) }, [])
  const [loading, setLoading]   = useState(false)
  const [listening, setListening] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [typed, setTyped] = useState('')
  const [heard, setHeard] = useState<{ evidence: string[]; source: 'device' | 'cloud' } | null>(null)
  // A classifier suggestion awaiting the user, rather than an executed decision.
  // See the comment on classifyAndGo.
  const [pending, setPending] = useState<{ type: string; label: string } | null>(null)
  const [lang, setLang] = useState<LangId>('en')
  // The clock renders after mount only: the server's time and timezone differ
  // from the phone's, and rendering it on both threw a React hydration error.
  const [clock, setClock] = useState('')
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    tick(); const iv = setInterval(tick, 15000); return () => clearInterval(iv)
  }, [])
  const recRef = useRef<any>(null)
  const router = useRouter()
  const L = langById(lang)
  const es = lang === 'es'
  const typeLabel = (id: string, fallback: string) => (es ? ES.types[id]?.[0] : undefined) ?? fallback
  const typeDesc = (id: string, fallback: string) => (es ? ES.types[id]?.[1] : undefined) ?? fallback

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setVoiceSupported(!!SR)
    setLang(detectLang())
  }, [])

  const pickLang = (id: LangId) => {
    setLang(id)
    rememberLang(id)
    // Switching language mid-listen would keep the old acoustic model running.
    if (listening) { try { recRef.current?.abort() } catch {} ; setListening(false) }
  }

  // Classification runs on-device first — the Relay Triage Engine matches in well
  // under a millisecond with no network. The language model is consulted only when
  // the engine is genuinely unsure, and never blocks an emergency.
  //
  // REGULATORY + SAFETY: the classifier SUGGESTS a category and the person
  // confirms it. It used to call handleSelect() directly, which made the software
  // the thing that decided what was happening to someone — a determination about a
  // patient, made for a patient, in a time-critical context. See
  // docs/INTENDED_USE.md §6. Reframed as input assistance: the suggestion is
  // visible, labelled as a suggestion, and overridable.
  //
  // It is also simply safer. The category selects which hospital capability is
  // matched, so a silent misclassification routes someone to a facility that
  // cannot treat them. A visible two-second window costs two seconds and prevents
  // that. The call-emergency-services button is unaffected and always available.
  const suggest = (type: string, evidence: string[], source: 'device' | 'cloud') => {
    setHeard({ evidence, source })
    setPending({ type, label: typeLabel(type, TYPES.find(t => t.id === type)?.label || type) })
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
        const { data: { session } } = await supabase.auth.getSession()
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
      } catch { /* fall through to the on-device best guess */ }
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
    rec.onerror = () => { setListening(false); toast.error('Microphone unavailable. Tap an option below') }
    setTranscript('')
    setListening(true)
    rec.start()
  }

  const stopVoice = () => { try { recRef.current?.stop() } catch {} }

  const handleSelect = async (type: string) => {
    // A manual pick always wins over a pending suggestion, and cancels its timer.
    setPending(null)
    setSelected(type)
    setLoading(true)
    try { sessionStorage.removeItem('relay_user_cancelled_until') } catch {}
    try {
      const { data: { user } } = await supabase.auth.getUser()
      let emergencyId = ''
      if (user) {
        await supabase.from('emergencies').update({ status: 'resolved' }).eq('user_id', user.id).eq('status', 'active')
        const { data, error } = await supabase.from('emergencies').insert({ user_id: user.id, emergency_type: type, status: 'active' }).select().single()
        if (error) { toast.error(`Could not log emergency. Call ${emg.number} now`) }
        else { emergencyId = data?.id || '' }
      }
      router.push(`/emergency/routing?type=${type}&id=${emergencyId}`)
    } catch {
      toast.error(`Something went wrong. Call ${emg.number} now`)
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
          <span style={{ color: RED, fontSize: '13px', letterSpacing: '0', fontWeight: 600 }}>
            {isDemo ? (es ? ES.demo : 'Demo · emergency mode') : (es ? ES.mode : 'Emergency mode')}
          </span>
        </div>
        <span style={{ color: T3, fontFamily: 'var(--font-mono, monospace)', fontSize: '11px' }}>
          {clock}
        </span>
      </div>

      <div style={{ flex: 1, padding: '20px 20px 28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ color: T1, fontSize: '34px', fontWeight: 900, letterSpacing: '-1.3px', lineHeight: 1.02 }}>
              {es ? ES.title : 'What\u2019s happening?'}
            </h1>
            <p style={{ color: T2, fontSize: '14.5px', marginTop: '6px', fontWeight: 500 }}>
              {es ? ES.sub : 'Tap one. Response starts immediately.'}
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            aria-label="Close emergency mode"
            style={{ width: '44px', height: '44px', borderRadius: '14px', background: SURFACE, border: `1px solid ${BORDER}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <X size={17} color={T2}/>
          </button>
        </div>

        {/* Call {emg.label} — always first, always huge */}
        <motion.a
          href={`tel:${emg.number}`}
          whileTap={{ scale: 0.98 }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
            background: RED, color: 'white',
            // Chamfered: the call control wears the same shape everywhere it
            // appears, so it is recognisable before it is readable.
            padding: '22px', clipPath: notch(16),
            fontWeight: 900, fontSize: '22px', letterSpacing: '-0.3px',
            textDecoration: 'none', minHeight: '68px',
          }}>
          <Phone size={24} strokeWidth={2.5}/>
          {es ? ES.call(emg.label) : `Call ${emg.label} now`}
        </motion.a>

        {/* Language first, so the recogniser and the screen are right before they
            talk. Shown even without speech support, because ES also translates
            this screen. */}
        {(
          <div style={{ display: 'flex', gap: '6px', marginBottom: '-4px' }}>
            {VOICE_LANGS.map(l => {
              const on = l.id === lang
              return (
                <button
                  key={l.id}
                  onClick={() => pickLang(l.id)}
                  aria-pressed={on}
                  style={{
                    background: on ? T1 : 'transparent',
                    color: on ? '#FFFFFF' : T3,
                    border: `1px solid ${on ? T1 : BORDER}`,
                    padding: '5px 11px', borderRadius: '14px',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px',
                    cursor: 'pointer', minHeight: '30px',
                  }}
                >
                  {l.chip}
                </button>
              )
            })}
          </div>
        )}

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
              ? (transcript ? `"${transcript.slice(-42)}"` : L.listening)
              : L.speak}
          </motion.button>
        )}

        {/* Typing works where speaking does not: a loud room, a quiet one, or no
            microphone. Same on-device classifier as voice. */}
        <form onSubmit={e => { e.preventDefault(); const t = typed.trim(); if (t.length > 2 && !loading) classifyAndGo(t) }}
          style={{ display: 'flex', gap: '8px' }}>
          <input value={typed} onChange={e => setTyped(e.target.value)} disabled={loading}
            aria-label={es ? 'Escriba lo que pasa' : 'Type what is happening'}
            placeholder={es ? 'O escriba lo que pasa' : 'Or type what is happening'}
            style={{ flex: 1, minWidth: 0, border: `1.5px solid ${T1}`, borderRadius: '12px', padding: '0 14px', minHeight: '54px', fontSize: '16px', fontFamily: 'inherit', color: T1, background: '#FFFFFF', outline: 'none' }}/>
          <button type="submit" disabled={loading || typed.trim().length < 3} aria-label={es ? 'Enviar' : 'Send'}
            style={{ width: '54px', minHeight: '54px', borderRadius: '12px', border: 'none', background: typed.trim().length >= 3 ? T1 : '#B9B6AA', color: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ArrowRight size={20}/>
          </button>
        </form>

        {heard && !pending && (
          <p style={{ color: T3, fontSize: '12.5px', fontFamily: 'var(--font-mono, monospace)', marginTop: '-6px' }}>
            {heard.evidence.length > 0 ? `matched: ${heard.evidence.join(' · ')}` : 'starting response'}
            {heard.source === 'device' ? ' · on-device' : ' · assisted'}
          </p>
        )}

        {/* The suggestion, stated as a suggestion. Overridable by tapping any type
            below, which cancels the auto-continue. */}
        {pending && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            style={{
              border: `1px solid ${BORDER}`,
              padding: '11px 13px', marginTop: '-6px',
            }}>
            <p style={{ color: T3, fontSize: '13px', fontWeight: 600, letterSpacing: '0', marginBottom: '4px' }}>
              {es ? ES.suggested : 'Suggested, starting in a moment'}
            </p>
            <p style={{ color: T1, fontSize: '16px', fontWeight: 700 }}>{pending.label}</p>
            {heard && heard.evidence.length > 0 && (
              <p style={{ color: T3, fontSize: '11.5px', fontFamily: 'var(--font-mono, monospace)', marginTop: '3px' }}>
                heard: {heard.evidence.join(' · ')}{heard.source === 'device' ? ' · on-device' : ' · assisted'}
              </p>
            )}
            <p style={{ color: T2, fontSize: '12px', lineHeight: 1.5, marginTop: '6px' }}>
              {es ? ES.notRight : 'Not right? Pick the correct one below. That overrides this.'}
            </p>
          </motion.div>
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
                    {typeLabel(type.id, type.label)}
                  </p>
                  <p style={{ color: T3, fontSize: '13px', lineHeight: 1.4, marginTop: '2px' }}>{typeDesc(type.id, type.desc)}</p>
                </div>
                {isSel && loading ? (
                  <span style={{ color: RED, fontSize: '13px', fontWeight: 600, letterSpacing: '0', flexShrink: 0 }}>
                    {es ? ES.starting : 'Starting…'}
                  </span>
                ) : (
                  <ChevronRight size={16} color="#C4BFB0" style={{ flexShrink: 0 }}/>
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
            {es ? ES.severity : 'Not sure how serious?'} <span style={{ color: ACCENT, fontWeight: 700 }}>{es ? ES.assess : 'Assess severity →'}</span>
          </button>
          <button
            onClick={() => router.push('/check')}
            style={{ display: 'block', margin: '0 auto', color: T2, fontSize: '13.5px', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '6px 10px' }}>
            {es ? 'Medir pulso y respiración con el teléfono' : 'Check pulse and breathing with your phone'} <span style={{ color: ACCENT, fontWeight: 700 }}>→</span>
          </button>
        </div>
      </div>
    </div>
  )
}
