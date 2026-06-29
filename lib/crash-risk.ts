import Groq from 'groq-sdk'

export type RiskLevel = 'low' | 'medium' | 'high'

export interface CrashRisk {
  level: RiskLevel
  reason: string   // 1 sentence, plain language
  advice: string   // 1 actionable sentence
}

export async function analyzeCrashRisk(checkins: { summary: string; created_at: string }[]): Promise<CrashRisk | null> {
  if (checkins.length < 3) return null
  const key = process.env.NEXT_PUBLIC_GROQ_API_KEY
  if (!key) return null

  const recent = checkins.slice(0, 7).map(c => ({
    date: new Date(c.created_at).toLocaleDateString(),
    summary: c.summary?.slice(0, 200) // truncate to save tokens
  }))

  try {
    const groq = new Groq({ apiKey: key, dangerouslyAllowBrowser: true })
    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: 'You analyze health check-in summaries for people with chronic conditions (POTS, ME/CFS, chronic illness). Identify if the trend over the last few days suggests an impending symptom flare or crash. Be conservative — only flag medium/high if there is a clear worsening trend. Respond ONLY with valid JSON, no other text: {"level":"low","reason":"...","advice":"..."} where level is "low", "medium", or "high".'
        },
        {
          role: 'user',
          content: `Recent check-ins (newest first):\n${JSON.stringify(recent, null, 2)}`
        }
      ],
      max_tokens: 200,
      temperature: 0.2,
    })

    const text = response.choices[0].message.content || ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return null
    const parsed = JSON.parse(match[0])
    if (!['low', 'medium', 'high'].includes(parsed.level)) return null
    return parsed as CrashRisk
  } catch {
    return null
  }
}
