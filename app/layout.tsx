import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import 'leaflet/dist/leaflet.css'
import { Toaster } from '@/components/ui/sonner'
import MeetingAlert from '@/components/MeetingAlert'
import LegalModal from '@/components/LegalModal'
import { SITE_URL } from '@/lib/site'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  // Driven by NEXT_PUBLIC_SITE_URL so attaching a custom domain does not require
  // a code change, and so canonical URLs point at one origin rather than being
  // split between the domain and the vercel.app subdomain. See lib/site.ts.
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: '/' },
  title: 'Relay Arc — Cardiac emergency response',
  description: 'Relay detects the cardiac crisis, finds the right hospital for your condition, sends your medical profile ahead, and navigates your family there — in under 60 seconds.',
  openGraph: {
    title: 'Relay Arc — when every minute is the margin',
    description: 'Cardiac emergency response: the right hospital for your condition, your medical records sent ahead, and your family navigated there.',
    url: 'https://relay-arc.vercel.app',
    siteName: 'Relay Arc',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Relay Arc — when every minute is the margin',
    description: 'Cardiac emergency response: the right hospital, records sent ahead, family navigated there.',
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#E4EBD3" />
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js')}` }} />
      </head>
      <body className={`${jakarta.variable} ${mono.variable} ${jakarta.className}`}>
        <div className="min-h-[100dvh] w-full relative" style={{ background: 'var(--bg)' }}>
          {children}
          <LegalModal />
          <MeetingAlert />
          <Toaster position="top-center" richColors />
        </div>
      </body>
    </html>
  )
}
