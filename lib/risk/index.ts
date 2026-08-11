// ─── Relay Risk Engine ────────────────────────────────────────────────────────
//
// Replaces an LLM call with a deterministic, explainable clinical score.
//
// WHY THIS IS NOT AN LLM
// A deterioration flag is a medical claim. It has to be:
//   1. reproducible  — the same vitals must always produce the same flag, so a
//      clinician reviewing it later sees what the patient saw
//   2. attributable   — every point must name the measurement that earned it and
//      the instrument the threshold comes from
//   3. available      — it must work with no network, because deterioration does
//      not wait for a signal
// A temperature-0.2 language model reading free text satisfies none of these.
//
// WHAT THIS IMPLEMENTS
// The vital-sign subscores of NEWS2 (National Early Warning Score 2, Royal
// College of Physicians), the validated early-warning score used for detecting
// acute deterioration in UK hospitals.
//
// IMPORTANT — THIS IS A *PARTIAL* NEWS2.
// Full NEWS2 has seven parameters. We can only measure four:
//        implemented: respiratory rate, SpO2, systolic BP, pulse
//        NOT captured: temperature, consciousness (ACVPU), supplemental oxygen
// A partial score can only ever UNDER-estimate risk, never over-estimate it, so
// it is safe as a prompt to seek care and unsafe as a reason not to. Every
// result carries `coverage` and `partial: true` so the UI must say so.
// This is decision support, not a diagnosis, and not a substitute for a
// clinician or for emergency services.
//
// On top of NEWS2 sits a clearly separated personal-baseline layer for the
// chronic conditions Relay serves (POTS, ME/CFS), where the meaningful signal is
// deviation from that person's own normal rather than an absolute threshold.
// That layer is a heuristic, is labelled as unvalidated, and by construction can
// never on its own raise a result to `high`.

/** ACVPU — the consciousness scale NEWS2 uses. 'A' scores 0, everything else 3. */
export type Acvpu = 'A' | 'C' | 'V' | 'P' | 'U'

export interface VitalsSample {
  logged_at: string
  heart_rate?: number | null
  systolic?: number | null
  diastolic?: number | null
  oxygen_sat?: number | null
  resp_rate?: number | null
  /** Degrees Celsius. */
  temperature_c?: number | null
  /** Alert / new Confusion / Voice / Pain / Unresponsive. */
  consciousness?: Acvpu | null
  /** True if on any supplemental oxygen. Binary in NEWS2, worth 2 points. */
  on_oxygen?: boolean | null
}

export type RiskLevel = 'low' | 'medium' | 'high'

export interface Signal {
  /** Stable identifier, safe to log and aggregate. */
  code: string
  /** Human sentence containing the actual measured value. */
  label: string
  points: number
  /** Where the threshold comes from. Shown to clinicians. */
  basis: string
  severity: 'info' | 'watch' | 'urgent'
}

export interface RiskAssessment {
  level: RiskLevel
  /** One-line summary. Kept for the existing CrashRisk contract. */
  reason: string
  advice: string
  /** Partial NEWS2 aggregate (0–12 with four parameters). */
  news2: number
  /** Points from the unvalidated personal-baseline layer. */
  baselinePoints: number
  /** True when any single NEWS2 parameter scored 3 — an escalation trigger. */
  redFlag: boolean
  signals: Signal[]
  coverage: { measured: string[]; missing: string[] }
  /**
   * True while any of NEWS2's seven parameters is missing. Now that temperature,
   * consciousness and supplemental-oxygen status can be captured, a complete
   * observation set produces `partial: false` and drops the under-estimation
   * caveat. Most check-ins will still be partial, and that is fine — it just has
   * to be said.
   */
  partial: boolean
  /**
   * Set when the subject is under 16. NEWS2 is designed for adults ≥16 and is not
   * validated in children — paediatric practice uses PEWS. This does not suppress
   * the score, it flags that it should not be leaned on.
   */
  pediatricCaveat: boolean
  /** ISO timestamp of the reading this was computed from. */
  assessedAt: string
  disclaimer: string
}

const DISCLAIMER =
  'Decision support based on a partial NEWS2 score (4 of 7 parameters — no temperature, consciousness level, or supplemental-oxygen status). It can under-estimate risk and is not a diagnosis. If you feel unsafe, seek emergency care regardless of what this says.'

