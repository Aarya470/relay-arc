'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { ArrowRight, Heart, Navigation, Pill, TrendingUp, Phone, Shield, Activity, ChevronDown, Menu, X, Clock, Users, Zap, CheckCircle, MapPin, Bell, Brain, Eye, FileText, RotateCcw } from 'lucide-react'

const spring = { type: 'spring', stiffness: 340, damping: 26 } as const

const STATS = [
  { value: '3.8M', label: 'cardiac deaths in India annually', sub: 'Most preventable with faster response' },
  { value: '45 min', label: 'average Mumbai ambulance wait', sub: 'In peak traffic conditions' },
  { value: '10 min', label: 'window to prevent brain damage', sub: 'After a cardiac arrest event' },
  { value: '65%', label: 'of rural Indians live 30km+ from a hospital', sub: 'Without reliable emergency infrastructure' },
]

const FEATURES = [
  {
    icon: Heart,
    color: '#E8322A',
    bg: 'rgba(232,50,42,0.08)',
    border: 'rgba(232,50,42,0.15)',
    title: 'AI Emergency Detection',
    body: 'Tell Relay what\'s happening in plain language. The AI identifies the emergency type instantly and triggers routing — no menus, no buttons.',
  },
  {
    icon: Activity,
    color: '#5C8B74',
    bg: 'rgba(92,139,116,0.08)',
    border: 'rgba(92,139,116,0.18)',
    title: 'Daily Health Check-ins',
    body: 'A quick AI-powered conversation each morning tracks your symptoms, flags anything unusual, and builds a clinical record your care team can see.',
  },
  {
    icon: Pill,
    color: '#7C3AED',
    bg: 'rgba(124,58,237,0.08)',
    border: 'rgba(124,58,237,0.15)',
    title: 'Medication Tracking',
    body: 'Log every medication, track doses, and get reminded. Your full medication list is automatically sent to the ER when an emergency happens.',
  },
  {
    icon: Navigation,
    color: '#2563EB',
    bg: 'rgba(37,99,235,0.08)',
    border: 'rgba(37,99,235,0.15)',
    title: 'Condition-Specific Routing',
    body: 'GPS routing to the right hospital for your specific condition — not just the nearest. No car? Relay alerts nearby volunteers to get you there.',
  },
  {
    icon: TrendingUp,
    color: '#C46B30',
    bg: 'rgba(196,107,48,0.08)',
    border: 'rgba(196,107,48,0.15)',
    title: 'Surgery Recovery Timeline',
    body: 'Week-by-week guidance post-surgery — what\'s normal, what to watch for, what to do. Personalized to your diagnosis and procedure.',
  },
  {
    icon: Users,
    color: '#0EA5E9',
    bg: 'rgba(14,165,233,0.08)',
    border: 'rgba(14,165,233,0.15)',
    title: 'Care Team Dashboard',
    body: 'Nurses and doctors get a live view of all their patients — check-in history, vitals, flagged symptoms, and the ability to schedule video calls.',
  },
]

const STEPS = [
  {
    tag: 'RE · ACT',
    color: '#5C8B74',
    title: 'Detect the emergency',
    body: 'Tell Relay what\'s happening. AI identifies the type of emergency and triggers routing instantly. Your medical profile is pulled automatically.',
  },
  {
    tag: 'RE · ROUTE',
    color: '#1A2820',
    title: 'Find the right hospital',
    body: 'Not just the nearest — the right one for your condition, with your full medical profile, medications, and allergies sent ahead to the ER.',
  },
  {
    tag: 'RE · COVER',
    color: '#C46B30',
    title: 'Navigate and recover',
    body: 'Turn-by-turn routing for family, live nurse dashboard, daily check-ins, vitals tracking, and a full recovery timeline all the way home.',
  },
]

