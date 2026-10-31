import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import 'leaflet/dist/leaflet.css'
import { Toaster } from '@/components/ui/sonner'
import MeetingAlert from '@/components/MeetingAlert'
import LegalModal from '@/components/LegalModal'
import AuthGate from '@/components/AuthGate'
import Analytics from '@/components/Analytics'
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
  title: 'Relay Arc: emergency help for heart and dysautonomia conditions',
  description:
    'A free app that works out what is happening, finds a hospital that can treat it, and sends your medical details ahead. It works with no signal, and the emergency card needs no account.',
  openGraph: {
    title: 'Relay Arc: the closest hospital is not always the right one',
    description:
      'A free app that works out what is happening, finds a hospital that can treat it, and sends your medical details ahead. No account needed for the emergency card.',
    url: SITE_URL,
    siteName: 'Relay Arc',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Relay Arc: the closest hospital is not always the right one',
    description:
      'A free app that finds a hospital which can treat your condition and sends your medical details ahead.',
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
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
            <MeetingAlert />
            <Toaster position="top-center" richColors />
          </div>
        </Motion>
      </body>
    </html>
  )
}
