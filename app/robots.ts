// robots.txt, generated.
//
// There was no robots.txt at all before this, which is not itself fatal — an
// absent file means "crawl freely" — but it meant nothing pointed a crawler at a
// sitemap, and nothing kept crawlers out of the logged-in half of the app.
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
