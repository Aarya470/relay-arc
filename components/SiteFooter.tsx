// Shared footer for the public pages.
import Link from 'next/link'

const LINKS: [string, string][] = [
  ['Emergency card', '/card'],
  ['POTS flare check', '/flare'],
  ['ER rights', '/rights'],
  ['Features', '/features'],
  ['Engineering', '/engineering'],
  ['Partners', '/partners'],
  ['Changelog', '/changelog'],
  ['Status', '/status'],
  ['Accessibility', '/accessibility'],
  ['Privacy', '/privacy'],
  ['Terms', '/terms'],
]

export default function SiteFooter() {
  return (
    <footer className="site-foot">
      <div className="site-foot-in glass">
        <div>
          <p className="site-foot-t">Relay Arc</p>
          <p className="site-foot-s">Free emergency help, no ads and no trackers. It helps you decide what to do and does not diagnose. In an emergency, call 911 first.</p>
          <a href="https://www.google.com/preferences/source?q=relay-arc.org" target="_blank" rel="noopener noreferrer" className="pref-badge">
            <span className="pref-star" aria-hidden>★</span>
            <span>
              <span className="pref-k">Get Relay Arc first on Google</span>
              <strong>Add as a preferred source</strong>
            </span>
          </a>
        </div>
        <nav aria-label="Footer" className="site-foot-links">
          {LINKS.map(([l, h]) => (
            <Link key={h} href={h}>{l}</Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
