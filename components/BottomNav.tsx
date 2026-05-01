'use client'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Heart, Pill, Calendar, FileText } from 'lucide-react'
import { motion } from 'framer-motion'

const tabs = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/checkin', icon: Heart, label: 'Check-in' },
  { href: '/medications', icon: Pill, label: 'Meds' },
  { href: '/timeline', icon: Calendar, label: 'Timeline' },
  { href: '/appointment', icon: FileText, label: 'Summary' },
]

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  const hideOn = ['/login', '/onboarding', '/emergency']
  if (hideOn.some(p => pathname.startsWith(p))) return null

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-[#09090C]/80 backdrop-blur-xl border-t border-white/8 px-2 py-2 z-50">
      <div className="flex items-center justify-around">
        {tabs.map(tab => {
          const active = pathname === tab.href
          return (
            <button
              key={tab.href}
              onClick={() => router.push(tab.href)}
              className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl relative"
            >
              {active && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 bg-white/8 rounded-xl"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
              <tab.icon
                size={20}
                className={active ? 'text-[#fcb546]' : 'text-white/40'}
              />
              <span className={`text-[10px] font-medium ${active ? 'text-[#fcb546]' : 'text-white/40'}`}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
