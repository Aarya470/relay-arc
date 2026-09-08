import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'System status: Relay Arc',
  description: 'Live status of the parts of Relay Arc that have to work in an emergency, including routing, the database and the on-device triage model.',
  alternates: { canonical: '/status' },
}

export default function StatusLayout({ children }: { children: React.ReactNode }) {
  return children
}
