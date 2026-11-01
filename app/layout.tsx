import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import 'leaflet/dist/leaflet.css'
import { Toaster } from '@/components/ui/sonner'
import MeetingAlert from '@/components/MeetingAlert'
import LegalModal from '@/components/LegalModal'
import AuthGate from '@/components/AuthGate'
import Analytics from '@/components/Analytics'
import Reveal from '@/components/Reveal'
import { SITE_URL } from '@/lib/site'
import Motion from '@/components/Motion'

// Fonts are bundled with the app (app/fonts) instead of fetched from Google at
// build time, so a Google Fonts hiccup can no longer fail a deploy.
// next/font/local needs each call written out in full (it is read at build time).
const jakarta = localFont({
  src: [
    { path: './fonts/PlusJakartaSans-400.ttf', weight: '400', style: 'normal' },
    { path: './fonts/PlusJakartaSans-500.ttf', weight: '500', style: 'normal' },
    { path: './fonts/PlusJakartaSans-600.ttf', weight: '600', style: 'normal' },
    { path: './fonts/PlusJakartaSans-700.ttf', weight: '700', style: 'normal' },
    { path: './fonts/PlusJakartaSans-800.ttf', weight: '800', style: 'normal' },
  ],
  variable: '--font-sans',
  display: 'swap',
})

// --font-mono is read by many inline styles; it now points at the same plain font.
const mono = localFont({
  src: [
    { path: './fonts/PlusJakartaSans-400.ttf', weight: '400', style: 'normal' },
    { path: './fonts/PlusJakartaSans-500.ttf', weight: '500', style: 'normal' },
    { path: './fonts/PlusJakartaSans-600.ttf', weight: '600', style: 'normal' },
    { path: './fonts/PlusJakartaSans-700.ttf', weight: '700', style: 'normal' },
    { path: './fonts/PlusJakartaSans-800.ttf', weight: '800', style: 'normal' },
  ],
  variable: '--font-mono',
  display: 'swap',
})

// Real monospace for the few places that need it (an ingest token).
const code = localFont({
  src: [
    { path: './fonts/JetBrainsMono-400.ttf', weight: '400', style: 'normal' },
    { path: './fonts/JetBrainsMono-700.ttf', weight: '700', style: 'normal' },
  ],
  variable: '--font-code',
  display: 'swap',
})

// Without this a phone lays the page out at 980px and shrinks it, which is why a site can
// look "not mobile friendly" even when every breakpoint is correct.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#57945C',
}

export const metadata: Metadata = {
  // Driven by NEXT_PUBLIC_SITE_URL so attaching a custom domain does not require
  // a code change, and so canonical URLs point at one origin rather than being
  // split between the domain and the vercel.app subdomain. See lib/site.ts.
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: '/' },
  title: 'Relay Arc: Free Emergency App That Finds the Right Hospital',
  description:
    'Press SOS and Relay Arc finds the closest hospital that can treat your emergency, guides you there and alerts your family. Free, works offline, no download.',
  applicationName: 'Relay Arc',
  category: 'health',
  robots: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  openGraph: {
    title: 'Relay Arc: the closest hospital is not always the right one',
    description:
      'Press SOS and Relay Arc finds a hospital that can treat your emergency, guides you there and alerts your family. Free, works offline, no download.',
    url: SITE_URL,
    siteName: 'Relay Arc',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Relay Arc: the closest hospital is not always the right one',
    description:
      'Free emergency app: finds a hospital that can treat you, guides you there and alerts your family.',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Relay Arc',
  },
  icons: {
    apple: '/icon-192.png',
  },
}

// Structured data so search engines show the site name, logo and that the app is free.
const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#org`,
      name: 'Relay Arc',
      alternateName: ['RelayArc', 'Relay Arc app'],
      url: SITE_URL,
      logo: `${SITE_URL}/icon-512.png`,
      email: 'relay.arc.org@gmail.com',
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: 'Relay Arc',
      alternateName: ['RelayArc', 'relay-arc.org'],
      url: SITE_URL,
      publisher: { '@id': `${SITE_URL}/#org` },
      inLanguage: 'en-US',
    },
    {
      '@type': 'WebApplication',
      name: 'Relay Arc',
      url: SITE_URL,
      applicationCategory: 'HealthApplication',
      operatingSystem: 'Any (runs in a web browser)',
      browserRequirements: 'Requires JavaScript',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      description:
        'Free emergency web app. Press SOS to find the closest hospital that can treat the emergency, get directions, and alert family. Includes a free offline emergency medical card.',
      publisher: { '@id': `${SITE_URL}/#org` },
    },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD).replace(/</g, '\\u003c') }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js')}`,
          }}
        />
      </head>
      <body
        className={`${jakarta.variable} ${mono.variable} ${code.variable} ${jakarta.className}`}
      >
        <Motion>
          <div className="min-h-[100dvh] w-full relative" style={{ background: 'var(--bg)' }}>
            <AuthGate>{children}</AuthGate>
            <LegalModal />
            <Analytics />
            <Reveal />
            <MeetingAlert />
            <Toaster position="top-center" richColors />
          </div>
        </Motion>
      </body>
    </html>
  )
}
