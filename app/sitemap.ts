// sitemap.xml, generated from lib/site.ts.
//
// A new site with almost no inbound links is nearly invisible to a crawler that
// has to discover pages by following links. A sitemap is the one way to say
// "these ten URLs exist" directly, which is why this matters more here than it
// would for an established site.
//
// Only public routes are listed. Anything behind a login would return a login
// wall to a crawler, and the emergency-flow routes are transient states rather
// than pages.
import type { MetadataRoute } from 'next'
import { abs, PUBLIC_ROUTES } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return PUBLIC_ROUTES.map(r => ({
    url: abs(r.path),
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }))
}
