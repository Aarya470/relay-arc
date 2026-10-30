'use client'
import Link from 'next/link'
import SiteHeader from '@/components/SiteHeader'

const INK = '#141413'
const TEXT = '#3F3D36'
const RULE = 'rgba(20,20,19,0.15)'

const SECTIONS: { title: string; body: string; link?: [string, string] }[] = [
  {
    title: 'It works out what is wrong, even with no signal',
    body: 'Type or say what is happening in English, Spanish, Hindi or Marathi. Two small models on the phone decide what kind of emergency it is in under a millisecond. If they are not sure, a larger online model is asked. With no signal, the phone goes with its own best guess.',
  },
  {
    title: 'It picks the hospital that can treat you',
    body: 'The closest hospital is not always the right one. A heart attack needs a hospital that can open a blocked artery, so Relay Arc ranks hospitals by real driving time, traffic, and what they can treat. If the best one is 25 minutes or more away, it tells you to call 911 first.',
  },
  {
    title: 'Your phone measures your vitals',
    body: 'Hold a fingertip over the camera to measure your pulse. Rest the phone on your chest to count breaths. Readings are scored with NEWS2, the early-warning score hospitals use, so a doctor can see exactly where each point came from.',
    link: ['Try the vitals check', '/check'],
  },
  {
    title: 'Your family and the hospital are told',
    body: 'Your family get a text with the hospital and a live location link. Partner hospitals can see your blood type, allergies and medications before you arrive.',
  },
  {
    title: 'Directions are built in',
    body: 'Turn-by-turn directions run inside the app, so the hospital details and your family link are never left behind in another app.',
  },
  {
    title: 'An emergency card with no account',
    body: 'Make a card with your blood type, allergies, medications and who to call. It stays on your phone, works offline, and can be saved as a lock-screen image a paramedic can read.',
    link: ['Make an emergency card', '/card'],
  },
]

export default function Features() {
  return (
    <div style={{ background: '#B3DDAC', minHeight: '100dvh', color: INK }}>
      <SiteHeader />
      <main style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 24px 80px' }}>
        <h1
          style={{
            fontSize: 'clamp(32px, 6vw, 48px)',
            fontWeight: 800,
            lineHeight: 1.1,
            margin: '0 0 16px',
          }}
        >
          What happens after you press SOS
        </h1>
        <p style={{ fontSize: '18px', lineHeight: 1.6, color: TEXT, margin: '0 0 32px' }}>
          Relay Arc is a free emergency app that runs in any phone&apos;s browser. Here is what it
          does.
        </p>

        {SECTIONS.map((s) => (
          <section key={s.title} style={{ borderTop: `1px solid ${RULE}`, padding: '24px 0' }}>
            <h2 style={{ fontSize: '21px', fontWeight: 700, margin: '0 0 8px' }}>{s.title}</h2>
            <p style={{ fontSize: '16px', lineHeight: 1.65, color: TEXT, margin: 0 }}>{s.body}</p>
            {s.link && (
              <Link
                href={s.link[1]}
                style={{
                  display: 'inline-block',
                  marginTop: '10px',
                  color: INK,
                  fontWeight: 600,
                  textDecoration: 'underline',
                }}
              >
                {s.link[0]}
              </Link>
            )}
          </section>
        ))}

        <section style={{ borderTop: `1px solid ${RULE}`, paddingTop: '28px' }}>
          <p style={{ fontSize: '16px', lineHeight: 1.6, color: TEXT, margin: '0 0 16px' }}>
            Relay Arc helps with decisions. It does not diagnose. In an emergency, call 911 first.
          </p>
          <Link
            href="/login?signup=1"
            style={{
              display: 'inline-block',
              background: INK,
              color: '#FFFFFF',
              fontWeight: 700,
              padding: '12px 22px',
              borderRadius: '8px',
              textDecoration: 'none',
            }}
          >
            Sign up free
          </Link>
        </section>
      </main>
    </div>
  )
}
