// Per-route metadata.
//
// The page itself is a client component, and a client component cannot export
// `metadata` — so before this every public page inherited the root layout's
// title and description verbatim. Ten pages sharing one title is close to
// worthless in search: nothing distinguishes them, and nothing matches a query
// more specific than the product name.
//
// A server-component layout that renders only its children is the App Router
// way to attach metadata to a client page without converting it.
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Emergency medical ID card — Relay Arc',
  description: 'Make a free emergency medical card in two minutes. Get a lock-screen image a paramedic can read off a locked phone, plus a printable wallet card. No account, and nothing is uploaded.',
  alternates: { canonical: '/card' },
  openGraph: {
    title: 'Emergency medical ID card — Relay Arc',
    description: 'Make a free emergency medical card in two minutes. Get a lock-screen image a paramedic can read off a locked phone, plus a printable wallet card. No account, and nothing is uploaded.',
    url: '/card',
    type: 'website',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
