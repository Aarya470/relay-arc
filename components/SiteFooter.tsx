// Shared footer for the public pages: the same dark close as the homepage.
import Link from 'next/link'

const COLS: [string, [string, string][]][] = [
  ['The app', [['Start free', '/login?signup=1'], ['Sign in', '/login'], ['Live demo', '/demo'], ['Features', '/features']]],
  ['Free tools', [['Emergency card', '/card'], ['POTS flare check', '/flare'], ['ER rights', '/rights'], ['CPR coach', '/emergency/cpr']]],
  ['How it works', [['Engineering', '/engineering'], ['Changelog', '/changelog'], ['Status', '/status'], ['Source code', 'https://github.com/Aarya470/relay-arc']]],
  ['Project', [['Partners', '/partners'], ['Donate', '/donate'], ['Accessibility', '/accessibility'], ['Contact', 'mailto:relay.arc.org@gmail.com']]],
  ['Legal', [['Privacy', '/privacy'], ['Terms', '/terms']]],
]

export default function SiteFooter() {
  return (
    <footer className="sf">
      <div className="sf-in">
        <div className="sf-cols">
          {COLS.map(([t, links]) => (
            <nav key={t} aria-label={t}>
              <p className="sf-h">{t}</p>
              {links.map(([l, h]) => (
                <Link key={h} href={h}>{l}</Link>
              ))}
            </nav>
          ))}
        </div>
        <a href="https://www.google.com/preferences/source?q=relay-arc.org" target="_blank" rel="noopener noreferrer" className="sf-pref">
          <span className="pref-star" aria-hidden>★</span>
          <span>
            <span className="sf-pref-k">Get Relay Arc first on Google</span>
            <strong>Add as a preferred source</strong>
          </span>
        </a>
        <p className="sf-small">
          Relay Arc helps you decide what to do. It does not diagnose. In an emergency, call 911 first. A free
          nonprofit project with no ads and no trackers.
        </p>
        <p className="sf-word" aria-hidden>Relay Arc</p>
      </div>
    </footer>
  )
}
