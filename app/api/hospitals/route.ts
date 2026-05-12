import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { lat, lng, radius } = await req.json()

  const query = `
    [out:json][timeout:30];
    (
      node["amenity"="hospital"](around:${radius},${lat},${lng});
      way["amenity"="hospital"](around:${radius},${lat},${lng});
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
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch hospitals' }, { status: 500 })
  }
}
