'use client'
// Autonomic profile and logs. Saved to Supabase (row level security keeps them
// private). If the database is unreachable or the table is not there yet, entries
// are kept on the phone and sent the next time saving works, so nothing typed in
// the middle of a bad day is lost.
import { supabase } from '@/lib/supabase'

export const DIAGNOSES = [
  { id: 'POTS', label: 'POTS', hint: 'Postural orthostatic tachycardia' },
  { id: 'OH', label: 'Orthostatic hypotension', hint: 'Blood pressure drops on standing' },
  { id: 'nOH', label: 'Neurogenic OH', hint: 'From autonomic nerve damage' },
  { id: 'Reflex syncope', label: 'Reflex syncope', hint: 'Vasovagal or neurocardiogenic fainting' },
  { id: 'IST', label: 'Inappropriate sinus tachycardia', hint: 'Fast resting heart rate' },
  { id: 'PAF', label: 'Pure autonomic failure', hint: '' },
  { id: 'MSA', label: 'Multiple system atrophy', hint: '' },
  { id: 'AAG', label: 'Autoimmune autonomic ganglionopathy', hint: '' },
  { id: 'hEDS', label: 'hEDS or hypermobility', hint: 'Often overlaps with POTS' },
  { id: 'MCAS', label: 'Mast cell activation', hint: 'Often overlaps with POTS' },
  { id: 'ME/CFS', label: 'ME/CFS', hint: 'Post exertional malaise' },
  { id: 'Long COVID', label: 'Long COVID dysautonomia', hint: '' },
  { id: 'Diabetic', label: 'Diabetic autonomic neuropathy', hint: '' },
  { id: 'Other', label: 'Other dysautonomia', hint: '' },
] as const

export const TRIGGERS = ['Heat', 'Standing still', 'Big meals', 'Hot shower', 'Dehydration', 'Poor sleep', 'Exercise', 'Period', 'Illness', 'Stress', 'Alcohol', 'Morning'] as const
export const SYMPTOMS = [
  { id: 'lightheaded', label: 'Lightheaded' },
  { id: 'palpitations', label: 'Racing heart' },
  { id: 'fog', label: 'Brain fog' },
  { id: 'fatigue', label: 'Fatigue' },
  { id: 'headache', label: 'Headache' },
  { id: 'nausea', label: 'Nausea or GI' },
  { id: 'heat', label: 'Heat intolerance' },
  { id: 'breath', label: 'Short of breath' },
] as const

export type AutonomicProfile = {
  diagnoses: string[]
  suspected?: boolean
  baseline?: { lyingHr?: number; standingHr?: number; systolic?: number; diastolic?: number }
  /** From the person's own doctor. The app never sets these. */
  targets?: { fluidMl?: number; saltG?: number }
  triggers?: string[]
  helps?: string
  avoid?: string
  doctor?: { name?: string; phone?: string }
  heatAlerts?: boolean
  place?: { lat: number; lon: number; label: string }
}

export type DayLog = {
  fluidMl: number
  saltG: number
  compression: boolean
  symptoms: Record<string, number>
  triggers: string[]
  note?: string
}
export type StandLog = {
  lyingHr: number
  standing: { min: number; hr: number }[]
  lyingBp?: [number, number] | null
  standingBp?: [number, number] | null
  ageYears?: number | null
  result: { hrDelta: number; threshold: number; meetsHr: boolean; over120: boolean; oh: boolean | null }
  feltDuring?: string[]
}
export type EpisodeLog = {
  type: 'nearly fainted' | 'fainted' | 'flare'
  minutes?: number
  triggers: string[]
  helped: string[]
  injured?: boolean
  note?: string
}
export type LogRow<T> = { id: string; kind: 'stand' | 'day' | 'episode'; day: string; data: T; created_at: string; local?: boolean }

