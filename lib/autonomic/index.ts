// ─── Relay Autonomic Engine ──────────────────────────────────────────────────
// Why this exists. Relay was built around getting someone to the right hospital fast.

/** Sources for every threshold in this file, shown in the UI next to the number. */
export const BASIS = {
  pots: 'Heart Rhythm Society 2015 expert consensus on POTS. Sustained rise of ≥30 bpm within 10 minutes of standing (≥40 bpm ages 12–19), without orthostatic hypotension',
  oh: 'Consensus definition of orthostatic hypotension. Fall of ≥20 mmHg systolic or ≥10 mmHg diastolic within 3 minutes of standing',
  counter:
    'Physical counter-pressure manoeuvres, standard first-line management for orthostatic intolerance and impending syncope',
} as const

// ─── orthostatic vitals ──────────────────────────────────────────────────────

export interface OrthostaticReading {
  /** Heart rate lying down, after resting. */
  supineHr: number
  /** Heart rate standing. */
  standingHr: number
  /** Minutes spent standing when standingHr was taken. */
  minutesStanding: number
  supineSystolic?: number | null
  supineDiastolic?: number | null
  standingSystolic?: number | null
  standingDiastolic?: number | null
}

/**
 * Which orthostatic HR threshold applies.
 *
 * The adolescent threshold is higher, not lower, which is counter-intuitive
 * until you know why: healthy teenagers show markedly more heart-rate
 * variability on standing than adults, so 30 bpm would label a large number of
 * well 14-year-olds. The consensus therefore uses 40 bpm for ages 12–19.
 *
 * Age unknown falls back to the adult 30 bpm. That is the more sensitive of the
 * two, so an unknown age produces the more cautious reading.
 */
export function orthostaticHrThreshold(ageYears?: number | null): { bpm: number; band: string } {
  if (typeof ageYears === 'number' && ageYears >= 12 && ageYears <= 19) {
    return { bpm: 40, band: 'ages 12–19' }
  }
  return { bpm: 30, band: 'adults' }
}

export interface OrthostaticResult {
  /** standing − supine, in bpm. */
  hrDelta: number
  threshold: number
  thresholdBand: string
  /** hrDelta met the age-appropriate threshold inside the 10-minute window. */
  meetsHrCriterion: boolean
  /** Standing heart rate exceeded 120 bpm, the alternative published criterion. */
  exceedsAbsolute: boolean
  /** Blood pressure fell enough to meet the orthostatic hypotension definition. */
  orthostaticHypotension: boolean | null
  systolicDrop: number | null
  diastolicDrop: number | null
  /**
   * True when the reading was taken outside the window the criteria describe.
   * Both published criteria are about the first 10 minutes of standing, so a
   * value recorded at minute 30 is not comparable and must not be presented as
   * though it were.
   */
  outsideWindow: boolean
  /** Plain sentences for the UI. Ordered most important first. */
  notes: string[]
}

export function assessOrthostatic(
  r: OrthostaticReading,
  ageYears?: number | null,
): OrthostaticResult {
  const { bpm: threshold, band } = orthostaticHrThreshold(ageYears)
  const hrDelta = Math.round(r.standingHr - r.supineHr)
  const outsideWindow = r.minutesStanding > 10

  const meetsHrCriterion = !outsideWindow && hrDelta >= threshold
  const exceedsAbsolute = !outsideWindow && r.standingHr > 120

  let systolicDrop: number | null = null
  let diastolicDrop: number | null = null
  let orthostaticHypotension: boolean | null = null
  if (r.supineSystolic != null && r.standingSystolic != null) {
    systolicDrop = Math.round(r.supineSystolic - r.standingSystolic)
  }
  if (r.supineDiastolic != null && r.standingDiastolic != null) {
    diastolicDrop = Math.round(r.supineDiastolic - r.standingDiastolic)
  }
  if (systolicDrop != null || diastolicDrop != null) {
    orthostaticHypotension = (systolicDrop ?? 0) >= 20 || (diastolicDrop ?? 0) >= 10
  }

  const notes: string[] = []
  if (outsideWindow) {
    notes.push(
      `Recorded after ${r.minutesStanding} minutes of standing. The published criteria describe the first 10 minutes, so this reading cannot be compared against them.`,
    )
  }
  if (meetsHrCriterion) {
    notes.push(
      `Pulse rose ${hrDelta} bpm on standing, at or above the ${threshold} bpm mark used for ${band}.`,
    )
  } else if (!outsideWindow) {
    notes.push(
      `Pulse rose ${hrDelta} bpm on standing, below the ${threshold} bpm mark used for ${band}.`,
    )
  }
  if (exceedsAbsolute) {
    notes.push(`Standing pulse of ${r.standingHr} bpm is above 120.`)
  }
  if (orthostaticHypotension) {
    notes.push(
      `Blood pressure fell ${systolicDrop ?? 0}/${diastolicDrop ?? 0} mmHg on standing, which meets the definition of orthostatic hypotension. That is a different problem from POTS and worth raising with a clinician, because the two are managed differently.`,
    )
  }

  return {
    hrDelta,
    threshold,
    thresholdBand: band,
    meetsHrCriterion,
    exceedsAbsolute,
    orthostaticHypotension,
    systolicDrop,
    diastolicDrop,
    outsideWindow,
    notes,
  }
}

