'use client'
// /today: the daily autonomic tracker. Fluids and salt toward the targets the
// person's doctor gave them, compression, symptoms and triggers. Saves as you tap.
import { useEffect, useRef, useState } from 'react'
import { AppHeader, Hero } from '@/components/AppKit'
import Accordion from '@/components/Accordion'
import BottomNav from '@/components/BottomNav'
import { loadLogs, loadProfile, saveLog, SYMPTOMS, TRIGGERS, today, type AutonomicProfile, type DayLog, type LogRow } from '@/lib/autonomic/store'

const EMPTY: DayLog = { fluidMl: 0, saltG: 0, compression: false, symptoms: {}, triggers: [], note: '' }
const LEVELS = ['None', 'Mild', 'Moderate', 'Severe']

function Ring({ value, target, unit, label }: { value: number; target?: number; unit: string; label: string }) {
  const pct = target ? Math.min(1, value / target) : 0
  const r = 46
  const c = 2 * Math.PI * r
  return (
    <div style={{ display: 'grid', justifyItems: 'center', gap: '6px' }}>
      <svg width="120" height="120" viewBox="0 0 120 120" role="img" aria-label={`${label}: ${value} ${unit}${target ? ` of ${target}` : ''}`}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(20,20,19,0.1)" strokeWidth="12" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={pct >= 1 ? '#2F5233' : '#F07800'} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform="rotate(-90 60 60)" style={{ transition: 'stroke-dashoffset 400ms cubic-bezier(0.22,1,0.36,1)' }} />
        <text x="60" y="58" textAnchor="middle" fontSize="22" fontWeight="800" fill="#141413">{unit === 'ml' ? (value / 1000).toFixed(1) : value}</text>
        <text x="60" y="78" textAnchor="middle" fontSize="12" fill="#3F3D36">{unit === 'ml' ? 'litres' : 'g salt'}</text>
      </svg>
      <span style={{ fontSize: '13.5px', fontWeight: 700 }}>{target ? `of ${unit === 'ml' ? (target / 1000).toFixed(1) + ' L' : target + ' g'}` : 'No target set'}</span>
    </div>
  )
}

