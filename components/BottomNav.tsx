'use client'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Heart, Pill, Calendar, FileText } from 'lucide-react'
import { motion } from 'framer-motion'

const spring = { type: 'spring', stiffness: 420, damping: 26 } as const

const tabs = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/checkin', icon: Heart, label: 'Check-in' },
  { href: '/medications', icon: Pill, label: 'Meds' },
  { href: '/timeline', icon: Calendar, label: 'Timeline' },
  { href: '/appointments', icon: FileText, label: 'Care' },
]

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const hideOn = ['/login', '/onboarding', '/emergency', '/care-team', '/nurse', '/driver', '/transport']
  if (hideOn.some(p => pathname.startsWith(p))) return null

  return (
    <nav style={{
      position: 'fixed', bottom: 0,
      left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: '430px',
      background: 'rgba(7,7,14,0.88)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      padding: '8px 4px 24px',
      zIndex: 50
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
        {tabs.map(tab => {
          const active = pathname === tab.href
          return (
            <motion.button
              key={tab.href}
              whileTap={{ scale: 0.88 }}
              transition={spring}
              onClick={() => router.push(tab.href)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', position: 'relative', minWidth: '60px' }}
            >
              {active && (
                <motion.div
                  layoutId="nav-active"
                  style={{ position: 'absolute', inset: 0, background: 'rgba(252,181,70,0.07)', borderRadius: '12px', border: '1px solid rgba(252,181,70,0.14)' }}
                  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                />
              )}
              <tab.icon size={20} color={active ? '#fcb546' : 'rgba(237,234,224,0.28)'}/>
              <span style={{ fontSize: '10px', fontWeight: 700, color: active ? '#fcb546' : 'rgba(237,234,224,0.28)', letterSpacing: '0.1px', fontFamily: 'inherit' }}>
                {tab.label}
              </span>
            </motion.button>
          )
        })}
      </div>
    </nav>
  )
}
