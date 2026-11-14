import { readJson } from '@/lib/security'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { lat, lng, radius } = ((await readJson<any>(req)) ?? {})

  // SEC-6: Validate lat/lng ranges before making outbound requests
  if (
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
  }

  // The Nominatim query uses bounding boxes rather than a radius parameter.
  const initialBox = radius ? Math.min(radius / 111_000, 2.0) : 0.2
  const boxes = Array.from(new Set([initialBox, 0.5, 1.0, 2.0])).sort((a, b) => a - b)

  for (const box of boxes) {
    try {
      const url =
        `https://nominatim.openstreetmap.org/search?` +
        `q=hospital&` +
        `format=json&` +
        `limit=15&` +
        `addressdetails=1&` +
        `viewbox=${lng - box},${lat + box},${lng + box},${lat - box}&` +
        `bounded=1`

      const res = await fetch(url, {
        headers: { 'User-Agent': 'RelayArc/1.0 (cardiac-emergency-app)' },
      })

      const data = await res.json()

      if (data.length >= 3) {
        const elements = data.map((item: any) => ({
          id: String(item.place_id),
          tags: {
            name: item.display_name.split(',')[0].trim(),
            'addr:city': item.address?.city || item.address?.town || item.address?.village || '',
            'addr:state': item.address?.state || '',
            'addr:street': item.address?.road || '',
          },
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
        }))

        return NextResponse.json({ elements })
      }
    } catch (e) {
      continue
    }
  }

  return NextResponse.json({ elements: [] })
}
