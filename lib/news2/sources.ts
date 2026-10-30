// ─────────────────────────────────────────────────────────────────────────────
// Where each NEWS2 number comes from.
import type { Acvpu } from '../risk'

export type SourceKind = 'camera' | 'motion' | 'taps' | 'apple' | 'checkin' | 'typed' | 'demo'
export interface Reading<T = number> {
  value: T
  source: SourceKind
  at: Date
  approx?: 'fair' | 'rough'
}

export interface News2Inputs {
  resp_rate?: Reading
  spo2?: Reading
  on_oxygen?: Reading<boolean>
  temp_c?: Reading
  systolic?: Reading
  pulse?: Reading
  acvpu?: Reading<Acvpu>
}

export interface CheckinFacts {
  pulse?: number
  resp_rate?: number
  spo2?: number
  systolic?: number
  temp_c?: number
  confused?: boolean
  on_oxygen?: boolean
}

const NEG =
  /\b(no|not|never|denies|denied|without|isn'?t|aren'?t|wasn'?t|don'?t|didn'?t|haven'?t|hasn'?t|nor)\b[^.;,!?]{0,24}$/i
const negated = (text: string, idx: number) => NEG.test(text.slice(Math.max(0, idx - 40), idx))

/** Pull NEWS2-relevant facts out of free text the person wrote or said. */
export function parseCheckinText(raw: string): CheckinFacts {
  const text = ' ' + raw.replace(/\s+/g, ' ') + ' '
  const out: CheckinFacts = {}
  const num = (re: RegExp, lo: number, hi: number): number | undefined => {
    for (const m of text.matchAll(re)) {
      const v = parseFloat(m[m.length - 1] as string)
      if (!isNaN(v) && v >= lo && v <= hi && !negated(text, m.index ?? 0)) return v
    }
    return undefined
  }
  out.pulse =
    num(
      /\b(?:heart ?rate|pulse|hr|heart(?:beat)? (?:was|is|at|of))\D{0,18}?(\d{2,3})\b/gi,
      30,
      250,
    ) ?? num(/\b(\d{2,3}) ?(?:bpm|beats (?:a|per) min(?:ute)?)\b/gi, 30, 250)
  out.spo2 = num(
    /\b(?:oxygen(?: level| sat(?:uration)?)?|o2(?: sat)?|spo2|sats?)\D{0,18}?(\d{2,3}) ?%?/gi,
    60,
    100,
  )
  out.resp_rate =
    num(
      /\b(?:breathing rate|respiratory rate|resp(?:iration)? rate|breaths?)\D{0,18}?(\d{1,2})\b/gi,
      4,
      60,
    ) ?? num(/\b(\d{1,2}) breaths? (?:a|per) min/gi, 4, 60)
  out.systolic = num(/\b(?:blood pressure|bp)\D{0,18}?(\d{2,3}) ?(?:\/|over) ?\d{2,3}/gi, 50, 260)
  const t = num(/\b(?:temp(?:erature)?|fever(?: of)?|ran a)\D{0,18}?(\d{2,3}(?:\.\d)?)/gi, 30, 110)
  if (t != null) out.temp_c = t > 45 ? Math.round((((t - 32) * 5) / 9) * 10) / 10 : t
  for (const m of text.matchAll(
    /\b(confus\w*|disorient\w*|not making sense|can'?t think straight|don'?t know where (?:i am|i was))\b/gi,
  )) {
    if (!negated(text, m.index ?? 0)) {
      out.confused = true
      break
    }
  }
  for (const m of text.matchAll(
    /\b(on (?:home |supplemental )?oxygen|using (?:my )?oxygen|oxygen (?:tank|concentrator|mask)|nasal cannula)\b/gi,
  )) {
    if (!negated(text, m.index ?? 0)) {
      out.on_oxygen = true
      break
    }
  }
  for (const k of Object.keys(out) as (keyof CheckinFacts)[])
    if (out[k] === undefined) delete out[k]
  return out
}

export interface VitalsRow {
  logged_at: string
  source?: string | null
  heart_rate?: number | null
  resp_rate?: number | null
  oxygen_sat?: number | null
  systolic?: number | null
}
export interface CheckinRow {
  created_at: string
  summary?: string | null
}

const DAY = 24 * 3600 * 1000
const kindOf = (src?: string | null): SourceKind =>
  src === 'apple_health'
    ? 'apple'
    : src === 'camera' || src === 'motion' || src === 'taps'
      ? src
      : 'typed'

/** Newest reading per NEWS2 parameter from saved vitals and check-ins (last 24 h). */
export function collectNews2(
  vitals: VitalsRow[],
  checkins: CheckinRow[],
  now = new Date(),
): News2Inputs {
  const out: News2Inputs = {}
  const put = <K extends keyof News2Inputs>(k: K, r: NonNullable<News2Inputs[K]>) => {
    if (now.getTime() - r.at.getTime() > DAY) return
    const cur = out[k]
    if (!cur || r.at > cur.at) out[k] = r
  }
  for (const v of vitals) {
    const at = new Date(v.logged_at),
      source = kindOf(v.source)
    if (v.heart_rate != null) put('pulse', { value: Number(v.heart_rate), source, at })
    if (v.resp_rate != null) put('resp_rate', { value: Number(v.resp_rate), source, at })
    if (v.oxygen_sat != null) put('spo2', { value: Number(v.oxygen_sat), source, at })
    if (v.systolic != null) put('systolic', { value: Number(v.systolic), source, at })
  }
  for (const c of checkins) {
    if (!c.summary) continue
    const at = new Date(c.created_at),
      f = parseCheckinText(c.summary),
      source: SourceKind = 'checkin'
    if (f.pulse != null) put('pulse', { value: f.pulse, source, at })
    if (f.resp_rate != null) put('resp_rate', { value: f.resp_rate, source, at })
    if (f.spo2 != null) put('spo2', { value: f.spo2, source, at })
    if (f.systolic != null) put('systolic', { value: f.systolic, source, at })
    if (f.temp_c != null) put('temp_c', { value: f.temp_c, source, at })
    if (f.confused) put('acvpu', { value: 'C' as Acvpu, source, at })
    if (f.on_oxygen) put('on_oxygen', { value: true, source, at })
  }
  return out
}
