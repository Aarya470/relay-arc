// Per-route metadata.
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Emergency medical ID card. Relay Arc',
  description:
    'Make a free emergency medical card in two minutes. Get a lock-screen image a paramedic can read off a locked phone, plus a printable wallet card. No account, and nothing is uploaded.',
  alternates: { canonical: '/card' },
  openGraph: {
    title: 'Emergency medical ID card. Relay Arc',
    description:
      'Make a free emergency medical card in two minutes. Get a lock-screen image a paramedic can read off a locked phone, plus a printable wallet card. No account, and nothing is uploaded.',
    url: '/card',
    type: 'website',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
