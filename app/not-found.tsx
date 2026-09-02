'use client'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Home, ArrowLeft } from 'lucide-react'

const spring = { type: 'spring', stiffness: 380, damping: 24 } as const

export default function NotFound() {
  const router = useRouter()
  return (
    <div style={{ minHeight: '100dvh', background: '#E4EBD3', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
      <p style={{ color: '#A33417', fontSize: '96px', fontWeight: 900, letterSpacing: '-4px', lineHeight: 1, marginBottom: '8px', fontFamily: 'var(--font-mono, monospace)' }}>404</p>
      <h1 style={{ color: '#141413', fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '8px' }}>Page not found</h1>
      <p style={{ color: '#5C5A52', fontSize: '14px', maxWidth: '260px', marginBottom: '36px', lineHeight: 1.6 }}>This page doesn&apos;t exist or may have moved.</p>
      <div style={{ display: 'flex', gap: '10px' }}>
        <motion.button
          whileTap={{ scale: 0.97 }}
          transition={spring}
          onClick={() => router.back()}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#F2F0E8', border: '1px solid #D8D4C8', color: '#5C5A52', fontWeight: 600, fontSize: '14px', padding: '12px 20px', borderRadius: '12px', cursor: 'pointer' }}
        >
          <ArrowLeft size={15} />
          Go back
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          transition={spring}
          onClick={() => router.push('/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#5D6E47', color: 'white', fontWeight: 700, fontSize: '14px', padding: '12px 20px', borderRadius: '12px', border: 'none', cursor: 'pointer' }}
        >
          <Home size={15} />
          Go home
        </motion.button>
      </div>
    </div>
  )
}
