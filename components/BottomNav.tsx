'use client'
import { usePathname, useRouter } from 'next/navigation'
import { Home, MessageCircle, LayoutList, Activity, Phone } from 'lucide-react'
import { motion } from 'framer-motion'
import { octagon } from '@/lib/shape'

// ─── Design tokens ────────────────────────────────────────────────────────────
const ACCENT  = '#42623C'
const RED     = '#A33417'
const T3      = '#5C5A52'
const BORDER  = '#98C890'

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

  const TabButton = ({ tab }: { tab: typeof tabs[0] }) => {
    const active = isActive(tab.href)
    return (
      <motion.button
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
            layoutId="nav-indicator"
            style={{
              position: 'absolute',
              inset: '4px 10%',
              background: 'rgba(86,128,78,0.07)',
              borderRadius: '14px',
            }}
            transition={{ type: 'spring', stiffness: 500, damping: 36 }}
          />
        )}
        <tab.icon
          size={20}
          color={active ? ACCENT : T3}
          strokeWidth={active ? 2.2 : 1.7}
        />
        <span style={{
          fontSize: '10px',
          fontWeight: active ? 700 : 500,
          color: active ? ACCENT : T3,
          letterSpacing: '0.1px',
          position: 'relative',
        }}>
          {tab.label}
        </span>
      </motion.button>
    )
  }

  return (
    <nav
      aria-label="Main navigation"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(255,255,255,0.94)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: `1px solid ${BORDER}`,
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

        <TabButton tab={tabs[0]} />
        <TabButton tab={tabs[1]} />

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
            gap: '3px',
            padding: '0 22px',
            cursor: 'pointer',
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          <div style={{
            width: '48px',
            height: '48px',
            // Stop-sign octagon. The one control on this bar that is not a plain
            // icon, findable by outline when somebody cannot focus on a label.
            clipPath: octagon(),
            background: RED,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '-10px',
          }}>
            <Phone size={19} color="white" strokeWidth={2.2} />
          </div>
          <span style={{
            fontSize: '9px',
            fontWeight: 900,
            color: RED,
            letterSpacing: '1.5px',
            fontFamily: 'var(--font-mono, monospace)',
            marginTop: '-1px',
            position: 'relative',
          }}>SOS</span>
        </motion.a>

        <TabButton tab={tabs[2]} />
        <TabButton tab={tabs[3]} />

      </div>
    </nav>
  )
}
