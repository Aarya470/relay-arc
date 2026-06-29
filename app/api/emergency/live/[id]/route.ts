import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Fetch emergency
  const { data: emergency, error } = await supabaseAdmin
    .from('emergencies')
    .select('id, user_id, emergency_type, status, created_at')
    .eq('id', id)
    .single()

  if (error || !emergency) {
    return NextResponse.json({ error: 'Emergency not found' }, { status: 404 })
  }

  // Fetch patient first name only (not full profile)
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name')
    .eq('id', emergency.user_id)
    .single()

  const firstName = profile?.full_name?.split(' ')[0] || 'Your family member'

  return NextResponse.json({
    id: emergency.id,
    type: emergency.emergency_type,
    status: emergency.status,
    startedAt: emergency.created_at,
    patientFirstName: firstName,
  })
}
