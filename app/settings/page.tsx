'use client'
import { Hero } from '@/components/AppKit'
import AccessPanel from '@/components/AccessPanel'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import BottomNav from '@/components/BottomNav'
import DateField from '@/components/DateField'
import Accordion from '@/components/Accordion'
import { SearchButton, openCommandPalette } from '@/components/CommandPalette'
import { clean } from '@/lib/clean'

const LIMITS: Record<string, number> = { full_name: 80, phone: 24, cardiologist: 80, blood_type: 8, allergies: 500, diagnosis: 300 }

export default function Settings() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      setLoading(false)
    }
    load()
  }, [])

  const startEdit = (field: string, currentValue: string) => {
    setEditing(field)
    setEditValue(currentValue || '')
  }

  const saveEdit = async () => {
    if (!editing || !profile) return
    setSaving(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    // Same trap as onboarding: date_of_birth is editable here, and clearing the field sends
    // '' which Postgres rejects for a date column.
    const cleaned = editing === 'date_of_birth' ? editValue.trim() : clean(editValue, LIMITS[editing] ?? 80)
    const next = cleaned === '' ? null : cleaned
    const { error } = await supabase
      .from('profiles')
      .update({ [editing]: next })
      .eq('id', user.id)
    if (error) {
      // Show what actually went wrong. "Could not save — try again" sent me
      // hunting for a network fault when the real message named the column and
      // the bad value.
      toast.error(error.message || 'Could not save. Try again')
    } else {
      setProfile((prev: any) => ({ ...prev, [editing]: next }))
      toast.success('Saved')
      setEditing(null)
    }
    setSaving(false)
  }

  if (loading)
    return (
      <div style={{ minHeight: '100dvh', padding: '80px 20px 100px', display: 'grid', gap: '12px', alignContent: 'start', maxWidth: '640px', margin: '0 auto' }}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="glass" style={{ height: '64px' }} />
        ))}
      </div>
    )

  const fields = [
    { key: 'full_name', label: 'Full name', value: profile?.full_name, inputType: 'text' },
    { key: 'phone', label: 'Phone', value: profile?.phone, inputType: 'tel' },
    { key: 'date_of_birth', label: 'Date of birth', value: profile?.date_of_birth, inputType: 'date' },
    { key: 'cardiologist', label: 'Cardiologist', value: profile?.cardiologist, inputType: 'text' },
    { key: 'blood_type', label: 'Blood type', value: profile?.blood_type, inputType: 'text' },
    { key: 'allergies', label: 'Allergies', value: profile?.allergies, inputType: 'text' },
    { key: 'diagnosis', label: 'Conditions', value: profile?.diagnosis, inputType: 'text' },
  ]
  const filled = fields.filter((f) => f.value).length
  const first = profile?.full_name?.split(' ')[0] || 'Profile'

  const link = (title: string, sub: string, path: string, badge: string, danger = false) => (
    <button key={path} className="row" onClick={() => router.push(path)}>
      <span className="row-badge" aria-hidden style={danger ? { background: 'rgba(240,120,0,0.12)', color: '#7A3D00' } : undefined}>
        {badge}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="row-title" style={{ display: 'block' }}>{title}</span>
        <span className="row-sub" style={{ display: 'block' }}>{sub}</span>
      </span>
      <span className="row-end" aria-hidden>›</span>
    </button>
  )

  return (
    <div style={{ minHeight: '100dvh', paddingBottom: '120px', maxWidth: '640px', margin: '0 auto', width: '100%' }}>
      {/* Header: who you are, and search */}
      <div style={{ padding: '48px 20px 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
          <button onClick={() => router.push('/dashboard')} className="glass ak-pill">
            ← Home
          </button>
          <SearchButton />
        </div>
        <h1 className="ak-title" style={{ marginBottom: '16px' }}>Settings</h1>
        <Hero style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div aria-hidden style={{ width: '62px', height: '62px', borderRadius: '10px', background: '#F07800', color: '#141413', display: 'grid', placeItems: 'center', fontSize: '28px', fontWeight: 900, flexShrink: 0 }}>
              {first.charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, margin: 0, overflowWrap: 'anywhere' }}>
                {profile?.full_name || 'Your profile'}
              </p>
              <p style={{ fontSize: '14px', marginTop: '4px', opacity: 0.85 }}>
                {profile?.diagnosis?.split(',')[0] || 'No diagnosis added'}
              </p>
            </div>
          </div>
        </Hero>
      </div>

      <div style={{ padding: '0 20px', display: 'grid', gap: '26px' }}>
        {/* You */}
        <section aria-labelledby="g-you">
          <p className="group-label" id="g-you">You</p>
          <div className="glass" style={{ padding: '6px' }}>
            <Accordion title="Personal details" hint={`${filled} of ${fields.length} filled in`} defaultOpen={filled < fields.length}>
              {fields.map((f) => (
                <div key={f.key}>
                  {editing === f.key ? (
                    <div style={{ padding: '12px 10px 14px' }}>
                      <label htmlFor={`settings-${f.key}`} style={{ display: 'block', color: '#3F3D36', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                        {f.label}
                      </label>
                      {f.inputType === 'date' ? (
                        <div style={{ marginBottom: '10px' }}>
                          <DateField id={`settings-${f.key}`} label="" value={editValue} onChange={setEditValue} />
                        </div>
                      ) : (
                        <input
                          id={`settings-${f.key}`}
                          type={f.inputType}
                          autoFocus
                          value={editValue}
                          maxLength={LIMITS[f.key] ?? 80}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                          placeholder={f.key === 'allergies' || f.key === 'diagnosis' ? 'Separate with commas' : undefined}
                          style={{ width: '100%', background: 'rgba(255,255,255,0.8)', border: '1.5px solid rgba(20,20,19,0.16)', borderRadius: 10, padding: '14px 16px', color: '#141413', fontSize: '16px', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '10px' }}
                        />
                      )}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={saveEdit} disabled={saving} className="ds-btn ds-btn-ink sh-slant" style={{ flex: 1, minHeight: '46px' }}>
                          {saving ? 'Saving…' : 'Save'}
                        </button>
                        <button onClick={() => setEditing(null)} className="ds-btn ds-btn-line sh-pill" style={{ flex: 1, minHeight: '46px' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button className="row" onClick={() => startEdit(f.key, f.value)} style={{ padding: '12px 10px' }}>
                      <span style={{ color: '#3F3D36', fontSize: '14px', width: '112px', flexShrink: 0 }}>{f.label}</span>
                      <span style={{ flex: 1, color: f.value ? '#141413' : '#504E46', fontSize: '15px', fontWeight: f.value ? 650 : 400, overflowWrap: 'anywhere' }}>
                        {f.value || 'Add'}
                      </span>
                      <span className="row-end" style={{ fontSize: '13px', fontWeight: 600 }}>Edit</span>
                    </button>
                  )}
                </div>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Emergency */}
        <section aria-labelledby="g-emergency">
          <p className="group-label" id="g-emergency">Emergency</p>
          <div className="glass" style={{ padding: '6px' }}>
            {link('Emergency contacts', 'Who gets a text when you press SOS', '/emergency-contacts', 'SOS', true)}
            {link('Medical profile', 'Conditions, medicines and allergies', '/medical-profile', 'ID')}
            {link('My emergency card', 'Your details, ready to show a responder', '/my-card', 'Card')}
          </div>
        </section>

        {/* Health */}
        <section aria-labelledby="g-health">
          <p className="group-label" id="g-health">Health data</p>
          <div className="glass" style={{ padding: '6px' }}>
            {link('Vitals check', 'Pulse, breathing and your NEWS2 sheet', '/check', 'Vit')}
            <Accordion title="History and devices" hint="Past records and Apple Watch">
              {link('Health history', 'Past check ins and emergencies', '/history', 'Log')}
              {link('Emergency history', 'Past SOS events', '/emergency/history', 'Past')}
              {link('Connect Apple Watch', 'Readings arrive by themselves', '/connect-health', 'Watch')}
            </Accordion>
          </div>
        </section>

        {/* Display and access */}
        <section aria-labelledby="g-access">
          <p className="group-label" id="g-access">Display and access</p>
          <div className="glass" style={{ padding: '6px' }}>
            <Accordion title="Text size, contrast and motion" hint="Saved on this phone only">
              <div style={{ padding: '4px 10px 10px' }}>
                <AccessPanel />
              </div>
            </Accordion>
          </div>
        </section>

        {/* Privacy and account */}
        <section aria-labelledby="g-account">
          <p className="group-label" id="g-account">Privacy and account</p>
          <div className="glass" style={{ padding: '6px' }}>
            <Accordion title="Privacy and legal" hint="No ads and no trackers">
              {link('Privacy policy', 'What we keep and why', '/privacy', 'P')}
              {link('Terms', 'The rules for using Relay Arc', '/terms', 'T')}
            </Accordion>
            <button className="row" onClick={openCommandPalette}>
              <span className="row-badge" aria-hidden>⌘K</span>
              <span style={{ flex: 1 }}>
                <span className="row-title" style={{ display: 'block' }}>Search and shortcuts</span>
                <span className="row-sub" style={{ display: 'block' }}>Jump to any page or action</span>
              </span>
              <span className="row-end" aria-hidden>›</span>
            </button>
            <SignOutRow />
          </div>
        </section>
      </div>
      <BottomNav />
    </div>
  )
}

function SignOutRow() {
  const router = useRouter()
  const [ask, setAsk] = useState(false)
  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }
  return (
    <>
      <button className="row" onClick={() => setAsk(true)}>
        <span className="row-badge" aria-hidden style={{ background: 'rgba(240,120,0,0.12)', color: '#7A3D00' }}>Out</span>
        <span className="row-title" style={{ color: '#7A3D00' }}>Sign out</span>
      </button>
      {ask && (
        <div className="cmdk-overlay" style={{ alignItems: 'center', paddingTop: '16px' }} onMouseDown={(e) => e.target === e.currentTarget && setAsk(false)}>
          <div className="cmdk-panel glass glass-strong" role="alertdialog" aria-modal="true" aria-labelledby="so-title" style={{ maxWidth: '400px', padding: '26px 24px 22px' }} onKeyDown={(e) => e.key === 'Escape' && setAsk(false)}>
            <h2 id="so-title" className="ds-title" style={{ fontSize: '24px' }}>Sign out?</h2>
            <p style={{ fontSize: '15.5px', lineHeight: 1.5, margin: '10px 0 22px', color: '#3F3D36' }}>
              Your emergency card stays on this phone. You can sign back in any time.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="ds-btn ds-btn-ink sh-slant" style={{ flex: 1 }} autoFocus onClick={signOut}>Sign out</button>
              <button className="ds-btn ds-btn-line sh-pill" style={{ flex: 1 }} onClick={() => setAsk(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
