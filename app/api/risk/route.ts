// Deterministic deterioration risk. No language model, no external API.
// Logic lives in lib/risk/server.ts; scoring in lib/risk/index.ts.
import type { NextRequest } from 'next/server'
import { handleRiskRequest } from '@/lib/risk/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  return handleRiskRequest(req)
}
