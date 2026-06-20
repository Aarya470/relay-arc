import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createClient } from '@supabase/supabase-js'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    // Auth check — must be a care team member
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: member } = await supabase
      .from('care_team_members')
      .select('id')
      .eq('id', user.id)
      .single()
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { patient, checkins, emergencies, adherence } = await req.json()
    if (!patient) return NextResponse.json({ error: 'Missing patient' }, { status: 400 })

    const prompt = `You are a clinical AI. Analyze this cardiac patient and return JSON only.

Patient: ${patient.full_name}, ${patient.diagnosis}
Medications: ${JSON.stringify(patient.medications)}
Recent check-ins: ${(checkins || []).map((c: any) => c.summary).join(' | ') || 'None'}
Emergency events: ${(emergencies || []).length} total. Most recent: ${emergencies?.[0]?.emergency_type || 'none'} on ${emergencies?.[0] ? new Date(emergencies[0].created_at).toLocaleDateString() : 'N/A'}
Medication adherence: ${adherence !== null && adherence !== undefined ? `${adherence}% this week` : 'No data'}

Return JSON:
{
  "priority_score": number 1-10,
  "short_note": "one short sentence — what the care team needs to know right now",
  "status": "stable" | "monitor" | "urgent",
  "summary": "2-3 sentence clinical summary"
}

Score 8-10: active emergency, worsening symptoms, missed meds + bad check-ins
Score 5-7: some concerns, monitor closely
Score 1-4: stable, no major issues`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2
    })

    const text = completion.choices[0].message.content || '{}'
    const clean = text.replace(/```json|```/g, '').trim()

    let data: any
    try {
      data = JSON.parse(clean)
    } catch {
      return NextResponse.json({ error: 'Invalid AI response' }, { status: 502 })
    }

    if (
      typeof data.priority_score !== 'number' ||
      typeof data.short_note !== 'string' ||
      typeof data.summary !== 'string'
    ) {
      return NextResponse.json({ error: 'Unexpected response shape' }, { status: 502 })
    }

    return NextResponse.json({ summary: data })
  } catch (e) {
    console.error('Groq care-summary error:', e)
    return NextResponse.json({ error: 'AI unavailable' }, { status: 503 })
  }
}
