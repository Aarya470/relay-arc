'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import FollowLinks from '@/components/FollowLinks'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, ArrowRight, FileText, Heart, MapPin, Menu, Phone, Pill, Route, TrendingDown, Users, Video, X } from 'lucide-react'
import Mark from '@/components/Mark'

// ─── Design tokens — shared with the app ─────────────────────────────────────
const T1     = '#141413'
const T2     = '#5C5A52'
const T3     = '#5C5A52'
const BORDER = '#98C890'
// ─── The green page ─────────────────────────────────────────────────────────
// #57945C. White on it is 3.62:1, which clears the 3:1 bar for LARGE type only
// (>= 24px, or >= 18.66px bold). It does not clear 4.5:1, so no small copy sits
// on the page at all — headlines do, and everything else goes on a panel.
//
// That is not a workaround for the colour. The emergency red and the warning
// amber only hold their 1.66:1 luminance separation on a light surface, so
// alerts belonged on panels regardless; this page colour just forced it.
const PAGE     = '#57945C'
const PAGE_2   = '#3F7345'   // deeper band, 1.55:1 off the page
const RULE     = '#9DC6A1'   // hairline on the page
const PANEL    = '#FFFFFF'   // ink 18.43:1, --crit 6.86:1
const PANEL_2  = '#EDF4EC'   // softer panel, ink 16.46:1
const ON       = '#FFFFFF'   // LARGE type on the page ONLY
const ON_3     = '#E6EBE6'   // 3:1, large decorative type only
const CORAL    = '#F9E6E0'
const INK      = '#141413'   // and this is what panels and orange fills use

const BG2    = '#B3DDAC'     // kept: the phone mockup renders a light app screen
const BG_DEEP = '#95D08B'
const ACCENT = '#42623C'
const RED    = '#A33417'
const GREEN  = '#42623C'
const AMBER  = '#7C5200'
const ORANGE = '#D97757'   // FILL ONLY. 2.96:1 on light, so always dark ink on top

const mono = 'var(--font-mono, monospace)'

