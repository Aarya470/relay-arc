// Split page opening shared by the public pages, same as the homepage:
// big title on the left, the plain explanation and actions on the right.
export default function PageHero({
  title,
  children,
  actions,
}: {
  title: React.ReactNode
  children?: React.ReactNode
  actions?: { label: string; href: string; primary?: boolean }[]
}) {
  return (
    <header className="phero">
      <h1 className="phero-t" data-reveal>{title}</h1>
      <div className="phero-r" data-reveal>
        {children}
        {actions && actions.length > 0 && (
          <div className="phero-a">
            {actions.map((a) => (
              <a key={a.href} href={a.href} className={`sh-pill ${a.primary ? 'sh-pill-ink' : 'sh-pill-line'}`} style={{ minHeight: '50px', padding: '0 24px' }}>
                {a.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}
