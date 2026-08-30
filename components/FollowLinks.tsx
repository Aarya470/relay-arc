'use client'
// Follow links, as plain anchors.
//
// WHY NOT LINKEDIN'S OFFICIAL FOLLOW BADGE
// LinkedIn's badge works by loading platform.linkedin.com/in.js. Two reasons not
// to:
//
//  1. It is a third-party tracking script. Embedding it would hand LinkedIn a
//     record of every visitor to a cardiac emergency app, including people who
//     arrived to read about their own condition. That is a worse privacy trade
//     than any follower count is worth, and it contradicts what /card promises
//     on its face.
//  2. The site's Content-Security-Policy only permits scripts from 'self' and the
//     video-call domains. The badge would be blocked, and the fix would be
//     widening the CSP for an analytics script — the opposite of the direction
//     this project should move.
//
// A styled anchor does the same job: one click to the Page, one follow. No script,
// no CSP change, nothing observed.
//
// Renders nothing at all when lib/social.ts has no URLs set, so this can ship
// before the accounts exist.
import { activeSocial } from '@/lib/social'

type Props = {
  /** 'dark' for the footer over ink, 'light' for cream sections. */
  tone?: 'dark' | 'light'
  /** Full call-to-action buttons, or compact inline text links. */
  variant?: 'buttons' | 'inline'
}

export default function FollowLinks({ tone = 'dark', variant = 'inline' }: Props) {
  const links = activeSocial()
  if (links.length === 0) return null

  const fg = tone === 'dark' ? 'rgba(255,255,255,0.72)' : '#5C5A52'
  const edge = tone === 'dark' ? 'rgba(255,255,255,0.28)' : '#DCE1D0'

  if (variant === 'buttons') {
    return (
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {links.map(l => (
          <a
            key={l.key}
            href={l.url}
            target="_blank"
            // noopener/noreferrer on every outbound link: without it the target page
            // gets a handle on this window and a referrer it does not need.
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '11px 18px', border: `1px solid ${edge}`,
              color: tone === 'dark' ? '#FFFFFF' : '#141413',
              fontSize: '13.5px', fontWeight: 700, textDecoration: 'none',
            }}
          >
            {l.verb}
          </a>
        ))}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
      {links.map(l => (
        <a
          key={l.key}
          href={l.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: fg, fontSize: '13px', textDecoration: 'none',
            borderBottom: `1px solid ${edge}`,
          }}
        >
          {l.label}
        </a>
      ))}
    </div>
  )
}