export default function Today() {
  const [log, setLog] = useState<DayLog>(EMPTY)
  const [prof, setProf] = useState<AutonomicProfile | null>(null)
  const [week, setWeek] = useState<LogRow<DayLog>[]>([])
  const [state, setState] = useState<'' | 'saving' | 'saved' | 'phone'>('')
  const loaded = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    ;(async () => {
      setProf(await loadProfile())
      const rows = await loadLogs<DayLog>('day', 14)
      setWeek(rows)
      const t = rows.find((r) => r.day === today())
      if (t) setLog({ ...EMPTY, ...t.data })
      loaded.current = true
    })()
  }, [])

  const update = (next: DayLog) => {
    setLog(next)
    if (!loaded.current) return
    setState('saving')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => setState(await saveLog('day', next)), 700)
  }

  const fluidT = prof?.targets?.fluidMl
  const saltT = prof?.targets?.saltG
  const symTotal = (d: DayLog) => Object.values(d.symptoms || {}).reduce((a, b) => a + b, 0)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 864e5)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const row = key === today() ? { data: log } : week.find((w) => w.day === key)
    return { key, label: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2), sym: row ? symTotal(row.data) : null, fluid: row ? row.data.fluidMl : null }
  })

  return (
    <div style={{ minHeight: '100dvh', maxWidth: '640px', margin: '0 auto', padding: '0 16px 112px' }}>
      <AppHeader title="Today" sub={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        right={<span className="ak-chip" aria-live="polite">{state === 'saving' ? 'Saving' : state === 'saved' ? 'Saved' : state === 'phone' ? 'On phone' : 'Auto saves'}</span>} />

      <Hero>
        <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '10px' }}>
          <Ring value={log.fluidMl} target={fluidT} unit="ml" label="Fluids" />
          <Ring value={log.saltG} target={saltT} unit="g" label="Salt" />
        </div>
        {!fluidT && !saltT && (
          <p style={{ fontSize: '14px', marginTop: '10px', textAlign: 'center' }}>
            Ask your doctor what fluid and salt targets are right for you, then add them in <a href="/autonomic/setup" style={{ color: '#141413', fontWeight: 800 }}>My autonomic setup</a>.
          </p>
        )}
      </Hero>

      <div className="glass" style={{ padding: '16px', marginBottom: '14px' }}>
        <p className="ak-panel-title" style={{ marginBottom: '10px' }}>Add fluids</p>
        <div className="med-chips" style={{ marginTop: 0 }}>
          {[250, 500, 750, 1000].map((ml) => (
            <button key={ml} className="ak-chip" style={{ height: '44px', padding: '0 16px', fontSize: '15px' }} onClick={() => update({ ...log, fluidMl: log.fluidMl + ml })}>+ {ml >= 1000 ? '1 L' : `${ml} ml`}</button>
          ))}
          {log.fluidMl > 0 && <button className="ak-chip" style={{ height: '44px' }} onClick={() => update({ ...log, fluidMl: Math.max(0, log.fluidMl - 250) })}>Undo 250</button>}
        </div>
        <p className="ak-panel-title" style={{ margin: '18px 0 10px' }}>Add salt</p>
        <div className="med-chips" style={{ marginTop: 0 }}>
          {[0.5, 1, 2].map((g) => (
            <button key={g} className="ak-chip" style={{ height: '44px', padding: '0 16px', fontSize: '15px' }} onClick={() => update({ ...log, saltG: Math.round((log.saltG + g) * 10) / 10 })}>+ {g} g</button>
          ))}
          {log.saltG > 0 && <button className="ak-chip" style={{ height: '44px' }} onClick={() => update({ ...log, saltG: Math.max(0, Math.round((log.saltG - 0.5) * 10) / 10) })}>Undo 0.5</button>}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '18px', fontWeight: 700, cursor: 'pointer' }}>
          <input type="checkbox" checked={log.compression} onChange={(e) => update({ ...log, compression: e.target.checked })} style={{ width: '24px', height: '24px', accentColor: '#2F5233' }} />
          Wearing compression today
        </label>
      </div>

      <div className="glass" style={{ padding: '16px', marginBottom: '14px' }}>
        <p className="ak-panel-title" style={{ marginBottom: '12px' }}>How are your symptoms?</p>
        <div style={{ display: 'grid', gap: '14px' }}>
          {SYMPTOMS.map((s) => {
            const v = log.symptoms[s.id] ?? 0
            return (
              <div key={s.id}>
                <p style={{ fontWeight: 750, fontSize: '15px', marginBottom: '6px' }}>{s.label}</p>
                <div className="sym-levels" role="radiogroup" aria-label={s.label}>
                  {LEVELS.map((l, i) => (
                    <button key={l} role="radio" aria-checked={v === i} data-on={v === i} data-tone={i === 0 ? 'good' : i === 1 ? 'good' : i === 2 ? 'mid' : 'bad'}
                      onClick={() => update({ ...log, symptoms: { ...log.symptoms, [s.id]: i } })}>{l}</button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="glass" style={{ padding: '4px', marginBottom: '14px' }}>
        <Accordion title="Triggers today" hint={log.triggers.length ? log.triggers.join(', ') : 'Tap any that happened'} defaultOpen={false}>
          <div className="med-chips" style={{ marginTop: 0, padding: '0 10px 8px' }}>
            {TRIGGERS.map((t) => (
              <button key={t} className="ak-chip" data-on={log.triggers.includes(t)} onClick={() => update({ ...log, triggers: log.triggers.includes(t) ? log.triggers.filter((x) => x !== t) : [...log.triggers, t] })}>{t}</button>
            ))}
          </div>
        </Accordion>
        <Accordion title="Note" hint="For you and your doctor">
          <div style={{ padding: '0 10px 8px' }}>
            <textarea aria-label="Note for today" value={log.note || ''} maxLength={300} rows={3} onChange={(e) => update({ ...log, note: e.target.value })}
              style={{ width: '100%', borderRadius: 10, border: '1.5px solid rgba(20,20,19,0.14)', padding: '10px 12px', font: 'inherit', fontSize: '16px', resize: 'none', background: 'rgba(255,255,255,0.75)' }} />
          </div>
        </Accordion>
        <Accordion title="This week" hint="Symptom load and fluids">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', padding: '0 10px 10px', alignItems: 'end' }}>
            {days.map((d) => (
              <div key={d.key} style={{ display: 'grid', gap: '4px', justifyItems: 'center' }}>
                <div style={{ height: '90px', width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                  <div title={`Symptoms ${d.sym ?? 'none logged'}`} style={{ width: '100%', borderRadius: 6, height: d.sym == null ? 4 : `${Math.max(6, Math.min(100, (d.sym / 24) * 100))}%`, background: d.sym == null ? 'rgba(20,20,19,0.12)' : '#F07800' }} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700 }}>{d.label}</span>
                <span style={{ fontSize: '11.5px', color: '#3F3D36' }}>{d.fluid == null ? '–' : `${(d.fluid / 1000).toFixed(1)}L`}</span>
              </div>
            ))}
          </div>
        </Accordion>
      </div>
      <BottomNav />
    </div>
  )
}
