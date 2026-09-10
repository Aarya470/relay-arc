'use client'
// Date entry that does not make you scroll back forty years.
//
// WHY NOT `<input type="date">`
// It was what onboarding used, and it is the wrong control for the two dates
// this app asks for. The browser hands rendering to the OS, so it looks
// different on every device and matches nothing else on the page, and on Android
// it is a spinner. Worse, both fields here are dates in the *past*: a date of
// birth is thirty or fifty years back, and the native picker opens on the
// current month with arrows that move one month at a time. That is six hundred
// taps to reach 1974. People give up, or they type a wrong year and never
// notice.
//
// WHAT THIS DOES INSTEAD
// Three separate inputs — day, month, year — because that is how a person says a
// date out loud, and each one is reachable in a single tap. The month is a
// select, so 03 versus 3 versus March stops being a guess, and the ambiguity
// between US and rest-of-world ordering disappears with it. Focus advances
// automatically once a segment can no longer take another digit.
//
// WHY THE YEAR FIELD IS PLAIN NUMERIC AND NOT A DROPDOWN
// A hundred-item year dropdown is its own scrolling problem. Typing four digits
// is faster than any list, and it is the one segment where a keyboard genuinely
// wins.
//
// The value in and out is always ISO yyyy-mm-dd, so this drops into anything
// that used the native input without touching the calling code or the database.
import { useEffect, useMemo, useRef, useState } from 'react'

const INK = '#141413', INK2 = '#5C5A52', INK3 = '#6F6D65'
const BORDER = '#98C890', WHITE = '#FFFFFF', CRIT = '#A33417'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** Days in a month, leap years included — 29 February is a real birthday. */
function daysInMonth(year: number, month1: number): number {
  if (!year || !month1) return 31
  return new Date(year, month1, 0).getDate()
}

function parseISO(v: string): { d: string; m: string; y: string } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '')
  if (!m) return { d: '', m: '', y: '' }
  return { y: m[1], m: m[2], d: m[3] }
}

