'use client'
// Command palette. Press Cmd+K or Ctrl+K anywhere, or click a Search button.
// Finds pages and runs quick actions. Actions that matter ask first in a modal.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Item = {
  id: string
  group: 'Emergency' | 'Go to' | 'Actions' | 'About'
  label: string
  hint?: string
  words?: string
  auth?: boolean
  run: 'go' | 'confirm-call' | 'confirm-signout' | 'copy-card'
  href?: string
}

const ITEMS: Item[] = [
  { id: 'sos', group: 'Emergency', label: 'Start SOS', hint: 'Find a hospital now', words: 'emergency help urgent', run: 'go', href: '/emergency' },
  { id: 'call', group: 'Emergency', label: 'Call 911', hint: 'Opens your phone dialer', words: 'ambulance emergency', run: 'confirm-call' },
  { id: 'card', group: 'Emergency', label: 'Emergency card', hint: 'Make or edit your card', words: 'medical id lock screen', run: 'go', href: '/card' },
  { id: 'home', group: 'Go to', label: 'Home', auth: true, run: 'go', href: '/dashboard', words: 'dashboard' },
  { id: 'checkin', group: 'Go to', label: 'Daily check in', auth: true, run: 'go', href: '/checkin', words: 'chat feeling' },
  { id: 'vitals', group: 'Go to', label: 'Vitals check', hint: 'Pulse and breathing', auth: true, run: 'go', href: '/check', words: 'heart rate news2' },
  { id: 'meds', group: 'Go to', label: 'Medications', auth: true, run: 'go', href: '/medications', words: 'pills doses medicine' },
  { id: 'symptoms', group: 'Go to', label: 'Symptoms', auth: true, run: 'go', href: '/symptoms', words: 'log dizziness fatigue' },
  { id: 'profile', group: 'Go to', label: 'Medical profile', auth: true, run: 'go', href: '/medical-profile', words: 'allergies blood type conditions' },
  { id: 'contacts', group: 'Go to', label: 'Emergency contacts', auth: true, run: 'go', href: '/emergency-contacts', words: 'family phone' },
  { id: 'history', group: 'Go to', label: 'Health history', auth: true, run: 'go', href: '/history', words: 'past records' },
  { id: 'watch', group: 'Go to', label: 'Connect Apple Watch', auth: true, run: 'go', href: '/connect-health', words: 'apple health sync' },
  { id: 'settings', group: 'Go to', label: 'Settings', auth: true, run: 'go', href: '/settings', words: 'account preferences' },
  { id: 'copy', group: 'Actions', label: 'Copy link to the emergency card', hint: 'Share it with family', run: 'copy-card', words: 'share' },
  { id: 'signin', group: 'Actions', label: 'Sign in', auth: false, run: 'go', href: '/login', words: 'log in account' },
  { id: 'signout', group: 'Actions', label: 'Sign out', auth: true, run: 'confirm-signout', words: 'log out' },
  { id: 'features', group: 'About', label: 'Features', run: 'go', href: '/features' },
  { id: 'engineering', group: 'About', label: 'Engineering', run: 'go', href: '/engineering', words: 'how it works technology' },
  { id: 'partners', group: 'About', label: 'Partners', run: 'go', href: '/partners' },
  { id: 'privacy', group: 'About', label: 'Privacy policy', run: 'go', href: '/privacy' },
  { id: 'terms', group: 'About', label: 'Terms', run: 'go', href: '/terms' },
]

/** Open the palette from any button: openCommandPalette() */
export function openCommandPalette() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('relay:cmdk'))
}

