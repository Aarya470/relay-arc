'use client'
// Text size, contrast, motion and link underlines. Each control is a real radio
// group, so it works with a keyboard and reads correctly in a screen reader.
import { useEffect, useId, useState } from 'react'
import { AccessPrefs, DEFAULT_ACCESS, readAccess, saveAccess } from '@/lib/access'

type Opt<K extends keyof AccessPrefs> = { v: AccessPrefs[K]; label: string }

function Group<K extends keyof AccessPrefs>({
  k,
  title,
  hint,
  opts,
  prefs,
  set,
}: {
  k: K
  title: string
  hint: string
  opts: Opt<K>[]
  prefs: AccessPrefs
  set: (p: AccessPrefs) => void
}) {
  const id = useId()
  return (
    <div className="acc-group">
      <p id={id} className="acc-title">{title}</p>
      <p className="acc-hint">{hint}</p>
      <div className="seg" role="radiogroup" aria-labelledby={id}>
        {opts.map((o) => {
          const on = prefs[k] === o.v
          return (
            <button
              key={String(o.v)}
              role="radio"
              aria-checked={on}
              data-on={on}
              tabIndex={on ? 0 : -1}
              onClick={() => set({ ...prefs, [k]: o.v })}
              onKeyDown={(e) => {
                const i = opts.findIndex((x) => x.v === prefs[k])
                const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
                if (!step) return
                e.preventDefault()
                const next = opts[(i + step + opts.length) % opts.length]
                set({ ...prefs, [k]: next.v })
                const sib = (e.currentTarget.parentElement?.children[(i + step + opts.length) % opts.length] as HTMLElement) || null
                sib?.focus()
              }}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function AccessPanel() {
  const [prefs, setPrefs] = useState<AccessPrefs>(DEFAULT_ACCESS)
  useEffect(() => setPrefs(readAccess()), [])
  const set = (p: AccessPrefs) => {
    setPrefs(p)
    saveAccess(p)
  }
  return (
    <div className="acc-panel-wrap">
      <Group k="text" title="Text size" hint="Makes every page bigger, including buttons" prefs={prefs} set={set}
        opts={[{ v: 'md', label: 'Normal' }, { v: 'lg', label: 'Large' }, { v: 'xl', label: 'Largest' }]} />
      <Group k="contrast" title="Contrast" hint="Solid panels and darker text" prefs={prefs} set={set}
        opts={[{ v: 'normal', label: 'Normal' }, { v: 'high', label: 'High' }]} />
      <Group k="motion" title="Motion" hint="Turn off sliding and fading, helpful with dizziness" prefs={prefs} set={set}
        opts={[{ v: 'system', label: 'Follow phone' }, { v: 'reduce', label: 'Reduce' }]} />
      <Group k="links" title="Links" hint="Underline every link so they are easy to spot" prefs={prefs} set={set}
        opts={[{ v: 'normal', label: 'Normal' }, { v: 'underline', label: 'Underline' }]} />
      {(prefs.text !== 'md' || prefs.contrast !== 'normal' || prefs.motion !== 'system' || prefs.links !== 'normal') && (
        <button className="acc-reset" onClick={() => set(DEFAULT_ACCESS)}>Reset to normal</button>
      )}
    </div>
  )
}
