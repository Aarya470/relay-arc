// Autonomic engine tests.
//
//   node --experimental-strip-types tests/autonomic.test.ts
//
// Two jobs here.
//
// The first is the ordinary one: every clinical threshold in lib/autonomic is a
// number transcribed from a published criterion, and a transcribed number is
// exactly the kind of thing that gets "tidied up" by someone six months later
// who thinks 30 and 40 look like a typo. Both sides of every boundary are pinned.
//
// The second matters more. lib/autonomic can tell someone their episode looks
// like their usual pattern, which is the only place in this codebase where the
// software says something that could keep a person at home. That output is safe
// only for as long as it is unreachable whenever a red flag is present. So the
// tests below try hard to reach it illegitimately — perfect vitals, a reassuring
// baseline, a familiar-feeling episode, and one red flag — and assert that it
// still escalates. If those ever start passing as 'familiar', the feature is
// dangerous and has to come out.
import {
  assessOrthostatic, orthostaticHrThreshold, assessFlare, RED_FLAGS,
  COUNTER_STEPS, COUNTER_TOTAL_SECONDS, autonomicHandoff,
} from '../lib/autonomic/index.ts'
import { assessRisk, scorePulseAgainstBaseline } from '../lib/risk/index.ts'

let pass = 0, fail = 0
const ok = (name: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log('  PASS  ' + name + (detail ? ' — ' + detail : '')) }
  else { fail++; console.log('  FAIL  ' + name + (detail ? ' — ' + detail : '')) }
}

const stand = (supine: number, standing: number, mins = 5, extra = {}) =>
  assessOrthostatic({ supineHr: supine, standingHr: standing, minutesStanding: mins, ...extra })

console.log('\n=== A. Which orthostatic threshold applies ===')
{
  ok('adult default is 30', orthostaticHrThreshold(34).bpm === 30)
  ok('age 12 uses 40', orthostaticHrThreshold(12).bpm === 40)
  ok('age 19 uses 40', orthostaticHrThreshold(19).bpm === 40)
  ok('age 11 falls back to adult 30', orthostaticHrThreshold(11).bpm === 30)
  ok('age 20 is adult 30', orthostaticHrThreshold(20).bpm === 30)
  // Unknown age must pick the MORE sensitive threshold, so a missing birthday
  // never makes the app quieter than it would otherwise be.
  ok('unknown age uses the more sensitive 30', orthostaticHrThreshold(null).bpm === 30)
  ok('undefined age uses the more sensitive 30', orthostaticHrThreshold(undefined).bpm === 30)
}

console.log('\n=== B. Heart-rate criterion boundaries ===')
{
  ok('adult +29 does not meet it', !assessOrthostatic({ supineHr: 70, standingHr: 99, minutesStanding: 5 }, 30).meetsHrCriterion, 'delta 29')
  ok('adult +30 meets it', assessOrthostatic({ supineHr: 70, standingHr: 100, minutesStanding: 5 }, 30).meetsHrCriterion, 'delta 30')
  ok('teen +39 does not meet it', !assessOrthostatic({ supineHr: 70, standingHr: 109, minutesStanding: 5 }, 15).meetsHrCriterion, 'delta 39')
  ok('teen +40 meets it', assessOrthostatic({ supineHr: 70, standingHr: 110, minutesStanding: 5 }, 15).meetsHrCriterion, 'delta 40')
  ok('teen +30 does NOT meet the teen bar', !assessOrthostatic({ supineHr: 70, standingHr: 100, minutesStanding: 5 }, 15).meetsHrCriterion, 'the whole point of the age band')

  ok('standing 121 trips the absolute criterion', stand(80, 121).exceedsAbsolute)
  ok('standing 120 does not', !stand(80, 120).exceedsAbsolute)
}

