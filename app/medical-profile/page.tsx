'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Share2,
  Heart,
  Pill,
  AlertTriangle,
  User,
  Phone,
  Droplets,
  Shield,
} from '@/lib/plain-icons'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import BottomNav from '@/components/BottomNav'
import Accordion from '@/components/Accordion'
import { AppHeader, Hero } from '@/components/AppKit'

const spring = { type: 'spring', stiffness: 340, damping: 26 } as const
const mono = 'var(--font-mono, monospace)'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        color: '#5C5A52',
        fontSize: '13px',
        fontWeight: 600,
        letterSpacing: '0',
        marginBottom: '4px',
        marginTop: '32px',
      }}
    >
      {children}
    </p>
  )
}

function Empty({ text }: { text: string }) {
  return <p style={{ color: '#5C5A52', fontSize: '13px', padding: '14px 0' }}>{text}</p>
}

export default function MedicalProfile() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      try {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (data) {
          setProfile(data)
          try {
            localStorage.setItem('relay_offline_profile', JSON.stringify(data))
          } catch {}
        } else {
          throw new Error('no data')
        }
      } catch {
        // Offline: fall back to the locally cached profile
        try {
          const cached = localStorage.getItem('relay_offline_profile')
          if (cached) setProfile(JSON.parse(cached))
        } catch {}
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleShare = async () => {
    const text = buildShareText(profile)
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Medical Profile. ' + profile?.full_name, text })
        return
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Medical profile copied to clipboard')
    } catch {
      toast.error('Could not copy. Try again')
    }
  }

  if (loading)
    return (
      <div style={{ minHeight: '100dvh', background: 'transparent', padding: '80px 20px 100px' }}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton
            key={i}
            style={{
              height: '60px',
              borderRadius: 0,
              background: '#F2F0E8',
              marginBottom: '10px',
            }}
          />
        ))}
      </div>
    )

  const meds: any[] = profile?.medications || []
  const contacts: any[] = profile?.emergency_contacts || []
  const conditions = profile?.diagnosis
    ? profile.diagnosis
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean)
    : []
  const allergies = profile?.allergies
    ? profile.allergies
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean)
    : []
  const age = profile?.date_of_birth
    ? Math.floor(
        (Date.now() - new Date(profile.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000),
      )
    : null

  const row = (k: string, v: React.ReactNode) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '14px', padding: '12px 0', borderTop: '1px solid rgba(20,20,19,0.08)' }}>
      <span style={{ color: '#3F3D36', fontSize: '14px' }}>{k}</span>
      <span style={{ color: '#141413', fontSize: '15px', fontWeight: 700, textAlign: 'right' }}>{v}</span>
    </div>
  )
  return (
    <div style={{ minHeight: '100dvh', maxWidth: '640px', margin: '0 auto', width: '100%', padding: '0 16px 112px' }}>
      <AppHeader
        title="Medical profile"
        back="/settings"
        backLabel="Settings"
        right={
          <button onClick={handleShare} className="glass ak-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Share2 size={15} /> Share
          </button>
        }
      />

      <Hero>
        <span className="ak-kicker">Show this to responders</span>
        <p style={{ fontSize: '28px', fontWeight: 850, letterSpacing: '-0.035em', lineHeight: 1.05, marginTop: '6px' }}>
          {profile?.full_name || 'Your name'}
        </p>
        <p style={{ fontSize: '14px', marginTop: '4px', color: '#3F3D36' }}>
          {age !== null ? `${age} years old` : 'Birthday not set'}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '16px' }}>
          {[
            { k: 'Blood', v: profile?.blood_type || '?', hot: false },
            { k: 'Allergies', v: allergies.length, hot: allergies.length > 0 },
            { k: 'Medicines', v: meds.length, hot: false },
          ].map((x) => (
            <div key={x.k} style={{ borderRadius: 10, padding: '10px 12px', background: x.hot ? '#F07800' : 'rgba(255,255,255,0.6)' }}>
              <p style={{ fontSize: '12.5px', fontWeight: 700, color: x.hot ? '#141413' : '#3F3D36' }}>{x.k}</p>
              <p style={{ fontSize: '30px', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05 }}>{x.v}</p>
            </div>
          ))}
        </div>
      </Hero>

      <div ref={cardRef} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {allergies.length > 0 && (
          <section className="glass ak-accent-orange" style={{ padding: '16px 16px 16px 20px' }}>
            <p style={{ color: '#8F4A00', fontWeight: 800, fontSize: '14px', marginBottom: '6px' }}>Allergies</p>
            <p style={{ color: '#141413', fontSize: '18px', fontWeight: 800, lineHeight: 1.4 }}>{allergies.join(', ')}</p>
          </section>
        )}

        <section className="glass" style={{ padding: '16px' }}>
          <p className="ak-panel-title" style={{ marginBottom: '8px' }}>Conditions</p>
          {conditions.length > 0 ? (
            <div className="med-chips" style={{ marginTop: 0 }}>
              {conditions.map((c: string) => (
                <span key={c} className="ak-chip" style={{ height: '34px', fontSize: '14px' }}>{c}</span>
              ))}
            </div>
          ) : (
            <Empty text="No conditions listed" />
          )}
        </section>

        <section className="glass" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
            <p className="ak-panel-title">Medicines</p>
            <button onClick={() => router.push('/medications')} style={{ background: 'none', border: 0, color: '#2F5233', fontWeight: 750, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>
              Edit
            </button>
          </div>
          {meds.length > 0 ? (
            meds.map((med: any, i: number) => <div key={i}>{row(med.name, [med.dose, med.frequency].filter(Boolean).join(', ') || '.')}</div>)
          ) : (
            <Empty text="No medications listed" />
          )}
        </section>

        <section className="glass" style={{ padding: '4px' }}>
          <Accordion title="Emergency contacts" hint={contacts.length ? `${contacts.length} saved` : 'None saved yet'}>
            <div style={{ padding: '0 10px 6px' }}>
              {contacts.length > 0 ? (
                contacts.map((c: any, i: number) => <div key={i}>{
                  row(`${c.name}${c.relationship ? `, ${c.relationship}` : ''}`, <a href={`tel:${c.phone}`} style={{ color: '#2F5233', textDecoration: 'none' }}>{c.phone}</a>)}</div>,
                )
              ) : (
                <button onClick={() => router.push('/emergency-contacts')} className="ak-chip" style={{ border: 0, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Add contacts
                </button>
              )}
            </div>
          </Accordion>
          {(profile?.surgery_date || profile?.doctor_name || profile?.date_of_birth) && (
            <Accordion title="Care details" hint="Birthday, doctor and surgery date">
              <div style={{ padding: '0 10px 6px' }}>
                {profile?.date_of_birth && row('Born', new Date(profile.date_of_birth).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }))}
                {profile?.doctor_name && row('Doctor', profile.doctor_name)}
                {profile?.surgery_date && row('Surgery', new Date(profile.surgery_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }))}
              </div>
            </Accordion>
          )}
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button onClick={() => router.push('/my-card')} className="ds-btn ds-btn-sos" style={{ minHeight: '54px', borderRadius: 10, border: 0, fontWeight: 800, cursor: 'pointer' }}>
            Open my card
          </button>
          <button onClick={handleShare} className="ds-btn ds-btn-ink" style={{ minHeight: '54px', borderRadius: 10, border: 0, fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Share2 size={15} /> Share as text
          </button>
        </div>
        <p style={{ color: '#3F3D36', fontSize: '12.5px', textAlign: 'center' }}>
          Change your details in Settings. Medicines update from the Meds page.
        </p>
      </div>

      <BottomNav />
    </div>
  )
}

function buildShareText(profile: any): string {
  if (!profile) return ''
  const meds: any[] = profile.medications || []
  const contacts: any[] = profile.emergency_contacts || []
  const conditions = profile.diagnosis
    ? profile.diagnosis
        .split(',')
        .map((s: string) => s.trim())
        .join(', ')
    : 'None listed'
  const allergies = profile.allergies
    ? profile.allergies
        .split(',')
        .map((s: string) => s.trim())
        .join(', ')
    : 'None known'
  const dob = profile.date_of_birth
    ? new Date(profile.date_of_birth).toLocaleDateString('en-IN')
    : 'Not provided'

  const medList =
    meds.length > 0
      ? meds.map((m) => `  - ${m.name} ${m.dose} (${m.frequency || ''})`).join('\n')
      : '  None listed'

  const contactList =
    contacts.length > 0
      ? contacts.map((c) => `  - ${c.name} (${c.relationship}): ${c.phone}`).join('\n')
      : '  None listed'

  return `MEDICAL PROFILE: ${profile.full_name || 'Unknown'}
========================================
Date of Birth: ${dob}
Blood Type: ${profile.blood_type || 'Unknown'}

CONDITIONS:
${conditions}

ALLERGIES (CRITICAL):
${allergies}

CURRENT MEDICATIONS:
${medList}

EMERGENCY CONTACTS:
${contactList}

${profile.doctor_name ? `Primary Doctor: ${profile.doctor_name}` : ''}
${profile.surgery_date ? `Surgery Date: ${new Date(profile.surgery_date).toLocaleDateString('en-IN')}` : ''}
========================================
Generated by Relay Arc, relay-arc.org`
}
