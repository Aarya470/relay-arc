// Synthetic fixtures for the public demo views.
//
// WHY THIS EXISTS
// The hospital board and the care-team dashboard are the two screens that prove
// Relay is a system rather than a phone app — and both sat behind a login, so
// nobody could be shown them without handing over real credentials and exposing
// a real patient's chart.
//
// So `?demo=1` on either page renders the identical production UI against these
// fixtures instead. No auth, no database, nothing real.
//
// RULES FOR THIS FILE
//  1. Every name is obviously invented. No real person's data goes here, ever.
//  2. Both demo views render a permanent banner saying the data is synthetic.
//     A viewer must never be able to mistake this for a real patient.
//  3. The clinical values are realistic because the point is to show the UI
//     behaving correctly — the deteriorating patient really does score NEWS2 6
//     through the production scorer, it is not a hardcoded badge.

const now = Date.now()
const ago = (mins: number) => new Date(now - mins * 60_000).toISOString()
const daysAgo = (d: number) => new Date(now - d * 86_400_000).toISOString()

export const DEMO_BANNER = 'Demo — synthetic data. Not real patients.'

// ── Hospital board ──────────────────────────────────────────────────────────
export const DEMO_PARTNER = {
  id: 'demo-partner',
  name: 'Demo General Hospital',
  accepting: true,
  cath_lab: true,
  stroke_unit: true,
  trauma_unit: false,
  beds_free: 6,
  status_updated_at: ago(12),
}

export const DEMO_INCOMING = [
  {
    id: 'demo-inc-1',
    patient_name: 'A. Sample',
    emergency_type: 'chest_pain',
    eta_min: 9,
    live_url: null,
    status: 'incoming',
    created_at: ago(3),
  },
  {
    id: 'demo-inc-2',
    patient_name: 'R. Example',
    emergency_type: 'breathing',
    eta_min: 17,
    live_url: null,
    status: 'incoming',
    created_at: ago(11),
  },
  {
    id: 'demo-inc-3',
    patient_name: 'M. Placeholder',
    emergency_type: 'stroke',
    eta_min: null,
    live_url: null,
    status: 'arrived',
    created_at: ago(46),
  },
]

// ── Care-team dashboard ─────────────────────────────────────────────────────
export const DEMO_MEMBER = {
  id: 'demo-member',
  full_name: 'Demo Clinician',
  role: 'Cardiology',
  email: 'demo@example.invalid',
}

export const DEMO_PATIENTS = [
  {
    id: 'demo-p1', full_name: 'A. Sample', created_at: daysAgo(120),
    diagnosis: 'Post-MI, stent placed 2025', blood_type: 'O+',
    allergies: 'Penicillin', date_of_birth: '1971-04-18', surgery_date: daysAgo(300),
    phone: '+1 555 0101', cardiologist: 'Dr. Demo (Cardiology)',
    emergency_contacts: [{ name: 'Spouse (demo)', phone: '+1 555 0198', relation: 'Spouse' }],
    medications: [
      { name: 'Aspirin', dose: '81mg', frequency: 'Daily', times: ['08:00 AM'] },
      { name: 'Atorvastatin', dose: '40mg', frequency: 'Daily', times: ['09:00 PM'] },
    ],
  },
  {
    id: 'demo-p2', full_name: 'R. Example', created_at: daysAgo(80),
    diagnosis: 'POTS, dysautonomia', blood_type: 'A-',
    allergies: 'Penicillin', date_of_birth: '2003-11-02', surgery_date: null,
    phone: '+1 555 0102', cardiologist: 'Dr. Demo (Cardiology)',
    emergency_contacts: [{ name: 'Parent (demo)', phone: '+1 555 0199', relation: 'Parent' }],
    medications: [
      { name: 'Ivabradine', dose: '5mg', frequency: 'Twice daily', times: ['08:00 AM', '08:00 PM'] },
    ],
  },
  {
    id: 'demo-p3', full_name: 'M. Placeholder', created_at: daysAgo(45),
    diagnosis: 'ME/CFS, severe', blood_type: 'B+',
    allergies: 'Sulfa drugs', date_of_birth: '1988-07-25', surgery_date: null,
    phone: '+1 555 0103', cardiologist: 'Dr. Demo (Cardiology)',
    emergency_contacts: [{ name: 'Sibling (demo)', phone: '+1 555 0197', relation: 'Sibling' }],
    medications: [
      { name: 'Low-dose naltrexone', dose: '4.5mg', frequency: 'Nightly', times: ['10:00 PM'] },
    ],
  },
]

