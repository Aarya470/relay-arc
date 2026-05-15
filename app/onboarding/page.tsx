'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, Plus, X, Loader2, Heart, Zap, Brain, Activity, HeartPulse } from 'lucide-react'

const CONDITIONS = [
  { id: 'Post-cardiac surgery', Icon: Heart, desc: 'Bypass, valve, ablation, device' },
  { id: 'POTS', Icon: Zap, desc: 'Postural orthostatic tachycardia' },
  { id: 'Dysautonomia', Icon: Brain, desc: 'Autonomic nervous system disorder' },
  { id: 'ME/CFS', Icon: Activity, desc: 'Myalgic encephalomyelitis' },
  { id: 'General cardiac', Icon: HeartPulse, desc: 'Arrhythmia, CHF, other' },
  { id: 'Other', Icon: Plus, desc: 'Other condition' },
]

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

    const { error } = await supabase.from('profiles').insert({
      id: user.id,
      ...form,
      diagnosis: form.diagnosis.join(', ')
    })

    if (error) toast.error(error.message)
    else {
      toast.success('Profile created!')
      router.push('/dashboard')
    }
    setLoading(false)
  }

  const inputClass = "w-full bg-[#18181F] border border-white/8 rounded-2xl px-4 py-3.5 text-white placeholder-white/25 outline-none focus:border-[#fcb546]/40 transition text-sm"

  return (
    <div className="min-h-screen bg-[#09090C] px-5 py-12">
      <div className="max-w-lg mx-auto">

        {/* Progress */}
        <div className="flex gap-1.5 mb-8">
          {[1,2,3].map(s => (
            <motion.div
              key={s}
              className="h-1 flex-1 rounded-full overflow-hidden bg-white/8"
            >
              <motion.div
                className="h-full bg-[#fcb546] rounded-full"
                initial={{ width: 0 }}
                animate={{ width: step >= s ? '100%' : '0%' }}
                transition={{ duration: 0.3 }}
              />
            </motion.div>
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
              className="space-y-4"
            >
              <div className="mb-6">
                <p className="text-[#fcb546] font-mono text-xs uppercase tracking-wider mb-1">Step 1 of 3</p>
                <h1 className="text-white text-3xl font-bold">About you</h1>
                <p className="text-white/35 text-sm mt-1">Your basic information</p>
              </div>

              <input className={inputClass} placeholder="Full name" value={form.full_name} onChange={e => update('full_name', e.target.value)}/>
              <input className={inputClass} placeholder="Date of birth (YYYY-MM-DD)" value={form.date_of_birth} onChange={e => update('date_of_birth', e.target.value)}/>
              <input className={inputClass} placeholder="Phone number" value={form.phone} onChange={e => update('phone', e.target.value)}/>
              <input className={inputClass} placeholder="Cardiologist or specialist name" value={form.cardiologist} onChange={e => update('cardiologist', e.target.value)}/>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (!form.full_name) { toast.error('Please enter your name'); return }
                  setStep(2)
                }}
                className="w-full bg-[#fcb546] text-black font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 mt-2"
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
              className="space-y-4"
            >
              <div className="mb-6">
                <p className="text-[#fcb546] font-mono text-xs uppercase tracking-wider mb-1">Step 2 of 3</p>
                <h1 className="text-white text-3xl font-bold">Your condition</h1>
                <p className="text-white/35 text-sm mt-1">Select all that apply</p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {CONDITIONS.map(c => {
                  const active = form.diagnosis.includes(c.id)
                  return (
                    <motion.button
                      key={c.id}
                      whileTap={{ scale: 0.97 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      onClick={() => toggleCondition(c.id)}
                      className={`p-4 rounded-2xl text-left border transition-all ${
                        active
                          ? 'bg-[#fcb546]/8 border-[#fcb546]/40'
                          : 'bg-[#18181F] border-white/8 hover:border-white/15'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 ${active ? 'bg-[#fcb546]/15' : 'bg-white/6'}`}>
                        <c.Icon size={16} color={active ? '#fcb546' : 'rgba(237,234,224,0.4)'}/>
                      </div>
                      <p className={`font-semibold text-sm mb-0.5 tracking-tight ${active ? 'text-[#fcb546]' : 'text-white'}`}>
                        {c.id}
                      </p>
                      <p className="text-white/30 text-xs leading-relaxed">{c.desc}</p>
                    </motion.button>
                  )
                })}
              </div>

              <input className={inputClass} placeholder="Surgery date if applicable (YYYY-MM-DD)" value={form.surgery_date} onChange={e => update('surgery_date', e.target.value)}/>
              <input className={inputClass} placeholder="Known allergies" value={form.allergies} onChange={e => update('allergies', e.target.value)}/>

              <div className="flex gap-2.5">
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setStep(1)} className="flex-1 bg-white/6 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2">
                  <ArrowLeft size={16}/> Back
                </motion.button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setStep(3)} className="flex-1 bg-[#fcb546] text-black font-semibold py-4 rounded-2xl flex items-center justify-center gap-2">
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
              className="space-y-5"
            >
              <div className="mb-6">
                <p className="text-[#fcb546] font-mono text-xs uppercase tracking-wider mb-1">Step 3 of 3</p>
                <h1 className="text-white text-3xl font-bold">Contacts & meds</h1>
                <p className="text-white/35 text-sm mt-1">Who to alert in an emergency</p>
              </div>

              {/* Contacts */}
              <div>
                <p className="text-white/50 text-xs font-mono uppercase tracking-wider mb-2">Emergency contacts</p>
                <div className="space-y-2">
                  {form.emergency_contacts.map((c, i) => (
                    <div key={i} className="bg-[#18181F] border border-white/8 rounded-2xl p-3 space-y-2">
                      <input className={inputClass} placeholder="Name" value={c.name} onChange={e => updateContact(i, 'name', e.target.value)}/>
                      <div className="grid grid-cols-2 gap-2">
                        <input className={inputClass} placeholder="Relationship" value={c.relationship} onChange={e => updateContact(i, 'relationship', e.target.value)}/>
                        <input className={inputClass} placeholder="Phone" value={c.phone} onChange={e => updateContact(i, 'phone', e.target.value)}/>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => update('emergency_contacts', [...form.emergency_contacts, { name: '', relationship: '', phone: '' }])}
                    className="flex items-center gap-2 text-[#fcb546] text-sm hover:opacity-80 transition"
                  >
                    <Plus size={14}/> Add contact
                  </button>
                </div>
              </div>

              {/* Medications */}
              <div>
                <p className="text-white/50 text-xs font-mono uppercase tracking-wider mb-2">Current medications</p>
                <div className="space-y-2">
                  {form.medications.map((m, i) => (
                    <div key={i} className="bg-[#18181F] border border-white/8 rounded-2xl p-3 space-y-2">
                      <input className={inputClass} placeholder="Medication name" value={m.name} onChange={e => updateMed(i, 'name', e.target.value)}/>
                      <div className="grid grid-cols-2 gap-2">
                        <input className={inputClass} placeholder="Dose (e.g. 50mg)" value={m.dose} onChange={e => updateMed(i, 'dose', e.target.value)}/>
                        <input className={inputClass} placeholder="Frequency" value={m.frequency} onChange={e => updateMed(i, 'frequency', e.target.value)}/>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => update('medications', [...form.medications, { name: '', dose: '', frequency: '', times: ['Morning'] }])}
                    className="flex items-center gap-2 text-[#fcb546] text-sm hover:opacity-80 transition"
                  >
                    <Plus size={14}/> Add medication
                  </button>
                </div>
              </div>

              <div className="flex gap-2.5 pb-6">
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setStep(2)} className="flex-1 bg-white/6 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2">
                  <ArrowLeft size={16}/> Back
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 bg-[#fcb546] text-black font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
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
