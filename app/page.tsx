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
        background: scrolled ? 'rgba(7,7,16,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : '1px solid transparent',
        transition: 'all 0.2s ease',
        padding: '0 24px',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#EEEEF8', fontWeight: 800, fontSize: '16px', letterSpacing: '-0.5px' }}>Relay Arc</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }} className="desktop-nav">
            {[['features', 'Features'], ['for-whom', "Who it's for"], ['how', 'How it works'], ['mission', 'Mission']].map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <motion.button whileTap={{ scale: 0.97 }} onClick={onSignIn}
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.55)', fontSize: '13px', fontWeight: 600, padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit' }}>
              Sign in
            </motion.button>
            <motion.button whileTap={{ scale: 0.97 }} onClick={onGetStarted}
              style={{ background: '#FF3737', color: 'white', fontSize: '13px', fontWeight: 700, padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', border: 'none', fontFamily: 'inherit' }}>
              Get started
            </motion.button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setMenuOpen(o => !o)}
              style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }} className="mobile-menu-btn">
              {menuOpen ? <X size={20} color="#EEEEF8"/> : <Menu size={20} color="#EEEEF8"/>}
            </motion.button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{ position: 'fixed', top: '60px', left: 0, right: 0, zIndex: 99, background: 'rgba(7,7,16,0.98)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '12px 24px 20px' }}>
            {[['features', 'Features'], ['for-whom', "Who it's for"], ['how', 'How it works'], ['mission', 'Mission']].map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)}
                style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: '#EEEEF8', fontSize: '16px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
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
    <div style={{ minHeight: '100dvh', background: '#070710', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FF3737' }}/>
    </div>
  )

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div style={{ background: '#070710', overflowX: 'hidden' }}>
      <NavBar onSignIn={() => router.push('/login')} onGetStarted={() => router.push('/login?signup=1')}/>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section ref={heroRef} style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '120px 24px 80px' }}>
        <motion.div style={{ opacity: heroOpacity, y: heroY }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
              style={{ color: '#FF3737', fontSize: '11px', fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', fontFamily: 'var(--font-mono, monospace)', marginBottom: '32px' }}>
              Cardiac emergency platform · India
            </motion.p>

            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, ...spring }}
              style={{ color: '#EEEEF8', fontSize: 'clamp(48px, 10vw, 88px)', fontWeight: 900, lineHeight: 1.0, letterSpacing: '-3px', marginBottom: '28px' }}>
              When every<br/>
              minute is<br/>
              <span style={{ color: '#FF3737' }}>the margin.</span>
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14, ...spring }}
              style={{ color: '#8888A8', fontSize: '18px', lineHeight: 1.7, marginBottom: '40px', maxWidth: '520px' }}>
              Relay detects the cardiac crisis, finds the right hospital for your condition, sends your full medical profile ahead, and navigates your family there — in under 60 seconds.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, ...spring }}
              style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => router.push('/login?signup=1')}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FF3737', color: 'white', fontWeight: 700, fontSize: '15px', padding: '14px 28px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                Get started free <ArrowRight size={15}/>
              </motion.button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => scrollTo('how')}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', color: 'rgba(255,255,255,0.55)', fontWeight: 600, fontSize: '15px', padding: '14px 24px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.10)', cursor: 'pointer', fontFamily: 'inherit' }}>
                How it works
              </motion.button>
            </motion.div>
          </div>
        </motion.div>

        <motion.div animate={{ y: [0, 5, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          onClick={() => scrollTo('stats')}
          style={{ position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
          <ChevronDown size={16} color="#303045"/>
        </motion.div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────── */}
      <section id="stats" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {STATS.map((stat, i) => (
          <motion.div key={i}
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: '-60px' }}
            transition={{ ...spring, delay: i * 0.05 }}
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px', display: 'flex', alignItems: 'flex-start', gap: '32px' }}>
              <p style={{ color: '#EEEEF8', fontSize: 'clamp(64px, 12vw, 120px)', fontWeight: 900, letterSpacing: '-4px', lineHeight: 0.9, flexShrink: 0, width: '38%', minWidth: 0 }}>
                {stat.value}
              </p>
              <div style={{ paddingTop: '8px', flex: 1 }}>
                <p style={{ color: '#EEEEF8', fontSize: 'clamp(15px, 2vw, 18px)', fontWeight: 600, lineHeight: 1.4, marginBottom: '6px' }}>{stat.label}</p>
                <p style={{ color: '#505068', fontSize: '13px', fontFamily: 'var(--font-mono, monospace)' }}>{stat.sub}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </section>

      {/* ── MISSION ──────────────────────────────────────────────────── */}
      <section id="mission" style={{ padding: '120px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={spring}>
            <p style={{ color: '#505068', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '32px' }}>
              Mission
            </p>
            <h2 style={{ color: '#EEEEF8', fontSize: 'clamp(40px, 8vw, 72px)', fontWeight: 900, letterSpacing: '-3px', lineHeight: 1.0, marginBottom: '48px' }}>
              Relay,<br/>not Revive.
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {[
                'Not everyone lives in a place where help arrives in eight minutes. In much of the world, an emergency begins with a family doing math instead of getting help. Can we afford the ambulance. How far is the hospital. Will we make it in time.',
                'Relay exists because no one should have to think before getting help. Help should already be on the way.',
                'In India, more than 65 percent of people live in rural areas where the nearest hospital can be over 30 kilometers away. In cities like Mumbai, Delhi, and Kolkata, ambulances can sit in traffic for 45 minutes while moving only a few kilometers.',
                'These are not rare situations. This is daily life for hundreds of millions of people. Relay was built for them first — not as charity, but as the emergency infrastructure that should have already existed.',
              ].map((para, i) => (
                <motion.p key={i}
                  initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }}
                  transition={{ ...spring, delay: i * 0.07 }}
                  style={{ color: i === 1 ? '#00D68F' : '#8888A8', fontSize: i === 1 ? '20px' : '16px', lineHeight: i === 1 ? 1.55 : 1.8, fontWeight: i === 1 ? 600 : 400 }}>
                  {para}
                </motion.p>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FEATURES — numbered list layout ──────────────────────────── */}
      <section id="features" style={{ padding: '120px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', alignItems: 'start' }} className="features-grid">
            <div style={{ paddingRight: '64px', paddingBottom: '48px' }} className="features-sticky">
              <p style={{ color: '#505068', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '24px' }}>Features</p>
              <h2 style={{ color: '#EEEEF8', fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1.05 }}>
                Everything<br/>your heart<br/>needs.
              </h2>
            </div>
            <div>
              {[
                { num: '01', title: 'AI Emergency Detection', body: 'Tell Relay what\'s happening in plain language. AI identifies the type instantly and triggers routing — no menus.' },
                { num: '02', title: 'Daily Health Check-ins', body: 'A quick AI-powered conversation each morning tracks symptoms, flags anything unusual, and builds a clinical record.' },
                { num: '03', title: 'Medication Tracking', body: 'Log every medication, track doses, get reminders. Your full medication list is sent to the ER automatically.' },
                { num: '04', title: 'Condition-Specific Routing', body: 'GPS routing to the right hospital for your specific condition — not just the nearest. No car? Relay alerts volunteers.' },
                { num: '05', title: 'Surgery Recovery Timeline', body: 'Week-by-week guidance post-surgery. What\'s normal, what to watch for, personalized to your diagnosis.' },
                { num: '06', title: 'Care Team Dashboard', body: 'Nurses get a live view of all patients — check-in history, vitals, flags, and the ability to schedule video calls.' },
              ].map((f, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, x: 16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-40px' }}
                  transition={{ ...spring, delay: i * 0.07 }}
                  style={{ padding: '28px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ color: '#303045', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', marginBottom: '8px' }}>{f.num}</p>
                  <p style={{ color: '#EEEEF8', fontSize: '17px', fontWeight: 700, letterSpacing: '-0.4px', marginBottom: '8px' }}>{f.title}</p>
                  <p style={{ color: '#505068', fontSize: '14px', lineHeight: 1.7 }}>{f.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── WHO IT'S FOR — text rows, no cards ───────────────────────── */}
      <section id="for-whom" style={{ padding: '120px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ marginBottom: '56px' }}>
            <p style={{ color: '#505068', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>Who it is for</p>
            <h2 style={{ color: '#EEEEF8', fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1.05, maxWidth: '560px' }}>
              Built for everyone in the room.
            </h2>
          </div>

          {[
            {
              title: 'Cardiac patients',
              color: '#FF3737',
              points: ['Daily AI check-ins to catch early warning signs', 'SOS that triggers routing in under 10 seconds', 'Full medication and condition profile sent to ER automatically'],
            },
            {
              title: 'Post-surgery patients',
              color: '#C46B30',
              points: ['Week-by-week personalized recovery timeline', 'Know exactly what is normal and what is not', 'Care team video calls directly from the app'],
            },
            {
              title: 'Families & caregivers',
              color: '#00D68F',
              points: ['Real-time hospital routing when an emergency hits', 'Live status feed during the emergency', 'Full check-in history to share with doctors'],
            },
            {
              title: 'Nurses & care teams',
              color: '#4F8EF7',
              points: ['Patient monitoring dashboard across all patients', 'Automated flag system for abnormal check-ins', 'Secure appointment scheduling and video calls'],
            },
          ].map((group, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }}
              transition={{ ...spring, delay: i * 0.06 }}
              style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '32px', padding: '36px 0', borderTop: '1px solid rgba(255,255,255,0.06)', alignItems: 'start' }} className="for-whom-row">
              <p style={{ color: group.color, fontSize: '16px', fontWeight: 800, letterSpacing: '-0.3px' }}>{group.title}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {group.points.map((pt, j) => (
                  <p key={j} style={{ color: '#8888A8', fontSize: '15px', lineHeight: 1.6 }}>{pt}</p>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section id="how" style={{ padding: '120px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', background: '#0A0A18' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <p style={{ color: '#505068', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>How it works</p>
          <h2 style={{ color: '#EEEEF8', fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1.05, marginBottom: '64px' }}>
            Three steps.<br/>No guessing.
          </h2>

          {[
            { tag: 'RE · ACT', color: '#00D68F', title: 'Detect the emergency', body: 'Tell Relay what\'s happening. AI identifies the type and triggers routing instantly. Your medical profile is pulled automatically.' },
            { tag: 'RE · ROUTE', color: '#4F8EF7', title: 'Find the right hospital', body: 'Not just the nearest — the right one for your condition, with your full medical profile, medications, and allergies sent ahead.' },
            { tag: 'RE · COVER', color: '#C46B30', title: 'Navigate and recover', body: 'Turn-by-turn routing for family, live nurse dashboard, daily check-ins, vitals tracking, and a full recovery timeline all the way home.' },
          ].map((step, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-40px' }}
              transition={{ ...spring, delay: i * 0.1 }}
              style={{ display: 'flex', gap: '28px', padding: '40px 0', borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
              <p style={{ color: '#252535', fontWeight: 900, fontSize: '48px', letterSpacing: '-3px', lineHeight: 1, flexShrink: 0, width: '48px' }}>{i + 1}</p>
              <div>
                <p style={{ color: step.color, fontFamily: 'var(--font-mono, monospace)', fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px' }}>{step.tag}</p>
                <h3 style={{ color: '#EEEEF8', fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '10px' }}>{step.title}</h3>
                <p style={{ color: '#8888A8', fontSize: '15px', lineHeight: 1.7 }}>{step.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── STAGE 2 — grid without icon boxes ────────────────────────── */}
      <section style={{ padding: '120px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '32px', marginBottom: '64px', flexWrap: 'wrap' }}>
            <div>
              <p style={{ color: '#505068', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>Stage 2 — Shipped</p>
              <h2 style={{ color: '#EEEEF8', fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1.05 }}>
                We built a lot.<br/>Here's what shipped.
              </h2>
            </div>
            <p style={{ color: '#505068', fontSize: '15px', lineHeight: 1.7, maxWidth: '380px' }}>
              Stage 2 brings AI crash prediction, severity triage, caregiver live view, and clinical ER briefings.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0', borderTop: '1px solid rgba(255,255,255,0.06)', borderLeft: '1px solid rgba(255,255,255,0.06)' }} className="stage2-grid">
            {[
              { color: '#F59E0B', tag: 'PRE · DICT', title: 'Crash Risk Prediction', body: 'AI scans your last 7 check-ins to flag a crash before it arrives — giving you time to rest, adjust, or alert your care team.' },
              { color: '#F87171', tag: 'TRI · AGE', title: 'Severity Triage Wizard', body: 'A 3-step assessment tells you whether to call 911, go to urgent care, or monitor at home.' },
              { color: '#38BDF8', tag: 'LIVE · VIEW', title: 'Caregiver Live View', body: 'Share a link and your family watches the emergency in real-time — what type, how long, and when it resolves.' },
              { color: '#A78BFA', tag: 'ER · BRIEF', title: 'ER Handoff Brief', body: 'One tap generates a clinical AI note — blood type, allergies, meds, chief complaint — formatted for ER intake.' },
              { color: '#34D399', tag: 'RE · COVER', title: 'Recovery Protocol', body: 'After the emergency ends, Relay generates a 7-day recovery plan — hydration, rest, medications, warning signs.' },
              { color: '#94A3B8', tag: 'HIS · TORY', title: 'Emergency History', body: 'Every past SOS event logged by month — what happened, when, and how it was resolved.' },
            ].map((item, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }}
                transition={{ ...spring, delay: i * 0.07 }}
                style={{ padding: '36px 28px', borderRight: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ color: item.color, fontFamily: 'var(--font-mono, monospace)', fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '16px' }}>{item.tag}</p>
                <p style={{ color: '#EEEEF8', fontSize: '16px', fontWeight: 800, letterSpacing: '-0.3px', marginBottom: '10px' }}>{item.title}</p>
                <p style={{ color: '#505068', fontSize: '14px', lineHeight: 1.7 }}>{item.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY RELAY — simple comparison rows ───────────────────────── */}
      <section style={{ padding: '120px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', background: '#0A0A18' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <p style={{ color: '#505068', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>Why Relay</p>
          <h2 style={{ color: '#EEEEF8', fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1.05, marginBottom: '64px', maxWidth: '480px' }}>
            Designed for the gap<br/>that kills.
          </h2>
          {[
            { relay: 'Sub-10 second emergency activation', vs: 'vs. minutes finding a number to call' },
            { relay: 'Condition-matched hospital routing', vs: 'vs. nearest hospital with no context' },
            { relay: 'Medical profile arrives before you do', vs: 'vs. repeating your history in the ER' },
            { relay: 'Daily monitoring catches issues early', vs: 'vs. waiting until it becomes an emergency' },
            { relay: 'Works with or without a vehicle', vs: 'vs. assuming you have transport' },
            { relay: 'Post-discharge recovery guidance', vs: 'vs. leaving hospital with a pamphlet' },
          ].map((d, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-30px' }}
              transition={{ ...spring, delay: i * 0.05 }}
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', padding: '20px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }} className="why-row">
              <p style={{ color: '#EEEEF8', fontSize: '15px', fontWeight: 600 }}>{d.relay}</p>
              <p style={{ color: '#303045', fontSize: '14px', fontFamily: 'var(--font-mono, monospace)' }}>{d.vs}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────── */}
      <section style={{ padding: '160px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={spring}>
            <h2 style={{ color: '#EEEEF8', fontSize: 'clamp(36px, 7vw, 64px)', fontWeight: 900, letterSpacing: '-3px', lineHeight: 1.0, marginBottom: '20px' }}>
              Your profile could<br/>save your life.
            </h2>
            <p style={{ color: '#8888A8', fontSize: '17px', lineHeight: 1.7, marginBottom: '40px', maxWidth: '440px' }}>
              Blood type, allergies, medications — all ready for paramedics in seconds. No unlocking required.
            </p>
            <motion.a href="/login" whileTap={{ scale: 0.97 }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#FF3737', color: 'white', padding: '16px 32px', borderRadius: '10px', fontWeight: 700, fontSize: '16px', textDecoration: 'none' }}>
              Set up your profile free
            </motion.a>
          </motion.div>
        </div>
      </section>

      <style>{`
        @media (max-width: 768px) {
          .features-grid { grid-template-columns: 1fr !important; }
          .features-sticky { padding-right: 0 !important; padding-bottom: 32px !important; }
          .for-whom-row { grid-template-columns: 1fr !important; gap: 16px !important; }
          .stage2-grid { grid-template-columns: 1fr !important; }
          .why-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
