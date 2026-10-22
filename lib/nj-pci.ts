// New Jersey hospitals that perform PRIMARY PCI: emergency angioplasty for a
// heart attack, the thing a "cath lab" means when someone has crushing chest pain.
//
// WHY THIS FILE EXISTS
// The dispatch screen used to print "✓ Cardiac catheterization lab" under EVERY
// hospital it found, because the label came from the emergency type, not from
// the hospital. In a rural test it routed a chest-pain patient to a children's
// rehabilitation hospital and called it a cath lab. In an app whose whole point
// is "the closest hospital is not always the right one", that was the worst
// possible bug: a confident, false capability claim.
//
// SOURCE
// New Jersey Department of Health, Cardiac Data Registries, 1 Jan to 30 Sep 2025
// (NCDR CathPCI Registry), https://www.nj.gov/health/healthcarequality/documents/cardiac_scch_25.pdf
// A hospital is marked primaryPci: true when the report shows primary PCI cases
// for it (including suppressed small counts), false when it shows none.
// Coordinates from OpenStreetMap via Nominatim, used only to match the hospitals
// the live search returns against this list (within 600 m AND a similar name, so
// a separate specialty building on the same campus does not inherit the claim).
//
// Outside this list (other states, or any hospital it does not cover) capability
// is shown as NOT CONFIRMED rather than guessed. Re-check against the next DOH
// report; hospitals open and close cardiac programmes.
export interface PciHospital { name: string; osmName: string; lat: number; lng: number; primaryPci: boolean }

export const NJ_PCI_SOURCE = 'NJ Department of Health cardiac registry, Jan–Sep 2025'

