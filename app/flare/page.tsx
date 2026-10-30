'use client'
// Flare check — the page that is allowed to say "this is probably not an emergency".
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Phone, ChevronRight, AlertTriangle, Check, Info } from 'lucide-react'
import {
  RED_FLAGS,
  COUNTER_STEPS,
  assessFlare,
  assessOrthostatic,
  BASIS,
  type FlareAssessment,
} from '@/lib/autonomic'

// Ink tones, for text inside the white cards, which is nearly all of this page.
const INK = '#141413',
  INK2 = '#5C5A52',
  INK3 = '#5C5A52'
const BORDER = '#DCE6D6',
  WHITE = '#FFFFFF'
const GREEN_DEEP = '#42623C'
const ORANGE = '#D97757',
  CRIT = '#A33417'

// The page, and the few things that sit directly on it.
const PAGE = '#B3DDAC'
const ON = '#141413' // ink, 12.16:1 on the light green
const ON_3 = '#5C5A52' // 4.56:1, the tightest pairing in the system
const RULE = '#7EB382' // hairline, non-text
const CORAL = '#A33417' // warm accent that is legible on light, 4.53:1
const mono = 'var(--font-mono, monospace)'

type Step = 'flags' | 'detail' | 'result'

const numOrNull = (s: string): number | null => {
  const n = Number(s)
  return s.trim() !== '' && Number.isFinite(n) && n > 0 ? n : null
}

