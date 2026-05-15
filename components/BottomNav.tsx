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
      position: 'fixed',
      bottom: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 32px)',
      maxWidth: '380px',
      background: 'rgba(255,255,255,0.88)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRadius: '24px',
      border: '1px solid rgba(26,40,32,0.08)',
      padding: '8px 6px',
      zIndex: 50,
      boxShadow: '0 4px 24px rgba(26,40,32,0.1), 0 1px 4px rgba(26,40,32,0.06)',
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
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '7px 14px', background: 'none', border: 'none', cursor: 'pointer', position: 'relative', minWidth: '56px' }}
            >
              {active && (
                <motion.div
                  layoutId="nav-active"
                  style={{ position: 'absolute', inset: 0, background: 'rgba(92,139,116,0.1)', borderRadius: '14px', border: '1px solid rgba(92,139,116,0.18)' }}
                  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                />
              )}
              <tab.icon size={20} color={active ? '#5C8B74' : 'rgba(26,40,32,0.28)'}/>
              <span style={{ fontSize: '10px', fontWeight: 700, color: active ? '#5C8B74' : 'rgba(26,40,32,0.28)', letterSpacing: '0.1px', fontFamily: 'inherit', position: 'relative', zIndex: 1 }}>
                {tab.label}
              </span>
            </motion.button>
          )
        })}
      </div>
    </nav>
  )
}
