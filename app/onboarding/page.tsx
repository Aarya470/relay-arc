'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Activity, ArrowLeft, ArrowRight, Brain, Check, Heart, HeartPulse, Loader2, Plus, Zap } from 'lucide-react'
import DateField from '@/components/DateField'
import Mark from '@/components/Mark'

const T1 = '#141413'
const T2 = '#5C5A52'
const T3 = '#6F6D65'
const BORDER = '#98C890'
const ACCENT = '#42623C'
const RED = '#A33417'
const mono = 'var(--font-mono, monospace)'

const CONDITIONS = [
  { id: 'Post-cardiac surgery', Icon: Heart,      desc: 'Bypass, valve, ablation, device' },
  { id: 'POTS',                 Icon: Zap,        desc: 'Postural orthostatic tachycardia' },
  { id: 'Dysautonomia',         Icon: Brain,      desc: 'Autonomic nervous system disorder' },
  { id: 'ME/CFS',               Icon: Activity,   desc: 'Myalgic encephalomyelitis' },
  { id: 'General cardiac',      Icon: HeartPulse, desc: 'Arrhythmia, CHF, other' },
  { id: 'Other',                Icon: Plus,       desc: 'Something else' },
]

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const STEP_META = [
  { kicker: '01 / 03', title: 'About you',       sub: 'The basics, once.' },
  { kicker: '02 / 03', title: 'Your condition',  sub: 'This decides which hospital Relay routes you to.' },
  { kicker: '03 / 03', title: 'Contacts & meds', sub: 'Sent to the ER ahead of you in an emergency.' },
]

