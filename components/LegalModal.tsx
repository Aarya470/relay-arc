'use client'
import { useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from '@/lib/legal'

const STORAGE_KEY = 'relay_arc_legal_v1'

/**
 * Where the consent gate is allowed to appear.
 *
 * WHY THIS IS AN ALLOWLIST AND NOT A BLOCKLIST
 * This component is mounted in the root layout, so it used to interrupt every
 * visitor on every page — somebody reading /features or watching the demo got a
 * two-step legal wall before seeing anything. That is bad for a project whose
 * whole problem is that nobody has looked at it yet, and it is also the wrong
 * moment: a person reading a marketing page has not given us anything.
 *
 * Consent matters at the point where someone creates an account and starts
 * entering medical information, so the gate now appears only on the routes where
 * that actually happens. An allowlist rather than a blocklist because the failure
 * modes are asymmetric: forgetting to add a new public page would wrongly show the
 * wall again, while forgetting to add a new signup route would silently skip
 * consent. The first is annoying; the second is a problem. So new routes default
 * to "no gate" and account-creation routes have to be named explicitly.
 *
 * /card is deliberately absent: it takes no account and uploads nothing, so there
 * is nothing to consent to.
 */
const GATED_ROUTES = ['/login', '/onboarding']

const needsGate = (pathname: string | null) =>
  !!pathname && GATED_ROUTES.some(r => pathname === r || pathname.startsWith(`${r}/`))

export default function LegalModal() {
  // step 1 = privacy policy, step 2 = terms of service, done = hidden
  const [step, setStep] = useState<1 | 2 | 'done'>('done')
  const [canAccept, setCanAccept] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  // usePathname is safe here. Note it is NOT useSearchParams, which would force a
  // bailout to client rendering and re-break the server-rendered HTML that search
  // engines read — see the comment in app/page.tsx.
  const pathname = usePathname()

  useEffect(() => {
    if (!needsGate(pathname)) { setStep('done'); return }
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setStep(1)
    } catch { setStep(1) }
  }, [pathname])

  // Reset "read" flag and scroll to top whenever the step changes
  useEffect(() => {
    setCanAccept(false)
    setTimeout(() => { scrollRef.current?.scrollTo({ top: 0 }) }, 50)
  }, [step])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 40) setCanAccept(true)
  }

  const handleAccept = () => {
    if (step === 1) {
      setStep(2)
    } else {
      try { localStorage.setItem(STORAGE_KEY, new Date().toISOString()) } catch {}
      setStep('done')
    }
  }

  if (step === 'done') return null

  const isPrivacy = step === 1
  const content = isPrivacy ? PRIVACY_POLICY : TERMS_OF_SERVICE
  const title = isPrivacy ? 'Privacy Policy' : 'Terms of Service'
  const subtitle = isPrivacy
    ? 'Step 1 of 2. Read our Privacy Policy then tap Accept.'
    : 'Step 2 of 2. Read our Terms of Service then tap Accept.'
  const buttonLabel = isPrivacy ? 'I accept the Privacy Policy' : 'I accept the Terms of Service and want to continue'

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(10,16,12,0.82)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}
      >
        <motion.div
          key={step}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          style={{
            width: '100%', maxWidth: '430px',
            background: '#FAFAF8',
            borderRadius: '0px',
            display: 'flex', flexDirection: 'column',
            maxHeight: '92dvh',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{ padding: '20px 20px 12px', flexShrink: 0 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(26,40,32,0.1)', margin: '0 auto 18px' }} />

            {/* Step indicator */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
              {[1, 2].map(n => (
                <div key={n} style={{
                  flex: 1, height: '3px', borderRadius: '99px',
                  background: n <= step ? '#5C8B74' : 'rgba(26,40,32,0.1)',
                  transition: 'background 0.3s ease',
                }} />
              ))}
            </div>

            <h2 style={{ color: '#1A2820', fontWeight: 900, fontSize: '20px', letterSpacing: '-0.5px', marginBottom: '4px' }}>{title}</h2>
            <p style={{ color: 'rgba(26,40,32,0.45)', fontSize: '13px' }}>{subtitle}</p>
          </div>

          {/* Scrollable content */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            style={{ flex: 1, overflowY: 'auto', padding: '0 20px', scrollbarWidth: 'none' }}
          >
            <pre style={{
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              color: 'rgba(26,40,32,0.7)', fontSize: '11px', lineHeight: 1.7,
              fontFamily: 'inherit', margin: 0, paddingBottom: '24px',
            }}>
              {content}
            </pre>
          </div>

          {/* Footer */}
          <div style={{ padding: '12px 20px 40px', flexShrink: 0, borderTop: '1px solid rgba(26,40,32,0.07)', background: '#FAFAF8' }}>
            {!canAccept && (
              <p style={{ color: 'rgba(26,40,32,0.38)', fontSize: '11px', textAlign: 'center', marginBottom: '10px' }}>
                Scroll to the bottom to continue
              </p>
            )}
            <motion.button
              whileTap={canAccept ? { scale: 0.97, y: 1 } : {}}
              onClick={canAccept ? handleAccept : undefined}
              style={{
                width: '100%',
                background: canAccept ? '#D97757' : 'rgba(20,20,19,0.08)',
                color: canAccept ? '#141413' : 'rgba(20,20,19,0.30)',
                fontWeight: 800, fontSize: '15px',
                padding: '16px', borderRadius: '0px', border: 'none',
                cursor: canAccept ? 'pointer' : 'default',
                boxShadow: 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {canAccept ? buttonLabel : `Read the ${title} to continue`}
            </motion.button>
            <p style={{ color: 'rgba(26,40,32,0.28)', fontSize: '10px', textAlign: 'center', marginTop: '10px', lineHeight: 1.5 }}>
              {isPrivacy
                ? 'You will also need to accept the Terms of Service on the next screen.'
                : 'By tapping above you confirm you are 18+ and agree to all terms.'}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
