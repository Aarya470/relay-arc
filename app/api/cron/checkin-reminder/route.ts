import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('user_id, subscription')

  if (!subscriptions?.length) {
    return NextResponse.json({ sent: 0 })
  }

  const { data: todayCheckins } = await supabase
    .from('checkins')
    .select('user_id')
    .gte('created_at', startOfDay.toISOString())

  const checkedInUserIds = new Set(todayCheckins?.map(c => c.user_id) || [])

  const hour = new Date().getHours()
  const isMorning = hour === 8
  const title = isMorning ? 'Good morning! Time for your check-in' : 'Daily check-in reminder'
  const body = isMorning
    ? 'Start your day right — complete your daily health check-in.'
    : "You haven't completed your daily check-in yet. Tap to do it now."

  let sent = 0
  for (const sub of subscriptions) {
    if (checkedInUserIds.has(sub.user_id)) continue
    try {
      const subscription = JSON.parse(sub.subscription)
      await webpush.sendNotification(
        subscription,
        JSON.stringify({ title, body, data: { url: '/checkin' } })
      )
      sent++
    } catch {}
  }

  return NextResponse.json({ sent })
}
