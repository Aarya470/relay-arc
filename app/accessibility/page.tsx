import type { Metadata } from 'next'
import SiteHeader from '@/components/SiteHeader'
import SiteFooter from '@/components/SiteFooter'
import AccessPanel from '@/components/AccessPanel'

export const metadata: Metadata = {
  title: 'Accessibility: Relay Arc',
  description:
    'Make Relay Arc easier to use: bigger text, high contrast, less motion and underlined links. Saved on your phone only. How we build for screen readers, keyboards and dizziness.',
  alternates: { canonical: '/accessibility' },
}

export default function AccessibilityPage() {
  return (
    <div>
      <SiteHeader />
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '24px 20px 40px' }}>
        <h1 className="ak-title" style={{ fontSize: 'clamp(34px, 6vw, 56px)' }}>Make it easier to use</h1>
        <p className="ak-sub" style={{ fontSize: '17px', marginTop: '12px' }}>
          Change these and every page follows, including SOS. They are saved on this phone only.
        </p>
        <section className="glass" style={{ padding: '22px', marginTop: '22px' }} aria-label="Display settings">
          <AccessPanel />
        </section>
        <section className="glass" style={{ padding: '22px', marginTop: '16px' }}>
          <h2 className="ak-panel-title" style={{ marginBottom: '10px' }}>How we build for everyone</h2>
          <ul className="acc-list">
            <li>Every control works with a keyboard, and focus is always visible.</li>
            <li>Buttons are at least 44 pixels tall so they are easy to hit with a shaky hand.</li>
            <li>Motion turns off when your phone asks for less motion, or when you choose it here.</li>
            <li>Screen readers get real labels on buttons, and live updates are announced.</li>
            <li>Inputs use 16 pixel text so phones do not zoom in while you type.</li>
            <li>When you lose signal, a banner says so, and SOS, calling 911 and your card keep working.</li>
          </ul>
          <p className="ak-sub" style={{ marginTop: '14px' }}>
            Something hard to use? Email <a href="mailto:relay.arc.org@gmail.com">relay.arc.org@gmail.com</a> and we will fix it.
          </p>
        </section>
      </div>
      <SiteFooter />
    </div>
  )
}
