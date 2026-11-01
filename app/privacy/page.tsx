import LegalDocument from '@/components/LegalDocument'
import { PRIVACY_POLICY } from '@/lib/legal'

export const metadata = {
  title: 'Privacy policy: Relay Arc',
  alternates: { canonical: '/privacy' },
  description: 'How Relay Arc collects, uses and protects your medical and location data.',
}

export default function PrivacyPage() {
  const body = PRIVACY_POLICY.replace(/^PRIVACY POLICY\n/, '').replace(/^Last updated:.*\n/m, '')
  return <LegalDocument kicker="Legal · privacy" title="Privacy policy" body={body} />
}
