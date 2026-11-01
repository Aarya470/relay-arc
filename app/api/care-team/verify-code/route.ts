import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { rateLimit, clientKey, tooManyRequests } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const limited = rateLimit(clientKey(req, 'care-code'), 5, 15 * 60_000)
  if (!limited.ok) return tooManyRequests(limited)
  try {
    const { code } = await req.json()
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ valid: false }, { status: 400 })
    }
    const expected = process.env.CARE_TEAM_ACCESS_CODE
    if (!expected) {
      console.error('CARE_TEAM_ACCESS_CODE env var not set')
      return NextResponse.json({ valid: false }, { status: 500 })
    }
    const a = Buffer.from(code)
    const b = Buffer.from(expected)
    const valid = a.length === b.length && timingSafeEqual(a, b)
    return NextResponse.json({ valid })
  } catch {
    return NextResponse.json({ valid: false }, { status: 500 })
  }
}