const PENDING = 'relay-autonomic-pending'
export const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function pending(): LogRow<unknown>[] {
  try {
    return JSON.parse(localStorage.getItem(PENDING) || '[]')
  } catch {
    return []
  }
}
function setPending(rows: LogRow<unknown>[]) {
  try {
    localStorage.setItem(PENDING, JSON.stringify(rows.slice(-200)))
  } catch {}
}

async function uid() {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id || null
}

export async function loadProfile(): Promise<AutonomicProfile | null> {
  const id = await uid()
  if (!id) return null
  const { data, error } = await supabase.from('profiles').select('autonomic').eq('id', id).maybeSingle()
  if (error) {
    try {
      return JSON.parse(localStorage.getItem('relay-autonomic-profile') || 'null')
    } catch {
      return null
    }
  }
  return (data?.autonomic as AutonomicProfile) || null
}

export async function saveProfile(p: AutonomicProfile): Promise<boolean> {
  try {
    localStorage.setItem('relay-autonomic-profile', JSON.stringify(p))
  } catch {}
  const id = await uid()
  if (!id) return false
  const { error } = await supabase.from('profiles').update({ autonomic: p }).eq('id', id)
  return !error
}

/** Send anything saved on the phone while offline. */
export async function flushPending() {
  const rows = pending()
  if (!rows.length) return
  const id = await uid()
  if (!id) return
  const left: LogRow<unknown>[] = []
  for (const r of rows) {
    const res =
      r.kind === 'day'
        ? await supabase.from('autonomic_logs').upsert({ user_id: id, kind: 'day', day: r.day, data: r.data }, { onConflict: 'user_id,day', ignoreDuplicates: false })
        : await supabase.from('autonomic_logs').insert({ user_id: id, kind: r.kind, day: r.day, data: r.data })
    if (res.error) left.push(r)
  }
  setPending(left)
}

/** Save a log. Returns 'saved' or 'phone' (kept on the phone for now). */
export async function saveLog(kind: 'stand' | 'day' | 'episode', data: unknown, day = today()): Promise<'saved' | 'phone'> {
  const id = await uid()
  const local = () => {
    const rows = pending().filter((r) => !(kind === 'day' && r.kind === 'day' && r.day === day))
    rows.push({ id: `local-${Date.now()}`, kind, day, data, created_at: new Date().toISOString(), local: true })
    setPending(rows)
    return 'phone' as const
  }
  if (!id) return local()
  try {
    if (kind === 'day') {
      const { data: existing } = await supabase.from('autonomic_logs').select('id').eq('user_id', id).eq('kind', 'day').eq('day', day).maybeSingle()
      const res = existing
        ? await supabase.from('autonomic_logs').update({ data }).eq('id', existing.id)
        : await supabase.from('autonomic_logs').insert({ user_id: id, kind, day, data })
      if (res.error) return local()
    } else {
      const res = await supabase.from('autonomic_logs').insert({ user_id: id, kind, day, data })
      if (res.error) return local()
    }
    flushPending().catch(() => {})
    return 'saved'
  } catch {
    return local()
  }
}

/** Logs from the last N days, newest first, including any still on the phone. */
export async function loadLogs<T = unknown>(kind: 'stand' | 'day' | 'episode', days = 60): Promise<LogRow<T>[]> {
  const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10)
  const mine = pending().filter((r) => r.kind === kind && r.day >= since) as LogRow<T>[]
  const id = await uid()
  if (!id) return mine
  const { data, error } = await supabase
    .from('autonomic_logs')
    .select('id, kind, day, data, created_at')
    .eq('user_id', id)
    .eq('kind', kind)
    .gte('day', since)
    .order('created_at', { ascending: false })
    .limit(400)
  const remote = error ? [] : ((data || []) as LogRow<T>[])
  const merged = [...mine, ...remote]
  if (kind === 'day') {
    const seen = new Set<string>()
    return merged.filter((r) => (seen.has(r.day) ? false : (seen.add(r.day), true)))
  }
  return merged.sort((a, b) => b.created_at.localeCompare(a.created_at))
}