export const NJ_PCI: PciHospital[] = [
 {
  "name": "Atlanticare Regional Medical Center - Mainland",
  "osmName": "AtlantiCare Regional Medical Center",
  "lat": 39.47891,
  "lng": -74.54023,
  "primaryPci": true
 },
 {
  "name": "Bayonne University Hospital",
  "osmName": "Bayonne Medical Center",
  "lat": 40.66815,
  "lng": -74.11265,
  "primaryPci": true
 },
 {
  "name": "Bayshore Medical Center",
  "osmName": "Bayshore Medical Center",
  "lat": 40.4066,
  "lng": -74.19178,
  "primaryPci": true
 },
 {
  "name": "Capital Health Medical Center - Hopewell",
  "osmName": "Capital Health Medical Center - Hopewell",
  "lat": 40.29229,
  "lng": -74.80538,
  "primaryPci": true
 },
 {
  "name": "Capital Health Regional Medical Center",
  "osmName": "Capital Health Regional Medical Center",
  "lat": 40.23616,
  "lng": -74.75223,
  "primaryPci": true
 },
 {
  "name": "Centrastate Medical Center",
  "osmName": "CentraState Medical Center",
  "lat": 40.23752,
  "lng": -74.31248,
  "primaryPci": true
 },
 {
  "name": "Chilton Medical Center",
  "osmName": "Chilton Medical Center",
  "lat": 40.9582,
  "lng": -74.30994,
  "primaryPci": true
 },
 {
  "name": "Clara Maass Medical Center",
  "osmName": "Clara Maass Medical Center",
  "lat": 40.78575,
  "lng": -74.17672,
  "primaryPci": true
 },
 {
  "name": "Community Medical Center",
  "osmName": "Community Medical Center",
  "lat": 39.96254,
  "lng": -74.21462,
  "primaryPci": true
 },
 {
  "name": "Cooper University Hospital",
  "osmName": "Cooper University Hospital",
  "lat": 39.94123,
  "lng": -75.11639,
  "primaryPci": true
 },
 {
  "name": "Cooperman Barnabas Medical Center",
  "osmName": "Cooperman Barnabas Medical Center",
  "lat": 40.76346,
  "lng": -74.30484,
  "primaryPci": true
 },
 {
  "name": "Deborah Heart And Lung Center",
  "osmName": "Deborah Heart and Lung Center",
  "lat": 39.97772,
  "lng": -74.58433,
  "primaryPci": true
 },
 {
  "name": "Englewood Hospital",
  "osmName": "Englewood Hospital Medical Center",
  "lat": 40.90437,
  "lng": -73.96851,
  "primaryPci": true
 },
 {
  "name": "Hackensack University Medical Center",
  "osmName": "Hackensack University Medical Center",
  "lat": 40.88371,
  "lng": -74.05594,
  "primaryPci": true
 },
 {
  "name": "Holy Name Medical Center",
  "osmName": "Holy Name Medical Center",
  "lat": 40.88289,
  "lng": -74.0102,
  "primaryPci": true
 },
 {
  "name": "Hunterdon Medical Center",
  "osmName": "Hunterdon Medical Center",
  "lat": 40.53133,
  "lng": -74.86135,
  "primaryPci": true
 },
 {
  "name": "Inspira Medical Center Mullica Hill",
  "osmName": "Inspira Medical Center Mullica Hill",
  "lat": 39.71557,
  "lng": -75.15131,
  "primaryPci": true
 },
 {
  "name": "Inspira Medical Center Vineland",
  "osmName": "Inspira Medical Center Vineland",
  "lat": 39.44441,
  "lng": -75.05858,
  "primaryPci": true
 },
 {
  "name": "Jefferson Washington Township Hospital",
  "osmName": "Jefferson Washington Township Hospital",
  "lat": 39.73683,
  "lng": -75.0659,
  "primaryPci": true
 },
 {
  "name": "Jersey City Medical Center",
  "osmName": "Jersey City Medical Center",
  "lat": 40.71526,
  "lng": -74.05082,
  "primaryPci": true
 },
 {
  "name": "Jersey Shore University Medical Center",
  "osmName": "Jersey Shore University Medical Center",
  "lat": 40.20899,
  "lng": -74.04099,
  "primaryPci": true
 },
 {
  "name": "JFK University Medical Center",
  "osmName": "JFK Medical Center",
  "lat": 40.55636,
  "lng": -74.35018,
  "primaryPci": true
 },
 {
  "name": "Monmouth Medical Center",
  "osmName": "Monmouth Medical Center",
  "lat": 40.29527,
  "lng": -73.98561,
  "primaryPci": true
 },
 {
  "name": "Morristown Medical Center",
  "osmName": "Morristown Medical Center",
  "lat": 40.78957,
  "lng": -74.46568,
  "primaryPci": true
 },
 {
  "name": "Hackensack Meridian Mountainside Medical",
  "osmName": "Mountainside Hospital",
  "lat": 40.81122,
  "lng": -74.20403,
  "primaryPci": true
 },
 {
  "name": "Newark Beth Israel Medical Center",
  "osmName": "Newark Beth Israel Medical Center",
  "lat": 40.71027,
  "lng": -74.21258,
  "primaryPci": true
 },
 {
  "name": "Newton Medical Center",
  "osmName": "Newton Medical Center",
  "lat": 41.05692,
  "lng": -74.76847,
  "primaryPci": true
 },
 {
  "name": "Ocean University Medical Center",
  "osmName": "Ocean University Medical Center",
  "lat": 40.07665,
  "lng": -74.13304,
  "primaryPci": true
 },
 {
  "name": "Overlook Medical Center",
  "osmName": "Overlook Medical Center",
  "lat": 40.71255,
  "lng": -74.3535,
  "primaryPci": true
 },
 {
  "name": "Penn Medicine Princeton Medical Center",
  "osmName": "Penn Medicine Princeton Medical Center",
  "lat": 40.33976,
  "lng": -74.62382,
  "primaryPci": true
 },
 {
  "name": "Raritan Bay Medical Center at Perth Amboy",
  "osmName": "Raritan Bay Medical Center",
  "lat": 40.51911,
  "lng": -74.28102,
  "primaryPci": true
 },
 {
  "name": "Riverview Medical Center",
  "osmName": "Riverview Medical Center",
  "lat": 40.35368,
  "lng": -74.06319,
  "primaryPci": true
 },
 {
  "name": "RWJ University Hospital at Hamilton",
  "osmName": "Robert Wood Johnson University Hospital Hamilton",
  "lat": 40.2168,
  "lng": -74.67193,
  "primaryPci": true
 },
 {
  "name": "Robert Wood Johnson University Hospital",
  "osmName": "Robert Wood Johnson University Hospital",
  "lat": 40.49531,
  "lng": -74.44961,
  "primaryPci": true
 },
 {
  "name": "RWJ University Hospital at Rahway",
  "osmName": "Robert Wood Johnson University Hospital At Rahway",
  "lat": 40.61314,
  "lng": -74.29091,
  "primaryPci": true
 },
 {
  "name": "Robert Wood Johnson University Hospital Somerset",
  "osmName": "Robert Wood Johnson University Hospital Somerset",
  "lat": 40.56807,
  "lng": -74.59496,
  "primaryPci": true
 },
 {
  "name": "Saint Clare's Hospital at Denville",
  "osmName": "Saint Clare's Denville Hospital",
  "lat": 40.8956,
  "lng": -74.46495,
  "primaryPci": true
 },
 {
  "name": "Saint Peter's University Hospital",
  "osmName": "Saint Peter's University Hospital",
  "lat": 40.50065,
  "lng": -74.45987,
  "primaryPci": true
 },
 {
  "name": "Secaucus University Hospital",
  "osmName": "Hudson Regional Hospital",
  "lat": 40.79134,
  "lng": -74.07362,
  "primaryPci": true
 },
 {
  "name": "Shore Medical Center",
  "osmName": "Shore Medical Center",
  "lat": 39.31546,
  "lng": -74.5909,
  "primaryPci": false
 },
 {
  "name": "Southern Ocean Medical Center",
  "osmName": "Southern Ocean Medical Center",
  "lat": 39.72106,
  "lng": -74.28469,
  "primaryPci": true
 },
 {
  "name": "St Joseph's University Medical Center",
  "osmName": "St. Joseph\u2019s University Medical Center",
  "lat": 40.90361,
  "lng": -74.16573,
  "primaryPci": true
 },
 {
  "name": "St Joseph's Wayne Medical Center",
  "osmName": "St. Joseph's Wayne Hospital",
  "lat": 40.94736,
  "lng": -74.20335,
  "primaryPci": false
 },
 {
  "name": "St Luke's Warren Hospital",
  "osmName": "St. Luke's Hospital - Warren Campus",
  "lat": 40.70198,
  "lng": -75.17819,
  "primaryPci": true
 },
 {
  "name": "St Mary's General Hospital",
  "osmName": "St. Mary's General Hospital",
  "lat": 40.85947,
  "lng": -74.13799,
  "primaryPci": true
 },
 {
  "name": "Saint Michael's Medical Center",
  "osmName": "Saint Michael's Medical Center",
  "lat": 40.74407,
  "lng": -74.17414,
  "primaryPci": true
 },
 {
  "name": "Valley Hospital",
  "osmName": "The Valley Hospital",
  "lat": 40.96471,
  "lng": -74.07154,
  "primaryPci": true
 },
 {
  "name": "Trinitas Regional Medical Center",
  "osmName": "Trinitas Regional Medical Center Williamson Campus",
  "lat": 40.65875,
  "lng": -74.21422,
  "primaryPci": true
 },
 {
  "name": "University Hospital",
  "osmName": "University Hospital",
  "lat": 40.74054,
  "lng": -74.19118,
  "primaryPci": true
 },
 {
  "name": "Virtua West Jersey Hospital Marlton",
  "osmName": "Virtua Marlton Hospital",
  "lat": 39.88175,
  "lng": -74.91867,
  "primaryPci": true
 },
 {
  "name": "Virtua Mount Holly Hospital",
  "osmName": "Virtua Mount Holly Hospital",
  "lat": 39.98611,
  "lng": -74.79472,
  "primaryPci": true
 },
 {
  "name": "Virtua Our Lady Of Lourdes Hospital",
  "osmName": "Virtua Our Lady of Lourdes Hospital",
  "lat": 39.92694,
  "lng": -75.09688,
  "primaryPci": true
 }
]

