'use client'
import { MotionConfig } from 'framer-motion'

/**
 * Honours the operating system's "reduce motion" setting across the whole app.
 *
 * WHY THIS MATTERS MORE HERE THAN ON A NORMAL SITE
 * Every page in this app fades and slides its content in on mount. Framer
 * Motion does not check prefers-reduced-motion on its own, so until now that
 * happened to everybody, including people who had explicitly asked their phone
 * to stop moving things.
 *
 * The people this app is for are the ones most likely to have asked. Vestibular
 * symptoms, visual motion sensitivity and dizziness are common in POTS and in
 * the rest of the dysautonomia group, and animated movement is a known trigger.
 * An app whose whole purpose is helping somebody through a dizzy spell should
 * not be sliding its own interface around while they try to read it. WCAG 2.3.3
 * asks for this, and here it is closer to a clinical detail than a preference.
 *
 * reducedMotion="user" keeps the animations for everyone else and turns them
 * off for anyone whose system asks, without a single call site changing.
 *
 * It also fixed a testing problem, which is worth recording because it wasted
 * real time. Entrance animations are driven by requestAnimationFrame, and rAF
 * does not run in a browser tab that is not being painted. Three times this
 * session a screenshot came back with the page frozen part way through its fade
 * at opacity 0.249, which looks exactly like a broken stylesheet. With this in
 * place the headless browser sets reduced motion, content renders settled, and
 * a screenshot means what it looks like it means.
 */
export default function Motion({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
