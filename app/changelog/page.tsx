'use client'
// Public changelog.
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

// The page green, and why it is this one.
const INK = '#141413',
  INK2 = '#5C5A52',
  INK3 = '#5C5A52'
const BORDER = '#7EB382',
  CREAM = '#4B8150'
const GREEN_DEEP = '#42623C',
  ORANGE = '#D97757',
  CRIT = '#A33417'
const mono = 'var(--font-mono, monospace)'

type Kind = 'shipped' | 'fixed' | 'honest'

interface Entry {
  date: string
  kind: Kind
  title: string
  body: string
}

const KIND: Record<Kind, { label: string; color: string }> = {
  shipped: { label: 'SHIPPED', color: GREEN_DEEP },
  fixed: { label: 'FIXED', color: '#A33417' },
  honest: { label: 'CORRECTION', color: CRIT },
}

// Newest first. Keep this honest — the CORRECTION entries are the point.
const ENTRIES: Entry[] = [
  {
    date: '2026-10-21',
    kind: 'honest',
    title: 'The dispatch screen was claiming a cath lab for every hospital',
    body: 'Testing the new far-from-help screen from a rural spot in Burlington County, the app routed a chest-pain patient to a children\'s rehabilitation hospital and printed "Cardiac catheterization lab" under it. The label had been coming from the type of emergency, not from the hospital, so every hospital got it. Capability is now taken from the New Jersey Department of Health cardiac registry (which hospitals performed primary PCI, emergency angioplasty, in January to September 2025), matched to the map by location and name so a separate building on the same campus does not inherit the claim. Facilities without an emergency department are filtered out. Anywhere the data does not cover, the screen says the cath lab is not confirmed instead of guessing, and nothing is claimed for stroke or trauma until there is a verified source for those too.',
  },
  {
    date: '2026-10-21',
    kind: 'shipped',
    title: 'Your phone is the sensor',
    body: 'A new vitals check measures pulse with the phone camera and flash (the same light-absorption principle a pulse oximeter uses) and breathing rate with the motion sensor while the phone rests on the chest, or by tapping once per breath. Every reading carries a signal-quality score, and a noisy recording is refused rather than reported. Readings from Apple Health can be imported from the Health export file, which is read on the phone and never uploaded. All seven NEWS2 measurements are then laid out point by point for a clinician to read; in line with docs/INTENDED_USE.md, the page does not interpret the score for the patient, and the call-911 instruction is unconditional. No smartwatch, no account, nothing to buy. The camera pipeline was tested end to end in a real browser against a synthetic fingertip video with a known 72 bpm pulse, and recovered 72.',
  },
  {
    date: '2026-10-21',
    kind: 'shipped',
    title: 'A neural network joins the triage model, and Spanish joins the languages',
    body: 'A small neural network (1,024 hashed inputs, 32 hidden units) now votes alongside the logistic regression. It also reads character trigrams, so misspellings still land: on held-out text with typos injected, accuracy went from 64% to 79%. Its raw confidence was badly overconfident, so it is temperature-scaled before averaging. Spanish was added for East Windsor and Hightstown, with an accent-folding step so a panicked phone typist who drops the accents is still understood, and the emergency screen itself now switches to Spanish. Corpus 576 examples, 5-fold cross-validation 91.3% (linear model alone 89.6%).',
  },
  {
    date: '2026-10-21',
    kind: 'honest',
    title: 'Benchmark re-run against the cloud model we actually call',
    body: 'The published head-to-head compared us with llama-3.1-8b-instant, which Groq shut down on 16 August 2026. It is re-run against its replacement, openai/gpt-oss-20b, on 49 unseen phrasings in four languages. The cloud model is still more accurate alone (89.8% against 85.7%), and still slower (467 ms median against 0.2 ms). The phone settles 76% of cases with no errors and hands off the rest, and the two together score 93.9%.',
  },
  {
    date: '2026-10-21',
    kind: 'shipped',
    title: 'Far from help',
    body: 'When the nearest hospital that can treat the emergency is 25 minutes or more away, the routing screen now says to call 911 before starting to drive, explains why (paramedics can start treatment and warn a cath lab before arrival), and shows the exact GPS coordinates in large type, because a rural road often has no street address to give a dispatcher.',
  },
  {
    date: '2026-08-13',
    kind: 'shipped',
    title: 'Patients no longer see a risk score. Clinicians still do.',
    body: 'FDA replaced its Clinical Decision Support guidance in January 2026. Two lines in it matter here: software that gives recommendations to patients or caregivers rather than health professionals meets the definition of a device, and software intended for critical, time-sensitive decisions is not considered to allow independent review of its basis. So the dashboard no longer shows a deterioration level, a NEWS2 number, or advice. It shows you your own readings that sit outside your usual range, says your care team can see them, and says plainly that only a clinician can assess them. The score is still computed and still reaches the care team, where the audience is a clinician. The triage classifier now suggests a category and you confirm it, rather than deciding on its own inference. Which is also just safer, because the category picks which hospital capability is matched. Full reasoning, including the two places a regulator could reasonably disagree with us, is published in docs/INTENDED_USE.md.',
  },
  {
    date: '2026-08-13',
    kind: 'shipped',
    title: 'A FHIR export that validates',
    body: 'Hospitals running certified EHRs are required to expose FHIR APIs, so that is the interface worth building against. Relay can now produce a FHIR R4 Bundle of a person\u2019s own record with real LOINC codes. It exports and deliberately does not import: receiving records from a hospital would make Relay a HIPAA business associate and trigger a great deal more than we can currently honour. Worth recording how the first version failed. It used an invented identifier scheme, the tests passed, the types were fine, the build was green, and the HL7 reference validator returned seventeen errors because none of the internal references resolved. It now returns zero.',
  },
  {
    date: '2026-08-12',
    kind: 'shipped',
    title: 'An emergency card that needs no account',
    body: "Every entrance to Relay Arc asked for an account and a full medical profile before returning anything, and the real payoff only arrives during an emergency. So anyone willing to spend two minutes got nothing for it. /card inverts that: fill in the fields and you immediately get a lock-screen image and a printable wallet card. Phones show their lock wallpaper without being unlocked, so a responder can read blood type and allergies off a locked phone with no app and no signal. Nothing is uploaded. There is no account and no server call, the data stays in your browser, and the images are drawn on your device. There is deliberately no shareable link with the data encoded in it, because a URL carrying someone's medical history can be forwarded, logged, or sit in a history forever.",
  },
  {
    date: '2026-08-12',
    kind: 'fixed',
    title: 'A patient chart showed a raw timestamp where a date belongs',
    body: 'The nurse patient view rendered the surgery date straight from the database column, so opening a patient displayed 2025-10-16T04:13:59.678Z. Found while capturing the dashboard for a video. A clinician who sees a raw timestamp in a chart field reasonably concludes the rest of the chart is untrustworthy, so this was a correctness problem and not a cosmetic one. Also swept seven more cool blue-grey hex values the recolour missed, and preflight now catches them arithmetically rather than by blocklist. Any mid-tone hex whose blue channel leads red by more than twelve. It found twenty-one further instances, so it reports as advisory rather than blocking: a gate that demands an unrelated twenty-one-file recolour before any commit can land is a gate that gets switched off.',
  },
  {
    date: '2026-07-31',
    kind: 'shipped',
    title: 'NEWS2 is complete. All seven parameters',
    body: 'Added temperature, consciousness level (ACVPU) and supplemental-oxygen status. Until now the risk score used four of the seven parameters and said so on every alert. A complete observation set now drops that caveat automatically. The score also flags when the subject is under 16, because NEWS2 is designed for adults and paediatric practice uses PEWS instead. Which matters for any school deployment.',
  },
  {
    date: '2026-07-31',
    kind: 'shipped',
    title: 'Public demo views. No login needed',
    body: "The hospital board, care-team dashboard, nurse dashboard, patient dashboard and vitals screens can all be viewed with ?demo=1 against synthetic data. Every one carries a permanent banner saying the data is not real. Previously these were behind a login, which meant nobody could be shown them without exposing a real patient's chart.",
  },
  {
    date: '2026-07-31',
    kind: 'fixed',
    title: 'The nurse dashboard was still blue',
    body: 'The app-wide recolour replaced hex colour values but never touched Tailwind class names, so two nurse pages kept a blue avatar and red-400 text in a green and orange app. Found while capturing screenshots. Fixed, and preflight now rejects any named Tailwind palette colour so it cannot happen again.',
  },
  {
    date: '2026-07-30',
    kind: 'honest',
    title: 'An API key was exposed in the client bundle',
    body: "Three pages built an AI client in the browser using an environment variable prefixed NEXT_PUBLIC_, which Next.js inlines into the JavaScript sent to every visitor. The key was extractable from the deployed site. All three now call one authenticated server route that owns the prompts and refetches data under the caller's own credentials, so a session holder cannot use it as a general-purpose AI endpoint or read another person's chart. The key has been rotated. Recording this publicly because a security note nobody can find is not a disclosure.",
  },
  {
    date: '2026-07-30',
    kind: 'shipped',
    title: 'The risk score stopped being AI',
    body: 'Deterioration risk used to be a language model reading free-text check-ins at temperature 0.2. It is now a deterministic implementation of the NEWS2 vital-sign subscores. A medical flag has to give the same answer twice and has to show the measurement behind every point it scores. A language model in that position does neither. Forty boundary-value tests pin every threshold to the published table so a clinical constant cannot be quietly tuned.',
  },
  {
    date: '2026-07-30',
    kind: 'fixed',
    title: 'The dashboard had been requesting columns that do not exist',
    body: 'The vitals query asked for blood_pressure_systolic, blood_pressure_diastolic and weight_kg. None of those are columns on the table, so Postgres rejected the whole query and the insights feature had been receiving an empty vitals array on every single page load. Nobody noticed because the failure was silent.',
  },
  {
    date: '2026-07-30',
    kind: 'shipped',
    title: 'Hindi and Marathi, at zero accuracy cost',
    body: "Voice SOS recognised en-US only, so a Hindi speaker's emergency was transcribed as nonsense before any classifier saw it. Rather than train separate models, Hindi and Marathi terms, in both Devanagari and romanised form, are normalised onto the same English tokens the model already learned. Ninety-eight examples added, cross-validation accuracy unchanged at 0.891. The vocabulary was written from general knowledge and still needs native-speaker review. That caveat is in the corpus.",
  },
  {
    date: '2026-07-29',
    kind: 'honest',
    title: 'Published a benchmark where a competitor beats us',
    body: "Our on-device classifier scores 85.7% against llama-3.1-8b-instant's 96.4% on 28 unseen phrasings. That table is on the technology page with the competitor listed above us. The argument is not that we are more accurate. It is that every case ours got wrong, it declined to answer rather than guessing, so roughly 61% of emergencies resolve on-device with no errors and the rest escalate. An earlier version of this benchmark showed us winning 100% to 0%. That result was wrong, caused by a contaminated evaluation set and by counting the competitor's rate-limit errors as wrong answers. It was thrown out.",
  },
  {
    date: '2026-07-29',
    kind: 'shipped',
    title: 'Our own triage model, running on the phone',
    body: '495 hand-written utterances, multinomial logistic regression over word and word-pair features with negation handling, compiled into a single 94 KB TypeScript file with the weights inlined. Classifies an emergency in 0.07 ms with no network, because emergencies happen in basements and on rural roads. An earlier attempt to grow the corpus made accuracy worse. 86.7% down to 78.5%. Because distinctive clinical terms appeared only once and landed in the test split.',
  },
  {
    date: '2026-07-29',
    kind: 'fixed',
    title: 'Navigation under-reported distance after a GPS jump',
    body: 'Snap-to-route only searched a window around the last known position, so after a large GPS jump it latched onto the wrong part of the line and reported 4.9 km travelled instead of 9.7. Found by our own test, not by a user. It now falls back to a full scan when the windowed match is poor.',
  },
  {
    date: '2026-07-28',
    kind: 'shipped',
    title: 'Dispatch ranks by drive time and capability, not distance',
    body: 'One routing-matrix call prices every nearby hospital on the real road network, then ranking applies traffic, the facility capability the emergency actually needs. A catheterisation lab for cardiac, stroke unit for stroke. And whether the hospital reports it is accepting patients. The nearest hospital is frequently the wrong hospital.',
  },
]

