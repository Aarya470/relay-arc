import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Live demo: Relay Arc',
  description: 'Walk through an emergency in Relay Arc without creating an account. Nothing here contacts a real hospital or a real emergency service.',
  alternates: { canonical: '/demo' },
  // A demo of an emergency flow is not a useful search result for someone in
  // one, so it stays out of the index while remaining shareable by link.
  robots: { index: false, follow: true },
}

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children
}
