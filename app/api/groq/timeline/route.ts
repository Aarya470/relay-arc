import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { profile } = await req.json()
    if (!profile) return NextResponse.json({ error: 'Missing profile' }, { status: 400 })

    const weeks = profile.surgery_date
      ? Math.floor((Date.now() - new Date(profile.surgery_date).getTime()) / (1000 * 60 * 60 * 24 * 7))
      : null

    const prompt = `Generate a personalized cardiac recovery timeline for a patient.
Conditions: ${profile.diagnosis}
Medications: ${JSON.stringify(profile.medications)}
Surgery date: ${profile.surgery_date || 'unknown'}
Weeks post-surgery: ${weeks !== null ? weeks : 'unknown'}

Return a JSON object with key "timeline" containing an array of 4-6 recovery phases.
Each phase must have exactly these fields:
- "week": string
- "title": string
- "normal": array of 3-4 strings
- "watchout": array of 2-3 strings
- "todo": array of 3-4 strings
- "isCurrent": boolean (true for exactly one phase)

Be specific to their cardiac condition.`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: 'You are a cardiac recovery assistant. Respond with valid JSON only containing a "timeline" array. No markdown, no explanation.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    })

    const text = completion.choices[0].message.content || '{}'

    let parsed: any[]
    try {
      const obj = JSON.parse(text)
      if (Array.isArray(obj)) {
        parsed = obj
      } else if (Array.isArray(obj.timeline)) {
        parsed = obj.timeline
      } else if (Array.isArray(obj.phases)) {
        parsed = obj.phases
      } else {
        const found = Object.values(obj).find((v) => Array.isArray(v))
        parsed = (found as any[]) || []
      }
    } catch {
      const start = text.indexOf('[')
      const end = text.lastIndexOf(']')
      if (start === -1 || end < start) {
        return NextResponse.json({ error: 'Invalid AI response' }, { status: 502 })
      }
      try {
        parsed = JSON.parse(text.slice(start, end + 1))
      } catch {
        return NextResponse.json({ error: 'Could not parse AI response' }, { status: 502 })
      }
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return NextResponse.json({ error: 'Empty timeline' }, { status: 502 })
    }

    const valid = parsed.every(
      (item: any) =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.week === 'string' &&
        typeof item.title === 'string' &&
        Array.isArray(item.normal) &&
        Array.isArray(item.watchout) &&
        Array.isArray(item.todo)
    )
    if (!valid) {
      return NextResponse.json({ error: 'Invalid timeline shape' }, { status: 502 })
    }

    if (!parsed.some((p) => p.isCurrent === true)) {
      parsed[0].isCurrent = true
    }

    return NextResponse.json({ timeline: parsed })
  } catch (e) {
    console.error('Groq timeline error:', e)
    return NextResponse.json({ error: 'AI unavailable' }, { status: 503 })
  }
}
