'use client'
// The deep dive. This is the one page on the site that is meant to be read.
//
// The homepage deliberately carries almost no text. Anyone who wants to know
// whether the technology is real comes here instead — and the argument is made
// with two demos that run the actual production code in the visitor's browser,
// not with adjectives.
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ArrowLeft } from 'lucide-react'

// The triage weights are 94 KB. Load them when someone reaches the demo, not on
// first paint.
const TriageDemo = dynamic(() => import('@/components/TriageDemo'), {
  ssr: false,
  loading: () => <DemoSkeleton label="loading the model…" />,
})
const RiskDemo = dynamic(() => import('@/components/RiskDemo'), {
  ssr: false,
  loading: () => <DemoSkeleton label="loading the scorer…" />,
})

const T1 = '#141413', T2 = '#5C5A52', T3 = '#716F67'
const BORDER = '#B5C68F', BG2 = '#CDDAAD'
const RED = '#A33417', ACCENT = '#51623B'
const ORANGE = '#D97757'   // fill only — dark ink on top
const mono = 'var(--font-mono, monospace)'
const WRAP = { maxWidth: '1120px', margin: '0 auto' } as const

function DemoSkeleton({ label }: { label: string }) {
  return (
    <div style={{
      border: `2px solid ${T1}`, background: BG2, height: '340px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ color: T3, fontFamily: mono, fontSize: '11px', letterSpacing: '1.4px', textTransform: 'uppercase' }}>
        {label}
      </span>
    </div>
  )
}

function SectionHead({ n, title, right }: { n: string; title: string; right?: string }) {
  return (
    <div style={{
      borderTop: `3px solid ${T1}`, paddingTop: '14px', marginBottom: '30px',
      display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap',
    }}>
      <span style={{ color: T1, fontFamily: mono, fontSize: '11px', fontWeight: 700, letterSpacing: '1.8px', textTransform: 'uppercase' }}>
        {n} / {title}
      </span>
      {right && (
        <span style={{ color: T3, fontFamily: mono, fontSize: '11px', letterSpacing: '1.4px', textTransform: 'uppercase' }}>
          {right}
        </span>
      )}
    </div>
  )
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      color: T1, fontSize: 'clamp(28px, 4.6vw, 50px)', fontWeight: 800,
      letterSpacing: '-0.04em', lineHeight: 1.02, marginBottom: '20px', maxWidth: '860px',
    }}>{children}</h2>
  )
}

function P({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <p style={{ color: T2, fontSize: '16px', lineHeight: 1.7, marginBottom: '18px', maxWidth: wide ? '780px' : '660px' }}>
      {children}
    </p>
  )
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div style={{ borderTop: `1px solid ${BORDER}`, padding: '16px 0', display: 'flex', gap: '18px' }}>
      <span style={{ color: T3, fontFamily: mono, fontSize: '11px', fontWeight: 700, minWidth: '26px', paddingTop: '3px' }}>{n}</span>
      <div>
        <p style={{ color: T1, fontSize: '15px', fontWeight: 700, marginBottom: '5px' }}>{title}</p>
        <p style={{ color: T2, fontSize: '14px', lineHeight: 1.65, maxWidth: '620px' }}>{body}</p>
      </div>
    </div>
  )
}

