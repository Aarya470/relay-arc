// Server-side text generation. Replaces three client-side Groq calls that
// shipped the API key to the browser.
//
// THE BUG THIS FIXES
// app/appointment/page.tsx, app/care-team/patient/[id]/page.tsx and
// app/emergency/brief/page.tsx each did:
//
//     const groq = new Groq({
//       apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY,
//       dangerouslyAllowBrowser: true,
//     })
//
// NEXT_PUBLIC_* is inlined into the client bundle at build time, so the key was
// readable by anyone who opened devtools on the deployed site. Confirmed present
// in production JS before this change.
//
// TWO DESIGN RULES HERE
//  1. The client never sends a prompt. It names a task. The prompts live on the
//     server, so an attacker with a session cannot turn this into a free
//     general-purpose LLM endpoint on our account.
//  2. The client never sends patient data either. We refetch it server-side
//     using the CALLER'S OWN JWT, so Supabase RLS grants exactly the access the
//     page already had — this adds no read surface, and a caller cannot ask for
//     a summary of someone else's chart.
import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createClient } from '@supabase/supabase-js'
import { rateLimit, clientKey, tooManyRequests } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

type Task = 'appointment_summary' | 'care_team_summary' | 'clinical_handoff'
const TASKS: Task[] = ['appointment_summary', 'care_team_summary', 'clinical_handoff']

interface Med { name?: string; dose?: string; frequency?: string }
const medList = (meds: Med[] | null | undefined) =>
  (meds || []).map(m => [m.name, m.dose].filter(Boolean).join(' ')).filter(Boolean).join(', ') || 'none'

export async function POST(req: NextRequest) {
  const limited = rateLimit(clientKey(req, 'ai-generate'), 20, 60000)
  if (!limited.ok) return tooManyRequests(limited)

  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'Generation is not configured' }, { status: 503 })
    }

    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Scoped to the caller's JWT: every read below is subject to the same RLS
    // policies that applied when this ran in the browser.
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const task: Task = body?.task
    if (!TASKS.includes(task)) {
      return NextResponse.json({ error: 'Unknown task' }, { status: 400 })
    }

    const PROFILE_COLS =
      'full_name, blood_type, allergies, medications, diagnosis, surgery_date, date_of_birth'

    let system = ''
    let prompt = ''
    let maxTokens = 400

    if (task === 'clinical_handoff') {
      // Emergency label is a bounded enum, never free text from the client.
      const LABELS: Record<string, string> = {
        chest_pain: 'chest pain', unconscious: 'unconscious / unresponsive',
        breathing: 'severe breathing difficulty', pots: 'POTS episode',
        stroke: 'stroke signs', mecfs: 'ME/CFS crash', other: 'other urgent',
      }
      const label = LABELS[String(body?.emergencyType)] || 'unspecified urgent'
      const { data: p } = await supabase.from('profiles').select(PROFILE_COLS).eq('id', user.id).single()
      if (!p) return NextResponse.json({ text: '' })
      system = 'You are an emergency medicine assistant. Write a 2-3 sentence clinical handoff note for ER staff. Be specific, clinical, and actionable. Focus on the condition and emergency type.'
      prompt = `Patient has ${p.diagnosis || 'no known diagnosis on file'}. Current emergency: ${label}. Allergies: ${p.allergies || 'none known'}. Current medications: ${medList(p.medications)}.`
      maxTokens = 180
    }

    else if (task === 'appointment_summary') {
      const [{ data: p }, { data: c }, { data: e }] = await Promise.all([
        supabase.from('profiles').select(PROFILE_COLS).eq('id', user.id).single(),
        supabase.from('checkins').select('summary, created_at').eq('user_id', user.id)
          .order('created_at', { ascending: false }).limit(14),
        supabase.from('emergencies').select('emergency_type').eq('user_id', user.id).limit(20),
      ])
      if (!p) return NextResponse.json({ text: '' })
      system = 'You write clear, professional medical appointment summaries for a patient to bring to their doctor.'
      prompt = `Generate a concise medical appointment summary.
Patient: ${p.full_name}, Conditions: ${p.diagnosis}, Meds: ${medList(p.medications)}, Allergies: ${p.allergies}
Recent check-ins: ${(c || []).map(x => `${new Date(x.created_at).toLocaleDateString()}: ${x.summary}`).join(' | ') || 'none'}
Emergencies: ${(e || []).length > 0 ? (e || []).map(x => x.emergency_type).join(', ') : 'None'}
Write a structured summary with: patient overview, symptom patterns, medication notes, suggested questions for doctor. Professional and concise.`
    }

    else {
      // care_team_summary — the patient id comes from the client, but every read
      // runs under the caller's JWT, so RLS decides whether they may see it. If
      // they may not, the selects come back empty and we return nothing.
      const patientId = String(body?.patientId || '')
      if (!/^[0-9a-f-]{36}$/i.test(patientId)) {
        return NextResponse.json({ error: 'Invalid patient id' }, { status: 400 })
      }
      const [{ data: p }, { data: c }, { data: e }] = await Promise.all([
        supabase.from('profiles').select(PROFILE_COLS).eq('id', patientId).single(),
        supabase.from('checkins').select('summary').eq('user_id', patientId)
          .order('created_at', { ascending: false }).limit(5),
        supabase.from('emergencies').select('emergency_type').eq('user_id', patientId)
          .order('created_at', { ascending: false }).limit(20),
      ])
      if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      system = 'You brief a care team in plain English. No medical jargon.'
      prompt = `Patient: ${p.full_name}, ${p.diagnosis}
Medications: ${medList(p.medications)}
Allergies: ${p.allergies || 'None'}
Surgery date: ${p.surgery_date || 'N/A'}
Recent check-ins: ${(c || []).map(x => x.summary).join(' | ') || 'None'}
Emergencies: ${(e || []).length} total. Latest: ${(e || [])[0]?.emergency_type?.replace('_', ' ') || 'none'}

Write:
1. One sentence status overview
2. 3-5 bullet points of key things the care team needs to know
3. One bullet point of recommended action

Keep everything simple and plain English. No medical jargon.`
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.3,
    })

    return NextResponse.json({ text: completion.choices[0]?.message?.content?.trim() || '' })
  } catch (e) {
    console.error('AI generate error:', e)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
