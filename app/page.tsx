'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { ArrowRight, Heart, Navigation, Pill, TrendingUp, Phone, Shield, Activity, ChevronDown, Menu, X } from 'lucide-react'

const spring = { type: 'spring', stiffness: 340, damping: 26 } as const

// ─── Data ──────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Heart,
    color: '#E8322A',
    bg: 'rgba(232,50,42,0.08)',
    border: 'rgba(232,50,42,0.15)',
    title: 'Emergency Detection',
    body: 'AI-powered algorithms instantly recognize critical medical situations through natural conversation — no button-mashing required.',
  },
  {
    icon: Activity,
    color: '#5C8B74',
    bg: 'rgba(92,139,116,0.08)',
    border: 'rgba(92,139,116,0.18)',
    title: 'Health & Medication Tracking',
    body: 'Tracks your daily health, logs medication intake, and alerts you when something looks off — before it becomes an emergency.',
  },
  {
    icon: Navigation,
    color: '#2563EB',
    bg: 'rgba(37,99,235,0.08)',
    border: 'rgba(37,99,235,0.15)',
    title: 'Real-Time Navigation',
    body: 'GPS routing to the nearest right hospital for your specific condition. No car? Relay alerts others on the app to get you there.',
  },
  {
    icon: TrendingUp,
    color: '#C46B30',
    bg: 'rgba(196,107,48,0.08)',
    border: 'rgba(196,107,48,0.15)',
    title: 'Surgery Recovery Timeline',
    body: 'Week-by-week guidance for post-surgery patients — what to expect, what is normal, what to watch for, and what to do at every stage.',
  },
]

const STEPS = [
  {
    tag: 'RE · ACT',
    color: '#5C8B74',
    title: 'Detect the emergency',
    body: 'Tell Relay what\'s happening. AI identifies the type of emergency and triggers routing instantly.',
  },
  {
    tag: 'RE · ROUTE',
    color: '#1A2820',
    title: 'Find the right hospital',
    body: 'Not just the nearest — the right one for your condition, with your full medical profile sent ahead to the ER.',
  },
  {
    tag: 'RE · COVER',
    color: '#C46B30',
    title: 'Navigate and recover',
    body: 'Turn-by-turn routing for family, live nurse dashboard, daily check-ins, and a recovery timeline all the way home.',
  },
]

// ─── Components ─────────────────────────────────────────────────────────────

