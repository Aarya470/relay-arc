import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createClient } from '@supabase/supabase-js'
import { rateLimit, clientKey, tooManyRequests } from '@/lib/rate-limit'
import { CHAT_MODEL, REASONING_TEXT, createChat } from '@/lib/model'

export const dynamic = 'force-dynamic'

// Scripted check-in used only when no language model is reachable.
const SCRIPT = [
  'Thanks for telling me. How did you sleep last night?',
  'Got it. Any dizziness, chest discomfort, or shortness of breath today?',
  'Okay. Have you taken your medications as planned today?',
  'Thanks. Did you check your temperature, oxygen or heart rate today? If so, what were the numbers?',
  'Thank you for checking in today. Take it easy. [CHECKIN_COMPLETE]',
]
const SCRIPT_LABELS = ['Feeling', 'Sleep', 'Symptoms', 'Medications', 'Vitals']

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const limited = rateLimit(clientKey(req, 'checkin'), 20, 60000)
  if (!limited.ok) return tooManyRequests(limited)

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })
  let parsed: any = null
  try {
    // Auth check
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    parsed = body
    const { messages, profile, mode } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages' }, { status: 400 })
    }

    if (mode === 'summary') {
      // Generate clinical summary from conversation
      const fullConvo = messages
        .map((m: any) => `${m.role === 'user' ? 'Patient' : 'AI'}: ${m.text}`)
        .join('\n')
      const completion = await createChat(groq, {
        model: CHAT_MODEL,
      ...REASONING_TEXT,
        messages: [{
          role: 'user',
          content: `Extract clinical observations from this patient check-in for the care team. Write exactly 4-5 bullet points (one per line, no extra text). Each must start with a category label like "Feeling:", "Activity:", "Symptoms:", "Medications:", or "Concerns:". Be specific and factual. If the patient stated any measurement (heart rate, temperature, oxygen level, blood pressure, breathing rate), add a line starting "Vitals:" with the exact numbers and units they gave, for example "Vitals: temperature 100.4 F, oxygen 95%". If they said they feel confused, or that they use oxygen, say that plainly in that line. Never invent or estimate a number they did not say.\n\nConversation:\n${fullConvo}
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
- Warm and encouraging, like texting a caring friend
- Ask one simple question at a time
- Once, near the end, ask if they took their temperature, oxygen or heart rate today and what the numbers were (fine if they didn't)
- If they mention chest pain, feeling faint, or trouble breathing say: "That sounds serious. Please tap the SOS button right now."
- After 4-5 exchanges, wrap up warmly and end with [CHECKIN_COMPLETE]`

    const completion = await createChat(groq, {
      model: CHAT_MODEL,
      ...REASONING_TEXT,
      // Instructions go in a leading user turn, not a system message: Groq's
      // guidance for gpt-oss, and in testing it stopped the stray tool-call
      // replies that were failing roughly one turn in eight.
      messages: [
        { role: 'user', content: systemPrompt + '\n\nStart the check-in.' },
        ...messages.map((m: any) => ({
          role: m.role === 'ai' ? 'assistant' : 'user' as any,
          content: m.text
        }))
      ],
      temperature: 0.7
    })

    const content = completion.choices[0].message.content || ''
    return NextResponse.json({ content })
  } catch (e: any) {
    console.error('Groq checkin error:', e)
    // Every language model unavailable (e.g. all daily token allowances used).
    // The check-in still has to work: fall back to a short scripted
    // conversation so the person can finish and the answers are still saved.
    try {
      const body = parsed
      const msgs: any[] = body?.messages || []
      if (body?.mode === 'summary') {
        const said = msgs.filter(m => m.role === 'user').map(m => String(m.text).slice(0, 200))
        return NextResponse.json({ content: said.map((t, i) => `${SCRIPT_LABELS[i] || 'Note'}: ${t}`).join('\n'), fallback: true })
      }
      const answered = msgs.filter(m => m.role === 'user').length
      const last = String(msgs[msgs.length - 1]?.text || '').toLowerCase()
      if (/chest|faint|pass(ed)? out|can.?t breathe|breath/.test(last)) {
        return NextResponse.json({ content: 'That sounds serious. Please tap the SOS button right now.', fallback: true })
      }
      const next = SCRIPT[Math.min(answered, SCRIPT.length - 1)]
      return NextResponse.json({ content: next, fallback: true })
    } catch { /* fall through */ }
    // A provider status code (never a message or a key) so the failure can be
    // diagnosed from the browser instead of only from server logs.
    return NextResponse.json({ error: 'AI unavailable', provider: e?.status ?? null }, { status: 503 })
  }
}
