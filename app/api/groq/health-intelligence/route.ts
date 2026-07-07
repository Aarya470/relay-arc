import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface HealthIntelligence {
  score: number                                    // 0–100
  trajectory: 'improving' | 'stable' | 'declining' | 'critical'
  headline: string                                 // one-sentence summary
  patterns: string[]                               // cross-data patterns detected
  prediction: string                               // what might happen in next 48h
  recommendation: string                           // one specific actionable thing
  alertCareTeam: boolean
  alertReason: string | null
  dataQuality: 'rich' | 'partial' | 'sparse'      // how much data was available
}

// ─── helpers ────────────────────────────────────────────────────────────────

function parseTS(ts: string) {
  return new Date(/[Z+]/.test(ts) ? ts : ts + 'Z')
}

function daysSince(ts: string): number {
  return (Date.now() - parseTS(ts).getTime()) / 86_400_000
}

function avg(arr: number[]): number {
  if (!arr.length) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

// Compute a linear trend: positive = rising, negative = falling
function trend(arr: number[]): number {
  if (arr.length < 2) return 0
  const n = arr.length
  const xMean = (n - 1) / 2
  const yMean = avg(arr)
  let num = 0, den = 0
  arr.forEach((y, x) => { num += (x - xMean) * (y - yMean); den += (x - xMean) ** 2 })
  return den === 0 ? 0 : num / den
}

// ─── route ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 503 })
    }
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    // Auth
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const since30d = new Date(Date.now() - 30 * 86_400_000).toISOString()

    // Fetch all data types in parallel
    const [
      { data: checkins },
      { data: vitals },
      { data: symptoms },
      { data: medLogs },
      { data: profile },
      { data: emergencies },
    ] = await Promise.all([
      supabase.from('checkins').select('summary, mood, created_at').eq('user_id', user.id)
        .gte('created_at', since30d).order('created_at', { ascending: false }).limit(30),
      supabase.from('vitals_logs').select('*').eq('user_id', user.id)
        .gte('logged_at', since30d).order('logged_at', { ascending: false }).limit(60),
      supabase.from('symptom_logs').select('*').eq('user_id', user.id)
        .gte('created_at', since30d).order('created_at', { ascending: false }).limit(30),
      supabase.from('medication_logs').select('taken, created_at').eq('user_id', user.id)
        .gte('taken_at', since30d).limit(100),
      supabase.from('profiles').select('diagnosis, medications, surgery_date').eq('id', user.id).single(),
      supabase.from('emergencies').select('emergency_type, created_at').eq('user_id', user.id)
        .gte('created_at', since30d).order('created_at', { ascending: false }).limit(5),
    ])

    // ── Pre-compute quantitative signals ─────────────────────────────────────

    // Heart rate trend
    const hrValues = (vitals || []).filter(v => v.heart_rate).map(v => v.heart_rate as number).reverse()
    const hrTrend = trend(hrValues)   // bpm/reading — positive = rising
    const hrAvg = avg(hrValues)
    const hrLast = hrValues[hrValues.length - 1] ?? null

    // BP trend
    const sysValues = (vitals || []).filter(v => v.systolic).map(v => v.systolic as number).reverse()
    const sysTrend = trend(sysValues)
    const sysAvg = avg(sysValues)

    // Symptom trends (last 7 readings, 0–10 scale, lower = better for symptoms)
    const recentSymptoms = (symptoms || []).slice(0, 7)
    const chestPainAvg = avg(recentSymptoms.map(s => s.chest_pain ?? 0))
    const fatigueAvg   = avg(recentSymptoms.map(s => s.fatigue ?? 0))
    const dizAvg       = avg(recentSymptoms.map(s => s.dizziness ?? 0))
    const sobAvg       = avg(recentSymptoms.map(s => s.shortness_of_breath ?? 0))
    const energyAvg    = avg(recentSymptoms.map(s => s.energy ?? 5))

    // Medication adherence
    const totalMedLogs = (medLogs || []).length
    const takenLogs    = (medLogs || []).filter(m => m.taken).length
    const adherence    = totalMedLogs > 0 ? Math.round((takenLogs / totalMedLogs) * 100) : null

    // Check-in frequency
    const checkinCount = (checkins || []).length
    const daysSinceLastCheckin = checkins?.[0] ? daysSince(checkins[0].created_at) : 99

    // Recent emergencies
    const recentEmergencies = (emergencies || []).filter(e => daysSince(e.created_at) <= 14)

    // Data quality
    const dataPoints = [hrValues.length > 0, recentSymptoms.length > 0, checkinCount > 0].filter(Boolean).length
    const dataQuality: HealthIntelligence['dataQuality'] = dataPoints >= 3 ? 'rich' : dataPoints >= 1 ? 'partial' : 'sparse'

    // ── Build context for AI ─────────────────────────────────────────────────

    const diagnosisStr = profile?.diagnosis || 'cardiac condition'
    const surgeryStr   = profile?.surgery_date
      ? `Surgery was ${Math.round(daysSince(profile.surgery_date))} days ago.`
      : ''

    const vitalsContext = hrValues.length > 0
      ? `Heart rate: recent avg ${hrAvg.toFixed(0)} bpm, trend ${hrTrend > 0.5 ? 'RISING' : hrTrend < -0.5 ? 'FALLING' : 'STABLE'} (${hrTrend > 0 ? '+' : ''}${hrTrend.toFixed(1)} bpm/reading). Latest: ${hrLast} bpm.${sysValues.length > 0 ? ` BP systolic avg ${sysAvg.toFixed(0)} mmHg, trend ${sysTrend > 0 ? 'RISING' : 'STABLE'}.` : ''}`
      : 'No vitals logged in 30 days.'

    const symptomsContext = recentSymptoms.length > 0
      ? `Symptom scores (0–10, lower=better): chest pain avg ${chestPainAvg.toFixed(1)}, fatigue avg ${fatigueAvg.toFixed(1)}, dizziness avg ${dizAvg.toFixed(1)}, shortness of breath avg ${sobAvg.toFixed(1)}, energy avg ${energyAvg.toFixed(1)}/10.`
      : 'No symptom logs in 30 days.'

    const checkinContext = checkinCount > 0
      ? `${checkinCount} check-ins in last 30 days. Last check-in ${daysSinceLastCheckin < 1 ? 'today' : `${Math.round(daysSinceLastCheckin)} days ago`}. Recent summaries: ${(checkins || []).slice(0, 5).map(c => c.summary || c.mood || '—').join(' | ')}`
      : 'No check-ins in 30 days.'

    const medsContext = adherence !== null
      ? `Medication adherence: ${adherence}% over 30 days.`
      : 'No medication data.'

    const emergencyContext = recentEmergencies.length > 0
      ? `${recentEmergencies.length} SOS event(s) in last 14 days: ${recentEmergencies.map(e => e.emergency_type).join(', ')}.`
      : 'No SOS events in last 14 days.'

    const prompt = `You are a cardiac health intelligence AI analyzing patient data to predict health trajectory and prevent emergencies.

PATIENT CONTEXT:
- Diagnosis: ${diagnosisStr}
- ${surgeryStr}

DATA SYNTHESIS (last 30 days):
- ${vitalsContext}
- ${symptomsContext}
- ${checkinContext}
- ${medsContext}
- ${emergencyContext}

CRITICAL ALERT THRESHOLDS (alert care team if ANY of these apply):
- Heart rate consistently above 110 bpm or below 45 bpm
- HR trend rising >2 bpm/reading over 5+ readings
- Chest pain or shortness of breath averaging >6/10
- BP systolic consistently >160 or rising rapidly
- Medication adherence <50% for 7+ days
- SOS event in last 72 hours
- Combination of: rising HR + rising symptoms + low energy

Analyze ALL data types together to find cross-signal patterns that a single data type would miss. For example: HR rising while energy dropping while check-ins mention fatigue = pre-crash pattern.

Return ONLY valid JSON:
{
  "score": <integer 0-100, where 100=excellent health, 0=critical>,
  "trajectory": <"improving"|"stable"|"declining"|"critical">,
  "headline": <one sentence summary of overall health status, max 80 chars>,
  "patterns": [<2-3 specific cross-signal patterns you detected, each max 70 chars>],
  "prediction": <what is likely to happen in next 24-48 hours based on current trajectory, max 100 chars>,
  "recommendation": <one specific, actionable thing the patient should do TODAY, max 90 chars>,
  "alertCareTeam": <true|false>,
  "alertReason": <specific reason if alerting care team, null if not alerting, max 80 chars>
}`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 600,
    })

    const text = completion.choices[0].message.content || ''

    // Parse JSON
    let parsed: any
    try {
      const stripped = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(stripped)
    } catch {
      const start = text.indexOf('{')
      const end   = text.lastIndexOf('}')
      if (start === -1 || end < start) {
        return NextResponse.json({ error: 'AI returned no JSON', raw: text.slice(0, 200) }, { status: 502 })
      }
      try { parsed = JSON.parse(text.slice(start, end + 1)) }
      catch { return NextResponse.json({ error: 'AI JSON parse failed', raw: text.slice(0, 200) }, { status: 502 }) }
    }

    // Validate & clamp
    const validTrajectories = new Set(['improving', 'stable', 'declining', 'critical'])
    const intelligence: HealthIntelligence = {
      score:          Math.max(0, Math.min(100, Math.round(parsed.score ?? 50))),
      trajectory:     validTrajectories.has(parsed.trajectory) ? parsed.trajectory : 'stable',
      headline:       String(parsed.headline ?? '').slice(0, 100),
      patterns:       Array.isArray(parsed.patterns) ? parsed.patterns.slice(0, 3).map((p: any) => String(p).slice(0, 80)) : [],
      prediction:     String(parsed.prediction ?? '').slice(0, 120),
      recommendation: String(parsed.recommendation ?? '').slice(0, 100),
      alertCareTeam:  Boolean(parsed.alertCareTeam),
      alertReason:    parsed.alertReason ? String(parsed.alertReason).slice(0, 100) : null,
      dataQuality,
    }

    // Auto-alert care team if AI says to
    if (intelligence.alertCareTeam && intelligence.alertReason) {
      try {
        const { data: careTeam } = await supabase
          .from('care_team_members')
          .select('id, push_token')
          .eq('patient_id', user.id)
          .not('push_token', 'is', null)

        if (careTeam && careTeam.length > 0) {
          // Insert alert record
          await supabase.from('care_team_alerts').insert({
            patient_id: user.id,
            type: 'health_intelligence',
            severity: intelligence.trajectory === 'critical' ? 'high' : 'medium',
            message: intelligence.alertReason,
            data: { score: intelligence.score, trajectory: intelligence.trajectory },
          })
        }
      } catch {
        // Don't fail the response if alert insert fails
      }
    }

    return NextResponse.json({ intelligence })

  } catch (e: any) {
    console.error('Health intelligence error:', e)
    return NextResponse.json({ error: e?.message || 'Intelligence unavailable' }, { status: 503 })
  }
}
