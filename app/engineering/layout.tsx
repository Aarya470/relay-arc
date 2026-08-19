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
  title: 'The engineering behind Relay Arc — run it yourself',
  description: 'A 94 KB on-device triage classifier with calibrated abstention, and a deterministic NEWS2 deterioration score containing no AI. Both engines run live in your browser, no signup. Includes the benchmark our own model loses.',
  alternates: { canonical: '/engineering' },
  openGraph: {
    title: 'The engineering behind Relay Arc — run it yourself',
    description: 'A 94 KB on-device triage classifier with calibrated abstention, and a deterministic NEWS2 deterioration score containing no AI. Both engines run live in your browser, no signup. Includes the benchmark our own model loses.',
    url: '/engineering',
    type: 'website',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
