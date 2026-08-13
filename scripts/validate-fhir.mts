// Validate a generated Bundle against a live, HL7-conformant FHIR server.
//
//   node --experimental-strip-types scripts/validate-fhir.mts
//   node --experimental-strip-types scripts/validate-fhir.mts https://r4.smarthealthit.org
//
// WHY THIS IS SEPARATE FROM tests/fhir.test.ts
// The unit tests assert what we believe about our own output. This asserts what a
// real FHIR implementation thinks of it, which is a different and less flattering
// question. It is how the reference-resolution bug was found: the tests passed,
// the types were fine, the build was green, and the validator returned seventeen
// errors because an invented urn scheme meant no intra-bundle reference resolved.
//
// Requires network, so it is deliberately NOT part of preflight — a build gate that
// depends on a third-party server going down is a gate that gets switched off.
//
// EXPECTED OUTPUT: 0 errors. Warnings about `CodeSystem is unknown ... http://loinc.org`
// are expected and are not defects: LOINC requires a licence, so public test servers
// cannot load it and therefore cannot validate LOINC codes. Everything else should
// be quiet.
import { toFhirBundle, summarise } from '../lib/fhir/export.ts'

const BASE = process.argv[2] || 'https://hapi.fhir.org/baseR4'

const PROFILE = {
  id: 'relay-demo-1',
  full_name: 'R. Example',
  date_of_birth: '2003-11-02',
  blood_type: 'A-',
  diagnosis: 'POTS, dysautonomia',
  allergies: 'Penicillin, sulfa drugs',
  phone: '+1 555 0102',
  emergency_contacts: [{ name: 'Parent Demo', phone: '+1 555 0199', relation: 'Parent' }],
  medications: [
    { name: 'Ivabradine', dose: '5mg', frequency: 'Twice daily' },
    { name: 'Fludrocortisone', dose: '0.1mg', frequency: 'Daily' },
  ],
}
const VITALS = [
  { logged_at: '2026-08-12T09:00:00Z', heart_rate: 115, systolic: 105, diastolic: 68, oxygen_sat: 94, resp_rate: 22, temperature_c: 37.1 },
  { logged_at: '2026-08-10T09:00:00Z', heart_rate: 88, systolic: 112, diastolic: 72, oxygen_sat: 97, resp_rate: 17 },
  { logged_at: '2026-08-09T09:00:00Z', heart_rate: 0, oxygen_sat: 0, resp_rate: 16 },
]

type Issue = { severity?: string; diagnostics?: string; expression?: string[] }

const bundle = toFhirBundle(PROFILE, VITALS)
console.log(`\nvalidating against ${BASE}`)
console.log(`bundle: ${bundle.entry.length} entries — ${JSON.stringify(summarise(bundle))}\n`)

const res = await fetch(`${BASE}/Bundle/$validate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/fhir+json', Accept: 'application/fhir+json' },
  body: JSON.stringify(bundle),
})

if (!res.ok && res.status !== 200 && res.status !== 422) {
  console.error(`server returned HTTP ${res.status}`)
  console.error((await res.text()).slice(0, 600))
  process.exit(2)
}

const outcome = (await res.json()) as { issue?: Issue[] }
const issues = outcome.issue || []

const errors = issues.filter(i => i.severity === 'error' || i.severity === 'fatal')
const warnings = issues.filter(i => i.severity === 'warning')
// LOINC cannot be loaded by public servers for licensing reasons, so these are
// noise rather than findings. Everything else is worth reading.
const isLoincNoise = (i: Issue) =>
  /CodeSystem is unknown/i.test(i.diagnostics || '') && /loinc\.org/i.test(i.diagnostics || '')
const realWarnings = warnings.filter(i => !isLoincNoise(i))

for (const i of errors) {
  console.error(`ERROR   ${i.diagnostics || ''}`)
  if (i.expression?.length) console.error(`        at ${i.expression.join(', ')}`)
}
for (const i of realWarnings) console.warn(`warn    ${i.diagnostics || ''}`)

const loincCount = warnings.length - realWarnings.length
console.log(
  `\n${errors.length} error(s), ${realWarnings.length} substantive warning(s)` +
  (loincCount ? `, ${loincCount} LOINC-unavailable warning(s) ignored` : '')
)

if (errors.length === 0) console.log('\nPASS — conformant to FHIR R4.\n')
else console.log('')
process.exit(errors.length === 0 ? 0 : 1)
