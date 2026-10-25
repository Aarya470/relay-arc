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

// Hoisted to module scope, deliberately. This used to be defined inside
// BottomNav()'s render body, which meant it got a brand new function identity
// on every re-render of any page that embeds <BottomNav /> — and every one of
// those pages re-renders on things as small as a keystroke in a text input
// (the AI check-in page, for one). React treats a component whose identity
// changed as a different component: it force-remounts it, which retriggers
// framer-motion's shared layoutId animation on the active-tab indicator and
// makes it visibly flicker/slide on every keystroke. A stable, module-level
// component keeps the same identity across renders, so the indicator only
// animates when the active tab actually changes.
function TabButton({ tab, active, onClick }: {
  tab: typeof tabs[0]
  active: boolean
  onClick: () => void
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.88 }}
      onClick={onClick}
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

        <TabButton tab={tabs[0]} active={isActive(tabs[0].href)} onClick={() => router.push(tabs[0].href)} />
        <TabButton tab={tabs[1]} active={isActive(tabs[1].href)} onClick={() => router.push(tabs[1].href)} />

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
            borderRadius: '50%',
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
            fontFamily: 'inherit',
            marginTop: '-1px',
            position: 'relative',
          }}>SOS</span>
        </motion.a>

        <TabButton tab={tabs[2]} active={isActive(tabs[2].href)} onClick={() => router.push(tabs[2].href)} />
        <TabButton tab={tabs[3]} active={isActive(tabs[3].href)} onClick={() => router.push(tabs[3].href)} />

      </div>
    </nav>
  )
}
