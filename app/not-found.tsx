'use client'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Home, ArrowLeft } from 'lucide-react'

const spring = { type: 'spring', stiffness: 380, damping: 24 } as const

export default function NotFound() {
  const router = useRouter()
  return (
    <div style={{ minHeight: '100dvh', background: '#F4F5F7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
      <p style={{ color: '#D91414', fontSize: '96px', fontWeight: 900, letterSpacing: '-4px', lineHeight: 1, marginBottom: '8px', fontFamily: 'var(--font-mono, monospace)' }}>404</p>
      <h1 style={{ color: '#0E1218', fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '8px' }}>Page not found</h1>
      <p style={{ color: '#5B6371', fontSize: '14px', maxWidth: '260px', marginBottom: '36px', lineHeight: 1.6 }}>This page doesn&apos;t exist or may have moved.</p>
      <div style={{ display: 'flex', gap: '10px' }}>
        <motion.button
          whileTap={{ scale: 0.97 }}
          transition={spring}
          onClick={() => router.back()}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ECEEF2', border: '1px solid #D5D9E0', color: '#5B6371', fontWeight: 600, fontSize: '14px', padding: '12px 20px', borderRadius: '12px', cursor: 'pointer' }}
        >
          <ArrowLeft size={15} />
          Go back
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          transition={spring}
          onClick={() => router.push('/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0055FF', color: 'white', fontWeight: 700, fontSize: '14px', padding: '12px 20px', borderRadius: '12px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,85,255,0.30)' }}
        >
          <Home size={15} />
          Go home
        </motion.button>
      </div>
    </div>
  )
}
