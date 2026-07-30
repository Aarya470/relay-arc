// Tests that the public /engineering page is not lying.
//   cd tests && node --experimental-strip-types claims.test.ts
//
// The page makes specific factual claims and labels its demo presets by
// behaviour ("abstains", "negation", "cardiac arrest"). Those labels are only
// true for as long as the models behave that way. Retrain the triage model and a
// preset labelled "abstains" can quietly start answering confidently — a marketing
// page that has become false, with nothing to catch it.
//
// So every claim shown to a visitor is pinned here.
import { triage, MODEL_META, ABSTAIN_THRESHOLD } from '../lib/triage/index.ts'
import { assessRisk } from '../lib/risk/index.ts'

let pass = 0, fail = 0
const ok = (name: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log('  PASS  ' + name + (detail ? ' — ' + detail : '')) }
  else { fail++; console.log('  FAIL  ' + name + (detail ? ' — ' + detail : '')) }
}

console.log('\n=== Triage demo presets behave as their labels claim ===')
{
  const r = triage('chest is crushing and pain going down my left arm')
  ok('"clear cardiac" → chest_pain, confident', r.type === 'chest_pain' && !r.abstain, `${r.type} ${r.confidence}`)

  const a = triage('he collapsed and is not breathing')
  ok('"cardiac arrest" → unconscious (the CPR path)', a.type === 'unconscious' && !a.abstain, `${a.type} ${a.confidence}`)

  const n = triage('no chest pain but i cannot breathe')
  ok('"negation" → breathing, NOT chest_pain', n.type === 'breathing', `${n.type} ${n.confidence}`)

  const p = triage('heart racing hard when i stand up and dizzy')
  ok('"orthostatic" → pots', p.type === 'pots' && !p.abstain, `${p.type} ${p.confidence}`)

  const x = triage('i dont feel right')
  ok('"abstains" genuinely abstains', x.abstain === true, `conf ${x.confidence} vs gate ${ABSTAIN_THRESHOLD}`)
}

console.log('\n=== Numbers printed on the page ===')
{
  ok('corpus size shown as 495', MODEL_META.trainedExamples === 495, String(MODEL_META.trainedExamples))
  ok('cross-validation shown as 0.891', Math.abs(Number(MODEL_META.heldOutAccuracy) - 0.891) < 0.002, String(MODEL_META.heldOutAccuracy))
  ok('abstention gate shown as 0.4', ABSTAIN_THRESHOLD === 0.4, String(ABSTAIN_THRESHOLD))
}

console.log('\n=== Risk demo scenarios land on the stated levels ===')
{
  const run = (v: { resp_rate: number; oxygen_sat: number; systolic: number; heart_rate: number }) =>
    assessRisk([{ logged_at: new Date().toISOString(), ...v, diastolic: Math.round(v.systolic * 0.65) }])!

  const healthy = run({ resp_rate: 16, oxygen_sat: 98, systolic: 118, heart_rate: 72 })
  ok('"healthy" → NEWS2 0, low, no signals', healthy.news2 === 0 && healthy.level === 'low' && healthy.signals.length === 0)

  const det = run({ resp_rate: 22, oxygen_sat: 94, systolic: 105, heart_rate: 115 })
  ok('"deteriorating" → NEWS2 6, medium', det.news2 === 6 && det.level === 'medium', `${det.news2} ${det.level}`)

  const crit = run({ resp_rate: 26, oxygen_sat: 91, systolic: 88, heart_rate: 135 })
  ok('"critical" → NEWS2 12, high', crit.news2 === 12 && crit.level === 'high', `${crit.news2} ${crit.level}`)

  const flag = run({ resp_rate: 16, oxygen_sat: 90, systolic: 120, heart_rate: 72 })
  ok('"one red flag" → low aggregate but still escalates',
    flag.news2 === 3 && flag.redFlag && flag.level === 'medium', `${flag.news2} redFlag=${flag.redFlag} ${flag.level}`)

  ok('the page\'s "partial NEWS2" caveat is actually on every result', flag.partial === true)
}

console.log('\n=== Latency claims are not overstated ===')
{
  const t0 = performance.now()
  for (let i = 0; i < 2000; i++) triage('chest pain and sweating')
  const tri = (performance.now() - t0) / 2000

  const sample = [{ logged_at: new Date().toISOString(), resp_rate: 22, oxygen_sat: 94, systolic: 105, diastolic: 70, heart_rate: 115 }]
  const t1 = performance.now()
  for (let i = 0; i < 2000; i++) assessRisk(sample)
  const risk = (performance.now() - t1) / 2000

  console.log(`        triage ${tri.toFixed(4)} ms · risk ${risk.toFixed(4)} ms`)
  // The page claims 0.07 ms and 0.015 ms. Assert an order of magnitude of
  // headroom rather than the exact figure, since CI hardware varies.
  ok('triage stays well under 1 ms', tri < 1, `${tri.toFixed(4)} ms`)
  ok('risk scoring stays well under 1 ms', risk < 1, `${risk.toFixed(4)} ms`)
}

console.log('\n====================================================')
console.log(`  ${pass} passed, ${fail} failed`)
console.log('====================================================\n')
if (fail > 0) process.exit(1)