export default function FlarePage() {
  const [step, setStep] = useState<Step>('flags')
  const [flags, setFlags] = useState<string[]>([])
  const [feelsLike, setFeelsLike] = useState<'usual' | 'different' | 'unsure' | null>(null)

  const [baselineHr, setBaselineHr] = useState('')
  const [restingHr, setRestingHr] = useState('')
  const [supineHr, setSupineHr] = useState('')
  const [standingHr, setStandingHr] = useState('')
  const [minsStanding, setMinsStanding] = useState('3')
  const [age, setAge] = useState('')

  const [doneSteps, setDoneSteps] = useState<string[]>([])

  const toggle = (id: string) =>
    setFlags((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]))

  const orthostatic = useMemo(() => {
    const s = numOrNull(supineHr),
      st = numOrNull(standingHr)
    if (s == null || st == null) return null
    return assessOrthostatic(
      { supineHr: s, standingHr: st, minutesStanding: Number(minsStanding) || 0 },
      numOrNull(age),
    )
  }, [supineHr, standingHr, minsStanding, age])

  const result: FlareAssessment | null = useMemo(() => {
    if (step !== 'result' || !feelsLike) return null
    return assessFlare({
      redFlagIds: flags,
      feelsLike,
      orthostatic,
      declaredRestingHr: numOrNull(baselineHr),
      currentRestingHr: numOrNull(restingHr),
    })
  }, [step, flags, feelsLike, orthostatic, baselineHr, restingHr])

  // Any red flag skips the questions entirely. Asking someone with stroke signs
  // to type in their resting pulse first would be indefensible.
  const goFromFlags = () => {
    if (flags.length > 0) {
      setFeelsLike('usual')
      setStep('result')
    } else setStep('detail')
  }

  return (
    <div style={{ minHeight: '100dvh', background: PAGE, color: INK }}>
      <div style={{ maxWidth: 620, margin: '0 auto', padding: '20px 20px 120px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <Link
            href="/"
            aria-label="Home"
            style={{
              width: 38,
              height: 38,
              borderRadius: '16px',
              border: `1px solid ${BORDER}`,
              background: WHITE,
              display: 'grid',
              placeItems: 'center',
              color: INK2,
              borderColor: WHITE,
            }}
          >
            <ArrowLeft size={17} />
          </Link>
          <div
            style={{
              fontFamily: 'inherit',
              fontSize: 11,
              letterSpacing: 2,
              color: CORAL,
              fontWeight: 700,
            }}
          >
            FLARE CHECK
          </div>
        </div>

        {/* Always reachable. Present on every step including the reassuring one. */}
        <a
          href="tel:911"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            textDecoration: 'none',
            background: WHITE,
            color: CRIT,
            borderRadius: 14,
            padding: '14px 16px',
            marginBottom: 24,
            borderLeft: `6px solid ${CRIT}`,
          }}
        >
          <Phone size={18} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>Call emergency services</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>
              Do this first if you are frightened. Nothing below is a reason to wait.
            </div>
          </div>
        </a>

        {step === 'flags' && (
          <>
            <h1
              style={{
                color: ON,
                fontSize: 30,
                fontWeight: 800,
                letterSpacing: -0.8,
                lineHeight: 1.15,
                marginBottom: 10,
              }}
            >
              Is any of this happening?
            </h1>
            <p style={{ color: ON, fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
              Read the whole list before answering. These are the things that get explained away by
              people who have felt something similar many times before, and they are also how a
              serious event looks.
            </p>

            <div style={{ display: 'grid', gap: 10 }}>
              {RED_FLAGS.map((f) => {
                const on = flags.includes(f.id)
                return (
                  <button
                    key={f.id}
                    onClick={() => toggle(f.id)}
                    style={{
                      textAlign: 'left',
                      background: on ? '#FBEFEC' : WHITE,
                      border: `1px solid ${on ? CRIT : BORDER}`,
                      borderRadius: 14,
                      padding: '14px 16px',
                      cursor: 'pointer',
                      color: INK,
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '16px',
                        flexShrink: 0,
                        marginTop: 2,
                        border: `1.5px solid ${on ? CRIT : BORDER}`,
                        background: on ? CRIT : 'transparent',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      {on && <Check size={13} color={WHITE} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.4 }}>
                        {f.prompt}
                      </div>
                      {on && (
                        <div style={{ color: CRIT, fontSize: 13, lineHeight: 1.5, marginTop: 6 }}>
                          {f.because}
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            <button
              onClick={goFromFlags}
              style={{
                width: '100%',
                marginTop: 22,
                padding: '16px',
                borderRadius: 14,
                border: 'none',
                background: flags.length ? CRIT : WHITE,
                color: flags.length ? WHITE : INK,
                fontWeight: 800,
                fontSize: 15,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {flags.length ? 'See what to do' : 'None of these'}
              <ChevronRight size={17} />
            </button>
          </>
        )}

        {step === 'detail' && (
          <>
            <h1
              style={{
                color: ON,
                fontSize: 30,
                fontWeight: 800,
                letterSpacing: -0.8,
                lineHeight: 1.15,
                marginBottom: 10,
              }}
            >
              Does this feel like your usual episodes?
            </h1>
            <p style={{ color: ON, fontSize: 15, lineHeight: 1.6, marginBottom: 22 }}>
              You know your own pattern better than any score does. This answer counts for more than
              the numbers underneath it.
            </p>

            <div style={{ display: 'grid', gap: 10, marginBottom: 30 }}>
              {(
                [
                  ['usual', 'Yes, this is familiar', 'It is unpleasant but recognisable.'],
                  [
                    'different',
                    'No, this feels different',
                    'Something about it is not like the others.',
                  ],
                  ['unsure', 'I cannot tell', 'Honest answer, and a useful one.'],
                ] as const
              ).map(([id, label, sub]) => {
                const on = feelsLike === id
                return (
                  <button
                    key={id}
                    onClick={() => setFeelsLike(id)}
                    style={{
                      textAlign: 'left',
                      background: on ? '#F1F3EC' : WHITE,
                      border: `1px solid ${on ? GREEN_DEEP : BORDER}`,
                      borderRadius: 14,
                      padding: '14px 16px',
                      cursor: 'pointer',
                      color: INK,
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{label}</div>
                    <div style={{ color: INK2, fontSize: 13, marginTop: 3 }}>{sub}</div>
                  </button>
                )
              })}
            </div>

            <div
              style={{
                fontFamily: 'inherit',
                fontSize: 10,
                letterSpacing: 1.6,
                color: ON_3,
                fontWeight: 700,
                marginBottom: 12,
              }}
            >
              OPTIONAL NUMBERS
            </div>
            <p style={{ color: ON, fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
              Skip every one of these if you do not have them or do not feel like standing up.
              Leaving them blank does not make the answer worse.
            </p>

            <div style={{ display: 'grid', gap: 12 }}>
              <Field
                label="Your normal resting pulse"
                hint="What it usually reads sitting still on an ordinary day"
                value={baselineHr}
                onChange={setBaselineHr}
              />
              <Field
                label="Your resting pulse right now"
                value={restingHr}
                onChange={setRestingHr}
              />
              <div
                style={{
                  background: WHITE,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 14,
                  padding: 16,
                }}
              >
                <div style={{ color: INK, fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                  Lying down, then standing
                </div>
                <div style={{ color: INK2, fontSize: 13, lineHeight: 1.55, marginBottom: 14 }}>
                  Only if you are safe to stand and someone is nearby. Rest lying down first, take
                  your pulse, then stand and take it again.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <Mini label="Lying" value={supineHr} onChange={setSupineHr} />
                  <Mini label="Standing" value={standingHr} onChange={setStandingHr} />
                  <Mini label="Mins up" value={minsStanding} onChange={setMinsStanding} />
                </div>
                {orthostatic && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${BORDER}` }}>
                    {orthostatic.notes.map((n, i) => (
                      <div
                        key={i}
                        style={{ color: INK2, fontSize: 13, lineHeight: 1.55, marginBottom: 6 }}
                      >
                        {n}
                      </div>
                    ))}
                    <div
                      style={{
                        fontFamily: 'inherit',
                        fontSize: 10,
                        color: INK3,
                        lineHeight: 1.5,
                        marginTop: 8,
                      }}
                    >
                      {BASIS.pots}
                    </div>
                  </div>
                )}
              </div>
              <Field
                label="Your age"
                hint="Changes which threshold applies. The mark is higher between 12 and 19"
                value={age}
                onChange={setAge}
              />
            </div>

            <button
              onClick={() => setStep('result')}
              disabled={!feelsLike}
              style={{
                width: '100%',
                marginTop: 22,
                padding: '16px',
                borderRadius: 14,
                background: feelsLike ? WHITE : 'transparent',
                color: feelsLike ? INK : ON_3,
                border: feelsLike ? 'none' : `1px solid ${RULE}`,
                fontWeight: 800,
                fontSize: 15,
                cursor: feelsLike ? 'pointer' : 'default',
              }}
            >
              {feelsLike ? 'Continue' : 'Pick one of the three above'}
            </button>
          </>
        )}

        {step === 'result' && result && (
          <>
            <div
              style={{
                background:
                  result.outcome === 'escalate'
                    ? '#FBEFEC'
                    : result.outcome === 'unclear'
                      ? '#FDF6EC'
                      : '#F1F3EC',
                border: `1px solid ${result.outcome === 'escalate' ? CRIT : result.outcome === 'unclear' ? ORANGE : GREEN_DEEP}`,
                borderRadius: 18,
                padding: 20,
                marginBottom: 22,
              }}
            >
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                {result.outcome === 'escalate' ? (
                  <AlertTriangle size={20} color={CRIT} style={{ flexShrink: 0, marginTop: 3 }} />
                ) : (
                  <Info
                    size={20}
                    color={result.outcome === 'unclear' ? ORANGE : GREEN_DEEP}
                    style={{ flexShrink: 0, marginTop: 3 }}
                  />
                )}
                <h1
                  style={{
                    color: INK,
                    fontSize: 23,
                    fontWeight: 800,
                    letterSpacing: -0.5,
                    lineHeight: 1.25,
                  }}
                >
                  {result.headline}
                </h1>
              </div>
              <div style={{ marginTop: 14 }}>
                {result.detail.map((d, i) => (
                  <p
                    key={i}
                    style={{ color: INK2, fontSize: 14, lineHeight: 1.6, marginBottom: 8 }}
                  >
                    {d}
                  </p>
                ))}
              </div>
            </div>

            {result.next.includes('counter_manoeuvres') && (
              <>
                <div
                  style={{
                    fontFamily: 'inherit',
                    fontSize: 10,
                    letterSpacing: 1.6,
                    color: ON_3,
                    fontWeight: 700,
                    marginBottom: 10,
                  }}
                >
                  DO THESE IN ORDER
                </div>
                <div style={{ display: 'grid', gap: 10, marginBottom: 24 }}>
                  {COUNTER_STEPS.map((s, i) => {
                    const done = doneSteps.includes(s.id)
                    return (
                      <button
                        key={s.id}
                        onClick={() =>
                          setDoneSteps((d) => (done ? d.filter((x) => x !== s.id) : [...d, s.id]))
                        }
                        style={{
                          textAlign: 'left',
                          background: WHITE,
                          border: `1px solid ${done ? GREEN_DEEP : BORDER}`,
                          borderRadius: 14,
                          padding: '14px 16px',
                          cursor: 'pointer',
                          color: INK,
                          opacity: done ? 0.6 : 1,
                          display: 'flex',
                          gap: 12,
                          alignItems: 'flex-start',
                        }}
                      >
                        <div
                          style={{
                            fontFamily: 'inherit',
                            fontSize: 12,
                            fontWeight: 700,
                            flexShrink: 0,
                            color: done ? GREEN_DEEP : ORANGE,
                            marginTop: 2,
                            width: 20,
                          }}
                        >
                          {done ? '✓' : String(i + 1).padStart(2, '0')}
                        </div>
                        <div>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: 15,
                              textDecoration: done ? 'line-through' : 'none',
                            }}
                          >
                            {s.title}
                            {s.holdSeconds && (
                              <span
                                style={{
                                  fontFamily: 'inherit',
                                  fontSize: 11,
                                  color: INK3,
                                  fontWeight: 400,
                                  marginLeft: 8,
                                }}
                              >
                                {s.holdSeconds}s
                              </span>
                            )}
                          </div>
                          <div
                            style={{ color: INK2, fontSize: 14, lineHeight: 1.55, marginTop: 4 }}
                          >
                            {s.body}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
                <div
                  style={{
                    fontFamily: 'inherit',
                    fontSize: 10,
                    color: ON_3,
                    lineHeight: 1.5,
                    marginBottom: 26,
                  }}
                >
                  {BASIS.counter}
                </div>
              </>
            )}

            <div style={{ display: 'grid', gap: 10, marginBottom: 24 }}>
              {result.next.includes('find_hospital') && (
                <Link href="/card" style={linkCard}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Make an emergency card first</div>
                  <div style={{ color: INK2, fontSize: 13, marginTop: 3 }}>
                    Two minutes. Puts your blood type, allergies and medications where a paramedic
                    can read them without unlocking your phone.
                  </div>
                </Link>
              )}
              <Link href="/rights" style={linkCard}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>What an emergency room owes you</div>
                <div style={{ color: INK2, fontSize: 13, marginTop: 3 }}>
                  They have to examine you whether or not you can pay, and most hospitals must offer
                  financial assistance if you ask. Worth reading before you need it.
                </div>
              </Link>
            </div>

            <button
              onClick={() => {
                setStep('flags')
                setFlags([])
                setFeelsLike(null)
                setDoneSteps([])
              }}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 14,
                border: `1px solid ${BORDER}`,
                background: WHITE,
                color: INK2,
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Start again
            </button>

            <p style={{ color: ON_3, fontSize: 12, lineHeight: 1.6, marginTop: 22 }}>
              {result.disclaimer}
            </p>
          </>
        )}

        <p
          style={{
            color: ON_3,
            fontSize: 12,
            lineHeight: 1.6,
            marginTop: 30,
            paddingTop: 20,
            borderTop: `1px solid ${RULE}`,
          }}
        >
          Nothing on this page is sent anywhere. There is no account and no server call. What you
          type stays in this browser and disappears when you close the tab.
        </p>
      </div>
    </div>
  )
}

const linkCard: React.CSSProperties = {
  display: 'block',
  textDecoration: 'none',
  color: INK,
  background: WHITE,
  border: `1px solid ${BORDER}`,
  borderRadius: 14,
  padding: '14px 16px',
}

function Field({
  label,
  hint,
  value,
  onChange,
}: {
  label: string
  hint?: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label
      style={{
        display: 'block',
        background: WHITE,
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: 16,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 14 }}>{label}</div>
      {hint && (
        <div style={{ color: INK2, fontSize: 13, lineHeight: 1.5, marginTop: 3 }}>{hint}</div>
      )}
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder=". "
        style={{
          marginTop: 10,
          width: '100%',
          fontFamily: 'inherit',
          fontSize: 20,
          fontWeight: 700,
          border: 'none',
          borderBottom: `1px solid ${BORDER}`,
          background: 'transparent',
          color: INK,
          padding: '6px 0',
          outline: 'none',
        }}
      />
    </label>
  )
}

function Mini({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label style={{ display: 'block' }}>
      <div
        style={{
          fontFamily: 'inherit',
          fontSize: 10,
          letterSpacing: 1,
          color: INK3,
          fontWeight: 700,
        }}
      >
        {label.toUpperCase()}
      </div>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder=". "
        style={{
          marginTop: 4,
          width: '100%',
          fontFamily: 'inherit',
          fontSize: 19,
          fontWeight: 700,
          border: 'none',
          borderBottom: `1px solid ${BORDER}`,
          background: 'transparent',
          color: INK,
          padding: '5px 0',
          outline: 'none',
        }}
      />
    </label>
  )
}
