import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Vitals check with just your phone · Relay Arc',
  description:
    'Measure pulse with your phone camera and breathing with its motion sensor, add Apple Health readings, and see a full NEWS2 early-warning score with every point explained. Free, no account, nothing uploaded.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