export default function DateField({
  value, onChange, label, hint, maxYear, minYear = 1900, id,
}: {
  value: string
  onChange: (iso: string) => void
  label: string
  hint?: string
  /** Defaults to this year. Neither a birthday nor a past surgery is in the future. */
  maxYear?: number
  minYear?: number
  id?: string
}) {
  const thisYear = new Date().getFullYear()
  const hiY = maxYear ?? thisYear

  const init = parseISO(value)
  const [d, setD] = useState(init.d)
  const [m, setM] = useState(init.m)
  const [y, setY] = useState(init.y)

  const dayRef = useRef<HTMLInputElement>(null)
  const yearRef = useRef<HTMLInputElement>(null)

  // Re-sync when the parent replaces the value, e.g. a profile finishing its
  // load after the field has already rendered empty.
  useEffect(() => {
    const p = parseISO(value)
    if (p.y || p.m || p.d) { setD(p.d); setM(p.m); setY(p.y) }
  }, [value])

  const error = useMemo(() => {
    if (!d && !m && !y) return null            // empty is not an error, it is unfilled
    if (!d || !m || !y) return null            // mid-typing, do not scold
    // Wait for all four digits before judging the year. Checking earlier meant
    // the field went red and shouted "Year must be between 1900 and 2026" after
    // the first keystroke of every single year anyone ever typed, because "1" is
    // indeed less than 1900. It looked broken, and it was the app's fault.
    if (y.length < 4) return null
    const yi = Number(y), mi = Number(m), di = Number(d)
    if (yi < minYear || yi > hiY) return `Year must be between ${minYear} and ${hiY}`
    if (di > daysInMonth(yi, mi)) return `${MONTHS[mi - 1]} ${yi} only has ${daysInMonth(yi, mi)} days`
    return null
  }, [d, m, y, minYear, hiY])

  // THE BUG THIS FIXES, because it is not obvious from the code.
  //
  // The day is padded to two digits on blur, and maxLength is 2. So once a day
  // has been entered the field is FULL, and the browser silently discards every
  // further keystroke. Tap the day, type a number, and nothing happens. The year
  // behaves the same way once it holds four digits.
  //
  // On a desktop you can rescue yourself by selecting the text first. On a phone
  // tapping an input just places a caret, so the field is simply dead, which is
  // exactly what people meant by "it does not let me type".
  //
  // Selecting the contents on focus makes the first keystroke replace what is
  // there, which is how every segmented date field behaves and what people
  // already expect.
  const selectAll = (e: React.FocusEvent<HTMLInputElement>) => e.currentTarget.select()

  // Push upward only when the date is complete and valid, so a half-typed year
  // never lands in the database as 0002-05-14.
  useEffect(() => {
    if (d && m && y && !error) {
      const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
      if (iso !== value) onChange(iso)
    } else if (!d && !m && !y && value) {
      onChange('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, m, y, error])

  const seg: React.CSSProperties = {
    border: 'none', outline: 'none', background: 'transparent',
    fontSize: 17, fontWeight: 600, color: INK, fontFamily: 'inherit',
    padding: '12px 0', textAlign: 'center', minWidth: 0,
  }

  return (
    <div>
      <label htmlFor={id} style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: INK, marginBottom: hint ? 3 : 7 }}>
        {label}
      </label>
      {hint && <p style={{ fontSize: 12.5, color: INK2, lineHeight: 1.5, marginBottom: 8 }}>{hint}</p>}

      <div style={{
        display: 'grid', gridTemplateColumns: '58px 1fr 74px', alignItems: 'center',
        background: WHITE, border: `1.5px solid ${error ? CRIT : BORDER}`, borderRadius: 10,
        overflow: 'hidden',
      }}>
        <input
          id={id}
          ref={dayRef}
          inputMode="numeric"
          placeholder="DD"
          maxLength={2}
          value={d}
          onChange={e => {
            const v = e.target.value.replace(/\D/g, '').slice(0, 2)
            setD(v)
            // Two digits, or a leading digit that cannot start a valid day —
            // 4 through 9 can only be a single-digit day — so move on.
            if (v.length === 2 || (v.length === 1 && Number(v) > 3)) {
              (document.getElementById(`${id}-month`) as HTMLSelectElement | null)?.focus()
            }
          }}
          onFocus={selectAll}
          // THE BUG THAT ACTUALLY BROKE DATE ENTRY. Typing "14" produced "01".
          //
          // This used to read `d` from the enclosing render:
          //     onBlur={() => { if (d.length === 1) setD(d.padStart(2, '0')) }}
          //
          // Typing the second digit does two things in the same tick. onChange
          // calls setD("14"), and because the field is now full, focus moves to
          // the month, which fires blur. React has not re-rendered yet, so `d`
          // inside blur is still "1" from the previous render. It sees length 1,
          // pads, and calls setD("01"), which lands after setD("14") and wins.
          //
          // So every two-digit day silently became a zero plus its first digit.
          // 14 became 01, 23 became 02, 31 became 03. Single-digit days were
          // fine, which is why this survived: 7 advances immediately and blur
          // pads the same value it already holds.
          //
          // The functional updater reads the committed state instead of a
          // captured copy, so there is no stale value to overwrite with.
          onBlur={() => setD(prev => (prev.length === 1 ? prev.padStart(2, '0') : prev))}
          autoComplete="bday-day"
          style={{ ...seg, borderRight: `1px solid ${BORDER}` }}
          aria-label="Day"
        />

        <select
          id={`${id}-month`}
          value={m}
          onChange={e => { setM(e.target.value); if (e.target.value) yearRef.current?.focus() }}
          style={{
            ...seg, textAlign: 'left', paddingLeft: 12, paddingRight: 8,
            cursor: 'pointer', appearance: 'none',
            color: m ? INK : INK3, borderRight: `1px solid ${BORDER}`,
            width: '100%',
          }}
          aria-label="Month"
        >
          <option value="">Month</option>
          {MONTHS.map((name, i) => (
            <option key={name} value={String(i + 1).padStart(2, '0')}>{name}</option>
          ))}
        </select>

        <input
          ref={yearRef}
          inputMode="numeric"
          placeholder="YYYY"
          maxLength={4}
          value={y}
          onChange={e => setY(e.target.value.replace(/\D/g, '').slice(0, 4))}
          onFocus={selectAll}
          // Backspace on an empty year goes back to the month, so correcting a
          // date is one continuous motion rather than a hunt for the right box.
          onKeyDown={e => {
            if (e.key === 'Backspace' && y === '') {
              e.preventDefault()
              ;(document.getElementById(`${id}-month`) as HTMLSelectElement | null)?.focus()
            }
          }}
          autoComplete="bday-year"
          style={seg}
          aria-label="Year"
        />
      </div>

      {error && (
        <p style={{ fontSize: 12.5, color: CRIT, marginTop: 6, lineHeight: 1.5 }}>{error}</p>
      )}
    </div>
  )
}
