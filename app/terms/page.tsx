import LegalDocument from '@/components/LegalDocument'
import { TERMS_OF_SERVICE } from '@/lib/legal'

export const metadata = {
  title: 'Terms of service — Relay Arc',
  description: 'Terms governing use of Relay Arc, including emergency and medical disclaimers.',
}

export default function TermsPage() {
  const body = TERMS_OF_SERVICE.replace(/^TERMS OF SERVICE\n/, '').replace(/^Last updated:.*\n/m, '')
  return <LegalDocument kicker="Legal · terms" title="Terms of service" body={body}/>
}
