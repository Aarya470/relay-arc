import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { lat, lng, radius } = await req.json()

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=hospital&format=json&limit=10&addressdetails=1&viewbox=${lng - 0.5},${lat + 0.5},${lng + 0.5},${lat - 0.5}&bounded=0&lat=${lat}&lon=${lng}`

    const res = await fetch(url, {
      headers: { 'User-Agent': 'RelayArc/1.0' }
    })

    const data = await res.json()
    console.log('Nominatim raw:', data.length, 'results')

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
  } catch (e) {
    console.error('Nominatim error:', e)
    return NextResponse.json({ elements: [] })
  }
}