console.log('\n=== C. The ten-minute window ===')
{
  const inside = assessOrthostatic({ supineHr: 70, standingHr: 110, minutesStanding: 10 }, 30)
  const outside = assessOrthostatic({ supineHr: 70, standingHr: 110, minutesStanding: 11 }, 30)
  ok('minute 10 is inside', inside.meetsHrCriterion && !inside.outsideWindow)
  ok('minute 11 is outside', outside.outsideWindow)
  // A reading taken too late must not be presented as meeting a criterion that
  // is defined only for the first ten minutes.
  ok('outside the window cannot meet the criterion', !outside.meetsHrCriterion, 'even at delta 40')
  ok('outside the window cannot trip the absolute either', !outside.exceedsAbsolute)
  ok('outside the window says so in plain words', outside.notes.some(n => n.includes('cannot be compared')))
}

console.log('\n=== D. Orthostatic hypotension boundaries ===')
{
  const sysEdge = stand(70, 80, 3, { supineSystolic: 120, supineDiastolic: 80, standingSystolic: 101, standingDiastolic: 75 })
  ok('systolic drop 19 is not OH', sysEdge.orthostaticHypotension === false, `drop ${sysEdge.systolicDrop}`)
  const sysHit = stand(70, 80, 3, { supineSystolic: 120, supineDiastolic: 80, standingSystolic: 100, standingDiastolic: 75 })
  ok('systolic drop 20 is OH', sysHit.orthostaticHypotension === true, `drop ${sysHit.systolicDrop}`)
  const diaHit = stand(70, 80, 3, { supineSystolic: 120, supineDiastolic: 80, standingSystolic: 118, standingDiastolic: 70 })
  ok('diastolic drop 10 alone is OH', diaHit.orthostaticHypotension === true, `drop ${diaHit.diastolicDrop}`)
  ok('no BP given leaves OH unknown, not false', stand(70, 110).orthostaticHypotension === null)
  ok('OH explains it is a different problem from POTS', sysHit.notes.some(n => n.toLowerCase().includes('different problem')))
}

console.log('\n=== E. Red flags veto everything ===')
{
  // The adversarial case. Everything says ordinary flare; one red flag is set.
  const perfect = {
    feelsLike: 'usual' as const,
    declaredRestingHr: 100,
    currentRestingHr: 98,
    orthostatic: stand(100, 108, 4),
  }
  ok('no flags + feels usual → familiar', assessFlare({ ...perfect, redFlagIds: [] }).outcome === 'familiar')

  for (const f of RED_FLAGS) {
    const r = assessFlare({ ...perfect, redFlagIds: [f.id] })
    ok(`"${f.id}" forces escalate despite everything else being reassuring`, r.outcome === 'escalate', r.outcome)
  }

  const many = assessFlare({ ...perfect, redFlagIds: RED_FLAGS.map(f => f.id) })
  ok('all flags at once still escalates', many.outcome === 'escalate')
  ok('escalate names every reason', many.detail.length === RED_FLAGS.length)

  ok('unknown flag ids are ignored, not trusted', assessFlare({ ...perfect, redFlagIds: ['nonsense'] }).outcome === 'familiar')
}

console.log('\n=== F. Time-critical flags come first ===')
{
  for (const id of ['chest_pain', 'breathing', 'neuro']) {
    const r = assessFlare({ redFlagIds: [id], feelsLike: 'usual' })
    ok(`${id} → call emergency services first`, r.next[0] === 'call_emergency' && r.headline.includes('now'), r.headline.slice(0, 40))
  }
  const fever = assessFlare({ redFlagIds: ['fever'], feelsLike: 'usual' })
  ok('fever escalates but is not phrased as seconds-matter', fever.outcome === 'escalate' && !fever.headline.includes('Do not wait'))
}

