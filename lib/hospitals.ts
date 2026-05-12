export interface Hospital {
  id: string
  name: string
  lat: number
  lng: number
  address: string
  distance?: number
  capability?: string
  phone?: string
}

// Emergency type to OSM tags mapping
const EMERGENCY_CAPABILITIES: Record<string, { tags: string[]; label: string }> = {
  chest_pain: {
    tags: ['hospital', 'clinic'],
    label: 'Cardiac catheterization lab'
  },
  stroke: {
    tags: ['hospital'],
    label: 'Stroke center'
  },
  pots: {
    tags: ['hospital', 'clinic'],
    label: 'Autonomic disorders unit'
  },
  unconscious: {
    tags: ['hospital'],
    label: 'Level 1 trauma center'
  },
  breathing: {
    tags: ['hospital'],
    label: 'Pulmonary emergency unit'
  },
  mecfs: {
    tags: ['hospital', 'clinic'],
    label: 'Emergency stabilization'
  },
  other: {
    tags: ['hospital'],
    label: 'Emergency care'
  }
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export async function findNearbyHospitals(
  lat: number,
  lng: number,
  emergencyType: string,
  radiusKm: number = 50
): Promise<Hospital[]> {
  const radius = radiusKm * 1000
  const capability = EMERGENCY_CAPABILITIES[emergencyType] || EMERGENCY_CAPABILITIES.other

  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="hospital"](around:${radius},${lat},${lng});
      way["amenity"="hospital"](around:${radius},${lat},${lng});
      node["amenity"="clinic"](around:${radius},${lat},${lng});
    );
    out center;
  `

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
      headers: { 'Content-Type': 'text/plain' }
    })

    const data = await res.json()

    const hospitals: Hospital[] = data.elements
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
          phone: el.tags.phone || el.tags['contact:phone'] || ''
        }
      })
      .filter((h: Hospital) => h.lat && h.lng)
      .sort((a: Hospital, b: Hospital) => (a.distance || 0) - (b.distance || 0))

    return hospitals.slice(0, 5)
  } catch (e) {
    console.error('Overpass API error:', e)
    return []
  }
}

export function formatDistance(meters: number): string {
  return meters >= 1000
    ? `${(meters / 1000).toFixed(1)} km`
    : `${Math.round(meters)} m`
}

export function estimateTime(meters: number): string {
  const minutes = Math.round(meters / 1000 / 50 * 60)
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes/60)}h ${minutes%60}m`
}
