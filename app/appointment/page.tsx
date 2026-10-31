'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowLeft, Sparkles, RefreshCw, MessageSquare, AlertTriangle, Pill } from '@/lib/plain-icons'
import { Skeleton } from '@/components/ui/skeleton'
import BottomNav from '@/components/BottomNav'

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
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: p }, { data: c }, { data: e }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase
          .from('checkins')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('emergencies')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ])
      setProfile(p)
      setCheckins(c || [])
      setEmergencies(e || [])
      setLoading(false)
    }
    load()
  }, [])

  // Generated server-side. This used to hold a Groq client built with
  // NEXT_PUBLIC_GROQ_API_KEY, which shipped the key in the client bundle. The
  // server rebuilds the prompt from data it refetches under this user's own JWT.
  const generateSummary = async () => {
    setGenerating(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast.error('Please sign in again')
        return
      }
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ task: 'appointment_summary' }),
      })
      if (!res.ok) {
        toast.error('Could not generate a summary')
        return
      }
      const { text } = await res.json()
      if (!text) {
        toast.error('Could not generate a summary')
        return
      }
      setSummary(text)
      toast.success('Summary generated')
    } catch {
      toast.error('Could not generate a summary')
    } finally {
      setGenerating(false)
    }
  }

  if (loading)
    return (
      <div style={{ minHeight: '100vh', background: '#141413', padding: '80px 16px 100px' }}>
        {[1, 2, 3].map((i) => (
          <Skeleton
            key={i}
            style={{
              height: '80px',
              borderRadius: '4px',
              background: '#F2F0E8',
              marginBottom: '10px',
            }}
          />
        ))}
      </div>
    )

  const stats = [
    {
      label: 'Check-ins',
      value: checkins.length,
      color: '#42623C',
      bg: 'rgba(86,128,78,0.07)',
      border: 'rgba(86,128,78,0.15)',
      Icon: MessageSquare,
    },
    {
      label: 'Emergencies',
      value: emergencies.length,
      color: '#A33417',
      bg: 'rgba(163,52,23,0.07)',
      border: 'rgba(163,52,23,0.15)',
      Icon: AlertTriangle,
    },
    {
      label: 'Medications',
      value: profile?.medications?.length || 0,
      color: '#7C5200',
      bg: 'rgba(168,114,0,0.07)',
      border: 'rgba(168,114,0,0.15)',
      Icon: Pill,
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#141413', paddingBottom: '100px' }}>
      <div style={{ padding: '56px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => router.push('/dashboard')}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '14px',
              background: '#F2F0E8',
              border: '1px solid #98C890',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowLeft size={15} color="rgba(237,234,224,0.5)" />
          </motion.button>
          <div>
            <h1
              style={{
                color: '#EDEAE0',
                fontWeight: 800,
                fontSize: '20px',
                letterSpacing: '-0.5px',
              }}
            >
              Appointment Summary
            </h1>
            <p style={{ color: 'rgba(237,234,224,0.3)', fontSize: '12px' }}>
              Drafted automatically. Read it before your visit
            </p>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {stats.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              style={{
                background: s.bg,
                border: `1px solid ${s.border}`,
                borderRadius: '4px',
                padding: '16px 12px',
                textAlign: 'center',
                boxShadow: '0 4px 16px rgba(20,20,19,0.06)',
              }}
            >
              <s.Icon size={16} color={s.color} style={{ margin: '0 auto 8px' }} />
              <p
                style={{
                  color: s.color,
                  fontWeight: 800,
                  fontSize: '26px',
                  letterSpacing: '-0.4px',
                  lineHeight: 1,
                  marginBottom: '5px',
                }}
              >
                {s.value}
              </p>
              <p
                style={{
                  color: 'rgba(237,234,224,0.3)',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  letterSpacing: '0',
                }}
              >
                {s.label}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Generate / Summary */}
        {!summary ? (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={generateSummary}
            disabled={generating}
            style={{
              background: 'rgba(168,114,0,0.08)',
              border: '1px solid rgba(168,114,0,0.22)',
              color: '#7C5200',
              fontWeight: 700,
              fontSize: '15px',
              padding: '20px',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {generating ? (
              <>
                <RefreshCw size={16} className="animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Sparkles size={16} /> Generate AI Summary
              </>
            )}
          </motion.button>
        ) : (
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #98C890',
              borderRadius: '4px',
              padding: '18px',
              boxShadow: '0 4px 20px rgba(20,20,19,0.06)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '14px',
                    background: 'rgba(168,114,0,0.12)',
                    border: '1px solid rgba(168,114,0,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Sparkles size={11} color="#7C5200" />
                </div>
                <p
                  style={{
                    color: 'rgba(237,234,224,0.4)',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    letterSpacing: '0',
                  }}
                >
                  AI Summary
                </p>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={generateSummary}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '14px',
                  background: '#F2F0E8',
                  border: '1px solid #98C890',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <RefreshCw size={12} color="rgba(237,234,224,0.3)" />
              </motion.button>
            </div>
            <p
              style={{
                color: 'rgba(237,234,224,0.7)',
                fontSize: '13px',
                lineHeight: 1.75,
                whiteSpace: 'pre-wrap',
              }}
            >
              {summary}
            </p>
          </div>
        )}

        {/* Check-in history */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #98C890',
            borderRadius: '4px',
            padding: '18px',
            boxShadow: '0 4px 20px rgba(20,20,19,0.06)',
          }}
        >
          <p
            style={{
              color: 'rgba(237,234,224,0.3)',
              fontSize: '13px',
              fontFamily: 'monospace',
              letterSpacing: '0',
              marginBottom: '16px',
            }}
          >
            Recent check-ins
          </p>
          {checkins.length === 0 && (
            <p style={{ color: 'rgba(237,234,224,0.2)', fontSize: '13px' }}>No check-ins yet</p>
          )}
          {checkins.slice(0, 5).map((c, i) => (
            <div
              key={i}
              style={{
                borderBottom: i < Math.min(checkins.length, 5) - 1 ? '1px solid #EDEAE0' : 'none',
                paddingBottom: i < Math.min(checkins.length, 5) - 1 ? '12px' : 0,
                marginBottom: i < Math.min(checkins.length, 5) - 1 ? '12px' : 0,
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}
              >
                <div
                  style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    background: 'rgba(86,128,78,0.5)',
                    flexShrink: 0,
                  }}
                />
                <p
                  style={{
                    color: 'rgba(237,234,224,0.22)',
                    fontFamily: 'monospace',
                    fontSize: '10px',
                  }}
                >
                  {new Date(c.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <p style={{ color: 'rgba(237,234,224,0.55)', fontSize: '12px', lineHeight: 1.6 }}>
                {c.summary}
              </p>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
