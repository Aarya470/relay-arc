// robots.txt, generated.
import type { MetadataRoute } from 'next'
import { abs, DISALLOWED } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: DISALLOWED,
      },
    ],
    sitemap: abs('/sitemap.xml'),
    host: abs('/'),
  }
}
