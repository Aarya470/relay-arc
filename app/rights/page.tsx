'use client'
// What an emergency room owes you.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Scale, AlertCircle, ArrowRight, Printer } from 'lucide-react'
import { rightsFor, guessCountry, COUNTRIES, type Country } from '@/lib/rights'

// Ink tones. These are for text INSIDE the white cards, which is most of this
// page, so they are unchanged.
const INK = '#141413',
  INK2 = '#5C5A52',
  INK3 = '#5C5A52'
const WHITE = '#FFFFFF'
const GREEN_DEEP = '#42623C'
const ORANGE = '#D97757'

// The page, and text ON it.
const PAGE = '#B3DDAC'
const ON = '#141413' // ink, 12.16:1
const ON_3 = '#5C5A52' // 4.56:1, passes for body text now
const RULE = '#7EB382' // hairline, non-text
const CORAL = '#A33417' // ORANGE is 2.96:1 on light and unusable as text

// A light tint for the block inside each white card. This is the job the old
// CREAM constant used to do, kept separate now that the page itself is dark.
const TINT = '#EDF2E9'
const BORDER = '#DCE6D6' // card-internal hairline, on white
const mono = 'var(--font-mono, monospace)'

export default function RightsPage() {
  // Starts at US so the server-rendered HTML has real content in it for a
  // crawler, then corrects on mount. Rendering nothing until the locale is known
  // is the mistake that made the homepage invisible to search — see app/page.tsx.
  const [country, setCountry] = useState<Country>('US')
  useEffect(() => {
    try {
      setCountry(guessCountry(navigator.language))
    } catch {
      /* keep US */
    }
  }, [])

  const pack = rightsFor(country)

  return (
    <div style={{ minHeight: '100dvh', background: PAGE, color: INK }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 20px 120px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <Link
            href="/"
            aria-label="Home"
            style={{
              width: 38,
              height: 38,
              borderRadius: '4px',
              border: `1px solid ${WHITE}`,
              background: WHITE,
              display: 'grid',
              placeItems: 'center',
              color: INK2,
            }}
          >
            <ArrowLeft size={17} />
          </Link>
          <div
            style={{
              fontFamily: mono,
              fontSize: 11,
              letterSpacing: 2,
              color: CORAL,
              fontWeight: 700,
            }}
          >
            KNOW YOUR RIGHTS
          </div>
        </div>

        <h1
          style={{
            color: ON,
            fontSize: 34,
            fontWeight: 800,
            letterSpacing: -1,
            lineHeight: 1.12,
            marginBottom: 14,
          }}
        >
          What an emergency room owes you, and what it does not.
        </h1>
        <p style={{ color: ON, fontSize: 16, lineHeight: 1.65, marginBottom: 26 }}>
          {pack.preamble}
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 32, flexWrap: 'wrap' }}>
          {COUNTRIES.map((c) => {
            const on = c.code === country
            return (
              <button
                key={c.code}
                onClick={() => setCountry(c.code)}
                style={{
                  fontFamily: mono,
                  fontSize: 11,
                  letterSpacing: 1,
                  fontWeight: 700,
                  padding: '9px 14px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  border: `1px solid ${on ? WHITE : RULE}`,
                  background: on ? WHITE : 'transparent',
                  color: on ? INK : ON,
                }}
              >
                {c.label.toUpperCase()}
              </button>
            )
          })}
        </div>

        {pack.rights.length === 0 && (
          <div
            style={{
              background: '#FDF6EC',
              border: `1px solid ${ORANGE}`,
              borderRadius: 16,
              padding: 20,
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
            }}
          >
            <AlertCircle size={19} color={ORANGE} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ color: INK2, fontSize: 15, lineHeight: 1.6 }}>
              Nothing has been written for {pack.label} yet, and the American version is not close
              enough to adapt. Leaving it blank is the honest option. A confidently wrong card about
              who has to treat you is worse than no card.
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gap: 16 }}>
          {pack.rights.map((r, i) => (
            <article
              key={r.id}
              style={{
                background: WHITE,
                border: `1px solid ${BORDER}`,
                borderRadius: 18,
                padding: 20,
              }}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#A33417',
                    marginTop: 4,
                    flexShrink: 0,
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </div>
                <h2 style={{ fontSize: 19, fontWeight: 800, letterSpacing: -0.4, lineHeight: 1.3 }}>
                  {r.title}
                </h2>
              </div>

              <p style={{ color: INK2, fontSize: 15, lineHeight: 1.65, marginBottom: 14 }}>
                {r.body}
              </p>

              {/* Rendered at the same weight as the claim, never as fine print. */}
              <div
                style={{
                  background: TINT,
                  borderLeft: `2px solid ${INK3}`,
                  borderRadius: '4px',
                  padding: '12px 14px',
                  marginBottom: r.action ? 12 : 14,
                }}
              >
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: 10,
                    letterSpacing: 1.4,
                    color: INK3,
                    fontWeight: 700,
                    marginBottom: 5,
                  }}
                >
                  WHAT IT DOES NOT DO
                </div>
                <div style={{ color: INK2, fontSize: 14, lineHeight: 1.6 }}>{r.limit}</div>
              </div>

              {r.action && (
                <div
                  style={{
                    background: '#F1F3EC',
                    borderLeft: `2px solid ${GREEN_DEEP}`,
                    borderRadius: '4px',
                    padding: '12px 14px',
                    marginBottom: 14,
                  }}
                >
                  <div
                    style={{
                      fontFamily: mono,
                      fontSize: 10,
                      letterSpacing: 1.4,
                      color: GREEN_DEEP,
                      fontWeight: 700,
                      marginBottom: 5,
                    }}
                  >
                    WHAT TO ACTUALLY DO
                  </div>
                  <div style={{ color: INK2, fontSize: 14, lineHeight: 1.6 }}>{r.action}</div>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  color: INK3,
                  fontFamily: mono,
                  fontSize: 10,
                  lineHeight: 1.5,
                }}
              >
                <Scale size={12} style={{ flexShrink: 0 }} />
                {r.basis}
              </div>
            </article>
          ))}
        </div>

        {pack.rights.length > 0 && (
          <>
            <button
              onClick={() => window.print()}
              style={{
                width: '100%',
                marginTop: 24,
                padding: '15px',
                borderRadius: 14,
                border: `1px solid ${WHITE}`,
                background: WHITE,
                color: INK,
                fontWeight: 700,
                fontSize: 15,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 9,
              }}
            >
              <Printer size={17} />
              Print this and put it with your insurance card
            </button>

            <Link
              href="/flare"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                textDecoration: 'none',
                color: INK,
                marginTop: 12,
                background: WHITE,
                border: `1px solid ${WHITE}`,
                borderRadius: 14,
                padding: '15px 16px',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Not sure whether to go at all?</div>
                <div style={{ color: INK2, fontSize: 13, marginTop: 3 }}>
                  The flare check walks the signs that need an emergency room and the ones that
                  usually do not.
                </div>
              </div>
              <ArrowRight size={17} color={INK3} style={{ flexShrink: 0, marginLeft: 12 }} />
            </Link>
          </>
        )}

        <p
          style={{
            color: ON_3,
            fontSize: 12,
            lineHeight: 1.65,
            marginTop: 30,
            paddingTop: 20,
            borderTop: `1px solid ${RULE}`,
          }}
        >
          This is a plain-language summary of published law, not legal advice, and Relay Arc is not
          a law firm. Hospitals set their own eligibility rules within these requirements, so the
          only way to find out what you qualify for is to ask that hospital for its policy in
          writing.
        </p>
      </div>
    </div>
  )
}
