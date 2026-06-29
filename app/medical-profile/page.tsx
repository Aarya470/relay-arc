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

function Section({ icon: Icon, color, title, children }: { icon: any, color: string, title: string, children: React.ReactNode }) {
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(26,40,32,0.07)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(26,40,32,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderBottom: '1px solid rgba(26,40,32,0.06)', background: 'rgba(26,40,32,0.015)' }}>
        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: `${color}15`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={14} color={color}/>
        </div>
        <span style={{ color: '#1A2820', fontWeight: 700, fontSize: '13px', letterSpacing: '-0.1px' }}>{title}</span>
      </div>
      <div style={{ padding: '14px 16px' }}>{children}</div>
    </div>
  )
}

function Tag({ children, color = 'rgba(26,40,32,0.07)', textColor = 'rgba(26,40,32,0.65)' }: { children: React.ReactNode, color?: string, textColor?: string }) {
  return (
    <span style={{ display: 'inline-block', background: color, color: textColor, fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '99px', marginRight: '6px', marginBottom: '6px' }}>
      {children}
    </span>
  )
}

function Empty({ text }: { text: string }) {
  return <p style={{ color: 'rgba(26,40,32,0.28)', fontSize: '13px', fontStyle: 'italic' }}>{text}</p>
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
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
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
    <div style={{ minHeight: '100dvh', background: '#F2EFE9', padding: '80px 16px 100px' }}>
      {[1,2,3,4].map(i => <Skeleton key={i} style={{ height: '80px', borderRadius: '16px', background: 'rgba(26,40,32,0.06)', marginBottom: '10px' }}/>)}
    </div>
  )

  const meds: any[] = profile?.medications || []
  const contacts: any[] = profile?.emergency_contacts || []
  const conditions = profile?.diagnosis ? profile.diagnosis.split(',').map((s: string) => s.trim()).filter(Boolean) : []
  const allergies = profile?.allergies ? profile.allergies.split(',').map((s: string) => s.trim()).filter(Boolean) : []

  return (
    <div style={{ minHeight: '100dvh', background: '#F2EFE9', paddingBottom: '100px' }}>

      {/* Header */}
      <div style={{ padding: '56px 20px 16px', borderBottom: '1px solid rgba(26,40,32,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <motion.button whileTap={{ scale: 0.9 }} transition={spring} onClick={() => router.back()}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FFFFFF', border: '1px solid rgba(26,40,32,0.09)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(26,40,32,0.06)', flexShrink: 0 }}>
            <ArrowLeft size={15} color="rgba(26,40,32,0.5)"/>
          </motion.button>
          <div style={{ flex: 1 }}>
            <h1 style={{ color: '#1A2820', fontWeight: 900, fontSize: '20px', letterSpacing: '-0.7px' }}>Medical Profile</h1>
            <p style={{ color: 'rgba(26,40,32,0.38)', fontSize: '12px' }}>Share with first responders in an emergency</p>
          </div>
          <motion.button whileTap={{ scale: 0.9 }} transition={spring} onClick={handleShare}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#1A2820', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Share2 size={15} color="white"/>
          </motion.button>
        </div>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }} ref={cardRef}>

        {/* Identity card */}
        <div style={{ background: '#1A2820', borderRadius: '20px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 4px 20px rgba(26,40,32,0.18)' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <User size={22} color="rgba(255,255,255,0.8)"/>
          </div>
          <div>
            <p style={{ color: 'white', fontWeight: 800, fontSize: '20px', letterSpacing: '-0.5px', lineHeight: 1.1 }}>{profile?.full_name || '—'}</p>
            {profile?.date_of_birth && (
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', marginTop: '4px' }}>
                DOB: {new Date(profile.date_of_birth).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            )}
            {profile?.blood_type && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(220,38,38,0.25)', border: '1px solid rgba(220,38,38,0.4)', borderRadius: '99px', padding: '3px 10px', marginTop: '6px' }}>
                <Droplets size={10} color="#F87171"/>
                <span style={{ color: '#FCA5A5', fontSize: '12px', fontWeight: 700 }}>{profile.blood_type}</span>
              </div>
            )}
          </div>
        </div>

        {/* Critical alert banner if allergies exist */}
        {allergies.length > 0 && (
          <div style={{ background: 'rgba(220,38,38,0.06)', border: '1.5px solid rgba(220,38,38,0.2)', borderRadius: '14px', padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <AlertTriangle size={16} color="#DC2626" style={{ flexShrink: 0, marginTop: '1px' }}/>
            <div>
              <p style={{ color: '#DC2626', fontWeight: 700, fontSize: '12px', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '4px' }}>Allergies — Critical</p>
              <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                {allergies.map((a: string, i: number) => (
                  <Tag key={i} color="rgba(220,38,38,0.1)" textColor="#B91C1C">{a}</Tag>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Conditions */}
        <Section icon={Heart} color="#DC2626" title="Medical conditions">
          {conditions.length > 0
            ? <div style={{ display: 'flex', flexWrap: 'wrap' }}>{conditions.map((c: string, i: number) => <Tag key={i}>{c}</Tag>)}</div>
            : <Empty text="No conditions listed"/>
          }
        </Section>

        {/* Medications */}
        <Section icon={Pill} color="#5C8B74" title="Current medications">
          {meds.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {meds.map((med: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: i > 0 ? '1px solid rgba(26,40,32,0.05)' : 'none' }}>
                  <div>
                    <p style={{ color: '#1A2820', fontWeight: 600, fontSize: '14px' }}>{med.name}</p>
                    <p style={{ color: 'rgba(26,40,32,0.38)', fontSize: '12px', marginTop: '1px' }}>{med.frequency || ''}{med.time ? ` · ${med.time}` : ''}</p>
                  </div>
                  <span style={{ background: 'rgba(92,139,116,0.1)', color: '#3D6B58', fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '99px', flexShrink: 0 }}>{med.dose}</span>
                </div>
              ))}
            </div>
          ) : <Empty text="No medications listed"/>}
        </Section>

        {/* Additional info */}
        {(profile?.surgery_date || profile?.doctor_name) && (
          <Section icon={Shield} color="#5C8B74" title="Care information">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {profile?.surgery_date && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'rgba(26,40,32,0.45)', fontSize: '13px' }}>Surgery date</span>
                  <span style={{ color: '#1A2820', fontSize: '13px', fontWeight: 600 }}>
                    {new Date(profile.surgery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              )}
              {profile?.doctor_name && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'rgba(26,40,32,0.45)', fontSize: '13px' }}>Primary doctor</span>
                  <span style={{ color: '#1A2820', fontSize: '13px', fontWeight: 600 }}>{profile.doctor_name}</span>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Emergency contacts */}
        <Section icon={Phone} color="#DC2626" title="Emergency contacts">
          {contacts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {contacts.map((c: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: i > 0 ? '1px solid rgba(26,40,32,0.05)' : 'none' }}>
                  <div>
                    <p style={{ color: '#1A2820', fontWeight: 600, fontSize: '14px' }}>{c.name}</p>
                    <p style={{ color: 'rgba(26,40,32,0.38)', fontSize: '12px', marginTop: '1px' }}>{c.relationship}</p>
                  </div>
                  <motion.a href={`tel:${c.phone}`} whileTap={{ scale: 0.96 }}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#5C8B74', fontSize: '13px', fontWeight: 600, textDecoration: 'none', background: 'rgba(92,139,116,0.08)', padding: '6px 12px', borderRadius: '99px' }}>
                    <Phone size={12} color="#5C8B74"/>
                    {c.phone}
                  </motion.a>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <Empty text="No emergency contacts added"/>
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => router.push('/emergency-contacts')}
                style={{ marginTop: '10px', background: 'rgba(26,40,32,0.05)', color: 'rgba(26,40,32,0.55)', fontSize: '12px', fontWeight: 600, padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(26,40,32,0.08)', cursor: 'pointer' }}>
                Add contacts →
              </motion.button>
            </div>
          )}
        </Section>

        {/* Share footer */}
        <motion.button whileTap={{ scale: 0.98 }} onClick={handleShare}
          style={{ background: '#1A2820', color: 'white', fontWeight: 700, fontSize: '14px', padding: '16px', borderRadius: '16px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 16px rgba(26,40,32,0.2)' }}>
          <Share2 size={16}/>
          Share with first responders
        </motion.button>
        <p style={{ color: 'rgba(26,40,32,0.28)', fontSize: '11px', textAlign: 'center', lineHeight: 1.6, marginTop: '-4px' }}>
          Share this page or copy the text summary so paramedics have your full medical history.
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
