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
      'Stay hydrated — sip water steadily.',
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
      'You experienced stroke-like symptoms. Even if they resolved, this may have been a TIA (transient ischemic attack) — a warning sign of a future stroke.',
    steps: [
      'Rest and do not drive — not today.',
      'Monitor for any return of symptoms.',
      'Take any prescribed antiplatelet or anticoagulant medications as directed.',
      'Stay calm and lie down if you feel dizzy.',
      'Go to the ER or call your neurologist immediately — even if you feel fine.',
      'A TIA requires urgent evaluation within 24 hours.',
    ],
    warnings: [
      'Face drooping or numbness on one side',
      'Sudden arm weakness or inability to raise both arms',
      'Speech difficulty — slurring or inability to speak',
      'Sudden severe headache unlike any before',
      'Vision loss or blurring in one or both eyes',
    ],
    followUpNote: 'This may be a TIA. Seek neurological evaluation urgently — do not wait.',
  },
  pots: {
    description:
      'A POTS (Postural Orthostatic Tachycardia Syndrome) episode causes your heart rate to spike and blood pressure to drop when upright, leading to dizziness, fainting, and fatigue.',
    steps: [
      'Lie flat immediately — elevate legs if possible.',
      'Drink 500–1000 mL of water or electrolytes slowly.',
      'Add salt — a salty snack or electrolyte drink helps.',
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
    followUpNote: 'Track the episode in your health log and contact your cardiologist or specialist within 48 hours.',
  },
  mecfs: {
    description:
      'A ME/CFS post-exertional malaise (PEM) crash means your body has exceeded its energy envelope. Recovery requires complete rest — pushing through will worsen symptoms significantly.',
    steps: [
      'Stop all activity immediately — physical and cognitive.',
      'Rest in a dark, quiet room. Reduce light and sound stimulation.',
      'Avoid screens if possible. If needed, use the dimmest setting.',
      'Sip water or electrolytes — small amounts frequently.',
      'Do not "push through" — this is a physiological crash, not fatigue.',
      'Rest for at least 24–48 hours before any gentle activity.',
      'Reassess slowly — introduce activity in tiny increments only.',
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
      'Rest for the remainder of the day — avoid exertion.',
      'Follow up with your pulmonologist or GP within 24–48 hours.',
    ],
    warnings: [
      'Oxygen saturation below 94%',
      'Breathing difficulty returning or worsening',
      'Blue or grey tint to lips or fingertips',
      'Inability to speak full sentences',
      'Chest tightness or pain alongside breathlessness',
    ],
    followUpNote: 'If you used a rescue inhaler more than twice today, contact your doctor or pulmonologist.',
  },
  unconscious: {
    description:
      'Loss of consciousness or collapse — even briefly — requires a medical evaluation. This could indicate a cardiac, neurological, or autonomic cause.',
    steps: [
      'Seek medical evaluation now even if you feel completely better.',
      'Do not drive — you should not be alone today.',
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
    followUpNote: 'Return to the ER within hours for an ECG and evaluation — this cannot wait for a routine appointment.',
  },
  other: {
    description:
      'You experienced an urgent health event. Until the cause is identified, it is important to rest, monitor your symptoms, and follow up with your care team.',
    steps: [
      'Rest and avoid physical exertion.',
      'Stay hydrated — drink water steadily.',
      'Note your symptoms — write down timing, severity, and any triggers.',
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
    <div className="min-h-screen" style={{ background: '#F0EDE5' }}>
      {/* Green header */}
      <div
        className="sticky top-0 z-20 flex items-center gap-3 px-4 py-4"
        style={{ background: '#2C7A50' }}
      >
        <button
          onClick={() => router.push('/dashboard')}
          className="p-1 rounded-full"
          style={{ color: '#fff' }}
          aria-label="Back to dashboard"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-white" />
          <span className="font-bold text-white text-lg tracking-tight">You&apos;re safe</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-12 pt-6 space-y-5">
        {/* Subtitle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
        >
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#2C7A50', letterSpacing: '0.12em' }}>
            Recovery protocol
          </p>
          <h1 className="text-2xl font-black" style={{ color: '#0F1A0E' }}>
            {label}
          </h1>
        </motion.div>

        {/* What happened */}
        <Card delay={0.05}>
          <CardLabel>What happened</CardLabel>
          <p className="text-sm leading-relaxed" style={{ color: '#0F1A0E', opacity: 0.8 }}>
            {protocol.description}
          </p>
        </Card>

        {/* Next 24-48 hours */}
        <Card delay={0.1}>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 flex-shrink-0" style={{ color: '#2C7A50' }} />
            <CardLabel noMargin>Next 24–48 hours</CardLabel>
          </div>
          <ul className="space-y-2">
            {protocol.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                  style={{ background: 'rgba(44,122,80,0.15)', color: '#2C7A50' }}
                >
                  {i + 1}
                </span>
                <span className="text-sm leading-snug" style={{ color: '#0F1A0E' }}>
                  {step}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Watch out for */}
        <Card delay={0.15} highlight>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: '#B91C1C' }} />
            <CardLabel noMargin danger>Watch out for</CardLabel>
          </div>
          <ul className="space-y-2">
            {protocol.warnings.map((w, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span
                  className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full"
                  style={{ background: '#B91C1C' }}
                />
                <span className="text-sm leading-snug" style={{ color: '#B91C1C', opacity: 0.88 }}>
                  {w}
                </span>
              </li>
            ))}
          </ul>
          <div
            className="mt-4 pt-3 border-t text-sm font-semibold"
            style={{ borderColor: 'rgba(185,28,28,0.18)', color: '#B91C1C' }}
          >
            Call 911 immediately if any of these occur.
          </div>
        </Card>

        {/* Follow-up note */}
        <Card delay={0.2}>
          <CardLabel>Schedule a follow-up</CardLabel>
          <p className="text-sm leading-relaxed mb-4" style={{ color: '#0F1A0E', opacity: 0.8 }}>
            {protocol.followUpNote}
          </p>
          <a
            href="tel:"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-85"
            style={{ background: '#2C7A50', color: '#fff' }}
          >
            <Phone className="w-4 h-4" />
            Call your doctor
          </a>
        </Card>

        {/* Footer actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={() => router.push('/emergency/history')}
            className="flex items-center justify-center gap-2 flex-1 py-3 rounded-xl border text-sm font-semibold transition-opacity hover:opacity-70"
            style={{
              borderColor: 'rgba(16,22,14,0.15)',
              color: '#0F1A0E',
              background: 'transparent',
            }}
          >
            <History className="w-4 h-4" />
            View history
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="flex-1 py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-85"
            style={{ background: '#0F1A0E', color: '#fff' }}
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
      className="rounded-2xl p-4"
      style={{
        background: highlight ? 'rgba(185,28,28,0.05)' : 'rgba(255,255,255,0.72)',
        border: highlight
          ? '1.5px solid rgba(185,28,28,0.18)'
          : '1px solid rgba(16,22,14,0.07)',
        backdropFilter: 'blur(8px)',
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
      className={`text-xs font-bold uppercase tracking-widest${noMargin ? '' : ' mb-2'}`}
      style={{
        color: danger ? '#B91C1C' : '#0F1A0E',
        opacity: danger ? 0.7 : 0.38,
        letterSpacing: '0.13em',
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
          className="min-h-screen flex items-center justify-center"
          style={{ background: '#F0EDE5' }}
        >
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: '#2C7A50', borderTopColor: 'transparent' }}
          />
        </div>
      }
    >
      <RecoveryContent />
    </Suspense>
  )
}
