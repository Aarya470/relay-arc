// Tests for the Relay Risk Engine.
//   cd tests && node --experimental-strip-types risk.test.ts
//
// Section A transcribes the published NEWS2 table and asserts our subscores
// reproduce it exactly, including every boundary value. If a threshold is ever
// edited, this fails — which is the point: these are clinical constants, not
// tunable parameters.
import {
  assessRisk, scoreRespRate, scoreSpo2, scoreSystolic, scorePulse,
  type VitalsSample,
} from '../lib/risk/index.ts'

let pass = 0, fail = 0
const ok = (name: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log('  PASS  ' + name + (detail ? ' — ' + detail : '')) }
  else { fail++; console.log('  FAIL  ' + name + (detail ? ' — ' + detail : '')) }
}

// ─── A. NEWS2 table conformance ───────────────────────────────────────────────
console.log('\n=== A. NEWS2 subscores match the published table ===')

// [value, expectedScore] — boundaries on both sides of every band
const RR: [number, number][] = [
  [4, 3], [8, 3], [9, 1], [11, 1], [12, 0], [20, 0], [21, 2], [24, 2], [25, 3], [40, 3],
]
const SPO2: [number, number][] = [
  [80, 3], [91, 3], [92, 2], [93, 2], [94, 1], [95, 1], [96, 0], [100, 0],
]
const SBP: [number, number][] = [
  [70, 3], [90, 3], [91, 2], [100, 2], [101, 1], [110, 1], [111, 0], [219, 0], [220, 3], [240, 3],
]
const HR: [number, number][] = [
  [30, 3], [40, 3], [41, 1], [50, 1], [51, 0], [90, 0], [91, 1], [110, 1],
  [111, 2], [130, 2], [131, 3], [180, 3],
]

const table = (name: string, fn: (v: number) => number, rows: [number, number][]) => {
  const bad = rows.filter(([v, e]) => fn(v) !== e)
  ok(`${name}: all ${rows.length} boundary values`, bad.length === 0,
    bad.length ? bad.map(([v, e]) => `${v}→${fn(v)} want ${e}`).join(', ') : `${rows.length} checked`)
}
table('respiratory rate', scoreRespRate, RR)
table('SpO2 (Scale 1)', scoreSpo2, SPO2)
table('systolic BP', scoreSystolic, SBP)
table('pulse', scorePulse, HR)

// ─── B. Aggregate scoring and escalation bands ────────────────────────────────
console.log('\n=== B. Escalation follows the NEWS2 bands ===')

const at = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000).toISOString()
const one = (v: Partial<VitalsSample>): VitalsSample[] => [{ logged_at: at(0), ...v }]

{
  // Textbook normal: 0 across the board.
  const r = assessRisk(one({ heart_rate: 72, systolic: 118, diastolic: 76, oxygen_sat: 98, resp_rate: 16 }))!
  ok('normal vitals score 0 and read low', r.news2 === 0 && r.level === 'low', `news2=${r.news2} ${r.level}`)
  ok('no signals raised when everything is normal', r.signals.length === 0)
}
{
  // RR 22 (2) + SpO2 94 (1) + SBP 105 (1) + HR 115 (2) = 6 → medium
  const r = assessRisk(one({ resp_rate: 22, oxygen_sat: 94, systolic: 105, diastolic: 70, heart_rate: 115 }))!
  ok('aggregate 5–6 is medium', r.news2 === 6 && r.level === 'medium', `news2=${r.news2} ${r.level}`)
}
{
  // RR 26 (3) + SpO2 91 (3) + SBP 88 (3) + HR 135 (3) = 12 → high
  const r = assessRisk(one({ resp_rate: 26, oxygen_sat: 91, systolic: 88, diastolic: 60, heart_rate: 135 }))!
  ok('aggregate ≥7 is high', r.news2 === 12 && r.level === 'high', `news2=${r.news2} ${r.level}`)
  ok('advice at high level says go now', /emergency/i.test(r.advice))
}
{
  // A single parameter scoring 3 with a low aggregate must still escalate —
  // this is an explicit NEWS2 rule and the most safety-critical branch here.
  const r = assessRisk(one({ resp_rate: 16, oxygen_sat: 90, systolic: 120, diastolic: 80, heart_rate: 72 }))!
  ok('single parameter scoring 3 escalates despite low aggregate',
    r.news2 === 3 && r.redFlag && r.level === 'medium', `news2=${r.news2} redFlag=${r.redFlag} ${r.level}`)
}

