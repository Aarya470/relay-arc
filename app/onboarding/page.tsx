'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, Plus, X, Loader2, Heart, Zap, Brain, Activity, HeartPulse } from 'lucide-react'

const CONDITIONS = [
  { id: 'Post-cardiac surgery', Icon: Heart,      desc: 'Bypass, valve, ablation, device' },
  { id: 'POTS',                 Icon: Zap,        desc: 'Postural orthostatic tachycardia' },
  { id: 'Dysautonomia',         Icon: Brain,      desc: 'Autonomic nervous system disorder' },
  { id: 'ME/CFS',               Icon: Activity,   desc: 'Myalgic encephalomyelitis' },
  { id: 'General cardiac',      Icon: HeartPulse, desc: 'Arrhythmia, CHF, other' },
  { id: 'Other',                Icon: Plus,       desc: 'Other condition' },
]

const spring = { type: 'spring', stiffness: 380, damping: 24 } as const

export default function Onboarding() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    date_of_birth: '',
    phone: '',
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const filteredMeds = form.medications.filter(m => m.name.trim())

    const { error } = await supabase.from('profiles').insert({
      id: user.id,
      ...form,
      medications: filteredMeds,
      diagnosis: form.diagnosis.join(', ')
    })

    if (error) toast.error(error.message)
    else {
      toast.success('Profile created!')
      router.push('/dashboard')
    }
    setLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#1A1A2E',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: '12px',
    padding: '14px 16px',
    color: '#EEEEF8',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'inherit',
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#070710', padding: '48px 20px' }}>
      <div style={{ maxWidth: '430px', margin: '0 auto' }}>

        {/* Logo row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '32px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '9px', background: 'linear-gradient(135deg, #FF3737, #CC1A1A)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L9.5 5.5H12.5L10 9L11 13L7 10.5L3 13L4 9L1.5 5.5H4.5L7 1Z" fill="white" strokeWidth="0"/>
            </svg>
          </div>
          <span style={{ color: '#EEEEF8', fontWeight: 800, fontSize: '16px', letterSpacing: '-0.4px' }}>Relay Arc</span>
        </div>

        {/* Progress bars */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '32px' }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ height: '3px', flex: 1, borderRadius: '99px', overflow: 'hidden', background: 'rgba(255,255,255,0.08)' }}>
              <motion.div
                style={{ height: '100%', borderRadius: '99px', background: 'linear-gradient(90deg, #4F8EF7, #2B6EE0)' }}
                initial={{ width: 0 }}
                animate={{ width: step >= s ? '100%' : '0%' }}
                transition={{ duration: 0.3 }}
              />
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* Step 1 — Basic info */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <div style={{ marginBottom: '8px' }}>
                <p style={{ color: '#4F8EF7', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px', fontWeight: 600 }}>Step 1 of 3</p>
                <h1 style={{ color: '#EEEEF8', fontSize: '30px', fontWeight: 900, letterSpacing: '-1px' }}>About you</h1>
                <p style={{ color: '#8888A8', fontSize: '14px', marginTop: '4px' }}>Your basic information</p>
              </div>

              <input style={inputStyle} placeholder="Full name" value={form.full_name} onChange={e => update('full_name', e.target.value)}/>
              <input type="date" style={inputStyle} placeholder="Date of birth" value={form.date_of_birth} onChange={e => update('date_of_birth', e.target.value)}/>
              <input type="tel" style={inputStyle} placeholder="Phone number" value={form.phone} onChange={e => update('phone', e.target.value)}/>
              <input style={inputStyle} placeholder="Cardiologist or specialist name" value={form.cardiologist} onChange={e => update('cardiologist', e.target.value)}/>

              <motion.button
                whileTap={{ scale: 0.97 }}
                transition={spring}
                onClick={() => {
                  if (!form.full_name) { toast.error('Please enter your name'); return }
                  setStep(2)
                }}
                style={{ width: '100%', background: 'linear-gradient(135deg, #4F8EF7, #2B6EE0)', color: '#FFFFFF', fontWeight: 700, padding: '16px', borderRadius: '14px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '4px', boxShadow: '0 6px 20px rgba(79,142,247,0.35)', fontSize: '15px' }}
              >
                Continue <ArrowRight size={16}/>
              </motion.button>
            </motion.div>
          )}

          {/* Step 2 — Conditions */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <div style={{ marginBottom: '8px' }}>
                <p style={{ color: '#4F8EF7', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px', fontWeight: 600 }}>Step 2 of 3</p>
                <h1 style={{ color: '#EEEEF8', fontSize: '30px', fontWeight: 900, letterSpacing: '-1px' }}>Your condition</h1>
                <p style={{ color: '#8888A8', fontSize: '14px', marginTop: '4px' }}>Select all that apply</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {CONDITIONS.map(c => {
                  const active = form.diagnosis.includes(c.id)
                  return (
                    <motion.button
                      key={c.id}
                      whileTap={{ scale: 0.97 }}
                      transition={spring}
                      onClick={() => toggleCondition(c.id)}
                      style={{
                        padding: '16px', borderRadius: '16px', textAlign: 'left', cursor: 'pointer',
                        background: active ? 'rgba(79,142,247,0.10)' : '#121220',
                        border: `1px solid ${active ? 'rgba(79,142,247,0.40)' : 'rgba(255,255,255,0.06)'}`,
                        transition: 'border-color 0.15s ease, background 0.15s ease',
                      }}
                    >
                      <div style={{ width: '32px', height: '32px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px', background: active ? 'rgba(79,142,247,0.16)' : 'rgba(255,255,255,0.06)' }}>
                        <c.Icon size={16} color={active ? '#4F8EF7' : '#505068'}/>
                      </div>
                      <p style={{ fontWeight: 700, fontSize: '13px', marginBottom: '3px', letterSpacing: '-0.2px', color: active ? '#EEEEF8' : '#8888A8' }}>
                        {c.id}
                      </p>
                      <p style={{ color: '#505068', fontSize: '11px', lineHeight: 1.4 }}>{c.desc}</p>
                    </motion.button>
                  )
                })}
              </div>

              <input type="date" style={inputStyle} placeholder="Surgery date (if applicable)" value={form.surgery_date} onChange={e => update('surgery_date', e.target.value)}/>
              <input style={inputStyle} placeholder="Known allergies" value={form.allergies} onChange={e => update('allergies', e.target.value)}/>

              <div style={{ display: 'flex', gap: '10px' }}>
                <motion.button whileTap={{ scale: 0.97 }} transition={spring} onClick={() => setStep(1)}
                  style={{ flex: 1, background: '#1A1A2E', border: '1px solid rgba(255,255,255,0.10)', color: '#8888A8', fontWeight: 600, padding: '16px', borderRadius: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px' }}>
                  <ArrowLeft size={16}/> Back
                </motion.button>
                <motion.button whileTap={{ scale: 0.97 }} transition={spring} onClick={() => {
                  if (form.diagnosis.length === 0) { toast.error('Please select at least one condition'); return }
                  setStep(3)
                }}
                  style={{ flex: 1, background: 'linear-gradient(135deg, #4F8EF7, #2B6EE0)', color: '#FFFFFF', fontWeight: 700, padding: '16px', borderRadius: '14px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px', boxShadow: '0 6px 20px rgba(79,142,247,0.35)' }}>
                  Continue <ArrowRight size={16}/>
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Step 3 — Contacts + Meds */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <div style={{ marginBottom: '4px' }}>
                <p style={{ color: '#4F8EF7', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px', fontWeight: 600 }}>Step 3 of 3</p>
                <h1 style={{ color: '#EEEEF8', fontSize: '30px', fontWeight: 900, letterSpacing: '-1px' }}>Contacts &amp; meds</h1>
                <p style={{ color: '#8888A8', fontSize: '14px', marginTop: '4px' }}>Who to alert in an emergency</p>
              </div>

              {/* Contacts */}
              <div>
                <p style={{ color: '#505068', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px', fontWeight: 600 }}>Emergency contacts</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {form.emergency_contacts.map((c, i) => (
                    <div key={i} style={{ background: '#121220', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <input style={inputStyle} placeholder="Name" value={c.name} onChange={e => updateContact(i, 'name', e.target.value)}/>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <input style={inputStyle} placeholder="Relationship" value={c.relationship} onChange={e => updateContact(i, 'relationship', e.target.value)}/>
                        <input style={inputStyle} placeholder="Phone" value={c.phone} onChange={e => updateContact(i, 'phone', e.target.value)}/>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => update('emergency_contacts', [...form.emergency_contacts, { name: '', relationship: '', phone: '' }])}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4F8EF7', fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}
                  >
                    <Plus size={14}/> Add contact
                  </button>
                </div>
              </div>

              {/* Medications */}
              <div>
                <p style={{ color: '#505068', fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px', fontWeight: 600 }}>Current medications</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {form.medications.map((m, i) => (
                    <div key={i} style={{ background: '#121220', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <input style={inputStyle} placeholder="Medication name" value={m.name} onChange={e => updateMed(i, 'name', e.target.value)}/>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <input style={inputStyle} placeholder="Dose (e.g. 50mg)" value={m.dose} onChange={e => updateMed(i, 'dose', e.target.value)}/>
                        <input style={inputStyle} placeholder="Frequency" value={m.frequency} onChange={e => updateMed(i, 'frequency', e.target.value)}/>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => update('medications', [...form.medications, { name: '', dose: '', frequency: '', times: ['Morning'] }])}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4F8EF7', fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}
                  >
                    <Plus size={14}/> Add medication
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', paddingBottom: '24px' }}>
                <motion.button whileTap={{ scale: 0.97 }} transition={spring} onClick={() => setStep(2)}
                  style={{ flex: 1, background: '#1A1A2E', border: '1px solid rgba(255,255,255,0.10)', color: '#8888A8', fontWeight: 600, padding: '16px', borderRadius: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px' }}>
                  <ArrowLeft size={16}/> Back
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }} transition={spring}
                  onClick={handleSubmit}
                  disabled={loading}
                  style={{ flex: 1, background: 'linear-gradient(135deg, #4F8EF7, #2B6EE0)', color: '#FFFFFF', fontWeight: 700, padding: '16px', borderRadius: '14px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: loading ? 0.7 : 1, fontSize: '15px', boxShadow: '0 6px 20px rgba(79,142,247,0.35)' }}
                >
                  {loading ? <Loader2 size={16} className="animate-spin"/> : <>Complete <ArrowRight size={16}/></>}
                </motion.button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