console.log('\n=== G. Familiar is hard to reach ===')
{
  ok('feels different → unclear, never familiar',
    assessFlare({ redFlagIds: [], feelsLike: 'different' }).outcome === 'unclear')
  ok('unsure → unclear, never familiar',
    assessFlare({ redFlagIds: [], feelsLike: 'unsure' }).outcome === 'unclear')
  // Resting pulse well above their own normal removes the reassurance even when
  // the person says it feels like the usual thing.
  ok('resting pulse 20 over their own normal → unclear',
    assessFlare({ redFlagIds: [], feelsLike: 'usual', declaredRestingHr: 100, currentRestingHr: 120 }).outcome === 'unclear')
  ok('resting pulse 19 over their own normal stays familiar',
    assessFlare({ redFlagIds: [], feelsLike: 'usual', declaredRestingHr: 100, currentRestingHr: 119 }).outcome === 'familiar')

  const fam = assessFlare({ redFlagIds: [], feelsLike: 'usual' })
  ok('familiar still tells them what would change the answer', fam.detail.some(d => d.includes('changes the answer')))
  ok('every outcome carries the disclaimer', fam.disclaimer.length > 40 && fam.disclaimer.includes('does not diagnose'))
  // No outcome may ever offer nothing.
  for (const feelsLike of ['usual', 'different', 'unsure'] as const) {
    ok(`${feelsLike} offers a next step`, assessFlare({ redFlagIds: [], feelsLike }).next.length > 0)
  }
}

console.log('\n=== H. Counter-manoeuvres ===')
{
  ok('lying down is step one', COUNTER_STEPS[0].id === 'down', COUNTER_STEPS[0].id)
  ok('standing back up is last', COUNTER_STEPS[COUNTER_STEPS.length - 1].id === 'rise')
  ok('ids are unique', new Set(COUNTER_STEPS.map(s => s.id)).size === COUNTER_STEPS.length)
  ok('every step has a body', COUNTER_STEPS.every(s => s.body.length > 30))
  ok('total hold time is honest', COUNTER_TOTAL_SECONDS === COUNTER_STEPS.reduce((a, s) => a + (s.holdSeconds ?? 0), 0))
  ok('salt is mentioned, not just water', COUNTER_STEPS.some(s => s.body.toLowerCase().includes('salt')))
}

console.log('\n=== I. Personal pulse subscore ===')
{
  ok('0 when within 9 of baseline', scorePulseAgainstBaseline(109, 100) === 0)
  ok('1 at 10 away', scorePulseAgainstBaseline(110, 100) === 1)
  ok('2 at 20 away', scorePulseAgainstBaseline(120, 100) === 2)
  ok('3 at 30 away', scorePulseAgainstBaseline(130, 100) === 3)
  // Symmetric: a pulse that has dropped well below someone's normal is a change too.
  ok('symmetric — 30 below scores 3 as well', scorePulseAgainstBaseline(70, 100) === 3)
  ok('caps at 3', scorePulseAgainstBaseline(200, 100) === 3)
}

