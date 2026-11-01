// Per-route metadata. The page itself is a client component.
import type { Metadata } from 'next'

const TITLE = 'Partners and Supporters | Relay Arc'
const DESC =
  'The organisations that support, review and share Relay Arc, the free emergency app, and exactly where each relationship stands.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: '/partners' },
  openGraph: { title: TITLE, description: DESC, url: '/partners', type: 'website' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