const FOR_WHOM = [
  {
    icon: Heart,
    color: '#E8322A',
    bg: 'rgba(232,50,42,0.06)',
    border: 'rgba(232,50,42,0.14)',
    title: 'Cardiac patients',
    points: ['Daily AI check-ins to catch early warning signs', 'SOS that triggers routing in under 10 seconds', 'Full medication and condition profile sent to ER'],
  },
  {
    icon: TrendingUp,
    color: '#C46B30',
    bg: 'rgba(196,107,48,0.06)',
    border: 'rgba(196,107,48,0.14)',
    title: 'Post-surgery patients',
    points: ['Week-by-week personalized recovery timeline', 'Know exactly what is normal and what is not', 'Care team video calls from the app'],
  },
  {
    icon: Users,
    color: '#5C8B74',
    bg: 'rgba(92,139,116,0.06)',
    border: 'rgba(92,139,116,0.14)',
    title: 'Families & caregivers',
    points: ['Real-time hospital routing when emergency hits', 'Live status during the emergency', 'Full check-in history to share with doctors'],
  },
  {
    icon: Activity,
    color: '#2563EB',
    bg: 'rgba(37,99,235,0.06)',
    border: 'rgba(37,99,235,0.14)',
    title: 'Nurses & care teams',
    points: ['Patient monitoring dashboard across all patients', 'Flag system for abnormal check-ins', 'Secure appointment and video call scheduling'],
  },
]

