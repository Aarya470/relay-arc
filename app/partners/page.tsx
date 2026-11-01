'use client'
// /partners: the organisations Relay Arc works with, and exactly where each
// relationship stands. The East Windsor district is still in discussion, so
// the page says so plainly rather than implying a signed partnership.
import SiteHeader from '@/components/SiteHeader'

const T1 = '#141413',
  T2 = '#3F3D36'

type Partner = { name: string; logo?: string; status: string; body: string; note?: string }
const PARTNERS: Partner[] = [
  {
    name: 'BBSCA',
    status: 'Partner',
    body: 'A nonprofit that has raised more than $1.2 million for STEM and humanitarian causes. BBSCA has shared Relay Arc with more than 4,000 people and sees it as especially useful for rural communities.',
  },
  {
    name: 'East Windsor Regional School District',
    logo: '/partners/ewrsd.png',
    status: 'In discussion',
    body: 'We are talking with the East Windsor Board of Education about bringing Relay Arc into the district, so families learn it before an emergency happens.',
    note: 'Nothing has been signed or approved yet. We will update this page if that changes.',
  },
  {
    name: 'Aerox Labs',
    logo: '/partners/aerox.png',
    status: 'Partner',
    body: 'An AI startup that builds small medical models. Aerox Labs reviewed our models and how we tested them.',
  },
]

export default function Partners() {
  return (
    <div style={{ background: '#B3DDAC', minHeight: '100dvh' }}>
      <SiteHeader />
      <div style={{ maxWidth: '1168px', margin: '0 auto', padding: '56px 24px 72px' }} data-reveal>
        <h1 className="ds-display" style={{ fontSize: 'clamp(44px, 7vw, 96px)' }}>
          Partnerships
        </h1>
        <p className="ds-lead" style={{ marginTop: '24px' }}>
          The groups we work with, and where each one stands.
        </p>
      </div>
      {PARTNERS.map((p, i) => (
        <section
          key={p.name}
          style={{ background: i % 2 === 0 ? '#FFFFFF' : '#DDEFD9', padding: 'clamp(56px, 8vw, 96px) 24px' }}
        >
          <div
            data-reveal
            style={{
              maxWidth: '1120px',
              margin: '0 auto',
              display: 'flex',
              gap: '48px',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <div
              className="sh-cut"
              style={{
                width: '240px',
                height: '140px',
                background: i % 2 === 0 ? '#DDEFD9' : '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                flexShrink: 0,
              }}
            >
              {p.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.logo}
                  alt={`${p.name} logo`}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              ) : (
                <span style={{ fontSize: '32px', fontWeight: 800, color: T1 }}>{p.name}</span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: '260px' }}>
              <h2 className="ds-title" style={{ fontSize: 'clamp(30px, 4vw, 52px)' }}>
                {p.name}
              </h2>
              <p
                className="sh-pill"
                style={{
                  display: 'inline-block',
                  margin: '16px 0 18px',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  background: p.note ? '#7C5200' : '#1E3A23',
                  padding: '6px 16px',
                }}
              >
                {p.status}
              </p>
              <p className="ds-body" style={{ color: T1 }}>
                {p.body}
              </p>
              {p.note && (
                <p className="ds-small" style={{ color: T2, marginTop: '12px' }}>
                  {p.note}
                </p>
              )}
            </div>
          </div>
        </section>
      ))}
    </div>
  )
}
