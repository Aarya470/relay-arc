'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Phone, ArrowLeft, Play, Square } from 'lucide-react'
import { emergencyNumber } from '@/lib/emergency-number'

const T1 = '#141413'
const T2 = '#5C5A52'
const T3 = '#5C5A52'
const BORDER = '#98C890'
const RED = '#A33417'
const GREEN = '#42623C'
const MONO = 'var(--font-mono, monospace)'

const BPM = 110
const BEAT_MS = 60000 / BPM

export default function CprCoach() {
  const [running, setRunning] = useState(false)
  const [emg, setEmg] = useState({ number: '911', label: '911' })
  useEffect(() => {
    setEmg(emergencyNumber())
  }, [])
  const [beat, setBeat] = useState(false)
  const [count, setCount] = useState(0)
  const audioRef = useRef<{ ctx: AudioContext; stop: () => void } | null>(null)
  const router = useRouter()

  const start = () => {
    setRunning(true)
    setCount(0)
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const gain = ctx.createGain()
      gain.gain.value = 0.5
      gain.connect(ctx.destination)
      let running = true
      let n = 0
      const tick = () => {
        if (!running) return
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        n += 1
        osc.frequency.value = n % 30 === 0 ? 1200 : 760
        osc.connect(gain)
        osc.start()
        osc.stop(ctx.currentTime + 0.07)
        setBeat((b) => !b)
        setCount((c) => (c % 30) + 1)
        try {
          navigator.vibrate?.(40)
        } catch {}
        setTimeout(tick, BEAT_MS)
      }
      tick()
      audioRef.current = {
        ctx,
        stop: () => {
          running = false
          try {
            ctx.close()
          } catch {}
        },
      }
    } catch {
      // no audio — visual metronome still runs
      let alive = true
      const tick = () => {
        if (!alive) return
        setBeat((b) => !b)
        setCount((c) => (c % 30) + 1)
        setTimeout(tick, BEAT_MS)
      }
      tick()
      audioRef.current = {
        ctx: null as any,
        stop: () => {
          alive = false
        },
      }
    }
  }

  const stop = () => {
    audioRef.current?.stop()
    audioRef.current = null
    setRunning(false)
  }

  useEffect(
    () => () => {
      audioRef.current?.stop()
    },
    [],
  )

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#B3DDAC',
        maxWidth: '560px',
        margin: '0 auto',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Call {emg.label} banner — always first */}
      <a
        href={`tel:${emg.number}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          background: RED,
          color: 'white',
          fontWeight: 900,
          fontSize: '18px',
          padding: '18px',
          textDecoration: 'none',
          flexShrink: 0,
        }}
      >
        <Phone size={19} strokeWidth={2.5} /> Call {emg.label} first, then put it on speaker
      </a>

      <div style={{ flex: 1, padding: '20px 20px 36px', display: 'flex', flexDirection: 'column' }}>
        <button
          onClick={() => router.back()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            marginBottom: '18px',
            color: T3,
            fontSize: '13px',
            fontWeight: 500,
            fontFamily: 'inherit',
            alignSelf: 'flex-start',
          }}
        >
          <ArrowLeft size={14} /> Back
        </button>

        <p
          style={{
            color: T3,
            fontSize: '13px',
            fontWeight: 600,
            letterSpacing: '0',
            marginBottom: '8px',
          }}
        >
          Hands-only CPR · for adults
        </p>
        <h1
          style={{
            color: T1,
            fontSize: '30px',
            fontWeight: 800,
            letterSpacing: '-0.4px',
            lineHeight: 1.05,
            marginBottom: '20px',
          }}
        >
          Push to the beat<span style={{ color: RED }}>.</span>
        </h1>

        {/* Metronome */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '10px 0 26px',
          }}
        >
          <motion.div
            animate={running ? { scale: beat ? 1 : 0.82 } : { scale: 0.9 }}
            transition={{ duration: BEAT_MS / 2000, ease: 'easeInOut' }}
            style={{
              width: '170px',
              height: '170px',
              borderRadius: '50%',
              background: running ? RED : '#B3DDAC',
              border: running ? 'none' : `2px solid ${BORDER}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '22px',
            }}
          >
            <span
              style={{
                color: running ? 'white' : T1,
                fontFamily: 'inherit',
                fontSize: '52px',
                fontWeight: 800,
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {running ? count : BPM}
            </span>
            <span
              style={{
                color: running ? 'rgba(255,255,255,0.75)' : T3,
                fontSize: '13px',
                letterSpacing: '0',
                marginTop: '6px',
              }}
            >
              {running ? 'push now' : 'beats / min'}
            </span>
          </motion.div>

          <button
            onClick={running ? stop : start}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              width: '100%',
              maxWidth: '340px',
              background: running ? '#FFFFFF' : T1,
              color: running ? T1 : 'white',
              border: running ? `1.5px solid ${T1}` : 'none',
              fontWeight: 700,
              fontSize: '16.5px',
              padding: '17px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              minHeight: '58px',
            }}
          >
            {running ? (
              <>
                <Square size={16} /> Stop the beat
              </>
            ) : (
              <>
                <Play size={17} /> Start the beat at {BPM} BPM
              </>
            )}
          </button>
          <p style={{ color: T3, fontSize: '12px', marginTop: '10px' }}>
            Every 30 pushes you&apos;ll hear a higher tone.
          </p>
        </div>

        {/* Steps */}
        <div style={{ borderTop: `2px solid ${T1}`, paddingTop: '4px' }}>
          {[
            ['01', 'Lay them flat on their back', 'On a hard surface. Kneel beside their chest.'],
            [
              '02',
              'Heel of your hand on the center of the chest',
              'Other hand on top, fingers interlocked, arms straight.',
            ],
            [
              '03',
              'Push hard and fast. 5 cm deep',
              'Use your body weight. Let the chest fully rise between pushes.',
            ],
            [
              '04',
              'Do not stop until help arrives',
              'Swap with someone every 2 minutes if you can. Broken ribs are OK. Stopping is not.',
            ],
          ].map(([num, title, body]) => (
            <div
              key={num}
              style={{
                display: 'flex',
                gap: '16px',
                padding: '15px 0',
                borderBottom: `1px solid ${BORDER}`,
                alignItems: 'baseline',
              }}
            >
              <span
                style={{
                  color: RED,
                  fontFamily: 'inherit',
                  fontSize: '12px',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {num}
              </span>
              <div>
                <p
                  style={{
                    color: T1,
                    fontSize: '16px',
                    fontWeight: 700,
                    letterSpacing: '-0.2px',
                    lineHeight: 1.3,
                  }}
                >
                  {title}
                </p>
                <p style={{ color: T2, fontSize: '13.5px', lineHeight: 1.55, marginTop: '3px' }}>
                  {body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p style={{ color: T3, fontSize: '12px', lineHeight: 1.6, marginTop: '16px' }}>
          Hands-only CPR guidance per AHA recommendations for adult sudden collapse. If trained and
          willing, add rescue breaths 30:2.
        </p>
      </div>
    </div>
  )
}
