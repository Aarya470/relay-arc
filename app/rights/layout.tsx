// Per-route metadata. See app/card/layout.tsx for why this file exists.
import type { Metadata } from 'next'

const TITLE = 'What an ER owes you if you cannot pay. Relay Arc'
const DESC =
  'An emergency room has to examine and stabilise you regardless of ability to pay, and every nonprofit hospital must have a financial assistance policy you can still apply for months after the visit. What each rule covers, and what it does not.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: '/rights' },
  openGraph: { title: TITLE, description: DESC, url: '/rights', type: 'website' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
