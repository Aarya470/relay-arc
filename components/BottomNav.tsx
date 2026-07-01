'use client'
import { usePathname, useRouter } from 'next/navigation'
import { Home, MessageCircle, LayoutList, Settings, Phone } from 'lucide-react'
import { motion } from 'framer-motion'

const tabs = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/checkin', icon: MessageCircle, label: 'Check-in' },
  { href: '/medications', icon: LayoutList, label: 'Meds' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

const HIDE_ON = ['/login', '/onboarding', '/care-team', '/nurse', '/driver', '/transport']

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  if (pathname === '/emergency' || pathname.startsWith('/emergency/') || HIDE_ON.some(p => pathname === p || pathname.startsWith(p + '/'))) return null

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname === href || pathname.startsWith(href + '/')

  return (
    <nav
      aria-label="Main navigation"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(16,22,14,0.07)',
        zIndex: 50,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'stretch',
        maxWidth: '600px',
        margin: '0 auto',
        height: '60px',
      }}>
        {tabs.slice(0, 2).map(tab => {
          const active = isActive(tab.href)
          return (
            <motion.button
              key={tab.href}
              whileTap={{ scale: 0.9 }}
              onClick={() => router.push(tab.href)}
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px 4px',
                position: 'relative',
              }}
            >
              {active && (
                <motion.div
                  layoutId="tab-bar"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '22%',
                    right: '22%',
                    height: '2px',
                    background: '#1C3D28',
                    borderRadius: '0 0 2px 2px',
                  }}
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                />
              )}
              <tab.icon size={20} color={active ? '#1C3D28' : 'rgba(16,22,14,0.22)'} strokeWidth={active ? 2.2 : 1.8}/>
              <span style={{
                fontSize: '10px',
                fontWeight: active ? 700 : 500,
                color: active ? '#1C3D28' : 'rgba(16,22,14,0.32)',
                letterSpacing: '0.1px',
              }}>
                {tab.label}
              </span>
            </motion.button>
          )
        })}

        {/* SOS — center */}
        <motion.a
          href="/emergency"
          whileTap={{ scale: 0.92 }}
          aria-label="Emergency SOS"
          onClick={() => {
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
              navigator.vibrate([80, 40, 80])
            }
          }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
            padding: '0 18px',
            cursor: 'pointer',
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            background: '#B91C1C',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Phone size={19} color="white" strokeWidth={2.2}/>
          </div>
          <span style={{
            fontSize: '10px',
            fontWeight: 800,
            color: '#B91C1C',
            letterSpacing: '0.5px',
            fontFamily: 'var(--font-mono, monospace)',
          }}>SOS</span>
        </motion.a>

        {tabs.slice(2).map(tab => {
          const active = isActive(tab.href)
          return (
            <motion.button
              key={tab.href}
              whileTap={{ scale: 0.9 }}
              onClick={() => router.push(tab.href)}
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px 4px',
                position: 'relative',
              }}
            >
              {active && (
                <motion.div
                  layoutId="tab-bar"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '22%',
                    right: '22%',
                    height: '2px',
                    background: '#1C3D28',
                    borderRadius: '0 0 2px 2px',
                  }}
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                />
              )}
              <tab.icon size={20} color={active ? '#1C3D28' : 'rgba(16,22,14,0.22)'} strokeWidth={active ? 2.2 : 1.8}/>
              <span style={{
                fontSize: '10px',
                fontWeight: active ? 700 : 500,
                color: active ? '#1C3D28' : 'rgba(16,22,14,0.32)',
                letterSpacing: '0.1px',
              }}>
                {tab.label}
              </span>
            </motion.button>
          )
        })}
      </div>
    </nav>
  )
}
