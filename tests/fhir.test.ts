// FHIR export conformance tests.
//
//   cd tests && node --experimental-strip-types fhir.test.ts
//
// These pin the things the HL7 validator caught, or would catch, so they cannot
// regress silently. The reference-resolution rule in particular was a real bug:
// an invented urn scheme with relative references produced seventeen validator
// errors, and nothing in the type system or the build would have told us.
//
// For a live check against a real FHIR server, see scripts/validate-fhir.mts.
import { toFhirBundle, summarise, LOINC, type Bundle } from '../lib/fhir/export.ts'

let pass = 0, fail = 0
function ok(name: string, cond: boolean, extra = '') {
  if (cond) { pass++; return }
  fail++
  console.error(`  FAIL  ${name}${extra ? ` — ${extra}` : ''}`)
}
const eq = (name: string, a: unknown, b: unknown) =>
  ok(name, a === b, `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`)

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
]

const all = (b: Bundle) => b.entry.map(e => e.resource)
const byType = (b: Bundle, t: string) => all(b).filter(r => r.resourceType === t)
const refOf = (r: Record<string, unknown>): string | undefined => {
  for (const k of ['subject', 'patient']) {
    const v = r[k] as { reference?: string } | undefined
    if (v?.reference) return v.reference
  }
  return undefined
}

// ── Bundle shape ────────────────────────────────────────────────────────────
{
  const b = toFhirBundle(PROFILE, VITALS)
  eq('bundle resourceType', b.resourceType, 'Bundle')
  eq('bundle type is collection', b.type, 'collection')
  ok('bundle has a timestamp', typeof b.timestamp === 'string' && b.timestamp.includes('T'))
  eq('exactly one Patient', byType(b, 'Patient').length, 1)
}

