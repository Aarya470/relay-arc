import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, JetBrains_Mono, Instrument_Serif } from 'next/font/google'
import './globals.css'
import 'leaflet/dist/leaflet.css'
import { Toaster } from '@/components/ui/sonner'
import MeetingAlert from '@/components/MeetingAlert'
import LegalModal from '@/components/LegalModal'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
})

const display = Instrument_Serif({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400'],
  style: ['normal', 'italic'],
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Relay Arc',
  description: 'Cardiac Emergency Platform',
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
        <meta name="theme-color" content="#070710" />
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js')}` }} />
      </head>
      <body className={`${jakarta.variable} ${mono.variable} ${display.variable} ${jakarta.className}`}>
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
