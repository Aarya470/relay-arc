'use client'
// Bottom bar for the signed in app. Four text tabs, a slanted SOS button in the
// middle, and one marker that slides to the open tab.
import { usePathname, useRouter } from 'next/navigation'

const SOS = '#A33417'
const LEAF = '#B3DDAC'

// Slot order across the bar. SOS sits in slot 2.
const tabs = [
  { href: '/dashboard', label: 'Home', slot: 0 },
  { href: '/checkin', label: 'Check in', slot: 1 },
  { href: '/medications', label: 'Meds', slot: 3 },
  { href: '/symptoms', label: 'Symptoms', slot: 4 },
]

const HIDE_ON = ['/login', '/onboarding', '/care-team', '/nurse', '/driver', '/transport']

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
  const active = tabs.find((t) => isActive(t.href))

  const tab = (t: (typeof tabs)[number]) => {
    const on = active?.href === t.href
    return (
      <button
        key={t.href}
        onClick={() => router.push(t.href)}
        aria-current={on ? 'page' : undefined}
        className="bn-tab"
        style={{ color: on ? '#FFFFFF' : 'rgba(255,255,255,0.72)', fontWeight: on ? 700 : 500 }}
      >
        {t.label}
      </button>
    )
  }

  return (
    <nav
      aria-label="Main navigation"
      className="glass-dark"
      style={{
        position: 'fixed',
        bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        left: '12px',
        right: '12px',
        maxWidth: '560px',
        margin: '0 auto',
        zIndex: 50,
        borderRadius: '26px',
        overflow: 'hidden',
      }}
    >
      <style>{`
        .bn-row { position: relative; display: grid; grid-template-columns: repeat(5, 1fr); height: 62px; padding: 0 6px; }
        .bn-tab { background: none; border: 0; font: inherit; font-size: 13px; cursor: pointer; padding: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: transform 140ms cubic-bezier(0.22, 1, 0.36, 1); }
        .bn-tab:active { transform: scale(0.95); }
        .bn-tab:focus-visible, .bn-sos:focus-visible { outline: 3px solid ${LEAF}; outline-offset: -4px; }
        .bn-mark { position: absolute; bottom: 7px; left: 6px; width: calc((100% - 12px) / 5); height: 4px; transition: transform 260ms cubic-bezier(0.22, 1, 0.36, 1); }
        .bn-mark > span { display: block; width: 22px; margin: 0 auto; height: 100%; background: ${LEAF}; border-radius: 4px; }
        .bn-sos { align-self: center; justify-self: center; display: flex; align-items: center; justify-content: center; height: 46px; width: calc(100% - 4px); border-radius: 16px; background: ${SOS}; box-shadow: 0 6px 18px rgba(163,52,23,0.45); color: #fff; font-size: 16px; font-weight: 800; text-decoration: none; transition: transform 140ms cubic-bezier(0.22, 1, 0.36, 1); }
        .bn-sos:active { transform: scale(0.95); }
        @media (prefers-reduced-motion: reduce) { .bn-mark, .bn-tab, .bn-sos { transition: none; } }
      `}</style>
      <div className="bn-row">
        {active && (
          <div className="bn-mark" aria-hidden style={{ transform: `translateX(${active.slot * 100}%)` }}>
            <span />
          </div>
        )}
        {tab(tabs[0])}
        {tab(tabs[1])}
        <a
          href="/emergency"
          aria-label="Emergency SOS"
          className="bn-sos sh-slant"
          onClick={() => {
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
              navigator.vibrate([80, 40, 80])
            }
          }}
        >
          SOS
        </a>
        {tab(tabs[2])}
        {tab(tabs[3])}
      </div>
    </nav>
  )
}
