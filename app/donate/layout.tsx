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
  title: 'Support Relay Arc',
  description: 'Relay Arc is free and there is nothing to buy. If you want to help cover what it costs to run, this is where.',
  alternates: { canonical: '/donate' },
  openGraph: {
    title: 'Support Relay Arc',
    description: 'Relay Arc is free and there is nothing to buy. If you want to help cover what it costs to run, this is where.',
    url: '/donate',
    type: 'website',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
