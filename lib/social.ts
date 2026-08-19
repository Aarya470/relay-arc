// Where Relay Arc exists off-site.
//
// HOW TO TURN THESE ON
// Paste the URL. That is the whole job — every follow button and social link on
// the site reads from here, and each one renders only when its URL is non-empty.
// An empty string means the link is hidden rather than broken, so this can ship
// before the accounts exist without ever showing a visitor a dead link.
//
// Use the full canonical URL, e.g.
//   linkedin: 'https://www.linkedin.com/company/relay-arc/'
//   facebook: 'https://www.facebook.com/relayarc'
//   github:   'https://github.com/Aarya470/relay-arc'
export const SOCIAL = {
  linkedin: '',
  facebook: '',
  github: '',
} as const

export type SocialKey = keyof typeof SOCIAL

/** Only the platforms that have actually been set up. */
export function activeSocial(): { key: SocialKey; url: string; label: string; verb: string }[] {
  const meta: Record<SocialKey, { label: string; verb: string }> = {
    linkedin: { label: 'LinkedIn', verb: 'Follow on LinkedIn' },
    facebook: { label: 'Facebook', verb: 'Follow on Facebook' },
    github: { label: 'GitHub', verb: 'View the source' },
  }
  return (Object.keys(SOCIAL) as SocialKey[])
    .filter(k => SOCIAL[k].trim().length > 0)
    .map(k => ({ key: k, url: SOCIAL[k], label: meta[k].label, verb: meta[k].verb }))
}
