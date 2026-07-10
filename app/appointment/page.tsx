'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowLeft, Sparkles, RefreshCw, MessageSquare, AlertTriangle, Pill } from 'lucide-react'
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
      {[1,2,3].map(i => <Skeleton key={i} style={{ height: '80px', borderRadius: '16px', background: '#ECEEF2', marginBottom: '10px' }}/>)}
    </div>
  )

  const stats = [
    { label: 'Check-ins', value: checkins.length, color: '#007A44', bg: 'rgba(0,122,68,0.07)', border: 'rgba(0,122,68,0.15)', Icon: MessageSquare },
    { label: 'Emergencies', value: emergencies.length, color: '#D91414', bg: 'rgba(217,20,20,0.07)', border: 'rgba(217,20,20,0.15)', Icon: AlertTriangle },
    { label: 'Medications', value: profile?.medications?.length || 0, color: '#B45309', bg: 'rgba(180,83,9,0.07)', border: 'rgba(180,83,9,0.15)', Icon: Pill },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#07070E', paddingBottom: '100px' }}>
      <div style={{ padding: '56px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => router.push('/dashboard')}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ECEEF2', border: '1px solid #E3E6EC', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArrowLeft size={15} color="rgba(237,234,224,0.5)"/>
          </motion.button>
          <div>
            <h1 style={{ color: '#EDEAE0', fontWeight: 800, fontSize: '20px', letterSpacing: '-0.5px' }}>Appointment Summary</h1>
            <p style={{ color: 'rgba(237,234,224,0.3)', fontSize: '12px' }}>AI-generated for your next visit</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {stats.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: '18px', padding: '16px 12px', textAlign: 'center', boxShadow: '0 4px 16px rgba(14,18,24,0.06)' }}>
              <s.Icon size={16} color={s.color} style={{ margin: '0 auto 8px' }}/>
              <p style={{ color: s.color, fontWeight: 800, fontSize: '26px', letterSpacing: '-1px', lineHeight: 1, marginBottom: '5px' }}>{s.value}</p>
              <p style={{ color: 'rgba(237,234,224,0.3)', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Generate / Summary */}
        {!summary ? (
          <motion.button whileTap={{ scale: 0.97 }} onClick={generateSummary} disabled={generating}
            style={{ background: 'linear-gradient(135deg, rgba(180,83,9,0.12), rgba(180,83,9,0.06))', border: '1px solid rgba(180,83,9,0.22)', color: '#B45309', fontWeight: 700, fontSize: '15px', padding: '20px', borderRadius: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 6px 24px rgba(180,83,9,0.1)' }}>
            {generating
              ? <><RefreshCw size={16} className="animate-spin"/> Generating...</>
              : <><Sparkles size={16}/> Generate AI Summary</>
            }
          </motion.button>
        ) : (
          <div style={{ background: '#FFFFFF', border: '1px solid #E3E6EC', borderRadius: '20px', padding: '18px', boxShadow: '0 4px 20px rgba(14,18,24,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: 'rgba(180,83,9,0.12)', border: '1px solid rgba(180,83,9,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={11} color="#B45309"/>
                </div>
                <p style={{ color: 'rgba(237,234,224,0.4)', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px' }}>AI Summary</p>
              </div>
              <motion.button whileTap={{ scale: 0.9 }} onClick={generateSummary}
                style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#ECEEF2', border: '1px solid #E3E6EC', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RefreshCw size={12} color="rgba(237,234,224,0.3)"/>
              </motion.button>
            </div>
            <p style={{ color: 'rgba(237,234,224,0.7)', fontSize: '13px', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{summary}</p>
          </div>
        )}

        {/* Check-in history */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E3E6EC', borderRadius: '20px', padding: '18px', boxShadow: '0 4px 20px rgba(14,18,24,0.06)' }}>
          <p style={{ color: 'rgba(237,234,224,0.3)', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Recent check-ins</p>
          {checkins.length === 0 && <p style={{ color: 'rgba(237,234,224,0.2)', fontSize: '13px' }}>No check-ins yet</p>}
          {checkins.slice(0, 5).map((c, i) => (
            <div key={i} style={{ borderBottom: i < Math.min(checkins.length, 5) - 1 ? '1px solid #E9EBF0' : 'none', paddingBottom: i < Math.min(checkins.length, 5) - 1 ? '12px' : 0, marginBottom: i < Math.min(checkins.length, 5) - 1 ? '12px' : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(0,122,68,0.5)', flexShrink: 0 }}/>
                <p style={{ color: 'rgba(237,234,224,0.22)', fontFamily: 'monospace', fontSize: '10px' }}>{new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
              </div>
              <p style={{ color: 'rgba(237,234,224,0.55)', fontSize: '12px', lineHeight: 1.6 }}>{c.summary}</p>
            </div>
          ))}
        </div>
      </div>

      <BottomNav/>
    </div>
  )
}
