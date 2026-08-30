'use client'
// Emergency card — the two-minute version of Relay Arc.
//
// WHY THIS EXISTS
// Every other entrance to this app asks for an account and a full medical profile
// before it gives anything back, and then the real payoff (hospital routing,
// records forwarded ahead) only arrives during an emergency that hopefully never
// comes. So a visitor who is willing to spend two minutes gets nothing for it, and
// leaves. That is the actual reason nobody uses this yet — not traffic.
//
// This page inverts that. Fill in the fields, and you immediately have two things
// worth having:
//
//   1. A lock-screen image. iOS and Android both display the lock wallpaper
//      without unlocking, so a first responder can read your blood type and
//      allergies off a locked phone with no app, no account and no signal. The
//      chronic-illness community already does this by hand with photo editors.
//   2. A printable wallet card, because paper does not run out of battery.
//
// WHY NOTHING IS SENT ANYWHERE
// There is no account and no server call on this page. The data lives in React
// state and in this browser's localStorage, and the images are drawn on-device
// with canvas. That is a deliberate product decision, not laziness: the single
// most common objection to a medical app from a stranger is "why would I give you
// this?", and the strongest possible answer is that you don't have to.
//
// It also rules out a whole category of harm. There is no shareable link that
// embeds the data, because a URL carrying someone's medical history can be
// forwarded, logged, or sit in a browser history forever. The lock screen is a
// better sharing mechanism than a link anyway — it works with no network.
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Download, Printer, Trash2, Check } from 'lucide-react'

const INK = '#141413', INK2 = '#5C5A52', INK3 = '#84827A'
const CREAM = '#EFF2E8', BORDER = '#DCE1D0', WHITE = '#FFFFFF'
const GREEN_DEEP = '#5F7049'
const ORANGE = '#D97757', CRIT = '#A33417'
const mono = 'var(--font-mono, monospace)'

const STORE_KEY = 'relay-arc:card:v1'

type Contact = { name: string; phone: string }
type Card = {
  name: string
  dob: string
  blood: string
  conditions: string
  allergies: string
  medications: string
  doctor: string
  notes: string
  contacts: Contact[]
}

const EMPTY: Card = {
  name: '', dob: '', blood: '', conditions: '', allergies: '',
  medications: '', doctor: '', notes: '',
  contacts: [{ name: '', phone: '' }, { name: '', phone: '' }],
}

