'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { CheckCircle, AlertTriangle, Clock, Phone, ChevronLeft, History } from 'lucide-react'

const EMERGENCY_LABELS: Record<string, string> = {
  chest_pain: 'Chest pain',
  stroke: 'Stroke signs',
  pots: 'POTS episode',
  mecfs: 'ME/CFS crash',
  breathing: 'Breathing difficulty',
  unconscious: 'Unconscious / collapsed',
  other: 'Emergency',
}

interface Protocol {
  description: string
  steps: string[]
  warnings: string[]
  followUpNote: string
}

const PROTOCOLS: Record<string, Protocol> = {
  chest_pain: {
    description:
      'Chest pain can indicate cardiac stress, a muscle strain, or another condition. Even if the pain has passed, it is important to rest and monitor closely.',
    steps: [
      'Rest completely for 24–48 hours. No physical exertion.',
      'Avoid stress, heavy meals, and caffeine.',
      'Stay hydrated. Sip water steadily.',
      'Monitor your heart rate if you have a device.',
      'Follow up with a cardiologist within 48 hours.',
      'Do not drive until cleared by a doctor.',
    ],
    warnings: [
      'Recurring or worsening chest pain or pressure',
      'Pain radiating to your left arm, jaw, or back',
      'Shortness of breath or difficulty breathing',
      'Sudden dizziness, sweating, or nausea',
      'Heart palpitations or irregular heartbeat',
    ],
    followUpNote: 'Call your cardiologist or visit the ER within 48 hours even if you feel better.',
  },
  stroke: {
    description:
      'You experienced stroke-like symptoms. Even if they resolved, this may have been a TIA (transient ischemic attack). A warning sign of a future stroke.',
    steps: [
      'Rest and do not drive. Not today.',
      'Monitor for any return of symptoms.',
      'Take any prescribed antiplatelet or anticoagulant medications as directed.',
      'Stay calm and lie down if you feel dizzy.',
      'Go to the ER or call your neurologist immediately. Even if you feel fine.',
      'A TIA requires urgent evaluation within 24 hours.',
    ],
    warnings: [
      'Face drooping or numbness on one side',
      'Sudden arm weakness or inability to raise both arms',
      'Speech difficulty. Slurring or inability to speak',
      'Sudden severe headache unlike any before',
      'Vision loss or blurring in one or both eyes',
    ],
    followUpNote: 'This may be a TIA. Seek neurological evaluation urgently. Do not wait.',
  },
  pots: {
    description:
      'A POTS (Postural Orthostatic Tachycardia Syndrome) episode causes your heart rate to spike and blood pressure to drop when upright, leading to dizziness, fainting, and fatigue.',
    steps: [
      'Lie flat immediately. Elevate legs if possible.',
      'Drink 500–1000 mL of water or electrolytes slowly.',
      'Add salt. A salty snack or electrolyte drink helps.',
      'Avoid standing for at least 30–60 minutes.',
      'Rest for the remainder of the day.',
      'Wear compression garments if you have them.',
      'See your doctor within 48 hours if this was a severe episode.',
    ],
    warnings: [
      'Heart rate over 150 bpm that does not settle with lying down',
      'Fainting or loss of consciousness',
      'Chest pain or pressure',
      'Difficulty breathing at rest',
      'Confusion or persistent disorientation',
    ],
    followUpNote:
      'Track the episode in your health log and contact your cardiologist or specialist within 48 hours.',
  },
  mecfs: {
    description:
      'A ME/CFS post-exertional malaise (PEM) crash means your body has exceeded its energy envelope. Recovery requires complete rest. Pushing through will worsen symptoms significantly.',
    steps: [
      'Stop all activity immediately. Physical and cognitive.',
      'Rest in a dark, quiet room. Reduce light and sound stimulation.',
      'Avoid screens if possible. If needed, use the dimmest setting.',
      'Sip water or electrolytes. Small amounts frequently.',
      'Do not "push through". This is a physiological crash, not fatigue.',
      'Rest for at least 24–48 hours before any gentle activity.',
      'Reassess slowly. Introduce activity in tiny increments only.',
    ],
    warnings: [
      'Symptoms significantly worsening beyond your usual crash',
      'Fever above 38.5°C / 101.3°F',
      'Severe chest pain or palpitations',
      'Inability to eat, drink, or keep fluids down',
      'Confusion, slurred speech, or extreme weakness',
    ],
    followUpNote: 'Log this crash and review pacing strategy with your ME/CFS specialist.',
  },
  breathing: {
    description:
      'A breathing difficulty episode may be triggered by an allergic reaction, asthma, anxiety, or another condition. Rest and monitor closely until breathing fully normalises.',
    steps: [
      'Sit upright or in a position that feels most comfortable.',
      'Use your inhaler or prescribed rescue medication if available.',
      'Remove or move away from any triggers (smoke, strong smells, dust).',
      'Breathe slowly through pursed lips to control breathing.',
      'Monitor oxygen levels with a pulse oximeter if available.',
      'Rest for the remainder of the day. Avoid exertion.',
      'Follow up with your pulmonologist or GP within 24–48 hours.',
    ],
    warnings: [
      'Oxygen saturation below 94%',
      'Breathing difficulty returning or worsening',
      'Blue or grey tint to lips or fingertips',
      'Inability to speak full sentences',
      'Chest tightness or pain alongside breathlessness',
    ],
    followUpNote:
      'If you used a rescue inhaler more than twice today, contact your doctor or pulmonologist.',
  },
  unconscious: {
    description:
      'Loss of consciousness or collapse. Even briefly. Requires a medical evaluation. This could indicate a cardiac, neurological, or autonomic cause.',
    steps: [
      'Seek medical evaluation now even if you feel completely better.',
      'Do not drive. You should not be alone today.',
      'Rest lying down and avoid getting up suddenly.',
      'Have someone stay with you for the next 12–24 hours.',
      'Avoid alcohol, heavy meals, or hot baths.',
      'Go to the ER or urgent care within a few hours for an ECG and assessment.',
    ],
    warnings: [
      'Any recurrence of loss of consciousness',
      'Chest pain or palpitations',
      'Confusion, memory gaps, or disorientation',
      'Inability to move a limb or speak clearly',
      'Sudden severe headache',
    ],
    followUpNote:
      'Return to the ER within hours for an ECG and evaluation. This cannot wait for a routine appointment.',
  },
  other: {
    description:
      'You experienced an urgent health event. Until the cause is identified, it is important to rest, monitor your symptoms, and follow up with your care team.',
    steps: [
      'Rest and avoid physical exertion.',
      'Stay hydrated. Drink water steadily.',
      'Note your symptoms, writing down timing, severity, and any triggers.',
      'Do not drive if you feel unwell.',
      'Contact your doctor within 24 hours to report the event.',
      'Follow any specific guidance given by emergency services or hospital staff.',
    ],
    warnings: [
      'Any symptom that worsens significantly',
      'New chest pain, difficulty breathing, or confusion',
      'High fever (above 38.5°C / 101.3°F)',
      'Inability to keep fluids down',
      'Feeling that something is seriously wrong',
    ],
    followUpNote: 'Contact your primary care doctor or care team within 24 hours.',
  },
}

