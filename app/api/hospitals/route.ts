import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { lat, lng, radius } = await req.json()

  try {
    const url = `https://nominatim.openstreetmap.org/search?` +
      `q=hospital&` +
      `lat=${lat}&lon=${lng}&` +
      `radius=${radius}&` +
      `format=json&` +
      `limit=10&` +
      `addressdetails=1&` +
      `extratags=1&` +
      `viewbox=${lng - 1},${lat + 1},${lng + 1},${lat - 1}&` +
      `bounded=1`

    const res = await fetch(url, {
      headers: { 'User-Agent': 'RelayArc/1.0 emergency-routing-app' }
    })

    const data = await res.json()

    // Convert Nominatim format to our format
    const elements = data
      .filter((item: any) => item.type !== 'administrative')
      .map((item: any) => ({
        id: String(item.place_id),
        tags: {
          name: item.display_name.split(',')[0],
          'addr:city': item.address?.city || item.address?.town || '',
          'addr:state': item.address?.state || '',
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
