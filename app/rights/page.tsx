'use client'
// What an emergency room owes you.
//
// WHY THIS IS IN A ROUTING APP
// The app decides which hospital, and then a person decides whether to go at all.
// For the people this is built for, that second decision is usually made on money
// rather than on symptoms, and made on bad information. Two facts change it: an
// emergency department has to examine and stabilise you regardless of ability to
// pay, and every nonprofit hospital is legally required to have a financial
// assistance policy that most patients are never told about.
//
// WHY EVERY ITEM SHOWS ITS LIMIT
// The tempting version of this page says the emergency room is free. It is not,
// and writing that would produce exactly the ambush it is meant to prevent —
// someone reassured into a visit, then a bill they were told would not come, and
// a project that lied to them. So `limit` is a required field on every right in
// lib/rights and it is rendered every time, at the same weight as the claim.
//
// There are no dollar amounts and no income cut-offs anywhere on this page.
// Federal law sets none — each hospital picks its own — so any number printed
// here would be wrong somewhere, and a wrong number is worse than no number when
// someone is deciding whether they qualify.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Scale, AlertCircle, ArrowRight, Printer } from 'lucide-react'
import { rightsFor, guessCountry, COUNTRIES, type Country } from '@/lib/rights'

const INK = '#141413', INK2 = '#5C5A52', INK3 = '#84827A'
const CREAM = '#EFF2E8', BORDER = '#DCE1D0', WHITE = '#FFFFFF'
const GREEN_DEEP = '#5F7049'
const ORANGE = '#D97757'
const mono = 'var(--font-mono, monospace)'

export default function RightsPage() {
  // Starts at US so the server-rendered HTML has real content in it for a
  // crawler, then corrects on mount. Rendering nothing until the locale is known
  // is the mistake that made the homepage invisible to search — see app/page.tsx.
  const [country, setCountry] = useState<Country>('US')
  useEffect(() => {
    try { setCountry(guessCountry(navigator.language)) } catch { /* keep US */ }
  }, [])

  const pack = rightsFor(country)

  return (
    <div style={{ minHeight: '100dvh', background: CREAM, color: INK }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 20px 120px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <Link href="/" aria-label="Home" style={{
            width: 38, height: 38, borderRadius: 12, border: `1px solid ${BORDER}`,
            background: WHITE, display: 'grid', placeItems: 'center', color: INK2,
          }}>
            <ArrowLeft size={17} />
          </Link>
          <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: 2, color: ORANGE, fontWeight: 700 }}>
            KNOW YOUR RIGHTS
          </div>
        </div>

        <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1, lineHeight: 1.12, marginBottom: 14 }}>
          What an emergency room owes you, and what it does not.
        </h1>
        <p style={{ color: INK2, fontSize: 16, lineHeight: 1.65, marginBottom: 26 }}>{pack.preamble}</p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 32, flexWrap: 'wrap' }}>
          {COUNTRIES.map(c => {
            const on = c.code === country
            return (
              <button key={c.code} onClick={() => setCountry(c.code)} style={{
                fontFamily: mono, fontSize: 11, letterSpacing: 1, fontWeight: 700,
                padding: '9px 14px', borderRadius: 999, cursor: 'pointer',
                border: `1px solid ${on ? INK : BORDER}`,
                background: on ? INK : WHITE, color: on ? WHITE : INK2,
              }}>
                {c.label.toUpperCase()}
              </button>
            )
          })}
        </div>

        {pack.rights.length === 0 && (
          <div style={{
            background: '#FDF6EC', border: `1px solid ${ORANGE}`, borderRadius: 16, padding: 20,
            display: 'flex', gap: 12, alignItems: 'flex-start',
          }}>
            <AlertCircle size={19} color={ORANGE} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ color: INK2, fontSize: 15, lineHeight: 1.6 }}>
              Nothing has been written for {pack.label} yet, and the American version is not close
              enough to adapt. Leaving it blank is the honest option — a confidently wrong card
              about who has to treat you is worse than no card.
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gap: 16 }}>
          {pack.rights.map((r, i) => (
            <article key={r.id} style={{
              background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 20,
            }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{
                  fontFamily: mono, fontSize: 12, fontWeight: 700, color: ORANGE, marginTop: 4, flexShrink: 0,
                }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <h2 style={{ fontSize: 19, fontWeight: 800, letterSpacing: -0.4, lineHeight: 1.3 }}>
                  {r.title}
                </h2>
              </div>

              <p style={{ color: INK2, fontSize: 15, lineHeight: 1.65, marginBottom: 14 }}>{r.body}</p>

              {/* Rendered at the same weight as the claim, never as fine print. */}
              <div style={{
                background: CREAM, borderLeft: `2px solid ${INK3}`, borderRadius: 6,
                padding: '12px 14px', marginBottom: r.action ? 12 : 14,
              }}>
                <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: 1.4, color: INK3, fontWeight: 700, marginBottom: 5 }}>
                  WHAT IT DOES NOT DO
                </div>
                <div style={{ color: INK2, fontSize: 14, lineHeight: 1.6 }}>{r.limit}</div>
              </div>

              {r.action && (
                <div style={{
                  background: '#F1F3EC', borderLeft: `2px solid ${GREEN_DEEP}`, borderRadius: 6,
                  padding: '12px 14px', marginBottom: 14,
                }}>
                  <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: 1.4, color: GREEN_DEEP, fontWeight: 700, marginBottom: 5 }}>
                    WHAT TO ACTUALLY DO
                  </div>
                  <div style={{ color: INK2, fontSize: 14, lineHeight: 1.6 }}>{r.action}</div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: INK3, fontFamily: mono, fontSize: 10, lineHeight: 1.5 }}>
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
                width: '100%', marginTop: 24, padding: '15px', borderRadius: 14,
                border: `1px solid ${BORDER}`, background: WHITE, color: INK,
                fontWeight: 700, fontSize: 15, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
              }}
            >
              <Printer size={17} />
              Print this and put it with your insurance card
            </button>

            <Link href="/flare" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              textDecoration: 'none', color: INK, marginTop: 12,
              background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '15px 16px',
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Not sure whether to go at all?</div>
                <div style={{ color: INK2, fontSize: 13, marginTop: 3 }}>
                  The flare check walks the signs that need an emergency room and the ones that usually do not.
                </div>
              </div>
              <ArrowRight size={17} color={INK3} style={{ flexShrink: 0, marginLeft: 12 }} />
            </Link>
          </>
        )}

        <p style={{ color: INK3, fontSize: 12, lineHeight: 1.65, marginTop: 30, paddingTop: 20, borderTop: `1px solid ${BORDER}` }}>
          This is a plain-language summary of published law, not legal advice, and Relay Arc is not
          a law firm. Hospitals set their own eligibility rules within these requirements, so the
          only way to find out what you qualify for is to ask that hospital for its policy in
          writing.
        </p>
      </div>
    </div>
  )
}
