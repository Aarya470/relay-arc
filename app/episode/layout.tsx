import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'I feel faint: step by step help for POTS and fainting. Relay Arc',
  description:
    'Free help when you feel faint: the warning signs that mean call 911, then lie flat, legs up, salt and fluid, leg squeezes and cooling down, with timers. No account needed.',
  alternates: { canonical: '/episode' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
