'use client'
// Intended-use labelling for clinician-facing surfaces.
//
// WHY THIS COMPONENT EXISTS
// FDA's Non-Device CDS Criterion 4 asks that the software or its labelling state
// the intended use, the intended HCP user and the intended patient population, and
// give the clinician a route to the basis of the recommendation so they are not
// relying primarily on it. Having that only in docs/INTENDED_USE.md does not
// satisfy it — the clinician has to be able to see it where they are making the
// decision.
//
// So this is deliberately unglamorous and deliberately always visible. It should
// not be collapsed behind a tooltip, and it should not be removed to tidy up a
// screenshot.
//
// It appears ONLY on clinician surfaces. The patient-facing screens must not carry
// it, because putting "intended for use by a healthcare professional" in front of a
// patient would be incoherent — the correct fix there was to stop showing patients a
// risk classification at all. See docs/INTENDED_USE.md §6.
const INK2 = '#5C5A52', INK3 = '#716F67'
const BORDER = '#B5C68F', CREAM = '#CDDAAD'
const mono = 'var(--font-mono, monospace)'

export default function IntendedUse({ compact = false }: { compact?: boolean }) {
  return (
    <div style={{
      border: `1px solid ${BORDER}`, background: CREAM,
      padding: compact ? '9px 11px' : '12px 14px', marginBottom: '12px',
    }}>
      <p style={{
        color: INK3, fontFamily: mono, fontSize: '9.5px', fontWeight: 700,
        letterSpacing: '1.3px', textTransform: 'uppercase', marginBottom: '5px',
      }}>
        Intended use
      </p>
      <p style={{ color: INK2, fontSize: '11.5px', lineHeight: 1.55, margin: 0 }}>
        For use by a healthcare professional, with patients aged 16 and over.
        Displays patient-reported observations and computes NEWS2 from them to
        support a decision about whether to review a patient sooner. It does not
        diagnose, does not determine whether an emergency is occurring, and is not
        intended to be relied on in place of clinical judgement. Every point scored
        is attributable to a named measurement so the basis can be reviewed
        independently.
      </p>
      <p style={{ color: INK3, fontSize: '11px', lineHeight: 1.55, marginTop: '6px', marginBottom: 0 }}>
        NEWS2 is not validated below 16 years; paediatric practice uses PEWS. Scores
        computed from an incomplete observation set can only under-estimate.{' '}
        <a href="/engineering" style={{ color: INK2, fontWeight: 600, textDecoration: 'none', borderBottom: `1px solid ${BORDER}` }}>
          How the score is computed
        </a>
      </p>
    </div>
  )
}
