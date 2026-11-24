'use client'
// /my-card: the signed in person's own emergency card, built from their profile.
// Big type, allergies first, one tap to call a contact. Cached on the phone so it
// still opens with no signal.
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import BottomNav from '@/components/BottomNav'
import Accordion from '@/components/Accordion'
import { AppHeader } from '@/components/AppKit'
import { Share2 } from '@/lib/plain-icons'
import { loadProfile, type AutonomicProfile } from '@/lib/autonomic/store'

const CACHE = 'relay_offline_profile'
const split = (s?: string | null) => (s ? s.split(',').map((x) => x.trim()).filter(Boolean) : [])

export default function MyCard() {
  const router = useRouter()
  const [p, setP] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [big, setBig] = useState(false)
  const [auto, setAuto] = useState<AutonomicProfile | null>(null)
  useEffect(() => {
    loadProfile().then(setAuto).catch(() => {})
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const cached = localStorage.getItem(CACHE)
        if (cached) setP(JSON.parse(cached))
      } catch {}
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
          if (data) {
            setP(data)
            try { localStorage.setItem(CACHE, JSON.stringify(data)) } catch {}
          }
        }
      } catch {
        /* offline: the cached copy above is what shows */
      }
      setLoading(false)
    })()
  }, [])

  const allergies = split(p?.allergies)
  const conditions = split(p?.diagnosis)
  const meds: any[] = p?.medications || []
  const contacts: any[] = p?.emergency_contacts || []
  const age = p?.date_of_birth ? Math.floor((Date.now() - new Date(p.date_of_birth).getTime()) / (365.25 * 864e5)) : null

  const share = async () => {
    const text = [
      `Emergency card for ${p?.full_name || 'me'}`,
      age !== null ? `Age ${age}` : '',
      `Blood type ${p?.blood_type || 'unknown'}`,
      `Allergies ${allergies.join(', ') || 'none known'}`,
      `Conditions ${conditions.join(', ') || 'none listed'}`,
      `Medicines ${meds.map((m) => [m.name, m.dose].filter(Boolean).join(' ')).join(', ') || 'none listed'}`,
      ...contacts.map((c) => `Contact ${c.name}${c.relationship ? ` (${c.relationship})` : ''} ${c.phone}`),
      'From Relay Arc, relay-arc.org',
    ].filter(Boolean).join('\n')
    try {
      if (navigator.share) { await navigator.share({ title: 'Emergency card', text }); return }
      await navigator.clipboard.writeText(text)
      toast.success('Card copied as text')
    } catch {}
  }

  const label = (t: string) => <p style={{ fontSize: '13px', fontWeight: 750, color: '#3F3D36', marginBottom: '4px' }}>{t}</p>

  const card = (
    <section className="mycard" data-big={big}>
      <div className="mycard-top">
        <span>Emergency card</span>
        <span>Relay Arc</span>
      </div>
      <div style={{ padding: '18px 18px 20px' }}>
        <p style={{ fontSize: big ? '40px' : '30px', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.02 }}>
          {p?.full_name || (loading ? ' ' : 'Add your name in Settings')}
        </p>
        <p style={{ fontSize: '15px', color: '#3F3D36', marginTop: '4px' }}>
          {age !== null ? `${age} years old` : 'Birthday not set'}
          {p?.phone ? ` · ${p.phone}` : ''}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', marginTop: '18px' }}>
          <div className="mycard-cell">
            {label('Blood')}
            <p style={{ fontSize: big ? '44px' : '34px', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1 }}>{p?.blood_type || '?'}</p>
          </div>
          <div className="mycard-cell" data-hot={allergies.length > 0}>
            {label('Allergies')}
            <p style={{ fontSize: big ? '22px' : '18px', fontWeight: 850, lineHeight: 1.25 }}>{allergies.join(', ') || 'None known'}</p>
          </div>
        </div>

        <div style={{ marginTop: '16px' }}>
          {label('Conditions')}
          <p style={{ fontSize: big ? '20px' : '17px', fontWeight: 750 }}>{conditions.join(', ') || 'None listed'}</p>
        </div>
        <div style={{ marginTop: '14px' }}>
          {label('Medicines')}
          <p style={{ fontSize: big ? '20px' : '17px', fontWeight: 750, lineHeight: 1.4 }}>
            {meds.length ? meds.map((m) => [m.name, m.dose].filter(Boolean).join(' ')).join(', ') : 'None listed'}
          </p>
        </div>

        {auto?.diagnoses?.length ? (
          <div className="mycard-auto">
            {label('Autonomic condition')}
            <p style={{ fontSize: big ? '20px' : '17px', fontWeight: 800 }}>{auto.diagnoses.join(', ')}</p>
            <p style={{ fontSize: '14.5px', lineHeight: 1.45, marginTop: '6px' }}>
              A fast pulse on standing is expected for me{auto.baseline?.standingHr ? ` (usually about ${auto.baseline.standingHr} standing, ${auto.baseline.lyingHr ?? '?'} lying)` : ''}. Please check me lying down. It can still be a real emergency.
            </p>
            {auto.helps ? <p style={{ fontSize: '14.5px', marginTop: '6px' }}><b>Helps me:</b> {auto.helps}</p> : null}
            {auto.avoid ? <p style={{ fontSize: '14.5px', marginTop: '4px' }}><b>Makes me worse:</b> {auto.avoid}</p> : null}
            {auto.doctor?.name ? <p style={{ fontSize: '14.5px', marginTop: '4px' }}><b>My doctor:</b> {auto.doctor.name}{auto.doctor.phone ? `, ${auto.doctor.phone}` : ''}</p> : null}
          </div>
        ) : null}

        {contacts.length > 0 && (
          <div style={{ marginTop: '16px', display: 'grid', gap: '8px' }}>
            {label('Call')}
            {contacts.map((c, i) => (
              <a key={i} href={`tel:${c.phone}`} className="mycard-call">
                <span style={{ flex: 1 }}>
                  <strong style={{ display: 'block', fontSize: '16px' }}>{c.name}</strong>
                  <span style={{ fontSize: '13px', opacity: 0.8 }}>{[c.relationship, c.phone].filter(Boolean).join(' · ')}</span>
                </span>
                <span style={{ fontWeight: 800, fontSize: '14px' }}>Call</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  )

  if (big)
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 300, overflowY: 'auto', background: '#F7F5EE', padding: '16px' }}>
        <button className="ds-btn ds-btn-ink" onClick={() => setBig(false)} style={{ width: '100%', minHeight: '48px', borderRadius: 10, border: 0, fontWeight: 800, marginBottom: '12px', cursor: 'pointer' }}>
          Done showing
        </button>
        {card}
      </div>
    )

  return (
    <div style={{ minHeight: '100dvh', maxWidth: '640px', margin: '0 auto', padding: '0 16px 112px' }}>
      <AppHeader title="My emergency card" back="/settings" backLabel="Settings" sub="Opens even with no signal once you have opened it here." />
      {card}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '14px' }}>
        <button className="ds-btn ds-btn-sos" onClick={() => setBig(true)} style={{ minHeight: '54px', borderRadius: 10, border: 0, fontWeight: 800, cursor: 'pointer' }}>
          Show a responder
        </button>
        <button className="ds-btn ds-btn-ink" onClick={share} style={{ minHeight: '54px', borderRadius: 10, border: 0, fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Share2 size={15} /> Share
        </button>
      </div>
      <div className="glass" style={{ padding: '4px', marginTop: '14px' }}>
        <Accordion title="Change what is on it" hint="Name, blood type, allergies, conditions">
          <button className="row" onClick={() => router.push('/settings')}>
            <span className="row-title" style={{ flex: 1 }}>Edit your details</span>
            <span className="row-end">›</span>
          </button>
          <button className="row" onClick={() => router.push('/medications')}>
            <span className="row-title" style={{ flex: 1 }}>Edit medicines</span>
            <span className="row-end">›</span>
          </button>
          <button className="row" onClick={() => router.push('/emergency-contacts')}>
            <span className="row-title" style={{ flex: 1 }}>Edit contacts</span>
            <span className="row-end">›</span>
          </button>
        </Accordion>
        <Accordion title="Lock screen and print" hint="A card that works without the app">
          <button className="row" onClick={() => router.push('/card')}>
            <span style={{ flex: 1 }}>
              <span className="row-title" style={{ display: 'block' }}>Make a lock screen image</span>
              <span className="row-sub" style={{ display: 'block' }}>Saved as a picture, nothing is uploaded</span>
            </span>
            <span className="row-end">›</span>
          </button>
        </Accordion>
      </div>
      <BottomNav />
    </div>
  )
}
