'use client'
// Feature-by-feature deep dive.
//
// Distinct from /engineering: that page argues the technology is real by letting
// you run it. This one explains what each feature DOES and how the pieces move,
// using isometric scenes, flowcharts and charts instead of paragraphs.
//
// Everything numeric here comes from the engines or the measured benchmark. The
// one synthetic figure (the deterioration curve) is labelled as synthetic.
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { DispatchScene, OnDeviceScene, RelayScene } from '@/components/viz/Scenes'
import { Flow } from '@/components/viz/Flow'
import { BarChart, StepChart, Donut } from '@/components/viz/Chart'

const INK = '#141413', INK2 = '#5C5A52', INK3 = '#84827A'
const BORDER = '#DCE1D0', CREAM = '#EFF2E8'
const GREEN = '#788C5D', GREEN_DEEP = '#5F7049'
const ORANGE = '#D97757', CRIT = '#A33417', WARN = '#A87200'
const mono = 'var(--font-mono, monospace)'
const WRAP = { maxWidth: '1120px', margin: '0 auto' } as const

function Head({ n, title, right }: { n: string; title: string; right?: string }) {
  return (
    <div style={{
      borderTop: `3px solid ${INK}`, paddingTop: '14px', marginBottom: '28px',
      display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap',
    }}>
      <span style={{ color: INK, fontFamily: mono, fontSize: '11px', fontWeight: 700, letterSpacing: '1.8px', textTransform: 'uppercase' }}>
        {n} / {title}
      </span>
      {right && <span style={{ color: INK3, fontFamily: mono, fontSize: '11px', letterSpacing: '1.4px', textTransform: 'uppercase' }}>{right}</span>}
    </div>
  )
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 style={{ color: INK, fontSize: 'clamp(27px, 4.4vw, 48px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.03, marginBottom: '18px', maxWidth: '860px' }}>{children}</h2>
}
function P({ children }: { children: React.ReactNode }) {
  return <p style={{ color: INK2, fontSize: '16px', lineHeight: 1.7, marginBottom: '18px', maxWidth: '680px' }}>{children}</p>
}
function Cap({ children }: { children: React.ReactNode }) {
  return <p style={{ color: INK3, fontFamily: mono, fontSize: '10px', letterSpacing: '0.9px', lineHeight: 1.6, marginTop: '10px', textTransform: 'uppercase' }}>{children}</p>
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', alignItems: 'start' }}>{children}</div>
}
function Panel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ border: `1px solid ${BORDER}`, background: '#FFFFFF' }}>
      <div style={{ borderBottom: `1px solid ${BORDER}`, padding: '10px 14px', background: CREAM }}>
        <span style={{ color: INK, fontFamily: mono, fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ padding: '18px 16px' }}>{children}</div>
    </div>
  )
}

