'use client'
// One collapsible group. Opens by growing a grid row, so nothing is measured.
import { useId, useState } from 'react'

export default function Accordion({
  title,
  hint,
  defaultOpen = false,
  children,
}: {
  title: string
  hint?: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  return (
    <div>
      <button
        className="row"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        style={{ padding: '16px' }}
      >
        <span style={{ flex: 1 }}>
          <span className="row-title" style={{ display: 'block' }}>
            {title}
          </span>
          {hint ? (
            <span className="row-sub" style={{ display: 'block' }}>
              {hint}
            </span>
          ) : null}
        </span>
        <span className="row-end acc-chevron" aria-hidden>
          ›
        </span>
      </button>
      <div className="acc-panel" data-open={open} id={id} role="region" aria-label={title}>
        <div>
          <div style={{ padding: '0 6px 10px' }} inert={!open}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
