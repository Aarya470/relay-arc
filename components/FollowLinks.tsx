'use client'
// Follow links, as plain anchors.
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
  const edge = tone === 'dark' ? 'rgba(255,255,255,0.28)' : '#E4E4E7'

  if (variant === 'buttons') {
    return (
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {links.map((l) => (
          <a
            key={l.key}
            href={l.url}
            target="_blank"
            // noopener/noreferrer on every outbound link: without it the target page
            // gets a handle on this window and a referrer it does not need.
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '11px 18px',
              border: `1px solid ${edge}`,
              color: tone === 'dark' ? '#FFFFFF' : '#141413',
              fontSize: '13.5px',
              fontWeight: 700,
              textDecoration: 'none',
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
      {links.map((l) => (
        <a
          key={l.key}
          href={l.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: fg,
            fontSize: '13px',
            textDecoration: 'none',
            borderBottom: `1px solid ${edge}`,
          }}
        >
          {l.label}
        </a>
      ))}
    </div>
  )
}
