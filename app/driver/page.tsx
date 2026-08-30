'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, MapPin, Navigation, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function DriverDashboard() {
  const [requests, setRequests] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [accepted, setAccepted] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p)

      const { data: r } = await supabase
        .from('transport_requests')
        .select('*')
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      setRequests(r || [])
      setLoading(false)
    }
    load()

    const sub = supabase
      .channel('transport_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transport_requests' }, () => {
        load()
      })
      .subscribe()

    return () => { supabase.removeChannel(sub) }
  }, [])

  const acceptRequest = async (request: any) => {
    if (!profile) return
    setAccepting(request.id)

    const { error } = await supabase
      .from('transport_requests')
      .update({
        status: 'accepted',
        driver_id: profile.id,
        driver_name: profile.full_name,
        driver_phone: profile.phone
      })
      .eq('id', request.id)

    if (error) {
      toast.error('Request already taken')
    } else {
      setAccepted(request)
      toast.success('Request accepted')
    }
    setAccepting(null)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#EFF2E8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={32} color="#A87200" className="animate-spin"/>
    </div>
  )

  if (accepted) return (
    <div style={{ minHeight: '100vh', background: '#EFF2E8', padding: '56px 20px 20px' }}>
      <div style={{ background: 'rgba(120,140,93,0.08)', border: '1px solid rgba(120,140,93,0.2)', borderRadius: '20px', padding: '24px', textAlign: 'center', marginBottom: '16px' }}>
        <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>🚗</span>
        <p style={{ color: '#5F7049', fontWeight: 700, fontSize: '22px', marginBottom: '8px' }}>Ride accepted</p>
        <p style={{ color: '#5C5A52', fontSize: '14px' }}>You are helping save a life</p>
      </div>

      <div style={{ background: '#FFFFFF', border: '1px solid #DCE1D0', borderRadius: '16px', padding: '16px', marginBottom: '12px' }}>
        <p style={{ color: '#84827A', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Pick up</p>
        <p style={{ color: '#141413', fontWeight: 600, marginBottom: '4px' }}>{accepted.patient_name}</p>
        <p style={{ color: '#84827A', fontSize: '13px', marginBottom: '12px' }}>{accepted.pickup_address}</p>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            const url = `/emergency/routing?type=${accepted.emergency_type}&destlat=${accepted.pickup_lat}&destlng=${accepted.pickup_lng}&destname=${encodeURIComponent(accepted.patient_name)}`
            router.push(url)
          }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#A87200', color: '#FFFFFF', fontWeight: 700, fontSize: '14px', padding: '14px', borderRadius: '12px', border: 'none', cursor: 'pointer', width: '100%' }}
        >
          <Navigation size={16}/> Navigate to patient
        </motion.button>
      </div>

      <div style={{ background: '#FFFFFF', border: '1px solid #DCE1D0', borderRadius: '16px', padding: '16px' }}>
        <p style={{ color: '#84827A', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Then take to</p>
        <p style={{ color: '#141413', fontWeight: 600, marginBottom: '4px' }}>{accepted.hospital_name}</p>
        <p style={{ color: '#84827A', fontSize: '13px', marginBottom: '12px' }}>
          Emergency: {accepted.emergency_type?.replace('_', ' ')}
        </p>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            const url = `/emergency/routing?type=${accepted.emergency_type}&destlat=${accepted.hospital_lat}&destlng=${accepted.hospital_lng}&destname=${encodeURIComponent(accepted.hospital_name)}`
            router.push(url)
          }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#DC2626', color: '#141413', fontWeight: 700, fontSize: '14px', padding: '14px', borderRadius: '12px', border: 'none', cursor: 'pointer', width: '100%' }}
        >
          <Navigation size={16}/> Navigate to hospital
        </motion.button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#EFF2E8', display: 'flex', flexDirection: 'column' }}>

      <div style={{ padding: '56px 20px 16px', borderBottom: '1px solid #DCE1D0', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => router.push('/dashboard')}
          style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#F2F0E8', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ArrowLeft size={16} color="#5C5A52"/>
        </motion.button>
        <div>
          <p style={{ color: '#84827A', fontFamily: 'monospace', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px' }}>Community</p>
          <h1 style={{ color: '#141413', fontWeight: 700, fontSize: '20px' }}>Help someone now</h1>
        </div>
        <div style={{ marginLeft: 'auto', background: requests.length > 0 ? 'rgba(163,52,23,0.15)' : '#F2F0E8', border: `1px solid ${requests.length > 0 ? 'rgba(163,52,23,0.3)' : '#DCE1D0'}`, borderRadius: '20px', padding: '4px 10px' }}>
          <p style={{ color: requests.length > 0 ? '#A33417' : '#84827A', fontFamily: 'monospace', fontSize: '11px' }}>
            {requests.length} pending
          </p>
        </div>
      </div>

      <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
        {requests.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: '60px' }}>
            <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>🚗</span>
            <p style={{ color: '#5C5A52', fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>No requests nearby</p>
            <p style={{ color: '#84827A', fontSize: '13px' }}>Check back soon — requests update in real time</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ color: '#84827A', fontSize: '12px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
              Active requests
            </p>
            <AnimatePresence>
              {requests.map((req, i) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: i * 0.05 }}
                  style={{ background: '#FFFFFF', border: '1px solid rgba(163,52,23,0.2)', borderRadius: '16px', overflow: 'hidden' }}
                >
                  <div style={{ padding: '14px', borderBottom: '1px solid #DCE1D0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <motion.div
                        style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#A33417', flexShrink: 0 }}
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                      <p style={{ color: '#A33417', fontWeight: 600, fontSize: '13px' }}>
                        {req.emergency_type?.replace('_', ' ')} emergency
                      </p>
                      <p style={{ color: '#84827A', fontSize: '11px', marginLeft: 'auto', fontFamily: 'monospace' }}>
                        {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'flex-start' }}>
                      <MapPin size={13} color="#A87200" style={{ flexShrink: 0, marginTop: '2px' }}/>
                      <div>
                        <p style={{ color: '#84827A', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Pick up</p>
                        <p style={{ color: '#141413', fontSize: '13px' }}>{req.pickup_address}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <AlertCircle size={13} color="#5F7049" style={{ flexShrink: 0, marginTop: '2px' }}/>
                      <div>
                        <p style={{ color: '#84827A', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Hospital</p>
                        <p style={{ color: '#141413', fontSize: '13px' }}>{req.hospital_name}</p>
                      </div>
                    </div>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => acceptRequest(req)}
                    disabled={accepting === req.id}
                    style={{ width: '100%', background: '#DC2626', border: 'none', padding: '14px', color: '#141413', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    {accepting === req.id ? <Loader2 size={16} className="animate-spin"/> : '🚗 Accept — I can drive them'}
                  </motion.button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
