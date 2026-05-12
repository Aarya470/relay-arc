'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
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
      background: '#09090C',
      display: 'flex',
      flexDirection: 'column',
      padding: '64px 24px 32px',
      maxWidth: '430px',
      margin: '0 auto'
    }}>

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '16px', height: '16px', background: '#fcb546', borderRadius: '3px', transform: 'rotate(45deg)' }}/>
          <div style={{ width: '16px', height: '16px', border: '2px solid #80EF80', borderRadius: '3px', transform: 'rotate(45deg)', marginLeft: '-8px' }}/>
        </div>
        <span style={{ color: 'white', fontWeight: 700, fontSize: '20px', letterSpacing: '-0.5px' }}>Relay Arc</span>
      </motion.div>

      {/* Spacer */}
      <div style={{ flex: 1 }}/>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{ marginBottom: '40px' }}
      >
        <h1 style={{ color: 'white', fontSize: '42px', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-1px', marginBottom: '16px' }}>
          When every<br/>
          <span style={{ color: '#fcb546' }}>minute</span> is<br/>
          the margin.
        </h1>
        <p style={{ color: 'rgba(237,234,224,0.4)', fontSize: '14px', lineHeight: 1.6, maxWidth: '300px' }}>
          Cardiac emergency routing that finds the right hospital, alerts the ER before you arrive, and navigates you there — free.
        </p>
      </motion.div>

      {/* RE·ACT RE·ROUTE RE·COVER */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{ display: 'flex', gap: '24px', marginBottom: '40px' }}
      >
        {[
          { pre: 'RE·', word: 'ACT', color: '#fcb546' },
          { pre: 'RE·', word: 'ROUTE', color: 'white' },
          { pre: 'RE·', word: 'COVER', color: '#80EF80' },
        ].map((item, i) => (
          <div key={i}>
            <p style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '2px' }}>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>{item.pre}</span>
              <span style={{ color: item.color }}>{item.word}</span>
            </p>
          </div>
        ))}
      </motion.div>

      {/* Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
      >
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push('/login')}
          style={{
            width: '100%',
            background: '#fcb546',
            color: '#09090C',
            fontWeight: 700,
            fontSize: '16px',
            padding: '18px',
            borderRadius: '16px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(252,181,70,0.25)'
          }}
        >
          Get started
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => router.push('/login')}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.06)',
            color: 'white',
            fontWeight: 600,
            fontSize: '16px',
            padding: '18px',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.08)',
            cursor: 'pointer'
          }}
        >
          Sign in
        </motion.button>
      </motion.div>

      {/* Bottom */}
      <div style={{ flex: 1 }}/>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        style={{ color: 'rgba(255,255,255,0.15)', fontSize: '11px', textAlign: 'center', fontFamily: 'monospace', letterSpacing: '3px', marginTop: '32px' }}
      >
        relay-arc.org
      </motion.p>

    </div>
  )
}
