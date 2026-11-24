'use client'
// /autonomic/setup: diagnoses, the person's own normal numbers, their doctor's
// fluid and salt targets, triggers, what helps, and heat alerts.
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppHeader } from '@/components/AppKit'
import Accordion from '@/components/Accordion'
import BottomNav from '@/components/BottomNav'
import { DIAGNOSES, TRIGGERS, loadProfile, saveProfile, type AutonomicProfile } from '@/lib/autonomic/store'

const num = (s: string, max: number) => {
  const n = Number(s.replace(/[^\d.]/g, ''))
  return n > 0 && n <= max ? n : undefined
}

function Field({ label, value, onChange, suffix, help }: { label: string; value?: number; onChange: (v?: number) => void; suffix: string; help?: string }) {
  return (
    <label style={{ display: 'grid', gap: '6px' }}>
      <span style={{ fontWeight: 750, fontSize: '15px' }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input inputMode="decimal" defaultValue={value ?? ''} onChange={(e) => onChange(num(e.target.value, 20000))}
          style={{ width: '130px', height: '50px', borderRadius: 10, border: '1.5px solid rgba(20,20,19,0.16)', padding: '0 14px', font: 'inherit', fontSize: '17px', background: 'rgba(255,255,255,0.8)' }} />
        <span style={{ fontWeight: 600, color: '#3F3D36' }}>{suffix}</span>
      </span>
      {help && <span style={{ fontSize: '13px', color: '#3F3D36' }}>{help}</span>}
    </label>
  )
}

export default function Setup() {
  const router = useRouter()
  const [p, setP] = useState<AutonomicProfile>({ diagnoses: [] })
  const [ready, setReady] = useState(false)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    loadProfile().then((x) => {
      if (x) setP({ ...x, diagnoses: x.diagnoses || [] })
      setReady(true)
    })
  }, [])

  const tog = (k: 'diagnoses' | 'triggers', v: string) =>
    setP((x) => {
      const list = x[k] || []
      return { ...x, [k]: list.includes(v) ? list.filter((y) => y !== v) : [...list, v] }
    })

  const locate = () => {
    if (!navigator.geolocation) return setMsg('Location is not available on this device')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Math.round(pos.coords.latitude * 100) / 100
        const lon = Math.round(pos.coords.longitude * 100) / 100
        let label = 'Your area'
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=10&lat=${lat}&lon=${lon}`)
          const j = await r.json()
          label = j.address?.city || j.address?.town || j.address?.county || label
        } catch {}
        setP((x) => ({ ...x, heatAlerts: true, place: { lat, lon, label } }))
      },
      () => setMsg('Location was not allowed. Heat alerts need a rough location.'),
      { maximumAge: 3600000, timeout: 10000 },
    )
  }

  const save = async () => {
    setBusy(true)
    const ok = await saveProfile(p)
    setBusy(false)
    if (ok) router.push('/dashboard')
    else setMsg('Saved on this phone. It will save to your account when you are signed in and online.')
  }

  if (!ready) return <div style={{ minHeight: '100dvh' }} />

  return (
    <div style={{ minHeight: '100dvh', maxWidth: '640px', margin: '0 auto', padding: '0 16px 112px' }}>
      <AppHeader title="My autonomic setup" back="/settings" backLabel="Settings" sub="Tailors your stand tests, daily tracker, emergency card and doctor report." />

      <div className="glass" style={{ padding: '16px', marginBottom: '14px' }}>
        <p className="ak-panel-title">What have you been diagnosed with?</p>
        <p style={{ fontSize: '14px', color: '#3F3D36', margin: '4px 0 10px' }}>Pick all that apply.</p>
        <div className="med-chips" style={{ marginTop: 0 }}>
          {DIAGNOSES.map((d) => (
            <button key={d.id} className="ak-chip" data-on={p.diagnoses.includes(d.id)} onClick={() => tog('diagnoses', d.id)} title={d.hint}>{d.label}</button>
          ))}
        </div>
        <label style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '14px', fontWeight: 700, cursor: 'pointer' }}>
          <input type="checkbox" checked={!!p.suspected} onChange={(e) => setP({ ...p, suspected: e.target.checked })} style={{ width: '22px', height: '22px', accentColor: '#2F5233' }} />
          Not diagnosed yet, still being tested
        </label>
      </div>

      <div className="glass" style={{ padding: '4px', marginBottom: '14px' }}>
        <Accordion title="My normal numbers" hint="Helps staff read your pulse in an emergency" defaultOpen>
          <div style={{ display: 'grid', gap: '14px', padding: '4px 10px 10px' }}>
            <Field label="Pulse lying down" suffix="bpm" value={p.baseline?.lyingHr} onChange={(v) => setP({ ...p, baseline: { ...p.baseline, lyingHr: v } })} help="A stand test can fill this in for you." />
            <Field label="Pulse standing" suffix="bpm" value={p.baseline?.standingHr} onChange={(v) => setP({ ...p, baseline: { ...p.baseline, standingHr: v } })} />
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Field label="Usual blood pressure, top" suffix="mmHg" value={p.baseline?.systolic} onChange={(v) => setP({ ...p, baseline: { ...p.baseline, systolic: v } })} />
              <Field label="Bottom" suffix="mmHg" value={p.baseline?.diastolic} onChange={(v) => setP({ ...p, baseline: { ...p.baseline, diastolic: v } })} />
            </div>
          </div>
        </Accordion>
        <Accordion title="Targets from my doctor" hint="Fluids and salt, only if your doctor set them">
          <div style={{ display: 'grid', gap: '14px', padding: '4px 10px 10px' }}>
            <p style={{ fontSize: '14px', color: '#3F3D36' }}>Relay Arc never sets these for you. Extra salt is not safe for everyone, for example with high blood pressure, heart or kidney problems.</p>
            <Field label="Fluids a day" suffix="ml" value={p.targets?.fluidMl} onChange={(v) => setP({ ...p, targets: { ...p.targets, fluidMl: v } })} help="2 litres is 2000 ml" />
            <Field label="Salt a day" suffix="grams" value={p.targets?.saltG} onChange={(v) => setP({ ...p, targets: { ...p.targets, saltG: v } })} />
          </div>
        </Accordion>
        <Accordion title="My triggers" hint={(p.triggers || []).join(', ') || 'What usually sets you off'}>
          <div className="med-chips" style={{ marginTop: 0, padding: '0 10px 10px' }}>
            {TRIGGERS.map((t) => <button key={t} className="ak-chip" data-on={(p.triggers || []).includes(t)} onClick={() => tog('triggers', t)}>{t}</button>)}
          </div>
        </Accordion>
        <Accordion title="For emergency staff" hint="Shows on your emergency card">
          <div style={{ display: 'grid', gap: '12px', padding: '4px 10px 10px' }}>
            {(['helps', 'avoid'] as const).map((k) => (
              <label key={k} style={{ display: 'grid', gap: '6px' }}>
                <span style={{ fontWeight: 750 }}>{k === 'helps' ? 'What helps me, in my words' : 'What makes me worse'}</span>
                <textarea rows={2} maxLength={240} defaultValue={p[k] || ''} onChange={(e) => setP({ ...p, [k]: e.target.value })}
                  placeholder={k === 'helps' ? 'Lying flat, IV fluids, a cool room' : 'Being made to stand, hot rooms'}
                  style={{ borderRadius: 10, border: '1.5px solid rgba(20,20,19,0.16)', padding: '10px 12px', font: 'inherit', fontSize: '16px', resize: 'none', background: 'rgba(255,255,255,0.8)' }} />
              </label>
            ))}
            <label style={{ display: 'grid', gap: '6px' }}>
              <span style={{ fontWeight: 750 }}>My autonomic doctor</span>
              <input defaultValue={p.doctor?.name || ''} maxLength={80} placeholder="Name and clinic" onChange={(e) => setP({ ...p, doctor: { ...p.doctor, name: e.target.value } })}
                style={{ height: '50px', borderRadius: 10, border: '1.5px solid rgba(20,20,19,0.16)', padding: '0 14px', font: 'inherit', fontSize: '16px', background: 'rgba(255,255,255,0.8)' }} />
              <input defaultValue={p.doctor?.phone || ''} maxLength={24} inputMode="tel" placeholder="Phone" onChange={(e) => setP({ ...p, doctor: { ...p.doctor, phone: e.target.value } })}
                style={{ height: '50px', borderRadius: 10, border: '1.5px solid rgba(20,20,19,0.16)', padding: '0 14px', font: 'inherit', fontSize: '16px', background: 'rgba(255,255,255,0.8)' }} />
            </label>
          </div>
        </Accordion>
        <Accordion title="Heat alerts" hint={p.heatAlerts && p.place ? `On for ${p.place.label}` : 'Off'}>
          <div style={{ padding: '4px 10px 10px', display: 'grid', gap: '10px' }}>
            <p style={{ fontSize: '14px', color: '#3F3D36' }}>Heat is a common trigger. Your home screen warns you on hot or humid days. Only a rough location (about 1 km) is stored.</p>
            {p.heatAlerts && p.place ? (
              <button className="ak-chip" style={{ justifySelf: 'start', height: '40px' }} onClick={() => setP({ ...p, heatAlerts: false })}>Turn off heat alerts</button>
            ) : (
              <button className="ds-btn ds-btn-ink" style={{ justifySelf: 'start', minHeight: '46px', padding: '0 18px', borderRadius: 10, border: 0, fontWeight: 800, cursor: 'pointer' }} onClick={locate}>Use my location</button>
            )}
          </div>
        </Accordion>
      </div>

      <button className="au-big-btn ds-btn-sos" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      {msg && <p style={{ fontSize: '14px', marginTop: '10px' }} role="status">{msg}</p>}
      <BottomNav />
    </div>
  )
}