export default function Changelog() {
  const router = useRouter()
  return (
    <div style={{ background: '#B3DDAC', minHeight: '100dvh' }}>
      <header style={{ borderBottom: `1px solid ${BORDER}`, padding: '16px 24px' }}>
        <div
          style={{
            maxWidth: '820px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <button
            onClick={() => router.push('/')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'none',
              border: 'none',
              color: INK2,
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              padding: '5px 0',
            }}
          >
            <ArrowLeft size={15} /> Relay Arc
          </button>
          <button
            onClick={() => router.push('/engineering')}
            style={{
              background: 'none',
              border: 'none',
              color: INK2,
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              padding: '5px 0',
            }}
          >
            Technology
          </button>
        </div>
      </header>

      <section style={{ padding: '72px 24px 90px' }}>
        <div style={{ maxWidth: '820px', margin: '0 auto' }}>
          <div style={{ borderTop: `3px solid ${INK}`, paddingTop: '14px', marginBottom: '26px' }}>
            <span
              style={{
                color: INK,
                fontFamily: mono,
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '1.8px',
                textTransform: 'uppercase',
              }}
            >
              Changelog
            </span>
          </div>

          <h1
            style={{
              color: INK,
              fontSize: 'clamp(38px, 6.4vw, 68px)',
              fontWeight: 800,
              letterSpacing: '-0.045em',
              lineHeight: 1.0,
              marginBottom: '26px',
            }}
          >
            What changed, including
            <br />
            what went wrong<span style={{ color: CRIT }}>.</span>
          </h1>
          <p
            style={{
              color: INK2,
              fontSize: '16.5px',
              lineHeight: 1.7,
              marginBottom: '54px',
              maxWidth: '640px',
            }}
          >
            Corrections are marked and kept. A changelog containing only features is a marketing
            page, and this is a medical tool. If you are deciding whether to trust it, the failures
            are the part worth reading.
          </p>

          {ENTRIES.map((e, i) => {
            const k = KIND[e.kind]
            return (
              <div key={i} style={{ borderTop: `1px solid ${BORDER}`, padding: '26px 0' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '14px',
                    flexWrap: 'wrap',
                    marginBottom: '10px',
                  }}
                >
                  <span
                    style={{
                      color: INK3,
                      fontFamily: mono,
                      fontSize: '12px',
                      letterSpacing: '0.8px',
                    }}
                  >
                    {e.date}
                  </span>
                  <span
                    style={{
                      background: k.color,
                      color: '#FFFFFF',
                      fontFamily: mono,
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '1.2px',
                      padding: '3px 8px',
                    }}
                  >
                    {k.label}
                  </span>
                </div>
                <h2
                  style={{
                    color: INK,
                    fontSize: '25px',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.25,
                    marginBottom: '10px',
                  }}
                >
                  {e.title}
                </h2>
                <p style={{ color: INK2, fontSize: '15.5px', lineHeight: 1.72, maxWidth: '680px' }}>
                  {e.body}
                </p>
              </div>
            )
          })}

          <div style={{ borderTop: `3px solid ${INK}`, paddingTop: '18px', marginTop: '20px' }}>
            <p
              style={{
                color: INK3,
                fontFamily: mono,
                fontSize: '11px',
                letterSpacing: '1.2px',
                textTransform: 'uppercase',
              }}
            >
              Source is public · github.com/Aarya470/relay-arc
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