const DIFFERENTIATORS = [
  { icon: Clock, label: 'Sub-10 second emergency activation', vs: 'vs. minutes finding a number to call' },
  { icon: MapPin, label: 'Condition-matched hospital routing', vs: 'vs. nearest hospital with no context' },
  { icon: Shield, label: 'Medical profile arrives before you do', vs: 'vs. repeating your history in the ER' },
  { icon: Bell, label: 'Daily monitoring catches issues early', vs: 'vs. waiting until it becomes an emergency' },
  { icon: Zap, label: 'Works with or without a vehicle', vs: 'vs. assuming you have transport' },
  { icon: CheckCircle, label: 'Post-discharge recovery guidance', vs: 'vs. leaving hospital with a pamphlet' },
]

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
        transition: 'background 0.25s ease, border-color 0.25s ease',
        padding: '0 24px',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '9px', background: '#1A2820', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L9.5 5.5H12.5L10 9L11 13L7 10.5L3 13L4 9L1.5 5.5H4.5L7 1Z" fill="#F2EFE9"/>
              </svg>
            </div>
            <span style={{ color: '#1A2820', fontWeight: 700, fontSize: '16px', letterSpacing: '-0.3px' }}>Relay Arc</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }} className="desktop-nav">
            {[['features', 'Features'], ['for-whom', 'Who it\'s for'], ['how', 'How it works'], ['mission', 'Mission']].map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)}
                style={{ background: 'none', border: 'none', color: 'rgba(26,40,32,0.55)', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', padding: '4px 0' }}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <motion.button whileTap={{ scale: 0.97 }} onClick={onSignIn}
              style={{ background: 'transparent', border: '1px solid rgba(26,40,32,0.15)', color: 'rgba(26,40,32,0.65)', fontSize: '13px', fontWeight: 600, padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' }}>
              Sign in
            </motion.button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={onGetStarted}
              style={{ background: '#1A2820', color: 'white', fontSize: '13px', fontWeight: 600, padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', border: 'none', fontFamily: 'inherit' }}>
              Get started free
            </motion.button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setMenuOpen(o => !o)}
              style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', marginLeft: '4px' }} className="mobile-menu-btn">
              {menuOpen ? <X size={20} color="#1A2820"/> : <Menu size={20} color="#1A2820"/>}
            </motion.button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{ position: 'fixed', top: '60px', left: 0, right: 0, zIndex: 99, background: 'rgba(242,239,233,0.97)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(26,40,32,0.08)', padding: '12px 24px 20px' }}>
            {[['features', 'Features'], ['for-whom', "Who it's for"], ['how', 'How it works'], ['mission', 'Mission']].map(([id, label]) => (
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
      <section ref={heroRef} style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '100px 24px 60px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(92,139,116,0.06) 1px, transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none', maskImage: 'radial-gradient(ellipse 80% 60% at 50% 50%, black 40%, transparent 100%)' }}/>

        <motion.div style={{ opacity: heroOpacity, y: heroY }}>
          <div style={{ maxWidth: '640px', margin: '0 auto', width: '100%' }}>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, ...spring }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(92,139,116,0.1)', border: '1px solid rgba(92,139,116,0.22)', borderRadius: '99px', padding: '5px 14px', marginBottom: '28px' }}>
              <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#5C8B74' }}/>
              <span style={{ color: '#5C8B74', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase' }}>Stage 2 — Now Live</span>
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, ...spring }}
              style={{ color: '#1A2820', fontSize: 'clamp(40px, 9vw, 68px)', fontWeight: 900, lineHeight: 1.02, letterSpacing: '-3px', marginBottom: '22px' }}>
              When every<br/>
              <span style={{ color: '#5C8B74' }}>minute</span> is<br/>
              the margin.
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, ...spring }}
              style={{ color: 'rgba(26,40,32,0.52)', fontSize: '17px', lineHeight: 1.7, marginBottom: '20px', maxWidth: '500px' }}>
              Relay is a cardiac emergency platform that detects the crisis, finds the right hospital for your specific condition, sends your full medical profile ahead, and navigates your family there — all in under 60 seconds.
            </motion.p>

            <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22, ...spring }}
              style={{ color: 'rgba(26,40,32,0.38)', fontSize: '14px', lineHeight: 1.6, marginBottom: '32px', maxWidth: '480px' }}>
              Between emergencies, Relay monitors your daily health, tracks your medications, guides your post-surgery recovery, and keeps your care team informed.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26, ...spring }}
              style={{ background: '#FFFFFF', border: '1px solid rgba(26,40,32,0.07)', borderRadius: '18px', padding: '14px 20px', marginBottom: '32px', boxShadow: '0 2px 14px rgba(26,40,32,0.06)', display: 'flex', maxWidth: '420px' }}>
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
                  <p style={{ color: 'rgba(26,40,32,0.28)', fontSize: '9px', letterSpacing: '0.3px', margin: '3px 0 0' }}>{item.sub}</p>
                </div>
              ))}
            </motion.div>

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
          </div>
        </motion.div>

        <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          onClick={() => scrollTo('stats')}
          style={{ position: 'absolute', bottom: '28px', left: '50%', transform: 'translateX(-50%)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: 'rgba(26,40,32,0.25)', fontSize: '10px', fontFamily: 'var(--font-mono, monospace)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>scroll</span>
          <ChevronDown size={14} color="rgba(26,40,32,0.25)"/>
        </motion.div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────── */}
      <section id="stats" style={{ padding: '80px 24px', background: '#1A2820' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <motion.p initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={spring}
            style={{ color: 'rgba(242,239,233,0.35)', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '40px', textAlign: 'center' }}>
            Why this exists
          </motion.p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2px' }}>
            {STATS.map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ ...spring, delay: i * 0.08 }}
                style={{ padding: '28px 24px', borderRight: i < STATS.length - 1 ? '1px solid rgba(242,239,233,0.06)' : 'none' }}>
                <p style={{ color: '#F2EFE9', fontSize: 'clamp(32px, 5vw, 44px)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1, marginBottom: '10px' }}>{stat.value}</p>
                <p style={{ color: 'rgba(242,239,233,0.55)', fontSize: '14px', lineHeight: 1.5, marginBottom: '6px' }}>{stat.label}</p>
                <p style={{ color: 'rgba(242,239,233,0.25)', fontSize: '12px', fontFamily: 'var(--font-mono, monospace)' }}>{stat.sub}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MISSION ──────────────────────────────────────────────────── */}
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
                'Not everyone lives in a place where help arrives in eight minutes. In much of the world, an emergency begins with a family doing math instead of getting help. Can we afford the ambulance. How far is the hospital. Will we make it in time.',
                'Relay exists because no one should have to think before getting help. Help should already be on the way.',
                'In India, more than 65 percent of people live in rural areas where the nearest hospital can be over 30 kilometers away — a distance that becomes dangerous without reliable roads or emergency services. In cities like Mumbai, Delhi, and Kolkata, the problem flips entirely. Ambulances can sit in traffic for 45 minutes while moving only a few kilometers.',
                'These are not rare situations. This is daily life for hundreds of millions of people. Relay was built for them first — not as charity, but as the emergency infrastructure that should have already existed. Whether you are hours from a cardiac unit or stuck in gridlock, the problem is the same. The system was not designed for you. Relay is.',
              ].map((para, i) => (
                <motion.p key={i}
                  initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }}
                  transition={{ ...spring, delay: i * 0.07 }}
                  style={{ color: i === 1 ? '#3D6B58' : 'rgba(26,40,32,0.58)', fontSize: i === 1 ? '20px' : '16px', lineHeight: 1.75, fontWeight: i === 1 ? 700 : 400 }}>
                  {para}
                </motion.p>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── WHO IT'S FOR ─────────────────────────────────────────────── */}
      <section id="for-whom" style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={spring}
            style={{ textAlign: 'center', marginBottom: '56px' }}>
            <span style={{ display: 'inline-block', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', fontWeight: 700, color: '#5C8B74', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px', background: 'rgba(92,139,116,0.1)', border: '1px solid rgba(92,139,116,0.2)', padding: '4px 12px', borderRadius: '99px' }}>
              Who it is for
            </span>
            <h2 style={{ color: '#1A2820', fontSize: 'clamp(30px, 5vw, 44px)', fontWeight: 900, letterSpacing: '-1.5px', marginBottom: '12px' }}>
              Built for everyone in the room.
            </h2>
            <p style={{ color: 'rgba(26,40,32,0.45)', fontSize: '16px', maxWidth: '480px', margin: '0 auto', lineHeight: 1.65 }}>
              A cardiac emergency affects more than the patient. Relay supports every person who is part of the care story.
            </p>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            {FOR_WHOM.map((card, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }}
                transition={{ ...spring, delay: i * 0.07 }}
                style={{ background: '#FFFFFF', border: `1px solid ${card.border}`, borderRadius: '20px', padding: '28px', boxShadow: '0 2px 12px rgba(26,40,32,0.05)' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '13px', background: card.bg, border: `1px solid ${card.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}>
                  <card.icon size={20} color={card.color}/>
                </div>
                <h3 style={{ color: '#1A2820', fontSize: '17px', fontWeight: 800, letterSpacing: '-0.4px', marginBottom: '16px' }}>{card.title}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {card.points.map((pt, j) => (
                    <div key={j} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: card.color, flexShrink: 0, marginTop: '7px' }}/>
                      <p style={{ color: 'rgba(26,40,32,0.55)', fontSize: '13px', lineHeight: 1.6 }}>{pt}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: '100px 24px', background: 'rgba(26,40,32,0.02)', borderTop: '1px solid rgba(26,40,32,0.06)', borderBottom: '1px solid rgba(26,40,32,0.06)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={spring}
            style={{ textAlign: 'center', marginBottom: '56px' }}>
            <span style={{ display: 'inline-block', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', fontWeight: 700, color: '#5C8B74', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px', background: 'rgba(92,139,116,0.1)', border: '1px solid rgba(92,139,116,0.2)', padding: '4px 12px', borderRadius: '99px' }}>
              Features
            </span>
            <h2 style={{ color: '#1A2820', fontSize: 'clamp(30px, 5vw, 44px)', fontWeight: 900, letterSpacing: '-1.5px', marginBottom: '12px' }}>
              Everything your heart needs.
            </h2>
            <p style={{ color: 'rgba(26,40,32,0.45)', fontSize: '16px', maxWidth: '520px', margin: '0 auto', lineHeight: 1.65 }}>
              One platform for the emergency itself, the days before it, and the recovery after.
            </p>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {FEATURES.map((f, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }}
                transition={{ ...spring, delay: i * 0.07 }}
                style={{ background: '#FFFFFF', border: '1px solid rgba(26,40,32,0.07)', borderRadius: '20px', padding: '24px', boxShadow: '0 2px 12px rgba(26,40,32,0.05)' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '13px', background: f.bg, border: `1px solid ${f.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}>
                  <f.icon size={20} color={f.color}/>
                </div>
                <h3 style={{ color: '#1A2820', fontSize: '16px', fontWeight: 800, letterSpacing: '-0.4px', marginBottom: '10px' }}>{f.title}</h3>
                <p style={{ color: 'rgba(26,40,32,0.5)', fontSize: '14px', lineHeight: 1.7 }}>{f.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section id="how" style={{ padding: '100px 24px' }}>
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
                style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', padding: '32px 0', borderBottom: i < STEPS.length - 1 ? '1px solid rgba(26,40,32,0.07)' : 'none' }}>
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

      {/* ── STAGE 2 ──────────────────────────────────────────────────── */}
      <section style={{ padding: '100px 24px', background: '#1A2820', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(92,139,116,0.12) 1px, transparent 1px)', backgroundSize: '28px 28px', pointerEvents: 'none' }}/>
        <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative' }}>
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={spring}
            style={{ textAlign: 'center', marginBottom: '56px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', fontWeight: 700, color: '#5C8B74', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px', background: 'rgba(92,139,116,0.12)', border: '1px solid rgba(92,139,116,0.28)', padding: '5px 14px', borderRadius: '99px' }}>
              <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#5C8B74' }}/>
              Stage 2 — Shipped
            </span>
            <h2 style={{ color: '#F2EFE9', fontSize: 'clamp(30px, 5vw, 44px)', fontWeight: 900, letterSpacing: '-1.5px', marginBottom: '14px' }}>
              A major update is here.
            </h2>
            <p style={{ color: 'rgba(242,239,233,0.45)', fontSize: '16px', maxWidth: '540px', margin: '0 auto', lineHeight: 1.7 }}>
              Relay Stage 2 brings AI crash prediction, severity triage, caregiver live view, and clinical ER briefings — the system now works harder before, during, and after the emergency.
            </p>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2px', background: 'rgba(242,239,233,0.03)', borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(242,239,233,0.07)' }}>
            {[
              { icon: Brain, color: '#F59E0B', tag: 'PRE · DICT', title: 'Crash Risk Prediction', body: 'AI scans your last 7 check-ins to flag a crash before it arrives — giving you time to rest, adjust, or alert your care team.' },
              { icon: Zap, color: '#F87171', tag: 'TRI · AGE', title: 'Severity Triage Wizard', body: 'Not sure how serious? A 3-step assessment tells you whether to call 911, go to urgent care, or monitor at home.' },
              { icon: Eye, color: '#38BDF8', tag: 'LIVE · VIEW', title: 'Caregiver Live View', body: 'Share a link and your family watches the emergency in real-time — what type, how long, and when it resolves.' },
              { icon: FileText, color: '#A78BFA', tag: 'ER · BRIEF', title: 'ER Handoff Brief', body: 'One tap generates a clinical AI note — blood type, allergies, meds, chief complaint — formatted for ER intake. Copy or show on screen.' },
              { icon: RotateCcw, color: '#34D399', tag: 'RE · COVER', title: 'Recovery Protocol', body: 'After the emergency ends, Relay generates a 7-day recovery plan — hydration, rest, medications, and warning signs to watch for.' },
              { icon: Clock, color: '#94A3B8', tag: 'HIS · TORY', title: 'Emergency History', body: 'Every past SOS event logged by month — what happened, when, and how it was resolved. A timeline your doctor can actually use.' },
            ].map((item, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }}
                transition={{ ...spring, delay: i * 0.07 }}
                style={{ padding: '30px 26px', borderRight: (i % 3 < 2) ? '1px solid rgba(242,239,233,0.05)' : 'none', borderBottom: i < 3 ? '1px solid rgba(242,239,233,0.05)' : 'none' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${item.color}18`, border: `1px solid ${item.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <item.icon size={18} color={item.color}/>
                </div>
                <p style={{ color: item.color, fontFamily: 'var(--font-mono, monospace)', fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>{item.tag}</p>
                <h3 style={{ color: '#F2EFE9', fontSize: '16px', fontWeight: 800, letterSpacing: '-0.4px', marginBottom: '10px' }}>{item.title}</h3>
                <p style={{ color: 'rgba(242,239,233,0.42)', fontSize: '14px', lineHeight: 1.7 }}>{item.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY RELAY IS DIFFERENT ───────────────────────────────────── */}
      <section style={{ padding: '100px 24px', background: 'rgba(92,139,116,0.05)', borderTop: '1px solid rgba(92,139,116,0.1)', borderBottom: '1px solid rgba(92,139,116,0.1)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={spring}
            style={{ textAlign: 'center', marginBottom: '56px' }}>
            <span style={{ display: 'inline-block', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', fontWeight: 700, color: '#5C8B74', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px', background: 'rgba(92,139,116,0.1)', border: '1px solid rgba(92,139,116,0.2)', padding: '4px 12px', borderRadius: '99px' }}>
              Why Relay
            </span>
            <h2 style={{ color: '#1A2820', fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 900, letterSpacing: '-1.5px', marginBottom: '12px' }}>
              Designed for the gap that kills.
            </h2>
            <p style={{ color: 'rgba(26,40,32,0.45)', fontSize: '16px', maxWidth: '480px', margin: '0 auto', lineHeight: 1.65 }}>
              The gap between a cardiac event and the right care is where lives are lost. Relay is built to close it.
            </p>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {DIFFERENTIATORS.map((d, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }}
                transition={{ ...spring, delay: i * 0.06 }}
                style={{ background: '#FFFFFF', borderRadius: '16px', padding: '20px 22px', border: '1px solid rgba(26,40,32,0.07)', boxShadow: '0 1px 6px rgba(26,40,32,0.05)', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(92,139,116,0.08)', border: '1px solid rgba(92,139,116,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <d.icon size={16} color="#5C8B74"/>
                </div>
                <div>
                  <p style={{ color: '#1A2820', fontSize: '14px', fontWeight: 700, letterSpacing: '-0.2px', marginBottom: '4px' }}>{d.label}</p>
                  <p style={{ color: 'rgba(26,40,32,0.38)', fontSize: '12px', fontFamily: 'var(--font-mono, monospace)' }}>{d.vs}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROADMAP ──────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: '780px', margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={spring}>
            <p style={{ color: 'rgba(26,40,32,0.35)', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '14px' }}>Roadmap</p>
            <h3 style={{ color: '#1A2820', fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '8px' }}>What shipped. What's next.</h3>
            <p style={{ color: 'rgba(26,40,32,0.4)', fontSize: '14px', lineHeight: 1.6, marginBottom: '28px', maxWidth: '500px' }}>
              Stage 2 is live. Stage 3 is in progress.
            </p>
            <p style={{ color: 'rgba(26,40,32,0.35)', fontFamily: 'var(--font-mono, monospace)', fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px' }}>✓ Shipped — Stage 2</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
              {[
                'Crash risk prediction',
                'Severity triage wizard',
                'Caregiver live view',
                'ER handoff brief',
                'Recovery protocol',
                'Emergency history log',
              ].map((item, i) => (
                <motion.span key={i}
                  initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                  transition={{ ...spring, delay: i * 0.04 }}
                  style={{ background: 'rgba(92,139,116,0.08)', border: '1px solid rgba(92,139,116,0.2)', borderRadius: '99px', padding: '7px 14px', color: '#3D6B58', fontSize: '13px', fontWeight: 600 }}>
                  {item}
                </motion.span>
              ))}
            </div>
            <p style={{ color: 'rgba(26,40,32,0.35)', fontFamily: 'var(--font-mono, monospace)', fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px' }}>→ Coming — Stage 3</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                'Community transport network',
                'Wearable integration — Apple Watch, Fitbit',
                'Voice-first SOS mode',
                'Epic and Cerner hospital integration',
                'Vitals trend AI alerts',
                'Multilingual — Hindi, Bengali, Tamil',
              ].map((item, i) => (
                <motion.span key={i}
                  initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                  transition={{ ...spring, delay: i * 0.05 }}
                  style={{ background: '#FFFFFF', border: '1px solid rgba(26,40,32,0.09)', borderRadius: '99px', padding: '7px 14px', color: 'rgba(26,40,32,0.6)', fontSize: '13px', fontWeight: 500, boxShadow: '0 1px 4px rgba(26,40,32,0.04)' }}>
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
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#1A2820', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <Shield size={24} color="white"/>
          </div>
          <h2 style={{ color: '#1A2820', fontSize: 'clamp(28px, 6vw, 42px)', fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: '16px' }}>
            Your profile could save your life.
          </h2>
          <p style={{ color: 'rgba(26,40,32,0.48)', fontSize: '16px', lineHeight: 1.7, marginBottom: '12px' }}>
            Setup takes two minutes. Your medications, conditions, emergency contacts, and care team — all in one place, ready when you need them.
          </p>
          <p style={{ color: 'rgba(26,40,32,0.35)', fontSize: '14px', lineHeight: 1.6, marginBottom: '36px' }}>
            Free for patients. No subscription. No credit card.
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
          <button onClick={() => router.push('/care-team/login')}
            style={{ display: 'block', margin: '28px auto 0', background: 'none', border: 'none', color: 'rgba(26,40,32,0.22)', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer' }}>
            Care team portal →
          </button>
        </motion.div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer style={{ background: '#1A2820', padding: '56px 24px 40px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '40px', marginBottom: '48px' }}>
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
                The cardiac emergency platform for patients, families, and care teams. Built for the places the system forgot.
              </p>
            </div>

            <div>
              <p style={{ color: 'rgba(242,239,233,0.5)', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '16px' }}>Platform</p>
              {[['#features', 'Features'], ['#for-whom', "Who it's for"], ['#how', 'How It Works'], ['#mission', 'Mission']].map(([href, label]) => (
                <button key={label}
                  onClick={() => href.startsWith('#') ? document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' }) : router.push(href)}
                  style={{ display: 'block', background: 'none', border: 'none', color: 'rgba(242,239,233,0.45)', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit', padding: '4px 0', textAlign: 'left' }}>
                  {label}
                </button>
              ))}
            </div>

            <div>
              <p style={{ color: 'rgba(242,239,233,0.5)', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '16px' }}>Get started</p>
              {[['/login?signup=1', 'Create free account'], ['/login', 'Sign in'], ['/care-team/login', 'Care team portal']].map(([href, label]) => (
                <button key={label} onClick={() => router.push(href)}
                  style={{ display: 'block', background: 'none', border: 'none', color: 'rgba(242,239,233,0.45)', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit', padding: '4px 0', textAlign: 'left' }}>
                  {label}
                </button>
              ))}
            </div>

            <div>
              <p style={{ color: 'rgba(242,239,233,0.5)', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '16px' }}>Contact</p>
              <a href="mailto:aaryan10cityzen@gmail.com"
                style={{ color: 'rgba(242,239,233,0.45)', fontSize: '14px', textDecoration: 'none' }}>
                aaryan10cityzen@gmail.com
              </a>
              <p style={{ color: 'rgba(242,239,233,0.2)', fontSize: '12px', marginTop: '12px', lineHeight: 1.5 }}>
                Built in India.<br/>For everyone who needs it.
              </p>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(242,239,233,0.07)', paddingTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <p style={{ color: 'rgba(242,239,233,0.2)', fontSize: '12px', fontFamily: 'var(--font-mono, monospace)' }}>
              RELAY ARC © 2026 — All rights reserved
            </p>
            <p style={{ color: 'rgba(242,239,233,0.15)', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)' }}>
              RE · ACT · RE · ROUTE · RE · COVER
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