export const DEMO_CHECKINS = [
  { id: 'dc1', user_id: 'demo-p1', created_at: ago(180), mood: 3, summary: 'Chest tightness on stairs this morning, settled after resting. Took both medications.' },
  { id: 'dc2', user_id: 'demo-p1', created_at: daysAgo(1), mood: 4, summary: 'Better day. Walked twenty minutes with no chest symptoms.' },
  { id: 'dc3', user_id: 'demo-p2', created_at: ago(340), mood: 2, summary: 'Heart racing every time I stand. Nearly fainted in the shower.' },
  { id: 'dc4', user_id: 'demo-p2', created_at: daysAgo(2), mood: 3, summary: 'Managed to sit upright most of the day. Still dizzy standing.' },
  { id: 'dc5', user_id: 'demo-p3', created_at: daysAgo(1), mood: 2, summary: 'Crashed after a short errand. In bed since, lights off.' },
]

export const DEMO_EMERGENCIES = [
  { id: 'de1', user_id: 'demo-p1', emergency_type: 'chest_pain', status: 'resolved', created_at: daysAgo(9) },
  { id: 'de2', user_id: 'demo-p2', emergency_type: 'pots', status: 'resolved', created_at: daysAgo(21) },
]

export const DEMO_MED_LOGS = [
  { id: 'dm1', user_id: 'demo-p1', medication_name: 'Aspirin', taken: true, taken_at: ago(300) },
  { id: 'dm2', user_id: 'demo-p1', medication_name: 'Atorvastatin', taken: true, taken_at: daysAgo(1) },
  { id: 'dm3', user_id: 'demo-p2', medication_name: 'Ivabradine', taken: true, taken_at: ago(420) },
  { id: 'dm4', user_id: 'demo-p3', medication_name: 'Low-dose naltrexone', taken: false, taken_at: daysAgo(1) },
]

export const DEMO_APPOINTMENTS = [
  { id: 'da1', patient_id: 'demo-p1', care_team_id: 'demo-member', type: 'scheduled', status: 'confirmed', scheduled_at: new Date(now + 2 * 86_400_000).toISOString(), concern: 'Six-week post-stent review', meeting_room_id: null },
  { id: 'da2', patient_id: 'demo-p2', care_team_id: 'demo-member', type: 'scheduled', status: 'confirmed', scheduled_at: new Date(now + 5 * 86_400_000).toISOString(), concern: 'Orthostatic symptoms worsening', meeting_room_id: null },
]

export const DEMO_SUMMARIES: Record<string, { patient_id: string; summary: string; priority_score: number; created_at: string }> = {
  // Scores map to the dashboard's bands: >=8 urgent, 5-7 monitor, <5 stable.
  // R. Example is the deteriorating patient, so they sort to the top.
  'demo-p2': {
    patient_id: 'demo-p2',
    summary: 'Orthostatic symptoms worsening. Resting pulse is 40 bpm above this patient\'s own baseline and oxygen saturation has dropped to 94%. Vitals score NEWS2 6 — same-day review.',
    priority_score: 9,
    created_at: ago(20),
  },
  'demo-p3': {
    patient_id: 'demo-p3',
    summary: 'Post-exertional crash after a short errand, bed-bound since. Last night\'s medication not logged.',
    priority_score: 6,
    created_at: ago(90),
  },
  'demo-p1': {
    patient_id: 'demo-p1',
    summary: 'Stable post-MI patient, adherent to medication. One episode of exertional chest tightness this week that resolved with rest — worth reviewing at the next appointment.',
    priority_score: 2,
    created_at: ago(60),
  },
}

/**
 * Vitals for the demo patients. Patient 2 is deliberately mid-deterioration so
 * the risk engine produces a real medium flag on screen rather than a mock one.
 */
export const DEMO_VITALS = [
  { logged_at: ago(45), heart_rate: 115, systolic: 105, diastolic: 68, oxygen_sat: 94, resp_rate: 22 },
  { logged_at: daysAgo(2), heart_rate: 88, systolic: 112, diastolic: 72, oxygen_sat: 97, resp_rate: 17 },
  { logged_at: daysAgo(3), heart_rate: 76, systolic: 116, diastolic: 74, oxygen_sat: 98, resp_rate: 16 },
  { logged_at: daysAgo(4), heart_rate: 74, systolic: 118, diastolic: 76, oxygen_sat: 98, resp_rate: 16 },
  { logged_at: daysAgo(5), heart_rate: 72, systolic: 117, diastolic: 75, oxygen_sat: 98, resp_rate: 15 },
  { logged_at: daysAgo(6), heart_rate: 75, systolic: 119, diastolic: 77, oxygen_sat: 99, resp_rate: 16 },
]

/** True when the current URL asks for demo mode. Safe on the server. */
export function isDemoRequest(search: string | null | undefined): boolean {
  if (!search) return false
  return new URLSearchParams(search).get('demo') === '1'
}
