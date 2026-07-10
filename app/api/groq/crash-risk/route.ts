import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export type RiskLevel = 'low' | 'medium' | 'high'

export interface CrashRisk {
  level: RiskLevel
  reason: string
  advice: string
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 503 })
    }

    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch last 7 check-ins
    const { data: checkins } = await supabase
      .from('checkins')
      .select('summary, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(7)

    if (!checkins || checkins.length < 3) {
      return NextResponse.json({ risk: null })
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    const recent = checkins.map(c => ({
      date: new Date(c.created_at).toLocaleDateString(),
      summary: c.summary?.slice(0, 200),
    }))

    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: 'You analyze health check-in summaries for people with chronic conditions (POTS, ME/CFS, cardiac conditions). Identify if the trend over the last few days suggests an impending symptom flare or crash. Be conservative — only flag medium/high if there is a clear worsening trend. Respond ONLY with valid JSON, no other text: {"level":"low","reason":"...","advice":"..."} where level is "low", "medium", or "high".',
        },
        {
          role: 'user',
          content: `Recent check-ins (newest first):\n${JSON.stringify(recent, null, 2)}`,
        },
      ],
      max_tokens: 200,
      temperature: 0.2,
    })

    const text = response.choices[0].message.content || ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ risk: null })

    const parsed = JSON.parse(match[0])
    if (!['low', 'medium', 'high'].includes(parsed.level)) {
      return NextResponse.json({ risk: null })
    }

    return NextResponse.json({ risk: parsed as CrashRisk })
  } catch (e: any) {
    console.error('Crash risk error:', e)
    return NextResponse.json({ risk: null })
  }
}
