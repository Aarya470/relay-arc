// Per-route metadata.
import type { Metadata } from 'next'

const TITLE = 'Is this POTS flare an emergency?. Relay Arc'
const DESC =
  'A free check for a dysautonomia or POTS episode. Walks the warning signs that need an emergency room, compares the episode against your own normal, and gives the counter-manoeuvres that settle most flares. No account, nothing uploaded.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: '/flare' },
  openGraph: { title: TITLE, description: DESC, url: '/flare', type: 'website' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
