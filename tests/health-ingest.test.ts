// Apple Watch sync payloads → vitals rows (lib/health/ingest-parse.ts).
//   node --experimental-strip-types tests/health-ingest.test.ts
import { parseIngestBody, parseHaeDate } from '../lib/health/ingest-parse.ts'

let pass = 0, fail = 0
const ok = (name: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log('  PASS  ' + name + (detail ? ' — ' + detail : '')) }
  else { fail++; console.log('  FAIL  ' + name + (detail ? ' — ' + detail : '')) }
}

console.log('\n=== Health Auto Export REST payload (JSON, v2) ===')
{
  ok('date format with offset', parseHaeDate('2026-10-23 14:30:00 -0400') === '2026-10-23T18:30:00.000Z', String(parseHaeDate('2026-10-23 14:30:00 -0400')))
  const rows = parseIngestBody({ data: { metrics: [
    { name: 'heart_rate', units: 'bpm', data: [{ date: '2026-10-23 14:30:00 -0400', Min: 60, Avg: 74.4, Max: 90 }] },
    { name: 'blood_oxygen_saturation', units: '%', data: [{ date: '2026-10-23 14:30:00 -0400', qty: 0.97 }] },
    { name: 'respiratory_rate', units: 'count/min', data: [{ date: '2026-10-23 14:30:00 -0400', qty: 15.5 }] },
    { name: 'blood_pressure', units: 'mmHg', data: [{ date: '2026-10-23 09:00:00 -0400', systolic: 112, diastolic: 71 }] },
    { name: 'sleep_analysis', units: 'hr', data: [{ date: '2026-10-23', totalSleep: 7 }] },
  ] } })
  const a = rows.find(r => r.logged_at === '2026-10-23T18:30:00.000Z')
  ok('heart rate uses the average', a?.heart_rate === 74, String(a?.heart_rate))
  ok('oxygen as a fraction becomes a percent', a?.oxygen_sat === 97, String(a?.oxygen_sat))
  ok('breathing rate kept', a?.resp_rate === 15.5)
  ok('blood pressure on its own timestamp', rows.some(r => r.systolic === 112 && r.diastolic === 71))
  ok('unrelated metrics ignored, no empty rows', rows.length === 2, String(rows.length))
}

console.log('\n=== Shortcut payloads ===')
{
  const now = new Date('2026-10-23T12:00:00Z')
  const flat = parseIngestBody({ heart_rate: '81', oxygen_sat: 96 }, now)
  ok('flat dictionary, numbers as text accepted', flat.length === 1 && flat[0].heart_rate === 81 && flat[0].oxygen_sat === 96 && flat[0].logged_at === now.toISOString())
  const arr = parseIngestBody({ readings: [{ type: 'heart_rate', value: 70, timestamp: '2026-10-23T08:00:00Z' }, { type: 'blood_pressure', systolic: 120, diastolic: 80, timestamp: '2026-10-23T08:00:00Z' }] })
  ok('readings array grouped by timestamp', arr.length === 1 && arr[0].heart_rate === 70 && arr[0].systolic === 120)
  ok('empty body gives nothing', parseIngestBody({}).length === 0)
}

console.log(`\n${'='.repeat(52)}\n  ${pass} passed, ${fail} failed\n${'='.repeat(52)}`)
if (fail) process.exit(1)