const BLOOD = ['', 'O+', 'O−', 'A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'Unknown']

const lines = (s: string) => s.split('\n').map(l => l.trim()).filter(Boolean)

export default function EmergencyCard() {
  const router = useRouter()
  const [c, setC] = useState<Card>(EMPTY)
  const [loaded, setLoaded] = useState(false)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const fontRef = useRef<HTMLSpanElement>(null)

  // Restore on mount only — localStorage does not exist during SSR.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Card>
        setC({ ...EMPTY, ...parsed, contacts: parsed.contacts?.length ? parsed.contacts : EMPTY.contacts })
      }
    } catch { /* corrupt or unavailable storage is not worth surfacing */ }
    setLoaded(true)
  }, [])

  // Persist to this device only. Never transmitted.
  useEffect(() => {
    if (!loaded) return
    try { localStorage.setItem(STORE_KEY, JSON.stringify(c)) } catch { /* private mode */ }
    setSaved(true)
    const t = setTimeout(() => setSaved(false), 1400)
    return () => clearTimeout(t)
  }, [c, loaded])

  const set = <K extends keyof Card>(k: K, v: Card[K]) => setC(p => ({ ...p, [k]: v }))
  const setContact = (i: number, k: keyof Contact, v: string) =>
    setC(p => ({ ...p, contacts: p.contacts.map((ct, j) => j === i ? { ...ct, [k]: v } : ct) }))

  const meds = useMemo(() => lines(c.medications), [c.medications])
  const filledContacts = useMemo(
    () => c.contacts.filter(ct => ct.name.trim() || ct.phone.trim()), [c.contacts])
  const hasAnything = Boolean(c.name.trim() || c.blood || c.conditions.trim() || c.allergies.trim() || meds.length)

  /** Resolve the real family name from a rendered node — a CSS var is meaningless to canvas. */
  const families = () => {
    const el = fontRef.current
    const fam = el ? getComputedStyle(el).fontFamily : ''
    return {
      sans: fam || 'system-ui, sans-serif',
      mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    }
  }

  async function downloadLockScreen() {
    setBusy(true)
    try {
      if (document.fonts?.ready) await document.fonts.ready
      const W = 1170, H = 2532            // iPhone-class portrait; scales fine elsewhere
      const cv = document.createElement('canvas')
      cv.width = W; cv.height = H
      const g = cv.getContext('2d')
      if (!g) return
      const F = families()

      g.fillStyle = CREAM; g.fillRect(0, 0, W, H)

      // The clock occupies roughly the top quarter of a lock screen and the
      // torch/camera controls the bottom eighth, so everything readable has to
      // live in the middle band or the OS will cover it.
      const M = 96
      let y = 720

      g.fillStyle = ORANGE; g.fillRect(M, y, 150, 10); y += 62
      g.fillStyle = INK; g.font = `700 34px ${F.mono}`
      g.fillText('MEDICAL INFORMATION', M, y); y += 78

      g.fillStyle = INK; g.font = `800 92px ${F.sans}`
      g.fillText(c.name || 'Name not set', M, y); y += 46
      if (c.dob) {
        g.fillStyle = INK3; g.font = `600 38px ${F.sans}`
        g.fillText(`DOB ${c.dob}`, M, y + 20); y += 56
      }
      y += 34
      g.fillStyle = BORDER; g.fillRect(M, y, W - 2 * M, 3); y += 70

      const row = (label: string, value: string, danger = false) => {
        if (!value) return
        g.fillStyle = INK3; g.font = `700 30px ${F.mono}`
        g.fillText(label.toUpperCase(), M, y); y += 50
        g.fillStyle = danger ? CRIT : INK
        g.font = `${danger ? 800 : 700} 54px ${F.sans}`
        for (const ln of wrapText(g, value, W - 2 * M)) { g.fillText(ln, M, y); y += 62 }
        y += 30
      }

      row('Blood type', c.blood)
      row('Allergies', c.allergies || 'None reported', Boolean(c.allergies.trim()))
      row('Conditions', c.conditions)

      if (meds.length) {
        g.fillStyle = INK3; g.font = `700 30px ${F.mono}`
        g.fillText('MEDICATIONS', M, y); y += 50
        g.fillStyle = INK; g.font = `600 46px ${F.sans}`
        for (const m of meds.slice(0, 8)) { g.fillText(`· ${m}`, M, y); y += 56 }
        if (meds.length > 8) {
          g.fillStyle = INK3
          g.fillText(`+ ${meds.length - 8} more`, M, y); y += 56
        }
        y += 26
      }

      if (filledContacts.length) {
        g.fillStyle = BORDER; g.fillRect(M, y, W - 2 * M, 3); y += 66
        g.fillStyle = INK3; g.font = `700 30px ${F.mono}`
        g.fillText('IN AN EMERGENCY, CALL', M, y); y += 56
        for (const ct of filledContacts) {
          g.fillStyle = INK; g.font = `700 48px ${F.sans}`
          g.fillText(ct.name || 'Contact', M, y); y += 54
          g.fillStyle = GREEN_DEEP; g.font = `700 52px ${F.mono}`
          g.fillText(ct.phone, M, y); y += 68
        }
      }

      if (c.notes.trim()) {
        y += 10
        g.fillStyle = INK2; g.font = `600 40px ${F.sans}`
        for (const ln of wrapText(g, c.notes, W - 2 * M)) { g.fillText(ln, M, y); y += 50 }
      }

      // Safety line, always present, never optional.
      g.fillStyle = INK3; g.font = `600 30px ${F.mono}`
      g.fillText('CALL EMERGENCY SERVICES FIRST', M, 2210)
      g.fillText('relay-arc.vercel.app', M, 2256)

      // Explicit generic: `new Promise(...)` alone infers Promise<unknown>.
      const blob = await new Promise<Blob | null>(res => cv.toBlob(res, 'image/png'))
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `emergency-card-${(c.name || 'relay-arc').replace(/\s+/g, '-').toLowerCase()}.png`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 4000)
    } finally {
      setBusy(false)
    }
  }

  function clearAll() {
    if (!confirm('Remove this card from this device? This cannot be undone.')) return
    try { localStorage.removeItem(STORE_KEY) } catch { /* ignore */ }
    setC(EMPTY)
  }

  const label: CSSProperties = {
    display: 'block', color: INK3, fontFamily: mono, fontSize: '10px',
    fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase', marginBottom: '6px',
  }
  const input: CSSProperties = {
    width: '100%', padding: '11px 13px', border: `1px solid ${BORDER}`, background: WHITE,
    color: INK, fontSize: '15px', fontFamily: 'inherit', borderRadius: 0, outline: 'none',
  }
  const btn = (primary = false): CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    padding: '13px 20px', border: primary ? 'none' : `1px solid ${BORDER}`,
    background: primary ? ORANGE : WHITE, color: INK, fontSize: '14px', fontWeight: 700,
    fontFamily: 'inherit', cursor: 'pointer', borderRadius: 0,
  })

  return (
    <div style={{ background: WHITE, minHeight: '100dvh' }}>
      <span ref={fontRef} style={{ fontFamily: 'var(--font-sans, system-ui)', position: 'absolute', opacity: 0 }} aria-hidden>.</span>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #wallet, #wallet * { visibility: visible !important; }
          #wallet { position: fixed !important; left: 0; top: 0; margin: 0 !important; }
          @page { margin: 12mm; }
        }
        #wallet { display: none; }
        @media print { #wallet { display: block; } }
      `}</style>

      <header style={{ borderBottom: `1px solid ${BORDER}`, padding: '16px 24px', position: 'sticky', top: 0, background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(8px)', zIndex: 40 }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: INK2, fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
            <ArrowLeft size={15}/> Relay Arc
          </button>
          {saved && hasAnything && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: GREEN_DEEP, fontFamily: mono, fontSize: '10.5px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase' }}>
              <Check size={13}/> Saved on this device
            </span>
          )}
        </div>
      </header>

      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '56px 24px 90px' }}>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <span style={{ width: '7px', height: '7px', background: ORANGE, display: 'inline-block' }}/>
          <span style={{ color: INK2, fontFamily: mono, fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' }}>
            No account · nothing sent anywhere
          </span>
        </div>
        <h1 style={{ color: INK, fontSize: 'clamp(34px, 6vw, 62px)', fontWeight: 800, lineHeight: 1.0, letterSpacing: '-0.04em', marginBottom: '20px', maxWidth: '780px' }}>
          An emergency card a paramedic can read off your locked phone<span style={{ color: CRIT }}>.</span>
        </h1>
        <p style={{ color: INK2, fontSize: '16.5px', lineHeight: 1.65, maxWidth: '660px', marginBottom: '14px' }}>
          Fill this in once. You get a lock-screen image and a printable wallet card.
          Both work with no signal, no app and no battery on anyone else&apos;s phone —
          because a locked screen shows its wallpaper to whoever picks it up.
        </p>
        <p style={{ color: INK2, fontSize: '15px', lineHeight: 1.65, maxWidth: '660px' }}>
          <strong style={{ color: INK }}>Nothing here is sent to us.</strong> There is no account
          and no upload. What you type stays in this browser and the images are drawn on
          your device. You can wipe it at any time with the button at the bottom.
        </p>

        {/* ── Form + preview ───────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '36px', marginTop: '48px', alignItems: 'start' }}>

          <div>
            <div style={{ borderTop: `3px solid ${INK}`, paddingTop: '13px', marginBottom: '22px' }}>
              <span style={{ color: INK, fontFamily: mono, fontSize: '11px', fontWeight: 700, letterSpacing: '1.8px', textTransform: 'uppercase' }}>
                01 / What a responder needs
              </span>
            </div>

            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <span style={label}>Full name</span>
                <input style={input} value={c.name} onChange={e => set('name', e.target.value)} placeholder="Your full legal name"/>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <span style={label}>Date of birth</span>
                  <input style={input} value={c.dob} onChange={e => set('dob', e.target.value)} placeholder="e.g. 12 Mar 2009"/>
                </div>
                <div>
                  <span style={label}>Blood type</span>
                  <select style={input} value={c.blood} onChange={e => set('blood', e.target.value)}>
                    {BLOOD.map(b => <option key={b} value={b}>{b || 'Select…'}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <span style={label}>Allergies — printed in red</span>
                <input style={input} value={c.allergies} onChange={e => set('allergies', e.target.value)} placeholder="Penicillin, latex… or leave blank"/>
              </div>
              <div>
                <span style={label}>Conditions / diagnosis</span>
                <input style={input} value={c.conditions} onChange={e => set('conditions', e.target.value)} placeholder="POTS, post-MI, ME/CFS…"/>
              </div>
              <div>
                <span style={label}>Medications — one per line</span>
                <textarea style={{ ...input, minHeight: '104px', resize: 'vertical' }} value={c.medications}
                  onChange={e => set('medications', e.target.value)} placeholder={'Ivabradine 5mg twice daily\nFludrocortisone 0.1mg daily'}/>
              </div>
              <div>
                <span style={label}>Anything a responder should know</span>
                <textarea style={{ ...input, minHeight: '70px', resize: 'vertical' }} value={c.notes}
                  onChange={e => set('notes', e.target.value)} placeholder="e.g. Do not sit me upright — orthostatic intolerance"/>
              </div>

              <div style={{ borderTop: `3px solid ${INK}`, paddingTop: '13px', marginTop: '14px', marginBottom: '4px' }}>
                <span style={{ color: INK, fontFamily: mono, fontSize: '11px', fontWeight: 700, letterSpacing: '1.8px', textTransform: 'uppercase' }}>
                  02 / Who to call
                </span>
              </div>
              {c.contacts.map((ct, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <span style={label}>Contact {i + 1}</span>
                    <input style={input} value={ct.name} onChange={e => setContact(i, 'name', e.target.value)} placeholder="Name and relation"/>
                  </div>
                  <div>
                    <span style={label}>Phone</span>
                    <input style={input} value={ct.phone} onChange={e => setContact(i, 'phone', e.target.value)} placeholder="+1 555 0100"/>
                  </div>
                </div>
              ))}
              <div>
                <span style={label}>Doctor or cardiologist</span>
                <input style={input} value={c.doctor} onChange={e => set('doctor', e.target.value)} placeholder="Dr. Name, practice"/>
              </div>
            </div>
          </div>

          {/* ── Live preview ──────────────────────────────────────────────── */}
          <div style={{ position: 'sticky', top: '90px' }}>
            <div style={{ borderTop: `3px solid ${INK}`, paddingTop: '13px', marginBottom: '22px' }}>
              <span style={{ color: INK, fontFamily: mono, fontSize: '11px', fontWeight: 700, letterSpacing: '1.8px', textTransform: 'uppercase' }}>
                03 / Your card
              </span>
            </div>

            <div style={{ border: `1px solid ${BORDER}`, background: CREAM, padding: '26px 24px', marginBottom: '18px' }}>
              <div style={{ width: '58px', height: '5px', background: ORANGE, marginBottom: '16px' }}/>
              <p style={{ color: INK, fontFamily: mono, fontSize: '11px', fontWeight: 700, letterSpacing: '1.6px', marginBottom: '16px' }}>
                MEDICAL INFORMATION
              </p>
              <p style={{ color: c.name ? INK : INK3, fontSize: '27px', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                {c.name || 'Name not set'}
              </p>
              {c.dob && <p style={{ color: INK3, fontSize: '13px', fontWeight: 600, marginTop: '4px' }}>DOB {c.dob}</p>}

              <div style={{ height: '1px', background: BORDER, margin: '18px 0' }}/>

              <Field k="Blood type" v={c.blood}/>
              <Field k="Allergies" v={c.allergies || 'None reported'} danger={Boolean(c.allergies.trim())}/>
              <Field k="Conditions" v={c.conditions}/>

              {meds.length > 0 && (
                <div style={{ marginBottom: '15px' }}>
                  <p style={{ color: INK3, fontFamily: mono, fontSize: '9.5px', fontWeight: 700, letterSpacing: '1.3px', textTransform: 'uppercase', marginBottom: '5px' }}>Medications</p>
                  {meds.map((m, i) => <p key={i} style={{ color: INK, fontSize: '14px', fontWeight: 600, lineHeight: 1.5 }}>· {m}</p>)}
                </div>
              )}

              {filledContacts.length > 0 && (
                <>
                  <div style={{ height: '1px', background: BORDER, margin: '18px 0' }}/>
                  <p style={{ color: INK3, fontFamily: mono, fontSize: '9.5px', fontWeight: 700, letterSpacing: '1.3px', textTransform: 'uppercase', marginBottom: '8px' }}>In an emergency, call</p>
                  {filledContacts.map((ct, i) => (
                    <div key={i} style={{ marginBottom: '9px' }}>
                      <p style={{ color: INK, fontSize: '14.5px', fontWeight: 700 }}>{ct.name || 'Contact'}</p>
                      <p style={{ color: GREEN_DEEP, fontFamily: mono, fontSize: '15px', fontWeight: 700 }}>{ct.phone}</p>
                    </div>
                  ))}
                </>
              )}

              {c.doctor && <Field k="Doctor" v={c.doctor}/>}
              {c.notes && <p style={{ color: INK2, fontSize: '13.5px', lineHeight: 1.55, marginTop: '12px' }}>{c.notes}</p>}

              <p style={{ color: INK3, fontFamily: mono, fontSize: '9px', fontWeight: 700, letterSpacing: '1.2px', marginTop: '20px' }}>
                CALL EMERGENCY SERVICES FIRST
              </p>
            </div>

            <div style={{ display: 'grid', gap: '10px' }}>
              <button onClick={downloadLockScreen} disabled={!hasAnything || busy} style={{ ...btn(true), opacity: hasAnything && !busy ? 1 : 0.45, cursor: hasAnything && !busy ? 'pointer' : 'not-allowed' }}>
                <Download size={15}/> {busy ? 'Drawing…' : 'Download lock-screen image'}
              </button>
              <button onClick={() => window.print()} disabled={!hasAnything} style={{ ...btn(), opacity: hasAnything ? 1 : 0.45, cursor: hasAnything ? 'pointer' : 'not-allowed' }}>
                <Printer size={15}/> Print wallet card
              </button>
            </div>

            <p style={{ color: INK3, fontSize: '12.5px', lineHeight: 1.6, marginTop: '14px' }}>
              <strong style={{ color: INK2 }}>To use it:</strong> download the image, then set it as
              your lock screen wallpaper in your phone&apos;s settings. Your phone shows it
              without being unlocked.
            </p>
          </div>
        </div>

        {/* ── Upgrade path, offered rather than demanded ───────────────────── */}
        <div style={{ borderTop: `3px solid ${INK}`, paddingTop: '13px', marginTop: '80px' }}>
          <span style={{ color: INK, fontFamily: mono, fontSize: '11px', fontWeight: 700, letterSpacing: '1.8px', textTransform: 'uppercase' }}>
            04 / If you want more than a card
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '28px', marginTop: '24px' }}>
          <p style={{ color: INK2, fontSize: '15.5px', lineHeight: 1.65 }}>
            A card is static. A profile lets Relay Arc press one button and pick a hospital
            that can actually treat what is happening — ranked by real drive time and by
            whether that facility has the right unit and is accepting patients — then send
            these same details to them before the car moves.
          </p>
          <div>
            <button onClick={() => router.push('/login?signup=1')} style={{ ...btn(true), width: '100%', marginBottom: '10px' }}>
              Create a profile
            </button>
            <button onClick={() => router.push('/features')} style={{ ...btn(), width: '100%' }}>
              See what it does first
            </button>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: '64px', paddingTop: '22px', display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ color: INK3, fontSize: '12.5px', lineHeight: 1.6, maxWidth: '580px' }}>
            Relay Arc is decision support and not a diagnosis. This card does not
            summon help and does not replace calling emergency services — in an
            emergency, call them first.
          </p>
          <button onClick={clearAll} style={{ ...btn(), color: CRIT, borderColor: BORDER }}>
            <Trash2 size={14}/> Wipe from this device
          </button>
        </div>
      </div>

      {/* ── Print-only wallet card, 3.375in × 2.125in ─────────────────────── */}
      <div id="wallet" style={{ width: '3.375in', height: '2.125in', border: `1.5pt solid ${INK}`, padding: '9pt 11pt', boxSizing: 'border-box', background: WHITE, overflow: 'hidden' }}>
        <p style={{ margin: 0, color: INK, fontFamily: mono, fontSize: '5.5pt', fontWeight: 700, letterSpacing: '0.9pt' }}>MEDICAL INFORMATION</p>
        <p style={{ margin: '2pt 0 0', color: INK, fontSize: '13pt', fontWeight: 800, lineHeight: 1.05 }}>{c.name || 'Name not set'}</p>
        <div style={{ height: '0.6pt', background: INK, margin: '5pt 0' }}/>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '7pt' }}>
          <tbody>
            {c.blood ? <WRow k="Blood" v={c.blood}/> : null}
            <WRow k="Allergies" v={c.allergies || 'None reported'} danger={Boolean(c.allergies.trim())}/>
            {c.conditions ? <WRow k="Conditions" v={c.conditions}/> : null}
            {meds.length ? <WRow k="Meds" v={meds.join('; ')}/> : null}
            {filledContacts.length ? <WRow k="Call" v={filledContacts.map(x => `${x.name} ${x.phone}`).join(' · ')}/> : null}
            {c.doctor ? <WRow k="Doctor" v={c.doctor}/> : null}
          </tbody>
        </table>
        <p style={{ margin: '4pt 0 0', color: INK, fontFamily: mono, fontSize: '5pt', fontWeight: 700, letterSpacing: '0.6pt' }}>
          CALL EMERGENCY SERVICES FIRST · relay-arc.vercel.app
        </p>
      </div>
    </div>
  )
}

function Field({ k, v, danger = false }: { k: string; v: string; danger?: boolean }) {
  if (!v) return null
  return (
    <div style={{ marginBottom: '15px' }}>
      <p style={{ color: INK3, fontFamily: mono, fontSize: '9.5px', fontWeight: 700, letterSpacing: '1.3px', textTransform: 'uppercase', marginBottom: '4px' }}>{k}</p>
      <p style={{ color: danger ? CRIT : INK, fontSize: '16px', fontWeight: danger ? 800 : 700, lineHeight: 1.35 }}>{v}</p>
    </div>
  )
}

function WRow({ k, v, danger = false }: { k: string; v: string; danger?: boolean }) {
  return (
    <tr>
      <td style={{ color: INK3, fontFamily: mono, fontSize: '5.5pt', fontWeight: 700, letterSpacing: '0.5pt', textTransform: 'uppercase', verticalAlign: 'top', padding: '1pt 6pt 1pt 0', whiteSpace: 'nowrap' }}>{k}</td>
      <td style={{ color: danger ? CRIT : INK, fontSize: '7pt', fontWeight: danger ? 800 : 600, lineHeight: 1.25, padding: '1pt 0' }}>{v}</td>
    </tr>
  )
}

/** Greedy wrap against real measured widths — canvas has no text layout. */
function wrapText(g: CanvasRenderingContext2D, s: string, maxw: number): string[] {
  const out: string[] = []
  let line = ''
  for (const word of s.split(/\s+/)) {
    const t = line ? `${line} ${word}` : word
    if (g.measureText(t).width <= maxw || !line) line = t
    else { out.push(line); line = word }
  }
  if (line) out.push(line)
  return out
}
