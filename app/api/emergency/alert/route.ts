import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { authedClient } from '@/lib/supabase-route'

// Kept only for calls that are genuinely anonymous. Anything that reads or
// writes a user's rows must go through the request-scoped client instead, or
// RLS sees no user. See lib/supabase-route.ts.
const anonSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_CONTACT_EMAIL || 'admin@relayarc.com'}`,
  process.env.NEXT_PUBLIC_VAPID_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function POST(req: NextRequest) {
  const auth = await authedClient(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { supabase } = auth
  const user = { id: auth.userId }

  const { emergencyId, emergencyType, patientName, hospitalName } = await req.json()

  // Fetch all care team members
  const { data: careTeamMembers } = await supabase
    .from('care_team_members')
    .select('id')

  if (!careTeamMembers || careTeamMembers.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  const careTeamIds = careTeamMembers.map((m: any) => m.id)

  // Fetch their push subscriptions
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('*')
    .in('user_id', careTeamIds)

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  const EMERGENCY_LABELS: Record<string, string> = {
    chest_pain: 'Chest pain',
    unconscious: 'Unconscious',
    breathing: "Can't breathe",
    pots: 'POTS episode',
    stroke: 'Stroke signs',
    mecfs: 'Severe crash',
    other: 'Emergency',
  }

  const title = `🚨 EMERGENCY — ${patientName || 'Patient'}`
  const body = `${EMERGENCY_LABELS[emergencyType] || emergencyType}${hospitalName ? ` · Routing to ${hospitalName}` : ''}`

  let sent = 0
  const failed: string[] = []

  await Promise.allSettled(
    subscriptions.map(async (sub: any) => {
      try {
        const pushSub = typeof sub.subscription === 'string'
          ? JSON.parse(sub.subscription)
          : sub.subscription
        await webpush.sendNotification(pushSub, JSON.stringify({
          title,
          body,
          requireInteraction: true,
          data: { url: '/care-team/dashboard' }
        }))
        sent++
      } catch (e: any) {
        failed.push(sub.user_id)
        // Remove stale subscription
        if (e.statusCode === 410 || e.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        }
      }
    })
  )

  return NextResponse.json({ sent, failed: failed.length })
}
