import { readJson } from '@/lib/security'
import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createClient } from '@supabase/supabase-js'
import { rateLimit, clientKey, tooManyRequests } from '@/lib/rate-limit'
import { CHAT_MODEL, REASONING_JSON, createChat } from '@/lib/model'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const VALID_TYPES = [
  'chest_pain',
  'unconscious',
  'breathing',
  'pots',
  'stroke',
  'mecfs',
  'other',
] as const

export async function POST(req: NextRequest) {
  const limited = rateLimit(clientKey(req, 'classify'), 30, 60000)
  if (!limited.ok) return tooManyRequests(limited)

  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 503 })
    }

    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { transcript, lang } = ((await readJson<any>(req)) ?? {})
    if (!transcript || typeof transcript !== 'string' || transcript.length > 600) {
      return NextResponse.json({ error: 'Invalid transcript' }, { status: 400 })
    }

    // This endpoint only runs when the on-device engine abstained, so the input
    // is already unusual phrasing. Telling the model which language was spoken
    // stops it treating romanised Hindi/Marathi as garbled English.
    const LANG_NAME: Record<string, string> = {
      hi: 'Hindi',
      mr: 'Marathi',
      es: 'Spanish',
      en: 'English',
    }
    const spoken = LANG_NAME[lang] || 'English'
    const langHint =
      spoken === 'English'
        ? ''
        : `\n\nThe description was spoken in ${spoken}. It may be in Devanagari script or romanised (Latin letters spelling ${spoken} words). Translate it yourself before classifying. Classify on meaning, never on spelling.`

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    const response = await createChat(groq, {
      model: CHAT_MODEL,
      ...REASONING_JSON,
      response_format: { type: 'json_object' as const },
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: `You classify a spoken emergency description into exactly one category. Categories:
- chest_pain: chest pain, pressure, tightness, jaw/arm pain, heart attack symptoms
- unconscious: someone collapsed, unresponsive, fainted and not waking
- breathing: severe shortness of breath, cannot breathe, choking
- pots: severe dizziness on standing, racing heart, near-fainting (POTS episode)
- stroke: face drooping, slurred speech, one-sided weakness
- mecfs: severe ME/CFS crash, post-exertional collapse
- other: anything else urgent

Respond ONLY with valid JSON, no other text: {"type":"chest_pain","confidence":"high"} where type is one of the categories and confidence is "high", "medium" or "low".${langHint}`,
        },
        { role: 'user', content: `Spoken description: "${transcript}"` },
      ],
    })

    const raw = response.choices[0]?.message?.content || ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ type: 'other', confidence: 'low' })
    const parsed = JSON.parse(match[0])
    const type = VALID_TYPES.includes(parsed.type) ? parsed.type : 'other'
    return NextResponse.json({ type, confidence: parsed.confidence || 'low' })
  } catch {
    return NextResponse.json({ type: 'other', confidence: 'low' })
  }
}
