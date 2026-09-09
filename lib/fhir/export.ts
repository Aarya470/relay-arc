// FHIR R4 export — turns a Relay Arc profile into a standards-conformant Bundle.
//
// WHY THIS EXISTS
// "We could integrate with your EHR" is a sentence anyone can say. A Bundle that
// validates against the HL7 reference validator is a thing you can hand to a
// hospital's integration engineer, and it is the difference between a conversation
// and a demo. US hospitals running certified EHRs are required to expose
// standardized FHIR APIs, so this is the interface that already exists rather than
// a bespoke one somebody would have to agree to build.
//
// DESIGN CONSTRAINTS
//  1. Pure and dependency-free, like lib/risk. No network, no SDK. It maps data
//     structures to data structures, so it unit-tests cleanly and runs on the
//     client without shipping a FHIR library.
//  2. Export only. This deliberately does NOT read from an EHR. Receiving PHI from
//     a covered entity would make Relay Arc a HIPAA business associate and trigger
//     the full Security Rule — see docs/INTENDED_USE.md §5. One-directional
//     patient-to-facility transmission of the patient's own record is a materially
//     lighter posture, and that is a choice, not a missing feature.
//  3. Real codes. Vitals carry their actual LOINC codes rather than free text,
//     because a receiving system that cannot bind a code has received a document,
//     not data.
//  4. Nothing is invented. A field the user did not fill in is omitted entirely
//     rather than defaulted — a fabricated negative in a medical record is worse
//     than a gap. Patient-reported findings are marked `unconfirmed`, because
//     Relay Arc is not the author of record for any of this.
//
// VALIDATION
// tests/fhir.test.ts covers the structure offline. scripts/validate-fhir.mjs posts
// a generated Bundle to a public HL7-conformant server's $validate operation, which
// is what caught the reference-resolution bug described on `uuid()` below.

/** LOINC codes for the observations Relay Arc records. */
export const LOINC = {
  heartRate: { code: '8867-4', display: 'Heart rate', ucum: '/min' },
  respRate: { code: '9279-1', display: 'Respiratory rate', ucum: '/min' },
  oxygenSat: { code: '2708-6', display: 'Oxygen saturation in Arterial blood', ucum: '%' },
  systolic: { code: '8480-6', display: 'Systolic blood pressure', ucum: 'mm[Hg]' },
  diastolic: { code: '8462-4', display: 'Diastolic blood pressure', ucum: 'mm[Hg]' },
  bpPanel: { code: '85354-9', display: 'Blood pressure panel with all children optional' },
  temperature: { code: '8310-5', display: 'Body temperature', ucum: 'Cel' },
  bloodGroup: { code: '882-1', display: 'ABO and Rh group [Type] in Blood' },
} as const

const SYS = {
  loinc: 'http://loinc.org',
  ucum: 'http://unitsofmeasure.org',
  obsCategory: 'http://terminology.hl7.org/CodeSystem/observation-category',
  allergyClinical: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
  allergyVerification: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification',
  conditionClinical: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
  conditionVerification: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
  contactRelationship: 'http://terminology.hl7.org/CodeSystem/v2-0131',
} as const

export type ProfileInput = {
  id?: string
  full_name?: string | null
  date_of_birth?: string | null
  blood_type?: string | null
  diagnosis?: string | null
  allergies?: string | null
  phone?: string | null
  cardiologist?: string | null
  emergency_contacts?: { name?: string; phone?: string; relation?: string }[] | null
  medications?: { name?: string; dose?: string; frequency?: string }[] | null
}

export type VitalsInput = {
  logged_at?: string | null
  heart_rate?: number | null
  systolic?: number | null
  diastolic?: number | null
  oxygen_sat?: number | null
  resp_rate?: number | null
  temperature_c?: number | null
}

