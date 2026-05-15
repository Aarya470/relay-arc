'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

const spring = { type: 'spring', stiffness: 380, damping: 22 } as const

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data } = await supabase.from('profiles').select('id').eq('id', session.user.id).single()
        router.push(data ? '/dashboard' : '/onboarding')
      }
    }
    check()
  }, [])

  if (!mounted) return null

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#07070E',
      display: 'flex',
      flexDirection: 'column',
      padding: '0 0 40px',
      position: 'relative',
      overflow: 'hidden'
    }}>

      {/* Ambient background glows */}
      <div style={{
        position: 'absolute', top: '-80px', left: '-80px',
        width: '450px', height: '450px',
        background: 'radial-gradient(circle, rgba(252,181,70,0.09) 0%, transparent 65%)',
        pointerEvents: 'none'
      }}/>
      <div style={{
        position: 'absolute', bottom: '80px', right: '-100px',
        width: '360px', height: '360px',
        background: 'radial-gradient(circle, rgba(128,239,128,0.07) 0%, transparent 65%)',
        pointerEvents: 'none'
      }}/>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ...spring }}
        style={{ padding: '56px 24px 0', display: 'flex', alignItems: 'center', gap: '10px' }}
      >
        <div style={{ width: '30px', height: '30px', borderRadius: '9px', background: 'linear-gradient(135deg, #fcb546, #f09020)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(252,181,70,0.35)' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1L9.5 5.5H12.5L10 9L11 13L7 10.5L3 13L4 9L1.5 5.5H4.5L7 1Z" fill="#07070E" strokeWidth="0"/>
          </svg>
        </div>
        <span style={{ color: '#EDEAE0', fontWeight: 800, fontSize: '17px', letterSpacing: '-0.5px' }}>Relay Arc</span>
      </motion.div>

      {/* Hero */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 24px' }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1, ...spring }}
        >
          {/* Eyebrow */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'rgba(252,181,70,0.08)',
            border: '1px solid rgba(252,181,70,0.18)',
            borderRadius: '99px', padding: '5px 12px',
            marginBottom: '24px'
          }}>
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fcb546' }}
            />
            <span style={{ color: '#fcb546', fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', fontFamily: 'var(--font-mono, monospace)' }}>
              CARDIAC EMERGENCY PLATFORM
            </span>
          </div>

          <h1 style={{
            color: '#EDEAE0',
            fontSize: '44px',
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: '-2px',
            marginBottom: '18px'
          }}>
            When every<br/>
            <span style={{
              background: 'linear-gradient(135deg, #fcb546 0%, #f5a020 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>minute</span> is<br/>
            the margin.
          </h1>

          <p style={{
            color: 'rgba(237,234,224,0.42)',
            fontSize: '15px',
            lineHeight: 1.65,
            marginBottom: '36px',
            maxWidth: '300px'
          }}>
            Routes you to the right hospital, alerts the ER before you arrive, and navigates your family there — free.
          </p>
        </motion.div>

        {/* RE·ACT strip */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, ...spring }}
          style={{
            display: 'flex', gap: '0',
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '16px',
            padding: '14px 20px',
            marginBottom: '28px'
          }}
        >
          {[
            { pre: 'RE·', word: 'ACT', color: '#fcb546', sub: 'In the moment' },
            { pre: 'RE·', word: 'ROUTE', color: '#EDEAE0', sub: 'Right hospital' },
            { pre: 'RE·', word: 'COVER', color: '#80EF80', sub: 'All the way home' },
          ].map((item, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none', paddingRight: i < 2 ? '0' : '0' }}>
              <p style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px' }}>
                <span style={{ color: 'rgba(237,234,224,0.18)' }}>{item.pre}</span>
                <span style={{ color: item.color }}>{item.word}</span>
              </p>
              <p style={{ color: 'rgba(237,234,224,0.18)', fontSize: '9px', marginTop: '3px', letterSpacing: '0.3px' }}>{item.sub}</p>
            </div>
          ))}
        </motion.div>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.48, ...spring }}
          style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
        >
          <motion.button
            whileTap={{ scale: 0.97, y: 1 }}
            transition={spring}
            onClick={() => router.push('/login')}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #fcb546 0%, #f09020 100%)',
              color: '#07070E',
              fontWeight: 800,
              fontSize: '16px',
              padding: '18px',
              borderRadius: '16px',
              border: 'none',
              cursor: 'pointer',
              letterSpacing: '-0.3px',
              boxShadow: '0 8px 32px rgba(252,181,70,0.28), 0 2px 8px rgba(252,181,70,0.18), inset 0 1px 0 rgba(255,255,255,0.2)'
            }}
          >
            Get started
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97, y: 1 }}
            transition={spring}
            onClick={() => router.push('/login')}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(237,234,224,0.65)',
              fontWeight: 600,
              fontSize: '16px',
              padding: '18px',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            Sign in
          </motion.button>

          <button
            onClick={() => router.push('/care-team/login')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(237,234,224,0.2)',
              fontSize: '11px', fontFamily: 'var(--font-mono, monospace)',
              letterSpacing: '1px', marginTop: '4px',
              textTransform: 'uppercase'
            }}
          >
            Care team portal →
          </button>
        </motion.div>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        style={{ color: 'rgba(237,234,224,0.08)', fontSize: '10px', textAlign: 'center', fontFamily: 'var(--font-mono, monospace)', letterSpacing: '3px', padding: '0 24px' }}
      >
        relay-arc.org
      </motion.p>
    </div>
  )
}
