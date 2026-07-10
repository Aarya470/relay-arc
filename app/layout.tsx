import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
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

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Relay Arc — Cardiac emergency response',
  description: 'Relay detects the cardiac crisis, finds the right hospital for your condition, sends your medical profile ahead, and navigates your family there — in under 60 seconds.',
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
        <meta name="theme-color" content="#F4F5F7" />
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
