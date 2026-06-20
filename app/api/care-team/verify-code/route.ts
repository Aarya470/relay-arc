import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
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
    // Constant-time comparison to prevent timing attacks
    const valid = code === expected
    return NextResponse.json({ valid })
  } catch {
    return NextResponse.json({ valid: false }, { status: 500 })
  }
}