export default function Features() {
  const router = useRouter()

  return (
    <div style={{ background: '#FFFFFF', minHeight: '100dvh' }}>

      <header style={{ borderBottom: `1px solid ${BORDER}`, padding: '16px 24px', position: 'sticky', top: 0, background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(8px)', zIndex: 40 }}>
        <div style={{ ...WRAP, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: INK2, fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
            <ArrowLeft size={15}/> Relay Arc
          </button>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={() => router.push('/engineering')} style={{ background: 'none', border: 'none', color: INK2, fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: '8px 12px' }}>
              Technology
            </button>
            <button onClick={() => router.push('/login?signup=1')} style={{ background: ORANGE, color: INK, fontSize: '13.5px', fontWeight: 700, padding: '9px 18px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', borderRadius: 0 }}>
              Create your profile
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section style={{ padding: '78px 24px 0' }}>
        <div style={WRAP}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
            <span style={{ width: '7px', height: '7px', background: ORANGE, display: 'inline-block' }}/>
            <span style={{ color: INK2, fontFamily: mono, fontSize: '11.5px', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Every feature, and how it actually moves
            </span>
          </div>
          <h1 style={{ color: INK, fontSize: 'clamp(38px, 7.4vw, 88px)', fontWeight: 800, lineHeight: 0.96, letterSpacing: '-0.045em', marginBottom: '28px', maxWidth: '940px' }}>
            One button, and<br/>five things move at once<span style={{ color: CRIT }}>.</span>
          </h1>
          <P>
            Pressing SOS starts five separate machines: deciding what is wrong, deciding how urgent it
            is, choosing a hospital, telling that hospital, and moving the people who need to move. This
            page takes each one apart.
          </P>

          <div style={{ marginTop: '44px' }}>
            <RelayScene/>
            <Cap>The record reaches all four places from one press · solid lines are pushed automatically, dashed is on demand</Cap>
          </div>
        </div>
      </section>

      {/* ── 01 TRIAGE ─────────────────────────────────────────────────────── */}
      <section style={{ padding: '88px 24px 0' }}>
        <div style={WRAP}>
          <Head n="01" title="Emergency triage" right="what is wrong"/>
          <H2>It decides before it asks anyone&apos;s permission — or their network.</H2>
          <P>
            Say what is happening, or tap a type. The classifier runs on the phone, so a basement, a
            lift or a rural road makes no difference. The cloud model is a fallback for genuinely
            ambiguous phrasing, never a dependency.
          </P>

          <div style={{ marginBottom: '34px' }}>
            <OnDeviceScene/>
            <Cap>The model sits inside the app · the cloud link is dashed because it is optional</Cap>
          </div>

          <Panel label="The decision path">
            <Flow
              nodes={[
                { id: 'sos', col: 0, row: 0, label: 'SOS pressed', sub: 'voice or tap', fill: ORANGE },
                { id: 'tri', col: 1, row: 0, label: 'On-device triage', sub: '0.07 ms · offline', color: GREEN_DEEP },
                { id: 'gate', col: 2, row: 0, label: 'Confident?', sub: 'threshold 0.40', kind: 'decision', color: INK },
                { id: 'act', col: 3, row: 0, label: 'Dispatch', sub: 'hospital chosen', kind: 'end', color: CRIT },
                { id: 'cloud', col: 2, row: 1, label: 'Ask cloud model', sub: '3.5 s timeout', color: INK3 },
                { id: 'guess', col: 3, row: 1, label: 'Best on-device guess', sub: 'never dead-end', color: INK3 },
              ]}
              edges={[
                { from: 'sos', to: 'tri' },
                { from: 'tri', to: 'gate' },
                { from: 'gate', to: 'act', label: 'YES · 61%' },
                { from: 'gate', to: 'cloud', label: 'NO · 39%' },
                { from: 'cloud', to: 'guess', label: 'OFFLINE', dashed: true },
                { from: 'cloud', to: 'act', label: 'ANSWER' },
              ]}
            />
          </Panel>

          <div style={{ marginTop: '30px' }}>
            <Grid>
              <Panel label="Time to a decision — measured">
                <BarChart
                  bars={[
                    { label: 'On-device', value: 0.11, color: GREEN, note: 'no network involved' },
                    { label: 'Cloud model', value: 155, color: INK3, note: 'plus whatever the signal costs' },
                  ]}
                  format={v => (v < 1 ? `${v} ms` : `${v} ms`)}
                />
                <Cap>Bars are linear — the on-device bar is not a rounding error, it is 1,400× shorter</Cap>
              </Panel>
              <Panel label="Where emergencies get settled">
                <Donut value={0.61} label="on device" color={GREEN}
                  sub="Settled instantly, offline, with no errors on the held-out evaluation. The other 39% are the ambiguous phrasings, and those go to the cloud model — which is better at exactly those."/>
              </Panel>
            </Grid>
          </div>

          <div style={{ marginTop: '30px' }}>
            <Panel label="Accuracy — including where we lose">
              <BarChart
                bars={[
                  { label: 'Llama 3.1 8B (cloud)', value: 96.4, color: INK3, note: 'more accurate than ours on raw classification' },
                  { label: 'Relay, on-device', value: 85.7, color: GREEN, note: 'every case it got wrong, it abstained on instead of guessing' },
                  { label: 'Relay, when confident', value: 100, color: GREEN_DEEP, note: 'the 61% it chooses to answer' },
                ]}
                max={100} unit="%"
              />
              <Cap>28 phrasings the model had never seen · the point is not beating an 8B model, it is knowing when to stay quiet</Cap>
            </Panel>
          </div>
        </div>
      </section>

      {/* ── 02 DISPATCH ───────────────────────────────────────────────────── */}
      <section style={{ padding: '88px 24px 0' }}>
        <div style={WRAP}>
          <Head n="02" title="Hospital dispatch" right="where to go"/>
          <H2>The closest hospital is often the one that will cost you the most time.</H2>
          <P>
            A heart attack needs a catheterisation lab. The emergency room four minutes away that will
            stabilise you and then arrange a transfer has just spent the only minutes that mattered. So
            distance is the input we weigh least.
          </P>

          <div style={{ marginBottom: '34px' }}>
            <DispatchScene/>
            <Cap>Solid line is the route taken · dashed is the nearer hospital that was rejected for having no cath lab</Cap>
          </div>

          <Panel label="How a hospital gets chosen">
            <Flow
              nodes={[
                { id: 'c', col: 0, row: 0, label: 'Candidates', sub: 'all nearby facilities' },
                { id: 'eta', col: 1, row: 0, label: 'Real drive time', sub: 'one matrix call', color: GREEN_DEEP },
                { id: 'traf', col: 2, row: 0, label: 'Traffic', sub: 'live, or time-of-day', color: WARN },
                { id: 'cap', col: 0, row: 1, label: 'Capability', sub: 'cath / stroke / trauma', color: GREEN_DEEP },
                { id: 'acc', col: 1, row: 1, label: 'Accepting?', sub: 'diversion status', kind: 'decision', color: INK },
                { id: 'rank', col: 2, row: 1, label: 'Ranked', sub: 'best first', kind: 'end', color: CRIT },
              ]}
              edges={[
                { from: 'c', to: 'eta' },
                { from: 'eta', to: 'traf' },
                { from: 'cap', to: 'acc' },
                { from: 'acc', to: 'rank', label: 'YES' },
                { from: 'traf', to: 'rank' },
              ]}
            />
          </Panel>

          <div style={{ marginTop: '30px' }}>
            <Panel label="A worked example — same three hospitals, two ways of ranking">
              <BarChart
                bars={[
                  { label: 'Nearest · no cath lab', value: 4, color: WARN, note: 'ranked first by distance — then transfers you, and the clock keeps running' },
                  { label: 'Chosen · cath lab, accepting', value: 11, color: GREEN, note: 'ranked first by us: 7 minutes further, and definitive treatment on arrival' },
                  { label: 'Third · diverting', value: 9, color: INK3, note: 'closer than the choice, but reported it is not accepting' },
                ]}
                max={14} format={v => `${v} min`}
              />
              <Cap>Illustrative arrangement · the ETAs come from real road-network routing, the capability and diversion flags from what a partner facility reports</Cap>
            </Panel>
          </div>
        </div>
      </section>

      {/* ── 03 RISK ───────────────────────────────────────────────────────── */}
      <section style={{ padding: '88px 24px 0' }}>
        <div style={WRAP}>
          <Head n="03" title="Deterioration risk" right="how urgent"/>
          <H2>It watches the slope, not just the reading.</H2>
          <P>
            Log vitals and the score is arithmetic on published thresholds — the vital-sign subscores of
            NEWS2, the early-warning score used in hospitals to catch deterioration before it becomes an
            emergency. Same numbers in, same flag out, every time, with every point traced to the
            reading that produced it.
          </P>

          <Panel label="Escalation as the score climbs">
            <StepChart
              points={[{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 3 }, { x: 4, y: 4 }, { x: 5, y: 6 }, { x: 6, y: 8 }]}
              bands={[
                { from: 0, to: 4, color: GREEN_DEEP, label: 'low 0–4' },
                { from: 4, to: 6, color: WARN, label: 'medium 5–6' },
                { from: 6, to: 12, color: CRIT, label: 'high 7+' },
              ]}
              xLabel="consecutive readings"
              yLabel="NEWS2 aggregate"
            />
            <Cap>Synthetic patient, real thresholds — the bands are NEWS2&apos;s published escalation bands, the curve is illustrative</Cap>
          </Panel>

          <div style={{ marginTop: '30px' }}>
            <Grid>
              <Panel label="What each vital can contribute">
                <BarChart
                  bars={[
                    { label: 'Respiratory rate', value: 3, color: CRIT, note: '≤8 or ≥25 scores 3' },
                    { label: 'Oxygen saturation', value: 3, color: CRIT, note: '≤91% scores 3' },
                    { label: 'Systolic BP', value: 3, color: CRIT, note: '≤90 or ≥220 scores 3' },
                    { label: 'Pulse', value: 3, color: CRIT, note: '≤40 or ≥131 scores 3' },
                  ]}
                  max={3} format={v => `up to +${v}`}
                />
                <Cap>Any single parameter scoring 3 escalates on its own, even with a low total</Cap>
              </Panel>
              <Panel label="Two layers, one validated">
                <Flow
                  nodes={[
                    { id: 'v', col: 0, row: 0, label: 'Vitals logged' },
                    { id: 'n', col: 1, row: 0, label: 'Partial NEWS2', sub: 'validated', color: GREEN_DEEP },
                    { id: 'b', col: 1, row: 1, label: 'Personal baseline', sub: 'heuristic', color: INK3 },
                    { id: 'o', col: 2, row: 0, label: 'Level + reasons', kind: 'end', color: CRIT },
                  ]}
                  edges={[
                    { from: 'v', to: 'n' },
                    { from: 'n', to: 'o' },
                    { from: 'b', to: 'o', label: 'CANNOT REACH HIGH', dashed: true, color: INK3 },
                  ]}
                />
                <Cap>The unvalidated layer can raise low to medium and never to high — enforced by a test</Cap>
              </Panel>
            </Grid>
          </div>

          <div style={{ border: `2px solid ${CRIT}`, padding: '22px', marginTop: '30px' }}>
            <p style={{ color: CRIT, fontFamily: mono, fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px' }}>
              Stated on every alert
            </p>
            <p style={{ color: INK, fontSize: '15.5px', lineHeight: 1.7, maxWidth: '740px' }}>
              NEWS2 has seven parameters and Relay now captures all seven — but only when you
              record them. When any are missing the score reports itself as <strong>partial</strong> and
              names what is absent. A phone cannot always take your
              temperature, assess your consciousness level, or know whether you are on supplemental
              oxygen. A partial score can only ever <strong>under</strong>-estimate risk, which makes it safe as a
              reason to seek care and unsafe as a reason not to. Decision support, not a diagnosis.
            </p>
          </div>
        </div>
      </section>

      {/* ── 04 THE RELAY ──────────────────────────────────────────────────── */}
      <section style={{ padding: '88px 24px 0' }}>
        <div style={WRAP}>
          <Head n="04" title="The relay" right="who else moves"/>
          <H2>An emergency is never one person&apos;s problem.</H2>
          <P>
            The moment SOS fires, a shared room opens. Family see live location and the same countdown.
            A bystander can take over if you stop responding. If a partner hospital is connected, their
            emergency board has your blood type, allergies and medications before the car moves — and
            the app only claims &ldquo;the ER is expecting you&rdquo; when a real facility actually acknowledged.
          </P>

          <Panel label="What fires, and in what order">
            <Flow
              nodes={[
                { id: 's', col: 0, row: 0, label: 'SOS', sub: 't = 0s', fill: ORANGE },
                { id: 'r', col: 1, row: 0, label: 'Relay room opens', sub: 'realtime, shared', color: GREEN_DEEP },
                { id: 'h', col: 2, row: 0, label: 'ER board alerted', sub: 'profile sent ahead', color: GREEN_DEEP },
                { id: 'c', col: 1, row: 1, label: 'Care circle notified', sub: 'push + live map', color: INK3 },
                { id: 'd', col: 2, row: 1, label: 'Ride dispatched', sub: 'turn-by-turn in app', color: INK3 },
                { id: 'g', col: 0, row: 1, label: 'Guardian watch', sub: 'if you go quiet', color: WARN },
              ]}
              edges={[
                { from: 's', to: 'r' },
                { from: 'r', to: 'h' },
                { from: 'r', to: 'c' },
                { from: 'c', to: 'd' },
                { from: 'g', to: 'r', label: 'ESCALATES', dashed: true, color: WARN },
              ]}
            />
          </Panel>
        </div>
      </section>

      {/* ── 05 NAVIGATION ─────────────────────────────────────────────────── */}
      <section style={{ padding: '88px 24px 0' }}>
        <div style={WRAP}>
          <Head n="05" title="Navigation" right="getting there"/>
          <H2>Bouncing someone into a map app loses the emergency.</H2>
          <P>
            The second a panicking family member leaves for another application, the hospital briefing,
            the arrival estimate and the shared room stop travelling with them. So turn-by-turn is built
            in — vector tiles, a chase camera, snap-to-route, a wake lock so the screen never dies at a
            junction, and a night mode.
          </P>

          <Panel label="The navigation loop, every GPS tick">
            <Flow
              nodes={[
                { id: 'g', col: 0, row: 0, label: 'GPS fix', sub: 'every ~1s' },
                { id: 's', col: 1, row: 0, label: 'Snap to route', sub: 'windowed search', color: GREEN_DEEP },
                { id: 'j', col: 2, row: 0, label: 'Match good?', kind: 'decision', color: INK },
                { id: 'a', col: 3, row: 0, label: 'Advance step', sub: 'camera + voice', kind: 'end', color: CRIT },
                { id: 'f', col: 2, row: 1, label: 'Full re-scan', sub: 'after a GPS jump', color: WARN },
              ]}
              edges={[
                { from: 'g', to: 's' },
                { from: 's', to: 'j' },
                { from: 'j', to: 'a', label: 'YES' },
                { from: 'j', to: 'f', label: 'NO' },
                { from: 'f', to: 'a', label: 'RETRY' },
              ]}
            />
            <Cap>The full re-scan branch exists because of a real bug — a windowed-only search silently latched onto the wrong part of the line after a GPS jump and under-reported distance by half</Cap>
          </Panel>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section style={{ padding: '88px 24px 106px' }}>
        <div style={WRAP}>
          <div style={{ background: ORANGE, padding: 'clamp(30px, 5vw, 56px)' }}>
            <h2 style={{ color: INK, fontSize: 'clamp(28px, 5vw, 54px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.0, marginBottom: '20px', maxWidth: '760px' }}>
              None of it works if it isn&apos;t set up before you need it<span style={{ color: '#FFFFFF' }}>.</span>
            </h2>
            <p style={{ color: 'rgba(20,20,19,0.78)', fontSize: '16px', lineHeight: 1.7, maxWidth: '580px', marginBottom: '26px' }}>
              A few minutes now is what makes every machine on this page do something useful at 3am.
            </p>
            <div style={{ display: 'flex', gap: '18px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => router.push('/login?signup=1')}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', background: INK, color: '#FFFFFF', fontWeight: 700, fontSize: '15px', padding: '14px 28px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', borderRadius: 0 }}>
                Create your free profile <span style={{ fontFamily: mono }}>→</span>
              </button>
              <button onClick={() => router.push('/engineering')}
                style={{ background: 'none', border: 'none', color: INK, fontWeight: 700, fontSize: '14.5px', cursor: 'pointer', fontFamily: 'inherit', padding: 0, borderBottom: `2px solid ${INK}`, paddingBottom: '2px' }}>
                See the engines running live
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
