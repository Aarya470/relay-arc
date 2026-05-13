'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowLeft, Sparkles, RefreshCw } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import BottomNav from '@/components/BottomNav'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY!, dangerouslyAllowBrowser: true })

export default function AppointmentSummary() {
  const [profile, setProfile] = useState<any>(null)
  const [checkins, setCheckins] = useState<any[]>([])
  const [emergencies, setEmergencies] = useState<any[]>([])
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: p }, { data: c }, { data: e }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('checkins').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('emergencies').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      ])
      setProfile(p); setCheckins(c || []); setEmergencies(e || [])
      setLoading(false)
    }
    load()
  }, [])

  const generateSummary = async () => {
    setGenerating(true)
    const prompt = `Generate a concise medical appointment summary.
Patient: ${profile?.full_name}, Conditions: ${profile?.diagnosis}, Meds: ${JSON.stringify(profile?.medications)}, Allergies: ${profile?.allergies}
Recent check-ins: ${checkins.map(c => `${new Date(c.created_at).toLocaleDateString()}: ${c.summary}`).join(' | ')}
Emergencies: ${emergencies.length > 0 ? emergencies.map(e => `${e.emergency_type}`).join(', ') : 'None'}
Write a structured summary with: patient overview, symptom patterns, medication notes, suggested questions for doctor. Professional and concise.`

    const completion = await groq.chat.completions.create({ model: 'llama-3.1-8b-instant', messages: [{ role: 'user', content: prompt }] })
    setSummary(completion.choices[0].message.content || '')
    setGenerating(false)
    toast.success('Summary generated')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#07070E', padding: '80px 16px 100px' }}>
      {[1,2,3].map(i => <Skeleton key={i} style={{ height: '80px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', marginBottom: '10px' }}/>)}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#07070E', paddingBottom: '100px' }}>
      <div style={{ padding: '56px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => router.push('/dashboard')}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={15} color="rgba(237,234,224,0.5)"/>
          </motion.button>
          <div>
            <h1 style={{ color: '#EDEAE0', fontWeight: 800, fontSize: '20px', letterSpacing: '-0.5px' }}>Appointment Summary</h1>
            <p style={{ color: 'rgba(237,234,224,0.3)', fontSize: '12px' }}>AI-generated for your next visit</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {[
            { label: 'Check-ins', value: checkins.length, color: '#80EF80' },
            { label: 'Emergencies', value: emergencies.length, color: '#FF4A42' },
            { label: 'Medications', value: profile?.medications?.length || 0, color: '#fcb546' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '14px', textAlign: 'center' }}>
              <p style={{ color: s.color, fontWeight: 800, fontSize: '24px', letterSpacing: '-1px' }}>{s.value}</p>
              <p style={{ color: 'rgba(237,234,224,0.3)', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {!summary ? (
          <motion.button whileTap={{ scale: 0.97 }} onClick={generateSummary} disabled={generating}
            style={{ background: 'linear-gradient(135deg, rgba(252,181,70,0.15), rgba(252,181,70,0.08))', border: '1px solid rgba(252,181,70,0.25)', color: '#fcb546', fontWeight: 700, fontSize: '15px', padding: '18px', borderRadius: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {generating ? <><RefreshCw size={16} className="animate-spin"/> Generating...</> : <><Sparkles size={16}/> Generate AI Summary</>}
          </motion.button>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '18px', padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={13} color="#fcb546"/>
                <p style={{ color: 'rgba(237,234,224,0.4)', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px' }}>AI Summary</p>
              </div>
              <motion.button whileTap={{ scale: 0.9 }} onClick={generateSummary}
                style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RefreshCw size={12} color="rgba(237,234,224,0.3)"/>
              </motion.button>
            </div>
            <p style={{ color: 'rgba(237,234,224,0.7)', fontSize: '13px', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{summary}</p>
          </div>
        )}

        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '18px', padding: '16px' }}>
          <p style={{ color: 'rgba(237,234,224,0.3)', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>Recent check-ins</p>
          {checkins.length === 0 && <p style={{ color: 'rgba(237,234,224,0.2)', fontSize: '13px' }}>No check-ins yet</p>}
          {checkins.slice(0, 5).map((c, i) => (
            <div key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px', marginBottom: '12px' }}>
              <p style={{ color: 'rgba(237,234,224,0.25)', fontFamily: 'monospace', fontSize: '10px', marginBottom: '4px' }}>{new Date(c.created_at).toLocaleDateString()}</p>
              <p style={{ color: 'rgba(237,234,224,0.55)', fontSize: '12px', lineHeight: 1.6 }}>{c.summary}</p>
            </div>
          ))}
        </div>
      </div>

      <BottomNav/>
    </div>
  )
}
