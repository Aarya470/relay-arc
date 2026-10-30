// Where Relay Arc exists off-site.
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
    .filter((k) => SOCIAL[k].trim().length > 0)
    .map((k) => ({ key: k, url: SOCIAL[k], label: meta[k].label, verb: meta[k].verb }))
}
