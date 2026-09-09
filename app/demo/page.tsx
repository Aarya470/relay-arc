'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Play, ArrowLeft, Check } from 'lucide-react'
import Mark from '@/components/Mark'
import { DEMO, setDemo, demoOn } from '@/lib/demo'
import { supabase } from '@/lib/supabase'

const T1 = '#141413'
const T2 = '#5C5A52'
const T3 = '#6F6D65'
const BORDER = '#98C890'
const RED = '#A33417'
const GREEN = '#42623C'
const MONO = 'var(--font-mono, monospace)'

export default function DemoLauncher() {
  const router = useRouter()
  const [on, setOn] = useState(false)
  const [signedIn, setSignedIn] = useState<boolean | null>(null)

  useEffect(() => {
    setOn(demoOn())
    supabase.auth.getSession().then(({ data: { session } }) => setSignedIn(!!session))
  }, [])

  const toggle = (next: boolean) => { setDemo(next); setOn(next) }

  return (
    <div style={{ minHeight: '100dvh', background: '#B3DDAC', padding: '0 24px' }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '3px', background: T1, zIndex: 10 }}/>
      <div style={{ maxWidth: '460px', margin: '0 auto', paddingTop: '64px', paddingBottom: '60px' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '44px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <Mark size={26} />
            <span style={{ color: T1, fontWeight: 800, fontSize: '15.5px', letterSpacing: '-0.4px' }}>Relay Arc</span>
          </div>
          <button onClick={() => router.push('/')}
            style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: T3, fontSize: '13px', fontWeight: 500, fontFamily: 'inherit' }}>
            <ArrowLeft size={14}/> Home
          </button>
        </div>

        <div style={{ borderTop: `3px solid ${T1}`, paddingTop: '14px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: T1, fontFamily: MONO, fontSize: '11px', fontWeight: 700, letterSpacing: '1.8px', textTransform: 'uppercase' }}>Demo mode</span>
          <span style={{ color: T3, fontFamily: MONO, fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' }}>{DEMO.label}</span>
        </div>
        <h1 style={{ color: T1, fontSize: '32px', fontWeight: 800, letterSpacing: '-1.1px', lineHeight: 1.06, marginBottom: '12px' }}>
          Run a full emergency, indoors<span style={{ color: RED }}>.</span>
        </h1>
        <p style={{ color: T2, fontSize: '15px', lineHeight: 1.65, marginBottom: '30px' }}>
          A live demo can&apos;t rely on GPS in a conference room or a hospital being nearby.
          Demo mode pins the scenario to a Mumbai corridor and simulates the drive — everything
          else runs for real: hospital ranking, the ER brief, Guardian escalation, the Relay Room,
          and the CPR coach.
        </p>

        <p style={{ color: T3, fontFamily: MONO, fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '4px' }}>
          What is simulated
        </p>
        <div style={{ borderTop: `1px solid ${BORDER}`, marginBottom: '28px' }}>
          {[
            ['Your location', 'Fixed to Andheri East instead of device GPS'],
            ['Candidate hospitals', 'Three real Mumbai cardiac centres, real coordinates'],
            ['The drive', 'Position advances along the real route at ~50 km/h'],
            ['Everything else', 'Genuinely live. Routing, records, alerts, realtime room'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', gap: '14px', padding: '12px 0', borderBottom: `1px solid ${BORDER}`, alignItems: 'baseline' }}>
              <span style={{ color: T1, fontSize: '13.5px', fontWeight: 700, width: '150px', flexShrink: 0 }}>{k}</span>
              <span style={{ color: T2, fontSize: '13.5px', lineHeight: 1.5 }}>{v}</span>
            </div>
          ))}
        </div>

        <button onClick={() => toggle(!on)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', background: on ? 'rgba(86,128,78,0.06)' : 'none',
            border: `1.5px solid ${on ? GREEN : BORDER}`, borderRadius: '12px',
            padding: '15px 18px', cursor: 'pointer', fontFamily: 'inherit', marginBottom: '12px',
          }}>
          <span style={{ color: on ? GREEN : T1, fontWeight: 700, fontSize: '15px' }}>
            {on ? 'Demo mode is ON for this tab' : 'Demo mode is off'}
          </span>
          <span style={{
            width: '24px', height: '24px', borderRadius: '8px', flexShrink: 0,
            background: on ? GREEN : 'none', border: `1.5px solid ${on ? GREEN : '#C9CED6'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {on && <Check size={14} color="white" strokeWidth={3}/>}
          </span>
        </button>

        <button
          onClick={() => { setDemo(true); router.push('/emergency') }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', width: '100%', background: RED, color: 'white', fontWeight: 800, fontSize: '17px', padding: '18px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', minHeight: '58px' }}>
          <Play size={18}/> Start the demo emergency
        </button>

        {signedIn === false && (
          <p style={{ color: RED, fontSize: '13px', lineHeight: 1.6, marginTop: '14px' }}>
            You are not signed in — sign in first so the demo can use a real medical profile,
            the ER brief and the care-team alert.
          </p>
        )}

        <p style={{ color: T3, fontSize: '12px', lineHeight: 1.65, marginTop: '18px' }}>
          Demo mode lives in this browser tab only (sessionStorage) and every screen shows a DEMO
          badge, so it can never be mistaken for a real emergency. Close the tab to clear it.
        </p>
      </div>
    </div>
  )
}
