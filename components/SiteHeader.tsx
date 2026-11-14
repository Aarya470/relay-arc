'use client'
// Plain top bar shared by the public pages. Same look as the homepage.
import Link from 'next/link'
import { SearchButton } from '@/components/CommandPalette'

const LINKS: [string, string][] = [
  ['Features', '/features'],
  ['Engineering', '/engineering'],
  ['Partners', '/partners'],
  ['Sign in', '/login'],
]

export default function SiteHeader() {
  return (
    <header style={{ padding: '0 16px', height: '88px' }}>
      <style>{`
        .sh-bar { position: fixed; top: 12px; left: 16px; right: 16px; max-width: 1168px; margin: 0 auto; z-index: 60; display: flex; justify-content: space-between; align-items: center; gap: 12px 22px; padding: 10px 12px 10px 22px; border-radius: 999px; }
        @media (max-width: 900px) { .sh-l { display: none; } }
        .sh-links { display: flex; gap: 8px 26px; flex-wrap: wrap; align-items: center; }
        .sh-links a.sh-l { color: #141413; font-size: 16px; font-weight: 600; text-decoration: none; padding: 6px 0; }
        .sh-links a.sh-l:hover { text-decoration: underline; text-underline-offset: 4px; }
        @media (max-width: 640px) { .sh-cta { display: none !important; } }
      `}</style>
      <div className="sh-bar glass">
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
          <SearchButton />
          <Link href="/card" className="ds-btn ds-btn-ink sh-slant sh-cta" style={{ minHeight: '42px', padding: '0 22px' }}>
            Make a card
          </Link>
        </nav>
      </div>
    </header>
  )
}
