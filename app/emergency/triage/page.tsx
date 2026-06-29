'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Phone } from 'lucide-react'

const spring = { type: 'spring', stiffness: 380, damping: 24 } as const

type Step = 1 | 2 | 3 | 'result'
type Outcome = 'call911' | 'high' | 'monitor'

function getPainColor(n: number): string {
  if (n <= 5) return '#5C8B74'
  if (n <= 8) return '#D97706'
  return '#DC2626'
}

function getPainBg(n: number): string {
  if (n <= 5) return 'rgba(92,139,116,0.12)'
  if (n <= 8) return 'rgba(217,119,6,0.12)'
  return 'rgba(220,38,38,0.12)'
}

function computeOutcome(pain: number, canMove: boolean, alone: boolean): Outcome {
  if (pain >= 9 || !canMove) return 'call911'
  if (pain >= 7 || (alone && pain >= 6)) return 'high'
  return 'monitor'
}

export default function TriagePage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [pain, setPain] = useState<number | null>(null)
  const [canMove, setCanMove] = useState<boolean | null>(null)
  const [alone, setAlone] = useState<boolean | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  const handlePainSelect = (n: number) => {
    setPain(n)
    setTimeout(() => setStep(2), 220)
  }

  const handleCanMove = (val: boolean) => {
    setCanMove(val)
    setTimeout(() => setStep(3), 220)
  }

  const handleAlone = (val: boolean) => {
    setAlone(val)
    const result = computeOutcome(pain!, canMove!, val)
    setOutcome(result)
    setTimeout(() => setStep('result'), 220)
  }

  const pageVariants = {
    initial: { opacity: 0, x: 40 },
    animate: { opacity: 1, x: 0, transition: spring },
    exit: { opacity: 0, x: -40, transition: { duration: 0.18 } },
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#F2EFE9', display: 'flex', flexDirection: 'column' }}>

      {/* Alert bar */}
      <div style={{
        background: 'linear-gradient(90deg, #C42020, #E8322A)',
        padding: '13px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 16px rgba(196,32,32,0.35)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <motion.div
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'white' }}
          />
          <span style={{ color: 'white', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700 }}>
            Severity Assessment
          </span>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px' }}>
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Header with back button and progress dots */}
      <div style={{ padding: '16px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          transition={spring}
          onClick={() => router.back()}
          style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FFFFFF', border: '1px solid rgba(26,40,32,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(26,40,32,0.07)' }}
        >
          <ArrowLeft size={15} color="rgba(26,40,32,0.5)" />
        </motion.button>

        {/* Progress dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {([1, 2, 3] as const).map(s => {
            const isActive = step === s || (step === 'result' && s === 3)
            const isDone = typeof step === 'number' && step > s
            return (
              <div key={s} style={{
                width: isActive ? '20px' : '7px',
                height: '7px',
                borderRadius: '4px',
                background: isActive || isDone ? '#5C8B74' : 'rgba(26,40,32,0.15)',
                transition: 'all 0.3s ease',
              }} />
            )
          })}
        </div>

        <div style={{ width: '36px' }} />
      </div>

      {/* Step content */}
      <div style={{ flex: 1, padding: '24px 20px 32px', display: 'flex', flexDirection: 'column' }}>
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" variants={pageVariants} initial="initial" animate="animate" exit="exit" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <h1 style={{ color: '#1A2820', fontSize: '26px', fontWeight: 900, letterSpacing: '-1px', marginBottom: '6px', lineHeight: 1.1 }}>
                How severe?
              </h1>
              <p style={{ color: 'rgba(26,40,32,0.42)', fontSize: '13px', marginBottom: '32px' }}>
                Rate your pain or discomfort right now
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: 'rgba(26,40,32,0.4)', fontSize: '11px' }}>Mild</span>
                <span style={{ color: 'rgba(26,40,32,0.4)', fontSize: '11px' }}>Worst ever</span>
              </div>

              {/* Pain scale */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '8px' }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <motion.button
                    key={n}
                    whileTap={{ scale: 0.88 }}
                    transition={spring}
                    onClick={() => handlePainSelect(n)}
                    style={{
                      height: '56px',
                      borderRadius: '14px',
                      background: pain === n ? getPainBg(n) : '#FFFFFF',
                      border: `1.5px solid ${pain === n ? getPainColor(n) : 'rgba(26,40,32,0.08)'}`,
                      color: getPainColor(n),
                      fontSize: '20px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: pain === n ? `0 4px 14px ${getPainBg(n)}` : '0 1px 4px rgba(26,40,32,0.06)',
                      transition: 'border-color 0.15s ease, background 0.15s ease',
                    }}
                  >
                    {n}
                  </motion.button>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#5C8B74' }} />
                  <span style={{ color: 'rgba(26,40,32,0.4)', fontSize: '10px' }}>1-5 mild</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#D97706' }} />
                  <span style={{ color: 'rgba(26,40,32,0.4)', fontSize: '10px' }}>6-8 moderate</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#DC2626' }} />
                  <span style={{ color: 'rgba(26,40,32,0.4)', fontSize: '10px' }}>9-10 severe</span>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" variants={pageVariants} initial="initial" animate="animate" exit="exit" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <h1 style={{ color: '#1A2820', fontSize: '26px', fontWeight: 900, letterSpacing: '-1px', marginBottom: '6px', lineHeight: 1.1 }}>
                Are you conscious and able to move?
              </h1>
              <p style={{ color: 'rgba(26,40,32,0.42)', fontSize: '13px', marginBottom: '32px' }}>
                Can you get up and move around safely?
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  transition={spring}
                  onClick={() => handleCanMove(true)}
                  style={{
                    padding: '22px 20px',
                    borderRadius: '16px',
                    background: '#FFFFFF',
                    border: '1.5px solid rgba(92,139,116,0.3)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    boxShadow: '0 2px 10px rgba(26,40,32,0.06)',
                  }}
                >
                  <p style={{ color: '#1A2820', fontSize: '17px', fontWeight: 800, marginBottom: '4px' }}>Yes, I can move</p>
                  <p style={{ color: 'rgba(26,40,32,0.42)', fontSize: '13px' }}>I am conscious and can get around</p>
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  transition={spring}
                  onClick={() => handleCanMove(false)}
                  style={{
                    padding: '22px 20px',
                    borderRadius: '16px',
                    background: '#FFFFFF',
                    border: '1.5px solid rgba(220,38,38,0.25)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    boxShadow: '0 2px 10px rgba(26,40,32,0.06)',
                  }}
                >
                  <p style={{ color: '#DC2626', fontSize: '17px', fontWeight: 800, marginBottom: '4px' }}>No, I need help</p>
                  <p style={{ color: 'rgba(26,40,32,0.42)', fontSize: '13px' }}>I cannot move or am very disoriented</p>
                </motion.button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" variants={pageVariants} initial="initial" animate="animate" exit="exit" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <h1 style={{ color: '#1A2820', fontSize: '26px', fontWeight: 900, letterSpacing: '-1px', marginBottom: '6px', lineHeight: 1.1 }}>
                Are you alone?
              </h1>
              <p style={{ color: 'rgba(26,40,32,0.42)', fontSize: '13px', marginBottom: '32px' }}>
                Is there someone nearby who can help you?
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  transition={spring}
                  onClick={() => handleAlone(false)}
                  style={{
                    padding: '22px 20px',
                    borderRadius: '16px',
                    background: '#FFFFFF',
                    border: '1.5px solid rgba(92,139,116,0.3)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    boxShadow: '0 2px 10px rgba(26,40,32,0.06)',
                  }}
                >
                  <p style={{ color: '#1A2820', fontSize: '17px', fontWeight: 800, marginBottom: '4px' }}>Someone is with me</p>
                  <p style={{ color: 'rgba(26,40,32,0.42)', fontSize: '13px' }}>A friend, family member, or bystander is here</p>
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  transition={spring}
                  onClick={() => handleAlone(true)}
                  style={{
                    padding: '22px 20px',
                    borderRadius: '16px',
                    background: '#FFFFFF',
                    border: '1.5px solid rgba(220,38,38,0.25)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    boxShadow: '0 2px 10px rgba(26,40,32,0.06)',
                  }}
                >
                  <p style={{ color: '#DC2626', fontSize: '17px', fontWeight: 800, marginBottom: '4px' }}>{"I'm alone"}</p>
                  <p style={{ color: 'rgba(26,40,32,0.42)', fontSize: '13px' }}>There is no one nearby to help me right now</p>
                </motion.button>
              </div>
            </motion.div>
          )}

          {step === 'result' && outcome === 'call911' && (
            <motion.div key="result-911" variants={pageVariants} initial="initial" animate="animate" exit="exit" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{
                background: 'linear-gradient(145deg, #FEF2F2 0%, #FFFFFF 100%)',
                border: '1.5px solid rgba(220,38,38,0.25)',
                borderRadius: '20px',
                padding: '24px',
                marginBottom: '16px',
                boxShadow: '0 6px 24px rgba(220,38,38,0.12)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <motion.div
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 0.9, repeat: Infinity }}
                    style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#DC2626', flexShrink: 0 }}
                  />
                  <span style={{ color: '#DC2626', fontSize: '12px', fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                    Critical — Act Now
                  </span>
                </div>
                <h2 style={{ color: '#1A2820', fontSize: '22px', fontWeight: 900, letterSpacing: '-0.5px', marginBottom: '8px', lineHeight: 1.2 }}>
                  Call 911 immediately.
                </h2>
                <p style={{ color: 'rgba(26,40,32,0.55)', fontSize: '14px', lineHeight: 1.6 }}>
                  Do not try to drive yourself. Your symptoms require emergency medical services right away.
                </p>
              </div>

              <motion.a
                href="tel:911"
                whileTap={{ scale: 0.97 }}
                transition={spring}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  background: '#DC2626', color: 'white',
                  padding: '18px', borderRadius: '18px',
                  fontWeight: 900, fontSize: '18px', letterSpacing: '-0.3px',
                  textDecoration: 'none', marginBottom: '12px',
                  boxShadow: '0 6px 24px rgba(220,38,38,0.38)',
                }}
              >
                <Phone size={22} />
                Call 911 Now
              </motion.a>

              <motion.button
                whileTap={{ scale: 0.97 }}
                transition={spring}
                onClick={() => router.push('/emergency')}
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  background: '#FFFFFF',
                  border: '1px solid rgba(26,40,32,0.1)',
                  color: 'rgba(26,40,32,0.6)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(26,40,32,0.06)',
                }}
              >
                Navigate to hospital anyway
              </motion.button>
            </motion.div>
          )}

          {step === 'result' && outcome === 'high' && (
            <motion.div key="result-high" variants={pageVariants} initial="initial" animate="animate" exit="exit" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{
                background: 'linear-gradient(145deg, #FFFBEB 0%, #FFFFFF 100%)',
                border: '1.5px solid rgba(217,119,6,0.25)',
                borderRadius: '20px',
                padding: '24px',
                marginBottom: '16px',
                boxShadow: '0 6px 24px rgba(217,119,6,0.10)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <motion.div
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#D97706', flexShrink: 0 }}
                  />
                  <span style={{ color: '#D97706', fontSize: '12px', fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                    High Urgency
                  </span>
                </div>
                <h2 style={{ color: '#1A2820', fontSize: '22px', fontWeight: 900, letterSpacing: '-0.5px', marginBottom: '8px', lineHeight: 1.2 }}>
                  Get to the hospital now.
                </h2>
                <p style={{ color: 'rgba(26,40,32,0.55)', fontSize: '14px', lineHeight: 1.6 }}>
                  Have someone drive you or call an ambulance. Do not drive yourself if your symptoms worsen.
                </p>
              </div>

              <motion.a
                href="tel:911"
                whileTap={{ scale: 0.97 }}
                transition={spring}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  background: '#DC2626', color: 'white',
                  padding: '16px', borderRadius: '16px',
                  fontWeight: 800, fontSize: '16px', letterSpacing: '-0.3px',
                  textDecoration: 'none', marginBottom: '10px',
                  boxShadow: '0 4px 16px rgba(220,38,38,0.30)',
                }}
              >
                <Phone size={18} />
                Call 911
              </motion.a>

              <motion.button
                whileTap={{ scale: 0.97 }}
                transition={spring}
                onClick={() => router.push('/emergency')}
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  background: '#5C8B74',
                  border: 'none',
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(92,139,116,0.30)',
                }}
              >
                Navigate to nearest hospital
              </motion.button>
            </motion.div>
          )}

          {step === 'result' && outcome === 'monitor' && (
            <motion.div key="result-monitor" variants={pageVariants} initial="initial" animate="animate" exit="exit" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{
                background: 'linear-gradient(145deg, rgba(92,139,116,0.08) 0%, #FFFFFF 100%)',
                border: '1.5px solid rgba(92,139,116,0.2)',
                borderRadius: '20px',
                padding: '24px',
                marginBottom: '16px',
                boxShadow: '0 6px 24px rgba(92,139,116,0.10)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#5C8B74', flexShrink: 0 }} />
                  <span style={{ color: '#5C8B74', fontSize: '12px', fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                    Monitor at Home
                  </span>
                </div>
                <h2 style={{ color: '#1A2820', fontSize: '22px', fontWeight: 900, letterSpacing: '-0.5px', marginBottom: '8px', lineHeight: 1.2 }}>
                  You may be okay for now.
                </h2>
                <p style={{ color: 'rgba(26,40,32,0.55)', fontSize: '14px', lineHeight: 1.6 }}>
                  You may be able to monitor symptoms at home, but if things worsen, go to the hospital immediately.
                </p>
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                transition={spring}
                onClick={() => router.push('/emergency')}
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  background: '#5C8B74',
                  border: 'none',
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginBottom: '10px',
                  boxShadow: '0 4px 16px rgba(92,139,116,0.28)',
                }}
              >
                Go to hospital
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.97 }}
                transition={spring}
                onClick={() => router.push('/dashboard')}
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  background: '#FFFFFF',
                  border: '1px solid rgba(26,40,32,0.1)',
                  color: 'rgba(26,40,32,0.6)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(26,40,32,0.06)',
                }}
              >
                Back to dashboard
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