export default function CommandPalette() {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const [signedIn, setSignedIn] = useState(false)
  const [modal, setModal] = useState<null | 'call' | 'signout'>(null)
  const [toast, setToast] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const lastFocus = useRef<HTMLElement | null>(null)

  const close = useCallback(() => {
    setOpen(false)
    setQ('')
    setActive(0)
    lastFocus.current?.focus?.()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    const onOpen = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('relay:cmdk', onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('relay:cmdk', onOpen)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    lastFocus.current = document.activeElement as HTMLElement
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session))
    const t = setTimeout(() => inputRef.current?.focus(), 30)
    return () => clearTimeout(t)
  }, [open])

  // Close when the page changes.
  useEffect(() => {
    setOpen(false)
    setModal(null)
  }, [pathname])

  const results = useMemo(() => {
    const term = q.trim().toLowerCase().slice(0, 60)
    return ITEMS.filter((i) => (i.auth === undefined ? true : i.auth === signedIn)).filter((i) =>
      term ? `${i.label} ${i.hint || ''} ${i.words || ''}`.toLowerCase().includes(term) : true,
    )
  }, [q, signedIn])

  useEffect(() => setActive(0), [q])

  const run = (i: Item) => {
    if (i.run === 'go' && i.href) {
      close()
      router.push(i.href)
    } else if (i.run === 'confirm-call') {
      setOpen(false)
      setModal('call')
    } else if (i.run === 'confirm-signout') {
      setOpen(false)
      setModal('signout')
    } else if (i.run === 'copy-card') {
      navigator.clipboard?.writeText(`${window.location.origin}/card`).then(
        () => setToast('Link copied'),
        () => setToast('Could not copy'),
      )
      close()
      setTimeout(() => setToast(''), 2200)
    }
  }

  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(results.length - 1, a + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(0, a - 1))
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault()
      run(results[active])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      close()
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setModal(null)
    router.push('/')
  }

  let lastGroup = ''
  return (
    <>
      {open && (
        <div className="cmdk-overlay" onMouseDown={(e) => e.target === e.currentTarget && close()}>
          <div className="cmdk-panel glass glass-strong" role="dialog" aria-modal="true" aria-label="Search and commands" onKeyDown={onListKey}>
            <div style={{ display: 'flex', alignItems: 'center', boxShadow: 'inset 0 -1px 0 rgba(20,20,19,0.1)' }}>
              <input
                ref={inputRef}
                className="cmdk-input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search pages and actions"
                aria-label="Search pages and actions"
                maxLength={60}
                role="combobox"
                aria-expanded="true"
                aria-controls="cmdk-list"
                aria-activedescendant={results[active] ? `cmdk-${results[active].id}` : undefined}
              />
              <span className="kbd" style={{ marginRight: '16px' }}>
                Esc
              </span>
            </div>
            <div className="cmdk-list" id="cmdk-list" role="listbox">
              {results.length === 0 && (
                <p style={{ padding: '18px 14px', fontSize: '15px', color: '#3F3D36' }}>
                  Nothing matches. Try &ldquo;SOS&rdquo;, &ldquo;meds&rdquo; or &ldquo;card&rdquo;.
                </p>
              )}
              {results.map((i, idx) => {
                const head = i.group !== lastGroup
                lastGroup = i.group
                return (
                  <div key={i.id}>
                    {head && (
                      <p className="group-label" style={{ margin: '12px 10px 4px' }}>
                        {i.group}
                      </p>
                    )}
                    <button
                      id={`cmdk-${i.id}`}
                      role="option"
                      aria-selected={idx === active}
                      data-active={idx === active}
                      className="row cmdk-item"
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => run(i)}
                      style={{ padding: '11px 12px' }}
                    >
                      <span style={{ flex: 1 }}>
                        <span className="row-title" style={{ color: i.id === 'sos' || i.id === 'call' ? '#A33417' : undefined }}>
                          {i.label}
                        </span>
                        {i.hint ? <span className="row-sub" style={{ display: 'block' }}>{i.hint}</span> : null}
                      </span>
                      {idx === active ? <span className="kbd">Enter</span> : null}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className="cmdk-overlay" style={{ alignItems: 'center', paddingTop: '16px' }} onMouseDown={(e) => e.target === e.currentTarget && setModal(null)}>
          <div
            className="cmdk-panel glass glass-strong"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cmdk-modal-title"
            style={{ maxWidth: '400px', padding: '26px 24px 22px' }}
            onKeyDown={(e) => e.key === 'Escape' && setModal(null)}
          >
            <h2 id="cmdk-modal-title" className="ds-title" style={{ fontSize: '24px' }}>
              {modal === 'call' ? 'Call 911 now?' : 'Sign out?'}
            </h2>
            <p style={{ fontSize: '15.5px', lineHeight: 1.5, margin: '10px 0 22px', color: '#3F3D36' }}>
              {modal === 'call'
                ? 'This opens your phone dialer with 911 ready. Use it for a real emergency.'
                : 'Your emergency card stays on this phone. You can sign back in any time.'}
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              {modal === 'call' ? (
                <a href="tel:911" className="ds-btn ds-btn-sos sh-slant" style={{ flex: 1 }} autoFocus onClick={() => setModal(null)}>
                  Call 911
                </a>
              ) : (
                <button className="ds-btn ds-btn-ink sh-slant" style={{ flex: 1 }} autoFocus onClick={signOut}>
                  Sign out
                </button>
              )}
              <button className="ds-btn ds-btn-line sh-pill" style={{ flex: 1 }} onClick={() => setModal(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div role="status" className="glass-dark" style={{ position: 'fixed', left: '50%', bottom: '96px', transform: 'translateX(-50%)', zIndex: 410, padding: '10px 18px', fontSize: '14px', fontWeight: 600, borderRadius: '999px' }}>
          {toast}
        </div>
      )}
    </>
  )
}

/** A search button that opens the palette. */
export function SearchButton({ dark = false }: { dark?: boolean }) {
  return (
    <button
      onClick={openCommandPalette}
      aria-label="Search. Shortcut Command K"
      className={dark ? 'glass-dark' : 'glass'}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', height: '42px', padding: '0 8px 0 14px', whiteSpace: 'nowrap', borderRadius: '999px', font: 'inherit', fontSize: '14.5px', fontWeight: 600, cursor: 'pointer', color: dark ? '#fff' : '#141413' }}
    >
      Search
      <span className="kbd" style={dark ? { background: 'rgba(255,255,255,0.16)', color: '#fff' } : undefined}>
        ⌘K
      </span>
    </button>
  )
}
