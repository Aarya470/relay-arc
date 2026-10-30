import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authedClient } from '@/lib/supabase-route'

// Kept only for calls that are genuinely anonymous. Anything that reads or
// writes a user's rows must go through the request-scoped client instead, or
// RLS sees no user. See lib/supabase-route.ts.
const anonSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

export async function POST(req: NextRequest) {
  try {
    // Verify caller is authenticated
    const auth = await authedClient(req)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { supabase } = auth
    const user = { id: auth.userId }

    const body = await req.json()
    const { subscription, userId } = body

    if (!subscription || !userId) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    }

    // Users can only register their own subscription
    if (user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Validate subscription shape
    if (typeof subscription !== 'object' || !subscription.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }
    if (typeof subscription.endpoint !== 'string' || subscription.endpoint.length > 512) {
      return NextResponse.json({ error: 'Invalid subscription endpoint' }, { status: 400 })
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        { user_id: userId, subscription: JSON.stringify(subscription) },
        { onConflict: 'user_id' },
      )

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Subscribe error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
