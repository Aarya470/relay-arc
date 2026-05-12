import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { lat, lng } = await req.json()

  // Try increasingly large bounding boxes until we get results
  const boxes = [0.2, 0.5, 1.0, 2.0]

  for (const box of boxes) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?` +
        `q=hospital&` +
        `format=json&` +
        `limit=15&` +
        `addressdetails=1&` +
        `viewbox=${lng - box},${lat + box},${lng + box},${lat - box}&` +
        `bounded=1`

      const res = await fetch(url, {
        headers: { 'User-Agent': 'RelayArc/1.0' }
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

        console.log(`Found ${elements.length} hospitals at box ${box}`)
        return NextResponse.json({ elements })
      }
    } catch (e) {
      continue
    }
  }

  return NextResponse.json({ elements: [] })
}
