// Per-route metadata.
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Relay Arc Features: SOS, Hospital Finder, Offline Medical Card',
  description:
    'On-device emergency triage in 0.07 ms with no signal, hospital ranking by real drive time and capability rather than distance, and your medical record sent to the receiving facility before the car moves.',
  alternates: { canonical: '/features' },
  openGraph: {
    title: 'Relay Arc Features: SOS, Hospital Finder, Offline Medical Card',
    description:
      'On-device emergency triage in 0.07 ms with no signal, hospital ranking by real drive time and capability rather than distance, and your medical record sent to the receiving facility before the car moves.',
    url: '/features',
    type: 'website',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
