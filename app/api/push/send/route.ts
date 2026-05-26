import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    // Verify caller is authenticated
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { userId, title, body: msgBody } = body

    // Validate inputs
    if (!userId || !title || !msgBody) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    if (typeof userId !== 'string' || userId.length > 100) {
      return NextResponse.json({ error: 'Invalid userId' }, { status: 400 })
    }
    if (typeof title !== 'string' || title.length > 200) {
      return NextResponse.json({ error: 'Invalid title' }, { status: 400 })
    }
    if (typeof msgBody !== 'string' || msgBody.length > 500) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }

    // Caller must be sending to themselves OR be a care team member
    const isSelf = user.id === userId
    if (!isSelf) {
      const { data: member } = await supabase
        .from('care_team_members')
        .select('id')
        .eq('id', user.id)
        .single()
      if (!member) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const { data } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId)
      .single()

    if (!data) return NextResponse.json({ error: 'No subscription found' }, { status: 404 })

    const subscription = JSON.parse(data.subscription)
    await webpush.sendNotification(subscription, JSON.stringify({ title, body: msgBody }))

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Push send error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
