'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { emergencyNumber } from '@/lib/emergency-number'
import { Phone, MessageSquare, HeartPulse, Check } from 'lucide-react'

const T1 = '#141413'
const RED = '#A33417'
const MONO = 'var(--font-mono, monospace)'

const FIRST_CHECK_MS = 60_000
const REPEAT_CHECK_MS = 90_000
const RESPONSE_WINDOW_S = 25

export default function GuardianWatch({
  profile,
  contacts,
  hospitalName,
  typeLabel,
  onEvent,
}: {
  profile: any
  contacts: any[]
  hospitalName: string
  typeLabel: string
  onEvent?: (label: string) => void
}) {
  const [phase, setPhase] = useState<'idle' | 'asking' | 'escalated'>('idle')
  const [emg, setEmg] = useState({ number: '911', label: '911' })
  useEffect(() => { setEmg(emergencyNumber()) }, [])
  const [countdown, setCountdown] = useState(RESPONSE_WINDOW_S)
  const [coords, setCoords] = useState<[number, number] | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<{ ctx: AudioContext; stop: () => void } | null>(null)

  const scheduleCheck = useCallback((delay: number) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setCountdown(RESPONSE_WINDOW_S)
      setPhase('asking')
    }, delay)
  }, [])

  useEffect(() => {
    scheduleCheck(FIRST_CHECK_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (tickRef.current) clearInterval(tickRef.current)
      audioRef.current?.stop()
    }
  }, [scheduleCheck])

  // Countdown while asking
  useEffect(() => {
    if (phase !== 'asking') return
    tickRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (tickRef.current) clearInterval(tickRef.current)
          escalate()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (tickRef.current) clearInterval(tickRef.current) }
  }, [phase])

  const startAlarm = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const gain = ctx.createGain()
      gain.gain.value = 0.4
      gain.connect(ctx.destination)
      let running = true
      const beep = () => {
        if (!running) return
        const osc = ctx.createOscillator()
        osc.type = 'square'
        osc.frequency.value = 880
        osc.connect(gain)
        osc.start()
        osc.stop(ctx.currentTime + 0.18)
        setTimeout(beep, 400)
      }
      beep()
      audioRef.current = { ctx, stop: () => { running = false; try { ctx.close() } catch {} } }
    } catch {}
  }

  const escalate = () => {
    setPhase('escalated')
    onEvent?.('Guardian alert. Patient stopped responding')
    startAlarm()
    try { navigator.vibrate?.([400, 200, 400, 200, 800]) } catch {}
    navigator.geolocation?.getCurrentPosition(
      pos => setCoords([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  const respond = () => {
    audioRef.current?.stop()
    audioRef.current = null
    setPhase('idle')
    scheduleCheck(REPEAT_CHECK_MS)
  }

  const smsHref = () => {
    const phones = contacts.map((c: any) => c.phone).filter(Boolean).join(',')
    if (!phones) return '#'
    const loc = coords ? ` Location: https://maps.google.com/?q=${coords[0]},${coords[1]}` : ''
    const msg = `EMERGENCY: ${profile?.full_name || 'Your family member'} may be UNRESPONSIVE (${typeLabel}). They activated Relay SOS and stopped responding.${loc} They were being routed to ${hospitalName}. Call emergency services.`
    return `sms:${phones}?body=${encodeURIComponent(msg)}`
  }

  const router = useRouter()

  return (
    <AnimatePresence>
      {phase === 'asking' && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(20,20,19,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
        >
          <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '28px 24px', width: '100%', maxWidth: '360px', textAlign: 'center' }}>
            <p style={{ color: '#5C5A52', fontSize: '13px', fontWeight: 600, letterSpacing: '0', marginBottom: '14px' }}>
              Guardian check
            </p>
            <p style={{ color: T1, fontSize: '24px', fontWeight: 800, letterSpacing: '-0.6px', lineHeight: 1.15, marginBottom: '6px' }}>
              Are you still responsive?
            </p>
            <p style={{ color: '#5C5A52', fontSize: '13.5px', lineHeight: 1.55, marginBottom: '22px' }}>
              If you don&apos;t answer, Relay will sound an alarm and prepare alerts for your contacts.
            </p>
            <p style={{ color: RED, fontFamily: MONO, fontSize: '46px', fontWeight: 800, lineHeight: 1, marginBottom: '22px', fontVariantNumeric: 'tabular-nums' }}>
              {countdown}
            </p>
            <button onClick={respond}
              style={{ width: '100%', background: '#42623C', color: 'white', fontWeight: 800, fontSize: '18px', padding: '18px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', minHeight: '62px' }}>
              <Check size={20} strokeWidth={2.5}/> I&apos;m OK
            </button>
          </div>
        </motion.div>
      )}

      {phase === 'escalated' && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ position: 'fixed', inset: 0, zIndex: 300, background: RED, display: 'flex', flexDirection: 'column', padding: '28px 22px', overflowY: 'auto' }}
        >
          <motion.p
            animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 0.8, repeat: Infinity }}
            style={{ color: 'white', fontSize: '13px', fontWeight: 600, letterSpacing: '0', marginBottom: '14px' }}>
            ⚠ Guardian alert: no response
          </motion.p>
          <h1 style={{ color: 'white', fontSize: '32px', fontWeight: 900, letterSpacing: '-0.4px', lineHeight: 1.05, marginBottom: '10px' }}>
            {profile?.full_name || 'This person'} may be unresponsive.
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '15px', lineHeight: 1.6, marginBottom: '24px' }}>
            Active emergency: {typeLabel}. If you found this phone, please help. Everything you need is below.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            <a href={`tel:${emg.number}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'white', color: RED, fontWeight: 900, fontSize: '19px', padding: '19px', borderRadius: '12px', textDecoration: 'none', minHeight: '62px' }}>
              <Phone size={20} strokeWidth={2.5}/> Call {emg.label} now
            </a>
            {contacts.length > 0 && (
              <a href={smsHref()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'rgba(255,255,255,0.16)', border: '1.5px solid rgba(255,255,255,0.7)', color: 'white', fontWeight: 700, fontSize: '15.5px', padding: '16px', borderRadius: '12px', textDecoration: 'none', minHeight: '56px' }}>
                <MessageSquare size={17}/> Text their family the location
              </a>
            )}
            <button onClick={() => router.push('/emergency/cpr')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'rgba(255,255,255,0.16)', border: '1.5px solid rgba(255,255,255,0.7)', color: 'white', fontWeight: 700, fontSize: '15.5px', padding: '16px', borderRadius: '12px', cursor: 'pointer', fontFamily: 'inherit', minHeight: '56px' }}>
              <HeartPulse size={17}/> Not breathing? CPR guide
            </button>
          </div>

          {(profile?.blood_type || profile?.allergies) && (
            <div style={{ borderTop: '2px solid rgba(255,255,255,0.5)', paddingTop: '16px', marginBottom: '24px' }}>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 600, letterSpacing: '0', marginBottom: '10px' }}>
                For paramedics
              </p>
              {profile?.blood_type && (
                <p style={{ color: 'white', fontSize: '15px', marginBottom: '6px' }}>
                  Blood type: <strong style={{ fontFamily: MONO, fontSize: '19px' }}>{profile.blood_type}</strong>
                </p>
              )}
              {profile?.allergies && (
                <p style={{ color: 'white', fontSize: '15px', marginBottom: '6px' }}>
                  Allergies: <strong>{profile.allergies}</strong>
                </p>
              )}
              {profile?.medications?.length > 0 && (
                <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13.5px', lineHeight: 1.6 }}>
                  Medications: {profile.medications.slice(0, 4).map((m: any) => m.name || m).join(', ')}
                </p>
              )}
            </div>
          )}

          <button onClick={() => { onEvent?.('Patient responded. Alarm stopped'); respond() }}
            style={{ marginTop: 'auto', background: 'none', border: 'none', color: 'rgba(255,255,255,0.75)', fontSize: '14px', fontWeight: 600, padding: '14px', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
            I&apos;m OK. Stop the alarm
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
