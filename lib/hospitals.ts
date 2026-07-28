export interface PartnerStatus {
  name: string
  accepting: boolean
  cathLab: boolean | null
  strokeUnit: boolean | null
  traumaUnit: boolean | null
  bedsFree: number | null
  updatedAt: string
}

// Which facility capability matters for which emergency
export const CAPABILITY_FOR_TYPE: Record<string, keyof Pick<PartnerStatus, 'cathLab' | 'strokeUnit' | 'traumaUnit'>> = {
  chest_pain: 'cathLab',
  stroke: 'strokeUnit',
  unconscious: 'traumaUnit',
}

export interface Hospital {
  id: string
  name: string
  lat: number
  lng: number
  address: string
  distance?: number
  capability?: string
  phone?: string
  etaSec?: number
  etaTrafficSec?: number
  liveTraffic?: boolean
  partner?: PartnerStatus | null
}

// Emergency type to OSM tags mapping
const EMERGENCY_CAPABILITIES: Record<string, { tags: string[]; label: string }> = {
  chest_pain: { tags: ['hospital', 'clinic'], label: 'Cardiac catheterization lab' },
  stroke: { tags: ['hospital'], label: 'Stroke center' },
  pots: { tags: ['hospital', 'clinic'], label: 'Autonomic disorders unit' },
  unconscious: { tags: ['hospital'], label: 'Level 1 trauma center' },
  breathing: { tags: ['hospital'], label: 'Pulmonary emergency unit' },
  mecfs: { tags: ['hospital', 'clinic'], label: 'Emergency stabilization' },
  other: { tags: ['hospital'], label: 'Emergency care' },
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

// ── Traffic model — time-of-day congestion heuristic, clearly labeled as
// estimated. Swap point for a live provider (TomTom/Mapbox) later: replace
// trafficMultiplier() with a per-route live factor.
export function trafficMultiplier(d: Date = new Date()): number {
  const h = d.getHours()
  const sunday = d.getDay() === 0
  if (h >= 8 && h < 11) return sunday ? 1.15 : 1.5
  if (h >= 17 && h < 21) return sunday ? 1.2 : 1.6
  if (h >= 11 && h < 17) return sunday ? 1.1 : 1.25
  if (h >= 21 || h < 6) return 1.0
  return 1.15
}
export function trafficLabel(d: Date = new Date()): string {
  const m = trafficMultiplier(d)
  if (m >= 1.45) return 'heavy traffic est.'
  if (m >= 1.2) return 'moderate traffic est.'
  return 'light traffic'
}

// ── Real drive times: one OSRM matrix call for all candidates ──────────────
const ROUTERS = [
  'https://routing.openstreetmap.de/routed-car',
  'https://router.project-osrm.org',
]
async function fetchDriveTimes(from: [number, number], hs: Hospital[]): Promise<(number | null)[]> {
  const coords = [`${from[1]},${from[0]}`, ...hs.map(h => `${h.lng},${h.lat}`)].join(';')
  for (const base of ROUTERS) {
    try {
      const res = await fetch(`${base}/table/v1/driving/${coords}?sources=0&annotations=duration`)
      if (!res.ok) continue
      const json = await res.json()
      if (json.code !== 'Ok' || !json.durations?.[0]) continue
      return json.durations[0].slice(1)
    } catch { /* try next */ }
  }
  return hs.map(() => null)
}

// ── Partner status: what the hospital itself reports through the portal ─────
async function fetchPartnerStatuses(hs: Hospital[]): Promise<(PartnerStatus | null)[]> {
  try {
    const res = await fetch('/api/hospitals/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidates: hs.map(h => ({ id: h.id, name: h.name, lat: h.lat, lng: h.lng })) }),
    })
    if (!res.ok) return hs.map(() => null)
    const { statuses } = await res.json()
    return hs.map(h => statuses?.[h.id] || null)
  } catch {
    return hs.map(() => null)
  }
}

// ── Live traffic (optional): set NEXT_PUBLIC_TOMTOM_KEY in Vercel env and
// the top candidates get true live-traffic ETAs from TomTom Routing;
// without a key, the time-of-day heuristic below applies unchanged.
async function liveTrafficEta(from: [number, number], h: Hospital): Promise<number | null> {
  const key = process.env.NEXT_PUBLIC_TOMTOM_KEY
  if (!key) return null
  try {
    const url = `https://api.tomtom.com/routing/1/calculateRoute/${from[0]},${from[1]}:${h.lat},${h.lng}/json?traffic=true&travelMode=car&key=${key}`
    const res = await fetch(url)
    if (!res.ok) return null
    const json = await res.json()
    const sec = json.routes?.[0]?.summary?.travelTimeInSeconds
    return typeof sec === 'number' ? sec : null
  } catch { return null }
}

