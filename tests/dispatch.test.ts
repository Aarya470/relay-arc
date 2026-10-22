// Capability claims on the dispatch screen (lib/nj-pci.ts).
//   node --experimental-strip-types tests/dispatch.test.ts
//
// The dispatch screen used to claim a cath lab for every hospital. These tests
// pin that a claim is only made when the NJ Department of Health data backs it,
// and that a non-emergency building next door does not inherit it.
import { pciStatus, NOT_AN_ER, NJ_PCI } from '../lib/nj-pci.ts'

let pass = 0, fail = 0
const ok = (name: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log('  PASS  ' + name + (detail ? ' — ' + detail : '')) }
  else { fail++; console.log('  FAIL  ' + name + (detail ? ' — ' + detail : '')) }
}
ok('dataset covers the state report', NJ_PCI.length >= 50, String(NJ_PCI.length))
ok('Penn Medicine Princeton: primary PCI', pciStatus('Penn Medicine Princeton Medical Center', 40.3398, -74.6238) === 'yes')
const hamilton = NJ_PCI.find(h => /Hamilton/.test(h.name))!
ok('RWJ Hamilton matched from its own coordinates', pciStatus('Robert Wood Johnson University Hospital Hamilton', hamilton.lat, hamilton.lng) === 'yes')
const shore = NJ_PCI.find(h => h.name === 'Shore Medical Center')!
ok('Shore Medical Center: state data shows no primary PCI', pciStatus('Shore Medical Center', shore.lat, shore.lng) === 'no')
const marlton = NJ_PCI.find(h => /Marlton/.test(h.name))!
ok("a children's rehab building on the Virtua Marlton campus does NOT inherit the claim",
   pciStatus("Weisman Children's Rehabilitation Hospital", marlton.lat + 0.001, marlton.lng) === 'unknown')
ok('and it is filtered out as not an emergency department', NOT_AN_ER.test("Weisman Children's Rehabilitation Hospital"))
ok('a same-named hospital in another state is unknown, not guessed', pciStatus('Penn Medicine Princeton Medical Center', 39.95, -75.19) === 'unknown')
ok('real ERs are not filtered out', !NOT_AN_ER.test('Capital Health Medical Center - Hopewell') && !NOT_AN_ER.test("Children's Hospital of Philadelphia"))
console.log(`\n${'='.repeat(52)}\n  ${pass} passed, ${fail} failed\n${'='.repeat(52)}`)
process.exit(fail > 0 ? 1 : 0)
