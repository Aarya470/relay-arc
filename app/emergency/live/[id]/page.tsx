'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Phone, CheckCircle, AlertCircle, Loader2, Plus, Check, QrCode } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { emergencyNumber } from '@/lib/emergency-number'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import qrgen from 'qrcode-generator'

const T1 = '#141413'
const T2 = '#5C5A52'
const T3 = '#8A8780'
const BORDER = '#E5E2D9'
const ACCENT = '#5F7049'
const RED = '#A33417'
const GREEN = '#5F7049'
const MONO = 'var(--font-mono, monospace)'

const EMERGENCY_LABELS: Record<string, string> = {
  chest_pain: 'Chest pain',
  stroke: 'Stroke signs',
  pots: 'POTS episode',
  mecfs: 'Severe crash',
  breathing: "Can't breathe",
  unconscious: 'Unconscious',
  other: 'Emergency',
}

interface EmergencyData {
  id: string
  type: string
  status: 'active' | 'resolved'
  startedAt: string
  patientFirstName: string
}
interface Evt { t: string; label: string }
interface Task { id: string; text: string; by: string; claimedBy?: string; done?: boolean }
interface Loc { lat: number; lng: number; ts: number; hName?: string; hLat?: number | null; hLng?: number | null }

export default function RelayRoomPage() {
  const params = useParams()
  const [emg, setEmg] = useState({ number: '911', label: '911' })
  useEffect(() => { setEmg(emergencyNumber()) }, [])
  const id = params?.id as string

  const [data, setData] = useState<EmergencyData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [joined, setJoined] = useState(false)
  const [people, setPeople] = useState<{ role: string; name: string }[]>([])
  const [timeline, setTimeline] = useState<Evt[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [taskInput, setTaskInput] = useState('')
  const [loc, setLoc] = useState<Loc | null>(null)
  const [elapsed, setElapsed] = useState('')
  const [showQr, setShowQr] = useState(false)

  const channelRef = useRef<any>(null)
  const tasksRef = useRef<Task[]>([])
  const timelineRef = useRef<Evt[]>([])
  const mapRef = useRef<maplibregl.Map | null>(null)
  const mapDiv = useRef<HTMLDivElement | null>(null)
  const patientMarker = useRef<maplibregl.Marker | null>(null)
  const hospMarker = useRef<maplibregl.Marker | null>(null)
  const fitted = useRef(false)
  tasksRef.current = tasks
  timelineRef.current = timeline

  // ── Seed + status polling (works even if realtime is unavailable) ──────────
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/emergency/live/${id}`)
      if (!res.ok) { setError('This emergency link is invalid or has expired.'); return }
      const json: EmergencyData = await res.json()
      setData(json)
      setError(null)
    } catch {
      setError('Unable to load emergency status. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (!id) return
    fetchStatus()
    const interval = setInterval(fetchStatus, 15000)
    return () => clearInterval(interval)
  }, [id, fetchStatus])

  useEffect(() => {
    if (!data) return
    const tick = () => {
      const s = Math.max(0, Math.floor((Date.now() - new Date(data.startedAt).getTime()) / 1000))
      setElapsed(`+${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`)
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [data])

  useEffect(() => {
    try { const n = localStorage.getItem('relay_viewer_name'); if (n) setName(n) } catch {}
  }, [])

  const mergeEvts = (incoming: Evt[]) => {
    setTimeline(prev => {
      const seen = new Set(prev.map(e => e.t + e.label))
      const merged = [...prev]
      incoming.forEach(e => { if (!seen.has(e.t + e.label)) merged.push(e) })
      return merged.sort((a, b) => a.t.localeCompare(b.t))
    })
  }

  // ── Join the room ───────────────────────────────────────────────────────────
  const join = () => {
    if (!name.trim() || !id) return
    try { localStorage.setItem('relay_viewer_name', name.trim()) } catch {}
    setJoined(true)

    const ch = supabase.channel(`relay-room-${id}`, {
      config: { broadcast: { self: true }, presence: { key: `v-${Math.random().toString(36).slice(2, 8)}` } },
    })
    channelRef.current = ch

    ch.on('broadcast', { event: 'loc' }, ({ payload }) => setLoc(payload as Loc))
    ch.on('broadcast', { event: 'evt' }, ({ payload }) => mergeEvts([payload as Evt]))
    ch.on('broadcast', { event: 'tasks' }, ({ payload }) => setTasks((payload as any).list || []))
    ch.on('broadcast', { event: 'sync' }, ({ payload }) => {
      const p = payload as any
      if (p.timeline?.length) mergeEvts(p.timeline)
      if (p.loc) setLoc(p.loc)
      if (p.tasks?.length && tasksRef.current.length === 0) setTasks(p.tasks)
    })
    ch.on('broadcast', { event: 'sync-req' }, () => {
      if (tasksRef.current.length || timelineRef.current.length) {
        setTimeout(() => {
          ch.send({ type: 'broadcast', event: 'sync', payload: { timeline: timelineRef.current.slice(-30), tasks: tasksRef.current } })
        }, Math.random() * 400)
      }
    })
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState() as Record<string, any[]>
      const list: { role: string; name: string }[] = []
      Object.values(state).forEach(metas => metas.forEach((m: any) => list.push({ role: m.role || 'viewer', name: m.name || 'Someone' })))
      setPeople(list)
    })
    ch.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        ch.track({ role: 'viewer', name: name.trim() })
        ch.send({ type: 'broadcast', event: 'sync-req', payload: {} })
      }
    })
  }

  useEffect(() => () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }, [])

  // ── Map ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!joined || !loc || !mapDiv.current) return
    if (!mapRef.current) {
      const map = new maplibregl.Map({
        container: mapDiv.current,
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: [loc.lng, loc.lat],
        zoom: 13,
        attributionControl: false,
      })
      mapRef.current = map
      const pEl = document.createElement('div')
      pEl.innerHTML = `<div style="width:20px;height:20px;background:${ACCENT};border:3px solid white;border-radius:50%;box-shadow:0 0 0 5px rgba(120,140,93,0.22);"></div>`
      patientMarker.current = new maplibregl.Marker({ element: pEl }).setLngLat([loc.lng, loc.lat]).addTo(map)
    } else {
      patientMarker.current?.setLngLat([loc.lng, loc.lat])
    }
    const map = mapRef.current
    if (loc.hLat != null && loc.hLng != null && !hospMarker.current) {
      const hEl = document.createElement('div')
      hEl.innerHTML = `<div style="width:32px;height:32px;background:${RED};border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:white;border:2px solid white;font-family:monospace;">+</div>`
      hospMarker.current = new maplibregl.Marker({ element: hEl }).setLngLat([loc.hLng, loc.hLat]).addTo(map)
    }
    if (!fitted.current && loc.hLat != null && loc.hLng != null) {
      fitted.current = true
      const b = new maplibregl.LngLatBounds()
      b.extend([loc.lng, loc.lat]); b.extend([loc.hLng, loc.hLat])
      map.fitBounds(b, { padding: 48, duration: 600 })
    }
  }, [joined, loc])

  useEffect(() => () => { mapRef.current?.remove(); mapRef.current = null }, [])

  // ── Tasks ───────────────────────────────────────────────────────────────────
  const broadcastTasks = (list: Task[]) => {
    setTasks(list)
    channelRef.current?.send({ type: 'broadcast', event: 'tasks', payload: { list } })
  }
  const addTask = () => {
    if (!taskInput.trim()) return
    broadcastTasks([...tasksRef.current, { id: Math.random().toString(36).slice(2, 9), text: taskInput.trim(), by: name }])
    setTaskInput('')
  }
  const claimTask = (tid: string) => {
    broadcastTasks(tasksRef.current.map(t => t.id === tid ? { ...t, claimedBy: t.claimedBy === name ? undefined : name } : t))
  }
  const toggleDone = (tid: string) => {
    broadcastTasks(tasksRef.current.map(t => t.id === tid ? { ...t, done: !t.done } : t))
  }

  const qrSvg = (() => {
    if (!showQr || typeof window === 'undefined') return ''
    try {
      const qr = qrgen(0, 'M')
      qr.addData(window.location.href)
      qr.make()
      return qr.createSvgTag({ cellSize: 4, margin: 2 })
    } catch { return '' }
  })()

  const isActive = data?.status === 'active'
  const typeLabel = data ? (EMERGENCY_LABELS[data.type] ?? 'Emergency') : ''

  if (loading) return (
    <div style={{ minHeight: '100dvh', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
      <Loader2 size={22} color={ACCENT} className="animate-spin"/>
      <p style={{ color: T2, fontSize: '14px' }}>Opening the room…</p>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100dvh', background: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', padding: '24px', textAlign: 'center' }}>
      <AlertCircle size={36} color={RED}/>
      <p style={{ color: T1, fontSize: '15px', fontWeight: 600, maxWidth: '300px' }}>{error}</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', background: '#FFFFFF', maxWidth: '640px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Status bar */}
      <div style={{ padding: '13px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isActive ? RED : GREEN, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          {isActive ? (
            <motion.div animate={{ opacity: [1, 0.25, 1] }} transition={{ duration: 1.1, repeat: Infinity }}
              style={{ width: '8px', height: '8px', background: 'white' }}/>
          ) : <CheckCircle size={14} color="white"/>}
          <span style={{ color: 'white', fontFamily: MONO, fontSize: '10.5px', letterSpacing: '1.6px', textTransform: 'uppercase', fontWeight: 700 }}>
            {isActive ? `Live · ${typeLabel}` : 'Resolved — they are safe'}
          </span>
        </div>
        <span style={{ color: 'white', fontFamily: MONO, fontSize: '14px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {elapsed}
        </span>
      </div>

      {!joined ? (
        /* ── Join gate ── */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '32px 24px', maxWidth: '400px', margin: '0 auto', width: '100%' }}>
          <p style={{ color: T3, fontFamily: MONO, fontSize: '10px', fontWeight: 700, letterSpacing: '1.6px', textTransform: 'uppercase', marginBottom: '10px' }}>
            Relay room
          </p>
          <h1 style={{ color: T1, fontSize: '28px', fontWeight: 800, letterSpacing: '-0.9px', lineHeight: 1.1, marginBottom: '8px' }}>
            {data?.patientFirstName} needs you here<span style={{ color: RED }}>.</span>
          </h1>
          <p style={{ color: T2, fontSize: '14.5px', lineHeight: 1.6, marginBottom: '28px' }}>
            Join to see their live location, what&apos;s happening, and how you can help — together with everyone else.
          </p>
          <p style={{ color: T3, fontSize: '10.5px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', fontFamily: MONO, marginBottom: '8px' }}>Your name</p>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && join()}
            placeholder="Raj"
            style={{ width: '100%', background: '#FFFFFF', border: `1.5px solid ${BORDER}`, borderRadius: '10px', padding: '13px 16px', color: T1, fontSize: '15px', outline: 'none', fontFamily: 'inherit', marginBottom: '12px' }}
          />
          <button onClick={join} disabled={!name.trim()}
            style={{ width: '100%', background: T1, color: 'white', fontWeight: 600, fontSize: '15px', padding: '15px', borderRadius: '11px', border: 'none', cursor: name.trim() ? 'pointer' : 'default', opacity: name.trim() ? 1 : 0.5, fontFamily: 'inherit', minHeight: '52px' }}>
            Join the room
          </button>
        </div>
      ) : (
        <>
          {/* ── Map ── */}
          <div style={{ height: '240px', flexShrink: 0, borderBottom: `1px solid ${BORDER}`, position: 'relative', background: '#E8EAED' }}>
            <div ref={mapDiv} style={{ position: 'absolute', inset: 0 }}/>
            {!loc && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <Loader2 size={16} color={T3} className="animate-spin"/>
                <p style={{ color: T2, fontSize: '13px' }}>Waiting for their live location…</p>
              </div>
            )}
            {loc?.hName && (
              <div style={{ position: 'absolute', bottom: '10px', left: '10px', right: '10px', background: 'rgba(255,255,255,0.95)', border: `1px solid ${BORDER}`, borderRadius: '10px', padding: '9px 13px', display: 'flex', alignItems: 'center', gap: '9px' }}>
                <span style={{ width: '14px', height: '14px', background: RED, borderRadius: '4px', color: 'white', fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, flexShrink: 0 }}>+</span>
                <p style={{ color: T1, fontSize: '12.5px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Heading to {loc.hName}
                </p>
              </div>
            )}
          </div>

          <div style={{ flex: 1, padding: '18px 20px 40px' }}>

            {/* ── Who's here ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '22px' }}>
              {people.map((p, i) => (
                <span key={i} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  background: p.role === 'patient' ? 'rgba(163,52,23,0.07)' : '#FAF9F5',
                  border: `1px solid ${p.role === 'patient' ? 'rgba(163,52,23,0.25)' : BORDER}`,
                  borderRadius: '8px', padding: '5px 10px',
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.role === 'patient' ? RED : GREEN }}/>
                  <span style={{ color: p.role === 'patient' ? RED : T1, fontSize: '12.5px', fontWeight: 600 }}>
                    {p.name}{p.role === 'patient' ? ' · patient' : ''}
                  </span>
                </span>
              ))}
              {people.length <= 1 && (
                <span style={{ color: T3, fontSize: '12.5px' }}>You&apos;re the first one here — share the link.</span>
              )}
            </div>

            {/* ── Live timeline ── */}
            <p style={{ color: T3, fontFamily: MONO, fontSize: '10px', fontWeight: 700, letterSpacing: '1.6px', textTransform: 'uppercase', marginBottom: '4px' }}>
              Live timeline
            </p>
            <div style={{ borderTop: `2px solid ${T1}`, marginBottom: '26px' }}>
              {timeline.length === 0 && (
                <p style={{ color: T3, fontSize: '13px', padding: '13px 0', borderBottom: `1px solid ${BORDER}` }}>
                  Waiting for live events from {data?.patientFirstName}&apos;s phone…
                </p>
              )}
              {timeline.map((e, i) => (
                <div key={i} style={{ display: 'flex', gap: '14px', padding: '11px 0', borderBottom: `1px solid ${BORDER}`, alignItems: 'baseline' }}>
                  <span style={{ color: T1, fontFamily: MONO, fontSize: '12px', fontWeight: 700, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                    {new Date(e.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span style={{ color: T2, fontSize: '13.5px', lineHeight: 1.5 }}>{e.label}</span>
                </div>
              ))}
            </div>

            {/* ── Shared tasks ── */}
            <p style={{ color: T3, fontFamily: MONO, fontSize: '10px', fontWeight: 700, letterSpacing: '1.6px', textTransform: 'uppercase', marginBottom: '4px' }}>
              How to help — shared with everyone
            </p>
            <div style={{ borderTop: `1px solid ${T1}`, marginBottom: '14px' }}>
              {tasks.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: `1px solid ${BORDER}` }}>
                  <button onClick={() => toggleDone(t.id)} aria-label="Toggle done"
                    style={{ width: '22px', height: '22px', borderRadius: '7px', flexShrink: 0, background: t.done ? GREEN : 'none', border: `1.5px solid ${t.done ? GREEN : '#C9CED6'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    {t.done && <Check size={13} color="white" strokeWidth={3}/>}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: t.done ? T3 : T1, fontSize: '14px', fontWeight: 600, textDecoration: t.done ? 'line-through' : 'none' }}>{t.text}</p>
                    <p style={{ color: T3, fontSize: '11.5px', marginTop: '1px' }}>
                      {t.claimedBy ? `${t.claimedBy} is on it` : `added by ${t.by}`}
                    </p>
                  </div>
                  {!t.done && (
                    <button onClick={() => claimTask(t.id)}
                      style={{ background: t.claimedBy === name ? 'rgba(120,140,93,0.08)' : 'none', border: `1.5px solid ${t.claimedBy === name ? ACCENT : BORDER}`, color: t.claimedBy === name ? ACCENT : T2, fontSize: '12px', fontWeight: 700, padding: '7px 12px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                      {t.claimedBy === name ? 'Mine' : t.claimedBy ? 'Taken' : 'I\u2019ll do it'}
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '30px' }}>
              <input
                value={taskInput}
                onChange={e => setTaskInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTask()}
                placeholder="Add something — 'bring her meds bag'"
                style={{ flex: 1, background: '#FFFFFF', border: `1.5px solid ${BORDER}`, borderRadius: '10px', padding: '12px 14px', color: T1, fontSize: '14px', outline: 'none', fontFamily: 'inherit' }}
              />
              <button onClick={addTask} aria-label="Add task"
                style={{ width: '46px', borderRadius: '10px', background: T1, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Plus size={17} color="white"/>
              </button>
            </div>

            {/* ── Footer actions ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <a href={`tel:${emg.number}`}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: RED, color: 'white', fontWeight: 800, fontSize: '16px', padding: '16px', borderRadius: '12px', textDecoration: 'none', minHeight: '54px' }}>
                <Phone size={17} strokeWidth={2.5}/> Call {emg.label}
              </a>
              <button onClick={() => setShowQr(q => !q)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'none', border: 'none', color: T2, fontSize: '13.5px', fontWeight: 600, padding: '10px', cursor: 'pointer', fontFamily: 'inherit' }}>
                <QrCode size={15}/> {showQr ? 'Hide QR' : 'Show QR — let others scan in'}
              </button>
              {showQr && qrSvg && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 12px' }}>
                  <div style={{ width: '176px', border: `1px solid ${BORDER}`, borderRadius: '10px', padding: '10px', background: 'white' }}
                    dangerouslySetInnerHTML={{ __html: qrSvg.replace('<svg ', '<svg style="width:100%;height:auto;display:block" ') }}/>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
