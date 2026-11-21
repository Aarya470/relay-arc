'use client'
// Homepage. Layout concepts borrowed from Amplitude's site (split hero, tabbed
// product showcase, logo row, a live demo beside its claim, a stat chart, a card
// row, a split close and a big dark footer), in Relay Arc's own colours.
import { useEffect, useId, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import FollowLinks from '@/components/FollowLinks'
import type { TriageResult } from '@/lib/triage'
import VideoEmbed from '@/components/VideoEmbed'
import { SearchButton } from '@/components/CommandPalette'

const LEAF = '#B3DDAC'
const MINT = '#E6F1E1'
const PAPER = '#F7F5EE'
const FOREST = '#1E3A23'
const INK = '#141413'
const INK2 = '#3F3D36'
const SOS = '#F07800'
const SOS_TEXT = '#7A3D00'
const GREEN = '#42623C'

const NAV: [string, string][] = [
  ['Features', '/features'],
  ['Engineering', '/engineering'],
  ['Partners', '/partners'],
  ['Sign in', '/login'],
]

// One chapter: a full width field of flat colour.
function Chapter({
  id,
  bg,
  fg,
  children,
  tall = true,
}: {
  id?: string
  bg: string
  fg: string
  children: React.ReactNode
  tall?: boolean
}) {
  return (
    <section id={id} className={tall ? 'ch ch-tall' : 'ch'} style={{ background: bg, color: fg }}>
      <div className="ch-in">{children}</div>
    </section>
  )
}

// Heading and paragraph on one side, the app on the other.
function Split({
  title,
  body,
  children,
  flip = false,
  action,
}: {
  title: string
  body: React.ReactNode
  children: React.ReactNode
  flip?: boolean
  action?: React.ReactNode
}) {
  return (
    <div className={flip ? 'split split-flip' : 'split'}>
      <div data-reveal>
        <h2 className="ds-title">{title}</h2>
        <p className="ds-lead" style={{ marginTop: '28px' }}>
          {body}
        </p>
        {action ? <div style={{ marginTop: '36px' }}>{action}</div> : null}
      </div>
      <div data-reveal className="split-media">
        <div>{children}</div>
      </div>
    </div>
  )
}

// The real signed in home screen, in a phone frame.
function PhoneHome() {
  return (
    <div className="phone" data-ui aria-label="The Relay Arc home screen on a phone">
      <span className="ph-btn ph-btn-l1" aria-hidden />
      <span className="ph-btn ph-btn-l2" aria-hidden />
      <span className="ph-btn ph-btn-r" aria-hidden />
      <div className="phone-screen">
        <div className="ph-status" aria-hidden>
          <span>9:41</span>
          <span className="ph-island" />
          <span className="ph-icons">
            <svg width="17" height="11" viewBox="0 0 17 11"><rect x="0" y="7" width="3" height="4" rx="0.7" /><rect x="4.6" y="5" width="3" height="6" rx="0.7" /><rect x="9.2" y="2.5" width="3" height="8.5" rx="0.7" /><rect x="13.8" y="0" width="3" height="11" rx="0.7" /></svg>
            <svg width="25" height="12" viewBox="0 0 25 12"><rect x="0.5" y="0.5" width="21" height="11" rx="3.2" fill="none" stroke="currentColor" opacity="0.4" /><rect x="2" y="2" width="15" height="8" rx="1.8" /><rect x="23" y="4" width="1.6" height="4" rx="0.8" opacity="0.45" /></svg>
          </span>
        </div>
        <div className="ph-body">
          <div className="ph-top">
            <img src="/logo-wordmark.png" alt="" style={{ height: '15px', width: 'auto' }} />
            <span style={{ display: 'flex', gap: '5px' }}>
              <span className="ph-chip">Search</span>
              <span className="ph-chip">Settings</span>
            </span>
          </div>
          <p style={{ fontSize: '10.5px', color: INK2, marginTop: '14px', fontWeight: 600 }}>Good morning · Fri, Nov 13</p>
          <p style={{ fontSize: '30px', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05 }}>Asha</p>
          <span className="ph-cond">POTS</span>
          <div className="ph-sos">
            <span style={{ fontSize: '44px', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 0.95 }}>SOS</span>
            <span style={{ fontSize: '11px', marginTop: '8px', lineHeight: 1.35 }}>Tap to start. Finds a hospital and sends your details.</span>
          </div>
          <div className="ph-tiles">
            <div className="ph-tile">
              <span style={{ fontSize: '12.5px', fontWeight: 700 }}>Daily check in</span>
              <span style={{ fontSize: '10px', opacity: 0.85 }}>Chat for 2 minutes</span>
            </div>
            <div className="ph-tile">
              <span style={{ fontSize: '12.5px', fontWeight: 700 }}>Vitals check</span>
              <span style={{ fontSize: '10px', opacity: 0.85 }}>Pulse and breathing</span>
            </div>
          </div>
          <div className="ph-list">
            <div className="ph-row">
              <span>
                <b>Emergency contacts</b>
                <i>2 contacts ready to text</i>
              </span>
              <span aria-hidden>›</span>
            </div>
            <div className="ph-row">
              <span>
                <b>Medical profile</b>
                <i>Conditions, medicines and allergies</i>
              </span>
              <span aria-hidden>›</span>
            </div>
          </div>
        </div>
        <div className="ph-dock" aria-hidden>
          <span className="on">Home</span>
          <span>Check in</span>
          <span className="ph-dock-sos">SOS</span>
          <span>Meds</span>
          <span>Symptoms</span>
        </div>
        <span className="ph-homebar" aria-hidden />
      </div>
    </div>
  )
}

// What the SOS screen says after someone types what is happening.
function SosScreen() {
  return (
    <div data-ui className="frag" style={{ background: PAPER, color: INK }}>
      <p style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 22px' }}>
        &ldquo;My dad has chest pain and he is sweating&rdquo;
      </p>
      <div style={{ background: MINT, padding: '18px 20px', borderRadius: 10 }}>
        <p style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em' }}>
          This may be a heart attack
        </p>
        <p className="ds-small" style={{ marginTop: '6px' }}>
          Worked out on the phone in under a second. No signal needed.
        </p>
      </div>
      <div style={{ background: SOS, color: INK, padding: '16px 24px', marginTop: '16px', fontWeight: 800, borderRadius: 999, textAlign: 'center' }}>
        Call 911 now
      </div>
    </div>
  )
}

// Example ranking for a trip from East Windsor. Drive times are illustrative.
function HospitalList() {
  const rows: [string, string, boolean][] = [
    ['RWJ University Hospital at Hamilton', '17 min', true],
    ['Penn Medicine Princeton Medical Center', '19 min', true],
    ['A closer emergency room', '12 min', false],
  ]
  return (
    <div data-ui className="frag" style={{ background: MINT, color: INK }}>
      {rows.map(([name, mins, ok], i) => (
        <div key={name} className="hosp" style={{ background: i === 0 ? PAPER : 'transparent' }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: '16px' }}>{name}</p>
            <p className="ds-small" style={{ color: ok ? GREEN : SOS_TEXT, fontWeight: 600 }}>
              {ok ? 'Has a heart unit' : 'No heart unit'}
            </p>
          </div>
          <span style={{ fontWeight: 800, fontSize: '18px', whiteSpace: 'nowrap' }}>{mins}</span>
        </div>
      ))}
      <p className="ds-small" style={{ marginTop: '12px', color: INK2 }}>Example trip from East Windsor</p>
    </div>
  )
}

