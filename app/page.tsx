'use client'
// Homepage.
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Phone } from '@/lib/plain-icons'
import FollowLinks from '@/components/FollowLinks'
import VideoEmbed from '@/components/VideoEmbed'
import Mark from '@/components/Mark'

const BG2 = '#B3DDAC'
const PAGE = '#B3DDAC'
const T1 = '#141413'
const T2 = '#3F3D36'
const T3 = '#5C5A52'
const BORDER = '#98C890'
const RULE = 'rgba(20,20,19,0.18)'
const RED = '#A33417'
const GREEN = '#42623C'

// ─── Phone mockup ───────────────────────────────────────────────────────────
// Deliberately plain: a phone outline and the home screen as it really looks.
// The earlier version had a dot grid, a dashed route line, floating cards and
// a soft drop shadow, which read as a generated hero image rather than an app.
function PhoneMockup() {
  const row = (label: string, value: string, done = false) => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '11px 0',
        borderTop: `1px solid ${BORDER}`,
      }}
    >
      <span style={{ color: T1, fontSize: '12.5px', fontWeight: 600 }}>{label}</span>
      <span style={{ color: done ? GREEN : T3, fontSize: '11.5px', fontWeight: 600 }}>{value}</span>
    </div>
  )
  return (
    <div
      style={{
        width: '280px',
        margin: '0 auto',
        borderRadius: '40px',
        background: '#141413',
        padding: '9px',
      }}
      className="phone-wrap"
    >
      <div
        style={{
          position: 'relative',
          borderRadius: '32px',
          background: BG2,
          padding: '14px 18px 26px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '10px',
            transform: 'translateX(-50%)',
            width: '78px',
            height: '22px',
            borderRadius: '4px',
            background: '#141413',
          }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            height: '24px',
            marginBottom: '22px',
          }}
        >
          <span style={{ color: T1, fontSize: '11.5px', fontWeight: 600 }}>9:41</span>
          <span
            style={{
              width: '20px',
              height: '9px',
              border: `1.2px solid ${T1}`,
              borderRadius: '3px',
              display: 'inline-block',
            }}
          />
        </div>

        <p style={{ color: T3, fontSize: '11px', marginBottom: '2px' }}>Good morning</p>
        <p
          style={{
            color: T1,
            fontSize: '24px',
            fontWeight: 800,
            lineHeight: 1.1,
            marginBottom: '18px',
          }}
        >
          Asha
        </p>

        <div
          style={{
            background: RED,
            borderRadius: '4px',
            padding: '18px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '18px',
          }}
        >
          <div>
            <p style={{ color: 'white', fontSize: '26px', fontWeight: 800, lineHeight: 1 }}>SOS</p>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '10.5px', marginTop: '5px' }}>
              Hold to start
            </p>
          </div>
          <Phone size={20} color="white" />
        </div>

        {row('Daily check-in', 'Done', true)}
        {row('Vitals check', 'Pulse 72')}
        {row('Medications', '1 due')}
        {row('Emergency card', 'Ready', true)}

        <div
          style={{
            width: '90px',
            height: '4px',
            borderRadius: '2px',
            background: '#141413',
            margin: '22px auto 0',
            opacity: 0.8,
          }}
        />
      </div>
    </div>
  )
}

const FEATURES: [string, string][] = [
  [
    'SOS that picks the right hospital',
    'Say or type what is happening. Relay Arc ranks nearby hospitals by real drive time and by whether they can treat it, not just by distance.',
  ],
  [
    'Everyone finds out at once',
    'Your family gets a text and a live map. The hospital gets your blood type, allergies and medications before you arrive.',
  ],
  [
    'Works with no signal',
    'The emergency card and the part that works out what is wrong both run on the phone itself.',
  ],
  [
    'Your phone as a sensor',
    'Measure pulse with the camera and breathing with the motion sensor, then show a doctor the numbers.',
  ],
  ['A short daily check-in', 'A two-minute chat that notices when things are changing.'],
]