// ─── C. Explainability ────────────────────────────────────────────────────────
console.log('\n=== C. Every point is attributable ===')
{
  const r = assessRisk(one({ resp_rate: 23, oxygen_sat: 93, systolic: 95, diastolic: 65, heart_rate: 112 }))!
  const sum = r.signals.filter(s => s.code.startsWith('news2_')).reduce((a, s) => a + s.points, 0)
  ok('NEWS2 signal points sum exactly to the aggregate', sum === r.news2, `${sum} vs ${r.news2}`)
  ok('every signal names its clinical basis', r.signals.every(s => s.basis.length > 10))
  ok('every signal quotes the measured value', r.signals.every(s => /\d/.test(s.label)))
  const news2Signals = r.signals.filter(s => s.basis.includes('NEWS2'))
  ok('NEWS2 signals are labelled as NEWS2', news2Signals.length === 4, `${news2Signals.length} of 4`)
}

// ─── D. Determinism — the whole reason this is not an LLM ──────────────────────
console.log('\n=== D. Determinism ===')
{
  const s = one({ resp_rate: 22, oxygen_sat: 94, systolic: 105, diastolic: 70, heart_rate: 115 })
  const runs = Array.from({ length: 50 }, () => JSON.stringify(assessRisk(s)))
  ok('50 identical inputs give 50 identical outputs', new Set(runs).size === 1)
}

// ─── E. Partial-data honesty ──────────────────────────────────────────────────
console.log('\n=== E. Partial data is reported, not hidden ===')
{
  const r = assessRisk(one({ heart_rate: 115, oxygen_sat: 94 }))!
  ok('missing parameters are listed', r.coverage.missing.length === 2, r.coverage.missing.join(', '))
  ok('measured parameters are listed', r.coverage.measured.length === 2, r.coverage.measured.join(', '))
  ok('always flagged partial', r.partial === true)
  ok('disclaimer states it can under-estimate', /under-estimate/.test(r.disclaimer))
}
{
  ok('a single lone vital is not an assessment', assessRisk(one({ heart_rate: 80 })) === null)
  ok('no data returns null', assessRisk([]) === null)
}
{
  // Zeroes and nulls are missing data, not real measurements of zero.
  const r = assessRisk(one({ heart_rate: 72, systolic: 118, diastolic: 76, oxygen_sat: 0, resp_rate: null }))!
  ok('zero and null are treated as missing, not scored',
    r.coverage.missing.includes('oxygen saturation') && r.coverage.missing.includes('respiratory rate'))
}

