'use client'
// Dashboard panel for autonomic conditions: heat warning, today's fluids and
// salt, the last stand test, and one tap to each autonomic tool.
import { useEffect, useState } from 'react'
import { loadLogs, loadProfile, today, type AutonomicProfile, type DayLog, type StandLog } from '@/lib/autonomic/store'

type Heat = { maxF: number; humidity: number; nowF: number } | null

export default function AutonomicToday() {
  const [prof, setProf] = useState<AutonomicProfile | null | undefined>(undefined)
  const [day, setDay] = useState<DayLog | null>(null)
  const [stand, setStand] = useState<StandLog | null>(null)
  const [heat, setHeat] = useState<Heat>(null)

  useEffect(() => {
    ;(async () => {
      const p = await loadProfile()
      setProf(p)
      const [d, s] = await Promise.all([loadLogs<DayLog>('day', 2), loadLogs<StandLog>('stand', 120)])
      setDay(d.find((r) => r.day === today())?.data || null)
      setStand(s[0]?.data || null)
      if (p?.heatAlerts && p.place) {
        try {
          const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.place.lat}&longitude=${p.place.lon}&current=apparent_temperature,relative_humidity_2m&daily=apparent_temperature_max&temperature_unit=fahrenheit&forecast_days=1&timezone=auto`)
          const j = await r.json()
          setHeat({ maxF: Math.round(j.daily.apparent_temperature_max[0]), humidity: Math.round(j.current.relative_humidity_2m), nowF: Math.round(j.current.apparent_temperature) })
        } catch {}
      }
    })()
  }, [])

  if (prof === undefined) return null
  if (!prof || !prof.diagnoses?.length)
    return (
      <a href="/autonomic/setup" className="glass au-cta">
        <span>
          <b>Set up for POTS or another autonomic condition</b>
          <i>Stand tests, a daily fluid and salt tracker, an episode coach and a doctor report</i>
        </span>
        <span aria-hidden>›</span>
      </a>
    )

  const hot = heat && (heat.maxF >= 86 || (heat.maxF >= 80 && heat.humidity >= 70))
  const ft = prof.targets?.fluidMl
  const st = prof.targets?.saltG
  const tools: [string, string, string][] = [
    ['/today', 'Today', day ? 'Logged' : 'Fluids, salt, symptoms'],
    ['/stand', 'Stand test', stand ? `Last rise +${stand.result.hrDelta} bpm` : '15 minutes'],
    ['/episode', 'I feel faint', 'Step by step help'],
    ['/report', 'Doctor report', 'Print or PDF'],
  ]
  return (
    <section aria-label="Autonomic" style={{ display: 'grid', gap: '10px' }}>
      {hot && (
        <div className="au-heat" role="status">
          <b>Hot day in {prof.place?.label}: feels like {heat!.maxF}°F</b>
          <span>Heat often makes symptoms worse. Keep up fluids, stay cool, and plan to sit or lie down.</span>
        </div>
      )}
      {(ft || st) && (
        <a href="/today" className="glass au-bars">
          {ft ? <span><b>Fluids</b><i style={{ ['--p' as string]: `${Math.min(100, ((day?.fluidMl || 0) / ft) * 100)}%` }} /><em>{((day?.fluidMl || 0) / 1000).toFixed(1)} of {(ft / 1000).toFixed(1)} L</em></span> : null}
          {st ? <span><b>Salt</b><i style={{ ['--p' as string]: `${Math.min(100, ((day?.saltG || 0) / st) * 100)}%` }} /><em>{day?.saltG || 0} of {st} g</em></span> : null}
        </a>
      )}
      <div className="au-tools">
        {tools.map(([h, t, s]) => (
          <a key={h} href={h} className="au-tool" data-urgent={h === '/episode'}>
            <b>{t}</b>
            <i>{s}</i>
          </a>
        ))}
      </div>
    </section>
  )
}
