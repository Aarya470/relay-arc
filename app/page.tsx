'use client'
// Homepage. Each section is a full width colour chapter with one heading, one
// short paragraph and one real piece of the app. See DESIGN.md.
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import FollowLinks from '@/components/FollowLinks'
import VideoEmbed from '@/components/VideoEmbed'

const LEAF = '#B3DDAC'
const MINT = '#DDEFD9'
const PAPER = '#FFFFFF'
const FOREST = '#1E3A23'
const INK = '#141413'
const INK2 = '#3F3D36'
const SOS = '#A33417'
const GREEN = '#42623C'

const NAV: [string, string][] = [
  ['Features', '/features'],
  ['Engineering', '/engineering'],
  ['Partners', '/partners'],
  ['Sign in', '/login'],
]

// One chapter: a full width field of flat colour.
function Chapter({
  id,
  bg,
  fg,
  children,
  tall = true,
}: {
  id?: string
  bg: string
  fg: string
  children: React.ReactNode
  tall?: boolean
}) {
  return (
    <section id={id} className={tall ? 'ch ch-tall' : 'ch'} style={{ background: bg, color: fg }}>
      <div className="ch-in">{children}</div>
    </section>
  )
}

// Heading and paragraph on one side, the app on the other.
function Split({
  title,
  body,
  children,
  flip = false,
  action,
}: {
  title: string
  body: React.ReactNode
  children: React.ReactNode
  flip?: boolean
  action?: React.ReactNode
}) {
  return (
    <div className={flip ? 'split split-flip' : 'split'}>
      <div data-reveal>
        <h2 className="ds-title">{title}</h2>
        <p className="ds-lead" style={{ marginTop: '28px' }}>
          {body}
        </p>
        {action ? <div style={{ marginTop: '36px' }}>{action}</div> : null}
      </div>
      <div data-reveal className="split-media">
        <div>{children}</div>
      </div>
    </div>
  )
}

