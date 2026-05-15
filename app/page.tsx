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
      background: '#F2EFE9',
      display: 'flex',
      flexDirection: 'column',
      padding: '0 0 40px',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Background blobs */}
      <div style={{
        position: 'absolute', top: '-120px', right: '-80px',
        width: '480px', height: '480px',
        background: 'radial-gradient(circle, rgba(92,139,116,0.12) 0%, transparent 65%)',
        pointerEvents: 'none',
      }}/>
      <div style={{
        position: 'absolute', bottom: '60px', left: '-100px',
        width: '380px', height: '380px',
        background: 'radial-gradient(circle, rgba(255,211,172,0.38) 0%, transparent 65%)',
        pointerEvents: 'none',
      }}/>
      {/* Large decorative arc */}
      <div style={{
        position: 'absolute', top: '30%', right: '-60px',
        width: '220px', height: '220px',
        borderRadius: '50%',
        border: '1.5px solid rgba(92,139,116,0.14)',
        pointerEvents: 'none',
      }}/>
      <div style={{
        position: 'absolute', top: 'calc(30% + 30px)', right: '-30px',
        width: '160px', height: '160px',
        borderRadius: '50%',
        border: '1.5px solid rgba(255,211,172,0.3)',
        pointerEvents: 'none',
      }}/>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ...spring }}
        style={{ padding: '56px 24px 0', display: 'flex', alignItems: 'center', gap: '10px' }}
      >
        <div style={{
          width: '32px', height: '32px', borderRadius: '10px',
          background: 'linear-gradient(135deg, #5C8B74, #3D6B58)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(92,139,116,0.32)',
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1L9.5 5.5H12.5L10 9L11 13L7 10.5L3 13L4 9L1.5 5.5H4.5L7 1Z" fill="#F2EFE9" strokeWidth="0"/>
          </svg>
        </div>
        <span style={{ color: '#1A2820', fontWeight: 800, fontSize: '17px', letterSpacing: '-0.5px' }}>Relay Arc</span>
      </motion.div>

      {/* Hero */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 24px' }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1, ...spring }}
        >
          {/* Eyebrow badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            background: 'rgba(92,139,116,0.1)',
            border: '1px solid rgba(92,139,116,0.22)',
            borderRadius: '99px', padding: '5px 13px',
            marginBottom: '24px',
          }}>
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#5C8B74' }}
            />
            <span style={{ color: '#5C8B74', fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', fontFamily: 'var(--font-mono, monospace)' }}>
              CARDIAC EMERGENCY PLATFORM
            </span>
          </div>

          <h1 style={{
            color: '#1A2820',
            fontSize: '46px',
            fontWeight: 900,
            lineHeight: 1.03,
            letterSpacing: '-2.2px',
            marginBottom: '18px',
          }}>
            When every<br/>
            <span style={{ color: '#5C8B74' }}>minute</span> is<br/>
            the margin.
          </h1>

          <p style={{
            color: 'rgba(26,40,32,0.5)',
            fontSize: '15px',
            lineHeight: 1.65,
            marginBottom: '36px',
            maxWidth: '300px',
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
            background: '#FFFFFF',
            border: '1px solid rgba(26,40,32,0.07)',
            borderRadius: '18px',
            padding: '14px 20px',
            marginBottom: '28px',
            boxShadow: '0 2px 14px rgba(26,40,32,0.06)',
          }}
        >
          {[
            { pre: 'RE·', word: 'ACT', color: '#5C8B74', sub: 'In the moment' },
            { pre: 'RE·', word: 'ROUTE', color: '#1A2820', sub: 'Right hospital' },
            { pre: 'RE·', word: 'COVER', color: '#C46B30', sub: 'All the way home' },
          ].map((item, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', borderRight: i < 2 ? '1px solid rgba(26,40,32,0.07)' : 'none', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', width: '33.33%', padding: '2px 0' }}>
              <p style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px' }}>
                <span style={{ color: 'rgba(26,40,32,0.2)' }}>{item.pre}</span>
                <span style={{ color: item.color }}>{item.word}</span>
              </p>
              <p style={{ color: 'rgba(26,40,32,0.28)', fontSize: '9px', marginTop: '3px', letterSpacing: '0.3px' }}>{item.sub}</p>
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
              background: 'linear-gradient(135deg, #5C8B74 0%, #3D6B58 100%)',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '16px',
              padding: '18px',
              borderRadius: '16px',
              border: 'none',
              cursor: 'pointer',
              letterSpacing: '-0.3px',
              boxShadow: '0 8px 28px rgba(92,139,116,0.3), 0 2px 6px rgba(92,139,116,0.18), inset 0 1px 0 rgba(255,255,255,0.15)',
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
              background: '#FFFFFF',
              color: 'rgba(26,40,32,0.65)',
              fontWeight: 600,
              fontSize: '16px',
              padding: '18px',
              borderRadius: '16px',
              border: '1px solid rgba(26,40,32,0.1)',
              cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(26,40,32,0.06)',
            }}
          >
            Sign in
          </motion.button>

          <button
            onClick={() => router.push('/care-team/login')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(26,40,32,0.25)',
              fontSize: '11px', fontFamily: 'var(--font-mono, monospace)',
              letterSpacing: '1px', marginTop: '4px',
              textTransform: 'uppercase',
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
        style={{ color: 'rgba(26,40,32,0.14)', fontSize: '10px', textAlign: 'center', fontFamily: 'var(--font-mono, monospace)', letterSpacing: '3px', padding: '0 24px' }}
      >
        relay-arc.org
      </motion.p>
    </div>
  )
}
