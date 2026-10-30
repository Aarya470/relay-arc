// Per-route metadata.
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Support Relay Arc',
  description:
    'Relay Arc is free and there is nothing to buy. If you want to help cover what it costs to run, this is where.',
  alternates: { canonical: '/donate' },
  openGraph: {
    title: 'Support Relay Arc',
    description:
      'Relay Arc is free and there is nothing to buy. If you want to help cover what it costs to run, this is where.',
    url: '/donate',
    type: 'website',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
