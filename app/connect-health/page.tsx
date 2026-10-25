'use client'
// /connect-health — get Apple Watch readings into Relay Arc with nothing to upload.
//
// A website cannot read Apple Health directly; Apple only allows that for apps
// installed on the iPhone. So the iPhone pushes the readings to us instead:
//   1. Health Auto Export (App Store) has a REST automation that posts new
//      watch readings to a URL every hour in the background. Setup is pasting
//      one link. Its automations need the app's premium tier or free trial.
//   2. Free alternative: an Apple Shortcuts personal automation that posts the
//      latest heart rate (and optionally oxygen and breathing) on a schedule.
// Both post to /api/health/ingest with the person's own key in the link. The
// route accepts either format (lib/health/ingest-parse.ts). Readings land in
// vitals_logs with source 'apple_health' and feed the NEWS2 sheet.
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Copy, Check, RefreshCw, Watch } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { SITE_URL } from '@/lib/site'

const PAGE = '#B3DDAC', T1 = '#141413', T2 = '#3F3D36', T3 = '#6E6B5D', LINE = '#E4E2DA', GREEN = '#3B5E35'
const panel: React.CSSProperties = { background: '#FFFFFF', border: '1px solid rgba(20,20,19,0.14)', borderRadius: '10px', padding: '18px', marginBottom: '14px' }
const h2: React.CSSProperties = { fontSize: '19px', fontWeight: 700, color: T1, margin: 0 }
const btn = (primary: boolean): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'center',
  background: primary ? T1 : '#FFFFFF', color: primary ? '#FFFFFF' : T1, border: `1.5px solid ${T1}`,
  borderRadius: '8px', padding: '11px 16px', minHeight: '46px', fontWeight: 700, fontSize: '15px', cursor: 'pointer', fontFamily: 'inherit',
})

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol style={{ margin: '10px 0 0', paddingLeft: '20px', color: T2, fontSize: '15px', lineHeight: 1.55 }}>
      {items.map((it, i) => <li key={i} style={{ marginBottom: '8px' }}>{it}</li>)}
    </ol>
  )
}

