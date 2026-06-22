'use client'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Heart, Pill, Settings, Phone } from 'lucide-react'
import { motion } from 'framer-motion'

const spring = { type: 'spring', stiffness: 420, damping: 26 } as const

const tabs = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/checkin', icon: Heart, label: 'Check-in' },
  // SOS button is the center item (rendered separately)
  { href: '/medications', icon: Pill, label: 'Meds' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

const HIDE_ON = ['/login', '/onboarding', '/emergency', '/care-team']

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  if (HIDE_ON.some(p => pathname === p || pathname.startsWith(p + '/'))) return null

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname === href || pathname.startsWith(href + '/')

  return (
    <nav
      aria-label="Main navigation"
      style={{
        position: 'fixed',
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: '400px',
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '24px',
        border: '1px solid rgba(26,40,32,0.08)',
        padding: '8px 6px',
        zIndex: 50,
        boxShadow: '0 4px 24px rgba(26,40,32,0.1), 0 1px 4px rgba(26,40,32,0.06)',
        // Safe area for notched phones
        paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
        {/* Home & Check-in */}
        {tabs.slice(0, 2).map(tab => {
          const active = isActive(tab.href)
          return (
            <motion.button
              key={tab.href}
              whileTap={{ scale: 0.88 }}
              transition={spring}
              onClick={() => router.push(tab.href)}
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '7px 14px', background: 'none', border: 'none', cursor: 'pointer', position: 'relative', minWidth: '56px' }}
            >
              {active && (
                <motion.div
                  layoutId="nav-active"
                  style={{ position: 'absolute', inset: 0, background: 'rgba(92,139,116,0.1)', borderRadius: '14px', border: '1px solid rgba(92,139,116,0.18)' }}
                  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                />
              )}
              <tab.icon size={20} color={active ? '#5C8B74' : 'rgba(26,40,32,0.28)'} style={{ position: 'relative', zIndex: 1 }}/>
              <span style={{ fontSize: '10px', fontWeight: 700, color: active ? '#5C8B74' : 'rgba(26,40,32,0.28)', letterSpacing: '0.1px', fontFamily: 'inherit', position: 'relative', zIndex: 1 }}>
                {tab.label}
              </span>
            </motion.button>
          )
        })}

        {/* SOS button — center */}
        <motion.a
          href="/emergency"
          whileTap={{ scale: 0.92 }}
          transition={spring}
          aria-label="Emergency SOS"
          onClick={() => {
            // Haptic feedback on mobile devices
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
              navigator.vibrate([100, 50, 100])
            }
          }}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
            padding: '7px 10px', cursor: 'pointer', textDecoration: 'none',
            position: 'relative',
          }}
        >
          <div style={{
            width: '44px', height: '44px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #E8322A, #B01C1C)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(232,50,42,0.35)',
            position: 'relative',
          }}>
            <motion.div
              animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: '1.5px solid rgba(232,50,42,0.4)' }}
            />
            <Phone size={18} color="white"/>
          </div>
          <span style={{ fontSize: '10px', fontWeight: 800, color: '#DC2626', letterSpacing: '0.5px' }}>SOS</span>
        </motion.a>

        {/* Meds & Care */}
        {tabs.slice(2).map(tab => {
          const active = isActive(tab.href)
          return (
            <motion.button
              key={tab.href}
              whileTap={{ scale: 0.88 }}
              transition={spring}
              onClick={() => router.push(tab.href)}
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '7px 14px', background: 'none', border: 'none', cursor: 'pointer', position: 'relative', minWidth: '56px' }}
            >
              {active && (
                <motion.div
                  layoutId="nav-active"
                  style={{ position: 'absolute', inset: 0, background: 'rgba(92,139,116,0.1)', borderRadius: '14px', border: '1px solid rgba(92,139,116,0.18)' }}
                  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                />
              )}
              <tab.icon size={20} color={active ? '#5C8B74' : 'rgba(26,40,32,0.28)'} style={{ position: 'relative', zIndex: 1 }}/>
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