// ─── red flags ───────────────────────────────────────────────────────────────
// The whole point of a "this is probably your usual flare" answer is that it is safe, and it
// is only safe if there is a hard list of things that veto it.

export interface RedFlag {
  id: string
  /** Question as the person reads it. */
  prompt: string
  /** Why it vetoes, shown when they pick it. */
  because: string
}

export const RED_FLAGS: RedFlag[] = [
  {
    id: 'chest_pain',
    prompt: 'Chest pain, pressure, or pain spreading to the arm, jaw or back',
    because:
      'This is how a heart attack presents, and having a heart condition already makes it more likely rather than less. It is not something to sit out at home.',
  },
  {
    id: 'breathing',
    prompt: 'Struggling to breathe, or breathless while sitting still',
    because: 'Breathlessness at rest is not part of an ordinary orthostatic flare.',
  },
  {
    id: 'fainted',
    prompt: 'Actually passed out, rather than feeling close to it',
    because:
      'Feeling faint is common with dysautonomia. Genuinely passing out needs assessment, especially if you hit anything on the way down.',
  },
  {
    id: 'neuro',
    prompt: 'New weakness on one side, drooping face, or slurred speech',
    because: 'These are stroke signs and they are time-critical. Minutes change the outcome.',
  },
  {
    id: 'confusion',
    prompt: 'Confused, or someone with you says you are not making sense',
    because:
      'New confusion is one of the strongest single warning signs in every early-warning score used in hospitals.',
  },
  {
    id: 'fever',
    prompt: 'Fever alongside this, or feeling shivery and very unwell',
    because:
      'Infection can look like a bad flare and is the common trigger for one. It also gets worse without treatment.',
  },
  {
    id: 'no_fluids',
    prompt: 'Cannot keep any fluid down, or have not passed urine today',
    because:
      'The usual treatment for a flare is fluid. If fluid will not stay down, the thing that normally fixes this is unavailable and you may need it through a drip.',
  },
  {
    id: 'worst_ever',
    prompt: 'This is clearly worse than any episode you have had before',
    because:
      'You know your own pattern better than any score does. A first-of-its-kind episode is not the one to wait out.',
  },
]

// ─── the flare gate ──────────────────────────────────────────────────────────

export type FlareOutcome = 'escalate' | 'unclear' | 'familiar'

export interface FlareInput {
  /** IDs from RED_FLAGS the person selected. Any single one forces escalate. */
  redFlagIds: string[]
  /**
   * Their own answer to whether this feels like their usual episodes.
   * 'different' does not force escalation on its own but removes 'familiar'.
   */
  feelsLike: 'usual' | 'different' | 'unsure'
  /** Optional standing/supine reading taken during the episode. */
  orthostatic?: OrthostaticResult | null
  /**
   * Their established resting pulse, if recorded. Used to say whether the number
   * on the monitor right now is unusual *for them*, which is the only version of
   * that question worth asking.
   */
  declaredRestingHr?: number | null
  /** Resting pulse right now, if measured. */
  currentRestingHr?: number | null
}

export interface FlareAssessment {
  outcome: FlareOutcome
  /** The single sentence shown largest. */
  headline: string
  /** Supporting sentences. Never contains advice not to seek care. */
  detail: string[]
  /** Red flags that fired, resolved to their full objects. */
  firedFlags: RedFlag[]
  /** What the app offers next. Ordered. */
  next: FlareAction[]
  disclaimer: string
}

