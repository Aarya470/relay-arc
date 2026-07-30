'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { AlertCircle, Copy, ChevronLeft, Loader2, CheckCheck } from 'lucide-react'
import { toast } from 'sonner'

const EMERGENCY_LABELS: Record<string, string> = {
  chest_pain: 'Chest pain',
  stroke: 'Stroke signs',
  pots: 'POTS episode',
  mecfs: 'ME/CFS crash',
  breathing: 'Breathing difficulty',
  unconscious: 'Unconscious / collapsed',
  other: 'Emergency',
}

interface Profile {
  full_name?: string
  blood_type?: string
  allergies?: string
  medications?: { name: string; dose: string; frequency: string }[]
  diagnosis?: string
  emergency_contacts?: { name: string; phone: string; relationship?: string }[]
  surgery_date?: string
  date_of_birth?: string
}

function BriefContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const type = searchParams.get('type') || 'other'
  const hospitalName = searchParams.get('name') || ''

  const [profile, setProfile] = useState<Profile | null>(null)
  const [clinicalNote, setClinicalNote] = useState('')
  const [noteLoading, setNoteLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  const emergencyLabel = EMERGENCY_LABELS[type] || 'Emergency'

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }
      setAuthChecked(true)

      const { data } = await supabase
        .from('profiles')
        .select('full_name, blood_type, allergies, medications, diagnosis, emergency_contacts, surgery_date, date_of_birth')
        .eq('id', user.id)
        .single()

      if (data) {
        setProfile(data)
        generateClinicalNote(data)
      } else {
        setNoteLoading(false)
      }
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Generated server-side. This used to construct a Groq client in the browser
  // with NEXT_PUBLIC_GROQ_API_KEY, which put the API key in the client bundle.
  // The server refetches the profile under this user's own JWT, so nothing about
  // who can read what has changed.
  const generateClinicalNote = async (_p: Profile) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) { setClinicalNote(''); return }
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ task: 'clinical_handoff', emergencyType: type }),
      })
      if (!res.ok) { setClinicalNote(''); return }
      const { text } = await res.json()
      setClinicalNote(text || '')
    } catch {
      setClinicalNote('')
    } finally {
      setNoteLoading(false)
    }
  }

  const buildPlainText = () => {
    const meds = (profile?.medications || [])
      .map(m => `  • ${m.name} ${m.dose} — ${m.frequency}`)
      .join('\n') || '  • None on file'
    const contact = profile?.emergency_contacts?.[0]
    const contactLine = contact
      ? `${contact.name}${contact.relationship ? ` (${contact.relationship})` : ''}: ${contact.phone}`
      : 'None on file'

    return [
      '═══════════════════════════════',
      'ER MEDICAL BRIEF — SHOW TO STAFF',
      '═══════════════════════════════',
      '',
      `PATIENT: ${profile?.full_name || 'Unknown'}`,
      profile?.date_of_birth ? `DOB: ${profile.date_of_birth}` : '',
      profile?.diagnosis ? `CONDITIONS: ${profile.diagnosis}` : '',
      '',
      `BLOOD TYPE: ${profile?.blood_type || 'Unknown'}`,
      '',
      `ALLERGIES: ${profile?.allergies || 'None known'}`,
      '',
      'CURRENT MEDICATIONS:',
      meds,
      '',
      `EMERGENCY TYPE: ${emergencyLabel}`,
      hospitalName ? `DESTINATION: ${hospitalName}` : '',
      '',
      `EMERGENCY CONTACT: ${contactLine}`,
      '',
      clinicalNote ? `AI CLINICAL NOTE:\n${clinicalNote}` : '',
      '',
      '═══════════════════════════════',
    ]
      .filter(l => l !== null && l !== undefined)
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildPlainText())
      setCopied(true)
      toast.success('Brief copied to clipboard')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error('Copy failed — please screenshot this screen')
    }
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAF9F5' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#5F7049' }} />
      </div>
    )
  }

  const meds = profile?.medications || []
  const contacts = profile?.emergency_contacts || []
  const primaryContact = contacts[0]

  return (
    <div className="min-h-screen" style={{ background: '#FAF9F5' }}>
      {/* Red alert header */}
      <div
        className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3"
        style={{ background: '#A33417' }}
      >
        <button
          onClick={() => router.back()}
          className="p-1 rounded-full"
          style={{ color: 'rgba(255,255,255,0.80)' }}
          aria-label="Go back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="flex items-center gap-2 font-bold text-white text-lg tracking-tight">
          <motion.span
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
            className="w-2.5 h-2.5 rounded-full bg-white inline-block"
            style={{ boxShadow: '0 0 0 3px rgba(255,255,255,0.25)' }}
          />
          ER Medical Brief
        </span>
        {hospitalName && (
          <span className="ml-auto text-sm truncate max-w-[120px]" style={{ color: 'rgba(255,255,255,0.70)' }}>{hospitalName}</span>
        )}
      </div>

      {/* SHOW TO HOSPITAL STAFF banner */}
      <div
        className="w-full text-center py-3 px-4"
        style={{ background: 'rgba(163,52,23,0.10)', borderBottom: '1px solid rgba(163,52,23,0.18)' }}
      >
        <p
          className="font-black tracking-widest uppercase"
          style={{ fontSize: '0.85rem', letterSpacing: '0.20em', color: '#A33417' }}
        >
          SHOW TO HOSPITAL STAFF
        </p>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-10 pt-5 space-y-4">
        {/* Patient */}
        <Section>
          <SectionLabel>PATIENT</SectionLabel>
          <p className="text-xl font-bold" style={{ color: '#141413' }}>
            {profile?.full_name || <span style={{ color: '#8A8780' }}>Unknown</span>}
          </p>
          {profile?.date_of_birth && (
            <p className="text-sm mt-0.5" style={{ color: '#5C5A52' }}>
              DOB: {profile.date_of_birth}
            </p>
          )}
          {profile?.diagnosis && (
            <p className="text-sm mt-1" style={{ color: '#5C5A52' }}>
              {profile.diagnosis}
            </p>
          )}
        </Section>

        {/* Blood type */}
        <Section>
          <SectionLabel>BLOOD TYPE</SectionLabel>
          <p
            className="font-black tracking-tight"
            style={{ color: '#A33417', lineHeight: 1.1, fontSize: '3rem', fontFamily: 'var(--font-mono, monospace)' }}
          >
            {profile?.blood_type || '?'}
          </p>
        </Section>

        {/* Allergies */}
        <Section highlight={!!profile?.allergies}>
          <SectionLabel>ALLERGIES</SectionLabel>
          {profile?.allergies ? (
            <p className="font-semibold text-base" style={{ color: '#A33417' }}>
              {profile.allergies}
            </p>
          ) : (
            <p className="text-base" style={{ color: '#8A8780' }}>
              None known
            </p>
          )}
        </Section>

        {/* Medications */}
        <Section>
          <SectionLabel>CURRENT MEDICATIONS</SectionLabel>
          {meds.length > 0 ? (
            <ul className="space-y-1.5 mt-1">
              {meds.map((m, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span
                    className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: '#5F7049' }}
                  />
                  <span className="text-sm" style={{ color: '#141413' }}>
                    <span className="font-semibold">{m.name}</span>
                    {m.dose && ` — ${m.dose}`}
                    {m.frequency && (
                      <span style={{ color: '#5C5A52' }}> · {m.frequency}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm" style={{ color: '#8A8780' }}>
              None on file
            </p>
          )}
        </Section>

        {/* Emergency type */}
        <Section>
          <SectionLabel>EMERGENCY</SectionLabel>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#A33417' }} />
            <p className="text-lg font-bold" style={{ color: '#A33417' }}>
              {emergencyLabel}
            </p>
          </div>
        </Section>

        {/* Emergency contacts */}
        <Section>
          <SectionLabel>EMERGENCY CONTACT</SectionLabel>
          {primaryContact ? (
            <div>
              <p className="font-semibold" style={{ color: '#141413' }}>
                {primaryContact.name}
                {primaryContact.relationship && (
                  <span className="font-normal text-sm" style={{ color: '#5C5A52' }}>
                    {' '}({primaryContact.relationship})
                  </span>
                )}
              </p>
              <p className="text-lg font-bold mt-0.5" style={{ color: '#5F7049' }}>
                {primaryContact.phone}
              </p>
            </div>
          ) : (
            <p className="text-sm" style={{ color: '#8A8780' }}>
              None on file
            </p>
          )}
        </Section>

        {/* AI Clinical Note */}
        <Section>
          <SectionLabel>AI CLINICAL NOTE</SectionLabel>
          {noteLoading ? (
            <div className="flex items-center gap-2 mt-1" style={{ color: '#5F7049' }}>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm" style={{ color: '#5C5A52' }}>Generating note…</span>
            </div>
          ) : clinicalNote ? (
            <p className="text-sm leading-relaxed" style={{ color: '#141413' }}>
              {clinicalNote}
            </p>
          ) : (
            <p className="text-sm" style={{ color: '#8A8780' }}>
              Note unavailable — use profile data above.
            </p>
          )}
          <p className="text-xs mt-2" style={{ color: '#8A8780' }}>
            AI-generated · verify with patient or records
          </p>
        </Section>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => router.back()}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-70"
            style={{
              background: '#F2F0E8',
              border: '1px solid #D8D4C8',
              color: '#5C5A52',
              borderRadius: '14px',
            }}
          >
            Back
          </button>
          <button
            onClick={handleCopy}
            className="flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-85"
            style={{
              background: copied ? '#5F7049' : '#5F7049',
              color: copied ? '#FAF9F5' : '#fff',
              borderRadius: '14px',
              border: 'none',
              boxShadow: copied ? '0 4px 20px rgba(120,140,93,0.28)' : '0 4px 20px rgba(120,140,93,0.28)',
            }}
          >
            {copied ? (
              <>
                <CheckCheck className="w-4 h-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy brief
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({
  children,
  highlight = false,
}: {
  children: React.ReactNode
  highlight?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 340, damping: 26 }}
      className="rounded-2xl p-4"
      style={{
        background: highlight ? 'rgba(163,52,23,0.08)' : '#FFFFFF',
        border: highlight
          ? '1px solid rgba(163,52,23,0.22)'
          : '1px solid #E5E2D9',
        borderRadius: '16px',
      }}
    >
      {children}
    </motion.div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-xs font-bold uppercase tracking-widest mb-1.5"
      style={{ color: '#8A8780', letterSpacing: '0.13em' }}
    >
      {children}
    </p>
  )
}

export default function BriefPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAF9F5' }}>
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#5F7049' }} />
        </div>
      }
    >
      <BriefContent />
    </Suspense>
  )
}