function Stat({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div style={{ borderTop: `2px solid ${T1}`, paddingTop: '10px' }}>
      <p style={{ color: T1, fontSize: 'clamp(24px, 3.4vw, 38px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>{v}</p>
      <p style={{ color: T2, fontFamily: mono, fontSize: '10px', fontWeight: 700, letterSpacing: '1.3px', textTransform: 'uppercase', marginTop: '7px' }}>{k}</p>
      {sub && <p style={{ color: T3, fontSize: '11.5px', lineHeight: 1.5, marginTop: '5px' }}>{sub}</p>}
    </div>
  )
}

export default function Engineering() {
  const router = useRouter()

  return (
    <div style={{ background: '#CDDAAD', minHeight: '100dvh' }}>

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <header style={{
        borderBottom: `1px solid ${BORDER}`, padding: '16px 24px',
        position: 'sticky', top: 0, background: 'rgba(255,255,255,0.94)',
        backdropFilter: 'blur(8px)', zIndex: 40,
      }}>
        <div style={{ ...WRAP, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => router.push('/')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: T2, fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
            <ArrowLeft size={15}/> Relay Arc
          </button>
          <button onClick={() => router.push('/login?signup=1')}
            style={{ background: ORANGE, color: T1, fontSize: '13.5px', fontWeight: 700, padding: '9px 18px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', borderRadius: 0 }}>
            Create your profile
          </button>
        </div>
      </header>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px 0' }}>
        <div style={WRAP}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '26px' }}>
            <span style={{ width: '7px', height: '7px', background: RED, display: 'inline-block' }}/>
            <span style={{ color: T2, fontFamily: mono, fontSize: '11.5px', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Under the hood — everything on this page runs live
            </span>
          </div>

          <h1 style={{
            color: T1, fontSize: 'clamp(40px, 7.6vw, 92px)', fontWeight: 800,
            lineHeight: 0.96, letterSpacing: '-0.045em', marginBottom: '32px', maxWidth: '960px',
          }}>
            We don&apos;t rent the<br/>parts that matter<span style={{ color: RED }}>.</span>
          </h1>

          <P wide>
            Most health apps are a nice interface wrapped around someone else&apos;s API. That is fine
            until the signal drops, the vendor rate-limits you, or a doctor asks why the software said
            what it said. In an emergency all three of those happen at once.
          </P>
          <P wide>
            So the four things Relay depends on in the worst moment — deciding what is wrong, deciding
            how urgent it is, deciding which hospital, and getting you there — are ours. They run on
            the device, they explain themselves, and they work with no network. Below are two of them,
            running in this browser tab right now. Type into them. Break them.
          </P>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '24px', margin: '52px 0 0' }}>
            <Stat k="triage decision" v="0.07 ms" sub="on-device, no network"/>
            <Stat k="risk score" v="0.015 ms" sub="deterministic, reproducible"/>
            <Stat k="model size" v="94 KB" sub="ships inside the app"/>
            <Stat k="API cost per call" v="₹0" sub="for both engines"/>
          </div>
        </div>
      </section>

      {/* ── 01 TRIAGE ────────────────────────────────────────────────────── */}
      <section style={{ padding: '92px 24px 0' }}>
        <div style={WRAP}>
          <SectionHead n="01" title="Triage engine" right="classification — ours"/>
          <H2>It has to decide what&apos;s wrong before it knows if there&apos;s signal.</H2>
          <P>
            Someone gasping into their phone cannot wait on a round trip, and a basement or a rural
            road may not offer one. So classification happens first, on the device, in a fraction of a
            millisecond — and the language model is consulted only when our own model admits it is
            unsure.
          </P>

          <div style={{ margin: '34px 0 46px' }}>
            <TriageDemo/>
          </div>

          <H2>How it was actually built</H2>
          <P>
            Multinomial logistic regression over binary word and word-pair features. Deliberately the
            most boring model that could work, because a linear model can be asked <em>why</em> — every
            decision decomposes into the exact terms that drove it, which is the list you saw above.
          </P>

          <div style={{ marginBottom: '40px' }}>
            <Step n="01" title="Write the corpus by hand"
              body="495 labelled utterances in the words people actually use under stress — 'chest is paining', 'he won't wake up', 'crashed after shopping' — not clinical vocabulary. This is the part with no shortcut."/>
            <Step n="02" title="Featurise with negation handling"
              body="Unigrams and bigrams, plus a negation window: 'no chest pain but I cannot breathe' must not read as chest pain. Terms inside a negator's scope get a NOT_ prefix, with an exemption list for words like 'breath' that stay clinically positive either way."/>
            <Step n="03" title="Train, then prune"
              body="Gradient descent with L2. Features whose weight lands under 0.02 are dropped — 36 of 1,168 — because a weight that small is memorised noise, not signal."/>
            <Step n="04" title="Compile the model into TypeScript"
              body="The trainer emits one self-contained module with the weights inlined and zero imports. Nothing to fetch at runtime, nothing to keep in sync, and the classifier works the first time the app opens on a phone that has never been online."/>
            <Step n="05" title="Prove Python and TypeScript agree"
              body="A generated fixture file pins what the Python trainer predicted. The TypeScript must reproduce it exactly. Drift between the two would mean the shipped model scores different features than it was trained on — silently, and only in production."/>
          </div>

          {/* the honest benchmark */}
          <div style={{ border: `2px solid ${T1}`, marginBottom: '20px' }}>
            <div style={{ borderBottom: `1px solid ${T1}`, padding: '11px 16px', background: BG2 }}>
              <span style={{ color: T1, fontFamily: mono, fontSize: '10.5px', fontWeight: 700, letterSpacing: '1.6px', textTransform: 'uppercase' }}>
                Head-to-head — 28 phrasings the model had never seen
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '460px' }}>
                <thead>
                  <tr>
                    {['', 'Ours, on-device', 'Llama 3.1 8B'].map((h, i) => (
                      <th key={h} style={{
                        textAlign: i === 0 ? 'left' : 'right', padding: '11px 16px',
                        borderBottom: `1px solid ${BORDER}`, color: T3, fontFamily: mono,
                        fontSize: '10px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Accuracy, all cases', '85.7%', '96.4%', 1],
                    ['Accuracy when confident', '100%', '—', 0],
                    ['Median latency', '0.11 ms', '155 ms', 0],
                    ['Works with no signal', 'yes', 'no', 0],
                    ['Explains its decision', 'yes', 'no', 0],
                    ['Cost per call', 'zero', 'metered', 0],
                  ].map(([k, a, b, llamaWins]) => (
                    <tr key={k as string}>
                      <td style={{ padding: '11px 16px', borderBottom: `1px solid ${BORDER}`, color: T1, fontSize: '13.5px', fontWeight: 600 }}>{k}</td>
                      <td style={{ padding: '11px 16px', borderBottom: `1px solid ${BORDER}`, textAlign: 'right', fontFamily: mono, fontSize: '13px', fontWeight: 700, color: llamaWins ? T2 : T1 }}>{a}</td>
                      <td style={{ padding: '11px 16px', borderBottom: `1px solid ${BORDER}`, textAlign: 'right', fontFamily: mono, fontSize: '13px', fontWeight: 700, color: llamaWins ? T1 : T3 }}>{b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ borderLeft: `3px solid ${RED}`, paddingLeft: '18px', marginBottom: '44px', maxWidth: '720px' }}>
            <p style={{ color: T1, fontSize: '17px', fontWeight: 700, lineHeight: 1.5, marginBottom: '10px' }}>
              Llama is more accurate than our model, and we are not going to out-classify an 8B model with 495 examples.
            </p>
            <p style={{ color: T2, fontSize: '15px', lineHeight: 1.7 }}>
              That is not the claim. The claim is what happened to the cases we got wrong:
              <strong style={{ color: T1 }}> every single one fell below the abstention gate</strong>. The model
              declined to answer rather than answer badly. So roughly 61% of emergencies are settled
              on-device, instantly, offline, with no errors on this evaluation — and the remaining 39%
              go to the language model, which is strong on exactly the ambiguous phrasings a small
              corpus is weak on. If there is no network, the on-device guess is used rather than
              dead-ending someone mid-emergency. A model that knows when to shut up is worth more here
              than one that is slightly more accurate but needs a tower.
            </p>
          </div>

          {/* the failure */}
          <div style={{ background: BG2, padding: '26px 24px', marginBottom: '20px' }}>
            <p style={{ color: T3, fontFamily: mono, fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '12px' }}>
              Where it went wrong first
            </p>
            <p style={{ color: T2, fontSize: '15px', lineHeight: 1.7, maxWidth: '720px', marginBottom: '14px' }}>
              The first attempt to grow the corpus made the model <em>worse</em> — held-out accuracy fell
              from 86.7% to 78.5%. The cause was that distinctive clinical terms appeared exactly once,
              so a term would land in the test split having never been seen in training, and a single
              train/test split was too noisy to notice.
            </p>
            <p style={{ color: T2, fontSize: '15px', lineHeight: 1.7, maxWidth: '720px' }}>
              Two rules came out of it, and they still hold: every distinctive term needs at least three
              different phrasings, and accuracy is measured by 5-fold cross-validation rather than one
              split. A benchmark that flattered us was also thrown out — the first run showed 100% for us
              and 0% for Groq, which turned out to be a contaminated eval set plus Groq quietly returning
              errors that were being counted as wrong answers.
            </p>
          </div>
        </div>
      </section>

      {/* ── 02 RISK ──────────────────────────────────────────────────────── */}
      <section style={{ padding: '92px 24px 0' }}>
        <div style={WRAP}>
          <SectionHead n="02" title="Risk engine" right="deterioration — ours"/>
          <H2>A medical flag that can&apos;t explain itself is worthless to a doctor.</H2>
          <P>
            This used to be a language model reading free-text check-ins and guessing a risk level. That
            is the wrong tool. If a patient shows a clinician <em>&ldquo;the app said I was at risk&rdquo;</em>, the
            clinician has to be able to see which measurement caused it and get the same answer running
            it again. Ask a model at temperature 0.2 twice and you may get two answers.
          </P>
          <P>
            So it is now arithmetic on published thresholds — the vital-sign subscores of <strong style={{ color: T1 }}>NEWS2</strong>,
            the early-warning score used in UK hospitals to catch deterioration. Same vitals, same flag,
            every time, with every point traced to the reading that earned it.
          </P>

          <div style={{ margin: '34px 0 46px' }}>
            <RiskDemo/>
          </div>

          <H2>Two layers, and only one of them is validated</H2>
          <P>
            NEWS2 uses absolute thresholds, which is right for acute hospital care and wrong for chronic
            illness. Someone with ME/CFS whose resting pulse normally sits at 58 and is suddenly at 76
            scores <strong style={{ color: T1 }}>NEWS2 zero</strong> — textbook normal — while being 18 bpm into their own crash
            pattern. So a second layer scores deviation from that person&apos;s own history: pulse against a
            21-day personal median, narrow pulse pressure, a rising-pulse trend, and gaps in logging,
            because someone too unwell to log is itself a signal.
          </P>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '22px', marginBottom: '38px' }}>
            <div style={{ border: `1px solid ${BORDER}`, padding: '20px' }}>
              <p style={{ color: ACCENT, fontFamily: mono, fontSize: '10px', fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase', marginBottom: '10px' }}>Layer 1 — validated</p>
              <p style={{ color: T1, fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>Partial NEWS2</p>
              <p style={{ color: T2, fontSize: '14px', lineHeight: 1.65 }}>
                Thresholds transcribed from the published table and pinned by 40 boundary-value tests, so
                nobody can quietly &ldquo;tune&rdquo; a clinical constant. Escalation follows the published bands,
                including the rule that any single parameter scoring 3 escalates on its own.
              </p>
            </div>
            <div style={{ border: `1px solid ${BORDER}`, padding: '20px' }}>
              <p style={{ color: T3, fontFamily: mono, fontSize: '10px', fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase', marginBottom: '10px' }}>Layer 2 — heuristic</p>
              <p style={{ color: T1, fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>Personal baseline</p>
              <p style={{ color: T2, fontSize: '14px', lineHeight: 1.65 }}>
                Labelled unvalidated in every signal it emits, and structurally incapable of raising an
                alert to <em>high</em> on its own. There is a test that throws every baseline signal at the
                engine at once with NEWS2 at zero and asserts the result is not high.
              </p>
            </div>
          </div>

          <div style={{ border: `2px solid ${RED}`, padding: '24px', marginBottom: '20px' }}>
            <p style={{ color: RED, fontFamily: mono, fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '12px' }}>
              Said everywhere it appears
            </p>
            <p style={{ color: T1, fontSize: '16px', lineHeight: 1.7, maxWidth: '740px' }}>
              NEWS2 has seven parameters and all seven are now implemented — temperature,
              consciousness level and supplemental-oxygen status were added in July 2026.
              A reading is only as complete as what was recorded, so the score reports itself as
              partial whenever a parameter is missing, and names it. A partial
              score can only ever <strong>under</strong>-estimate risk — which makes it safe as a prompt to seek
              care and unsafe as a reason not to. Every result carries that caveat and a list of exactly
              which vitals were missing, and it is printed under every alert a user sees. It is decision
              support. It is not a diagnosis, and it is not a substitute for a clinician or an ambulance.
            </p>
          </div>
        </div>
      </section>

      {/* ── 03 DISPATCH ──────────────────────────────────────────────────── */}
      <section style={{ padding: '92px 24px 0' }}>
        <div style={WRAP}>
          <SectionHead n="03" title="Dispatch engine" right="which hospital — ours"/>
          <H2>The nearest hospital is frequently the wrong hospital.</H2>
          <P>
            &ldquo;Nearest&rdquo; is a straight line on a map. A cardiac arrest needs a hospital with an open
            catheterisation lab, not the one 600 metres away that will stabilise and then transfer —
            spending the only minutes that mattered. So distance is the input we care about least.
          </P>

          <div style={{ border: `2px solid ${T1}`, marginBottom: '26px' }}>
            <div style={{ borderBottom: `1px solid ${T1}`, padding: '11px 16px', background: BG2 }}>
              <span style={{ color: T1, fontFamily: mono, fontSize: '10.5px', fontWeight: 700, letterSpacing: '1.6px', textTransform: 'uppercase' }}>
                What actually goes into the ranking
              </span>
            </div>
            <div style={{ padding: '4px 16px 14px' }}>
              {[
                ['Real drive time', 'One routing-matrix call prices every candidate at once on the actual road network — not a radius.'],
                ['Traffic', 'A live-traffic provider re-ranks the top candidates when a key is configured. Without one, a documented time-of-day model applies and the interface says "estimated" rather than implying live data.'],
                ['Facility capability', 'Cath lab for cardiac, stroke unit for stroke, trauma for unresponsive. A hospital reporting it lacks the relevant capability is pushed down; one reporting it has it is pulled up.'],
                ['Whether they are accepting', 'Partner hospitals report diversion status through a portal. A facility that says it is diverting is penalised hard rather than silently recommended.'],
                ['Freshness', 'Hospital-reported status older than four hours stops counting. Stale confidence is worse than no confidence.'],
              ].map(([k, v]) => (
                <div key={k} style={{ borderTop: `1px solid ${BORDER}`, padding: '14px 0', display: 'flex', gap: '18px', flexWrap: 'wrap' }}>
                  <span style={{ color: T1, fontFamily: mono, fontSize: '11px', fontWeight: 700, letterSpacing: '0.6px', minWidth: '170px' }}>{k}</span>
                  <span style={{ color: T2, fontSize: '14px', lineHeight: 1.6, flex: 1, minWidth: '240px' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          <P>
            When a hospital is genuinely connected, their emergency board lights up before the car
            moves: type, arrival estimate, blood type, allergies, medications. And it only ever says
            &ldquo;the ER is expecting you&rdquo; when a real partner facility actually acknowledged — never as
            decoration. Anything simulated is badged as simulated.
          </P>
        </div>
      </section>

      {/* ── 04 NAVIGATION ────────────────────────────────────────────────── */}
      <section style={{ padding: '92px 24px 0' }}>
        <div style={WRAP}>
          <SectionHead n="04" title="Navigation" right="getting there — ours"/>
          <H2>Handing someone off to a map app loses the emergency.</H2>
          <P>
            The moment you bounce a panicking family member into another application, the hospital
            briefing, the arrival estimate and the live emergency room all stop travelling with them. So
            turn-by-turn is built in: vector tiles, a chase camera, snap-to-route, wake lock so the
            screen never dies mid-junction, and a night mode.
          </P>
          <P>
            The bug worth mentioning was found by our own test rather than a user. After a GPS jump the
            route-position search only looked in a window around the last known point, so it silently
            latched onto the wrong part of the line and under-reported distance travelled by half — 4.9 km
            instead of 9.7. It now falls back to a full scan when the windowed match is poor.
          </P>
        </div>
      </section>

      {/* ── 05 LIMITS ────────────────────────────────────────────────────── */}
      <section style={{ padding: '92px 24px 0' }}>
        <div style={WRAP}>
          <SectionHead n="05" title="What this can't do yet" right="the honest part"/>
          <H2>Every number above is measured. Here is what isn&apos;t finished.</H2>
          <P>
            A page like this is easy to write dishonestly. The fastest way to check whether anyone is
            being straight with you is whether they will tell you where their own thing is weak.
          </P>

          <div style={{ marginBottom: '20px' }}>
            {[
              ['495 examples is a small corpus', 'The triage model improves with data, and the real corpus should come from anonymised production transcripts under consent — not from us inventing more sentences.'],
              ['Sparse phrasings are unreliable', 'Injury vocabulary is thin, and "other" is a grab-bag class that deserves subdividing. Stroke versus unconscious on speech symptoms still needs more data.'],
              ['NEWS2 is not validated under 16', 'It is designed for adults; paediatric practice uses PEWS. The score flags this when age is known, but the underlying instrument is still the adult one.'],
              ['The temperature band table needs a clinician\'s eye', 'Every other row was transcribed from an unambiguous source. For temperature the sources disagreed on alignment, so that row is flagged for confirmation.'],
              ['The personal-baseline layer is unvalidated', 'It is clinically plausible and carefully bounded, but it has not been tested against outcomes. It stays labelled that way until it has been.'],
              ['Orthostatic vitals are not captured', 'Lying-versus-standing heart rate is the actual diagnostic signal for POTS, and right now we do not collect it.'],
              ['The hospital network is small', 'Real drive-time ranking works everywhere. Live capability and diversion status only work where a facility has actually connected, and that is a partnership problem, not a software one.'],
            ].map(([k, v]) => (
              <div key={k} style={{ borderTop: `1px solid ${BORDER}`, padding: '16px 0' }}>
                <p style={{ color: T1, fontSize: '15px', fontWeight: 700, marginBottom: '5px' }}>{k}</p>
                <p style={{ color: T2, fontSize: '14px', lineHeight: 1.65, maxWidth: '700px' }}>{v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section style={{ padding: '90px 24px 110px' }}>
        <div style={WRAP}>
          <div style={{ borderTop: `3px solid ${T1}`, paddingTop: '34px' }}>
            <h2 style={{ color: T1, fontSize: 'clamp(30px, 5.2vw, 58px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.0, marginBottom: '24px', maxWidth: '820px' }}>
              None of this matters until it&apos;s set up before you need it<span style={{ color: RED }}>.</span>
            </h2>
            <p style={{ color: T2, fontSize: '16px', lineHeight: 1.7, maxWidth: '620px', marginBottom: '30px' }}>
              The profile takes a few minutes. It is the part that makes every engine above do anything
              useful at 3am.
            </p>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => router.push('/login?signup=1')}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', background: ORANGE, color: T1, fontWeight: 700, fontSize: '15px', padding: '14px 28px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', borderRadius: 0 }}>
                Create your free profile <span style={{ fontFamily: mono }}>→</span>
              </button>
              <button onClick={() => router.push('/demo')}
                style={{ background: 'none', border: 'none', color: T1, fontWeight: 600, fontSize: '14.5px', cursor: 'pointer', fontFamily: 'inherit', padding: 0, borderBottom: `2px solid ${T1}`, paddingBottom: '2px' }}>
                Run a full emergency, indoors
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
