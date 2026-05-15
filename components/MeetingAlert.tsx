'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Video, ChevronLeft, ChevronRight } from 'lucide-react'
import JitsiMeeting from './JitsiMeeting'
import { registerServiceWorker } from '@/lib/notifications'

const spring = { type: 'spring', stiffness: 380, damping: 28 } as const
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const ALL_TIMES: string[] = []
for (let h = 6; h <= 21; h++) {
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h
  const ampm = h < 12 ? 'AM' : 'PM'
  ALL_TIMES.push(`${h12}:00 ${ampm}`)
  if (h < 21) ALL_TIMES.push(`${h12}:30 ${ampm}`)
}

function parseTime(label: string) {
  const [t, ampm] = label.split(' ')
  const [h, m] = t.split(':').map(Number)
  let hour = h
  if (ampm === 'PM' && h !== 12) hour += 12
  if (ampm === 'AM' && h === 12) hour = 0
  return { hour, min: m }
}

function MiniCalendar({ selected, onSelect }: { selected: Date | null; onSelect: (d: Date) => void }) {
  const today = new Date(); today.setHours(0,0,0,0)
  const [yr, setYr] = useState(today.getFullYear())
  const [mo, setMo] = useState(today.getMonth())
  const first = new Date(yr, mo, 1).getDay()
  const daysN = new Date(yr, mo+1, 0).getDate()
  const cells = [...Array(first).fill(null), ...Array.from({length:daysN},(_,i)=>i+1)]
  const isPast = (d: number) => new Date(yr, mo, d) < today
  const isSel = (d: number) => selected?.getFullYear()===yr && selected?.getMonth()===mo && selected?.getDate()===d
  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <motion.button whileTap={{scale:0.88}} transition={spring}
          onClick={() => mo===0 ? (setYr(y=>y-1),setMo(11)) : setMo(m=>m-1)}
          style={{width:28,height:28,borderRadius:8,background:'rgba(26,40,32,0.06)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <ChevronLeft size={13} color="rgba(26,40,32,0.5)"/>
        </motion.button>
        <p style={{color:'#1A2820',fontWeight:700,fontSize:'13px'}}>{MONTHS[mo]} {yr}</p>
        <motion.button whileTap={{scale:0.88}} transition={spring}
          onClick={() => mo===11 ? (setYr(y=>y+1),setMo(0)) : setMo(m=>m+1)}
          style={{width:28,height:28,borderRadius:8,background:'rgba(26,40,32,0.06)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <ChevronRight size={13} color="rgba(26,40,32,0.5)"/>
        </motion.button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',marginBottom:4}}>
        {DAYS.map(d=><p key={d} style={{textAlign:'center',fontSize:'10px',color:'rgba(26,40,32,0.3)',fontFamily:'var(--font-mono,monospace)'}}>{d}</p>)}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
        {cells.map((day,i) => {
          if (!day) return <div key={i}/>
          const past=isPast(day), sel=isSel(day)
          return (
            <motion.button key={i} whileTap={past?{}:{scale:0.85}} transition={spring}
              onClick={()=>!past&&onSelect(new Date(yr,mo,day))} disabled={past}
              style={{height:32,borderRadius:8,border:'none',background:sel?'#5C8B74':'transparent',color:past?'rgba(26,40,32,0.15)':sel?'white':'rgba(26,40,32,0.7)',fontSize:'12px',fontWeight:sel?800:400,cursor:past?'default':'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
              {day}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

function TimeWheel({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  const ITEM_H = 46
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const idx = ALL_TIMES.indexOf(value)
    if (ref.current && idx >= 0) ref.current.scrollTop = idx * ITEM_H
  }, [])
  const handleScroll = () => {
    if (!ref.current) return
    const idx = Math.round(ref.current.scrollTop / ITEM_H)
    const c = Math.max(0, Math.min(idx, ALL_TIMES.length-1))
    if (ALL_TIMES[c] !== value) onChange(ALL_TIMES[c])
  }
  return (
    <div style={{position:'relative',height:ITEM_H*3,borderRadius:12,background:'rgba(26,40,32,0.03)',border:'1px solid rgba(26,40,32,0.08)',overflow:'hidden'}}>
      <div style={{position:'absolute',top:ITEM_H,left:10,right:10,height:ITEM_H,background:'rgba(92,139,116,0.1)',border:'1px solid rgba(92,139,116,0.22)',borderRadius:8,pointerEvents:'none',zIndex:1}}/>
      <div style={{position:'absolute',top:0,left:0,right:0,height:ITEM_H,background:'linear-gradient(to bottom,#fff 20%,transparent)',pointerEvents:'none',zIndex:2}}/>
      <div style={{position:'absolute',bottom:0,left:0,right:0,height:ITEM_H,background:'linear-gradient(to top,#fff 20%,transparent)',pointerEvents:'none',zIndex:2}}/>
      <div ref={ref} onScroll={handleScroll}
        style={{height:'100%',overflowY:'scroll',scrollSnapType:'y mandatory',paddingTop:ITEM_H,paddingBottom:ITEM_H,scrollbarWidth:'none'} as React.CSSProperties}>
        {ALL_TIMES.map((t,i) => {
          const sel = t===value
          return (
            <div key={t} style={{height:ITEM_H,scrollSnapAlign:'center',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}
              onClick={()=>{onChange(t);ref.current?.scrollTo({top:i*ITEM_H,behavior:'smooth'})}}>
              <span style={{fontSize:sel?'17px':'13px',fontWeight:sel?800:400,color:sel?'#3D6B58':'rgba(26,40,32,0.3)',transition:'all 0.15s ease',fontFamily:'inherit'}}>
                {t}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function MeetingAlert() {
  const [userId, setUserId] = useState('')
  const [profile, setProfile] = useState<any>(null)
  const [upcomingAppt, setUpcomingAppt] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)
  const [showReschedule, setShowReschedule] = useState(false)
  const [activeCall, setActiveCall] = useState<any>(null)
  const [rescheduleDay, setRescheduleDay] = useState<Date | null>(null)
  const [rescheduleTime, setRescheduleTime] = useState('9:00 AM')
  const [submitting, setSubmitting] = useState(false)
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const pathname = usePathname()

  // Don't run on care-team/nurse routes or appointments page (has its own UI)
  const skip = pathname?.startsWith('/care-team') ||
    pathname?.startsWith('/nurse') ||
    pathname === '/appointments' ||
    pathname === '/login' ||
    pathname === '/onboarding'

  useEffect(() => {
    if (skip) return
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data: p } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      setProfile(p)
      await registerServiceWorker()
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission()
      }
      // Handle ?join=ROOM_ID from push notification click
      const params = new URLSearchParams(window.location.search)
      const joinId = params.get('join')
      if (joinId) {
        window.history.replaceState({}, '', window.location.pathname)
        const { data: appt } = await supabase
          .from('appointments')
          .select('*')
          .eq('meeting_room_id', joinId)
          .eq('patient_id', user.id)
          .single()
        if (appt) { setActiveCall(appt); setShowModal(false) }
      }
    }
    init()
  }, [skip])

  useEffect(() => {
    if (!userId || skip) return
    const check = async () => {
      const { data } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', userId)
        .eq('status', 'confirmed')
      if (!data) return
      const now = Date.now()
      const upcoming = data.filter(a => a.meeting_room_id).find(a => {
        const t = new Date(a.scheduled_at).getTime()
        return t > now - 5*60*1000 && t < now + 30*60*1000
      })
      if (!upcoming) { setUpcomingAppt(null); return }
      setUpcomingAppt(upcoming)
      const msUntil = new Date(upcoming.scheduled_at).getTime() - now

      // Show in-app modal at 10 minutes before (or if overdue by <5min)
      if (msUntil <= 10*60*1000) setShowModal(true)

      // Schedule push notification at exactly 2 minutes before
      if (!timers.current.has(upcoming.id)) {
        const delay = Math.max(0, msUntil - 2*60*1000)
        if (delay < 29*60*1000) {
          const timer = setTimeout(async () => {
            if (Notification.permission !== 'granted') return
            const url = `/appointments?join=${upcoming.meeting_room_id}`
            try {
              const reg = await navigator.serviceWorker?.ready
              reg?.showNotification('Meeting in 2 minutes', {
                body: 'Your care team call is about to start. Tap to join.',
                icon: '/icon.png',
                badge: '/icon.png',
                data: { url },
                requireInteraction: true,
              } as any)
            } catch {
              new Notification('Meeting in 2 minutes', { body: 'Your care team call is about to start.' })
            }
          }, delay)
          timers.current.set(upcoming.id, timer)
        }
      }
    }
    check()
    const id = setInterval(check, 30000)
    return () => {
      clearInterval(id)
      timers.current.forEach(t => clearTimeout(t))
    }
  }, [userId, skip])

  const handleMeetingEnd = async (apptId: string) => {
    await supabase.from('appointments').update({ status: 'completed' }).eq('id', apptId)
    setActiveCall(null)
    setShowModal(false)
    setUpcomingAppt(null)
    toast.success('Call ended — appointment marked complete')
  }

  const handleReschedule = async () => {
    if (!upcomingAppt || !rescheduleDay || submitting) return
    setSubmitting(true)
    const { hour, min } = parseTime(rescheduleTime)
    const d = new Date(rescheduleDay)
    d.setHours(hour, min, 0, 0)
    const newRoomId = ([1e7] as any+(-1e3)+(-4e3)+(-8e3)+(-1e11))
      .replace(/[018]/g, (c: any) => (c ^ (Math.random()*16 >> c/4)).toString(16))

    await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', upcomingAppt.id)
    const { error } = await supabase.from('appointments').insert({
      patient_id: userId,
      type: 'scheduled',
      status: 'pending',
      scheduled_at: d.toISOString(),
      patient_concern: upcomingAppt.patient_concern || '',
      meeting_room_id: newRoomId,
    })
    setSubmitting(false)
    if (error) { toast.error('Failed to reschedule'); return }
    setShowModal(false)
    setShowReschedule(false)
    setUpcomingAppt(null)
    setRescheduleDay(null)
    setRescheduleTime('9:00 AM')
    toast.success('Reschedule request sent to care team')
  }

  if (skip) return null

  const scheduledStr = upcomingAppt
    ? new Date(upcomingAppt.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : ''
  const isNow = upcomingAppt && new Date(upcomingAppt.scheduled_at) <= new Date()

  return (
    <>
      {/* Full-screen Jitsi overlay */}
      <AnimatePresence>
        {activeCall && (
          <JitsiMeeting
            roomId={activeCall.meeting_room_id}
            displayName={profile?.full_name || 'Patient'}
            onEnd={() => handleMeetingEnd(activeCall.id)}
          />
        )}
      </AnimatePresence>

      {/* In-app meeting modal */}
      <AnimatePresence>
        {showModal && upcomingAppt && !activeCall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(26,40,32,0.5)', zIndex: 150, display: 'flex', alignItems: 'flex-end' }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              style={{ width: '100%', background: '#FFFFFF', borderRadius: '28px 28px 0 0', padding: '20px 20px 48px', maxHeight: '92dvh', overflowY: 'auto' }}
            >
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(26,40,32,0.1)', margin: '0 auto 20px' }} />

              {showReschedule ? (
                /* ─── RESCHEDULE VIEW ─── */
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <motion.button whileTap={{ scale: 0.9 }} transition={spring} onClick={() => setShowReschedule(false)}
                      style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(26,40,32,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ChevronLeft size={16} color="rgba(26,40,32,0.5)" />
                    </motion.button>
                    <div>
                      <p style={{ color: '#1A2820', fontWeight: 800, fontSize: '18px', letterSpacing: '-0.4px' }}>Pick a new time</p>
                      <p style={{ color: 'rgba(26,40,32,0.38)', fontSize: '12px', marginTop: 2 }}>A new request will be sent to your care team</p>
                    </div>
                  </div>

                  <div style={{ background: '#F8F6F2', border: '1px solid rgba(26,40,32,0.07)', borderRadius: 18, padding: 16, marginBottom: 12 }}>
                    <MiniCalendar selected={rescheduleDay} onSelect={setRescheduleDay} />
                  </div>

                  <AnimatePresence>
                    {rescheduleDay && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring} style={{ marginBottom: 16 }}>
                        <p style={{ color: 'rgba(26,40,32,0.4)', fontSize: '11px', fontFamily: 'var(--font-mono,monospace)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Select a time</p>
                        <TimeWheel value={rescheduleTime} onChange={setRescheduleTime} />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button whileTap={rescheduleDay && !submitting ? { scale: 0.97, y: 1 } : {}} onClick={handleReschedule}
                    disabled={!rescheduleDay || submitting}
                    style={{ width: '100%', background: rescheduleDay && !submitting ? 'linear-gradient(135deg,#5C8B74,#3D6B58)' : 'rgba(26,40,32,0.07)', color: rescheduleDay && !submitting ? 'white' : 'rgba(26,40,32,0.3)', fontWeight: 800, fontSize: '15px', padding: '16px', borderRadius: '14px', border: 'none', cursor: rescheduleDay ? 'pointer' : 'default', boxShadow: rescheduleDay ? '0 8px 24px rgba(92,139,116,0.24)' : 'none', transition: 'all 0.2s ease' }}>
                    {submitting ? 'Sending request...' : 'Confirm reschedule'}
                  </motion.button>
                </>
              ) : (
                /* ─── JOIN / RESCHEDULE VIEW ─── */
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                    <div>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: isNow ? 'rgba(92,139,116,0.1)' : 'rgba(252,181,70,0.12)', border: `1px solid ${isNow ? 'rgba(92,139,116,0.25)' : 'rgba(252,181,70,0.3)'}`, borderRadius: 99, padding: '3px 10px', marginBottom: 10 }}>
                        {isNow ? (
                          <><motion.span animate={{ opacity: [1,0.2,1] }} transition={{ duration: 1.4, repeat: Infinity }} style={{ width: 6, height: 6, borderRadius: '50%', background: '#5C8B74', display: 'inline-block' }} />
                          <span style={{ color: '#3D6B58', fontSize: '11px', fontWeight: 700 }}>Live now</span></>
                        ) : (
                          <span style={{ color: '#A85520', fontSize: '11px', fontWeight: 700 }}>Starting soon</span>
                        )}
                      </span>
                      <h2 style={{ color: '#1A2820', fontWeight: 900, fontSize: '24px', letterSpacing: '-0.8px', marginBottom: 4 }}>Care team call</h2>
                      <p style={{ color: 'rgba(26,40,32,0.45)', fontSize: '14px' }}>Scheduled for {scheduledStr}</p>
                    </div>
                    <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(92,139,116,0.15),rgba(92,139,116,0.05))', border: '1.5px solid rgba(92,139,116,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Video size={22} color="#5C8B74" />
                    </div>
                  </div>

                  <motion.button whileTap={{ scale: 0.97, y: 1 }} transition={spring} onClick={() => setActiveCall(upcomingAppt)}
                    style={{ width: '100%', background: 'linear-gradient(135deg,#5C8B74,#3D6B58)', color: 'white', fontWeight: 800, fontSize: '16px', padding: '18px', borderRadius: '16px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 8px 28px rgba(92,139,116,0.3)', marginBottom: 10 }}>
                    <Video size={18} />
                    Join meeting
                  </motion.button>

                  <motion.button whileTap={{ scale: 0.97, y: 1 }} transition={spring} onClick={() => setShowReschedule(true)}
                    style={{ width: '100%', background: 'rgba(26,40,32,0.04)', color: 'rgba(26,40,32,0.55)', fontWeight: 700, fontSize: '15px', padding: '16px', borderRadius: '14px', border: '1.5px solid rgba(26,40,32,0.08)', cursor: 'pointer' }}>
                    Reschedule
                  </motion.button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
