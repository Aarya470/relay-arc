import type { Metadata } from 'next'
import { Fredoka, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import 'leaflet/dist/leaflet.css'
import { Toaster } from '@/components/ui/sonner'

const fredoka = Fredoka({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
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
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fredoka.variable} ${mono.variable} ${fredoka.className}`}>
        <div className="min-h-[100dvh] w-full max-w-[430px] mx-auto relative bg-[#F2EFE9]">
          {children}
          <Toaster position="top-center" richColors />
        </div>
      </body>
    </html>
  )
}
