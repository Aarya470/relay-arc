import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createClient } from '@supabase/supabase-js'
import { rateLimit, clientKey, tooManyRequests } from '@/lib/rate-limit'
import { CHAT_MODEL } from '@/lib/model'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const limited = rateLimit(clientKey(req, 'insights'), 15, 60000)
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

    const body = await req.json()
    const { checkins, vitals, medicationAdherence } = body

    const checkinSummaries = Array.isArray(checkins) && checkins.length > 0
      ? checkins.map((c: any) => c.summary || c.mood || 'logged').join('; ')
      : 'No check-ins this week'

    const vitalsSummary = Array.isArray(vitals) && vitals.length > 0
      ? vitals.map((v: any) => {
          const parts: string[] = []
          if (v.heart_rate) parts.push(`HR ${v.heart_rate}bpm`)
          if (v.blood_pressure_systolic && v.blood_pressure_diastolic) parts.push(`BP ${v.blood_pressure_systolic}/${v.blood_pressure_diastolic}`)
          if (v.weight_kg) parts.push(`${v.weight_kg}kg`)
          return parts.join(', ') || 'logged'
        }).join('; ')
      : 'No vitals logged this week'

    const adherencePct = typeof medicationAdherence === 'number'
      ? Math.round(medicationAdherence)
      : 'unknown'

    const prompt = `You are a cardiac recovery health coach. Based on the patient data below, generate exactly 3 personalized insights in JSON format.

Data:
- Recent check-ins (last 7 days): ${checkinSummaries}
- Vitals trend: ${vitalsSummary}
- Medication adherence this week: ${adherencePct}%

Return ONLY a JSON array with exactly 3 objects. Each object must have:
- "type": one of "positive", "warning", "tip"
- "icon": one of "heart", "trend", "pill", "star", "alert"
- "text": the insight text (max 80 chars, specific and actionable)

Example: [{"type":"positive","icon":"heart","text":"Your resting heart rate improved by 4 bpm this week."}]`

    const completion = await groq.chat.completions.create({
      model: CHAT_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 512,
    })

    const text = completion.choices[0].message.content || ''

    let insights: any[]
    try {
      const stripped = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed = JSON.parse(stripped)
      insights = Array.isArray(parsed) ? parsed : (parsed.insights || [])
    } catch {
      const start = text.indexOf('[')
      const end = text.lastIndexOf(']')
      if (start === -1 || end < start) {
        return NextResponse.json({ error: `No JSON array found: ${text.slice(0, 100)}` }, { status: 502 })
      }
      try {
        insights = JSON.parse(text.slice(start, end + 1))
      } catch {
        return NextResponse.json({ error: `Parse failed: ${text.slice(0, 100)}` }, { status: 502 })
      }
    }

    if (!Array.isArray(insights) || insights.length === 0) {
      return NextResponse.json({ error: 'Empty insights from AI' }, { status: 502 })
    }

    // Validate and sanitize each insight
    const validTypes = new Set(['positive', 'warning', 'tip'])
    const validIcons = new Set(['heart', 'trend', 'pill', 'star', 'alert'])
    insights = insights.slice(0, 3).map((ins: any) => ({
      type: validTypes.has(ins.type) ? ins.type : 'tip',
      icon: validIcons.has(ins.icon) ? ins.icon : 'star',
      text: String(ins.text || '').slice(0, 120),
    }))

    return NextResponse.json({ insights })
  } catch (e: any) {
    console.error('Groq insights error:', e)
    return NextResponse.json({ error: e?.message || 'AI unavailable' }, { status: 503 })
  }
}
