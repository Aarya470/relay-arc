'use client'
// Shared building blocks for the signed in app screens, so every screen has
// the same header, the same panels and the same accents.
import { useRouter } from 'next/navigation'
import { SearchButton } from '@/components/CommandPalette'

export function AppHeader({
  title,
  sub,
  back = '/dashboard',
  backLabel = 'Home',
  right,
}: {
  title: string
  sub?: React.ReactNode
  back?: string | null
  backLabel?: string
  right?: React.ReactNode
}) {
  const router = useRouter()
  return (
    <header className="ak-header">
      <div className="ak-header-row">
        {back !== null ? (
          <button className="ak-pill glass" onClick={() => router.push(back)} aria-label={`Back to ${backLabel}`}>
            ← {backLabel}
          </button>
        ) : (
          <span />
        )}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {right}
          <SearchButton />
        </div>
      </div>
      <h1 className="ak-title">{title}</h1>
      {sub ? <p className="ak-sub">{sub}</p> : null}
    </header>
  )
}

/** Dark green feature card: the one thing on the screen that matters most. */
export function Hero({ children, tone = 'forest', style }: { children: React.ReactNode; tone?: 'forest' | 'orange'; style?: React.CSSProperties }) {
  return (
    <section className={`ak-hero ak-hero-${tone}`} style={style}>
      <span className="ak-hero-grid" aria-hidden />
      <div style={{ position: 'relative' }}>{children}</div>
    </section>
  )
}

/** Frosted panel with an optional heading row and a coloured edge. */
export function Panel({
  title,
  aside,
  accent,
  children,
  style,
  pad = true,
}: {
  title?: React.ReactNode
  aside?: React.ReactNode
  accent?: 'green' | 'orange'
  children: React.ReactNode
  style?: React.CSSProperties
  pad?: boolean
}) {
  return (
    <section className={`glass ak-panel${accent ? ` ak-accent-${accent}` : ''}`} style={{ padding: pad ? undefined : 0, ...style }}>
      {title ? (
        <div className="ak-panel-head" style={pad ? undefined : { padding: '18px 18px 0' }}>
          <h2 className="ak-panel-title">{title}</h2>
          {aside ? <span className="ak-panel-aside">{aside}</span> : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}

/** Big number with a unit, for vitals and counts. */
export function Metric({ value, unit, label }: { value: React.ReactNode; unit?: string; label?: string }) {
  return (
    <div className="ak-metric">
      <span className="ak-metric-v">{value}</span>
      {unit ? <span className="ak-metric-u">{unit}</span> : null}
      {label ? <span className="ak-metric-l">{label}</span> : null}
    </div>
  )
}
