'use client'
import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, ArrowLeft, Check, X, AlertTriangle } from 'lucide-react'
import Mark from '@/components/Mark'
import { useRouter } from 'next/navigation'

const T1 = '#FFFFFF'
const T2 = '#FFFFFF'
const T3 = '#C8D4C9'
const BORDER = '#7EB382'
const RED = '#A33417'
const GREEN = '#42623C'
const AMBER = '#7C5200'
const MONO = 'var(--font-mono, monospace)'

interface Check { name: string; group: string; ok: boolean; ms: number | null; detail: string; critical: boolean }

export default function StatusPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/status', { cache: 'no-store' })
      setData(await res.json())
    } catch { setData({ overall: 'unreachable', checks: [] }) }
    setLoading(false)
  }, [])

  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t) }, [load])

  const groups: string[] = data?.checks ? Array.from(new Set((data.checks as Check[]).map(c => c.group))) : []
  const operational = data?.overall === 'operational'

  return (
    <div style={{ minHeight: '100dvh', background: '#4B8150' }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '3px', background: '#D97757', zIndex: 10 }}/>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '64px 24px 80px' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '44px' }}>
          <button onClick={() => router.push('/')}
            style={{ display: 'flex', alignItems: 'center', gap: '9px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <Mark size={26} />
            <span style={{ color: T1, fontWeight: 800, fontSize: '15.5px', letterSpacing: '-0.4px' }}>Relay Arc</span>
          </button>
          <button onClick={() => router.push('/')}
            style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: T3, fontSize: '13px', fontWeight: 500, fontFamily: 'inherit' }}>
            <ArrowLeft size={14}/> Home
          </button>
        </div>

        <div style={{ borderTop: `3px solid ${T1}`, paddingTop: '14px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ color: T1, fontFamily: MONO, fontSize: '11px', fontWeight: 700, letterSpacing: '1.8px', textTransform: 'uppercase' }}>System status</span>
          <button onClick={load}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: T3, fontFamily: MONO, fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer' }}>
            <RefreshCw size={11} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}/>
            {data?.checkedAt ? new Date(data.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'checking'}
          </button>
        </div>

        <h1 style={{ color: T1, fontSize: 'clamp(30px, 5vw, 44px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.02, marginBottom: '10px' }}>
          {loading && !data ? 'Checking every dependency' : operational ? 'All critical systems operational' : 'Degraded. A critical dependency is down'}
          <span style={{ color: operational ? GREEN : RED }}>.</span>
        </h1>
        <p style={{ color: T2, fontSize: '15px', lineHeight: 1.65, marginBottom: '38px' }}>
          Every external service an emergency depends on, checked live from the server. Refreshes each minute.
        </p>

        {groups.map(g => (
          <div key={g} style={{ marginBottom: '30px' }}>
            <p style={{ color: T3, fontFamily: MONO, fontSize: '10px', fontWeight: 700, letterSpacing: '1.6px', textTransform: 'uppercase', marginBottom: '4px' }}>{g}</p>
            <div style={{ borderTop: `1px solid ${T1}` }}>
              {(data.checks as Check[]).filter(c => c.group === g).map(c => (
                <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '13px 0', borderBottom: `1px solid ${BORDER}` }}>
                  <span style={{
                    width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0,
                    background: c.ok ? GREEN : c.critical ? RED : AMBER,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {c.ok ? <Check size={12} color="white" strokeWidth={3}/>
                          : c.critical ? <X size={12} color="white" strokeWidth={3}/>
                          : <AlertTriangle size={11} color="white" strokeWidth={2.5}/>}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: T1, fontSize: '14.5px', fontWeight: 700 }}>
                      {c.name}
                      {!c.critical && <span style={{ color: T3, fontSize: '11px', fontWeight: 500, marginLeft: '8px' }}>optional</span>}
                    </p>
                    <p style={{ color: c.ok ? T3 : (c.critical ? RED : AMBER), fontSize: '12.5px', marginTop: '2px' }}>{c.detail}</p>
                  </div>
                  {c.ms != null && (
                    <span style={{ color: c.ms > 1500 ? AMBER : T3, fontFamily: MONO, fontSize: '12px', flexShrink: 0 }}>{c.ms} ms</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <p style={{ color: T3, fontSize: '12px', lineHeight: 1.7, borderTop: `1px solid ${BORDER}`, paddingTop: '18px' }}>
          Optional checks are graceful-degradation paths: without live traffic Relay uses a time-of-day
          model, and without partner facilities it still routes on capability and drive time. Configuration
          rows report presence only. No key material is ever returned.
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