// Deliberately loose on resource internals — the goal is a correct wire format,
// not a full FHIR type model.
type Res = Record<string, unknown> & { resourceType: string }
export type Bundle = {
  resourceType: 'Bundle'
  type: 'collection'
  timestamp: string
  entry: { fullUrl: string; resource: Res }[]
}

const nonEmpty = (v: unknown): v is string =>
  typeof v === 'string' && v.trim().length > 0

/** Treat 0 and null alike as "not measured" — an SpO2 of 0 is a blank field. */
const measured = (v: number | null | undefined): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v > 0

/**
 * Bundle-internal identity must be a resolvable absolute URL, and for a Bundle
 * not yet on a server that means `urn:uuid:`.
 *
 * The first version of this used an invented `urn:relay-arc:Type/id` scheme with
 * relative `Type/id` references. It looked perfectly reasonable and produced
 * seventeen "Unable to resolve resource with reference" errors from the HL7
 * validator, because a relative reference has nothing to resolve against when the
 * fullUrl is not a real base URL. Every reference below therefore carries the same
 * urn:uuid string as the target entry's fullUrl, and resources omit `id` — with a
 * urn:uuid fullUrl the URN *is* the identity and no server id has been assigned.
 */
function uuid(): string {
  const c: Crypto | undefined = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => {
    const r = (Math.random() * 16) | 0
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

const urn = () => `urn:uuid:${uuid()}`

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Minimal generated narrative. FHIR flags a missing one as a best-practice
 * warning (dom-6), but the real reason to include it is that a receiving system
 * which cannot bind our codes can still show a human something readable — which
 * in an emergency context is the entire point.
 */
function narrative(text: string): Record<string, unknown> {
  return {
    status: 'generated',
    div: `<div xmlns="http://www.w3.org/1999/xhtml">${esc(text)}</div>`,
  }
}

/** FHIR `date`: YYYY-MM-DD. Returns undefined rather than guessing. */
function fhirDate(v: string | null | undefined): string | undefined {
  if (!nonEmpty(v)) return undefined
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return undefined
  return d.toISOString().slice(0, 10)
}

function fhirInstant(v: string | null | undefined): string {
  if (nonEmpty(v)) {
    const d = new Date(v)
    if (!Number.isNaN(d.getTime())) return d.toISOString()
  }
  return new Date().toISOString()
}

/** Split a display name into HumanName parts without being clever about it. */
function humanName(full: string): Record<string, unknown> {
  const parts = full.trim().split(/\s+/)
  if (parts.length === 1) return { use: 'official', text: full.trim(), family: parts[0] }
  return {
    use: 'official',
    text: full.trim(),
    family: parts[parts.length - 1],
    given: parts.slice(0, -1),
  }
}

const vitalCategory = [{
  coding: [{ system: SYS.obsCategory, code: 'vital-signs', display: 'Vital Signs' }],
}]

function patientResource(p: ProfileInput): Res {
  const res: Res = {
    resourceType: 'Patient',
    text: narrative(`${p.full_name?.trim() || 'Unnamed patient'}. Record supplied by the patient via Relay Arc.`),
    active: true,
  }
  if (nonEmpty(p.full_name)) res.name = [humanName(p.full_name)]
  const bd = fhirDate(p.date_of_birth)
  if (bd) res.birthDate = bd
  if (nonEmpty(p.phone)) res.telecom = [{ system: 'phone', value: p.phone.trim(), use: 'mobile' }]

  const contacts = (p.emergency_contacts || []).filter(ct => nonEmpty(ct?.name) || nonEmpty(ct?.phone))
  if (contacts.length) {
    res.contact = contacts.map(ct => {
      const c: Record<string, unknown> = {
        // These are emergency contacts by definition, so code them as such (v2-0131
        // "C") rather than leaving an uncoded text relationship the receiver has to
        // guess at. The free text is preserved alongside.
        relationship: [{
          coding: [{ system: SYS.contactRelationship, code: 'C', display: 'Emergency Contact' }],
          ...(nonEmpty(ct.relation) ? { text: ct.relation.trim() } : {}),
        }],
      }
      if (nonEmpty(ct.name)) c.name = humanName(ct.name)
      if (nonEmpty(ct.phone)) c.telecom = [{ system: 'phone', value: ct.phone.trim() }]
      return c
    })
  }
  return res
}

/**
 * Allergy criticality is a clinical judgement, so this does not attempt one.
 * Free text goes in `code.text`; criticality is left absent rather than asserted,
 * because an unsupported "high" in a record is a safety problem.
 */
function allergyResources(patientRef: string, allergies: string): Res[] {
  return allergies.split(/[,;\n]/).map(s => s.trim()).filter(Boolean).map(substance => ({
    resourceType: 'AllergyIntolerance',
    text: narrative(`Allergy: ${substance} (patient-reported, unconfirmed).`),
    clinicalStatus: { coding: [{ system: SYS.allergyClinical, code: 'active', display: 'Active' }] },
    verificationStatus: {
      coding: [{ system: SYS.allergyVerification, code: 'unconfirmed', display: 'Unconfirmed' }],
    },
    code: { text: substance },
    patient: { reference: patientRef },
  }))
}

function medicationResources(
  patientRef: string,
  meds: NonNullable<ProfileInput['medications']>
): Res[] {
  return meds.filter(m => nonEmpty(m?.name)).map(m => {
    const name = (m.name as string).trim()
    const dosageText = [m.dose, m.frequency].filter(nonEmpty).join(', ')
    const res: Res = {
      resourceType: 'MedicationStatement',
      text: narrative(`Medication: ${name}${dosageText ? `. ${dosageText}` : ''} (patient-reported).`),
      status: 'active',
      medicationCodeableConcept: { text: name },
      subject: { reference: patientRef },
    }
    if (dosageText) res.dosage = [{ text: dosageText }]
    return res
  })
}

function conditionResources(patientRef: string, diagnosis: string): Res[] {
  return diagnosis.split(/[,;\n]/).map(s => s.trim()).filter(Boolean).map(text => ({
    resourceType: 'Condition',
    text: narrative(`Condition: ${text} (patient-reported, unconfirmed).`),
    clinicalStatus: { coding: [{ system: SYS.conditionClinical, code: 'active', display: 'Active' }] },
    verificationStatus: {
      coding: [{ system: SYS.conditionVerification, code: 'unconfirmed', display: 'Unconfirmed' }],
    },
    code: { text },
    subject: { reference: patientRef },
  }))
}

function simpleObservation(
  patientRef: string, when: string,
  def: { code: string; display: string; ucum: string }, value: number
): Res {
  return {
    resourceType: 'Observation',
    text: narrative(`${def.display}: ${value} ${def.ucum} (patient-recorded).`),
    status: 'final',
    category: vitalCategory,
    code: {
      coding: [{ system: SYS.loinc, code: def.code, display: def.display }],
      text: def.display,
    },
    subject: { reference: patientRef },
    // The patient took the measurement. Stating that is more accurate than leaving
    // the performer absent and lets a clinician weight it correctly.
    performer: [{ reference: patientRef }],
    effectiveDateTime: when,
    valueQuantity: { value, unit: def.ucum, system: SYS.ucum, code: def.ucum },
  }
}

/**
 * Blood pressure must be one Observation with two components under the panel
 * code, not two independent Observations — a receiver pairs them via the panel.
 */
function bloodPressure(patientRef: string, when: string, sys: number, dia: number): Res {
  const comp = (def: { code: string; display: string; ucum: string }, value: number) => ({
    code: { coding: [{ system: SYS.loinc, code: def.code, display: def.display }] },
    valueQuantity: { value, unit: def.ucum, system: SYS.ucum, code: def.ucum },
  })
  return {
    resourceType: 'Observation',
    text: narrative(`Blood pressure: ${sys}/${dia} mmHg (patient-recorded).`),
    status: 'final',
    category: vitalCategory,
    code: {
      coding: [{ system: SYS.loinc, code: LOINC.bpPanel.code, display: LOINC.bpPanel.display }],
      text: 'Blood pressure',
    },
    subject: { reference: patientRef },
    performer: [{ reference: patientRef }],
    effectiveDateTime: when,
    component: [comp(LOINC.systolic, sys), comp(LOINC.diastolic, dia)],
  }
}

function observationResources(patientRef: string, vitals: VitalsInput[]): Res[] {
  const out: Res[] = []
  for (const v of vitals) {
    const when = fhirInstant(v.logged_at)
    if (measured(v.heart_rate)) out.push(simpleObservation(patientRef, when, LOINC.heartRate, v.heart_rate))
    if (measured(v.resp_rate)) out.push(simpleObservation(patientRef, when, LOINC.respRate, v.resp_rate))
    if (measured(v.oxygen_sat)) out.push(simpleObservation(patientRef, when, LOINC.oxygenSat, v.oxygen_sat))
    if (measured(v.temperature_c)) out.push(simpleObservation(patientRef, when, LOINC.temperature, v.temperature_c))
    if (measured(v.systolic) && measured(v.diastolic)) {
      out.push(bloodPressure(patientRef, when, v.systolic, v.diastolic))
    }
  }
  return out
}

/** Blood group as a coded Observation, which is where a receiving system looks. */
function bloodGroupObservation(patientRef: string, bloodType: string, when: string): Res {
  return {
    resourceType: 'Observation',
    text: narrative(`Blood group: ${bloodType.trim()} (patient-reported, not resulted from a specimen).`),
    status: 'final',
    category: [{ coding: [{ system: SYS.obsCategory, code: 'laboratory', display: 'Laboratory' }] }],
    code: {
      coding: [{ system: SYS.loinc, code: LOINC.bloodGroup.code, display: LOINC.bloodGroup.display }],
      text: 'Blood group',
    },
    subject: { reference: patientRef },
    performer: [{ reference: patientRef }],
    effectiveDateTime: when,
    // Patient-reported rather than resulted from a specimen, so text-only.
    valueCodeableConcept: { text: bloodType.trim() },
  }
}

/**
 * Build a FHIR R4 `Bundle` of type `collection` describing one person.
 *
 * `collection` rather than `document` because this is a set of related resources
 * for a receiving system to consume, not an attested immutable clinical document
 * — Relay Arc is not the author of record for any of it.
 */
export function toFhirBundle(profile: ProfileInput, vitals: VitalsInput[] = []): Bundle {
  const patientUrn = urn()
  const entries: { fullUrl: string; resource: Res }[] = [
    { fullUrl: patientUrn, resource: patientResource(profile) },
  ]

  const push = (rs: Res[]) => {
    for (const r of rs) entries.push({ fullUrl: urn(), resource: r })
  }

  if (nonEmpty(profile.blood_type) && profile.blood_type.trim().toLowerCase() !== 'unknown') {
    push([bloodGroupObservation(patientUrn, profile.blood_type, new Date().toISOString())])
  }
  if (nonEmpty(profile.allergies)) push(allergyResources(patientUrn, profile.allergies))
  if (nonEmpty(profile.diagnosis)) push(conditionResources(patientUrn, profile.diagnosis))
  if (profile.medications?.length) push(medicationResources(patientUrn, profile.medications))
  push(observationResources(patientUrn, vitals))

  return {
    resourceType: 'Bundle',
    type: 'collection',
    timestamp: new Date().toISOString(),
    entry: entries,
  }
}

/** Counts by resourceType — used by the UI and by the tests. */
export function summarise(b: Bundle): Record<string, number> {
  const out: Record<string, number> = {}
  for (const e of b.entry) out[e.resource.resourceType] = (out[e.resource.resourceType] || 0) + 1
  return out
}