// ─── F. Personal-baseline layer ───────────────────────────────────────────────
console.log('\n=== F. Personal baseline (chronic illness) ===')
{
  // Stable 60 bpm for two weeks, then 78 today: absolute pulse is textbook
  // normal (NEWS2 = 0) but it is 18 above this person's own baseline.
  const hist: VitalsSample[] = [
    { logged_at: at(0), heart_rate: 78, systolic: 112, diastolic: 74, oxygen_sat: 98, resp_rate: 16 },
    ...[2, 3, 4, 5, 6, 7].map(d => ({ logged_at: at(d), heart_rate: 60, systolic: 112, diastolic: 74, oxygen_sat: 98, resp_rate: 16 })),
  ]
  const r = assessRisk(hist)!
  ok('NEWS2 alone sees nothing wrong', r.news2 === 0)
  ok('baseline layer catches the personal deviation', r.baselinePoints >= 2, `${r.baselinePoints} pts`)
  const sig = r.signals.find(s => s.code === 'baseline_hr_surge')
  ok('the deviation signal states both numbers', !!sig && /18/.test(sig.label) && /60/.test(sig.label), sig?.label)
  ok('baseline signals are labelled unvalidated', r.signals.every(s => !s.basis.includes('NEWS2') ? /not independently validated/.test(s.basis) : true))
}
{
  // The safety property: the unvalidated layer must never manufacture a `high`.
  // Give it every baseline signal at once with a NEWS2 of 0.
  const hist: VitalsSample[] = [
    { logged_at: at(0), heart_rate: 85, systolic: 112, diastolic: 90, oxygen_sat: 98, resp_rate: 16 },
    ...[2, 3, 4, 5, 6].map((d, i) => ({ logged_at: at(d), heart_rate: 60 - i, systolic: 112, diastolic: 74, oxygen_sat: 98, resp_rate: 16 })),
  ]
  const r = assessRisk(hist)!
  ok('baseline layer alone can never reach high', r.news2 < 5 && !r.redFlag && r.level !== 'high',
    `news2=${r.news2} baseline=${r.baselinePoints} → ${r.level}`)
}
{
  // Fewer than 4 prior readings is not a baseline.
  const hist: VitalsSample[] = [
    { logged_at: at(0), heart_rate: 90, systolic: 112, diastolic: 74, oxygen_sat: 98, resp_rate: 16 },
    { logged_at: at(2), heart_rate: 58, systolic: 112, diastolic: 74, oxygen_sat: 98, resp_rate: 16 },
  ]
  const r = assessRisk(hist)!
  ok('refuses to infer a baseline from 1 prior reading',
    !r.signals.some(s => s.code.startsWith('baseline_hr_') && s.code !== 'baseline_hr_trend'))
}
{
  // Today's reading must not pollute the baseline it is compared against.
  const same: VitalsSample[] = [0, 2, 3, 4, 5, 6].map(d =>
    ({ logged_at: at(d), heart_rate: 70, systolic: 112, diastolic: 74, oxygen_sat: 98, resp_rate: 16 }))
  const r = assessRisk(same)!
  ok('a flat history raises no baseline signal', r.baselinePoints === 0, `${r.baselinePoints} pts`)
}

// ─── G. Narrow pulse pressure ─────────────────────────────────────────────────
console.log('\n=== G. Narrow pulse pressure ===')
{
  const r = assessRisk(one({ systolic: 100, diastolic: 82, heart_rate: 72, oxygen_sat: 98, resp_rate: 16 }))!
  ok('PP 18 on SBP 100 is flagged', r.signals.some(s => s.code === 'narrow_pulse_pressure'))
  const r2 = assessRisk(one({ systolic: 120, diastolic: 78, heart_rate: 72, oxygen_sat: 98, resp_rate: 16 }))!
  ok('PP 42 on SBP 120 is not flagged', !r2.signals.some(s => s.code === 'narrow_pulse_pressure'))
}

// ─── H. Robustness ────────────────────────────────────────────────────────────
console.log('\n=== H. Robustness ===')
{
  ok('unsorted input still scores the newest reading', (() => {
    const r = assessRisk([
      { logged_at: at(5), heart_rate: 140, systolic: 118, diastolic: 76, oxygen_sat: 98, resp_rate: 16 },
      { logged_at: at(0), heart_rate: 70, systolic: 118, diastolic: 76, oxygen_sat: 98, resp_rate: 16 },
      { logged_at: at(2), heart_rate: 138, systolic: 118, diastolic: 76, oxygen_sat: 98, resp_rate: 16 },
    ])!
    return r.signals.every(s => !s.label.includes('140'))
  })())
  ok('garbage timestamps are dropped, not thrown on', (() => {
    try {
      const r = assessRisk([
        { logged_at: 'not a date', heart_rate: 70, systolic: 118 },
        { logged_at: at(0), heart_rate: 70, systolic: 118, diastolic: 76, oxygen_sat: 98, resp_rate: 16 },
      ])
      return r !== null && r.level === 'low'
    } catch { return false }
  })())
  ok('absurd values do not throw', (() => {
    try { assessRisk(one({ heart_rate: 99999, systolic: 1, diastolic: 500, oxygen_sat: 300, resp_rate: 999 })); return true }
    catch { return false }
  })())
  ok('sub-millisecond, no network', (() => {
    const s = one({ resp_rate: 22, oxygen_sat: 94, systolic: 105, diastolic: 70, heart_rate: 115 })
    const t0 = performance.now()
    for (let i = 0; i < 2000; i++) assessRisk(s)
    const ms = (performance.now() - t0) / 2000
    console.log(`        ${ms.toFixed(4)} ms per assessment`)
    return ms < 1
  })())
}

console.log('\n====================================================')
console.log(`  ${pass} passed, ${fail} failed`)
console.log('====================================================\n')
if (fail > 0) process.exit(1)
