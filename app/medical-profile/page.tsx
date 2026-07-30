'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Share2, Heart, Pill, AlertTriangle, User, Phone, Droplets, Shield } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import BottomNav from '@/components/BottomNav'

const spring = { type: 'spring', stiffness: 340, damping: 26 } as const
const mono = 'var(--font-mono, monospace)'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: '#8A8780', fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', fontFamily: mono, marginBottom: '4px', marginTop: '32px' }}>
      {children}
    </p>
  )
}

function Empty({ text }: { text: string }) {
  return <p style={{ color: '#8A8780', fontSize: '13px', padding: '14px 0' }}>{text}</p>
}

export default function MedicalProfile() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      try {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (data) {
          setProfile(data)
          try { localStorage.setItem('relay_offline_profile', JSON.stringify(data)) } catch {}
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
        await navigator.share({ title: 'Medical Profile — ' + profile?.full_name, text })
        return
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Medical profile copied to clipboard')
    } catch {
      toast.error('Could not copy — try again')
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100dvh', background: '#FAF9F5', padding: '80px 20px 100px' }}>
      {[1,2,3,4].map(i => <Skeleton key={i} style={{ height: '60px', borderRadius: '12px', background: '#F2F0E8', marginBottom: '10px' }}/>)}
    </div>
  )

  const meds: any[] = profile?.medications || []
  const contacts: any[] = profile?.emergency_contacts || []
  const conditions = profile?.diagnosis ? profile.diagnosis.split(',').map((s: string) => s.trim()).filter(Boolean) : []
  const allergies = profile?.allergies ? profile.allergies.split(',').map((s: string) => s.trim()).filter(Boolean) : []
  const age = profile?.date_of_birth
    ? Math.floor((Date.now() - new Date(profile.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null

  return (
    <div style={{ minHeight: '100dvh', background: '#FAF9F5', paddingBottom: '90px', maxWidth: '640px', margin: '0 auto', width: '100%' }}>

      {/* Header */}
      <div style={{ padding: '56px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
          <button onClick={() => router.back()}
            style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#8A8780', fontSize: '13px', fontWeight: 500, fontFamily: 'inherit' }}>
            <ArrowLeft size={14}/> Back
          </button>
          <button onClick={handleShare}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#5F7049', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit' }}>
            <Share2 size={13}/> Share
          </button>
        </div>
        <p style={{ color: '#8A8780', fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', fontFamily: mono, marginBottom: '8px' }}>
          Medical profile · show to responders
        </p>
        <h1 style={{ color: '#141413', fontSize: '32px', fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.05 }}>
          {profile?.full_name || '—'}
        </h1>
        <p style={{ color: '#5C5A52', fontSize: '13px', marginTop: '8px' }}>
          {age !== null ? `${age} years` : 'DOB not set'}
          {profile?.date_of_birth ? ` · born ${new Date(profile.date_of_birth).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
        </p>
      </div>

      <div style={{ padding: '0 20px' }} ref={cardRef}>

        {/* Blood type + key facts — big numbers, no cards */}
        <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-end', borderBottom: '1px solid #E5E2D9', padding: '28px 0 22px' }}>
          <div>
            <p style={{ color: '#8A8780', fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', fontFamily: mono, marginBottom: '6px' }}>Blood type</p>
            <p style={{ color: '#A33417', fontSize: '52px', fontWeight: 900, letterSpacing: '-2px', lineHeight: 0.85 }}>
              {profile?.blood_type || '—'}
            </p>
          </div>
          <div>
            <p style={{ color: '#8A8780', fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', fontFamily: mono, marginBottom: '6px' }}>Allergies</p>
            <p style={{ color: allergies.length > 0 ? '#A33417' : '#141413', fontSize: '52px', fontWeight: 900, letterSpacing: '-2px', lineHeight: 0.85 }}>
              {allergies.length}
            </p>
          </div>
          <div>
            <p style={{ color: '#8A8780', fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', fontFamily: mono, marginBottom: '6px' }}>Medications</p>
            <p style={{ color: '#141413', fontSize: '52px', fontWeight: 900, letterSpacing: '-2px', lineHeight: 0.85 }}>
              {meds.length}
            </p>
          </div>
        </div>

        {/* Allergies — critical, kept loud */}
        {allergies.length > 0 && (
          <div style={{ borderLeft: '3px solid #A33417', paddingLeft: '14px', marginTop: '24px' }}>
            <p style={{ color: '#A33417', fontWeight: 700, fontSize: '11px', letterSpacing: '1.2px', textTransform: 'uppercase', fontFamily: mono, marginBottom: '6px' }}>
              Critical — allergies
            </p>
            <p style={{ color: '#141413', fontSize: '16px', fontWeight: 700, letterSpacing: '-0.2px', lineHeight: 1.5 }}>
              {allergies.join(' · ')}
            </p>
          </div>
        )}

        {/* Conditions */}
        <SectionLabel>Conditions</SectionLabel>
        <div style={{ borderTop: '1px solid #E5E2D9' }}>
          {conditions.length > 0 ? conditions.map((c: string, i: number) => (
            <p key={i} style={{ color: '#141413', fontSize: '14.5px', fontWeight: 600, padding: '13px 0', borderBottom: '1px solid #E5E2D9' }}>{c}</p>
          )) : <Empty text="No conditions listed"/>}
        </div>

        {/* Medications */}
        <SectionLabel>Current medications</SectionLabel>
        <div style={{ borderTop: '1px solid #E5E2D9' }}>
          {meds.length > 0 ? meds.map((med: any, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '16px', padding: '13px 0', borderBottom: '1px solid #E5E2D9' }}>
              <div>
                <p style={{ color: '#141413', fontWeight: 600, fontSize: '14.5px' }}>{med.name}</p>
                {(med.frequency || med.time) && (
                  <p style={{ color: '#8A8780', fontSize: '12.5px', marginTop: '2px' }}>{med.frequency || ''}{med.time ? ` · ${med.time}` : ''}</p>
                )}
              </div>
              <span style={{ color: '#5C5A52', fontSize: '13px', fontFamily: mono, flexShrink: 0 }}>{med.dose}</span>
            </div>
          )) : <Empty text="No medications listed"/>}
        </div>

        {/* Care information */}
        {(profile?.surgery_date || profile?.doctor_name) && (
          <>
            <SectionLabel>Care information</SectionLabel>
            <div style={{ borderTop: '1px solid #E5E2D9' }}>
              {profile?.surgery_date && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '13px 0', borderBottom: '1px solid #E5E2D9' }}>
                  <span style={{ color: '#8A8780', fontSize: '13px' }}>Surgery date</span>
                  <span style={{ color: '#141413', fontSize: '14px', fontWeight: 600 }}>
                    {new Date(profile.surgery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              )}
              {profile?.doctor_name && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '13px 0', borderBottom: '1px solid #E5E2D9' }}>
                  <span style={{ color: '#8A8780', fontSize: '13px' }}>Primary doctor</span>
                  <span style={{ color: '#141413', fontSize: '14px', fontWeight: 600 }}>{profile.doctor_name}</span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Emergency contacts */}
        <SectionLabel>Emergency contacts</SectionLabel>
        <div style={{ borderTop: '1px solid #E5E2D9', marginBottom: '36px' }}>
          {contacts.length > 0 ? contacts.map((c: any, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '13px 0', borderBottom: '1px solid #E5E2D9' }}>
              <div>
                <p style={{ color: '#141413', fontWeight: 600, fontSize: '14.5px' }}>{c.name}</p>
                <p style={{ color: '#8A8780', fontSize: '12.5px', marginTop: '2px' }}>{c.relationship}</p>
              </div>
              <a href={`tel:${c.phone}`}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#5F7049', fontSize: '13.5px', fontWeight: 600, textDecoration: 'none', fontFamily: mono, flexShrink: 0 }}>
                <Phone size={12} color="#5F7049"/>
                {c.phone}
              </a>
            </div>
          )) : (
            <div style={{ padding: '14px 0' }}>
              <p style={{ color: '#8A8780', fontSize: '13px', marginBottom: '10px' }}>No emergency contacts added</p>
              <button onClick={() => router.push('/emergency-contacts')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5F7049', fontSize: '13.5px', fontWeight: 600, padding: 0, fontFamily: 'inherit' }}>
                Add contacts →
              </button>
            </div>
          )}
        </div>

        {/* Share */}
        <motion.button whileTap={{ scale: 0.98 }} onClick={handleShare}
          style={{ width: '100%', background: '#141413', color: 'white', fontWeight: 600, fontSize: '14.5px', padding: '0 20px', borderRadius: '12px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', height: '52px', fontFamily: 'inherit' }}>
          <Share2 size={15}/>
          Share with first responders
        </motion.button>
        <p style={{ color: '#8A8780', fontSize: '11.5px', textAlign: 'center', lineHeight: 1.6, marginTop: '10px' }}>
          Shares a plain-text summary paramedics can read on any device.
        </p>
      </div>

      <BottomNav/>
    </div>
  )
}

function buildShareText(profile: any): string {
  if (!profile) return ''
  const meds: any[] = profile.medications || []
  const contacts: any[] = profile.emergency_contacts || []
  const conditions = profile.diagnosis ? profile.diagnosis.split(',').map((s: string) => s.trim()).join(', ') : 'None listed'
  const allergies = profile.allergies ? profile.allergies.split(',').map((s: string) => s.trim()).join(', ') : 'None known'
  const dob = profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString('en-IN') : 'Not provided'

  const medList = meds.length > 0
    ? meds.map(m => `  - ${m.name} ${m.dose} (${m.frequency || ''})`).join('\n')
    : '  None listed'

  const contactList = contacts.length > 0
    ? contacts.map(c => `  - ${c.name} (${c.relationship}): ${c.phone}`).join('\n')
    : '  None listed'

  return `MEDICAL PROFILE — ${profile.full_name || 'Unknown'}
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
Generated by Relay Arc — relay-arc.vercel.app`
}
