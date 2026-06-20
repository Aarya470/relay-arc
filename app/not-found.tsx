'use client'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Home, ArrowLeft } from 'lucide-react'

const spring = { type: 'spring', stiffness: 380, damping: 24 } as const

export default function NotFound() {
  const router = useRouter()
  return (
    <div style={{ minHeight: '100dvh', background: '#F2EFE9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
      <div style={{ width: '72px', height: '72px', borderRadius: '22px', background: 'linear-gradient(135deg, #5C8B74, #3D6B58)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', boxShadow: '0 8px 24px rgba(92,139,116,0.25)' }}>
        <span style={{ color: 'white', fontSize: '32px', fontWeight: 900 }}>?</span>
      </div>
      <h1 style={{ color: '#1A2820', fontSize: '28px', fontWeight: 900, letterSpacing: '-1px', marginBottom: '8px' }}>Page not found</h1>
      <p style={{ color: 'rgba(26,40,32,0.42)', fontSize: '15px', maxWidth: '280px', marginBottom: '32px', lineHeight: 1.6 }}>This page doesn't exist or may have moved.</p>
      <div style={{ display: 'flex', gap: '10px' }}>
        <motion.button
          whileTap={{ scale: 0.97 }}
          transition={spring}
          onClick={() => router.back()}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(26,40,32,0.07)', border: '1px solid rgba(26,40,32,0.1)', color: 'rgba(26,40,32,0.65)', fontWeight: 600, fontSize: '14px', padding: '12px 20px', borderRadius: '12px', cursor: 'pointer' }}
        >
          <ArrowLeft size={15}/>
          Go back
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          transition={spring}
          onClick={() => router.push('/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #5C8B74, #3D6B58)', color: 'white', fontWeight: 700, fontSize: '14px', padding: '12px 20px', borderRadius: '12px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(92,139,116,0.22)' }}
        >
          <Home size={15}/>
          Dashboard
        </motion.button>
      </div>
    </div>
  )
}
