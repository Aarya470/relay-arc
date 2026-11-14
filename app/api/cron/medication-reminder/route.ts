import { safeEqual } from '@/lib/security'
import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

// This cron runs at 3:00 UTC (8:30 AM IST), 7:30 UTC (1:00 PM IST), 14:30 UTC (8:00 PM IST)
// It sends medication reminders to users who have medications scheduled around that time
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  // Fail closed: with no secret set, nobody can trigger this from outside.
  if (!process.env.CRON_SECRET || !safeEqual(authHeader, `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  // Get current hour in IST (UTC+5:30)
  const nowUTC = new Date()
  const istOffsetMs = 5.5 * 60 * 60 * 1000
  const nowIST = new Date(nowUTC.getTime() + istOffsetMs)
  const hourIST = nowIST.getHours()

  // Determine which time slot this run covers
  // 8-10 AM IST = morning meds, 12-2 PM IST = afternoon meds, 7-9 PM IST = evening meds
  const isMorning = hourIST >= 8 && hourIST < 10
  const isAfternoon = hourIST >= 12 && hourIST < 14
  const isEvening = hourIST >= 19 && hourIST < 21

  if (!isMorning && !isAfternoon && !isEvening) {
    return NextResponse.json({ sent: 0, reason: 'Not a medication reminder window' })
  }

  const timeLabel = isMorning ? 'morning' : isAfternoon ? 'afternoon' : 'evening'
  const title = `Time for your ${timeLabel} medications`
  const body = 'Tap to mark your medications as taken.'

  // Get all push subscriptions
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('user_id, subscription')

  if (!subscriptions?.length) {
    return NextResponse.json({ sent: 0 })
  }

  // Get profiles with medications to check if they have meds for this time slot
  const userIds = subscriptions.map((s) => s.user_id)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, medications')
    .in('id', userIds)

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) || [])

  // Check medication_logs for today to avoid re-reminding users who already took their meds
  const startOfDayIST = new Date(nowIST)
  startOfDayIST.setHours(0, 0, 0, 0)
  const startOfDayUTC = new Date(startOfDayIST.getTime() - istOffsetMs)

  const { data: todayLogs } = await supabase
    .from('medication_logs')
    .select('user_id, medication_name')
    .gte('taken_at', startOfDayUTC.toISOString())

  // Build set of (userId, medName) pairs already taken today
  const takenSet = new Set((todayLogs || []).map((l) => `${l.user_id}:${l.medication_name}`))

  let sent = 0
  for (const sub of subscriptions) {
    const profile = profileMap.get(sub.user_id)
    const meds: any[] = profile?.medications || []
    if (!meds.length) continue

    // Check if this user has any medications for this time slot that haven't been taken
    const hasPendingMeds = meds.some((med) => {
      const alreadyTaken = takenSet.has(`${sub.user_id}:${med.name}`)
      if (alreadyTaken) return false
      // Check if medication time matches the current slot
      const medTime = (med.time || '').toLowerCase()
      if (
        isMorning &&
        (medTime.includes('morning') ||
          medTime.includes('am') ||
          medTime.includes('8:') ||
          medTime.includes('9:'))
      )
        return true
      if (
        isAfternoon &&
        (medTime.includes('afternoon') ||
          medTime.includes('noon') ||
          medTime.includes('12:') ||
          medTime.includes('1:'))
      )
        return true
      if (
        isEvening &&
        (medTime.includes('evening') ||
          medTime.includes('night') ||
          medTime.includes('pm') ||
          medTime.includes('8:') ||
          medTime.includes('9:'))
      )
        return true
      // If no time specified, include in morning slot
      if (isMorning && !medTime) return true
      return false
    })

    if (!hasPendingMeds) continue

    try {
      const subscription = JSON.parse(sub.subscription)
      await webpush.sendNotification(
        subscription,
        JSON.stringify({ title, body, data: { url: '/medications' } }),
      )
      sent++
    } catch {}
  }

  return NextResponse.json({ sent })
}
