'use client'
// Date entry that does not make you scroll back forty years.
import { useEffect, useMemo, useRef, useState } from 'react'

const INK = '#141413',
  INK2 = '#5C5A52',
  INK3 = '#5C5A52'
const BORDER = '#E4E4E7',
  WHITE = '#FFFFFF',
  CRIT = '#A33417'

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
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
  value,
  onChange,
  label,
  hint,
  maxYear,
  minYear = 1900,
  id,
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
    if (p.y || p.m || p.d) {
      setD(p.d)
      setM(p.m)
      setY(p.y)
    }
  }, [value])

  const error = useMemo(() => {
    if (!d && !m && !y) return null // empty is not an error, it is unfilled
    if (!d || !m || !y) return null // mid-typing, do not scold
    // Wait for all four digits before judging the year.
    if (y.length < 4) return null
    const yi = Number(y),
      mi = Number(m),
      di = Number(d)
    if (yi < minYear || yi > hiY) return `Year must be between ${minYear} and ${hiY}`
    if (di > daysInMonth(yi, mi))
      return `${MONTHS[mi - 1]} ${yi} only has ${daysInMonth(yi, mi)} days`
    return null
  }, [d, m, y, minYear, hiY])

  // THE BUG THIS FIXES, because it is not obvious from the code.
  const selectAll = (e: React.FocusEvent<HTMLInputElement>) => {
    const el = e.currentTarget
    // Immediately, which is what a keyboard focus needs.
    el.select()
    // And again on the next macrotask, which is what a click or tap needs, because mouseup
    // lands after focus and collapses the selection to a caret.
    setTimeout(() => {
      if (document.activeElement === el) el.select()
    }, 0)
  }

  // Push upward only when the date is complete and valid, so a half-typed year
  // never lands in the database as 0002-05-14.
  useEffect(() => {
    // y.length === 4 is load-bearing, not belt and braces.
    if (d && m && y.length === 4 && !error) {
      const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
      if (iso !== value) onChange(iso)
    } else if (!d && !m && !y && value) {
      onChange('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, m, y, error])

  const seg: React.CSSProperties = {
    border: 'none',
    outline: 'none',
    background: 'transparent',
    fontSize: 17,
    fontWeight: 600,
    color: INK,
    fontFamily: 'inherit',
    padding: '12px 0',
    textAlign: 'center',
    minWidth: 0,
  }

  return (
    <div>
      <label
        htmlFor={id}
        style={{
          display: 'block',
          fontSize: 13.5,
          fontWeight: 700,
          color: INK,
          marginBottom: hint ? 3 : 7,
        }}
      >
        {label}
      </label>
      {hint && (
        <p style={{ fontSize: 12.5, color: INK2, lineHeight: 1.5, marginBottom: 8 }}>{hint}</p>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '58px 1fr 74px',
          alignItems: 'center',
          background: WHITE,
          border: `1.5px solid ${error ? CRIT : BORDER}`,
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        <input
          id={id}
          ref={dayRef}
          inputMode="numeric"
          placeholder="DD"
          maxLength={2}
          value={d}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '').slice(0, 2)
            setD(v)
            // Two digits, or a leading digit that cannot start a valid day —
            // 4 through 9 can only be a single-digit day — so move on.
            if (v.length === 2 || (v.length === 1 && Number(v) > 3)) {
              ;(document.getElementById(`${id}-month`) as HTMLSelectElement | null)?.focus()
            }
          }}
          onFocus={selectAll}
          // Typing "14" produced "01".
          onBlur={() => setD((prev) => (prev.length === 1 ? prev.padStart(2, '0') : prev))}
          autoComplete="bday-day"
          style={{ ...seg, borderRight: `1px solid ${BORDER}` }}
          aria-label="Day"
        />

        <select
          id={`${id}-month`}
          value={m}
          onChange={(e) => {
            setM(e.target.value)
            if (e.target.value) yearRef.current?.focus()
          }}
          style={{
            ...seg,
            textAlign: 'left',
            paddingLeft: 12,
            paddingRight: 8,
            cursor: 'pointer',
            appearance: 'none',
            color: m ? INK : INK3,
            borderRight: `1px solid ${BORDER}`,
            width: '100%',
          }}
          aria-label="Month"
        >
          <option value="">Month</option>
          {MONTHS.map((name, i) => (
            <option key={name} value={String(i + 1).padStart(2, '0')}>
              {name}
            </option>
          ))}
        </select>

        <input
          ref={yearRef}
          inputMode="numeric"
          placeholder="YYYY"
          maxLength={4}
          value={y}
          onChange={(e) => setY(e.target.value.replace(/\D/g, '').slice(0, 4))}
          onFocus={selectAll}
          // Backspace on an empty year goes back to the month, so correcting a
          // date is one continuous motion rather than a hunt for the right box.
          onKeyDown={(e) => {
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
