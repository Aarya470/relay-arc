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
    // Auth check
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { profile } = await req.json()
    if (!profile) return NextResponse.json({ error: 'Missing profile' }, { status: 400 })

    const weeks = profile.surgery_date
      ? Math.floor((Date.now() - new Date(profile.surgery_date).getTime()) / (1000 * 60 * 60 * 24 * 7))
      : null

    // Omit full name from prompt — use "the patient" to reduce PHI exposure
    const prompt = `Generate a personalized recovery timeline as JSON only.
Conditions: ${profile.diagnosis}, Meds: ${JSON.stringify(profile.medications)}, Surgery: ${profile.surgery_date || 'N/A'}, Weeks since surgery: ${weeks !== null ? weeks : 'N/A'}.
Return JSON array of 4-6 phases. Each: { "week": string, "title": string, "normal": string[], "watchout": string[], "todo": string[], "isCurrent": boolean }
Make it specific to their conditions. JSON only, no other text.`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3
    })

    const text = completion.choices[0].message.content || '[]'
    const clean = text.replace(/```json|```/g, '').trim()

    // Validate the response is a JSON array
    let parsed: unknown
    try {
      parsed = JSON.parse(clean)
    } catch {
      return NextResponse.json({ error: 'Invalid AI response' }, { status: 502 })
    }

    if (!Array.isArray(parsed)) {
      return NextResponse.json({ error: 'Unexpected AI response shape' }, { status: 502 })
    }

    // Validate each item has required fields
    const valid = parsed.every((item: any) =>
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

    return NextResponse.json({ timeline: parsed })
  } catch (e) {
    console.error('Groq timeline error:', e)
    return NextResponse.json({ error: 'AI unavailable' }, { status: 503 })
  }
}