export default function ConnectHealth() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [last, setLast] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const loadStatus = async (uid: string) => {
    const { data } = await supabase.from('vitals_logs').select('logged_at, created_at').eq('user_id', uid)
      .eq('source', 'apple_health').order('created_at', { ascending: false }).limit(1)
    setLast(data?.[0] ? new Date(data[0].created_at || data[0].logged_at) : null)
  }

  useEffect(() => {
    let iv: ReturnType<typeof setInterval> | undefined
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('health_ingest_token').eq('id', user.id).single()
      if (profile?.health_ingest_token) setToken(profile.health_ingest_token)
      else {
        const t = crypto.randomUUID().replace(/-/g, '')
        const { error } = await supabase.from('profiles').update({ health_ingest_token: t }).eq('id', user.id)
        if (!error) setToken(t)
      }
      await loadStatus(user.id)
      setLoading(false)
      // keep checking while the page is open, so the first sync shows up live
      iv = setInterval(() => loadStatus(user.id), 10000)
    }
    load()
    return () => { if (iv) clearInterval(iv) }
  }, [])

  const origin = typeof window !== 'undefined' ? window.location.origin : SITE_URL
  const link = token ? `${origin}/api/health/ingest?key=${token}` : ''

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    catch { toast.error('Could not copy. Press and hold the link to copy it') }
  }
  const newKey = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const t = crypto.randomUUID().replace(/-/g, '')
    const { error } = await supabase.from('profiles').update({ health_ingest_token: t }).eq('id', user.id)
    if (!error) { setToken(t); toast.success('New link made. The old one no longer works, so paste the new one into your app') }
  }

  return (
    <div style={{ background: PAGE, minHeight: '100dvh' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px 16px 64px' }}>
        <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: T1, fontWeight: 600, fontSize: '15px', cursor: 'pointer', padding: '6px 0', fontFamily: 'inherit' }}>
          <ArrowLeft size={17}/> Back
        </button>

        <div style={{ margin: '14px 0 18px' }}>
          <h1 style={{ color: T1, fontSize: '30px', fontWeight: 800, letterSpacing: '-0.4px', lineHeight: 1.15, margin: '0 0 8px' }}>Connect Apple Watch</h1>
          <p style={{ color: T2, fontSize: '16px', lineHeight: 1.55, margin: 0 }}>
            Set this up once and your watch&apos;s heart rate, breathing rate, blood oxygen and blood pressure arrive in Relay Arc by
            themselves, about every hour. Nothing to export or upload. They go straight into your NEWS2 sheet.
          </p>
        </div>

        {/* status */}
        <section style={{ ...panel, display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Watch size={24} color={last ? GREEN : T3}/>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '16px', fontWeight: 700, color: last ? GREEN : T1 }}>{loading ? 'Checking…' : last ? 'Connected' : 'Not connected yet'}</p>
            <p style={{ fontSize: '14px', color: T3 }}>
              {last ? `Last reading arrived ${last.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : 'This updates by itself as soon as the first reading arrives.'}
            </p>
          </div>
        </section>

        {/* link */}
        <section style={panel}>
          <h2 style={h2}>Your sync link</h2>
          <p style={{ fontSize: '14px', color: T3, margin: '4px 0 10px' }}>This link is private to you, like a password. Paste it into one of the apps below.</p>
          <div style={{ fontFamily: 'inherit', fontSize: '12.5px', color: T1, background: '#FBFAF6', border: `1px solid ${LINE}`, borderRadius: '6px', padding: '10px 12px', wordBreak: 'break-all' }}>
            {link || '…'}
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
            <button style={btn(true)} onClick={copy} disabled={!link}>{copied ? <Check size={17}/> : <Copy size={17}/>} {copied ? 'Copied' : 'Copy link'}</button>
            <button style={btn(false)} onClick={newKey}><RefreshCw size={16}/> Make a new link</button>
          </div>
        </section>

        {/* option 1 */}
        <section style={panel}>
          <h2 style={h2}>Easiest: Health Auto Export</h2>
          <p style={{ fontSize: '14px', color: T3, margin: '4px 0 0' }}>About two minutes, then it runs in the background. Automatic syncing needs the app&apos;s premium tier or its free trial.</p>
          <Steps items={[
            <>Install <strong>Health Auto Export – JSON+CSV</strong> from the App Store and allow it to read Health.</>,
            <>Open <strong>Automations</strong>, tap <strong>New Automation</strong>, choose <strong>REST API</strong>.</>,
            <>Paste your sync link into <strong>URL</strong>.</>,
            <>Data type <strong>Health Metrics</strong>. Select <strong>Heart Rate</strong>, <strong>Respiratory Rate</strong>, <strong>Blood Oxygen Saturation</strong> and <strong>Blood Pressure</strong>.</>,
            <>Export format <strong>JSON</strong>, version <strong>2</strong>, date range <strong>Since Last Sync</strong>, sync every <strong>1 hour</strong>.</>,
            <>Tap <strong>Manual Export</strong> once. The box at the top of this page turns green.</>,
          ]}/>
        </section>

        {/* option 2 */}
        <section style={panel}>
          <h2 style={h2}>Free: Apple Shortcuts</h2>
          <p style={{ fontSize: '14px', color: T3, margin: '4px 0 0' }}>Sends your latest heart rate on a schedule you choose. Uses only Apple&apos;s own apps.</p>
          <Steps items={[
            <>In <strong>Shortcuts</strong>, tap <strong>+</strong>. Add <strong>Find Health Samples</strong>: type Heart Rate, sort by Start Date, Latest First, limit 1.</>,
            <>Add <strong>Get Details of Health Sample</strong> and choose <strong>Value</strong>.</>,
            <>Add <strong>Get Contents of URL</strong>. Paste your sync link, set Method to <strong>POST</strong>, Request Body <strong>JSON</strong>, and add a field <code>heart_rate</code> set to <strong>Value</strong>.</>,
            <>Optional: repeat for Oxygen Saturation (field <code>oxygen_sat</code>) and Respiratory Rate (<code>resp_rate</code>).</>,
            <>Go to <strong>Automation</strong>, tap <strong>+</strong>, <strong>Time of Day</strong>, pick a time, choose this shortcut and <strong>Run Immediately</strong>. Add more times if you want more updates.</>,
          ]}/>
        </section>

        <p style={{ fontSize: '13px', color: T3, lineHeight: 1.55 }}>
          Why a link and not a button: Apple only lets apps installed on the iPhone read Health data, and Relay Arc runs in the browser
          so it works on any phone. A native iPhone app, which would connect with a single tap, is planned.
        </p>
      </div>
    </div>
  )
}
