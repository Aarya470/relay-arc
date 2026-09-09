import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createClient } from '@supabase/supabase-js'
import { rateLimit, clientKey, tooManyRequests } from '@/lib/rate-limit'
import { CHAT_MODEL, REASONING_TEXT } from '@/lib/model'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const limited = rateLimit(clientKey(req, 'checkin'), 20, 60000)
  if (!limited.ok) return tooManyRequests(limited)

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })
  try {
    // Auth check
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { messages, profile, mode } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages' }, { status: 400 })
    }

    if (mode === 'summary') {
      // Generate clinical summary from conversation
      const fullConvo = messages
        .map((m: any) => `${m.role === 'user' ? 'Patient' : 'AI'}: ${m.text}`)
        .join('\n')
      const completion = await groq.chat.completions.create({
        model: CHAT_MODEL,
      ...REASONING_TEXT,
        messages: [{
          role: 'user',
          content: `Extract clinical observations from this patient check-in for the care team. Write exactly 4-5 bullet points (one per line, no extra text). Each must start with a category label like "Feeling:", "Activity:", "Symptoms:", "Medications:", or "Concerns:". Be specific and factual.\n\nConversation:\n${fullConvo}
Never use em dashes or semicolons. Use short plain sentences.`
        }],
        temperature: 0.2
      })
      return NextResponse.json({ content: completion.choices[0].message.content?.trim() || '' })
    }

    // Regular chat mode
    const systemPrompt = `You are a warm, caring health companion for Relay Arc. Talk like a kind friend texting, not a doctor.
Patient conditions: ${profile?.diagnosis || 'Unknown'}. Meds: ${JSON.stringify(profile?.medications || [])}.
Rules:
- Simple everyday words only, no medical jargon
- Max 2 short sentences per message
- Warm and encouraging — like texting a caring friend
- Ask one simple question at a time
- If they mention chest pain, feeling faint, or trouble breathing say: "That sounds serious. Please tap the SOS button right now."
- After 4-5 exchanges, wrap up warmly and end with [CHECKIN_COMPLETE]`

    const completion = await groq.chat.completions.create({
      model: CHAT_MODEL,
      ...REASONING_TEXT,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m: any) => ({
          role: m.role === 'ai' ? 'assistant' : 'user' as any,
          content: m.text
        }))
      ],
      temperature: 0.7
    })

    const content = completion.choices[0].message.content || ''
    return NextResponse.json({ content })
  } catch (e) {
    console.error('Groq checkin error:', e)
    return NextResponse.json({ error: 'AI unavailable' }, { status: 503 })
  }
}