console.log('\n=== J. Baseline wiring in the risk engine ===')
{
  const t = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString()

  // Thin history: the declared figure is what stops a POTS patient's ordinary
  // resting pulse reading as a surge.
  const thin = assessRisk(
    [{ logged_at: t(0), heart_rate: 105, oxygen_sat: 98, systolic: 118 }],
    { declaredRestingHr: 100 }
  )!
  ok('declared baseline used when history is thin', thin.baselineSource === 'declared' && thin.baselineRestingHr === 100)

  // Thick history: what they actually logged beats what they once typed.
  const hist = [1, 2, 3, 4, 5].map(d => ({ logged_at: t(d + 1), heart_rate: 60, oxygen_sat: 98, systolic: 118 }))
  const thick = assessRisk(
    [{ logged_at: t(0), heart_rate: 105, oxygen_sat: 98, systolic: 118 }, ...hist],
    { declaredRestingHr: 100 }
  )!
  ok('measured baseline wins over declared', thick.baselineSource === 'measured' && thick.baselineRestingHr === 60)

  const none = assessRisk([{ logged_at: t(0), heart_rate: 105, oxygen_sat: 98, systolic: 118 }])!
  ok('no baseline available reports null, not a guess', none.baselineSource === null && none.news2PersonalPulse === null)

  // THE SAFETY PROPERTY. A personalised score must never be able to talk the app
  // down. Raw NEWS2 here is high; the declared baseline makes the pulse look
  // ordinary; `level` must be unmoved.
  const dangerous = assessRisk(
    [{ logged_at: t(0), heart_rate: 135, oxygen_sat: 90, systolic: 88, resp_rate: 25 }],
    { declaredRestingHr: 130 }
  )!
  ok('personalised pulse is lower than raw here', (dangerous.news2PersonalPulse ?? 99) < dangerous.news2,
    `personal ${dangerous.news2PersonalPulse} vs raw ${dangerous.news2}`)
  ok('LEVEL STILL HIGH — personalisation cannot reduce urgency', dangerous.level === 'high',
    `news2=${dangerous.news2} level=${dangerous.level}`)

  // Orthostatic findings reach the signal list but must not enter the NEWS2
  // aggregate, which has seven named parameters and this is not one of them.
  const withOrth = assessRisk(
    [{ logged_at: t(0), heart_rate: 88, oxygen_sat: 98, systolic: 118 }],
    {
      orthostatic: {
        hrDelta: 35, threshold: 30, thresholdBand: 'adults',
        meetsHrCriterion: true, orthostaticHypotension: true, outsideWindow: false,
      },
    }
  )!
  const plain = assessRisk([{ logged_at: t(0), heart_rate: 88, oxygen_sat: 98, systolic: 118 }])!
  ok('orthostatic findings appear as signals', withOrth.signals.some(s => s.code.startsWith('orthostatic')))
  ok('orthostatic points land in the baseline layer', withOrth.baselinePoints > plain.baselinePoints)
  ok('orthostatic points do NOT enter the NEWS2 aggregate', withOrth.news2 === plain.news2,
    `${withOrth.news2} vs ${plain.news2}`)

  const late = assessRisk(
    [{ logged_at: t(0), heart_rate: 88, oxygen_sat: 98, systolic: 118 }],
    {
      orthostatic: {
        hrDelta: 35, threshold: 30, thresholdBand: 'adults',
        meetsHrCriterion: false, orthostaticHypotension: true, outsideWindow: true,
      },
    }
  )!
  ok('a reading outside the window contributes nothing at all', late.baselinePoints === plain.baselinePoints)
}

console.log('\n=== K. Handoff notes for staff ===')
{
  const off = autonomicHandoff({ diagnosis: 'type 2 diabetes', emergencyType: 'chest_pain' })
  ok('does not fire for an unrelated profile', !off.applies && off.lines.length === 0)

  // The false-positive cases that a naive substring match gets wrong. A card
  // telling staff to expect a tachycardia in a patient who has no autonomic
  // condition is worse than no card.
  ok('"medsurg" does not match "eds"', !autonomicHandoff({ diagnosis: 'medsurg ward transfer' }).applies)
  ok('"hypotension" does not match "pots"', !autonomicHandoff({ diagnosis: 'chronic hypotension' }).applies)

  const on = autonomicHandoff({ diagnosis: 'POTS, hEDS', emergencyType: 'chest_pain' })
  ok('fires on POTS', on.applies && on.lines.length >= 4)
  ok('fires even when the presenting complaint is cardiac', on.applies, 'the case where it matters most')
  ok('THE CAUTION IS ALWAYS PRESENT', on.caution.length > 80 && /does not exclude|none of the above/i.test(on.caution))
  ok('caution says an acute event is still possible', /acute event/i.test(on.caution))

  const withBase = autonomicHandoff({ diagnosis: 'dysautonomia', baselineRestingHr: 104 })
  ok('states the baseline when known', withBase.lines.some(l => l.includes('104')))
  const noBase = autonomicHandoff({ diagnosis: 'dysautonomia' })
  ok('asks for the baseline when unknown rather than inventing one',
    noBase.lines.some(l => l.toLowerCase().includes('no baseline')))

  ok('tells staff to take observations supine', on.lines.some(l => l.toLowerCase().includes('supine')))
  ok('warns against stopping medication', on.lines.some(l => l.toLowerCase().includes('prescriber')))
  ok('emergencyType alone is enough', autonomicHandoff({ emergencyType: 'pots' }).applies)
}

console.log('\n====================================================')
console.log(`  ${pass} passed, ${fail} failed`)
console.log('====================================================\n')
if (fail > 0) process.exit(1)