// The home screen, kept simple: greeting, the SOS button, three rows.
function PhoneHome() {
  const rows: [string, string, boolean][] = [
    ['Daily check in', 'Done', true],
    ['Pulse', '72 bpm', false],
    ['Emergency card', 'Ready', true],
  ]
  return (
    <div className="phone" data-ui aria-label="The Relay Arc home screen">
      <div className="phone-screen">
        <div className="ph-notch" aria-hidden />
        <p style={{ fontSize: '13px', color: INK2, marginTop: '34px' }}>Good morning</p>
        <p style={{ fontSize: '30px', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1 }}>Asha</p>
        <div className="ph-sos">
          <span style={{ fontSize: '40px', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>SOS</span>
          <span style={{ fontSize: '13px', opacity: 0.9, marginTop: '6px' }}>Tap to start</span>
        </div>
        <div className="ph-list">
          {rows.map(([k, v, good]) => (
            <div key={k} className="ph-row">
              <span>{k}</span>
              <span style={{ fontWeight: 700, color: good ? GREEN : INK }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// What the SOS screen says after someone types what is happening.
function SosScreen() {
  return (
    <div data-ui className="sh-cut frag" style={{ background: PAPER, color: INK }}>
      <p style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 22px' }}>
        &ldquo;My dad has chest pain and he is sweating&rdquo;
      </p>
      <div style={{ background: MINT, padding: '18px 20px' }}>
        <p style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em' }}>
          This may be a heart attack
        </p>
        <p className="ds-small" style={{ marginTop: '6px' }}>
          Worked out on the phone in under a second. No signal needed.
        </p>
      </div>
      <div className="sh-slant" style={{ background: SOS, color: '#fff', padding: '16px 24px', marginTop: '16px', fontWeight: 700 }}>
        Call 911 now
      </div>
    </div>
  )
}

// Example ranking for a trip from East Windsor. Drive times are illustrative.
function HospitalList() {
  const rows: [string, string, boolean][] = [
    ['RWJ University Hospital at Hamilton', '17 min', true],
    ['Penn Medicine Princeton Medical Center', '19 min', true],
    ['A closer emergency room', '12 min', false],
  ]
  return (
    <div data-ui className="sh-cut frag" style={{ background: MINT, color: INK }}>
      {rows.map(([name, mins, ok], i) => (
        <div key={name} className="hosp" style={{ background: i === 0 ? PAPER : 'transparent' }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: '16px' }}>{name}</p>
            <p className="ds-small" style={{ color: ok ? GREEN : SOS, fontWeight: 600 }}>
              {ok ? 'Has a heart unit' : 'No heart unit'}
            </p>
          </div>
          <span style={{ fontWeight: 800, fontSize: '18px', whiteSpace: 'nowrap' }}>{mins}</span>
        </div>
      ))}
      <p className="ds-small" style={{ marginTop: '12px', color: INK2 }}>Example trip from East Windsor</p>
    </div>
  )
}

// The text the family gets.
function FamilyText() {
  return (
    <div data-ui className="sh-cut frag" style={{ background: PAPER, color: INK, maxWidth: '420px' }}>
      <div className="bubble">
        Asha pressed SOS. She is going to RWJ University Hospital at Hamilton. Follow her on the
        live map.
      </div>
      <div className="bubble" style={{ marginTop: '10px', fontWeight: 700, textDecoration: 'underline' }}>
        relay-arc.org/live
      </div>
      <div className="sh-pill" style={{ display: 'inline-block', background: MINT, padding: '8px 16px', marginTop: '14px', fontSize: '14px', fontWeight: 600 }}>
        Hospital has her details
      </div>
    </div>
  )
}

// The one live thing: type and watch the card fill in.
function CardMaker() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [blood, setBlood] = useState('')
  const [allergy, setAllergy] = useState('')
  return (
    <div className="maker">
      <div className="maker-form">
        <label className="fld">
          <span>Your name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Asha Patel" maxLength={40} />
        </label>
        <label className="fld">
          <span>Blood type</span>
          <select value={blood} onChange={(e) => setBlood(e.target.value)}>
            <option value="">Choose</option>
            {['O+', 'O−', 'A+', 'A−', 'B+', 'B−', 'AB+', 'AB−'].map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </label>
        <label className="fld">
          <span>Allergies</span>
          <input value={allergy} onChange={(e) => setAllergy(e.target.value)} placeholder="Penicillin" maxLength={60} />
        </label>
        <button className="ds-btn ds-btn-ink sh-slant" onClick={() => router.push('/card')} style={{ marginTop: '8px' }}>
          Make my full card
        </button>
      </div>
      <div data-ui className="sh-cut idcard" aria-live="polite">
        <p style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 20px', minHeight: '34px' }}>
          {name || 'Your name'}
        </p>
        <div style={{ display: 'flex', gap: '32px' }}>
          <div>
            <p className="ds-small" style={{ color: INK2 }}>Blood type</p>
            <p style={{ fontSize: '40px', fontWeight: 800, color: SOS, lineHeight: 1.1 }}>{blood || 'Add'}</p>
          </div>
          <div>
            <p className="ds-small" style={{ color: INK2 }}>Allergies</p>
            <p style={{ fontSize: '18px', fontWeight: 700, marginTop: '8px' }}>{allergy || 'None added'}</p>
          </div>
        </div>
        <p className="ds-small" style={{ marginTop: '22px', color: INK2 }}>Saved on this phone only</p>
      </div>
    </div>
  )
}

// A finished pulse check.
function PulseReadout() {
  const rows: [string, string][] = [
    ['Pulse', '72 a minute'],
    ['Breathing', '16 a minute'],
    ['NEWS2 score', '0, low risk'],
  ]
  return (
    <div data-ui className="sh-cut frag" style={{ background: PAPER, color: INK }}>
      {rows.map(([k, v]) => (
        <div key={k} className="hosp">
          <span style={{ fontWeight: 600 }}>{k}</span>
          <span style={{ fontWeight: 800, fontSize: '18px' }}>{v}</span>
        </div>
      ))}
      <p className="ds-small" style={{ marginTop: '12px', color: INK2 }}>Camera and motion sensor, 15 seconds</p>
    </div>
  )
}

const PARTNERS: [string, string][] = [
  ['BBSCA', 'A nonprofit that has raised over $1.2M for STEM and humanitarian causes. It has shared Relay Arc with more than 4,000 people.'],
  ['Aerox Labs', 'An AI startup that reviewed our models and how we test them.'],
  ['East Windsor Board of Education', 'Talking with us about bringing Relay Arc into the district. This is not a formal partnership yet.'],
]

export default function Home() {
  const router = useRouter()

  // Signed in visitors go to their dashboard. The page still renders first so
  // search engines see real content.
  useEffect(() => {
    const check = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase.from('profiles').select('id').eq('id', session.user.id).single()
      router.replace(data ? '/dashboard' : '/onboarding')
    }
    check()
  }, [router])

  return (
    <div style={{ background: LEAF, color: INK }}>
      <style>{`
        .ch-in { max-width: 1240px; margin: 0 auto; padding: 0 48px; }
        .ch { padding: 136px 0; }
        .ch-tall { display: flex; align-items: center; }
        .ch-tall > .ch-in { width: 100%; }
        .split { display: grid; grid-template-columns: 1fr 1fr; gap: 72px; align-items: center; }
        .split-flip > :first-child { order: 2; }
        .split-media > div { width: 100%; }
        .frag { padding: 28px; }
        .hosp { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 14px 16px; }
        .bubble { background: ${MINT}; padding: 14px 18px; font-size: 17px; line-height: 1.5; border-radius: 18px 18px 18px 0; }
        .phone { width: 300px; margin: 0 auto; background: ${INK}; padding: 10px; border-radius: 48px; }
        .phone-screen { position: relative; background: ${LEAF}; border-radius: 38px; padding: 22px 22px 28px; }
        .ph-notch { position: absolute; top: 12px; left: 50%; transform: translateX(-50%); width: 84px; height: 24px; background: ${INK}; border-radius: 14px; }
        .ph-sos { background: ${SOS}; color: #fff; display: flex; flex-direction: column; justify-content: center; padding: 26px 22px; margin: 20px 0 14px; min-height: 132px; }
        .ph-list { background: ${PAPER}; padding: 4px 16px; }
        .ph-row { display: flex; justify-content: space-between; padding: 14px 0; font-size: 14px; }
        .ph-row + .ph-row { box-shadow: inset 0 1px 0 rgba(20,20,19,0.1); } /* taste-skill-ignore: app UI row divider */
        .nav { display: flex; justify-content: space-between; align-items: center; gap: 24px; padding: 22px 0; }
        .nav-links { display: flex; align-items: center; gap: 28px; }
        .nav-links a { color: ${INK}; font-weight: 600; font-size: 16px; text-decoration: none; padding: 8px 0; }
        .nav-links a:hover { text-decoration: underline; text-underline-offset: 4px; }
        .hero { display: grid; grid-template-columns: 1.45fr 0.55fr; gap: 64px; align-items: center; padding: 64px 0 120px; }
        .maker { display: grid; grid-template-columns: 0.9fr 1.1fr; gap: 56px; align-items: center; }
        .maker-form { display: grid; gap: 16px; }
        .fld { display: grid; gap: 6px; font-size: 16px; font-weight: 600; }
        .fld input, .fld select { height: 52px; padding: 0 16px; border: 0; background: ${PAPER}; font-size: 17px; color: ${INK}; box-shadow: inset 0 -2px 0 ${INK}; } /* taste-skill-ignore: form field underline */
        .fld input:focus, .fld select:focus { outline: 3px solid ${INK}; outline-offset: 2px; }
        .idcard { background: ${PAPER}; padding: 32px; }
        .partner { display: grid; grid-template-columns: 0.8fr 1.2fr; gap: 40px; padding: 28px 0; }
                .foot-links { display: flex; flex-wrap: wrap; gap: 12px 28px; }
        .foot-links a { color: ${INK}; font-weight: 600; text-decoration: none; }
        .foot-links a:hover { text-decoration: underline; text-underline-offset: 4px; }
        .wordmark { font-size: clamp(64px, 17vw, 260px); font-weight: 800; letter-spacing: -0.06em !important; line-height: 1; margin-top: 72px; padding-bottom: 0.08em; white-space: nowrap; }
        .nav-scroll { display: none; }
        .band { display: block; width: 100%; height: min(72vh, 720px); object-fit: cover; }
        .close { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; }
        .close img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; display: block; }
        @media (max-width: 900px) {
          .ch-in { padding: 0 24px; }
          .ch { padding: 80px 0; }
          .ch-tall { min-height: 0; }
          .split, .hero, .maker, .partner, .close { grid-template-columns: 1fr; gap: 40px; }
          .band { height: 46vh; }
          figcaption.ch-in { padding: 12px 24px 24px !important; }
          .split-flip > :first-child { order: 0; }
          .hero { padding: 24px 0 80px; }
          .nav-links .hide-sm { display: none; }
          .nav-scroll { display: flex; gap: 24px; overflow-x: auto; padding-bottom: 12px; }
          .nav-scroll a { color: ${INK}; font-weight: 600; white-space: nowrap; text-decoration: none; }
          .frag { padding: 22px; }
          .partner { gap: 8px; }
        }
      `}</style>

      {/* top bar and opening chapter */}
      <header style={{ background: LEAF }}>
        <div className="ch-in">
          <nav className="nav" aria-label="Main">
            <a href="/" aria-label="Relay Arc home" style={{ display: 'flex', alignItems: 'center' }}>
              <img src="/logo-wordmark.png" alt="Relay Arc" style={{ height: '32px', width: 'auto' }} />
            </a>
            <div className="nav-links">
              {NAV.map(([l, h]) => (
                <a key={h} href={h} className="hide-sm">
                  {l}
                </a>
              ))}
              <a href="/card" className="ds-btn ds-btn-ink sh-slant" style={{ color: '#fff', minHeight: '46px', padding: '0 26px', textDecoration: 'none' }}>
                Make a card
              </a>
            </div>
          </nav>
          <div className="nav-scroll" aria-label="More pages">
            {NAV.map(([l, h]) => (
              <a key={h} href={h}>
                {l}
              </a>
            ))}
          </div>

          <div className="hero">
            <div data-reveal>
              <h1 className="ds-display" style={{ fontSize: 'clamp(44px, 5.6vw, 80px)' }}>
                Free help when the hospital is far
              </h1>
              <p className="ds-lead" style={{ marginTop: '32px' }}>
                Press SOS and Relay Arc spots the emergency, picks the closest hospital that can
                treat it, guides you there, and sends your details to the hospital and your family.
                It also keeps an offline emergency card, checks pulse and breathing, and runs in any
                phone&apos;s browser.
              </p>
              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '40px' }}>
                <a href="/card" className="ds-btn ds-btn-sos sh-slant">
                  Make an emergency card
                </a>
                <a href="/login?signup=1" className="ds-btn ds-btn-line sh-pill">
                  Sign up free
                </a>
              </div>
              <p className="ds-small" style={{ marginTop: '18px', color: INK2 }}>
                The card takes two minutes and needs no account.
              </p>
            </div>
            <div data-reveal>
              <PhoneHome />
            </div>
          </div>
        </div>
      </header>

      <main>
        <figure style={{ margin: 0, background: LEAF }}>
          <img
            src="/places/wharton-forest.jpg"
            alt="A sandy trail through pine trees in Wharton State Forest, New Jersey"
            className="band"
            loading="lazy"
          />
          <figcaption className="ch-in ds-small" style={{ padding: '14px 48px 28px', color: INK2 }}>
            Wharton State Forest in the Pine Barrens, one of the most remote parts of New Jersey.
            Out here the nearest hospital is a long drive away.
          </figcaption>
        </figure>

        <Chapter id="video" bg={INK} fg="#fff" tall={false}>
          <div data-reveal>
            <h2 className="ds-title" style={{ marginBottom: '40px' }}>
              A simple demonstration
            </h2>
            <VideoEmbed id="ozCUg87GAto" title="Relay Arc demonstration" />
          </div>
        </Chapter>

        <Chapter bg={SOS} fg="#fff">
          <Split
            title="Press SOS and say what is happening"
            body="Type it or say it in English, Spanish, Hindi or Marathi. Your phone works out what kind of emergency it is, even with no signal."
          >
            <SosScreen />
          </Split>
        </Chapter>

        <Chapter bg={PAPER} fg={INK}>
          <Split
            flip
            title="It picks a hospital that can treat you"
            body="Relay Arc ranks nearby hospitals by real drive time and by what each one can treat, using New Jersey health department data for heart attacks. When help is 25 minutes or more away, it tells you to call 911 first."
          >
            <HospitalList />
          </Split>
        </Chapter>

        <Chapter bg={FOREST} fg="#fff">
          <Split
            title="Your family knows right away"
            body="One tap texts them the hospital and a live map. The hospital gets your blood type, allergies and medicines before you arrive. Directions open inside the app."
          >
            <FamilyText />
          </Split>
        </Chapter>

        <Chapter id="card" bg={MINT} fg={INK}>
          <div data-reveal style={{ marginBottom: '56px' }}>
            <h2 className="ds-title">A card that works with no signal</h2>
            <p className="ds-lead" style={{ marginTop: '28px' }}>
              Try it here. The full card takes two minutes and needs no account. It stays on your
              phone, and a paramedic can read it from your lock screen.
            </p>
          </div>
          <div data-reveal>
            <CardMaker />
          </div>
        </Chapter>

        <Chapter bg={LEAF} fg={INK}>
          <Split
            flip
            title="Check your pulse with your phone"
            body="Hold a finger over the camera for 15 seconds. Breathing comes from the motion sensor. You get a NEWS2 score a doctor can read, and a short daily check in spots changes early."
          >
            <PulseReadout />
          </Split>
        </Chapter>

        <Chapter id="partners" bg={INK} fg="#fff" tall={false}>
          <div data-reveal>
            <h2 className="ds-title" style={{ marginBottom: '40px' }}>
              Who we work with
            </h2>
          </div>
          {PARTNERS.map(([t, d]) => (
            <div key={t} className="partner" data-reveal>
              <p style={{ fontSize: 'clamp(24px, 2.6vw, 34px)', fontWeight: 800, letterSpacing: '-0.02em' }}>{t}</p>
              <p className="ds-body" style={{ color: 'rgba(255,255,255,0.88)' }}>
                {d}
              </p>
            </div>
          ))}
          <a href="/partners" className="ds-btn ds-btn-line sh-pill" style={{ marginTop: '32px', color: '#fff' }}>
            All partnerships
          </a>
        </Chapter>
      </main>

      <footer style={{ background: LEAF, padding: '120px 0 0', overflow: 'hidden' }}>
        <div className="ch-in">
          <div className="close">
          <div data-reveal>
            <h2 className="ds-title">Ready when you need it</h2>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '36px' }}>
              <a href="/card" className="ds-btn ds-btn-ink sh-slant">
                Make an emergency card
              </a>
              <a href="/login?signup=1" className="ds-btn ds-btn-line sh-pill">
                Sign up free
              </a>
            </div>
          </div>
          <div data-reveal>
            <img
              src="/places/pine-barrens-bog.jpg"
              alt="A cranberry bog and pine forest in the New Jersey Pine Barrens"
              className="sh-cut"
              loading="lazy"
            />
          </div>
          </div>
          <div style={{ marginTop: '96px' }}>
            <div className="foot-links">
              {[
                ['Features', '/features'],
                ['Engineering', '/engineering'],
                ['Partners', '/partners'],
                ['Demo', '/demo'],
                              ['Changelog', '/changelog'],
                ['Status', '/status'],
                ['Privacy', '/privacy'],
                ['Terms', '/terms'],
              ].map(([l, h]) => (
                <a key={h} href={h}>
                  {l}
                </a>
              ))}
            </div>
            <div style={{ marginTop: '20px' }}>
              <FollowLinks tone="light" variant="inline" />
            </div>
            <p className="ds-small" style={{ marginTop: '20px', color: INK2, maxWidth: '640px' }}>
              Relay Arc helps you decide what to do. It does not diagnose. In an emergency, call 911
              first. © {new Date().getFullYear()} Relay Arc, a free nonprofit project.
            </p>
            <p className="ds-small" style={{ marginTop: '10px', color: INK2, maxWidth: '640px' }}>
              Photos from the Pine Barrens. Wharton State Forest trail by RollerFanatic000, CC BY SA
              4.0. Cranberry bog by Andrew Leahey, CC BY SA 2.0. Both via Wikimedia Commons.
            </p>
          </div>
          <div className="wordmark" aria-hidden>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.12em' }}>
              Relay Arc
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
