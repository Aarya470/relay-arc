// Apple Health export scanning (lib/health/apple.ts).
//   node --experimental-strip-types tests/apple-health.test.ts
import { scanRecords, parseHealthDate } from '../lib/health/apple.ts'

let pass = 0, fail = 0
const ok = (name: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log('  PASS  ' + name + (detail ? ' — ' + detail : '')) }
  else { fail++; console.log('  FAIL  ' + name + (detail ? ' — ' + detail : '')) }
}
const rec = (type: string, value: string, date: string, unit = '') =>
  `<Record type="${type}" sourceName="Apple Watch" unit="${unit}" creationDate="${date}" startDate="${date}" endDate="${date}" value="${value}">\n  <MetadataEntry key="HKMetadataKeyHeartRateMotionContext" value="0"/>\n </Record>\n`
const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<HealthData locale="en_US">\n' +
  rec('HKQuantityTypeIdentifierHeartRate', '71', '2026-10-18 08:00:00 -0400', 'count/min') +
  rec('HKQuantityTypeIdentifierHeartRate', '88', '2026-10-19 09:30:00 -0400', 'count/min') +
  rec('HKQuantityTypeIdentifierHeartRate', '80', '2026-10-19 07:00:00 -0400', 'count/min') +
  rec('HKQuantityTypeIdentifierOxygenSaturation', '0.96', '2026-10-19 09:31:00 -0400', '%') +
  rec('HKQuantityTypeIdentifierRespiratoryRate', '17', '2026-10-19 03:00:00 -0400', 'count/min') +
  rec('HKQuantityTypeIdentifierBloodPressureSystolic', '104', '2026-10-19 09:40:00 -0400', 'mmHg') +
  rec('HKQuantityTypeIdentifierBloodPressureDiastolic', '68', '2026-10-19 09:40:00 -0400', 'mmHg') +
  rec('HKQuantityTypeIdentifierBodyTemperature', '100.4', '2026-10-19 09:45:00 -0400', 'degF') +
  rec('HKQuantityTypeIdentifierRestingHeartRate', '62', '2026-10-18 23:00:00 -0400', 'count/min') +
  rec('HKQuantityTypeIdentifierStepCount', '512', '2026-10-19 09:00:00 -0400', 'count') +
  '</HealthData>\n'

// Split into awkward chunks so tags straddle chunk boundaries.
const chunks: string[] = []
for (let i = 0; i < xml.length; i += 37) chunks.push(xml.slice(i, i + 37))
const s = await scanRecords(chunks)

ok('parses the Health export date format', parseHealthDate('2026-10-19 09:30:00 -0400')?.toISOString() === '2026-10-19T13:30:00.000Z')
ok('latest heart rate is the newest, not the last in the file', s.latest.heart_rate?.value === 88, String(s.latest.heart_rate?.value))
ok('oxygen saturation fraction converted to percent', s.latest.spo2?.value === 96, String(s.latest.spo2?.value))
ok('respiratory rate read', s.latest.resp_rate?.value === 17)
ok('blood pressure read', s.latest.systolic?.value === 104 && s.latest.diastolic?.value === 68)
ok('temperature in °F converted to °C', s.latest.temp_c?.value === 38, String(s.latest.temp_c?.value))
ok('resting heart rate read', s.latest.resting_hr?.value === 62)
ok('step counts and other types ignored', s.matched === 9, `matched ${s.matched}`)
ok('records straddling chunk boundaries are not lost', s.recordsScanned === 10, `scanned ${s.recordsScanned}`)
ok('daily mean pulse computed per day', s.dailyHr.length === 2 && s.dailyHr[1].mean === 84, JSON.stringify(s.dailyHr))

console.log(`\n${'='.repeat(52)}\n  ${pass} passed, ${fail} failed\n${'='.repeat(52)}`)
process.exit(fail > 0 ? 1 : 0)