// Facilities that are tagged "hospital" in map data but do not run an
// emergency department. The rural test that found the capability bug was routed
// to one of these (a children's rehabilitation hospital).
export const NOT_AN_ER = /rehab|rehabilitation|psychiatr|behavioral|behavioural|nursing|hospice|long[- ]term|surgery center|surgical center|ambulatory|dialysis|specialized hospital|weisman|kessler/i

const STOPWORDS = new Set(['hospital', 'medical', 'center', 'centre', 'university', 'the', 'at', 'of', 'and', 'regional', 'health', 'campus', 'general'])
function nameTokens(n: string): Set<string> {
  const t = n.toLowerCase().replace(/\brwj\b/g, 'robert wood johnson').replace(/\bst\.?\b/g, 'saint').replace(/[’']/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ').split(' ').filter(w => w && !STOPWORDS.has(w))
  return new Set(t)
}
function similar(a: string, b: string): boolean {
  const A = nameTokens(a), B = nameTokens(b)
  if (A.size === 0 || B.size === 0) return a.toLowerCase().trim() === b.toLowerCase().trim()
  let inter = 0; A.forEach(x => { if (B.has(x)) inter++ })
  return inter / Math.min(A.size, B.size) >= 0.5
}
/** Primary-PCI status from the NJ Department of Health registry list. */
export function pciStatus(name: string, lat: number, lng: number): 'yes' | 'no' | 'unknown' {
  for (const h of NJ_PCI) {
    if (haversine(lat, lng, h.lat, h.lng) > 600) continue
    if (similar(name, h.name) || similar(name, h.osmName)) return h.primaryPci ? 'yes' : 'no'
  }
  return 'unknown'
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
