import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import 'leaflet/dist/leaflet.css'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({ subsets: ['latin'] })

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
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={inter.className}>
        <div className="min-h-screen w-full max-w-[430px] mx-auto relative bg-[#09090C]">
          {children}
          <Toaster position="top-center" richColors />
        </div>
      </body>
    </html>
  )
}