const NEWS2_BASIS = 'NEWS2 (Royal College of Physicians) vital-sign subscore'
const BASELINE_BASIS = 'personal-baseline heuristic for POTS/ME-CFS — not part of NEWS2, not independently validated'

// ─── NEWS2 parameter subscores ────────────────────────────────────────────────
// Transcribed from the published NEWS2 table. Each returns 0–3.

export function scoreRespRate(rr: number): number {
  if (rr <= 8) return 3
  if (rr <= 11) return 1
  if (rr <= 20) return 0
  if (rr <= 24) return 2
  return 3
}

/** NEWS2 SpO2 Scale 1 — the correct scale unless the patient has diagnosed
 *  hypercapnic respiratory failure with a target range of 88–92%. */
export function scoreSpo2(spo2: number): number {
  if (spo2 <= 91) return 3
  if (spo2 <= 93) return 2
  if (spo2 <= 95) return 1
  return 0
}

export function scoreSystolic(sbp: number): number {
  if (sbp <= 90) return 3
  if (sbp <= 100) return 2
  if (sbp <= 110) return 1
  if (sbp <= 219) return 0
  return 3
}

export function scorePulse(hr: number): number {
  if (hr <= 40) return 3
  if (hr <= 50) return 1
  if (hr <= 90) return 0
  if (hr <= 110) return 1
  if (hr <= 130) return 2
  return 3
}

/**
 * Temperature in °C. Note the asymmetry, which is deliberate in NEWS2:
 * hypothermia scores 3 while a high fever scores 2, because a cold patient is
 * the more ominous presentation.
 *
 * VERIFY WITH THE REVIEWING CLINICIAN. Every other row in this file was
 * transcribed from a source that stated the bands unambiguously. For temperature
 * the sources I could reach disagreed on alignment, so this row is the standard
 * published table as I understand it, pinned by tests, and explicitly flagged in
 * docs/RISK_ENGINE.md as the one row a clinician should confirm first.
 */
export function scoreTemperature(c: number): number {
  if (c <= 35.0) return 3
  if (c <= 36.0) return 1
  if (c <= 38.0) return 0
  if (c <= 39.0) return 1
  return 2
}

/** ACVPU. Alert scores 0; new Confusion, Voice, Pain and Unresponsive all score 3. */
export function scoreConsciousness(a: Acvpu): number {
  return a === 'A' ? 0 : 3
}