export type FlareAction =
  | 'call_emergency'
  | 'counter_manoeuvres'
  | 'contact_care_team'
  | 'log_and_recheck'
  | 'find_hospital'

const DISCLAIMER =
  'This compares what you have entered against your own recorded pattern. It is decision support, it does not diagnose anything, and it cannot examine you. If you feel unsafe, call emergency services whatever this says.'

export function assessFlare(input: FlareInput): FlareAssessment {
  const fired = RED_FLAGS.filter((f) => input.redFlagIds.includes(f.id))

  // ── escalate ───────────────────────────────────────────────────────────────
  // Deliberately first and deliberately unconditional. No arithmetic runs before
  // this, so there is no path by which a reassuring number reduces a red flag.
  if (fired.length > 0) {
    const timeCritical = fired.some(
      (f) => f.id === 'neuro' || f.id === 'chest_pain' || f.id === 'breathing',
    )
    return {
      outcome: 'escalate',
      headline: timeCritical
        ? 'Call emergency services now. Do not wait to see if this settles.'
        : 'This needs to be seen today, not waited out.',
      detail: fired.map((f) => f.because),
      firedFlags: fired,
      next: timeCritical
        ? ['call_emergency', 'find_hospital']
        : ['call_emergency', 'find_hospital', 'contact_care_team'],
      disclaimer: DISCLAIMER,
    }
  }

  const detail: string[] = []

  // Is the pulse unusual for this person, rather than unusual in general? This
  // is the question NEWS2 cannot ask, because NEWS2 has one table for everyone.
  const base = input.declaredRestingHr
  const cur = input.currentRestingHr
  let restingUnusual: boolean | null = null
  if (typeof base === 'number' && base > 0 && typeof cur === 'number' && cur > 0) {
    const delta = Math.round(cur - base)
    restingUnusual = delta >= 20
    detail.push(
      restingUnusual
        ? `Resting pulse is ${delta} bpm above the ${base} bpm you recorded as normal for you.`
        : `Resting pulse of ${cur} is close to the ${base} bpm you recorded as normal for you.`,
    )
  }

  if (input.orthostatic) {
    detail.push(...input.orthostatic.notes)
  }

  // ── unclear ────────────────────────────────────────────────────────────────
  // No red flag, but something does not match their pattern. This is not a
  // reassurance and is not written like one.
  if (input.feelsLike === 'different' || restingUnusual === true) {
    return {
      outcome: 'unclear',
      headline: 'No emergency signs, but this is not your usual pattern.',
      detail: [
        ...detail,
        'Nothing here rules anything out. The counter-manoeuvres below are worth trying while you make contact, not instead of it.',
      ],
      firedFlags: [],
      next: ['counter_manoeuvres', 'contact_care_team', 'log_and_recheck', 'find_hospital'],
      disclaimer: DISCLAIMER,
    }
  }

  if (input.feelsLike === 'unsure') {
    return {
      outcome: 'unclear',
      headline: 'No emergency signs found. Not enough to tell you more than that.',
      detail: [
        ...detail,
        'Try the counter-manoeuvres below and re-check in twenty minutes. If it has not eased, treat that as a reason to contact someone.',
      ],
      firedFlags: [],
      next: ['counter_manoeuvres', 'log_and_recheck', 'contact_care_team', 'find_hospital'],
      disclaimer: DISCLAIMER,
    }
  }

  // ── familiar ───────────────────────────────────────────────────────────────
  return {
    outcome: 'familiar',
    headline: 'This looks like the pattern you have recorded before.',
    detail: [
      ...detail,
      'Most episodes like this settle lying down with salt and fluid. Start there.',
      'Re-check in twenty minutes. If it is worse rather than easing, or anything on the previous screen becomes true, that changes the answer.',
    ],
    firedFlags: [],
    next: ['counter_manoeuvres', 'log_and_recheck', 'contact_care_team'],
    disclaimer: DISCLAIMER,
  }
}

// ─── counter-manoeuvres ──────────────────────────────────────────────────────
// Ordered by what to do first when someone is upright and going grey, not by how interesting
// each one is.

export interface CounterStep {
  id: string
  title: string
  /** Imperative, one action. Read aloud-able. */
  body: string
  /** Seconds to hold this step. null means no timer, do it and move on. */
  holdSeconds: number | null
}