export async function findNearbyHospitals(
  lat: number,
  lng: number,
  emergencyType: string,
  radiusKm: number = 50
): Promise<Hospital[]> {
  const radius = radiusKm * 1000
  const capability = EMERGENCY_CAPABILITIES[emergencyType] || EMERGENCY_CAPABILITIES.other

  try {
    const res = await fetch('/api/hospitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng, radius })
    })

    const data = await res.json()
    const elements = data.elements || []

    let hospitals: Hospital[] = elements
      .filter((el: any) => el.tags?.name)
      .map((el: any) => {
        const elLat = el.lat || el.center?.lat
        const elLng = el.lon || el.center?.lon
        return {
          id: String(el.id),
          name: el.tags.name,
          lat: elLat,
          lng: elLng,
          address: [
            el.tags['addr:housenumber'],
            el.tags['addr:street'],
            el.tags['addr:city'],
            el.tags['addr:state']
          ].filter(Boolean).join(', ') || 'Address unavailable',
          distance: haversine(lat, lng, elLat, elLng),
          capability: capability.label,
          phone: el.tags.phone || ''
        }
      })
      .filter((h: Hospital) => h.lat && h.lng && h.name)
      .sort((a: Hospital, b: Hospital) => (a.distance || 0) - (b.distance || 0))
      .slice(0, 8)

    if (hospitals.length === 0) return []

    // Real drive times + hospital-reported status, in parallel
    const [times, statuses] = await Promise.all([
      fetchDriveTimes([lat, lng], hospitals),
      fetchPartnerStatuses(hospitals),
    ])
    const mult = trafficMultiplier()
    hospitals = hospitals.map((h, i) => ({
      ...h,
      etaSec: times[i] ?? undefined,
      etaTrafficSec: times[i] != null ? Math.round(times[i]! * mult) : undefined,
      partner: statuses[i],
    }))

    // Dispatch score: traffic-adjusted ETA, penalize diverting partners hard,
    // slightly favor facilities actively reporting they are accepting.
    const capKey = CAPABILITY_FOR_TYPE[emergencyType]
    const score = (h: Hospital) => {
      let base = h.etaTrafficSec ?? ((h.distance || 0) / 1000 / 40 * 3600 * mult)
      if (h.partner && fresh(h.partner)) {
        if (!h.partner.accepting) return base * 2.2
        base *= 0.85
        // Type-relevant capability, as reported by the facility itself
        if (capKey) {
          if (h.partner[capKey] === true) base *= 0.8
          else if (h.partner[capKey] === false) base *= 1.35
        }
      }
      return base
    }
    hospitals.sort((a, b) => score(a) - score(b))
    hospitals = hospitals.slice(0, 5)

    // Upgrade the top 3 with live-traffic ETAs when a provider key is set
    if (process.env.NEXT_PUBLIC_TOMTOM_KEY) {
      const top = hospitals.slice(0, 3)
      const live = await Promise.all(top.map(h => liveTrafficEta([lat, lng], h)))
      live.forEach((sec, i) => {
        if (sec != null) {
          hospitals[i] = { ...hospitals[i], etaTrafficSec: sec, liveTraffic: true }
        }
      })
      hospitals.sort((a, b) => score(a) - score(b))
    }
    return hospitals
  } catch (e) {
    console.error('Hospital search error:', e)
    return []
  }
}

export function fresh(p: PartnerStatus, maxMin = 240): boolean {
  return Date.now() - new Date(p.updatedAt).getTime() < maxMin * 60 * 1000
}

export function formatDistance(meters: number): string {
  return meters >= 1000
    ? `${(meters / 1000).toFixed(1)} km`
    : `${Math.round(meters)} m`
}

export function formatEtaMin(h: Hospital): number | null {
  if (h.etaTrafficSec != null) return Math.max(1, Math.round(h.etaTrafficSec / 60))
  return null
}

export function estimateTime(meters: number): string {
  const minutes = Math.round(meters / 1000 / 50 * 60)
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes/60)}h ${minutes%60}m`
}

export function etaText(h: Hospital): string {
  const m = formatEtaMin(h)
  if (m != null) return m < 60 ? `${m} min` : `${Math.floor(m/60)}h ${m%60}m`
  return estimateTime(h.distance || 0)
}