const PARTNERS: [string, string][] = [
  [
    'BBSCA',
    'Nonprofit that has raised over $1.2M for STEM and humanitarian causes. Has shared Relay Arc with 4,000+ people.',
  ],
  [
    'East Windsor Board of Education',
    'In discussion about bringing Relay Arc into the district. Not a formal partnership yet.',
  ],
  ['Aerox Labs', 'AI startup that reviewed our models and methodology.'],
]

export default function Home() {
  const router = useRouter()

  // Signed-in visitors go straight to their dashboard. The page still renders
  // first so search engines (which do not run this effect) see real content.
  useEffect(() => {
    const check = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .single()
      router.replace(data ? '/dashboard' : '/onboarding')
    }
    check()
  }, [router])

  const link: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: T1,
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    padding: '6px 0',
  }
  const btn = (primary: boolean): React.CSSProperties => ({
    background: primary ? T1 : 'transparent',
    color: primary ? '#FFFFFF' : T1,
    border: `1.5px solid ${T1}`,
    borderRadius: '4px',
    padding: '14px 24px',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
  })
  const h2: React.CSSProperties = {
    fontSize: '26px',
    fontWeight: 800,
    color: T1,
    margin: '0 0 18px',
    letterSpacing: '-0.3px',
  }
  const section: React.CSSProperties = {
    background: '#FFFFFF',
    borderRadius: '4px',
    padding: '32px 28px',
    margin: '0 0 20px',
    boxShadow: '0 2px 10px rgba(20,20,19,0.06)',
  }

  return (
    <div style={{ background: PAGE, minHeight: '100dvh', color: T1 }}>
      <style>{`
        .hp-wrap { max-width: 980px; margin: 0 auto; padding: 0 24px; }
        .hp-hero { display: grid; grid-template-columns: 1fr 300px; gap: 56px; align-items: center; padding: 56px 0 64px; }
        .hp-nav-links { display: flex; gap: 22px; align-items: center; }
        .hp-tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; }
        @media (min-width: 481px) { .hp-mark-sm { display: none; } }
        @media (max-width: 480px) { .hp-name { display: none !important; } .hp-nav-links { gap: 14px; } .hp-nav-links button { font-size: 14px !important; } }
        @media (max-width: 760px) {
          .hp-hero { grid-template-columns: 1fr; gap: 40px; padding: 36px 0 48px; }
          .hp-hide-sm { display: none !important; }
        }
      `}</style>

      <div className="hp-wrap">
        {/* top bar */}
        <nav
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 20px',
            margin: '16px 0 0',
            background: '#FFFFFF',
            borderRadius: '4px',
            boxShadow: '0 2px 10px rgba(20,20,19,0.06)',
          }}
        >
          <button
            onClick={() => router.push('/')}
            style={{
              ...link,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '18px',
              fontWeight: 800,
            }}
          >
            <img
              src="/logo-wordmark.png"
              alt="Relay Arc"
              className="hp-name"
              style={{ height: '30px', width: 'auto', display: 'block' }}
            />
            <span className="hp-mark-sm">
              <Mark size={30} />
            </span>
          </button>
          <div className="hp-nav-links">
            <button onClick={() => router.push('/features')} style={link}>
              Features
            </button>
            <button onClick={() => router.push('/engineering')} style={link}>
              Engineering
            </button>
            <button onClick={() => router.push('/partners')} style={link}>
              Partners
            </button>
            <button
              onClick={() =>
                document.getElementById('video')?.scrollIntoView({ behavior: 'smooth' })
              }
              style={link}
            >
              Video
            </button>
            <button onClick={() => router.push('/demo')} style={link} className="hp-hide-sm">
              Demo
            </button>
            <button onClick={() => router.push('/donate')} style={link} className="hp-hide-sm">
              Donate
            </button>
            <button onClick={() => router.push('/login')} style={link}>
              Sign in
            </button>
          </div>
        </nav>

        {/* hero */}
        <div className="hp-hero">
          <div>
            <h1
              style={{
                fontSize: 'clamp(36px, 6vw, 54px)',
                fontWeight: 800,
                lineHeight: 1.08,
                letterSpacing: '-0.8px',
                margin: '0 0 18px',
              }}
            >
              Free emergency help for families far from a hospital.
            </h1>
            <p
              style={{
                fontSize: '19px',
                lineHeight: 1.55,
                color: T2,
                margin: '0 0 28px',
                maxWidth: '560px',
              }}
            >
              Press SOS and Relay Arc spots the emergency, picks the nearest hospital that can treat
              it, guides you there, and texts your family your live location. It also keeps an
              offline emergency card, checks pulse and breathing, and runs in any phone&apos;s
              browser.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={() => router.push('/card')} style={btn(true)}>
                Make an emergency card
              </button>
              <button onClick={() => router.push('/login?signup=1')} style={btn(false)}>
                Sign up free
              </button>
            </div>
            <p style={{ fontSize: '14px', color: T3, marginTop: '14px' }}>
              The card takes two minutes. No account needed.
            </p>
          </div>
          <PhoneMockup />
        </div>

        {/* demo video */}
        <section id="video" style={section}>
          <h2 style={h2}>A simple demonstration</h2>
          <VideoEmbed id="ozCUg87GAto" title="Relay Arc demonstration" />
        </section>

        {/* what it does */}
        <section style={section}>
          <h2 style={h2}>What it does</h2>
          <div className="hp-tiles">
            {FEATURES.map(([t, d]) => (
              <div key={t} style={{ background: '#EEF7EC', borderRadius: '4px', padding: '18px 18px' }}>
                <p style={{ fontSize: '17px', fontWeight: 700, marginBottom: '6px' }}>{t}</p>
                <p style={{ fontSize: '15px', lineHeight: 1.55, color: T2 }}>{d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* how it works */}
        <section style={section}>
          <h2 style={h2}>How it works</h2>
          <ol
            style={{
              paddingLeft: '22px',
              fontSize: '17px',
              lineHeight: 1.7,
              color: T2,
              maxWidth: '680px',
            }}
          >
            <li>
              Set up your profile or emergency card once: medications, allergies, blood type and who
              to call.
            </li>
            <li>In an emergency, press SOS and say or type what is happening.</li>
            <li>
              Relay Arc picks a hospital, starts directions, and sends your details to the hospital
              and your family. If help is far away, it tells you to call 911 first.
            </li>
          </ol>
        </section>

        {/* partners */}
        <section style={section}>
          <h2 style={h2}>Who we work with</h2>
          {PARTNERS.map(([t, d]) => (
            <p
              key={t}
              style={{
                fontSize: '16px',
                lineHeight: 1.6,
                color: T2,
                marginBottom: '10px',
                maxWidth: '680px',
              }}
            >
              <strong style={{ color: T1 }}>{t}.</strong> {d}
            </p>
          ))}
          <a
            href="/partners"
            style={{
              color: T1,
              fontSize: '15px',
              fontWeight: 600,
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
            }}
          >
            All partnerships
          </a>
        </section>

        {/* footer */}
        <footer
          style={{
            padding: '20px 4px 48px',
            fontSize: '14px',
            color: T3,
          }}
        >
          <p style={{ marginBottom: '14px', color: T2, maxWidth: '680px' }}>
            Relay Arc helps with decisions; it is not a diagnosis. In an emergency, call 911 first.
          </p>
          <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {[
              ['Video', '#video'],
              ['Features', '/features'],
              ['Engineering', '/engineering'],
              ['Partnerships', '/partners'],
              ['Demo', '/demo'],
              ['Donate', '/donate'],
              ['Privacy', '/privacy'],
              ['Terms', '/terms'],
              ['Status', '/status'],
            ].map(([l, h]) => (
              <a
                key={h}
                href={h}
                style={{ color: T1, textDecoration: 'underline', textUnderlineOffset: '3px' }}
              >
                {l}
              </a>
            ))}
          </div>
          <FollowLinks tone="light" variant="inline" />
          <p style={{ marginTop: '16px' }}>© {new Date().getFullYear()} Relay Arc</p>
        </footer>
      </div>
    </div>
  )
}
