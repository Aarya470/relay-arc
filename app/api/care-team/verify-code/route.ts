import { readJson } from '@/lib/security'
import { NextRequest, NextResponse } from 'next/server'
import { safeEqual } from '@/lib/security'
import { rateLimit, clientKey, tooManyRequests } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const limited = rateLimit(clientKey(req, 'care-code'), 5, 15 * 60_000)
  if (!limited.ok) return tooManyRequests(limited)
  try {
    const { code } = ((await readJson<any>(req)) ?? {})
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ valid: false }, { status: 400 })
    }
    const expected = process.env.CARE_TEAM_ACCESS_CODE
    if (!expected) {
      console.error('CARE_TEAM_ACCESS_CODE env var not set')
      return NextResponse.json({ valid: false }, { status: 500 })
    }
    const valid = code.length <= 200 && safeEqual(code, expected)
    return NextResponse.json({ valid })
  } catch {
    return NextResponse.json({ valid: false }, { status: 500 })
  }
}