function NavBar({ onSignIn, onGetStarted }: { onSignIn: () => void; onGetStarted: () => void }) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMenuOpen(false)
  }

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? 'rgba(242,239,233,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(26,40,32,0.07)' : '1px solid transparent',
        transition: 'background 0.25s ease, border-color 0.25s ease, backdrop-filter 0.25s ease',
        padding: '0 24px',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '9px', background: '#1A2820', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L9.5 5.5H12.5L10 9L11 13L7 10.5L3 13L4 9L1.5 5.5H4.5L7 1Z" fill="#F2EFE9"/>
              </svg>
            </div>
            <span style={{ color: '#1A2820', fontWeight: 700, fontSize: '16px', letterSpacing: '-0.3px' }}>Relay Arc</span>
          </div>

          {/* Desktop nav links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }} className="desktop-nav">
            {[['features', 'Features'], ['how', 'How it works'], ['mission', 'Mission']].map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)}
                style={{ background: 'none', border: 'none', color: 'rgba(26,40,32,0.55)', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', padding: '4px 0' }}>
                {label}
              </button>
            ))}
          </div>

          {/* CTA buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <motion.button whileTap={{ scale: 0.97 }} onClick={onSignIn}
              style={{ background: 'transparent', border: '1px solid rgba(26,40,32,0.15)', color: 'rgba(26,40,32,0.65)', fontSize: '13px', fontWeight: 600, padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' }}>
              Sign in
            </motion.button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={onGetStarted}
              style={{ background: '#1A2820', color: 'white', fontSize: '13px', fontWeight: 600, padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', border: 'none', fontFamily: 'inherit' }}>
              Get started
            </motion.button>
            {/* Mobile menu toggle */}
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setMenuOpen(o => !o)}
              style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', marginLeft: '4px' }} className="mobile-menu-btn">
              {menuOpen ? <X size={20} color="#1A2820"/> : <Menu size={20} color="#1A2820"/>}
            </motion.button>
          </div>
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{ position: 'fixed', top: '60px', left: 0, right: 0, zIndex: 99, background: 'rgba(242,239,233,0.97)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(26,40,32,0.08)', padding: '12px 24px 20px' }}>
            {[['features', 'Features'], ['how', 'How it works'], ['mission', 'Mission']].map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)}
                style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: '#1A2820', fontSize: '16px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', padding: '12px 0', borderBottom: '1px solid rgba(26,40,32,0.06)' }}>
                {label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 640px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function Home() {
  const [authChecked, setAuthChecked] = useState(false)
  const router = useRouter()
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0])
  const heroY = useTransform(scrollYProgress, [0, 0.6], [0, -40])

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data } = await supabase.from('profiles').select('id').eq('id', session.user.id).single()
        router.replace(data ? '/dashboard' : '/onboarding')
        return
      }
      setAuthChecked(true)
    }
    check()
  }, [router])

  // Show nothing while checking auth (prevents flash for logged-in users)
  if (!authChecked) return (
    <div style={{ minHeight: '100dvh', background: '#F2EFE9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'linear-gradient(135deg, #5C8B74, #3D6B58)' }}
      />
    </div>
  )

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div style={{ background: '#F2EFE9', overflowX: 'hidden' }}>
      <NavBar onSignIn={() => router.push('/login')} onGetStarted={() => router.push('/login?signup=1')}/>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section ref={heroRef} style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '100px 24px 60px', position: 'relative', overflow: 'hidden', maxWidth: '100%' }}>

        {/* Subtle background texture */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(92,139,116,0.06) 1px, transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none', maskImage: 'radial-gradient(ellipse 80% 60% at 50% 50%, black 40%, transparent 100%)' }}/>

        <motion.div style={{ opacity: heroOpacity, y: heroY }}>
          <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>

            {/* Eyebrow */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, ...spring }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(92,139,116,0.1)', border: '1px solid rgba(92,139,116,0.22)', borderRadius: '99px', padding: '5px 14px', marginBottom: '28px' }}>
              <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#5C8B74' }}/>
              <span style={{ color: '#5C8B74', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase' }}>Cardiac Emergency Platform</span>
            </motion.div>

            {/* Headline */}
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, ...spring }}
              style={{ color: '#1A2820', fontSize: 'clamp(42px, 10vw, 72px)', fontWeight: 900, lineHeight: 1.02, letterSpacing: '-3px', marginBottom: '22px' }}>
              When every<br/>
              <span style={{ color: '#5C8B74' }}>minute</span> is<br/>
              the margin.
            </motion.h1>

            {/* Sub */}
            <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, ...spring }}
              style={{ color: 'rgba(26,40,32,0.52)', fontSize: '17px', lineHeight: 1.7, marginBottom: '36px', maxWidth: '440px' }}>
              Relay detects an emergency, finds the right hospital for your specific condition, sends your full medical profile to the ER before you arrive, and navigates your family there in real time.
            </motion.p>

            {/* RE strip */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26, ...spring }}
              style={{ background: '#FFFFFF', border: '1px solid rgba(26,40,32,0.07)', borderRadius: '18px', padding: '14px 20px', marginBottom: '32px', boxShadow: '0 2px 14px rgba(26,40,32,0.06)', display: 'flex', maxWidth: '400px' }}>
              {[
                { pre: 'RE·', word: 'ACT', color: '#5C8B74', sub: 'In the moment' },
                { pre: 'RE·', word: 'ROUTE', color: '#1A2820', sub: 'Right hospital' },
                { pre: 'RE·', word: 'COVER', color: '#C46B30', sub: 'All the way home' },
              ].map((item, i) => (
                <div key={i} style={{ flex: 1, textAlign: 'center', borderRight: i < 2 ? '1px solid rgba(26,40,32,0.07)' : 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2px 0' }}>
                  <p style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px', margin: 0 }}>
                    <span style={{ color: 'rgba(26,40,32,0.2)' }}>{item.pre}</span>
                    <span style={{ color: item.color }}>{item.word}</span>
                  </p>
                  <p style={{ color: 'rgba(26,40,32,0.28)', fontSize: '9px', marginTop: '3px', letterSpacing: '0.3px', margin: '3px 0 0' }}>{item.sub}</p>
                </div>
              ))}
            </motion.div>

            {/* CTAs */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34, ...spring }}
              style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => router.push('/login?signup=1')}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#1A2820', color: 'white', fontWeight: 700, fontSize: '15px', padding: '16px 28px', borderRadius: '14px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(26,40,32,0.2)' }}>
                Get started free <ArrowRight size={15}/>
              </motion.button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => scrollTo('how')}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FFFFFF', color: 'rgba(26,40,32,0.7)', fontWeight: 600, fontSize: '15px', padding: '16px 24px', borderRadius: '14px', border: '1px solid rgba(26,40,32,0.12)', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(26,40,32,0.06)' }}>
                See how it works
              </motion.button>
            </motion.div>

            {/* App mockup */}
            <motion.div initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.5, ...spring }}
              style={{ marginTop: '52px', display: 'flex', justifyContent: 'center' }}>
              <img
                src="https://cdn.cmsfly.com/69d2fe4b16dd99007540a908/images/relay-iphone-square-7aJT_.svg"
                alt="Relay Arc app on iPhone"
                style={{ maxWidth: '280px', width: '100%', filter: 'drop-shadow(0 24px 48px rgba(26,40,32,0.14))' }}
              />
            </motion.div>

          </div>
        </motion.div>

        {/* Scroll cue */}
        <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          onClick={() => scrollTo('mission')}
          style={{ position: 'absolute', bottom: '28px', left: '50%', transform: 'translateX(-50%)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: 'rgba(26,40,32,0.25)', fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>scroll</span>
          <ChevronDown size={14} color="rgba(26,40,32,0.25)"/>
        </motion.div>
      </section>

      {/* ── MISSION / RELAY NOT REVIVE ───────────────────────────────── */}
      <section id="mission" style={{ padding: '100px 24px', background: 'rgba(92,139,116,0.06)', borderTop: '1px solid rgba(92,139,116,0.12)', borderBottom: '1px solid rgba(92,139,116,0.12)' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={spring}>
            <span style={{ display: 'inline-block', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', fontWeight: 700, color: '#5C8B74', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '20px', background: 'rgba(92,139,116,0.1)', border: '1px solid rgba(92,139,116,0.2)', padding: '4px 12px', borderRadius: '99px' }}>
              Mission
            </span>
            <h2 style={{ color: '#1A2820', fontSize: 'clamp(36px, 7vw, 54px)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1.06, marginBottom: '28px' }}>
              RELAY, not REVIVE.
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {[
                'Not everyone lives in a place where help arrives in eight minutes. In much of the world, an emergency begins with a family doing math instead of dialing for help. Can we afford the ambulance. How far is the hospital. Will we make it in time.',
                'Relay exists because no one should have to think before getting help. Help should already be on the way.',
                'In India, more than 65 percent of people live in rural areas where the nearest hospital can be over 30 kilometers away — a distance that becomes dangerous without reliable roads or emergency services. In cities like Mumbai, Delhi, and Kolkata, the problem flips entirely. Ambulances can sit in traffic for 45 minutes while trying to move only a few kilometers.',
                'These are not rare situations. This is daily life for hundreds of millions of people. Relay was built for them first — not as charity, but as the basic emergency infrastructure that should have existed already. Whether you are hours from a cardiac unit or stuck in gridlock, the problem is the same. The system was not designed for you. Relay is.',
              ].map((para, i) => (
                <motion.p key={i}
                  initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }}
                  transition={{ ...spring, delay: i * 0.07 }}
                  style={{ color: i === 1 ? '#3D6B58' : 'rgba(26,40,32,0.58)', fontSize: i === 1 ? '19px' : '16px', lineHeight: 1.75, fontWeight: i === 1 ? 700 : 400 }}>
                  {para}
                </motion.p>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={spring}
            style={{ textAlign: 'center', marginBottom: '56px' }}>
            <span style={{ display: 'inline-block', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', fontWeight: 700, color: '#5C8B74', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px', background: 'rgba(92,139,116,0.1)', border: '1px solid rgba(92,139,116,0.2)', padding: '4px 12px', borderRadius: '99px' }}>
              Features
            </span>
            <h2 style={{ color: '#1A2820', fontSize: 'clamp(30px, 5vw, 44px)', fontWeight: 900, letterSpacing: '-1.5px', marginBottom: '12px' }}>
              Everything your heart needs.
            </h2>
            <p style={{ color: 'rgba(26,40,32,0.45)', fontSize: '16px', maxWidth: '480px', margin: '0 auto', lineHeight: 1.65 }}>
              Daily AI check-ins, medication tracking, recovery timeline, and live nurse dashboard — between emergencies and during them.
            </p>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            {FEATURES.map((f, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }}
                transition={{ ...spring, delay: i * 0.07 }}
                style={{ background: '#FFFFFF', border: '1px solid rgba(26,40,32,0.07)', borderRadius: '20px', padding: '24px', boxShadow: '0 2px 12px rgba(26,40,32,0.05)' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '13px', background: f.bg, border: `1px solid ${f.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}>
                  <f.icon size={20} color={f.color}/>
                </div>
                <h3 style={{ color: '#1A2820', fontSize: '17px', fontWeight: 800, letterSpacing: '-0.4px', marginBottom: '10px' }}>{f.title}</h3>
                <p style={{ color: 'rgba(26,40,32,0.5)', fontSize: '14px', lineHeight: 1.7 }}>{f.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section id="how" style={{ padding: '100px 24px', background: 'rgba(26,40,32,0.02)', borderTop: '1px solid rgba(26,40,32,0.06)', borderBottom: '1px solid rgba(26,40,32,0.06)' }}>
        <div style={{ maxWidth: '780px', margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={spring}
            style={{ textAlign: 'center', marginBottom: '60px' }}>
            <span style={{ display: 'inline-block', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', fontWeight: 700, color: '#5C8B74', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px', background: 'rgba(92,139,116,0.1)', border: '1px solid rgba(92,139,116,0.2)', padding: '4px 12px', borderRadius: '99px' }}>
              How it works
            </span>
            <h2 style={{ color: '#1A2820', fontSize: 'clamp(30px, 5vw, 44px)', fontWeight: 900, letterSpacing: '-1.5px' }}>
              Three steps. No guessing.
            </h2>
          </motion.div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {STEPS.map((step, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-40px' }}
                transition={{ ...spring, delay: i * 0.1 }}
                style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', padding: '28px 0', borderBottom: i < STEPS.length - 1 ? '1px solid rgba(26,40,32,0.07)' : 'none' }}>
                {/* Number */}
                <div style={{ width: '44px', height: '44px', borderRadius: '13px', background: '#FFFFFF', border: '1.5px solid rgba(26,40,32,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(26,40,32,0.06)' }}>
                  <span style={{ color: '#1A2820', fontWeight: 900, fontSize: '18px', fontFamily: 'var(--font-mono, monospace)' }}>{i + 1}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ display: 'inline-block', fontFamily: 'var(--font-mono, monospace)', fontSize: '10px', fontWeight: 700, color: step.color, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>{step.tag}</span>
                  <h3 style={{ color: '#1A2820', fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '8px' }}>{step.title}</h3>
                  <p style={{ color: 'rgba(26,40,32,0.5)', fontSize: '15px', lineHeight: 1.7 }}>{step.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMING NEXT ──────────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: '780px', margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={spring}>
            <p style={{ color: 'rgba(26,40,32,0.35)', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '14px' }}>Roadmap</p>
            <h3 style={{ color: '#1A2820', fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '20px' }}>Coming next</h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['Community transport for patients without a vehicle', 'Wearable integration', 'Voice-first mode', 'Direct connection to Epic & Cerner hospital systems'].map((item, i) => (
                <motion.span key={i}
                  initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                  transition={{ ...spring, delay: i * 0.05 }}
                  style={{ background: '#FFFFFF', border: '1px solid rgba(26,40,32,0.09)', borderRadius: '99px', padding: '8px 14px', color: 'rgba(26,40,32,0.6)', fontSize: '13px', fontWeight: 500, boxShadow: '0 1px 4px rgba(26,40,32,0.04)' }}>
                  {item}
                </motion.span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────── */}
      <section style={{ padding: '100px 24px', background: 'linear-gradient(135deg, rgba(92,139,116,0.08) 0%, rgba(92,139,116,0.03) 100%)', borderTop: '1px solid rgba(92,139,116,0.12)' }}>
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={spring}
          style={{ maxWidth: '520px', margin: '0 auto', textAlign: 'center' }}>
          {/* Shield icon */}
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#1A2820', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <Shield size={24} color="white"/>
          </div>
          <h2 style={{ color: '#1A2820', fontSize: 'clamp(28px, 6vw, 42px)', fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: '16px' }}>
            Your profile could save your life.
          </h2>
          <p style={{ color: 'rgba(26,40,32,0.48)', fontSize: '16px', lineHeight: 1.7, marginBottom: '36px' }}>
            Set up takes two minutes. Your medications, conditions, emergency contacts, and care team are all in one place — ready when you need them.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '360px', margin: '0 auto' }}>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => router.push('/login?signup=1')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#1A2820', color: 'white', fontWeight: 700, fontSize: '16px', padding: '18px', borderRadius: '14px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(26,40,32,0.2)' }}>
              Create your free profile <ArrowRight size={16}/>
            </motion.button>
            <button onClick={() => router.push('/login')}
              style={{ background: 'none', border: 'none', color: 'rgba(26,40,32,0.4)', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit', padding: '8px' }}>
              Already have an account? <span style={{ color: '#5C8B74', fontWeight: 700 }}>Sign in</span>
            </button>
          </div>
          {/* Care team link */}
          <button onClick={() => router.push('/care-team/login')}
            style={{ display: 'block', margin: '24px auto 0', background: 'none', border: 'none', color: 'rgba(26,40,32,0.22)', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer' }}>
            Care team portal
          </button>
        </motion.div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer style={{ background: '#1A2820', padding: '56px 24px 40px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '40px', marginBottom: '48px' }}>

            {/* Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '14px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '9px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1L9.5 5.5H12.5L10 9L11 13L7 10.5L3 13L4 9L1.5 5.5H4.5L7 1Z" fill="#F2EFE9"/>
                  </svg>
                </div>
                <span style={{ color: '#F2EFE9', fontWeight: 800, fontSize: '16px', letterSpacing: '-0.4px' }}>Relay Arc</span>
              </div>
              <p style={{ color: 'rgba(242,239,233,0.38)', fontSize: '13px', lineHeight: 1.7, maxWidth: '240px' }}>
                Revolutionizing emergency healthcare routing with intelligent technology that transforms critical response times.
              </p>
            </div>

            {/* Quick links */}
            <div>
              <p style={{ color: 'rgba(242,239,233,0.5)', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '16px' }}>Quick links</p>
              {[['#features', 'Features'], ['#how', 'How It Works'], ['#mission', 'Mission'], ['/login', 'Sign In'], ['/login?signup=1', 'Get Started']].map(([href, label]) => (
                <button key={label}
                  onClick={() => href.startsWith('#') ? document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' }) : router.push(href)}
                  style={{ display: 'block', background: 'none', border: 'none', color: 'rgba(242,239,233,0.45)', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit', padding: '4px 0', textAlign: 'left' }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Contact */}
            <div>
              <p style={{ color: 'rgba(242,239,233,0.5)', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '16px' }}>Contact</p>
              <a href="mailto:aaryan10cityzen@gmail.com"
                style={{ color: 'rgba(242,239,233,0.45)', fontSize: '14px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                aaryan10cityzen@gmail.com
              </a>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(242,239,233,0.07)', paddingTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <p style={{ color: 'rgba(242,239,233,0.2)', fontSize: '12px', fontFamily: 'var(--font-mono, monospace)' }}>
              RELAY © 2026 All Rights Reserved Worldwide
            </p>
            <button onClick={() => router.push('/care-team/login')}
              style={{ background: 'none', border: 'none', color: 'rgba(242,239,233,0.18)', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', letterSpacing: '1px', cursor: 'pointer' }}>
              Care team
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
