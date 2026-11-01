'use client'
// Bottom bar for the signed-in app: four text tabs and a red SOS button.
import { usePathname, useRouter } from 'next/navigation'

const INK = '#141413'
const MUTED = '#5C5A52'
const RED = '#A33417'
const ACCENT = '#42623C'
const LINE = 'rgba(20,20,19,0.15)'

const tabs = [
  { href: '/dashboard', label: 'Home' },
  { href: '/checkin', label: 'Check-in' },
  { href: '/medications', label: 'Meds' },
  { href: '/symptoms', label: 'Symptoms' },
]

const HIDE_ON = ['/login', '/onboarding', '/care-team', '/nurse', '/driver', '/transport']

function Tab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      style={{
        flex: 1,
        minWidth: 0,
        height: '100%',
        background: 'none',
        border: 'none',
        borderTop: `3px solid ${active ? ACCENT : 'transparent'}`,
        color: active ? INK : MUTED,
        fontSize: '13px',
        fontWeight: active ? 700 : 500,
        fontFamily: 'inherit',
        cursor: 'pointer',
        padding: '0 2px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {label}
    </button>
  )
}

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  if (
    pathname === '/emergency' ||
    pathname.startsWith('/emergency/') ||
    HIDE_ON.some((p) => pathname === p || pathname.startsWith(p + '/'))
  )
    return null

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
        background: '#FFFFFF',
        borderTop: `1px solid ${LINE}`,
        zIndex: 50,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          maxWidth: '600px',
          margin: '0 auto',
          height: '56px',
        }}
      >
        <Tab
          label={tabs[0].label}
          active={isActive(tabs[0].href)}
          onClick={() => router.push(tabs[0].href)}
        />
        <Tab
          label={tabs[1].label}
          active={isActive(tabs[1].href)}
          onClick={() => router.push(tabs[1].href)}
        />

        <a
          href="/emergency"
          aria-label="Emergency SOS"
          onClick={() => {
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
              navigator.vibrate([80, 40, 80])
            }
          }}
          style={{
            alignSelf: 'center',
            flexShrink: 0,
            margin: '0 6px',
            padding: '9px 16px',
            background: RED,
            color: '#FFFFFF',
            borderRadius: '4px',
            fontSize: '15px',
            fontWeight: 800,
            textDecoration: 'none',
          }}
        >
          SOS
        </a>

        <Tab
          label={tabs[2].label}
          active={isActive(tabs[2].href)}
          onClick={() => router.push(tabs[2].href)}
        />
        <Tab
          label={tabs[3].label}
          active={isActive(tabs[3].href)}
          onClick={() => router.push(tabs[3].href)}
        />
      </div>
    </nav>
  )
}
