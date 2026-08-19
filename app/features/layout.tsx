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
  title: 'How Relay Arc works, feature by feature',
  description: 'On-device emergency triage in 0.07 ms with no signal, hospital ranking by real drive time and capability rather than distance, and your medical record sent to the receiving facility before the car moves.',
  alternates: { canonical: '/features' },
  openGraph: {
    title: 'How Relay Arc works, feature by feature',
    description: 'On-device emergency triage in 0.07 ms with no signal, hospital ranking by real drive time and capability rather than distance, and your medical record sent to the receiving facility before the car moves.',
    url: '/features',
    type: 'website',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