/** Supplemental oxygen is binary in NEWS2: on it is 2, room air is 0. */
export function scoreSupplementalOxygen(onOxygen: boolean): number {
  return onOxygen ? 2 : 0
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

/** Least-squares slope of y over x, or null when it is not determined. */
function slope(pts: { x: number; y: number }[]): number | null {
  const n = pts.length
  if (n < 3) return null
  const mx = pts.reduce((a, p) => a + p.x, 0) / n
  const my = pts.reduce((a, p) => a + p.y, 0) / n
  let num = 0, den = 0
  for (const p of pts) { num += (p.x - mx) * (p.y - my); den += (p.x - mx) ** 2 }
  if (den === 0) return null
  return num / den
}

const DAY = 86_400_000
const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null

// ─── the engine ───────────────────────────────────────────────────────────────

export interface AssessOptions {
  /** Defaults to now. Injected so tests are deterministic. */
  now?: Date
  /** Dates of recent check-ins, newest first, for the logging-gap signal. */
  checkinDates?: string[]
  /**
   * Subject's age in years. Under 16 sets `pediatricCaveat`, because NEWS2 is
   * designed for adults ≥16 and is not validated in children — paediatric
   * practice uses PEWS instead. This matters directly for any school deployment.
   */
  ageYears?: number | null
}

/**
 * @param samples vitals_logs rows, any order. The newest is scored against
 *                NEWS2; older ones establish the personal baseline.
 */
export function assessRisk(samples: VitalsSample[], opts: AssessOptions = {}): RiskAssessment | null {
  const now = opts.now ?? new Date()
  const sorted = [...samples]
    .filter(s => s && s.logged_at && !isNaN(new Date(s.logged_at).getTime()))
    .sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime())

  if (sorted.length === 0) return null
  const latest = sorted[0]

  const rr = num(latest.resp_rate)
  const spo2 = num(latest.oxygen_sat)
  const sbp = num(latest.systolic)
  const dbp = num(latest.diastolic)
  const hr = num(latest.heart_rate)

  const measured: string[] = []
  const missing: string[] = []
  const signals: Signal[] = []
  let news2 = 0
  let redFlag = false

  const add = (code: string, label: string, points: number, basis: string) => {
    if (points <= 0) return
    signals.push({
      code, label, points, basis,
      severity: points >= 3 ? 'urgent' : points >= 2 ? 'watch' : 'info',
    })
  }

  // ── NEWS2 layer ─────────────────────────────────────────────────────────────
  if (rr != null) {
    measured.push('respiratory rate')
    const p = scoreRespRate(rr)
    news2 += p; if (p === 3) redFlag = true
    if (p > 0) add('news2_rr', `Respiratory rate ${rr}/min`, p, NEWS2_BASIS)
  } else missing.push('respiratory rate')

  if (spo2 != null) {
    measured.push('oxygen saturation')
    const p = scoreSpo2(spo2)
    news2 += p; if (p === 3) redFlag = true
    if (p > 0) add('news2_spo2', `Oxygen saturation ${spo2}%`, p, NEWS2_BASIS)
  } else missing.push('oxygen saturation')

  if (sbp != null) {
    measured.push('systolic blood pressure')
    const p = scoreSystolic(sbp)
    news2 += p; if (p === 3) redFlag = true
    if (p > 0) add('news2_sbp', `Systolic blood pressure ${sbp} mmHg`, p, NEWS2_BASIS)
  } else missing.push('systolic blood pressure')

  if (hr != null) {
    measured.push('pulse')
    const p = scorePulse(hr)
    news2 += p; if (p === 3) redFlag = true
    if (p > 0) add('news2_pulse', `Pulse ${hr} bpm`, p, NEWS2_BASIS)
  } else missing.push('pulse')

  // ── the three parameters that used to be missing ────────────────────────────
  const temp = num(latest.temperature_c)
  if (temp != null) {
    measured.push('temperature')
    const p = scoreTemperature(temp)
    news2 += p; if (p === 3) redFlag = true
    if (p > 0) add('news2_temp', `Temperature ${temp.toFixed(1)} °C`, p, NEWS2_BASIS)
  } else missing.push('temperature')

  const acvpu = latest.consciousness
  if (acvpu === 'A' || acvpu === 'C' || acvpu === 'V' || acvpu === 'P' || acvpu === 'U') {
    measured.push('consciousness')
    const p = scoreConsciousness(acvpu)
    news2 += p; if (p === 3) redFlag = true
    if (p > 0) {
      const LABEL: Record<Acvpu, string> = {
        A: 'Alert', C: 'New confusion or agitation', V: 'Responds to voice only',
        P: 'Responds to pain only', U: 'Unresponsive',
      }
      add('news2_acvpu', LABEL[acvpu], p, NEWS2_BASIS)
    }
  } else missing.push('consciousness')

  if (typeof latest.on_oxygen === 'boolean') {
    measured.push('supplemental oxygen')
    const p = scoreSupplementalOxygen(latest.on_oxygen)
    news2 += p
    if (p > 0) add('news2_oxygen', 'On supplemental oxygen', p, NEWS2_BASIS)
  } else missing.push('supplemental oxygen')

  // NEWS2 needs at least something to score. One lone vital is not an assessment.
  if (measured.length < 2) return null

  // ── personal-baseline layer (chronic illness) ───────────────────────────────
  let baselinePoints = 0
  const bAdd = (code: string, label: string, points: number) => {
    baselinePoints += points
    add(code, label, points, BASELINE_BASIS)
  }

  const latestT = new Date(latest.logged_at).getTime()
  // Baseline = readings older than 24h but within 21 days, so today's reading
  // never contributes to the baseline it is being compared against.
  const priorHr = sorted
    .filter(s => {
      const t = new Date(s.logged_at).getTime()
      return t < latestT - DAY && t > latestT - 21 * DAY
    })
    .map(s => num(s.heart_rate))
    .filter((v): v is number => v != null)

  if (hr != null && priorHr.length >= 4) {
    const base = median(priorHr)
    const delta = Math.round(hr - base)
    if (delta >= 15) {
      bAdd('baseline_hr_surge', `Pulse ${delta} bpm above your usual ${Math.round(base)} bpm`, 2)
    } else if (delta >= 10) {
      bAdd('baseline_hr_up', `Pulse ${delta} bpm above your usual ${Math.round(base)} bpm`, 1)
    }
  }

  // Narrow pulse pressure — reduced stroke volume. Normal PP is roughly
  // 30–40 mmHg; under a quarter of systolic is the conventional concern line.
  if (sbp != null && dbp != null && sbp > dbp) {
    const pp = sbp - dbp
    if (pp < sbp * 0.25) {
      bAdd('narrow_pulse_pressure', `Narrow pulse pressure (${pp} mmHg, ${sbp}/${dbp})`, 1)
    }
  }

  // Rising resting pulse across the last week — the classic pre-crash pattern.
  const week = sorted.filter(s => new Date(s.logged_at).getTime() > latestT - 7 * DAY)
  const trendPts = week
    .map(s => ({ t: new Date(s.logged_at).getTime(), v: num(s.heart_rate) }))
    .filter((p): p is { t: number; v: number } => p.v != null)
    .map(p => ({ x: (p.t - latestT) / DAY, y: p.v }))
  const m = slope(trendPts)
  if (m != null && m >= 2) {
    bAdd('baseline_hr_trend', `Resting pulse climbing about ${m.toFixed(1)} bpm/day this week`, 1)
  }

  // Logging stopped. In chronic illness, going quiet often means being too
  // unwell to log — the absence of data is itself data.
  const ci = (opts.checkinDates || [])
    .map(d => new Date(d).getTime())
    .filter(t => !isNaN(t))
    .sort((a, b) => b - a)
  if (ci.length >= 3) {
    const gapDays = (now.getTime() - ci[0]) / DAY
    const usualGap = median(ci.slice(0, 5).map((t, i, a) => i === 0 ? NaN : (a[i - 1] - t) / DAY).filter(v => !isNaN(v)))
    if (gapDays >= 3 && usualGap > 0 && gapDays > usualGap * 2.5) {
      bAdd('checkin_gap', `No check-in for ${Math.floor(gapDays)} days (you usually log every ${usualGap.toFixed(0)})`, 1)
    }
  }

  // ── escalation ──────────────────────────────────────────────────────────────
  // NEWS2's published bands drive the outcome. The baseline layer can nudge low
  // up to medium; it can never reach high on its own.
  let level: RiskLevel
  if (news2 >= 7) level = 'high'
  else if (news2 >= 5) level = 'medium'
  else if (redFlag) level = 'medium'
  else if (news2 + baselinePoints >= 3) level = 'medium'
  else level = 'low'

  const top = [...signals].sort((a, b) => b.points - a.points).slice(0, 3)
  const reason = top.length
    ? top.map(s => s.label).join('; ')
    : 'All measured vitals in the expected range'

  const advice =
    level === 'high'
      ? 'These readings meet the threshold for urgent clinical assessment. Contact emergency services or get to an emergency department now — do not wait to see if it settles.'
      : level === 'medium'
        ? redFlag
          ? 'One reading is far enough outside the normal range to need same-day review. Contact your care team now, and treat any worsening as an emergency.'
          : 'Contact your care team today and log vitals again in a few hours. Rest, hydrate, and avoid exertion until this settles.'
        : 'Nothing in the measured vitals needs action. Keep logging — the baseline is what makes the next change detectable.'

  const partial = missing.length > 0
  const age = typeof opts.ageYears === 'number' ? opts.ageYears : null
  const pediatricCaveat = age != null && age < 16

  let disclaimer = partial
    ? `Decision support based on a partial NEWS2 score (${measured.length} of 7 parameters — missing ${missing.join(', ')}). It can under-estimate risk and is not a diagnosis. If you feel unsafe, seek emergency care regardless of what this says.`
    : 'Decision support based on a complete NEWS2 observation set. It is not a diagnosis. If you feel unsafe, seek emergency care regardless of what this says.'
  if (pediatricCaveat) {
    disclaimer += ' NEWS2 is designed for adults aged 16 and over and is not validated in children — paediatric practice uses PEWS. Treat this score as indicative only.'
  }

  return {
    level, reason, advice,
    news2, baselinePoints, redFlag, signals,
    coverage: { measured, missing },
    partial,
    pediatricCaveat,
    assessedAt: latest.logged_at,
    disclaimer,
  }
}