const spring = { type: 'spring', stiffness: 340, damping: 26 } as const

function RecoveryContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const type = searchParams.get('type') || 'other'

  const label = EMERGENCY_LABELS[type] || 'Emergency'
  const protocol = PROTOCOLS[type] || PROTOCOLS.other

  return (
    <div style={{ minHeight: '100dvh', background: '#B3DDAC' }}>
      {/* Green "You're safe" header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px',
          background: '#42623C',
          boxShadow: '0 2px 20px rgba(86,128,78,0.30)',
        }}
      >
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            padding: '4px',
            borderRadius: '50%',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#B3DDAC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Back to dashboard"
        >
          <ChevronLeft style={{ width: '20px', height: '20px' }} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle style={{ width: '20px', height: '20px', color: '#B3DDAC' }} />
          <span
            style={{ fontWeight: 700, fontSize: '18px', letterSpacing: '-0.4px', color: '#B3DDAC' }}
          >
            You&apos;re safe
          </span>
        </div>
      </div>

      <div
        style={{
          maxWidth: '512px',
          margin: '0 auto',
          padding: '24px 16px 48px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {/* Subtitle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
        >
          <p
            style={{
              fontSize: '13px',
              fontWeight: 600,
              letterSpacing: '0',
              color: '#42623C',
              marginBottom: '4px',
            }}
          >
            Recovery protocol
          </p>
          <h1
            style={{ fontSize: '24px', fontWeight: 900, color: '#141413', letterSpacing: '-0.5px' }}
          >
            {label}
          </h1>
        </motion.div>

        {/* What happened */}
        <Card delay={0.05}>
          <CardLabel>What happened</CardLabel>
          <p style={{ fontSize: '14px', lineHeight: 1.65, color: '#5C5A52' }}>
            {protocol.description}
          </p>
        </Card>

        {/* Next 24-48 hours */}
        <Card delay={0.1}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Clock style={{ width: '16px', height: '16px', flexShrink: 0, color: '#42623C' }} />
            <CardLabel noMargin>Next 24–48 hours</CardLabel>
          </div>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {protocol.steps.map((step, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span
                  style={{
                    flexShrink: 0,
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 700,
                    marginTop: '2px',
                    background: 'rgba(86,128,78,0.15)',
                    color: '#42623C',
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ fontSize: '14px', lineHeight: 1.5, color: '#141413' }}>{step}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Watch out for — amber-tinted warning card */}
        <Card delay={0.15} highlight>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <AlertTriangle
              style={{ width: '16px', height: '16px', flexShrink: 0, color: '#A33417' }}
            />
            <CardLabel noMargin danger>
              Watch out for
            </CardLabel>
          </div>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {protocol.warnings.map((w, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span
                  style={{
                    flexShrink: 0,
                    marginTop: '6px',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#A33417',
                  }}
                />
                <span
                  style={{ fontSize: '14px', lineHeight: 1.5, color: '#A33417', opacity: 0.88 }}
                >
                  {w}
                </span>
              </li>
            ))}
          </ul>
          <div
            style={{
              marginTop: '16px',
              paddingTop: '12px',
              borderTop: '1px solid rgba(163,52,23,0.20)',
              fontSize: '14px',
              fontWeight: 600,
              color: '#A33417',
            }}
          >
            Call emergency services immediately if any of these occur.
          </div>
        </Card>

        {/* Follow-up note */}
        <Card delay={0.2}>
          <CardLabel>Schedule a follow-up</CardLabel>
          <p style={{ fontSize: '14px', lineHeight: 1.65, color: '#5C5A52', marginBottom: '16px' }}>
            {protocol.followUpNote}
          </p>
          <a
            href="tel:"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '12px',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none',
              background: '#42623C',
              color: '#B3DDAC',
            }}
          >
            <Phone style={{ width: '16px', height: '16px' }} />
            Call your doctor
          </a>
        </Card>

        {/* Footer actions */}
        <div style={{ display: 'flex', gap: '12px', paddingTop: '4px' }}>
          <button
            onClick={() => router.push('/emergency/history')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px',
              borderRadius: '4px',
              background: '#F2F0E8',
              border: '1px solid #D8D4C8',
              color: '#5C5A52',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <History style={{ width: '16px', height: '16px' }} />
            View history
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '4px',
              background: '#42623C',
              border: 'none',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Back to dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

function Card({
  children,
  delay = 0,
  highlight = false,
}: {
  children: React.ReactNode
  delay?: number
  highlight?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 340, damping: 26, delay }}
      style={{
        background: highlight ? 'rgba(163,52,23,0.08)' : '#FFFFFF',
        border: highlight ? '1px solid rgba(163,52,23,0.22)' : '1px solid #98C890',
        borderRadius: '4px',
        padding: '16px',
      }}
    >
      {children}
    </motion.div>
  )
}

function CardLabel({
  children,
  noMargin = false,
  danger = false,
}: {
  children: React.ReactNode
  noMargin?: boolean
  danger?: boolean
}) {
  return (
    <p
      style={{
        fontSize: '13px',
        fontWeight: 600,
        letterSpacing: '0',
        marginBottom: noMargin ? '0' : '8px',
        color: danger ? '#A33417' : '#5C5A52',
      }}
    >
      {children}
    </p>
  )
}

export default function RecoveryPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100dvh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#B3DDAC',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '2px solid #42623C',
              borderTopColor: 'transparent',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      }
    >
      <RecoveryContent />
    </Suspense>
  )
}
