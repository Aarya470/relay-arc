'use client'
// /partners: the organisations Relay Arc works with, and exactly where each
// relationship stands. The East Windsor district is still in discussion, so
// the page says so plainly rather than implying a signed partnership.
import SiteHeader from '@/components/SiteHeader'

const T1 = '#141413',
  T2 = '#3F3D36',
  RULE = 'rgba(20,20,19,0.18)'

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
    status: 'In discussion, not a formal partnership yet',
    body: 'We are talking with the East Windsor Board of Education about bringing Relay Arc into the district, so families can learn it before an emergency instead of during one.',
    note: 'Nothing has been signed or approved. This page will be updated if that changes.',
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
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '20px 20px 80px' }}>
        <h1
          style={{
            color: T1,
            fontSize: 'clamp(34px, 6vw, 52px)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
            margin: '28px 0 12px',
          }}
        >
          Partnerships
        </h1>
        <p
          style={{
            color: T2,
            fontSize: '17px',
            lineHeight: 1.6,
            maxWidth: '640px',
            marginBottom: '28px',
          }}
        >
          The organisations we work with, and where each relationship stands.
        </p>
        {PARTNERS.map((p) => (
          <section
            key={p.name}
            style={{
              borderTop: `1px solid ${RULE}`,
              padding: '28px 0',
              display: 'flex',
              gap: '24px',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                width: '150px',
                height: '84px',
                background: '#FFFFFF',
                borderRadius: '16px',
                border: `1px solid ${RULE}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px',
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
                <span
                  style={{ fontSize: '24px', fontWeight: 800, color: T1, letterSpacing: '0.04em' }}
                >
                  {p.name}
                </span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: '260px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: T1, margin: 0 }}>{p.name}</h2>
              <p
                style={{
                  display: 'inline-block',
                  margin: '8px 0 10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: p.note ? '#7A4A00' : '#2F5A2B',
                  background: p.note ? '#FFF3D6' : '#E3F2DF',
                  border: `1px solid ${p.note ? '#E7C77A' : '#A9D3A0'}`,
                  borderRadius: '20px',
                  padding: '3px 12px',
                }}
              >
                {p.status}
              </p>
              <p style={{ fontSize: '16px', lineHeight: 1.65, color: T2, margin: 0 }}>{p.body}</p>
              {p.note && (
                <p
                  style={{
                    fontSize: '14px',
                    lineHeight: 1.6,
                    color: T2,
                    margin: '10px 0 0',
                    fontStyle: 'italic',
                  }}
                >
                  {p.note}
                </p>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
