import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createClient } from '@supabase/supabase-js'
import { rateLimit, clientKey, tooManyRequests } from '@/lib/rate-limit'
import { CHAT_MODEL, REASONING_JSON, createChat } from '@/lib/model'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const limited = rateLimit(clientKey(req, 'timeline'), 15, 60000)
  if (!limited.ok) return tooManyRequests(limited)

  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 503 })
    }
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { profile } = await req.json()
    if (!profile) return NextResponse.json({ error: 'Missing profile' }, { status: 400 })

    const weeks = profile.surgery_date
      ? Math.floor((Date.now() - new Date(profile.surgery_date).getTime()) / (1000 * 60 * 60 * 24 * 7))
      : null

    const prompt = `You are a cardiac recovery assistant. Return ONLY a JSON object with a "timeline" key containing an array of 4-6 recovery phases. No other text.

Patient: Conditions: ${profile.diagnosis || 'cardiac condition'}, Surgery: ${profile.surgery_date || 'unknown'}, Weeks post-surgery: ${weeks ?? 'unknown'}

Each phase object must have: "week" (string), "title" (string), "normal" (string array), "watchout" (string array), "todo" (string array), "isCurrent" (boolean, true for the phase matching current week).

Example format:
{"timeline":[{"week":"Week 1-2","title":"Initial Recovery","normal":["Rest is normal"],"watchout":["Chest pain"],"todo":["Walk 5 min daily"],"isCurrent":false}]}
Never use em dashes or semicolons. Use short plain sentences.`

    const completion = await createChat(groq, {
      model: CHAT_MODEL,
      ...REASONING_JSON,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    })

    const text = completion.choices[0].message.content || ''
    // Extract JSON object
    let parsed: any[]
    try {
      const stripped = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const obj = JSON.parse(stripped)
      if (Array.isArray(obj)) {
        parsed = obj
      } else if (Array.isArray(obj.timeline)) {
        parsed = obj.timeline
      } else {
        const found = Object.values(obj).find((v) => Array.isArray(v))
        parsed = (found as any[]) || []
      }
    } catch {
      const start = text.indexOf('{')
      const end = text.lastIndexOf('}')
      if (start === -1 || end < start) {
        return NextResponse.json({ error: `No JSON found in response: ${text.slice(0, 100)}` }, { status: 502 })
      }
      try {
        const obj = JSON.parse(text.slice(start, end + 1))
        parsed = Array.isArray(obj.timeline) ? obj.timeline : []
      } catch (e2) {
        return NextResponse.json({ error: `Parse failed: ${text.slice(0, 100)}` }, { status: 502 })
      }
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return NextResponse.json({ error: 'Empty timeline from AI' }, { status: 502 })
    }

    if (!parsed.some((p) => p.isCurrent === true)) {
      parsed[0].isCurrent = true
    }

    return NextResponse.json({ timeline: parsed })
  } catch (e: any) {
    console.error('Groq timeline error:', e)
    return NextResponse.json({ error: e?.message || 'AI unavailable' }, { status: 503 })
  }
}
