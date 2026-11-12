'use client'
// Plain top bar shared by the public pages. Same look as the homepage.
import Link from 'next/link'

const LINKS: [string, string][] = [
  ['Features', '/features'],
  ['Engineering', '/engineering'],
  ['Partners', '/partners'],
  ['Sign in', '/login'],
]

export default function SiteHeader() {
  return (
    <header style={{ background: '#B3DDAC', padding: '0 24px' }}>
      <style>{`
        .sh-bar { max-width: 1120px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; gap: 16px 28px; flex-wrap: wrap; padding: 22px 0; }
        .sh-links { display: flex; gap: 8px 26px; flex-wrap: wrap; align-items: center; }
        .sh-links a.sh-l { color: #141413; font-size: 16px; font-weight: 600; text-decoration: none; padding: 6px 0; }
        .sh-links a.sh-l:hover { text-decoration: underline; text-underline-offset: 4px; }
        @media (max-width: 640px) { .sh-cta { display: none !important; } }
      `}</style>
      <div className="sh-bar">
        <Link href="/" aria-label="Relay Arc home" style={{ display: 'block' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-wordmark.png" alt="Relay Arc" style={{ height: '30px', width: 'auto', display: 'block' }} />
        </Link>
        <nav className="sh-links" aria-label="Main">
          {LINKS.map(([l, h]) => (
            <Link key={h} href={h} className="sh-l">
              {l}
            </Link>
          ))}
          <Link href="/card" className="ds-btn ds-btn-ink sh-slant sh-cta" style={{ minHeight: '46px', padding: '0 26px' }}>
            Make a card
          </Link>
        </nav>
      </div>
    </header>
  )
}