export const COUNTER_STEPS: CounterStep[] = [
  {
    id: 'down',
    title: 'Get on the floor',
    body: 'Lie flat, right now, wherever you are. Not a chair, not the sofa. Flat. If you are somewhere you cannot lie down, crouch or sit on the ground with your head lower than your heart.',
    holdSeconds: null,
  },
  {
    id: 'legs',
    title: 'Legs up the wall',
    body: 'Put your legs up against a wall or over the arm of a sofa, higher than your chest. This moves blood back out of your legs, which is where it has pooled.',
    holdSeconds: 120,
  },
  {
    id: 'salt_fluid',
    title: 'Salt and fluid together',
    body: 'Drink a large glass of water quickly, with salt in it or alongside something salty. Water on its own is less effective, because the problem is blood volume and salt is what holds the water in.',
    holdSeconds: null,
  },
  {
    id: 'clench',
    title: 'Squeeze, do not stretch',
    body: 'Clench your calves, thighs and buttocks hard, hold for thirty seconds, release. Repeat. Squeezing the big leg muscles pushes blood back toward your chest.',
    holdSeconds: 30,
  },
  {
    id: 'cool',
    title: 'Get cool',
    body: 'Heat makes this worse. Cold water on your wrists, face and the back of your neck, and get out of the sun or off your feet in a hot room.',
    holdSeconds: null,
  },
  {
    id: 'rise',
    title: 'Stand up slowly, in stages',
    body: 'When it eases, do not spring up. Sit for a minute, then stand holding something for another minute. Standing up too fast is how a second episode starts.',
    holdSeconds: 60,
  },
]

/** Total time the protocol asks for, so the UI can say so honestly up front. */
export const COUNTER_TOTAL_SECONDS = COUNTER_STEPS.reduce((a, s) => a + (s.holdSeconds ?? 0), 0)

// ─── handoff notes for emergency staff ───────────────────────────────────────
// The complaint that comes up over and over in dysautonomia communities is not that staff
// are unkind, it is that a heart rate of 140 on standing gets read as an acute event by
// someone who has never treated an autonomic disorder, and the patient is too unwell mid-
// episode to explain the context.

export interface AutonomicHandoff {
  /** False when nothing in the profile suggests an autonomic condition. */
  applies: boolean
  /** Matched terms, so the UI can say why it decided this applies. */
  matched: string[]
  /** Context lines for staff. */
  lines: string[]
  /** The counterweight. Always present when `applies`. */
  caution: string
}

const AUTONOMIC_TERMS = [
  'pots',
  'dysautonom',
  'orthostatic',
  'postural tachycardia',
  'postural orthostatic',
  'ehlers',
  'eds',
  'hypermobil',
  'mcas',
  'mast cell',
  'syncope',
  'vasovagal',
  'neurocardiogenic',
  'autonomic',
]

export function autonomicHandoff(input: {
  diagnosis?: string | null
  emergencyType?: string | null
  baselineRestingHr?: number | null
}): AutonomicHandoff {
  const hay = `${input.diagnosis || ''} ${input.emergencyType || ''}`.toLowerCase()
  // Word-boundary match.
  const matched = AUTONOMIC_TERMS.filter((t) => new RegExp(`(^|[^a-z])${t}`, 'i').test(hay))
  if (matched.length === 0) {
    return { applies: false, matched: [], lines: [], caution: '' }
  }

  const base =
    typeof input.baselineRestingHr === 'number' && input.baselineRestingHr > 0
      ? Math.round(input.baselineRestingHr)
      : null

  const lines: string[] = [
    'Known autonomic condition. A raised resting pulse, and a large rise in pulse on standing, are expected findings in this patient and are not on their own evidence of an acute event.',
    base
      ? `Recorded baseline resting pulse is ${base} bpm. Today's readings are more informative read against that number than against a population normal.`
      : "No baseline resting pulse on file. Ask the patient or their care team what their usual resting rate is before reading today's number as a change.",
    'Take observations supine where possible. Standing observations in this patient are not comparable to a standing set from someone without an autonomic condition.',
    'Usual first-line management of an orthostatic flare is lying flat plus fluid with sodium, oral or intravenous.',
    'Check with the prescriber before stopping any rate-controlling or volume-expanding medication. Abrupt withdrawal can make the presentation considerably worse.',
  ]

  return {
    applies: true,
    matched,
    lines,
    caution:
      'None of the above excludes an acute event. Patients with autonomic conditions have cardiac and other emergencies at least as often as anyone else, and years of living with a fast pulse is precisely what makes a real one easy to dismiss. Treat the presenting complaint on its merits.',
  }
}