export default function Onboarding() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    date_of_birth: '',
    phone: '',
    blood_type: '',
    diagnosis: [] as string[],
    surgery_date: '',
    allergies: '',
    cardiologist: '',
    emergency_contacts: [{ name: '', relationship: '', phone: '' }],
    medications: [{ name: '', dose: '', frequency: '', times: ['Morning'] }]
  })
  const router = useRouter()

  const update = (field: string, value: any) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const toggleCondition = (id: string) => {
    const current = form.diagnosis
    update('diagnosis', current.includes(id)
      ? current.filter(c => c !== id)
      : [...current, id]
    )
  }

  const updateContact = (i: number, field: string, val: string) => {
    const updated = [...form.emergency_contacts]
    updated[i] = { ...updated[i], [field]: val }
    update('emergency_contacts', updated)
  }

  const updateMed = (i: number, field: string, val: string) => {
    const updated = [...form.medications]
    updated[i] = { ...updated[i], [field]: val }
    update('medications', updated)
  }

  const handleSubmit = async () => {
    if (form.diagnosis.length === 0) {
      toast.error('Please select at least one condition')
      return
    }
    setLoading(true)
    try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const filteredMeds = form.medications.filter(m => m.name.trim())
    const filteredContacts = form.emergency_contacts.filter(c => c.name.trim())

    // An untouched text input holds '', and Postgres rejects '' for a date
    // column outright: `invalid input syntax for type date: ""`. Because the
    // whole form is spread into one insert, one blank optional date failed the
    // entire profile — so someone who skipped "surgery date, if applicable",
    // exactly as the label invites, could not finish onboarding at all.
    //
    // Blanking to null is applied to every field rather than just the two dates.
    // '' and null mean the same thing here — the person did not answer — and
    // storing '' makes every later read do `value || 'None'` guesswork against
    // two different empties.
    const blankToNull = <T extends Record<string, unknown>>(o: T) =>
      Object.fromEntries(
        Object.entries(o).map(([k, v]) => [k, typeof v === 'string' && v.trim() === '' ? null : v])
      ) as { [K in keyof T]: T[K] | null }

    const { error } = await supabase.from('profiles').insert({
      id: user.id,
      ...blankToNull(form),
      medications: filteredMeds,
      emergency_contacts: filteredContacts,
      // Joined after the blanking pass, so an empty selection becomes null
      // rather than the empty string a join would produce.
      diagnosis: form.diagnosis.length ? form.diagnosis.join(', ') : null,
    })

    if (error) toast.error(error.message)
    else {
      toast.success('Profile created')
      router.push('/dashboard')
    }
    } catch (e) {
      // Same reason as the login page: without this, a throw leaves the button
      // spinning with nothing said.
      toast.error(e instanceof Error ? e.message : 'Could not save your profile. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#FFFFFF',
    border: `1.5px solid ${BORDER}`,
    borderRadius: '10px',
    padding: '13px 16px',
    color: T1,
    fontSize: '15px',
    outline: 'none',
    fontFamily: 'inherit',
  }

  const label = (text: string) => (
    <p style={{ color: T3, fontSize: '10.5px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', fontFamily: mono, marginBottom: '8px' }}>{text}</p>
  )

  const primaryBtn: React.CSSProperties = {
    flex: 1, background: T1, color: 'white', fontWeight: 600, padding: '15px',
    borderRadius: '11px', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    fontSize: '15px', fontFamily: 'inherit', minHeight: '50px',
  }
  const ghostBtn: React.CSSProperties = {
    flex: 1, background: 'none', border: `1.5px solid ${BORDER}`, color: T2,
    fontWeight: 500, padding: '15px', borderRadius: '11px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    fontSize: '15px', fontFamily: 'inherit', minHeight: '50px',
  }

  const meta = STEP_META[step - 1]

  return (
    <div style={{ minHeight: '100dvh', background: '#B3DDAC', padding: '0 24px' }}>
      <div style={{ maxWidth: '420px', margin: '0 auto', paddingTop: '56px', paddingBottom: '48px' }}>

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '40px' }}>
          <Mark size={26} />
          <span style={{ color: T1, fontWeight: 800, fontSize: '15.5px', letterSpacing: '-0.4px' }}>Relay Arc</span>
        </div>

        {/* Progress + header */}
        <div style={{ borderTop: `2px solid ${T1}`, paddingTop: '12px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ color: T1, fontFamily: mono, fontSize: '11px', fontWeight: 700, letterSpacing: '1.6px', textTransform: 'uppercase' }}>{meta.kicker}</span>
          <span style={{ color: T3, fontFamily: mono, fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' }}>Profile setup</span>
        </div>
        <h1 style={{ color: T1, fontSize: '30px', fontWeight: 800, letterSpacing: '-1.1px', lineHeight: 1.05, marginBottom: '6px' }}>
          {meta.title}<span style={{ color: RED }}>.</span>
        </h1>
        <p style={{ color: T2, fontSize: '14px', lineHeight: 1.55, marginBottom: '30px' }}>{meta.sub}</p>

        <AnimatePresence mode="wait">

          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }} transition={{ duration: 0.18 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              <div>{label('Full name')}<input style={inputStyle} placeholder="Asha Kulkarni" value={form.full_name} onChange={e => update('full_name', e.target.value)}/></div>
              <DateField
                id="dob"
                label="Date of birth"
                hint="Type the day, pick the month, type the year."
                value={form.date_of_birth}
                onChange={v => update('date_of_birth', v)}
              />
              <div>{label('Phone')}<input type="tel" style={inputStyle} placeholder="+1 555 000 0000" value={form.phone} onChange={e => update('phone', e.target.value)}/></div>

              <div>
                {label('Blood type. Critical for responders')}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {BLOOD_TYPES.map(bt => {
                    const active = form.blood_type === bt
                    return (
                      <button key={bt} onClick={() => update('blood_type', active ? '' : bt)}
                        style={{
                          padding: '12px 0', borderRadius: '10px', cursor: 'pointer',
                          background: active ? T1 : 'none',
                          border: `1.5px solid ${active ? T1 : BORDER}`,
                          color: active ? 'white' : T1,
                          fontWeight: 700, fontSize: '14px', fontFamily: mono, letterSpacing: '0.3px',
                          transition: 'all 0.12s ease',
                        }}>
                        {bt}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>{label('Cardiologist or specialist')}<input style={inputStyle} placeholder="Dr. Mehta" value={form.cardiologist} onChange={e => update('cardiologist', e.target.value)}/></div>

              <motion.button
                whileTap={{ scale: 0.985 }}
                onClick={() => {
                  if (!form.full_name) { toast.error('Please enter your name'); return }
                  setStep(2)
                }}
                style={{ ...primaryBtn, marginTop: '8px' }}
              >
                Continue <ArrowRight size={15}/>
              </motion.button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }} transition={{ duration: 0.18 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              <div style={{ borderTop: `1px solid ${BORDER}` }}>
                {CONDITIONS.map(c => {
                  const active = form.diagnosis.includes(c.id)
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggleCondition(c.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '14px',
                        width: '100%', textAlign: 'left', cursor: 'pointer',
                        padding: '14px 4px', minHeight: '58px',
                        background: active ? 'rgba(86,128,78,0.05)' : 'none',
                        border: 'none', borderBottom: `1px solid ${BORDER}`,
                        fontFamily: 'inherit',
                        transition: 'background 0.12s ease',
                      }}
                    >
                      <c.Icon size={18} color={active ? ACCENT : T3} strokeWidth={2} style={{ flexShrink: 0 }}/>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 700, fontSize: '15px', letterSpacing: '-0.2px', color: active ? ACCENT : T1 }}>{c.id}</p>
                        <p style={{ color: T3, fontSize: '12.5px', marginTop: '2px' }}>{c.desc}</p>
                      </div>
                      <div style={{
                        width: '22px', height: '22px', borderRadius: '7px', flexShrink: 0,
                        background: active ? ACCENT : 'none',
                        border: `1.5px solid ${active ? ACCENT : '#C9CED6'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.12s ease',
                      }}>
                        {active && <Check size={13} color="white" strokeWidth={3}/>}
                      </div>
                    </button>
                  )
                })}
              </div>

              <DateField
                id="surgery"
                label="Surgery date. If applicable"
                hint="Leave blank if this does not apply to you."
                value={form.surgery_date}
                onChange={v => update('surgery_date', v)}
              />
              <div>{label('Known allergies')}<input style={inputStyle} placeholder="Penicillin, sulfa drugs…" value={form.allergies} onChange={e => update('allergies', e.target.value)}/></div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <motion.button whileTap={{ scale: 0.985 }} onClick={() => setStep(1)} style={ghostBtn}>
                  <ArrowLeft size={15}/> Back
                </motion.button>
                <motion.button whileTap={{ scale: 0.985 }} onClick={() => {
                  if (form.diagnosis.length === 0) { toast.error('Please select at least one condition'); return }
                  setStep(3)
                }} style={primaryBtn}>
                  Continue <ArrowRight size={15}/>
                </motion.button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }} transition={{ duration: 0.18 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}
            >
              <div>
                {label('Emergency contacts')}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {form.emergency_contacts.map((c, i) => (
                    <div key={i} style={{ borderLeft: `2px solid ${BORDER}`, paddingLeft: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <input style={inputStyle} placeholder="Name" value={c.name} onChange={e => updateContact(i, 'name', e.target.value)}/>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <input style={inputStyle} placeholder="Relationship" value={c.relationship} onChange={e => updateContact(i, 'relationship', e.target.value)}/>
                        <input style={inputStyle} placeholder="Phone" value={c.phone} onChange={e => updateContact(i, 'phone', e.target.value)}/>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => update('emergency_contacts', [...form.emergency_contacts, { name: '', relationship: '', phone: '' }])}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', color: ACCENT, fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit', padding: 0 }}
                  >
                    <Plus size={14}/> Add another contact
                  </button>
                </div>
              </div>

              <div>
                {label('Current medications')}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {form.medications.map((m, i) => (
                    <div key={i} style={{ borderLeft: `2px solid ${BORDER}`, paddingLeft: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <input style={inputStyle} placeholder="Medication name" value={m.name} onChange={e => updateMed(i, 'name', e.target.value)}/>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <input style={inputStyle} placeholder="Dose. 50mg" value={m.dose} onChange={e => updateMed(i, 'dose', e.target.value)}/>
                        <input style={inputStyle} placeholder="Frequency" value={m.frequency} onChange={e => updateMed(i, 'frequency', e.target.value)}/>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => update('medications', [...form.medications, { name: '', dose: '', frequency: '', times: ['Morning'] }])}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', color: ACCENT, fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit', padding: 0 }}
                  >
                    <Plus size={14}/> Add another medication
                  </button>
                </div>
              </div>

              <p style={{ color: T3, fontSize: '12.5px', lineHeight: 1.6, borderTop: `1px solid ${BORDER}`, paddingTop: '14px' }}>
                Everything here goes into your medical profile, shown to paramedics and sent ahead to the ER when you hold SOS. You can edit it any time in Settings.
              </p>

              <div style={{ display: 'flex', gap: '10px' }}>
                <motion.button whileTap={{ scale: 0.985 }} onClick={() => setStep(2)} style={ghostBtn}>
                  <ArrowLeft size={15}/> Back
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.985 }}
                  onClick={handleSubmit}
                  disabled={loading}
                  style={{ ...primaryBtn, opacity: loading ? 0.7 : 1 }}
                >
                  {loading ? <Loader2 size={16} className="animate-spin"/> : <>Complete profile <ArrowRight size={15}/></>}
                </motion.button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