// ── Reference resolution: the bug the validator found ───────────────────────
{
  const b = toFhirBundle(PROFILE, VITALS)
  const patientUrl = b.entry[0].fullUrl

  ok('patient fullUrl is a urn:uuid', /^urn:uuid:[0-9a-f-]{36}$/.test(patientUrl), patientUrl)
  ok('every fullUrl is a urn:uuid', b.entry.every(e => /^urn:uuid:[0-9a-f-]{36}$/.test(e.fullUrl)))
  ok('every fullUrl is unique', new Set(b.entry.map(e => e.fullUrl)).size === b.entry.length)

  // With a urn:uuid fullUrl the URN is the identity; a resource-level id would
  // contradict it and the validator says so.
  ok('no resource carries an id', all(b).every(r => !('id' in r)))

  const children = all(b).slice(1)
  ok('every child references the patient by its exact fullUrl',
    children.every(r => refOf(r) === patientUrl),
    `${children.filter(r => refOf(r) !== patientUrl).length} mismatched`)
  ok('no reference uses a relative Type/id form',
    children.every(r => !/^[A-Z][A-Za-z]+\//.test(refOf(r) || '')))
}

// ── Narrative, for receivers that cannot bind our codes ─────────────────────
{
  const b = toFhirBundle(PROFILE, VITALS)
  ok('every resource has a generated narrative',
    all(b).every(r => {
      const t = r.text as { status?: string; div?: string } | undefined
      return t?.status === 'generated' && typeof t.div === 'string' && t.div.includes('xmlns=')
    }))
}

// ── Nothing is invented ─────────────────────────────────────────────────────
{
  const b = toFhirBundle({ full_name: 'Only A Name' }, [])
  eq('empty profile yields only a Patient', b.entry.length, 1)
  const p = b.entry[0].resource
  ok('absent birthDate is omitted, not defaulted', !('birthDate' in p))
  ok('absent telecom is omitted', !('telecom' in p))
  ok('absent contact is omitted', !('contact' in p))
}
{
  const b = toFhirBundle({ full_name: 'X', blood_type: 'Unknown' }, [])
  eq('blood type "Unknown" produces no Observation', byType(b, 'Observation').length, 0)
}
{
  const b = toFhirBundle({ full_name: 'X', date_of_birth: 'not a date' }, [])
  ok('unparseable date is dropped rather than becoming Invalid Date',
    !('birthDate' in b.entry[0].resource))
}

// ── Zero is missing, not measured ───────────────────────────────────────────
{
  const b = toFhirBundle({ full_name: 'X' }, [
    { logged_at: '2026-08-09T09:00:00Z', heart_rate: 0, oxygen_sat: 0, resp_rate: 16 },
  ])
  const obs = byType(b, 'Observation')
  eq('only the one real measurement becomes an Observation', obs.length, 1)
  const coding = (obs[0].code as { coding: { code: string }[] }).coding[0].code
  eq('and it is the respiratory rate', coding, LOINC.respRate.code)
}

// ── Blood pressure is one panel Observation, not two ───────────────────────
{
  const b = toFhirBundle({ full_name: 'X' }, [
    { logged_at: '2026-08-12T09:00:00Z', systolic: 105, diastolic: 68 },
  ])
  const obs = byType(b, 'Observation')
  eq('one Observation for a BP pair', obs.length, 1)
  const code = (obs[0].code as { coding: { code: string }[] }).coding[0].code
  eq('coded as the BP panel', code, LOINC.bpPanel.code)
  const comp = obs[0].component as { code: { coding: { code: string }[] } }[]
  eq('with two components', comp.length, 2)
  eq('systolic component', comp[0].code.coding[0].code, LOINC.systolic.code)
  eq('diastolic component', comp[1].code.coding[0].code, LOINC.diastolic.code)
}
{
  const b = toFhirBundle({ full_name: 'X' }, [{ logged_at: '2026-08-12T09:00:00Z', systolic: 105 }])
  eq('a lone systolic produces no BP Observation', byType(b, 'Observation').length, 0)
}

// ── Patient-reported data is never asserted as confirmed ───────────────────
{
  const b = toFhirBundle(PROFILE, VITALS)
  const vstatus = (r: Record<string, unknown>) =>
    ((r.verificationStatus as { coding: { code: string }[] } | undefined)?.coding?.[0]?.code)
  ok('allergies are unconfirmed',
    byType(b, 'AllergyIntolerance').every(r => vstatus(r) === 'unconfirmed'))
  ok('conditions are unconfirmed',
    byType(b, 'Condition').every(r => vstatus(r) === 'unconfirmed'))
  ok('no allergy asserts a criticality',
    byType(b, 'AllergyIntolerance').every(r => !('criticality' in r)))
}

// ── Splitting and counts ────────────────────────────────────────────────────
{
  const b = toFhirBundle(PROFILE, VITALS)
  eq('two allergies from a comma list', byType(b, 'AllergyIntolerance').length, 2)
  eq('two conditions from a comma list', byType(b, 'Condition').length, 2)
  eq('two medications', byType(b, 'MedicationStatement').length, 2)
  // 1 blood group + row1 (hr, rr, spo2, temp, bp = 5) + row2 (hr, rr, spo2, bp = 4)
  eq('ten observations', byType(b, 'Observation').length, 10)

  const s = summarise(b)
  eq('summarise counts Patient', s.Patient, 1)
  eq('summarise counts Observation', s.Observation, 10)
  eq('summarise total matches entries',
    Object.values(s).reduce((a, n) => a + n, 0), b.entry.length)
}

// ── Emergency contacts are coded, not just free text ───────────────────────
{
  const b = toFhirBundle(PROFILE, VITALS)
  const contacts = b.entry[0].resource.contact as {
    relationship: { coding: { system: string; code: string }[]; text?: string }[]
  }[]
  eq('one contact', contacts.length, 1)
  eq('coded as an emergency contact', contacts[0].relationship[0].coding[0].code, 'C')
  eq('free-text relation preserved', contacts[0].relationship[0].text, 'Parent')
}

// ── Observations carry a performer and an effective time ────────────────────
{
  const b = toFhirBundle(PROFILE, VITALS)
  ok('every Observation has a performer',
    byType(b, 'Observation').every(r => Array.isArray(r.performer)))
  ok('every Observation has an effectiveDateTime',
    byType(b, 'Observation').every(r => typeof r.effectiveDateTime === 'string'))
}

console.log(`\nfhir: ${pass} passed, ${fail} failed\n`)
process.exit(fail === 0 ? 0 : 1)
