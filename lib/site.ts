// The site's canonical origin, in one place.
const FALLBACK = 'https://www.relay-arc.org'

function normalise(raw: string | undefined): string {
  if (!raw || !raw.trim()) return FALLBACK
  let u = raw.trim()
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`
  return u.replace(/\/+$/, '')
}

export const SITE_URL = normalise(process.env.NEXT_PUBLIC_SITE_URL)

/** Absolute URL for a path, for sitemaps and canonicals. */
export const abs = (path = '/') => `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`

/**
 * Public, indexable pages. Everything else is either behind a login or is a
 * transient state inside an emergency, and neither belongs in an index.
 *
 * `priority` is a hint, not a ranking lever — it only tells a crawler which
 * pages to revisit first.
 */
export const PUBLIC_ROUTES: {
  path: string
  priority: number
  changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
}[] = [
  { path: '/', priority: 1.0, changeFrequency: 'weekly' },
  { path: '/card', priority: 0.9, changeFrequency: 'monthly' },
  // Both rank high on purpose.
  { path: '/flare', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/rights', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/features', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/partners', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/engineering', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/changelog', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/demo', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/donate', priority: 0.5, changeFrequency: 'yearly' },
  { path: '/status', priority: 0.4, changeFrequency: 'daily' },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
]

/**
 * Kept out of search results. Two different reasons, both deliberate:
 *
 *  - Logged-in surfaces (dashboard, care-team, nurse, admin, settings) would
 *    return a login wall to a crawler, which is a wasted crawl at best.
 *  - Emergency-flow routes are transient states belonging to one incident. A
 *    search result pointing into the middle of someone else's emergency flow is
 *    not a page anyone should land on cold.
 */
export const DISALLOWED = [
  '/api/',
  '/admin',
  '/dashboard',
  '/settings',
  '/onboarding',
  '/login',
  '/nurse',
  '/care-team',
  '/hospital',
  '/driver',
  '/transport',
  '/medical-profile',
  '/medications',
  '/checkin',
  '/vitals',
  '/symptoms',
  '/history',
  '/timeline',
  '/appointment',
  '/appointments',
  '/emergency',
  '/emergency-contacts',
  '/connect-health',
]
