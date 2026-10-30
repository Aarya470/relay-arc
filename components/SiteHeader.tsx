'use client'
// Plain top bar shared by the public pages: logo on the left, text links on
// the right. Same look as the homepage navigation.
import Link from 'next/link'

const LINKS: [string, string][] = [
  ['Features', '/features'],
  ['Engineering', '/engineering'],
  ['Partnerships', '/partners'],
  ['Sign in', '/login'],
]

export default function SiteHeader() {
  return (
    <header
      style={{
        borderBottom: '1px solid rgba(20,20,19,0.15)',
        padding: '16px 24px',
        background: '#B3DDAC',
      }}
    >
      <div
        style={{
          maxWidth: '1120px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <Link href="/" aria-label="Relay Arc home" style={{ display: 'block' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-wordmark.png"
            alt="Relay Arc"
            style={{ height: '28px', width: 'auto', display: 'block' }}
          />
        </Link>
        <nav style={{ display: 'flex', gap: '18px', flexWrap: 'wrap' }}>
          {LINKS.map(([l, h]) => (
            <Link
              key={h}
              href={h}
              style={{
                color: '#141413',
                fontSize: '15px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              {l}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
