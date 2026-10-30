// sitemap.xml, generated from lib/site.ts.
import type { MetadataRoute } from 'next'
import { abs, PUBLIC_ROUTES } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return PUBLIC_ROUTES.map((r) => ({
    url: abs(r.path),
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }))
}
