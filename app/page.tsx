'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

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
      minHeight: '100vh',
      background: '#07070E',
      display: 'flex',
      flexDirection: 'column',
      padding: '0 0 40px',
      position: 'relative',
      overflow: 'hidden'
    }}>

      {/* Ambient background glows */}
      <div style={{
        position: 'absolute', top: '-100px', left: '-100px',
        width: '400px', height: '400px',
        background: 'radial-gradient(circle, rgba(252,181,70,0.08) 0%, transparent 70%)',
        pointerEvents: 'none'
      }}/>
      <div style={{
        position: 'absolute', bottom: '100px', right: '-80px',
        width: '300px', height: '300px',
        background: 'radial-gradient(circle, rgba(128,239,128,0.06) 0%, transparent 70%)',
        pointerEvents: 'none'
      }}/>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ padding: '56px 24px 0', display: 'flex', alignItems: 'center', gap: '10px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
          <div style={{ width: '14px', height: '14px', background: '#fcb546', borderRadius: '3px', transform: 'rotate(45deg)' }}/>
          <div style={{ width: '14px', height: '14px', border: '2px solid #80EF80', borderRadius: '3px', transform: 'rotate(45deg)', marginLeft: '-6px', background: 'transparent' }}/>
        </div>
        <span style={{ color: '#EDEAE0', fontWeight: 700, fontSize: '18px', letterSpacing: '-0.3px' }}>Relay Arc</span>
      </motion.div>

      {/* Hero */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 24px' }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          {/* Eyebrow */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'rgba(252,181,70,0.08)',
            border: '1px solid rgba(252,181,70,0.2)',
            borderRadius: '99px', padding: '5px 12px',
            marginBottom: '24px'
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fcb546' }}/>
            <span style={{ color: '#fcb546', fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', fontFamily: 'monospace' }}>
              CARDIAC EMERGENCY PLATFORM
            </span>
          </div>

          <h1 style={{
            color: '#EDEAE0',
            fontSize: '42px',
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: '-1.5px',
            marginBottom: '16px'
          }}>
            When every<br/>
            <span style={{
              background: 'linear-gradient(135deg, #fcb546 0%, #f5a020 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>minute</span> is<br/>
            the margin.
          </h1>

          <p style={{
            color: 'rgba(237,234,224,0.45)',
            fontSize: '15px',
            lineHeight: 1.65,
            marginBottom: '40px',
            maxWidth: '320px'
          }}>
            Routes you to the right hospital, alerts the ER before you arrive, and navigates your family there — free.
          </p>
        </motion.div>

        {/* RE·ACT strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{
            display: 'flex', gap: '0',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '14px',
            padding: '14px 20px',
            marginBottom: '32px'
          }}
        >
          {[
            { pre: 'RE·', word: 'ACT', color: '#fcb546', sub: 'In the moment' },
            { pre: 'RE·', word: 'ROUTE', color: '#EDEAE0', sub: 'Right hospital' },
            { pre: 'RE·', word: 'COVER', color: '#80EF80', sub: 'All the way home' },
          ].map((item, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
              <p style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, letterSpacing: '1px' }}>
                <span style={{ color: 'rgba(237,234,224,0.2)' }}>{item.pre}</span>
                <span style={{ color: item.color }}>{item.word}</span>
              </p>
              <p style={{ color: 'rgba(237,234,224,0.2)', fontSize: '9px', marginTop: '3px', letterSpacing: '0.5px' }}>{item.sub}</p>
            </div>
          ))}
        </motion.div>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
        >
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push('/login')}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #fcb546 0%, #f09020 100%)',
              color: '#07070E',
              fontWeight: 700,
              fontSize: '16px',
              padding: '18px',
              borderRadius: '16px',
              border: 'none',
              cursor: 'pointer',
              letterSpacing: '-0.2px',
              boxShadow: '0 8px 32px rgba(252,181,70,0.3), 0 2px 8px rgba(252,181,70,0.2)'
            }}
          >
            Get started
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => router.push('/login')}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(237,234,224,0.7)',
              fontWeight: 600,
              fontSize: '16px',
              padding: '18px',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)'
            }}
          >
            Sign in
          </motion.button>

          <button
            onClick={() => router.push('/care-team/login')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(237,234,224,0.2)',
              fontSize: '12px', fontFamily: 'monospace',
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
        style={{ color: 'rgba(237,234,224,0.1)', fontSize: '10px', textAlign: 'center', fontFamily: 'monospace', letterSpacing: '3px', padding: '0 24px' }}
      >
        relay-arc.org
      </motion.p>
    </div>
  )
}