// The text the family gets.
function FamilyText() {
  return (
    <div data-ui className="frag" style={{ background: PAPER, color: INK, maxWidth: '420px' }}>
      <div className="bubble">
        Asha pressed SOS. She is going to RWJ University Hospital at Hamilton. Follow her on the
        live map.
      </div>
      <div className="bubble" style={{ marginTop: '10px', fontWeight: 700, textDecoration: 'underline' }}>
        relay-arc.org/live
      </div>
      <div style={{ display: 'inline-block', borderRadius: 999, background: MINT, padding: '8px 16px', marginTop: '14px', fontSize: '14px', fontWeight: 600 }}>
        Hospital has her details
      </div>
    </div>
  )
}

// The one live thing: type and watch the card fill in.
function CardMaker() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [blood, setBlood] = useState('')
  const [allergy, setAllergy] = useState('')
  return (
    <div className="maker">
      <div className="maker-form">
        <label className="fld">
          <span>Your name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Asha Patel" maxLength={40} />
        </label>
        <label className="fld">
          <span>Blood type</span>
          <select value={blood} onChange={(e) => setBlood(e.target.value)}>
            <option value="">Choose</option>
            {['O+', 'O−', 'A+', 'A−', 'B+', 'B−', 'AB+', 'AB−'].map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </label>
        <label className="fld">
          <span>Allergies</span>
          <input value={allergy} onChange={(e) => setAllergy(e.target.value)} placeholder="Penicillin" maxLength={60} />
        </label>
        <button className="pill pill-ink" onClick={() => router.push('/card')} style={{ marginTop: '8px' }}>
          Make my full card
        </button>
      </div>
      <div data-ui className="idcard" aria-live="polite">
        <p style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 20px', minHeight: '34px' }}>
          {name || 'Your name'}
        </p>
        <div style={{ display: 'flex', gap: '32px' }}>
          <div>
            <p className="ds-small" style={{ color: INK2 }}>Blood type</p>
            <p style={{ fontSize: '40px', fontWeight: 800, color: SOS_TEXT, lineHeight: 1.1 }}>{blood || 'Add'}</p>
          </div>
          <div>
            <p className="ds-small" style={{ color: INK2 }}>Allergies</p>
            <p style={{ fontSize: '18px', fontWeight: 700, marginTop: '8px' }}>{allergy || 'None added'}</p>
          </div>
        </div>
        <p className="ds-small" style={{ marginTop: '22px', color: INK2 }}>Saved on this phone only</p>
      </div>
    </div>
  )
}

// A finished pulse check.
function PulseReadout() {
  const rows: [string, string][] = [
    ['Pulse', '72 a minute'],
    ['Breathing', '16 a minute'],
    ['NEWS2 score', '0, low risk'],
  ]
  return (
    <div data-ui className="frag" style={{ background: PAPER, color: INK }}>
      {rows.map(([k, v]) => (
        <div key={k} className="hosp">
          <span style={{ fontWeight: 600 }}>{k}</span>
          <span style={{ fontWeight: 800, fontSize: '18px' }}>{v}</span>
        </div>
      ))}
      <p className="ds-small" style={{ marginTop: '12px', color: INK2 }}>Camera and motion sensor, 15 seconds</p>
    </div>
  )
}

const PARTNERS: [string, string][] = [
  ['BBSCA', 'A nonprofit that has raised over $1.2M for STEM and humanitarian causes. It has shared Relay Arc with more than 4,000 people.'],
  ['Aerox Labs', 'An AI startup that reviewed our models and how we test them.'],
  ['East Windsor Board of Education', 'Talking with us about bringing Relay Arc into the district. This is not a formal partnership yet.'],
]

const TRIAGE_LABEL: Record<string, string> = {
  chest_pain: 'Possible heart attack',
  breathing: 'Breathing emergency',
  stroke: 'Possible stroke',
  unconscious: 'Unconscious',
  pots: 'POTS or fainting episode',
  mecfs: 'Severe ME/CFS crash',
  other: 'Other emergency',
}
const TRIAGE_UNIT: Record<string, string> = {
  chest_pain: 'a heart unit',
  stroke: 'a stroke unit',
}

const EXAMPLES = [
  'My dad has chest pain and he is sweating',
  'Mi hija no puede respirar',
  'Her face is drooping on one side',
  'My heart is racing and I feel faint when I stand',
]

