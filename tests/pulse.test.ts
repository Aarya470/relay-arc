// Tests for the phone-as-sensor signal processing (lib/pulse).
//   node --experimental-strip-types tests/pulse.test.ts
//
// Synthetic signals with a KNOWN rate, built to look like the real thing:
// a PPG pulse shape with a harmonic, slow drift from finger pressure, sensor
// noise and an uneven camera frame rate. The estimator must recover the rate,
// and must REFUSE to answer on pure noise rather than return a confident number.
import { estimateHeartRate, estimateBreathRate, breathRateFromTaps, fingerPresent, type Sample } from '../lib/pulse/index.ts'

let pass = 0, fail = 0
const ok = (name: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log('  PASS  ' + name + (detail ? ' — ' + detail : '')) }
  else { fail++; console.log('  FAIL  ' + name + (detail ? ' — ' + detail : '')) }
}
// deterministic PRNG so the test never flakes
let seed = 42
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296 }
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd())

function ppg(bpm: number, seconds: number, noise: number, fps = 30): Sample[] {
  const out: Sample[] = []
  let t = 0
  while (t < seconds) {
    const f = bpm / 60
    const beat = Math.sin(2 * Math.PI * f * t) + 0.45 * Math.sin(4 * Math.PI * f * t + 0.8)
    const drift = 6 * Math.sin(2 * Math.PI * 0.05 * t) + 0.8 * t        // pressure + warming
    out.push({ t, v: 180 + 1.5 * beat + drift + noise * gauss() })
    t += (1 / fps) * (0.85 + 0.3 * rnd())                                // jittery frame clock
  }
  return out
}

console.log('\n=== Heart rate from a camera-like PPG trace ===')
for (const bpm of [48, 62, 75, 96, 128, 165]) {
  const r = estimateHeartRate(ppg(bpm, 20, 0.6))
  ok(`${bpm} bpm recovered within ±3`, r.ok && r.rate !== null && Math.abs(r.rate - bpm) <= 3, `got ${r.rate} (quality ${r.quality})`)
}
{
  const r = estimateHeartRate(ppg(80, 20, 2.0))
  ok('noisier trace (SNR ~0.75) still within ±4', r.ok && Math.abs((r.rate ?? 0) - 80) <= 4, `got ${r.rate} q ${r.quality}`)
}
{
  const noise: Sample[] = []; for (let t = 0; t < 20; t += 1 / 30) noise.push({ t, v: 180 + 3 * gauss() })
  const r = estimateHeartRate(noise)
  ok('pure noise is REFUSED, not reported', !r.ok && r.rate === null, `quality ${r.quality}`)
}
{
  const r = estimateHeartRate(ppg(70, 6, 0.6))
  ok('too short a recording asks for more time', !r.ok && /need/.test(r.problem || ''), r.problem)
}

console.log('\n=== Breathing rate from a phone resting on the chest ===')
function chest(brpm: number, seconds: number, noise: number): Sample[] {
  const out: Sample[] = []
  for (let t = 0; t < seconds; t += 1 / 50) {
    const f = brpm / 60
    out.push({ t, v: 9.81 + 0.03 * Math.sin(2 * Math.PI * f * t) + 0.006 * Math.sin(2 * Math.PI * 1.2 * t) + noise * gauss() })
  }
  return out
}
for (const br of [8, 12, 16, 22, 28]) {
  const r = estimateBreathRate(chest(br, 45, 0.01))
  ok(`${br} breaths/min recovered within ±2`, r.ok && Math.abs((r.rate ?? 0) - br) <= 2, `got ${r.rate} (quality ${r.quality})`)
}
{
  const still: Sample[] = []; for (let t = 0; t < 45; t += 1 / 50) still.push({ t, v: 9.81 + 0.01 * gauss() })
  const r = estimateBreathRate(still)
  ok('a phone on a table (no breathing) is REFUSED', !r.ok, `quality ${r.quality}`)
}

console.log('\n=== Tap counting and finger detection ===')
ok('15 taps 4 s apart = 15 breaths/min', breathRateFromTaps(Array.from({ length: 15 }, (_, i) => i * 4)) === 15)
ok('fewer than 4 taps gives no number', breathRateFromTaps([0, 4, 8]) === null)
ok('red, bright, flash-lit fingertip is detected', fingerPresent(200, 40, 30))
ok('a room seen through the lens is not a finger', !fingerPresent(120, 110, 100))

console.log('\n=== Speed (runs every second on a cheap phone) ===')
{
  const s = ppg(72, 20, 0.6); const t0 = performance.now()
  for (let i = 0; i < 20; i++) estimateHeartRate(s)
  const ms = (performance.now() - t0) / 20
  ok('heart-rate estimate under 40 ms', ms < 40, `${ms.toFixed(1)} ms`)
}

console.log(`\n${'='.repeat(52)}\n  ${pass} passed, ${fail} failed\n${'='.repeat(52)}`)
process.exit(fail > 0 ? 1 : 0)
