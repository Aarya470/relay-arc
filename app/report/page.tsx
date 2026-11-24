'use client'
// /report: a one page summary to bring to an appointment. Print or save as PDF.
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AppHeader } from '@/components/AppKit'
import BottomNav from '@/components/BottomNav'
import { loadLogs, loadProfile, SYMPTOMS, type AutonomicProfile, type DayLog, type EpisodeLog, type LogRow, type StandLog } from '@/lib/autonomic/store'

const fmt = (d: string) => new Date(d + (d.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

export default function Report() {
  const [days, setDays] = useState(30)
  const [prof, setProf] = useState<AutonomicProfile | null>(null)
  const [person, setPerson] = useState<{ full_name?: string; date_of_birth?: string; medications?: { name: string; dose?: string; frequency?: string }[] } | null>(null)
  const [stand, setStand] = useState<LogRow<StandLog>[]>([])
  const [daily, setDaily] = useState<LogRow<DayLog>[]>([])
  const [eps, setEps] = useState<LogRow<EpisodeLog>[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      const id = data.session?.user.id
      if (id) {
        const { data: p } = await supabase.from('profiles').select('full_name, date_of_birth, medications').eq('id', id).maybeSingle()
        setPerson(p as typeof person)
      }
      const [a, s, d, e] = await Promise.all([loadProfile(), loadLogs<StandLog>('stand', days), loadLogs<DayLog>('day', days), loadLogs<EpisodeLog>('episode', days)])
      setProf(a)
      setStand(s)
      setDaily(d)
      setEps(e)
      setReady(true)
    })()
  }, [days])

  const n = daily.length
  const avg = (f: (d: DayLog) => number) => (n ? daily.reduce((a, r) => a + f(r.data), 0) / n : 0)
  const fluid = avg((d) => d.fluidMl || 0)
  const salt = avg((d) => d.saltG || 0)
  const comp = n ? Math.round((daily.filter((r) => r.data.compression).length / n) * 100) : 0
  const trig: Record<string, number> = {}
  ;[...daily.flatMap((r) => r.data.triggers || []), ...eps.flatMap((r) => r.data.triggers || [])].forEach((t) => (trig[t] = (trig[t] || 0) + 1))
  const topTrig = Object.entries(trig).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const age = person?.date_of_birth ? Math.floor((Date.now() - new Date(person.date_of_birth).getTime()) / (365.25 * 864e5)) : null

  return (
    <div className="report" style={{ minHeight: '100dvh', maxWidth: '760px', margin: '0 auto', padding: '0 16px 112px' }}>
      <div className="no-print">
        <AppHeader title="Doctor report" sub="Bring this to your appointment. Print it or save it as a PDF." />
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {[14, 30, 90].map((d) => <button key={d} className="ak-chip" data-on={days === d} onClick={() => setDays(d)}>Last {d} days</button>)}
          <button className="ds-btn ds-btn-ink" style={{ marginLeft: 'auto', minHeight: '44px', padding: '0 18px', borderRadius: 10, border: 0, fontWeight: 800, cursor: 'pointer' }} onClick={() => window.print()}>Print or save PDF</button>
        </div>
      </div>

      <article className="paper">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', borderBottom: '2px solid #141413', paddingBottom: '12px' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0 }}>{person?.full_name || 'Autonomic summary'}</h1>
            <p style={{ fontSize: '14px' }}>{age !== null ? `${age} years · ` : ''}Last {days} days, to {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
          <img src="/logo-wordmark.png" alt="Relay Arc" style={{ height: '22px' }} />
        </header>
        {!ready ? <p style={{ padding: '20px 0' }}>Loading…</p> : (
          <>
            <section>
              <h2>Background</h2>
              <p><b>Diagnoses:</b> {prof?.diagnoses?.length ? prof.diagnoses.join(', ') : 'None entered'}{prof?.suspected ? ' (still being assessed)' : ''}</p>
              {prof?.baseline && <p><b>Usual numbers:</b> lying pulse {prof.baseline.lyingHr ?? '–'}, standing pulse {prof.baseline.standingHr ?? '–'}, blood pressure {prof.baseline.systolic ?? '–'}/{prof.baseline.diastolic ?? '–'}</p>}
              <p><b>Medicines:</b> {person?.medications?.length ? person.medications.map((m) => [m.name, m.dose, m.frequency].filter(Boolean).join(' ')).join('; ') : 'None listed'}</p>
              {prof?.targets && (prof.targets.fluidMl || prof.targets.saltG) ? <p><b>Targets set by doctor:</b> fluids {prof.targets.fluidMl ? `${prof.targets.fluidMl} ml` : '–'}, salt {prof.targets.saltG ? `${prof.targets.saltG} g` : '–'}</p> : null}
            </section>

            <section>
              <h2>Stand tests ({stand.length})</h2>
              {stand.length === 0 ? <p>None recorded in this period.</p> : (
                <table>
                  <thead><tr><th>Date</th><th>Lying</th><th>Standing (min: bpm)</th><th>Rise</th><th>BP lying → standing</th><th>Felt</th></tr></thead>
                  <tbody>{stand.map((r) => (
                    <tr key={r.id}>
                      <td>{fmt(r.created_at)}</td>
                      <td>{r.data.lyingHr}</td>
                      <td>{r.data.standing.map((s) => `${s.min}: ${s.hr}`).join(', ')}</td>
                      <td><b>+{r.data.result.hrDelta}</b>{r.data.result.meetsHr ? ` (≥${r.data.result.threshold})` : ''}</td>
                      <td>{r.data.lyingBp ? `${r.data.lyingBp.join('/')} → ${r.data.standingBp ? r.data.standingBp.join('/') : '–'}` : '–'}{r.data.result.oh ? ' OH' : ''}</td>
                      <td>{(r.data.feltDuring || []).join(', ') || '–'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
              <p className="small">Pulse from the phone camera or typed in by the patient. Thresholds: rise ≥30 bpm (≥40 ages 12 to 19) within 10 minutes; BP fall ≥20/10 within 3 minutes. Patient-measured, not a diagnostic test.</p>
            </section>

            <section>
              <h2>Daily tracking ({n} days logged)</h2>
              {n === 0 ? <p>No daily logs in this period.</p> : (
                <>
                  <p><b>Average fluids:</b> {(fluid / 1000).toFixed(1)} L/day{prof?.targets?.fluidMl ? ` (target ${(prof.targets.fluidMl / 1000).toFixed(1)} L)` : ''} · <b>Salt:</b> {salt.toFixed(1)} g/day{prof?.targets?.saltG ? ` (target ${prof.targets.saltG} g)` : ''} · <b>Compression:</b> {comp}% of days</p>
                  <table>
                    <thead><tr><th>Symptom</th><th>Days with any</th><th>Days moderate or severe</th><th>Average (0 to 3)</th></tr></thead>
                    <tbody>{SYMPTOMS.map((s) => {
                      const vals = daily.map((r) => r.data.symptoms?.[s.id] ?? 0)
                      return <tr key={s.id}><td>{s.label}</td><td>{vals.filter((v) => v > 0).length}</td><td>{vals.filter((v) => v >= 2).length}</td><td>{(vals.reduce((a, b) => a + b, 0) / n).toFixed(1)}</td></tr>
                    })}</tbody>
                  </table>
                  {topTrig.length > 0 && <p><b>Most common triggers:</b> {topTrig.map(([t, c]) => `${t} (${c})`).join(', ')}</p>}
                </>
              )}
            </section>

            <section>
              <h2>Episodes ({eps.length})</h2>
              {eps.length === 0 ? <p>None logged in this period.</p> : (
                <table>
                  <thead><tr><th>Date</th><th>Type</th><th>Triggers</th><th>What helped</th></tr></thead>
                  <tbody>{eps.map((r) => <tr key={r.id}><td>{fmt(r.created_at)}</td><td>{r.data.type}</td><td>{r.data.triggers.join(', ') || '–'}</td><td>{r.data.helped.join(', ') || '–'}</td></tr>)}</tbody>
                </table>
              )}
            </section>
            <p className="small" style={{ marginTop: '16px' }}>Generated by Relay Arc (relay-arc.org) from what the patient recorded. Not a diagnosis.</p>
          </>
        )}
      </article>
      <div className="no-print"><BottomNav /></div>
    </div>
  )
}
