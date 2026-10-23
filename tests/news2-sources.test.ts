// Where the NEWS2 sheet's numbers come from (lib/news2/sources.ts).
//   node --experimental-strip-types tests/news2-sources.test.ts
import { parseCheckinText, collectNews2 } from '../lib/news2/sources.ts'

let pass = 0, fail = 0
const ok = (name: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log('  PASS  ' + name + (detail ? ' — ' + detail : '')) }
  else { fail++; console.log('  FAIL  ' + name + (detail ? ' — ' + detail : '')) }
}

console.log('\n=== Reading numbers and facts out of a check-in ===')
{
  const f = parseCheckinText('Felt dizzy this morning. My heart rate was 118 when I stood up and I had a temperature of 101.3. Oxygen 93% on my watch.')
  ok('pulse stated in words', f.pulse === 118, String(f.pulse))
  ok('temperature in °F converted to °C', f.temp_c === 38.5, String(f.temp_c))
  ok('oxygen saturation with %', f.spo2 === 93, String(f.spo2))
  ok('nothing invented for breathing or confusion', f.resp_rate === undefined && !f.confused && !f.on_oxygen)
}
{
  const f = parseCheckinText('BP was 92/60, breathing about 24 breaths a minute. Mum says I seemed confused earlier.')
  ok('systolic from 92/60', f.systolic === 92, String(f.systolic))
  ok('breathing rate', f.resp_rate === 24, String(f.resp_rate))
  ok('new confusion → alertness C', f.confused === true)
}
{
  const f = parseCheckinText('No confusion at all and I am not on oxygen. Denies fever.')
  ok('negated confusion is ignored', !f.confused)
  ok('negated oxygen is ignored', !f.on_oxygen)
  const g = parseCheckinText('Using my oxygen concentrator overnight, pulse 88 bpm')
  ok('on oxygen detected', g.on_oxygen === true)
  ok('"88 bpm" read as pulse', g.pulse === 88, String(g.pulse))
  const h = parseCheckinText('Slept 8 hours, walked 20 minutes, took 2 pills')
  ok('ordinary numbers are not mistaken for vitals', Object.keys(h).length === 0, JSON.stringify(h))
}

console.log('\n=== Combining sources: newest wins, older than a day ignored ===')
{
  const now = new Date('2026-10-23T12:00:00Z')
  const n = collectNews2(
    [
      { logged_at: '2026-10-23T08:00:00Z', source: 'apple_health', heart_rate: 70, oxygen_sat: 97 },
      { logged_at: '2026-10-23T11:30:00Z', source: 'camera', heart_rate: 92 },
      { logged_at: '2026-10-21T11:30:00Z', source: 'apple_health', resp_rate: 30 },
    ],
    [{ created_at: '2026-10-23T10:00:00Z', summary: 'Seemed confused, temperature 38.9' }],
    now)
  ok('newest pulse wins (camera over watch)', n.pulse?.value === 92 && n.pulse.source === 'camera')
  ok('watch oxygen kept', n.spo2?.value === 97 && n.spo2.source === 'apple')
  ok('two-day-old breathing rate ignored', n.resp_rate === undefined)
  ok('check-in temperature in °C used', n.temp_c?.value === 38.9 && n.temp_c.source === 'checkin')
  ok('check-in confusion becomes alertness C', n.acvpu?.value === 'C')
}

console.log(`\n${'='.repeat(52)}\n  ${pass} passed, ${fail} failed\n${'='.repeat(52)}`)
if (fail) process.exit(1)
