// DEPRECATED PATH — kept only so already-cached clients keep working.
import type { NextRequest } from 'next/server'
import { handleRiskRequest } from '@/lib/risk/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  return handleRiskRequest(req)
}
