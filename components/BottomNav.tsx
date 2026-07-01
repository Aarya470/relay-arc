'use client'
import { usePathname, useRouter } from 'next/navigation'
import { Home, MessageCircle, LayoutList, Activity, Phone } from 'lucide-react'
import { motion } from 'framer-motion'

const tabs = [
  { href: '/dashboard',   icon: Home,          label: 'Home'     },
  { href: '/checkin',     icon: MessageCircle, label: 'Check-in' },
  { href: '/medications', icon: LayoutList,    label: 'Meds'     },
  { href: '/symptoms',    icon: Activity,      label: 'Symptoms' },
]

const HIDE_ON = ['/login', '/onboarding', '/care-team', '/nurse', '/driver', '/transport']

export default function BottomNav() {
  const pathname = usePathname()
  const router   = useRouter()

  if (
    pathname === '/emergency' ||
    pathname.startsWith('/emergency/') ||
    HIDE_ON.some(p => pathname === p || pathname.startsWith(p + '/'))
  ) return null

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
        background: 'rgba(7,7,16,0.88)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        zIndex: 50,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'stretch',
        maxWidth: '600px',
        margin: '0 auto',
        height: '62px',
      }}>
        {tabs.slice(0, 2).map(tab => {
          const active = isActive(tab.href)
          return (
            <motion.button
              key={tab.href}
              whileTap={{ scale: 0.88 }}
              onClick={() => router.push(tab.href)}
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px 4px',
                position: 'relative',
              }}
            >
              {active && (
                <motion.div
                  layoutId="nav-pill"
                  style={{
                    position: 'absolute',
                    inset: '6px 14%',
                    background: 'rgba(79,142,247,0.10)',
                    borderRadius: '10px',
                    border: '1px solid rgba(79,142,247,0.16)',
                  }}
                  transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                />
              )}
              <tab.icon
                size={20}
                color={active ? '#4F8EF7' : 'rgba(255,255,255,0.22)'}
                strokeWidth={active ? 2.3 : 1.7}
              />
              <span style={{
                fontSize: '10px',
                fontWeight: active ? 700 : 500,
                color: active ? '#4F8EF7' : 'rgba(255,255,255,0.28)',
                letterSpacing: '0.2px',
                position: 'relative',
              }}>
                {tab.label}
              </span>
            </motion.button>
          )
        })}

        {/* SOS — center */}
        <motion.a
          href="/emergency"
          whileTap={{ scale: 0.90 }}
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
            gap: '4px',
            padding: '0 20px',
            cursor: 'pointer',
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            background: 'linear-gradient(140deg, #FF3737 0%, #CC1A1A 100%)',
            boxShadow: '0 0 0 3px rgba(255,55,55,0.16), 0 6px 20px rgba(255,55,55,0.50)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '-10px',
          }}>
            <Phone size={20} color="white" strokeWidth={2.3} />
          </div>
          <span style={{
            fontSize: '9px',
            fontWeight: 900,
            color: '#FF3737',
            letterSpacing: '1.8px',
            fontFamily: 'var(--font-mono, monospace)',
            marginTop: '-1px',
          }}>SOS</span>
        </motion.a>

        {tabs.slice(2).map(tab => {
          const active = isActive(tab.href)
          return (
            <motion.button
              key={tab.href}
              whileTap={{ scale: 0.88 }}
              onClick={() => router.push(tab.href)}
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px 4px',
                position: 'relative',
              }}
            >
              {active && (
                <motion.div
                  layoutId="nav-pill"
                  style={{
                    position: 'absolute',
                    inset: '6px 14%',
                    background: 'rgba(79,142,247,0.10)',
                    borderRadius: '10px',
                    border: '1px solid rgba(79,142,247,0.16)',
                  }}
                  transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                />
              )}
              <tab.icon
                size={20}
                color={active ? '#4F8EF7' : 'rgba(255,255,255,0.22)'}
                strokeWidth={active ? 2.3 : 1.7}
              />
              <span style={{
                fontSize: '10px',
                fontWeight: active ? 700 : 500,
                color: active ? '#4F8EF7' : 'rgba(255,255,255,0.28)',
                letterSpacing: '0.2px',
                position: 'relative',
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