const NOISE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E")`
function Noise({ opacity = 0.05 }: { opacity?: number }) {
  return <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: NOISE, opacity, pointerEvents: 'none' }}/>
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
function NavBar({ onSignIn, onGetStarted }: { onSignIn: () => void; onGetStarted: () => void }) {
  const router = useRouter()
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

  const links: [string, string][] = [['log', 'How it works'], ['mission', 'Mission']]

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? 'rgba(255,255,255,0.94)' : 'rgba(237,244,236,0.92)',
        backdropFilter: scrolled ? 'blur(14px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(14px)' : 'none',
        borderBottom: scrolled ? `1px solid ${BORDER}` : '1px solid transparent',
        transition: 'background 0.2s ease, border-color 0.2s ease',
        padding: '0 24px',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: ORANGE }}/>
        <div style={{ maxWidth: '1120px', margin: '0 auto', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <Mark size={26} />
            <span style={{ color: T1, fontWeight: 800, fontSize: '15.5px', letterSpacing: '-0.4px' }}>Relay Arc</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '26px' }} className="desktop-nav">
            {links.map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)} className="nav-link"
                style={{ background: 'none', border: 'none', color: T2, fontSize: '13.5px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', padding: '6px 0' }}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={() => router.push('/features')} className="desktop-only nav-link"
              style={{ background: 'transparent', border: 'none', color: T2, fontSize: '13.5px', fontWeight: 600, padding: '8px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
              Features
            </button>
            <button onClick={() => router.push('/engineering')} className="desktop-only nav-link"
              style={{ background: 'transparent', border: 'none', color: T2, fontSize: '13.5px', fontWeight: 600, padding: '8px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
              Technology
            </button>
            <button onClick={() => router.push('/demo')} className="desktop-only nav-link"
              style={{ background: 'transparent', border: 'none', color: T2, fontSize: '13.5px', fontWeight: 600, padding: '8px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
              Live demo
            </button>
            <button onClick={() => router.push('/donate')} className="desktop-only"
              style={{ background: 'transparent', border: 'none', color: RED, fontSize: '13.5px', fontWeight: 700, padding: '8px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
              Donate
            </button>
            <button onClick={onSignIn} className="desktop-only nav-link"
              style={{ background: 'transparent', border: 'none', color: T2, fontSize: '13.5px', fontWeight: 600, padding: '8px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
              Sign in
            </button>
            <button onClick={() => router.push('/card')}
              style={{ background: ORANGE, color: INK, fontSize: '13.5px', fontWeight: 700, padding: '9px 18px', borderRadius: '4px', cursor: 'pointer', border: 'none', fontFamily: 'inherit' }}>
              Make a card
            </button>
            <button onClick={() => setMenuOpen(o => !o)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}
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
            <button onClick={() => router.push('/card')}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: T1, fontSize: '15px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', padding: '13px 0', borderBottom: `1px solid ${BORDER}` }}>
              Emergency card
            </button>
            <button onClick={() => router.push('/features')}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: T1, fontSize: '15px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', padding: '13px 0', borderBottom: `1px solid ${BORDER}` }}>
              Features
            </button>
            <button onClick={() => router.push('/engineering')}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: T1, fontSize: '15px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', padding: '13px 0', borderBottom: `1px solid ${BORDER}` }}>
              Technology
            </button>
            <button onClick={() => router.push('/demo')}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: T1, fontSize: '15px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', padding: '13px 0', borderBottom: `1px solid ${BORDER}` }}>
              Live demo
            </button>
            <button onClick={() => router.push('/donate')}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: RED, fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', padding: '13px 0', borderBottom: `1px solid ${BORDER}` }}>
              Donate
            </button>
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

// ─── Phone mockup ───────────────────────────────────────────────────────────
// Deliberately plain: a phone outline and the home screen as it really looks.
// The earlier version had a dot grid, a dashed route line, floating cards and
// a soft drop shadow, which read as a generated hero image rather than an app.
function PhoneMockup() {
  const row = (label: string, value: string, done = false) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderTop: `1px solid ${BORDER}` }}>
      <span style={{ color: T1, fontSize: '12.5px', fontWeight: 600 }}>{label}</span>
      <span style={{ color: done ? GREEN : T3, fontSize: '11.5px', fontWeight: 600 }}>{value}</span>
    </div>
  )
  return (
    <div style={{ width: '280px', margin: '0 auto', borderRadius: '40px', background: '#141413', padding: '9px' }} className="phone-wrap">
      <div style={{ position: 'relative', borderRadius: '32px', background: BG2, padding: '14px 18px 26px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: '50%', top: '10px', transform: 'translateX(-50%)', width: '78px', height: '22px', borderRadius: '12px', background: '#141413' }}/>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '24px', marginBottom: '22px' }}>
          <span style={{ color: T1, fontSize: '11.5px', fontWeight: 600 }}>9:41</span>
          <span style={{ width: '20px', height: '9px', border: `1.2px solid ${T1}`, borderRadius: '3px', display: 'inline-block' }}/>
        </div>

        <p style={{ color: T3, fontSize: '11px', marginBottom: '2px' }}>Good morning</p>
        <p style={{ color: T1, fontSize: '24px', fontWeight: 800, lineHeight: 1.1, marginBottom: '18px' }}>Asha</p>

        <div style={{ background: RED, borderRadius: '12px', padding: '18px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div>
            <p style={{ color: 'white', fontSize: '26px', fontWeight: 800, lineHeight: 1 }}>SOS</p>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '10.5px', marginTop: '5px' }}>Hold to start</p>
          </div>
          <Phone size={20} color="white"/>
        </div>

        {row('Daily check-in', 'Done', true)}
        {row('Vitals check', 'Pulse 72')}
        {row('Medications', '1 due')}
        {row('Emergency card', 'Ready', true)}

        <div style={{ width: '90px', height: '4px', borderRadius: '2px', background: '#141413', margin: '22px auto 0', opacity: 0.8 }}/>
      </div>
    </div>
  )
}

// ─── Dispatch log data ────────────────────────────────────────────────────────
const LOG = [
  { t: '19:42:07', d: '+0:00', title: 'SOS held for three seconds', body: '“Chest pain, sweating”. Typed by her son while she sat down.', color: '#A33417' },
  { t: '19:42:19', d: '+0:12', title: 'Cardiac event classified', body: 'Profile, medications and allergy list pulled automatically. No forms.', color: '#7C5200' },
  { t: '19:42:31', d: '+0:24', title: 'Hospital matched by capability', body: 'City Heart Centre: cath lab available, 4.2 km. Family car routed, 11 minutes.', color: '#42623C' },
  { t: '19:42:44', d: '+0:37', title: 'ER brief on the intake desk', body: 'Blood type, allergies, meds, chief complaint. Before the car leaves the lane.', color: '#42623C' },
  { t: '19:53:58', d: '+11:51', title: 'Arrival', body: 'No history recital in a hallway. Straight through triage to the lab.', color: '#42623C' },
]

// ─── With / without — looping split-screen simulation ───────────────────────
const RACE_MS = 19000
const LEFT_EVENTS = [
  { at: 500,   color: 'rgba(255,255,255,0.35)', text: 'Chest pain. Panic sets in' },
  { at: 3000,  color: 'rgba(255,255,255,0.35)', text: 'Googling symptoms, hands shaking' },
  { at: 5500,  color: 'rgba(255,255,255,0.35)', text: 'Calling family. No answer' },
  { at: 8000,  color: 'rgba(255,255,255,0.35)', text: 'Which hospital? Nobody is sure' },
  { at: 10500, color: '#E8A33D', text: 'Ambulance dispatched. ETA 45 min' },
  { at: 13500, color: '#FF6B5E', text: 'Stuck in traffic. Still waiting.' },
]
const RIGHT_EVENTS = [
  { at: 500,   color: '#FF6B5E', text: 'SOS held. “chest pain, sweating”' },
  { at: 2500,  color: '#E8A33D', text: 'Read as cardiac. Profile pulled' },
  { at: 4500,  color: '#7AA7FF', text: 'Heart centre picked. Cath lab free, 4.2 km' },
  { at: 6500,  color: '#7AA7FF', text: 'ER brief on the intake desk' },
  { at: 9000,  color: '#7AA7FF', text: 'Family car en route. Turn-by-turn' },
  { at: 12500, color: '#3DDC97', text: 'Arrived. Straight through triage' },
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
  const leftStatus  = t >= 15500 ? { label: 'Still en route', color: '#FF6B5E', bg: 'rgba(163,52,23,0.16)' }
    : t >= 10500 ? { label: 'Waiting for ambulance', color: '#E8A33D', bg: 'rgba(168,114,0,0.16)' }
    : { label: 'No plan yet', color: 'rgba(255,255,255,0.45)', bg: 'rgba(255,255,255,0.07)' }
  const rightStatus = t >= 12500 ? { label: 'In the cath lab', color: '#3DDC97', bg: 'rgba(86,128,78,0.2)' }
    : t >= 4500 ? { label: 'Routing locked', color: '#7AA7FF', bg: 'rgba(86,128,78,0.18)' }
    : { label: 'SOS active', color: '#FF6B5E', bg: 'rgba(163,52,23,0.16)' }

  const panel = (
    title: string, titleColor: string, events: typeof LEFT_EVENTS,
    sec: number, timerColor: string, status: { label: string; color: string; bg: string },
    cls: string,
  ) => (
    <div className={cls} style={{ padding: '22px 24px 24px', display: 'flex', flexDirection: 'column', minHeight: '316px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '18px' }}>
        <span style={{ color: titleColor, fontSize: '14px', fontWeight: 700 }}>{title}</span>
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
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: status.bg, borderRadius: '3px', padding: '6px 12px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: status.color, animation: status.label === 'Still en route' || status.label === 'SOS active' ? 'dot-blink 1.1s infinite' : 'none' }}/>
          <span style={{ color: status.color, fontSize: '12px', fontWeight: 700 }}>{status.label}</span>
        </span>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ background: T1, overflow: 'hidden', position: 'relative' }}>
        <Noise opacity={0.04}/>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12.5px' }}>Two families, the same chest pain, 7:42 on a Tuesday evening</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '7px', flexShrink: 0 }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FF6B5E', animation: 'dot-blink 1.2s infinite' }}/>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12.5px' }}>Simulation</span>
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', opacity: fading ? 0 : 1, transition: 'opacity 0.7s ease' }} className="race-grid">
          {panel('Without Relay', 'rgba(255,255,255,0.5)', LEFT_EVENTS, leftSec, t >= 15500 ? '#FF6B5E' : 'rgba(255,255,255,0.7)', leftStatus, 'race-left')}
          {panel('With Relay', '#3DDC97', RIGHT_EVENTS, rightSec, t >= 12500 ? '#3DDC97' : 'rgba(255,255,255,0.7)', rightStatus, 'race-right')}
        </div>
      </div>
      {/* Was #C8D4C9 directly on the page green, 2.37:1. Nothing light enough
          to read passes on this background at 11.5px, so the caption moves onto
          a panel and takes the ink colour with it. */}
      <p style={{ color: INK, background: PANEL_2, padding: '8px 12px', fontSize: '12.5px', marginTop: '12px', display: 'inline-block' }}>
        This is a simulation. The timings are illustrative, not measured.
      </p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter()

  // SEARCH VISIBILITY: this used to gate the entire page behind `authChecked`,
  // returning a loading dot until a useEffect resolved the session. useEffect
  // never runs on the server, so the server-rendered HTML was permanently a blank
  // white page containing one 8px dot — no headline, no copy, no links, no
  // headings at all. Every crawler that does not execute JavaScript saw nothing,
  // which is why the site could not be found by searching for it.
  //
  // The redirect is still worth doing, so it still happens; it just no longer
  // decides whether anything renders. A signed-in visitor briefly sees the
  // marketing page before being moved to their dashboard, which is a far better
  // trade than being invisible to search. Do not reintroduce an early return here.
  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase.from('profiles').select('id').eq('id', session.user.id).single()
      router.replace(data ? '/dashboard' : '/onboarding')
    }
    check()
  }, [router])

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  const features = [
    { Icon: Activity,     color: ACCENT, title: 'AI emergency detection',    body: 'Plain-language triage that starts routing instantly, without forms or phone trees.' },
    { Icon: Route,        color: ACCENT, title: 'Condition-matched routing', body: 'A heart attack needs a cath lab and a stroke needs a stroke unit. The closest hospital may have neither. Directions for whoever is driving.' },
    { Icon: FileText,     color: RED,    title: 'ER handoff brief',          body: 'One tap generates a clinical intake note: blood type, allergies, meds, chief complaint.' },
    { Icon: TrendingDown, color: AMBER,  title: 'Crash-risk prediction',     body: 'Your last seven check-ins, scanned for the pattern that tends to precede a bad day.' },
    { Icon: Heart,        color: GREEN,  title: 'Daily check-ins',           body: 'A two-minute conversation each morning that quietly builds a clinical record.' },
    { Icon: Pill,         color: GREEN,  title: 'Medication tracking',       body: 'Doses, reminders, a list the ER sees automatically.' },
    { Icon: Users,        color: AMBER,  title: 'Caregiver live view',       body: 'Share a link. Your family sees everything, live.' },
  ]

  const audiences = [
    { title: 'Cardiac patients',      color: RED,    body: 'Daily check-ins that catch early warnings, an SOS that moves in seconds, and a medical profile that speaks for you when you can’t.' },
    { title: 'Post-surgery patients', color: AMBER,  body: 'A week by week recovery timeline for your procedure, with what is normal and who to call.' },
    { title: 'Families & caregivers', color: GREEN,  body: 'Live routing the moment it happens, a real-time status feed, and the full history to share with doctors afterwards.' },
  ]

  return (
    <div style={{ background: PAGE, overflowX: 'hidden' }}>
      <NavBar onSignIn={() => router.push('/login')} onGetStarted={() => router.push('/login?signup=1')}/>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section style={{ padding: '128px 24px 72px' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: 'easeOut' }}>

            <p style={{ color: T1, fontSize: '15px', fontWeight: 600, marginBottom: '26px' }}>
              For people living with heart conditions or dysautonomia
            </p>

            {/* THE FIRST THING ANYONE SAW WAS AN UNFINISHED SENTENCE.
                Measured at 1440px, before: the headline rendered on three lines,
                not two. At 104px "The closest hospital is not" is about 1156px
                wide, wider than the 980px maxWidth, so it wrapped and left "not"
                stranded on a line by itself. The third line then ran from x=160
                to x=1121, and the phone mockup sits at x=771 with zIndex 5 on
                top of it. So the last two words were painted over. The page
                opened on "The closest hospital is not always the right".
                86px keeps the intended two-line break inside the container, and
                the z-index here means that even if a future change brings the
                two back into contact, the words win and the picture loses. */}
            <h1 style={{ color: ON, fontSize: 'clamp(40px, 6.6vw, 86px)', fontWeight: 800, lineHeight: 0.98, letterSpacing: '-0.045em', marginBottom: '40px', maxWidth: '1120px', position: 'relative', zIndex: 6 }}>
              The closest hospital is not<br/>always the right one.
            </h1>

            <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: '48px', alignItems: 'center' }} className="hero-grid">
              <div className="hero-copy">
                {/* The old line read "It works out what is happening, finds a
                     hospital that can treat it, and sends your medical details
                     ahead." Three verbs, same tense, same length, one after the
                     other. That cadence is the tell people mean when they say
                     copy sounds machine-written, and it was on the first
                     paragraph of the site. Sentences here now run 4, 20, 7 and
                     6 words. */}
                <p style={{ color: T1, fontSize: '17px', lineHeight: 1.65, marginBottom: '36px', maxWidth: '470px' }}>
                  Hold the button down. Your phone decides what is happening and picks a hospital
                  equipped to treat it rather than one that is merely close. Blood type, medicines
                  and allergies go on ahead. None of this needs a signal.
                </p>

                {/* The card is the primary action deliberately. Asking a first-time
                    visitor for an account and a full medical profile before giving
                    them anything is why the funnel leaked; the card pays out in two
                    minutes and the profile is offered as the upgrade. */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '22px', flexWrap: 'wrap', marginBottom: '32px' }}>
                  <button onClick={() => router.push('/card')}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', background: ORANGE, color: INK, fontWeight: 700, fontSize: '15px', padding: '14px 28px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Make an emergency card <span style={{ fontFamily: mono }}>→</span>
                  </button>
                  <button onClick={() => router.push('/login?signup=1')}
                    style={{ background: 'none', border: 'none', color: T1, fontWeight: 600, fontSize: '14.5px', cursor: 'pointer', fontFamily: 'inherit', padding: 0, borderBottom: `2px solid ${T1}`, paddingBottom: '2px' }}>
                    Create your free profile
                  </button>
                </div>

                <p style={{ color: T1, fontSize: '13.5px', lineHeight: 1.7 }}>
                  Takes two minutes. No account, and nothing is uploaded.<br/><button onClick={() => scrollTo('log')} style={{ background: 'none', border: 'none', padding: '2px 0', color: T1, fontWeight: 700, fontSize: '13.5px', fontFamily: 'inherit', cursor: 'pointer', borderBottom: `1px solid ${T1}`, marginTop: '4px' }}>See the same emergency with and without Relay</button>
                </p>
              </div>

              <div style={{ position: 'relative', zIndex: 5, display: 'flex', justifyContent: 'center' }} className="phone-col">
                <PhoneMockup/>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── PLAIN FACTS ──────────────────────────────────────────────
          Was a scrolling marquee of six slogan pairs with ▲ bullets. A ticker
          of claims is one of the most recognisable template patterns on the
          web, and it made the facts read like marketing. Same facts, one line,
          not moving. */}
      <div style={{ borderTop: `2px solid ${INK}`, borderBottom: `1px solid ${INK}`, background: PANEL_2, padding: '16px 24px' }}>
        <p style={{ maxWidth: '1120px', margin: '0 auto', color: T1, fontSize: '14.5px', lineHeight: 1.6 }}>
          Free, and run as a nonprofit. The emergency card needs no account and stays on your phone.
          The triage models work without a signal, in English, Spanish, Hindi and Marathi.
        </p>
      </div>

      {/* ── DISPATCH LOG ─────────────────────────────────────────────── */}
      {/* ── SEE IT, DON'T READ IT ────────────────────────────────────── */}
      <section id="log" style={{ padding: '96px 24px 100px' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <div style={{ borderTop: `2px solid ${T1}`, paddingTop: '12px', marginBottom: '36px' }}>
            <span style={{ color: T1, fontSize: '14px', fontWeight: 700 }}>How it works</span>
          </div>
          <EmergencyRace/>
          <p style={{ color: ON, fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 800, letterSpacing: '-0.03em', marginTop: '36px', textAlign: 'center' }}>
            Twelve minutes with the app. Still waiting without it.
          </p>
        </div>
      </section>

      {/* ── WHAT IT DOES — four lines, no reading ─────────────────────── */}
      <section id="features" style={{ padding: '0 24px 110px' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <div style={{ borderTop: `2px solid ${T1}`, paddingTop: '12px', marginBottom: '40px', display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', alignItems: 'baseline' }}>
            <span style={{ color: T1, fontSize: '14px', fontWeight: 700 }}>What it does</span>
            <button onClick={() => router.push('/features')}
              style={{ background: 'none', border: 'none', color: T1, fontSize: '14px', fontWeight: 600, cursor: 'pointer', padding: '2px 0', borderBottom: `1px solid ${T1}`, fontFamily: 'inherit' }}>
              Each feature in more detail
            </button>
          </div>
          <div className="simple-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '40px 36px' }}>
            {[
              // All four headings used to start with a present-tense verb and run
              // to about the same length. Perfect parallelism across a list is
              // something people notice without being able to name it. These now
              // take four different shapes on purpose: a verb, a noun subject, a
              // possessive, and a fragment whose sentence finishes in the body.
              ['Finds a hospital that can treat it', 'A heart attack needs a cath lab. The closest ER may not have one, and the transfer spends the only minutes that mattered.'],
              ['The ER reads your file first', 'Blood type, medicines and allergies, there before you are.'],
              ['Your family gets the address', 'And the route to it, in one tap.'],
              ['Your phone is the sensor', 'Pulse from the camera, breathing from the motion sensor, scored with NEWS2. No smartwatch needed.'],
            ].map(([title, body], i) => (
              <div key={i} style={{ borderTop: `1px solid ${T1}`, paddingTop: '14px' }}>
                <h3 style={{ color: T1, fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 8px', lineHeight: 1.15 }}>{title}</h3>
                <p style={{ color: T1, fontSize: '14px', lineHeight: 1.55 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── UNDER THE HOOD — four numbers and a door. No essay here; the
             essay lives at /engineering for anyone who wants it. ─────────── */}
      <section style={{ borderTop: `3px solid ${INK}`, borderBottom: `1px solid ${INK}`, background: PANEL_2, padding: '52px 24px 56px' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '30px' }}>
            <span style={{ color: T1, fontSize: '14px', fontWeight: 700 }}>How the decision gets made</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(148px, 1fr))', gap: '28px', marginBottom: '34px' }}>
            {[
              ['0.2 ms', 'to sort the symptoms', 'on your phone, no signal'],
              ['2 models', 'a neural net and a linear model', 'both run on the phone'],
              ['NEWS2', 'the score hospitals use', 'same inputs, same answer'],
              ['76%', 'of cases never touch the cloud', 'the rest ask a cloud model'],
            ].map(([v, k, sub]) => (
              <div key={k} style={{ borderTop: `2px solid ${T1}`, paddingTop: '10px' }}>
                <p style={{ color: T1, fontSize: 'clamp(24px, 3.2vw, 36px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>{v}</p>
                <p style={{ color: T1, fontSize: '13px', fontWeight: 700, marginTop: '8px' }}>{k}</p>
                <p style={{ color: T3, fontSize: '11.5px', lineHeight: 1.5, marginTop: '4px' }}>{sub}</p>
              </div>
            ))}
          </div>

          <button onClick={() => router.push('/engineering')}
            style={{ background: 'none', border: 'none', color: T1, fontWeight: 700, fontSize: '15px', cursor: 'pointer', fontFamily: 'inherit', padding: 0, borderBottom: `2px solid ${T1}`, paddingBottom: '2px' }}>
            Try the live demos
          </button>
        </div>
      </section>

      {/* ── MISSION — three sentences ─────────────────────────────────── */}
      <section id="mission" style={{ background: ORANGE, padding: '96px 24px 104px', position: 'relative', overflow: 'hidden' }}>
        <Noise opacity={0.07}/>
        <div style={{ maxWidth: '1120px', margin: '0 auto', position: 'relative' }}>
          <div style={{ borderTop: `3px solid ${T1}`, paddingTop: '14px', marginBottom: '44px' }}>
            <span style={{ color: T1, fontSize: '14px', fontWeight: 700 }}>Why we built it</span>
          </div>
          <h2 style={{ color: T1, fontSize: 'clamp(36px, 5.2vw, 64px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 0.98, marginBottom: '24px' }}>
            Most places do not<br/>get eight minutes.
          </h2>
          <p style={{ color: 'rgba(20,20,19,0.78)', fontSize: '17px', lineHeight: 1.65, maxWidth: '540px', marginBottom: '14px' }}>
            Eight minutes is the ambulance response time that wealthy cities plan around. Most of
            the world has never had that, and Relay was designed for those places from the start.
          </p>
          <p style={{ color: T1, fontSize: '20px', lineHeight: 1.5, fontWeight: 800, letterSpacing: '-0.01em', maxWidth: '540px' }}>
            So it has to work on a cheap phone with no signal. Most of the design follows from that.
          </p>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section style={{ padding: '96px 24px 110px', borderTop: `3px solid ${INK}`, background: PAGE, overflow: 'hidden' }}>
        <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '64px', alignItems: 'center' }} className="cta-grid">
            <div>
              <h2 style={{ color: ON, fontSize: 'clamp(34px, 5vw, 58px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.0, marginBottom: '18px' }}>
                A paramedic can read it<br/>without your passcode.
              </h2>
              <p style={{ color: INK, fontSize: '16px', lineHeight: 1.65, marginBottom: '32px', maxWidth: '420px' }}>
                Two minutes to fill in. After that it sits on your lock screen and works
                whether or not you are awake to explain anything.
              </p>
              <button onClick={() => router.push('/login?signup=1')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'transparent', color: ON, padding: '15px 32px', borderRadius: '4px', fontWeight: 700, fontSize: '15.5px', border: `2px solid ${ON}`, cursor: 'pointer', fontFamily: 'inherit' }}>
                Set up your free profile <ArrowRight size={15}/>
              </button>
            </div>

            {/* Medical ID card — what the profile actually looks like */}
            <div style={{ transform: 'rotate(-1.5deg)', maxWidth: '360px', justifySelf: 'center' }} className="id-card">
              <div style={{ background: PANEL, border: `1.5px solid ${T1}`, borderRadius: '6px', padding: '22px 24px', boxShadow: '10px 10px 0 rgba(20,20,19,0.14)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', marginBottom: '18px' }}>
                  <p style={{ color: T3, fontFamily: mono, fontSize: '9px', fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase', margin: 0, flex: 1 }}>
                    Medical profile
                  </p>
                  <Mark size={18} />
                </div>
                <p style={{ color: T1, fontSize: '21px', fontWeight: 800, letterSpacing: '-0.6px', marginBottom: '16px' }}>Asha Kulkarni</p>
                <div style={{ display: 'flex', gap: '28px', alignItems: 'flex-end', borderBottom: `1px solid ${RULE}`, paddingBottom: '16px', marginBottom: '14px' }}>
                  <div>
                    <p style={{ color: T3, fontFamily: mono, fontSize: '8.5px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '4px' }}>Blood type</p>
                    <p style={{ color: RED, fontSize: '34px', fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 0.85, margin: 0 }}>B+</p>
                  </div>
                  <div>
                    <p style={{ color: T3, fontFamily: mono, fontSize: '8.5px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '4px' }}>Age</p>
                    <p style={{ color: T1, fontSize: '34px', fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 0.85, margin: 0 }}>61</p>
                  </div>
                  <div>
                    <p style={{ color: T3, fontFamily: mono, fontSize: '8.5px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '4px' }}>Meds</p>
                    <p style={{ color: T1, fontSize: '34px', fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 0.85, margin: 0 }}>4</p>
                  </div>
                </div>
                <div style={{ borderLeft: `3px solid ${RED}`, paddingLeft: '11px', marginBottom: '14px' }}>
                  {/* CORAL is a tint for use ON the red band. On the white ID card it was
                      1.21:1, which is close to invisible, and this is the blood type and
                      the allergy header on a medical card. */}
                  <p style={{ color: RED, fontFamily: mono, fontSize: '8.5px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '3px' }}>Critical. allergies</p>
                  <p style={{ color: T1, fontSize: '13px', fontWeight: 700, margin: 0 }}>Penicillin · Sulfa drugs</p>
                </div>
                <p style={{ color: T3, fontFamily: mono, fontSize: '10px', margin: 0 }}>post-CABG · metoprolol 50mg · updated today</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer style={{ borderTop: `3px solid ${ORANGE}`, padding: '52px 24px 36px', background: T1, position: 'relative', overflow: 'hidden' }}>
        <Noise opacity={0.05}/>
        <div style={{ maxWidth: '1120px', margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '40px', flexWrap: 'wrap', marginBottom: '44px' }}>
            <div style={{ maxWidth: '300px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Mark size={22} />
                <span style={{ color: '#FFFFFF', fontWeight: 800, fontSize: '14.5px', letterSpacing: '-0.3px' }}>Relay Arc</span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', lineHeight: 1.65 }}>
                A free emergency app for people with heart conditions and dysautonomia, run as a nonprofit.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '64px', flexWrap: 'wrap' }}>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.38)', fontFamily: mono, fontSize: '10px', fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase', marginBottom: '14px' }}>Product</p>
                {[['features', 'Features'], ['log', 'How it works']].map(([id, label]) => (
                  <button key={id} onClick={() => scrollTo(id)}
                    style={{ display: 'block', background: 'none', border: 'none', color: 'rgba(255,255,255,0.72)', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', padding: '5px 0', marginBottom: '2px' }}>
                    {label}
                  </button>
                ))}
                <button onClick={() => router.push('/changelog')}
                  style={{ display: 'block', background: 'none', border: 'none', color: 'rgba(255,255,255,0.72)', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', padding: '5px 0', marginBottom: '2px' }}>
                  Changelog
                </button>
              </div>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.38)', fontFamily: mono, fontSize: '10px', fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase', marginBottom: '14px' }}>About</p>
                <button onClick={() => scrollTo('mission')}
                  style={{ display: 'block', background: 'none', border: 'none', color: 'rgba(255,255,255,0.72)', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', padding: '5px 0', marginBottom: '2px' }}>
                  Mission
                </button>
                <a href="/login" style={{ display: 'block', color: 'rgba(255,255,255,0.72)', fontSize: '13px', textDecoration: 'none', padding: '5px 0', marginBottom: '2px' }}>Sign in</a>
                <a href="/login?signup=1" style={{ display: 'block', color: 'rgba(255,255,255,0.72)', fontSize: '13px', textDecoration: 'none', padding: '5px 0', marginBottom: '2px' }}>Create account</a>
                <a href="/donate" style={{ display: 'block', color: '#FF6B5E', fontSize: '13px', fontWeight: 700, textDecoration: 'none', padding: '5px 0', marginBottom: '2px' }}>Donate</a>
                <a href="/demo" style={{ display: 'block', color: 'rgba(255,255,255,0.72)', fontSize: '13px', textDecoration: 'none', padding: '5px 0', marginBottom: '2px' }}>Live demo</a>
                <a href="/status" style={{ display: 'block', color: 'rgba(255,255,255,0.72)', fontSize: '13px', textDecoration: 'none', padding: '5px 0' }}>System status</a>
                {/* Renders nothing until lib/social.ts has a URL. */}
                <div style={{ marginTop: '14px' }}><FollowLinks tone="dark" variant="inline"/></div>
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.14)', paddingTop: '22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', fontFamily: mono }}>© {new Date().getFullYear()} Relay Arc</p>
              <a href="/privacy" style={{ display: 'inline-block', padding: '5px 0', color: 'rgba(255,255,255,0.45)', fontSize: '12px', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>Privacy</a>
              <a href="/terms" style={{ display: 'inline-block', padding: '5px 0', color: 'rgba(255,255,255,0.45)', fontSize: '12px', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>Terms</a>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px' }}>
              Not a substitute for emergency services. In immediate danger, call your local emergency number.
            </p>
          </div>
        </div>
      </footer>

      <style>{`
        .nav-link:hover { color: ${T1} !important; }
        @keyframes sos-pulse-lp {
          0%, 100% { box-shadow: 0 0 0 0 rgba(163,52,23,0.35); }
          50% { box-shadow: 0 0 0 12px rgba(163,52,23,0); }
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
          .phone-col { margin-bottom: 40px !important; margin-top: 0 !important; }
          .split-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .simple-grid { grid-template-columns: 1fr 1fr !important; }
          .split-sticky { position: static !important; }
          .float-card { display: none !important; }
          .route-svg { display: none !important; }
          .log-ghost { display: none !important; }
        }
        @media (max-width: 720px) {
          .desktop-nav { display: none !important; }
          .desktop-only { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
          .features-items { grid-template-columns: 1fr !important; }
          .simple-grid { grid-template-columns: 1fr !important; }
          .cta-grid { grid-template-columns: 1fr !important; gap: 48px !important; }
          .id-card { transform: rotate(0deg) !important; justify-self: start !important; }
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