// The live thing: the real on phone model, loaded only when someone uses it.
function TryTriage() {
  const [text, setText] = useState('')
  const [res, setRes] = useState<TriageResult | null>(null)
  const [busy, setBusy] = useState(false)
  const mod = useRef<null | ((t: string) => TriageResult)>(null)

  const run = async (t: string) => {
    const q = t.trim()
    if (q.length < 3) return
    setText(q)
    setBusy(true)
    if (!mod.current) mod.current = (await import('@/lib/triage')).triage
    setRes(mod.current(q))
    setBusy(false)
  }

  return (
    <div className="try">
      <div className="try-left">
        <h2 className="h2">Say it however it comes out</h2>
        <p className="lead">
          Type what is happening the way you would say it in a panic. The model on your phone
          decides in under a millisecond, with no signal. Try it, nothing is sent anywhere.
        </p>
        <div className="try-chips">
          {EXAMPLES.map((e) => (
            <button key={e} className="try-chip" onClick={() => run(e)}>
              &ldquo;{e}&rdquo;
            </button>
          ))}
        </div>
      </div>
      <div className="try-panel" data-ui>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            run(text)
          }}
          className="try-form"
        >
          <label htmlFor="try-in" className="sr-only">Describe an emergency</label>
          <input
            id="try-in"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Describe what is happening"
            maxLength={160}
          />
          <button type="submit" className="pill pill-ink" disabled={busy || text.trim().length < 3}>
            Check
          </button>
        </form>
        <div className="try-out" aria-live="polite">
          {!res ? (
            <p className="try-empty">Pick an example or type your own.</p>
          ) : res.abstain ? (
            <>
              <p className="try-k">Not sure enough to decide alone</p>
              <p className="try-big">Asks for help</p>
              <p className="try-note">
                In the app this goes to a second, online check, and you can always tap the right one yourself.
              </p>
            </>
          ) : (
            <>
              <p className="try-k">Decided on this device in {res.ms.toFixed(2)} ms</p>
              <p className="try-big">{TRIAGE_LABEL[res.type] || res.type}</p>
              <div className="try-meter" aria-label={`${Math.round(res.confidence * 100)} percent sure`}>
                <span style={{ width: `${Math.round(res.confidence * 100)}%` }} />
              </div>
              <p className="try-note">
                {Math.round(res.confidence * 100)}% sure, because of: {res.evidence.slice(0, 4).join(', ')}. Next it
                would rank hospitals that have {TRIAGE_UNIT[res.type] || 'a full emergency room'} by real drive time.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

type Tab = { id: string; label: string; title: string; body: string; view: React.ReactNode }

// The product, one screen at a time, in a tab strip.
function Showcase() {
  const tabs: Tab[] = [
    { id: 'sos', label: 'Press SOS', title: 'It works out what is wrong', body: 'Speak or type in English, Spanish, Hindi or Marathi. The answer comes from the phone itself, so it works in a dead zone.', view: <SosScreen /> },
    { id: 'hosp', label: 'Right hospital', title: 'The right hospital, not just the closest', body: 'Hospitals are ranked by real drive time and whether they can treat this emergency. A closer one without a heart unit moves down.', view: <HospitalList /> },
    { id: 'family', label: 'Family knows', title: 'Your family knows where you are going', body: 'One tap sends a text that is already written, with the hospital and directions. The hospital gets your details before you arrive.', view: <FamilyText /> },
    { id: 'vitals', label: 'Pulse check', title: 'Pulse and breathing from the phone', body: 'Fingertip on the camera, phone on the chest. Fifteen seconds each, scored with NEWS2, the scale hospitals use.', view: <PulseReadout /> },
    { id: 'card', label: 'Emergency card', title: 'A card a paramedic can read', body: 'Type below and watch it fill in. The full card works on a locked phone and prints for a wallet. Nothing is uploaded.', view: <CardMaker /> },
  ]
  const [on, setOn] = useState(0)
  const base = useId()
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const move = (i: number) => {
    const n = (i + tabs.length) % tabs.length
    setOn(n)
    refs.current[n]?.focus()
  }
  const t = tabs[on]
  return (
    <section className="show" aria-label="What Relay Arc does">
      <div className="tabs" role="tablist" aria-label="Parts of the app">
        {tabs.map((x, i) => (
          <button
            key={x.id}
            ref={(el) => {
              refs.current[i] = el
            }}
            role="tab"
            id={`${base}-t-${x.id}`}
            aria-selected={on === i}
            aria-controls={`${base}-p-${x.id}`}
            tabIndex={on === i ? 0 : -1}
            className="tab"
            data-on={on === i}
            onClick={() => setOn(i)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') move(i + 1)
              if (e.key === 'ArrowLeft') move(i - 1)
            }}
          >
            {x.label}
          </button>
        ))}
      </div>
      <div
        className="show-stage"
        role="tabpanel"
        id={`${base}-p-${t.id}`}
        aria-labelledby={`${base}-t-${t.id}`}
        key={t.id}
      >
        <div className="show-copy">
          <h3 className="h3">{t.title}</h3>
          <p className="body">{t.body}</p>
        </div>
        <div className="show-view">{t.view}</div>
      </div>
    </section>
  )
}

// Where it runs, and in which languages.
function WorksWhere() {
  const [mode, setMode] = useState<'devices' | 'languages'>('devices')
  const devices: [string, string][] = [
    ['iPhone', 'Safari, no download'],
    ['Android', 'Chrome, no download'],
    ['Home screen', 'Add it like an app'],
    ['Apple Watch', 'Readings arrive by themselves'],
    ['Lock screen', 'Your card as a picture'],
    ['Wallet', 'A printed card'],
  ]
  const langs: [string, string][] = [
    ['English', 'Voice and typing'],
    ['Español', 'Voz y texto, y la pantalla de SOS'],
    ['हिंदी', 'Voice SOS'],
    ['मराठी', 'Voice SOS'],
    ['Any language', 'Type it, the online check helps'],
    ['911 anywhere', 'Shows your local number'],
  ]
  const list = mode === 'devices' ? devices : langs
  return (
    <section className="sec" aria-labelledby="where-h">
      <h2 id="where-h" className="h2 center">Works on the phone you already have</h2>
      <div className="seg-wrap">
        <div className="pillseg" role="radiogroup" aria-label="Show">
          {(['devices', 'languages'] as const).map((m) => (
            <button key={m} role="radio" aria-checked={mode === m} data-on={mode === m} onClick={() => setMode(m)}>
              {m === 'devices' ? 'Devices' : 'Languages'}
            </button>
          ))}
        </div>
      </div>
      <div className="tiles">
        {list.map(([a, b]) => (
          <div key={a} className="tile">
            <span className="tile-a">{a}</span>
            <span className="tile-b">{b}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

// Real numbers from the engineering page, including where our model loses.
function Speed() {
  const bars: [string, number, string][] = [
    ['On the phone alone', 85.7, 'every sentence, 0.2 ms each'],
    ['Online AI alone', 89.8, 'needs signal, 467 ms each'],
    ['Both together', 93.9, 'phone first, online only when unsure'],
  ]
  return (
    <section className="sec speed" aria-labelledby="speed-h">
      <div className="speed-top">
        <h2 id="speed-h" className="h2">Fast enough to work with no signal</h2>
        <p className="lead">
          The phone model answers in 0.2 ms and is never online. When it is sure, which is 76% of the time, it was
          right every time in testing. When it is not sure, it hands over. Our own model loses to the online AI on its
          own, and we say so.
        </p>
      </div>
      <div className="bars" role="img" aria-label="Right answers in testing: phone alone 85.7 percent, online AI alone 89.8 percent, both together 93.9 percent">
        {bars.map(([k, v, sub], i) => (
          <div key={k} className="bar-row">
            <div className="bar-k">
              <strong>{k}</strong>
              <span>{sub}</span>
            </div>
            <div className="bar-track">
              <span className="bar-fill" data-best={i === 2} style={{ width: `${v}%` }} />
            </div>
            <span className="bar-v">{v}%</span>
          </div>
        ))}
      </div>
      <a href="/engineering" className="more">How we tested it →</a>
    </section>
  )
}

const TOOLS: [string, string, string, string][] = [
  ['/card', 'Emergency card', 'Two minutes, no account. A lock screen picture and a wallet card.', 'card'],
  ['/flare', 'POTS flare check', 'Is this episode an emergency? Compared against your own normal.', 'flare'],
  ['/rights', 'ER rights', 'What an emergency room owes you, even if you cannot pay.', 'rights'],
  ['/emergency/cpr', 'CPR coach', 'A beat to press along with, and what to do until help comes.', 'cpr'],
]

function ToolThumb({ kind }: { kind: string }) {
  if (kind === 'card')
    return (
      <div className="thumb" data-ui>
        <p className="th-k">Blood type</p>
        <p className="th-big" style={{ color: SOS_TEXT }}>O+</p>
        <p className="th-k">Allergies</p>
        <p className="th-m">Penicillin</p>
      </div>
    )
  if (kind === 'flare')
    return (
      <div className="thumb" data-ui>
        <p className="th-m">Struggling to breathe?</p>
        <div className="th-yn"><span>No</span><span data-on>Yes</span></div>
        <p className="th-k" style={{ marginTop: '10px' }}>Call 911 now</p>
      </div>
    )
  if (kind === 'rights')
    return (
      <div className="thumb" data-ui>
        <p className="th-m">They must examine and stabilise you</p>
        <p className="th-k" style={{ marginTop: '8px' }}>Whether or not you can pay</p>
      </div>
    )
  return (
    <div className="thumb" data-ui>
      <p className="th-big">110</p>
      <p className="th-k">presses a minute</p>
      <div className="th-beat" aria-hidden><span /><span /><span /><span /></div>
    </div>
  )
}

export default function Home() {
  const router = useRouter()
  const [bar, setBar] = useState(true)

  // Signed in visitors go to their dashboard. The page still renders first so
  // search engines see real content.
  useEffect(() => {
    try {
      if (localStorage.getItem('relay-announce') === 'access-1') setBar(false)
    } catch {}
    const check = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase.from('profiles').select('id').eq('id', session.user.id).single()
      router.replace(data ? '/dashboard' : '/onboarding')
    }
    check()
  }, [router])

  const closeBar = () => {
    setBar(false)
    try {
      localStorage.setItem('relay-announce', 'access-1')
    } catch {}
  }

  return (
    <div style={{ color: INK }}>
      <style>{CSS}</style>

      {bar && (
        <div className="announce">
          <span>
            <strong>New</strong> Bigger text, high contrast and less motion, for every page.
          </span>
          <a href="/accessibility" className="announce-cta">Try it</a>
          <button className="announce-x" onClick={closeBar} aria-label="Close this message">×</button>
        </div>
      )}

      <div className="wrap">
        <nav className="nav glass" aria-label="Main">
          <div className="nav-l">
            <a href="/" aria-label="Relay Arc home" className="nav-logo">
              <img src="/logo-wordmark.png" alt="Relay Arc" />
            </a>
            <div className="nav-links">
              {NAV.filter(([l]) => l !== 'Sign in').map(([l, h]) => (
                <a key={h} href={h}>{l}</a>
              ))}
              <a href="/accessibility">Accessibility</a>
            </div>
          </div>
          <div className="nav-r">
            <a href="/login" className="nav-signin">Sign in</a>
            <SearchButton />
            <a href="/card" className="pill pill-line nav-hide">Make a card</a>
            <a href="/login?signup=1" className="pill pill-ink">Start free</a>
          </div>
        </nav>

        <header className="hero">
          <h1 className="h1" data-reveal>Free help when the hospital is far</h1>
          <div className="hero-r" data-reveal>
            <p className="lead">
              Press SOS and Relay Arc works out what is wrong, picks the closest hospital that can treat it, guides you
              there and tells your family. Free, in any phone&apos;s browser, and it keeps working with no signal.
            </p>
            <div className="ctas">
              <a href="/login?signup=1" className="pill pill-ink pill-lg">Start free</a>
              <a href="/card" className="pill pill-line pill-lg">Make an emergency card</a>
            </div>
            <div className="proof">
              <span className="proof-faces" aria-hidden>
                {['A', 'M', 'J', 'R', 'S'].map((l, i) => (
                  <span key={l} style={{ background: ['#2F5233', '#F07800', '#7EBE7C', '#1E3A23', '#FFC266'][i], color: i === 1 || i === 2 || i === 4 ? '#141413' : '#fff' }}>{l}</span>
                ))}
              </span>
              <span>
                <strong>Used by over 580 people</strong>
                <span className="proof-sub">No ads and no trackers</span>
              </span>
            </div>
          </div>
        </header>

        <Showcase />

        <section className="sec logos" aria-labelledby="logos-h">
          <h2 id="logos-h" className="h4">Shared, reviewed and discussed by</h2>
          <div className="logo-row">
            {PARTNERS.map(([n, d]) => (
              <div key={n} className="logo-cell">
                {n === 'Aerox Labs' ? (
                  <img src="/partners/aerox.png" alt="Aerox Labs" />
                ) : n.startsWith('East Windsor') ? (
                  <img src="/partners/ewrsd.png" alt="East Windsor Regional School District" />
                ) : (
                  <span className="logo-word">{n}</span>
                )}
                <p>{d}</p>
              </div>
            ))}
          </div>
        </section>

        <hr className="rule" />
        <section className="sec" aria-label="Try the triage model">
          <TryTriage />
        </section>
        <hr className="rule" />

        <WorksWhere />

        <hr className="rule" />
        <Speed />
        <hr className="rule" />

        <section className="sec" aria-labelledby="tools-h">
          <div className="sec-head">
            <h2 id="tools-h" className="h2">Free tools for the worst day</h2>
            <p className="lead">No account needed for any of these. Open one now, before you need it.</p>
          </div>
          <div className="cards">
            {TOOLS.map(([h, t, d, k]) => (
              <a key={h} href={h} className="tcard">
                <ToolThumb kind={k} />
                <span className="card-t">{t}</span>
                <span className="card-d">{d}</span>
                <span className="card-more">Open it <span aria-hidden>→</span></span>
              </a>
            ))}
          </div>
        </section>

        <section className="sec" aria-labelledby="why-h">
          <h2 id="why-h" className="h2">Built for places like these</h2>
          <div className="places">
            <figure className="place place-big">
              <img src="/places/wharton-forest.jpg" alt="A sandy trail through pine trees in Wharton State Forest, New Jersey" loading="lazy" />
              <figcaption>
                <strong>Wharton State Forest</strong>
                <span>The nearest emergency room can be a long drive away.</span>
              </figcaption>
            </figure>
            <figure className="place">
              <img src="/places/pine-barrens-bog.jpg" alt="A cranberry bog and pine forest in the New Jersey Pine Barrens" loading="lazy" />
              <figcaption>
                <strong>The Pine Barrens</strong>
                <span>Spotty signal, so the important parts run on the phone.</span>
              </figcaption>
            </figure>
            <div className="place place-video">
              <VideoEmbed id="ozCUg87GAto" title="Relay Arc demonstration" />
              <p className="place-cap"><strong>See it work</strong> A two minute walk through the app.</p>
            </div>
          </div>
        </section>

        <section className="close" aria-labelledby="close-h">
          <h2 id="close-h" className="h1 close-h">Free for everyone, for good</h2>
          <div>
            <p className="lead">
              There is nothing to buy and no ads. Make your card in two minutes, then sign up so SOS knows your conditions,
              medicines and who to tell.
            </p>
            <div className="ctas">
              <a href="/login?signup=1" className="pill pill-ink pill-lg">Start free</a>
              <a href="/card" className="pill pill-line pill-lg">Make an emergency card</a>
            </div>
          </div>
        </section>
      </div>

      <footer className="dark-foot">
        <div className="wrap">
          <div className="foot-cols">
            {FOOT.map(([title, links]) => (
              <nav key={title} aria-label={title}>
                <p className="foot-h">{title}</p>
                {links.map(([l, h]) => (
                  <a key={h} href={h}>{l}</a>
                ))}
              </nav>
            ))}
          </div>
          <div className="foot-mid">
            <a href="https://www.google.com/preferences/source?q=relay-arc.org" target="_blank" rel="noopener noreferrer" className="pref-dark">
              <span className="pref-star" aria-hidden>★</span>
              <span>
                <span className="pref-k">Get Relay Arc first on Google</span>
                <strong>Add as a preferred source</strong>
              </span>
            </a>
            <FollowLinks tone="dark" variant="inline" />
          </div>
          <p className="foot-small">
            Relay Arc helps you decide what to do. It does not diagnose. In an emergency, call 911 first. ©{' '}
            {new Date().getFullYear()} Relay Arc, a free nonprofit project. Photos from the Pine Barrens: Wharton State
            Forest trail by RollerFanatic000, CC BY SA 4.0. Cranberry bog by Andrew Leahey, CC BY SA 2.0. Both via
            Wikimedia Commons.
          </p>
          <p className="foot-word" aria-hidden>Relay Arc</p>
        </div>
      </footer>
    </div>
  )
}

const FOOT: [string, [string, string][]][] = [
  ['The app', [['Start free', '/login?signup=1'], ['Sign in', '/login'], ['Live demo', '/demo'], ['Features', '/features']]],
  ['Free tools', [['Emergency card', '/card'], ['POTS flare check', '/flare'], ['ER rights', '/rights'], ['CPR coach', '/emergency/cpr']]],
  ['How it works', [['Engineering', '/engineering'], ['Changelog', '/changelog'], ['Status', '/status'], ['Source code', 'https://github.com/Aarya470/relay-arc']]],
  ['Project', [['Partners', '/partners'], ['Donate', '/donate'], ['Accessibility', '/accessibility'], ['Contact', 'mailto:relay.arc.org@gmail.com']]],
  ['Legal', [['Privacy', '/privacy'], ['Terms', '/terms']]],
]

const CSS = `
  .wrap { max-width: 1200px; margin: 0 auto; padding: 0 32px; }
  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .h1 { font-size: clamp(44px, 5.2vw, 76px); text-wrap: balance; font-weight: 650; letter-spacing: -0.045em !important; line-height: 0.98 !important; margin: 0; }
  .h2 { font-size: clamp(34px, 3.8vw, 56px); font-weight: 650; letter-spacing: -0.035em !important; line-height: 1.04 !important; margin: 0; }
  .h3 { font-size: clamp(26px, 2.4vw, 34px); font-weight: 650; letter-spacing: -0.03em !important; line-height: 1.1 !important; margin: 0; }
  .h4 { font-size: 22px; font-weight: 650; letter-spacing: -0.02em !important; margin: 0; }
  .lead { font-size: 19px; line-height: 1.55; color: ${INK}; max-width: 36em; }
  .body { font-size: 17px; line-height: 1.55; color: ${INK}; margin-top: 12px; }
  .center { text-align: center; }

  .pill { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 0 20px; border-radius: 999px; font-weight: 700; font-size: 15.5px; text-decoration: none; border: 0; cursor: pointer; font-family: inherit; white-space: nowrap;
    transition: transform 160ms var(--ease-out), background-color 160ms var(--ease-out), box-shadow 160ms var(--ease-out); }
  .pill:active { transform: scale(0.97); }
  .pill-ink { background: ${INK}; color: #fff; }
  .pill-ink:hover { background: #2E2E2B; }
  .pill-ink:disabled { opacity: 0.4; cursor: default; }
  .pill-line { background: rgba(255,253,246,0.55); color: ${INK}; box-shadow: inset 0 0 0 1.5px ${INK}; }
  .pill-line:hover { background: ${PAPER}; }
  .pill-lg { min-height: 52px; padding: 0 26px; font-size: 16.5px; }

  .announce { display: flex; align-items: center; justify-content: center; gap: 14px; padding: 10px 48px; background: ${INK}; color: #fff; font-size: 14.5px; position: relative; }
  .announce strong { font-weight: 800; margin-right: 6px; }
  .announce-cta { background: ${SOS}; color: ${INK}; font-weight: 800; padding: 5px 12px; border-radius: 999px; text-decoration: none; font-size: 13.5px; }
  .announce-x { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); width: 36px; height: 36px; border: 0; background: none; color: #fff; font-size: 22px; cursor: pointer; }

  .nav { position: sticky; top: 12px; z-index: 60; margin-top: 14px; display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 10px 10px 10px 20px; border-radius: 14px; }
  .nav-l, .nav-r { display: flex; align-items: center; gap: 28px; }
  .nav-r { gap: 10px; }
  .nav-logo img { height: 30px; width: auto; display: block; }
  .nav-links { display: flex; gap: 24px; }
  .nav-links a, .nav-signin { color: ${INK}; font-weight: 600; font-size: 16px; text-decoration: none; padding: 8px 0; }
  .nav-links a:hover, .nav-signin:hover { text-decoration: underline; text-underline-offset: 4px; }
  .nav-signin { padding: 8px 6px; }

  .hero { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 56px; align-items: start; padding: 88px 0 56px; }
  .hero-r { padding-top: 10px; }
  .hero-r .lead { font-size: 18.5px; }
  .ctas { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 24px; }
  .proof { display: inline-flex; align-items: center; gap: 14px; margin-top: 22px; }
  .proof strong { display: block; font-size: 16px; font-weight: 800; }

  .show { margin-bottom: 40px; }
  .tabs { display: grid; grid-template-columns: repeat(5, 1fr); border-radius: 14px 14px 0 0; overflow: hidden; background: rgba(255,253,246,0.4); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.7); }
  .tab { min-height: 54px; border: 0; background: transparent; font: inherit; font-size: 15.5px; font-weight: 650; color: ${INK}; cursor: pointer; position: relative; transition: background-color 180ms var(--ease-out); }
  .tab + .tab { box-shadow: inset 1px 0 0 rgba(20,20,19,0.08); }
  .tab:hover { background: rgba(255,253,246,0.55); }
  .tab[data-on="true"] { background: rgba(255,253,246,0.92); }
  .tab[data-on="true"]::after { content: ''; position: absolute; left: 0; right: 0; top: 0; height: 3px; background: ${SOS}; }
  .show-stage { display: grid; grid-template-columns: 0.8fr 1.2fr; gap: 48px; align-items: center; padding: 48px; min-height: 460px; border-radius: 0 0 14px 14px;
    background: rgba(255,253,246,0.72); -webkit-backdrop-filter: blur(20px) saturate(1.4); backdrop-filter: blur(20px) saturate(1.4); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.8), 0 24px 60px rgba(30,58,35,0.14);
    animation: stage-in 320ms var(--ease-out); }
  @keyframes stage-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  .show-view { min-width: 0; }
  .show-view .frag, .show-view .idcard { box-shadow: 0 12px 30px rgba(30,58,35,0.12); border-radius: 12px; }

  .sec { padding: 112px 0; }
  .sec-head { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: end; margin-bottom: 40px; }
  .rule { border: 0; height: 1px; background: rgba(20,20,19,0.14); margin: 0; }

  .logos { padding: 56px 0 96px; }
  .logos .h4 { margin-bottom: 26px; }
  .logo-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .logo-cell { padding: 22px; border-radius: 14px; background: rgba(255,253,246,0.45); }
  .logo-cell img { height: 40px; width: auto; display: block; object-fit: contain; }
  .logo-word { display: block; font-size: 30px; font-weight: 900; letter-spacing: -0.04em; line-height: 40px; }
  .logo-cell p { font-size: 15px; line-height: 1.5; margin-top: 12px; color: ${INK}; }

  .try { display: grid; grid-template-columns: 0.9fr 1.1fr; gap: 56px; align-items: center; }
  .try-left .lead { margin-top: 18px; }
  .try-chips { display: grid; gap: 10px; margin-top: 26px; }
  .try-chip { text-align: left; padding: 14px 18px; border-radius: 12px; border: 0; background: rgba(255,253,246,0.55); font: inherit; font-size: 16.5px; color: ${INK}; cursor: pointer;
    transition: background-color 160ms var(--ease-out), transform 160ms var(--ease-out); }
  .try-chip:hover { background: ${PAPER}; transform: translateX(4px); }
  .try-chip:active { transform: scale(0.98); }
  .try-panel { border-radius: 16px; padding: 22px; background: rgba(255,253,246,0.78); -webkit-backdrop-filter: blur(20px); backdrop-filter: blur(20px); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.85), 0 24px 60px rgba(30,58,35,0.14); }
  .try-form { display: flex; gap: 8px; }
  .try-form input { flex: 1; min-width: 0; height: 52px; padding: 0 18px; border-radius: 999px; border: 0; background: #fff; box-shadow: inset 0 0 0 1.5px rgba(20,20,19,0.16); font: inherit; font-size: 16px; color: ${INK}; }
  .try-form .pill { min-height: 52px; }
  .try-out { margin-top: 18px; min-height: 196px; padding: 22px; border-radius: 12px; background: ${MINT}; }
  .try-empty { font-size: 17px; color: ${INK2}; }
  .try-k { font-size: 14px; font-weight: 700; color: ${GREEN}; }
  .try-big { font-size: clamp(28px, 3vw, 40px); font-weight: 700; letter-spacing: -0.03em; line-height: 1.1; margin-top: 6px; }
  .try-meter { height: 10px; border-radius: 999px; background: rgba(20,20,19,0.1); margin-top: 16px; overflow: hidden; }
  .try-meter span { display: block; height: 100%; background: ${SOS}; border-radius: 999px; transform-origin: left; animation: grow 600ms var(--ease-out); }
  @keyframes grow { from { transform: scaleX(0); } to { transform: none; } }
  .try-note { font-size: 15.5px; line-height: 1.5; margin-top: 14px; color: ${INK}; }

  .seg-wrap { display: flex; justify-content: center; margin: 24px 0 36px; }
  .pillseg { display: inline-flex; gap: 4px; padding: 4px; border-radius: 999px; background: rgba(20,20,19,0.08); }
  .pillseg button { min-height: 40px; padding: 0 18px; border-radius: 999px; border: 0; background: transparent; font: inherit; font-weight: 700; font-size: 15px; color: ${INK}; cursor: pointer; transition: background-color 160ms var(--ease-out), color 160ms var(--ease-out); }
  .pillseg button[data-on="true"] { background: ${INK}; color: #fff; }
  .tiles { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; }
  .tile { display: grid; align-content: center; gap: 6px; min-height: 132px; padding: 18px; border-radius: 14px; background: rgba(255,253,246,0.55); text-align: center; animation: stage-in 280ms var(--ease-out) both; }
  .tile:nth-child(2) { animation-delay: 30ms; } .tile:nth-child(3) { animation-delay: 60ms; } .tile:nth-child(4) { animation-delay: 90ms; } .tile:nth-child(5) { animation-delay: 120ms; } .tile:nth-child(6) { animation-delay: 150ms; }
  .tile-a { font-size: 19px; font-weight: 750; letter-spacing: -0.02em; }
  .tile-b { font-size: 14px; line-height: 1.4; color: ${INK2}; }

  .speed-top { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: end; }
  .bars { display: grid; gap: 18px; margin-top: 48px; padding: 32px; border-radius: 16px; background: rgba(255,253,246,0.6); }
  .bar-row { display: grid; grid-template-columns: 240px 1fr 72px; gap: 20px; align-items: center; }
  .bar-k strong { display: block; font-size: 16.5px; }
  .bar-k span { display: block; font-size: 14px; color: ${INK2}; margin-top: 2px; }
  .bar-track { height: 34px; border-radius: 8px; background: rgba(20,20,19,0.07); overflow: hidden; }
  .bar-fill { display: block; height: 100%; border-radius: 8px; background: #2F5233; transform-origin: left; }
  .bar-fill[data-best="true"] { background: ${SOS}; }
  .bars.is-in .bar-fill, .bars .bar-fill { animation: grow 900ms var(--ease-out) both; }
  .bar-v { font-size: 22px; font-weight: 800; font-variant-numeric: tabular-nums; text-align: right; }
  .more { display: inline-block; margin-top: 22px; font-weight: 750; color: ${INK}; text-decoration: none; font-size: 16.5px; }
  .more:hover { text-decoration: underline; text-underline-offset: 4px; }

  .cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 20px; }
  .tcard { display: grid; align-content: start; gap: 8px; color: ${INK}; text-decoration: none; }
  .thumb { aspect-ratio: 4 / 3; border-radius: 14px; padding: 20px; background: rgba(255,253,246,0.7); display: flex; flex-direction: column; justify-content: center; margin-bottom: 8px;
    transition: transform 220ms var(--ease-out), box-shadow 220ms var(--ease-out); }
  .tcard:hover .thumb { transform: translateY(-4px); box-shadow: 0 18px 40px rgba(30,58,35,0.16); }
  .card-t { font-size: 21px; font-weight: 700; letter-spacing: -0.02em; }
  .card-d { font-size: 15.5px; line-height: 1.5; }
  .card-more { font-weight: 750; font-size: 15.5px; margin-top: 4px; }
  .card-more span { display: inline-block; transition: transform 180ms var(--ease-out); }
  .tcard:hover .card-more span { transform: translateX(4px); }
  .th-k { font-size: 13px; font-weight: 700; color: ${INK2}; }
  .th-big { font-size: 44px; font-weight: 800; letter-spacing: -0.03em; line-height: 1; margin: 2px 0 8px; }
  .th-m { font-size: 18px; font-weight: 700; line-height: 1.3; }
  .th-yn { display: flex; gap: 6px; margin-top: 12px; }
  .th-yn span { flex: 1; text-align: center; padding: 8px; border-radius: 8px; background: rgba(20,20,19,0.08); font-weight: 700; font-size: 14px; }
  .th-yn span[data-on] { background: ${SOS}; }
  .th-beat { display: flex; gap: 6px; margin-top: 12px; }
  .th-beat span { width: 14px; height: 14px; border-radius: 50%; background: ${SOS}; animation: beat 545ms ease-in-out infinite alternate; }
  .th-beat span:nth-child(2) { animation-delay: 136ms; } .th-beat span:nth-child(3) { animation-delay: 272ms; } .th-beat span:nth-child(4) { animation-delay: 408ms; }
  @keyframes beat { from { opacity: 0.25; transform: scale(0.8); } to { opacity: 1; transform: none; } }

  .places { display: grid; grid-template-columns: 1.3fr 1fr 1fr; gap: 16px; margin-top: 36px; }
  .place { position: relative; margin: 0; border-radius: 16px; overflow: hidden; min-height: 440px; background: ${FOREST}; }
  .place img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: transform 1200ms var(--ease-out); }
  .place:hover img { transform: scale(1.04); }
  .place figcaption { position: absolute; left: 0; right: 0; bottom: 0; padding: 60px 22px 22px; color: #fff; background: linear-gradient(transparent, rgba(10,14,10,0.78)); } /* taste-skill-ignore: scrim under text on photo */
  .place figcaption strong { display: block; font-size: 22px; letter-spacing: -0.02em; }
  .place figcaption span { display: block; font-size: 15px; margin-top: 4px; line-height: 1.45; }
  .place-video { display: flex; flex-direction: column; justify-content: center; gap: 14px; padding: 18px; background: ${FOREST}; color: #fff; }
  .place-cap { font-size: 15px; line-height: 1.5; }
  .place-cap strong { display: block; font-size: 22px; letter-spacing: -0.02em; }

  .close { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: end; padding: 120px 0 140px; }
  .close-h { font-size: clamp(40px, 4.4vw, 64px); }

  .dark-foot { background: ${INK}; color: #fff; padding: 80px 0 0; overflow: hidden; }
  .foot-cols { display: grid; grid-template-columns: repeat(5, 1fr); gap: 28px; }
  .foot-h { font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.72); margin-bottom: 14px; }
  .foot-cols a { display: block; color: #fff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 7px 0; }
  .foot-cols a:hover { text-decoration: underline; text-underline-offset: 4px; }
  .foot-mid { display: flex; flex-wrap: wrap; gap: 20px 32px; align-items: center; margin-top: 56px; }
  .pref-dark { display: inline-flex; align-items: center; gap: 12px; padding: 10px 18px 10px 10px; border-radius: 12px; background: rgba(255,255,255,0.08); color: #fff; text-decoration: none; }
  .pref-dark .pref-k { color: rgba(255,255,255,0.75); }
  .pref-dark:hover { background: rgba(255,255,255,0.14); }
  .foot-small { font-size: 14px; line-height: 1.6; color: rgba(255,255,255,0.75); max-width: 820px; margin-top: 28px; }
  .foot-word { font-size: clamp(72px, 17vw, 250px); font-weight: 800; letter-spacing: -0.06em; line-height: 0.85; margin-top: 56px; color: ${LEAF}; white-space: nowrap; transform: translateY(0.12em); }

  @media (max-width: 1000px) {
    .nav-links, .nav-hide { display: none; }
    .tiles { grid-template-columns: repeat(3, 1fr); }
    .cards { grid-template-columns: repeat(2, 1fr); }
    .foot-cols { grid-template-columns: repeat(3, 1fr); }
  }
  @media (max-width: 760px) {
    .wrap { padding: 0 18px; }
    .nav-signin { display: none; }
    .hero, .sec-head, .try, .speed-top, .close, .show-stage, .places, .logo-row { grid-template-columns: 1fr; gap: 28px; }
    .hero { padding: 48px 0 36px; }
    .tabs { display: flex; overflow-x: auto; border-radius: 14px 14px 0 0; }
    .tab { flex: 0 0 auto; padding: 0 18px; }
    .show-stage { padding: 22px; min-height: 0; }
    .sec { padding: 72px 0; }
    .tiles { grid-template-columns: repeat(2, 1fr); }
    .cards { grid-template-columns: 1fr; }
    .bar-row { grid-template-columns: 1fr 64px; }
    .bar-track { grid-column: 1 / -1; grid-row: 2; }
    .bars { padding: 20px; }
    .place { min-height: 320px; }
    .close { padding: 80px 0; }
    .foot-cols { grid-template-columns: repeat(2, 1fr); }
    .announce { justify-content: flex-start; padding: 10px 52px 10px 16px; font-size: 13.5px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .show-stage, .tile, .try-meter span, .bar-fill, .th-beat span { animation: none !important; }
  }

  /* fragments shared with the showcase */
  .frag { padding: 28px; }
  .hosp { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 14px 16px; border-radius: 8px; }
  .bubble { background: ${MINT}; padding: 14px 18px; font-size: 17px; line-height: 1.5; border-radius: 18px 18px 18px 4px; }
  .maker { display: grid; grid-template-columns: 0.9fr 1.1fr; gap: 28px; align-items: center; }
  .maker-form { display: grid; gap: 14px; }
  .fld { display: grid; gap: 6px; font-size: 15px; font-weight: 600; }
  .fld input, .fld select { height: 48px; padding: 0 14px; border: 0; border-radius: 10px; background: #fff; font-size: 16px; color: ${INK}; box-shadow: inset 0 0 0 1.5px rgba(20,20,19,0.16); }
  .idcard { background: ${PAPER}; padding: 28px; }
  @media (max-width: 760px) { .maker { grid-template-columns: 1fr; } }
`
