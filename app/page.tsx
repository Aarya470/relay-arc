'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Menu, X, Phone, MapPin, FileText, Heart, Activity, Pill, Video, TrendingDown, Route, Users } from 'lucide-react'

// ─── Design tokens — shared with the app ─────────────────────────────────────
const T1     = '#0E1218'
const T2     = '#5B6371'
const T3     = '#9AA2AD'
const BORDER = '#E3E6EC'
const BG2    = '#F4F5F7'
const ACCENT = '#0055FF'
const RED    = '#D91414'
const GREEN  = '#007A44'
const AMBER  = '#B45309'

const mono = 'var(--font-mono, monospace)'

// ─── Nav ──────────────────────────────────────────────────────────────────────
function NavBar({ onSignIn, onGetStarted }: { onSignIn: () => void; onGetStarted: () => void }) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setMenuOpen(false)
  }

  const links: [string, string][] = [['log', 'How it works'], ['features', 'Features'], ['mission', 'Mission'], ['for-whom', "Who it's for"]]

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? 'rgba(255,255,255,0.88)' : 'transparent',
        backdropFilter: scrolled ? 'blur(14px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(14px)' : 'none',
        borderBottom: scrolled ? `1px solid ${BORDER}` : '1px solid transparent',
        transition: 'background 0.2s ease, border-color 0.2s ease',
        padding: '0 24px',
      }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: RED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Heart size={13} color="white" fill="white" strokeWidth={0}/>
            </div>
            <span style={{ color: T1, fontWeight: 800, fontSize: '15.5px', letterSpacing: '-0.4px' }}>Relay Arc</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '26px' }} className="desktop-nav">
            {links.map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)} className="nav-link"
                style={{ background: 'none', border: 'none', color: T2, fontSize: '13.5px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={onSignIn} className="desktop-only nav-link"
              style={{ background: 'transparent', border: 'none', color: T2, fontSize: '13.5px', fontWeight: 600, padding: '8px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
              Sign in
            </button>
            <button onClick={onGetStarted}
              style={{ background: T1, color: 'white', fontSize: '13.5px', fontWeight: 600, padding: '9px 18px', borderRadius: '10px', cursor: 'pointer', border: 'none', fontFamily: 'inherit' }}>
              Get started
            </button>
            <button onClick={() => setMenuOpen(o => !o)}
              style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }} className="mobile-menu-btn">
              {menuOpen ? <X size={20} color={T1}/> : <Menu size={20} color={T1}/>}
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }}
            style={{ position: 'fixed', top: '64px', left: 0, right: 0, zIndex: 99, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(14px)', borderBottom: `1px solid ${BORDER}`, padding: '8px 24px 18px' }}>
            {links.map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)}
                style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: T1, fontSize: '15px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', padding: '13px 0', borderBottom: `1px solid ${BORDER}` }}>
                {label}
              </button>
            ))}
            <button onClick={onSignIn}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: T2, fontSize: '15px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', padding: '13px 0' }}>
              Sign in
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ─── Phone mockup — mirrors the real dashboard ───────────────────────────────
function PhoneMockup() {
  return (
    <div style={{ position: 'relative', width: 'fit-content', margin: '0 auto' }} className="phone-wrap">

      {/* map-paper dot grid */}
      <div aria-hidden style={{
        position: 'absolute', inset: '-70px -120px',
        backgroundImage: 'radial-gradient(rgba(14,18,24,0.13) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        maskImage: 'radial-gradient(closest-side, black 55%, transparent)',
        WebkitMaskImage: 'radial-gradient(closest-side, black 55%, transparent)',
        pointerEvents: 'none',
      }}/>

      {/* dashed route line, house → hospital */}
      <svg aria-hidden width="560" height="420" viewBox="0 0 560 420" fill="none"
        style={{ position: 'absolute', top: '-52px', left: '-160px', pointerEvents: 'none' }} className="route-svg">
        <path d="M24 396 C 120 380, 150 300, 236 268 S 420 160, 508 60" stroke={RED} strokeWidth="1.6" strokeDasharray="5 7" opacity="0.55"/>
        <circle cx="24" cy="396" r="5" fill={ACCENT}/>
        <circle cx="24" cy="396" r="10" fill={ACCENT} opacity="0.15"/>
        <rect x="496" y="44" width="26" height="26" rx="7" fill={RED}/>
        <path d="M509 51 v12 M503 57 h12" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
      </svg>

      <div style={{
        position: 'relative',
        width: '308px',
        borderRadius: '42px',
        background: T1,
        padding: '10px',
        boxShadow: '0 30px 90px rgba(14,18,24,0.18), 0 4px 16px rgba(14,18,24,0.08)',
      }}>
        <div style={{ borderRadius: '34px', background: BG2, padding: '18px 16px 22px', overflow: 'hidden' }}>

          {/* status bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <span style={{ color: T2, fontSize: '11px', fontWeight: 600, fontFamily: mono }}>9:41</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[3, 4, 5].map(h => <div key={h} style={{ width: '3px', height: `${h + 4}px`, borderRadius: '1px', background: T3, alignSelf: 'flex-end' }}/>)}
            </div>
          </div>

          {/* greeting */}
          <p style={{ color: T3, fontSize: '9px', fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase', fontFamily: mono, marginBottom: '4px' }}>Good morning</p>
          <p style={{ color: T1, fontSize: '26px', fontWeight: 800, letterSpacing: '-0.8px', lineHeight: 1, marginBottom: '8px' }}>Asha</p>
          <span style={{ display: 'inline-block', background: 'rgba(0,85,255,0.08)', border: '1px solid rgba(0,85,255,0.14)', color: ACCENT, fontSize: '8px', fontWeight: 700, padding: '3px 7px', borderRadius: '5px', fontFamily: mono, letterSpacing: '0.7px', textTransform: 'uppercase', marginBottom: '14px' }}>
            Post-CABG
          </span>

          {/* SOS */}
          <div style={{ background: RED, borderRadius: '18px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', animation: 'sos-pulse-lp 2.8s ease-in-out infinite' }}>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '7.5px', letterSpacing: '1.6px', textTransform: 'uppercase', fontFamily: mono, fontWeight: 700, marginBottom: '6px' }}>Emergency response</p>
              <p style={{ color: 'white', fontSize: '32px', fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 0.9, fontFamily: mono }}>SOS</p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '8.5px', marginTop: '6px', fontWeight: 500 }}>Hold to activate</p>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Phone size={16} color="white"/>
            </div>
          </div>

          {/* two cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
            <div style={{ background: GREEN, borderRadius: '14px', padding: '12px' }}>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '7.5px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', fontFamily: mono, marginBottom: '8px' }}>Done</p>
              <p style={{ color: 'white', fontSize: '24px', fontWeight: 900, lineHeight: 0.9, marginBottom: '8px' }}>✓</p>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '8.5px', fontWeight: 500 }}>Today complete</p>
            </div>
            <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '12px' }}>
              <p style={{ color: ACCENT, fontSize: '7.5px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', fontFamily: mono, marginBottom: '8px' }}>Recovery</p>
              <p style={{ color: T1, fontSize: '24px', fontWeight: 900, letterSpacing: '-1px', lineHeight: 0.9, marginBottom: '8px' }}>6</p>
              <p style={{ color: T3, fontSize: '8.5px', fontWeight: 500 }}>weeks post-surgery</p>
            </div>
          </div>

          {/* health score */}
          <div style={{ background: 'white', border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
              <p style={{ color: T3, fontSize: '7.5px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', fontFamily: mono }}>Health score</p>
              <span style={{ color: GREEN, fontSize: '9.5px', fontWeight: 600 }}>Improving</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
              <p style={{ color: GREEN, fontSize: '34px', fontWeight: 800, letterSpacing: '-2px', lineHeight: 0.85 }}>82</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', paddingBottom: '2px' }}>
                {[9, 12, 8, 14, 13, 17, 20].map((h, i) => (
                  <div key={i} style={{ width: '5px', height: `${h}px`, borderRadius: '2px', background: i === 6 ? GREEN : BORDER }}/>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* floating detail cards — outside the screen, clipping only the bezel */}
      <div className="float-card" style={{
        position: 'absolute', top: '52px', right: '-128px', zIndex: 6,
        background: 'white', border: `1px solid ${BORDER}`, borderRadius: '12px',
        padding: '10px 13px', boxShadow: '0 10px 32px rgba(14,18,24,0.10)',
        display: 'flex', alignItems: 'flex-start', gap: '8px', width: '176px',
      }}>
        <FileText size={13} color={GREEN} style={{ marginTop: '1px', flexShrink: 0 }}/>
        <div>
          <p style={{ color: T1, fontSize: '11px', fontWeight: 700, marginBottom: '2px' }}>ER brief sent</p>
          <p style={{ color: T3, fontSize: '10px', fontFamily: mono }}>Lilavati Hosp. · 0:42</p>
        </div>
      </div>

      <div className="float-card" style={{
        position: 'absolute', bottom: '38px', left: '-136px', zIndex: 6,
        background: 'white', border: `1px solid ${BORDER}`, borderRadius: '12px',
        padding: '10px 13px', boxShadow: '0 10px 32px rgba(14,18,24,0.10)',
        display: 'flex', alignItems: 'flex-start', gap: '8px', width: '172px',
      }}>
        <MapPin size={13} color={ACCENT} style={{ marginTop: '1px', flexShrink: 0 }}/>
        <div>
          <p style={{ color: T1, fontSize: '11px', fontWeight: 700, marginBottom: '2px' }}>Cath lab matched</p>
          <p style={{ color: T3, fontSize: '10px', fontFamily: mono }}>4.2 km · 11 min</p>
        </div>
      </div>

    </div>
  )
}

// ─── Dispatch log data ────────────────────────────────────────────────────────
const LOG = [
  { t: '19:42:07', d: '+0:00', title: 'SOS held for three seconds', body: '“Chest pain, sweating” — typed by her son while she sat down.', color: '#D91414' },
  { t: '19:42:19', d: '+0:12', title: 'Cardiac event classified', body: 'Profile, medications and allergy list pulled automatically. No forms.', color: '#B45309' },
  { t: '19:42:31', d: '+0:24', title: 'Hospital matched — not just nearest', body: 'Lilavati: cath lab available, 4.2 km. Family car routed, 11 minutes.', color: '#0055FF' },
  { t: '19:42:44', d: '+0:37', title: 'ER brief on the intake desk', body: 'Blood type, allergies, meds, chief complaint — before the car leaves the lane.', color: '#0055FF' },
  { t: '19:53:58', d: '+11:51', title: 'Arrival', body: 'No history recital in a hallway. Straight through triage to the lab.', color: '#007A44' },
]

// ─── With / without — looping split-screen simulation ───────────────────────
const RACE_MS = 19000
const LEFT_EVENTS = [
  { at: 500,   color: 'rgba(255,255,255,0.35)', text: 'Chest pain — panic sets in' },
  { at: 3000,  color: 'rgba(255,255,255,0.35)', text: 'Googling symptoms, hands shaking' },
  { at: 5500,  color: 'rgba(255,255,255,0.35)', text: 'Calling family — no answer' },
  { at: 8000,  color: 'rgba(255,255,255,0.35)', text: 'Which hospital? Nobody is sure' },
  { at: 10500, color: '#E8A33D', text: 'Ambulance dispatched — ETA 45 min' },
  { at: 13500, color: '#FF6B5E', text: 'Stuck in traffic. Still waiting.' },
]
const RIGHT_EVENTS = [
  { at: 500,   color: '#FF6B5E', text: 'SOS held — “chest pain, sweating”' },
  { at: 2500,  color: '#E8A33D', text: 'Cardiac event classified · profile pulled' },
  { at: 4500,  color: '#7AA7FF', text: 'Lilavati matched — cath lab free · 4.2 km' },
  { at: 6500,  color: '#7AA7FF', text: 'ER brief on the intake desk' },
  { at: 9000,  color: '#7AA7FF', text: 'Family car en route — turn-by-turn' },
  { at: 12500, color: '#3DDC97', text: 'Arrived — straight through triage' },
]
function fmtElapsed(s: number) {
  const m = Math.floor(s / 60), ss = Math.floor(s % 60)
  return `+${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}
function EmergencyRace() {
  const [t, setT] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setT(prev => (prev + 100) % RACE_MS), 100)
    return () => clearInterval(id)
  }, [])
  const fading = t > RACE_MS - 900
  const leftSec  = Math.min(t / 16500, 1) * 2820
  const rightSec = Math.min(t / 12500, 1) * 711
  const leftStatus  = t >= 15500 ? { label: 'Still en route', color: '#FF6B5E', bg: 'rgba(217,20,20,0.16)' }
    : t >= 10500 ? { label: 'Waiting for ambulance', color: '#E8A33D', bg: 'rgba(180,83,9,0.16)' }
    : { label: 'No plan yet', color: 'rgba(255,255,255,0.45)', bg: 'rgba(255,255,255,0.07)' }
  const rightStatus = t >= 12500 ? { label: 'In the cath lab', color: '#3DDC97', bg: 'rgba(0,122,68,0.2)' }
    : t >= 4500 ? { label: 'Routing locked', color: '#7AA7FF', bg: 'rgba(0,85,255,0.18)' }
    : { label: 'SOS active', color: '#FF6B5E', bg: 'rgba(217,20,20,0.16)' }

  const panel = (
    title: string, titleColor: string, events: typeof LEFT_EVENTS,
    sec: number, timerColor: string, status: { label: string; color: string; bg: string },
    cls: string,
  ) => (
    <div className={cls} style={{ padding: '22px 24px 24px', display: 'flex', flexDirection: 'column', minHeight: '316px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '18px' }}>
        <span style={{ color: titleColor, fontFamily: mono, fontSize: '10.5px', fontWeight: 700, letterSpacing: '1.8px', textTransform: 'uppercase' }}>{title}</span>
        <span style={{ color: timerColor, fontFamily: mono, fontSize: '15px', fontWeight: 700, letterSpacing: '0.5px', fontVariantNumeric: 'tabular-nums' }}>{fmtElapsed(sec)}</span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '11px' }}>
        {events.map((e, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: '10px',
            opacity: t >= e.at ? 1 : 0,
            transform: t >= e.at ? 'translateY(0)' : 'translateY(6px)',
            transition: 'opacity 0.45s ease, transform 0.45s ease',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: e.color, marginTop: '6px', flexShrink: 0 }}/>
            <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: '13.5px', lineHeight: 1.5, margin: 0 }}>{e.text}</p>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '18px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: status.bg, borderRadius: '99px', padding: '6px 13px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: status.color, animation: status.label === 'Still en route' || status.label === 'SOS active' ? 'dot-blink 1.1s infinite' : 'none' }}/>
          <span style={{ color: status.color, fontFamily: mono, fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>{status.label}</span>
        </span>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ background: T1, borderRadius: '20px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontFamily: mono, fontSize: '10.5px', letterSpacing: '1.6px', textTransform: 'uppercase' }}>Two families · same chest pain · 19:42 on a Tuesday</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '7px', flexShrink: 0 }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FF6B5E', animation: 'dot-blink 1.2s infinite' }}/>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontFamily: mono, fontSize: '10.5px', letterSpacing: '1.6px' }}>SIM · LOOP</span>
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', opacity: fading ? 0 : 1, transition: 'opacity 0.7s ease' }} className="race-grid">
          {panel('Without Relay', 'rgba(255,255,255,0.5)', LEFT_EVENTS, leftSec, t >= 15500 ? '#FF6B5E' : 'rgba(255,255,255,0.7)', leftStatus, 'race-left')}
          {panel('With Relay', '#3DDC97', RIGHT_EVENTS, rightSec, t >= 12500 ? '#3DDC97' : 'rgba(255,255,255,0.7)', rightStatus, 'race-right')}
        </div>
      </div>
      <p style={{ color: T3, fontSize: '11.5px', fontFamily: mono, marginTop: '12px' }}>
        Simulated side-by-side — not real footage. Ambulance wait reflects Mumbai peak-traffic averages.
      </p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const [authChecked, setAuthChecked] = useState(false)
  const router = useRouter()

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
    <div style={{ minHeight: '100dvh', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: RED }}/>
    </div>
  )

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  const features = [
    { Icon: Activity,     color: ACCENT, title: 'AI emergency detection',    body: 'Plain-language triage that starts routing instantly, without forms or phone trees.' },
    { Icon: Route,        color: ACCENT, title: 'Condition-matched routing', body: 'A cath lab for a heart attack — not just the closest ER. GPS navigation included.' },
    { Icon: FileText,     color: RED,    title: 'ER handoff brief',          body: 'One tap generates a clinical intake note: blood type, allergies, meds, chief complaint.' },
    { Icon: TrendingDown, color: AMBER,  title: 'Crash-risk prediction',     body: 'Your last seven check-ins, scanned for the pattern that tends to precede a bad day.' },
    { Icon: Heart,        color: GREEN,  title: 'Daily check-ins',           body: 'A two-minute conversation each morning that quietly builds a clinical record.' },
    { Icon: Pill,         color: GREEN,  title: 'Medication tracking',       body: 'Doses, reminders, and a list the ER sees without anyone having to remember it.' },
    { Icon: Video,        color: ACCENT, title: 'Care-team dashboard',       body: 'Nurses see every patient’s history, vitals and flags — and can schedule video calls.' },
    { Icon: Users,        color: AMBER,  title: 'Caregiver live view',       body: 'Share a link; your family watches the emergency unfold and resolve in real time.' },
  ]

  const audiences = [
    { title: 'Cardiac patients',      color: RED,    body: 'Daily check-ins that catch early warnings, an SOS that moves in seconds, and a medical profile that speaks for you when you can’t.' },
    { title: 'Post-surgery patients', color: AMBER,  body: 'A week-by-week recovery timeline that knows your procedure — what’s normal, what isn’t, and who to call.' },
    { title: 'Families & caregivers', color: GREEN,  body: 'Live routing the moment it happens, a real-time status feed, and the full history to share with doctors afterwards.' },
    { title: 'Nurses & care teams',   color: ACCENT, body: 'One dashboard for every patient — automated flags, check-in history, secure scheduling and video calls.' },
  ]

  const tickerItems = [
    ['3.8M', 'cardiac deaths a year in India'],
    ['45 min', 'average ambulance wait in Mumbai traffic'],
    ['10 min', 'window to prevent brain damage after arrest'],
    ['65%', 'of rural India lives 30 km+ from a hospital'],
    ['<60 s', 'from SOS to a hospital matched and briefed'],
  ]
  const Ticker = () => (
    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
      {tickerItems.map(([n, l], i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '8px', paddingRight: '56px' }}>
          <span style={{ color: RED, fontFamily: mono, fontSize: '11px' }}>▲</span>
          <span style={{ color: T1, fontFamily: mono, fontSize: '12.5px', fontWeight: 700 }}>{n}</span>
          <span style={{ color: T2, fontFamily: mono, fontSize: '11.5px', letterSpacing: '0.4px', textTransform: 'uppercase' }}>{l}</span>
        </div>
      ))}
    </div>
  )

  return (
    <div style={{ background: 'white', overflowX: 'hidden' }}>
      <NavBar onSignIn={() => router.push('/login')} onGetStarted={() => router.push('/login?signup=1')}/>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section style={{ padding: '138px 24px 0' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: '48px', alignItems: 'start' }} className="hero-grid">

            <div style={{ paddingBottom: '90px' }} className="hero-copy">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: RED, display: 'inline-block', animation: 'dot-blink 1.6s ease-in-out infinite' }}/>
                <span style={{ color: T2, fontSize: '11.5px', fontFamily: mono, letterSpacing: '1px', textTransform: 'uppercase' }}>
                  19.0760° N, 72.8777° E — Mumbai · cardiac response
                </span>
              </div>

              <h1 style={{ color: T1, fontSize: 'clamp(40px, 5.8vw, 62px)', fontWeight: 800, lineHeight: 1.03, letterSpacing: '-2.4px', marginBottom: '24px', maxWidth: '600px' }}>
                When every minute<br/>is the margin<span style={{ color: RED }}>.</span>
              </h1>

              <p style={{ color: T2, fontSize: '17px', lineHeight: 1.65, marginBottom: '36px', maxWidth: '470px' }}>
                Relay detects the crisis, matches the right hospital for your condition, sends your medical profile ahead, and navigates your family there — all in under a minute.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '22px', flexWrap: 'wrap', marginBottom: '32px' }}>
                <button onClick={() => router.push('/login?signup=1')}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', background: T1, color: 'white', fontWeight: 600, fontSize: '15px', padding: '14px 26px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Create your free profile <ArrowRight size={15}/>
                </button>
                <button onClick={() => scrollTo('log')}
                  style={{ background: 'none', border: 'none', color: T2, fontWeight: 600, fontSize: '14.5px', cursor: 'pointer', fontFamily: 'inherit', padding: 0, borderBottom: `1px solid ${BORDER}`, paddingBottom: '2px' }}>
                  Watch one emergency, timed
                </button>
              </div>

              <p style={{ color: T3, fontSize: '13px' }}>
                Free for patients · Installs from the browser · No app store needed
              </p>
            </div>

            <div style={{ position: 'relative', zIndex: 5, marginBottom: '-64px' }} className="phone-col">
              <PhoneMockup/>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── TELEMETRY TICKER ─────────────────────────────────────────── */}
      <div style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, background: BG2, overflow: 'hidden', padding: '13px 0', position: 'relative' }}>
        <div className="ticker-track">
          <Ticker/><Ticker/>
        </div>
      </div>

      {/* ── DISPATCH LOG ─────────────────────────────────────────────── */}
      <section id="log" style={{ padding: '110px 24px' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <div style={{ marginBottom: '84px' }}>
            <EmergencyRace/>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '72px', alignItems: 'start' }} className="split-grid">
            <div className="split-sticky" style={{ position: 'sticky', top: '110px' }}>
              <p style={{ color: T3, fontFamily: mono, fontSize: '11px', letterSpacing: '1.6px', textTransform: 'uppercase', marginBottom: '16px' }}>How it works</p>
              <h2 style={{ color: T1, fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, letterSpacing: '-1.6px', lineHeight: 1.08, marginBottom: '16px' }}>
                One emergency,<br/>timed<span style={{ color: RED }}>.</span>
              </h2>
              <p style={{ color: T2, fontSize: '15.5px', lineHeight: 1.65, marginBottom: '18px' }}>
                An emergency is not the moment to figure things out. Relay already has. Here is a Tuesday evening, minute by minute.
              </p>
              <p style={{ color: T3, fontSize: '12px', lineHeight: 1.6 }}>
                Composite scenario. Timings reflect how Relay routes and briefs in a metro area.
              </p>
            </div>

            <div style={{ paddingTop: '6px' }}>
              {LOG.map((e, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '28px', position: 'relative', paddingBottom: i < LOG.length - 1 ? '44px' : 0 }} className="log-row">
                  {/* timeline spine */}
                  {i < LOG.length - 1 && (
                    <div style={{ position: 'absolute', left: '182px', top: '20px', bottom: '-2px', width: '1px', background: BORDER }} className="log-spine"/>
                  )}
                  <div style={{ textAlign: 'right' }} className="log-time">
                    <p style={{ color: T1, fontFamily: mono, fontSize: '14px', fontWeight: 700, letterSpacing: '0.3px' }}>{e.t}</p>
                    <p style={{ color: T3, fontFamily: mono, fontSize: '11px', marginTop: '3px' }}>{e.d}</p>
                  </div>
                  <div style={{ position: 'relative', paddingLeft: '30px' }}>
                    <span style={{ position: 'absolute', left: '-4.5px', top: '5px', width: '9px', height: '9px', borderRadius: '50%', background: e.color, boxShadow: `0 0 0 4px ${e.color}1A` }} className="log-dot"/>
                    <h3 style={{ color: T1, fontSize: '16.5px', fontWeight: 700, letterSpacing: '-0.3px', marginBottom: '7px' }}>{e.title}</h3>
                    <p style={{ color: T2, fontSize: '14px', lineHeight: 1.65, maxWidth: '440px' }}>{e.body}</p>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: '40px', paddingLeft: '178px' }} className="log-verdict">
                <p style={{ color: T1, fontSize: '15px', fontWeight: 700, letterSpacing: '-0.2px' }}>
                  Eleven minutes, fifty-one seconds<span style={{ color: RED }}>.</span> The margin, kept.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: '100px 24px', borderTop: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '72px', alignItems: 'start' }} className="split-grid">
            <div className="split-sticky" style={{ position: 'sticky', top: '110px' }}>
              <p style={{ color: T3, fontFamily: mono, fontSize: '11px', letterSpacing: '1.6px', textTransform: 'uppercase', marginBottom: '16px' }}>Features</p>
              <h2 style={{ color: T1, fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, letterSpacing: '-1.6px', lineHeight: 1.08, marginBottom: '16px' }}>
                The whole arc<br/>of care<span style={{ color: RED }}>.</span>
              </h2>
              <p style={{ color: T2, fontSize: '15.5px', lineHeight: 1.65 }}>
                From the first warning sign to the last week of recovery — not just the 911 call.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 48px' }} className="features-items">
              {features.map((f, i) => (
                <div key={i} style={{ borderTop: `1px solid ${BORDER}`, padding: '20px 0 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <f.Icon size={15} color={f.color} strokeWidth={2}/>
                    <h3 style={{ color: T1, fontSize: '15px', fontWeight: 700, letterSpacing: '-0.2px' }}>{f.title}</h3>
                  </div>
                  <p style={{ color: T2, fontSize: '13.5px', lineHeight: 1.6 }}>{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── MISSION — the one dark moment ────────────────────────────── */}
      <section id="mission" style={{ background: T1, padding: '110px 24px' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '72px', alignItems: 'start' }} className="split-grid">
            <div>
              <p style={{ color: '#FF6B5E', fontFamily: mono, fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '18px' }}>Mission</p>
              <h2 style={{ color: 'white', fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 800, letterSpacing: '-1.8px', lineHeight: 1.05 }}>
                Relay,<br/>not Revive<span style={{ color: '#FF6B5E' }}>.</span>
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '560px' }}>
              <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '15.5px', lineHeight: 1.75 }}>
                Not everyone lives where help arrives in eight minutes. In much of the world, an emergency begins with a family doing math instead of getting help. Can we afford the ambulance. How far is the hospital. Will we make it in time.
              </p>
              <p style={{ color: '#3DDC97', fontSize: '19px', lineHeight: 1.55, fontWeight: 600 }}>
                Relay exists because no one should have to think before getting help. Help should already be on the way.
              </p>
              <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '15.5px', lineHeight: 1.75 }}>
                In India, more than 65 percent of people live in rural areas where the nearest hospital can be over 30 kilometres away. In Mumbai, Delhi and Kolkata, ambulances can sit in traffic for 45 minutes while moving only a few kilometres.
              </p>
              <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '15.5px', lineHeight: 1.75 }}>
                These are not rare situations — this is daily life for hundreds of millions of people. Relay was built for them first. Not as charity, but as the emergency infrastructure that should have already existed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHO IT'S FOR ─────────────────────────────────────────────── */}
      <section id="for-whom" style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <h2 style={{ color: T1, fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, letterSpacing: '-1.6px', lineHeight: 1.08, marginBottom: '48px', maxWidth: '480px' }}>
            Built for everyone<br/>in the room<span style={{ color: RED }}>.</span>
          </h2>

          <div>
            {audiences.map((a, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '32px', padding: '26px 0', borderTop: `1px solid ${BORDER}`, alignItems: 'baseline' }} className="who-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: a.color, flexShrink: 0 }}/>
                  <p style={{ color: T1, fontSize: '15.5px', fontWeight: 700, letterSpacing: '-0.2px' }}>{a.title}</p>
                </div>
                <p style={{ color: T2, fontSize: '14.5px', lineHeight: 1.65, maxWidth: '620px' }}>{a.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section style={{ padding: '110px 24px', borderTop: `1px solid ${BORDER}`, background: BG2 }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ color: T1, fontSize: 'clamp(30px, 5vw, 46px)', fontWeight: 800, letterSpacing: '-1.8px', lineHeight: 1.08, marginBottom: '16px' }}>
            Your profile could<br/>save your life<span style={{ color: RED }}>.</span>
          </h2>
          <p style={{ color: T2, fontSize: '16px', lineHeight: 1.65, marginBottom: '34px', maxWidth: '440px', marginLeft: 'auto', marginRight: 'auto' }}>
            Blood type, allergies, medications — ready for paramedics in seconds. No unlocking required.
          </p>
          <button onClick={() => router.push('/login?signup=1')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: T1, color: 'white', padding: '15px 30px', borderRadius: '12px', fontWeight: 600, fontSize: '15.5px', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            Set up your profile — it’s free <ArrowRight size={15}/>
          </button>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer style={{ borderTop: `1px solid ${BORDER}`, padding: '52px 24px 36px', background: 'white' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '40px', flexWrap: 'wrap', marginBottom: '44px' }}>
            <div style={{ maxWidth: '300px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '7px', background: RED, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Heart size={11} color="white" fill="white" strokeWidth={0}/>
                </div>
                <span style={{ color: T1, fontWeight: 800, fontSize: '14.5px', letterSpacing: '-0.3px' }}>Relay Arc</span>
              </div>
              <p style={{ color: T3, fontSize: '13px', lineHeight: 1.65 }}>
                Emergency infrastructure for the places it never reached.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '64px', flexWrap: 'wrap' }}>
              <div>
                <p style={{ color: T3, fontFamily: mono, fontSize: '10px', fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase', marginBottom: '14px' }}>Product</p>
                {[['features', 'Features'], ['log', 'How it works'], ['for-whom', "Who it's for"]].map(([id, label]) => (
                  <button key={id} onClick={() => scrollTo(id)}
                    style={{ display: 'block', background: 'none', border: 'none', color: T2, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', padding: 0, marginBottom: '10px' }}>
                    {label}
                  </button>
                ))}
              </div>
              <div>
                <p style={{ color: T3, fontFamily: mono, fontSize: '10px', fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase', marginBottom: '14px' }}>Company</p>
                <button onClick={() => scrollTo('mission')}
                  style={{ display: 'block', background: 'none', border: 'none', color: T2, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', padding: 0, marginBottom: '10px' }}>
                  Mission
                </button>
                <a href="/login" style={{ display: 'block', color: T2, fontSize: '13px', textDecoration: 'none', marginBottom: '10px' }}>Sign in</a>
                <a href="/login?signup=1" style={{ display: 'block', color: T2, fontSize: '13px', textDecoration: 'none' }}>Create account</a>
              </div>
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: '22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <p style={{ color: T3, fontSize: '12px', fontFamily: mono }}>© {new Date().getFullYear()} Relay Arc</p>
            <p style={{ color: T3, fontSize: '12px' }}>
              Not a substitute for emergency services. In immediate danger, call your local emergency number.
            </p>
          </div>
        </div>
      </footer>

      <style>{`
        .nav-link:hover { color: ${T1} !important; }
        @keyframes sos-pulse-lp {
          0%, 100% { box-shadow: 0 0 0 0 rgba(217,20,20,0.35); }
          50% { box-shadow: 0 0 0 12px rgba(217,20,20,0); }
        }
        @keyframes dot-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.25; }
        }
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track { display: flex; width: max-content; animation: ticker-scroll 42s linear infinite; }
        .ticker-track:hover { animation-play-state: paused; }
        .race-left { border-right: 1px solid rgba(255,255,255,0.08); }
        @media (max-width: 960px) {
          .hero-grid { grid-template-columns: 1fr !important; gap: 56px !important; }
          .hero-copy { padding-bottom: 0 !important; }
          .phone-col { margin-bottom: 40px !important; }
          .split-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .split-sticky { position: static !important; }
          .float-card { display: none !important; }
          .route-svg { display: none !important; }
        }
        @media (max-width: 720px) {
          .desktop-nav { display: none !important; }
          .desktop-only { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
          .features-items { grid-template-columns: 1fr !important; }
          .who-row { grid-template-columns: 1fr !important; gap: 8px !important; padding: 20px 0 !important; }
          .log-row { grid-template-columns: 1fr !important; gap: 6px !important; }
          .log-time { text-align: left !important; display: flex; gap: 10px; align-items: baseline; }
          .log-spine { display: none !important; }
          .log-dot { display: none !important; }
          .log-row > div:last-child { padding-left: 0 !important; }
          .log-verdict { padding-left: 0 !important; }
          .race-grid { grid-template-columns: 1fr !important; }
          .race-left { border-right: none !important; border-bottom: 1px solid rgba(255,255,255,0.08); }
        }
      `}</style>
    </div>
  )
}
