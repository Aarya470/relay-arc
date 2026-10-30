// Per-route metadata.
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'The engineering behind Relay Arc. Run it yourself',
  description:
    'A 153 KB on-device triage ensemble (logistic regression plus a small neural network) with calibrated abstention, and a deterministic NEWS2 deterioration score containing no AI. Both engines run live in your browser, no signup. Includes the benchmark our own model loses.',
  alternates: { canonical: '/engineering' },
  openGraph: {
    title: 'The engineering behind Relay Arc. Run it yourself',
    description:
      'A 153 KB on-device triage ensemble (logistic regression plus a small neural network) with calibrated abstention, and a deterministic NEWS2 deterioration score containing no AI. Both engines run live in your browser, no signup. Includes the benchmark our own model loses.',
    url: '/engineering',
    type: 'website',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
