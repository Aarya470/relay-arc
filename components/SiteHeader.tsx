'use client'
// Top bar shared by the public pages. Same layout as the homepage: wordmark and
// links on the left, sign in and two actions on the right.
import Link from 'next/link'
import { SearchButton } from '@/components/CommandPalette'

const LINKS: [string, string][] = [
  ['Features', '/features'],
  ['Engineering', '/engineering'],
  ['Partners', '/partners'],
  ['Accessibility', '/accessibility'],
]

export default function SiteHeader() {
  return (
    <header className="sh-wrap">
      <div className="sh-bar glass">
        <div className="sh-l">
          <Link href="/" aria-label="Relay Arc home" style={{ display: 'block' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-wordmark.png" alt="Relay Arc" style={{ height: '30px', width: 'auto', display: 'block' }} />
          </Link>
          <nav className="sh-links" aria-label="Main">
            {LINKS.map(([l, h]) => (
              <Link key={h} href={h}>{l}</Link>
            ))}
          </nav>
        </div>
        <div className="sh-r">
          <Link href="/login" className="sh-signin">Sign in</Link>
          <SearchButton />
          <Link href="/card" className="sh-pill sh-pill-line sh-hide">Make a card</Link>
          <Link href="/login?signup=1" className="sh-pill sh-pill-ink">Start free</Link>
        </div>
      </div>
    </header>
  )
}
