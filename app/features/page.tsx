'use client'
// Feature-by-feature deep dive.
import SiteHeader from '@/components/SiteHeader'
import { useRouter } from 'next/navigation'
import { DispatchScene, OnDeviceScene, RelayScene, TrendScene } from '@/components/viz/Scenes'
import { Flow } from '@/components/viz/Flow'
import { BarChart, Donut } from '@/components/viz/Chart'

const INK = '#141413',
  INK2 = '#5C5A52',
  INK3 = '#5C5A52'
const BORDER = '#98C890',
  CREAM = '#B3DDAC'
const GREEN = '#56804E',
  GREEN_DEEP = '#42623C'
const ORANGE = '#D97757',
  CRIT = '#A33417',
  WARN = '#7C5200'
const mono = 'var(--font-mono, monospace)'
const WRAP = { maxWidth: '1120px', margin: '0 auto' } as const

function Head({ title }: { n?: string; title: string; right?: string }) {
  return (
    <div style={{ borderTop: `2px solid ${INK}`, paddingTop: '12px', marginBottom: '26px' }}>
      <span style={{ color: INK, fontSize: '14px', fontWeight: 700 }}>{title}</span>
    </div>
  )
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        color: INK,
        fontSize: 'clamp(27px, 4.4vw, 48px)',
        fontWeight: 800,
        letterSpacing: '-0.04em',
        lineHeight: 1.03,
        marginBottom: '18px',
        maxWidth: '860px',
      }}
    >
      {children}
    </h2>
  )
}
function P({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        color: INK2,
        fontSize: '16px',
        lineHeight: 1.7,
        marginBottom: '18px',
        maxWidth: '680px',
      }}
    >
      {children}
    </p>
  )
}
function Cap({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        color: INK2,
        fontSize: '13.5px',
        lineHeight: 1.55,
        marginTop: '10px',
        maxWidth: '680px',
      }}
    >
      {children}
    </p>
  )
}
function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '30px',
        alignItems: 'start',
      }}
    >
      {children}
    </div>
  )
}
function Panel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ border: `1px solid ${INK}`, background: '#FFFFFF' }}>
      <div style={{ borderBottom: `1px solid ${INK}`, padding: '9px 14px' }}>
        <span style={{ color: INK, fontSize: '13px', fontWeight: 700 }}>{label}</span>
      </div>
      <div style={{ padding: '18px 16px' }}>{children}</div>
    </div>
  )
}

export default function Features() {
  const router = useRouter()

  return (
    <div style={{ background: '#B3DDAC', minHeight: '100dvh' }}>
      <SiteHeader />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section style={{ padding: '78px 24px 0' }}>
        <div style={WRAP}>
          <h1
            style={{
              color: INK,
              fontSize: 'clamp(38px, 7.4vw, 88px)',
              fontWeight: 800,
              lineHeight: 0.96,
              letterSpacing: '-0.045em',
              marginBottom: '28px',
              maxWidth: '940px',
            }}
          >
            What happens after
            <br />
            you press SOS
          </h1>
          <P>
            Five things start at once. The phone works out what is wrong and how urgent it is, picks
            a hospital, sends that hospital your details, and gets your family and a driver moving.
            Each section below covers one of them.
          </P>

          <div style={{ marginTop: '44px' }}>
            <RelayScene />
            <Cap>
              The hospital step only happens if the hospital is a Relay partner. Everything else
              happens for everyone.
            </Cap>
          </div>
        </div>
      </section>

      {/* ── 01 TRIAGE ─────────────────────────────────────────────────────── */}
      <section style={{ padding: '88px 24px 0' }}>
        <div style={WRAP}>
          <Head title="Working out what is wrong" />
          <H2>The phone makes the first call, even with no signal.</H2>
          <P>
            You can say what is happening or tap a type, in English, Spanish, Hindi or Marathi. Two
            models run on the phone itself and vote: one reads the words, the other is a small
            neural network that also reads spelling, so a typo or an unfamiliar word form still
            lands in the right place. It still works in a basement, a lift or out in the country. If
            the wording is ambiguous it asks a larger cloud model, and if there is no signal for
            that, it goes with its own best guess.
          </P>

          <div style={{ marginBottom: '34px' }}>
            <OnDeviceScene />
            <Cap>
              Most cases finish on the phone. The dashed path is only used when the phone is not
              confident.
            </Cap>
          </div>

          <Panel label="The decision path">
            <Flow
              nodes={[
                {
                  id: 'sos',
                  col: 0,
                  row: 0,
                  label: 'SOS pressed',
                  sub: 'spoken or typed\nEN · ES · HI · MR',
                  kind: 'end',
                },
                {
                  id: 'feat',
                  col: 1,
                  row: 0,
                  label: 'Read the words',
                  sub: 'words, word pairs and\nletter triples (typos still match)',
                },
                {
                  id: 'lin',
                  col: 2,
                  row: 0,
                  label: 'Linear model',
                  sub: 'one weight per word\nshows its evidence',
                },
                {
                  id: 'nn',
                  col: 2,
                  row: 1,
                  label: 'Neural network',
                  sub: '1024 inputs → 32 → 7\ntrained from scratch',
                },
                {
                  id: 'avg',
                  col: 3,
                  row: 0,
                  label: 'Average + calibrate',
                  sub: 'confidence scaled\nT = 1.75',
                },
                {
                  id: 'gate',
                  col: 4,
                  row: 0,
                  label: 'Sure enough?',
                  sub: '≥ 0.60',
                  kind: 'decision',
                },
                {
                  id: 'act',
                  col: 3,
                  row: 1,
                  label: 'Dispatch',
                  sub: '76% of test cases\nall of them correct',
                  kind: 'end',
                },
                {
                  id: 'cloud',
                  col: 4,
                  row: 1,
                  label: 'Ask cloud model',
                  sub: 'gpt-oss-20b\n3.5 s time limit',
                },
                {
                  id: 'guess',
                  col: 4,
                  row: 2,
                  label: 'Best phone guess',
                  sub: 'no signal: never\na dead end',
                },
              ]}
              edges={[
                { from: 'sos', to: 'feat' },
                { from: 'feat', to: 'lin' },
                { from: 'feat', to: 'nn' },
                { from: 'lin', to: 'avg' },
                { from: 'nn', to: 'avg' },
                { from: 'avg', to: 'gate' },
                { from: 'gate', to: 'act', label: 'yes' },
                { from: 'gate', to: 'cloud', label: 'no' },
                { from: 'cloud', to: 'act', label: 'answer' },
                { from: 'cloud', to: 'guess', label: 'offline', dashed: true },
              ]}
            />
          </Panel>

          <div style={{ marginTop: '30px' }}>
            <Grid>
              <Panel label="Time to a decision (measured)">
                <BarChart
                  bars={[
                    { label: 'On-device', value: 0.11, color: GREEN, note: 'no network involved' },
                    {
                      label: 'Cloud model',
                      value: 155,
                      color: INK3,
                      note: 'plus whatever the signal costs',
                    },
                  ]}
                  format={(v) => (v < 1 ? `${v} ms` : `${v} ms`)}
                />
                <Cap>
                  Both bars are on the same linear scale. The on-device one really is about 1,400
                  times shorter.
                </Cap>
              </Panel>
              <Panel label="Where cases get settled">
                <Donut
                  value={0.76}
                  label="on device"
                  color={GREEN}
                  sub="76% of 49 unseen test phrasings were settled on the phone, offline, with no errors. The other 24% were the ambiguous ones, and the cloud model handles those better, so they go there. Phone and cloud together scored 93.9%."
                />
              </Panel>
            </Grid>
          </div>

          <div style={{ marginTop: '30px' }}>
            <Panel label="Accuracy, including where the cloud model wins">
              <BarChart
                bars={[
                  {
                    label: 'gpt-oss-20b (cloud)',
                    value: 89.8,
                    color: INK3,
                    note: 'more accurate than ours on raw classification',
                  },
                  {
                    label: 'Relay, on-device',
                    value: 85.7,
                    color: GREEN,
                    note: 'when it would have been wrong, it handed off instead of guessing',
                  },
                  {
                    label: 'Relay, when confident',
                    value: 100,
                    color: GREEN_DEEP,
                    note: 'the 76% it chooses to answer',
                  },
                  {
                    label: 'Phone and cloud together',
                    value: 93.9,
                    color: GREEN_DEEP,
                    note: 'the system as shipped: better than either alone',
                  },
                ]}
                max={100}
                unit="%"
              />
              <Cap>
                Tested on 49 phrasings in four languages that neither model had seen. The cloud
                model is more accurate on its own; ours is built to hand off when it is unsure,
                which is why the two together beat both.
              </Cap>
            </Panel>
          </div>
        </div>
      </section>

      {/* ── 02 DISPATCH ───────────────────────────────────────────────────── */}
      <section style={{ padding: '88px 24px 0' }}>
        <div style={WRAP}>
          <Head title="Choosing a hospital" />
          <H2>The nearest hospital can be the slowest way to get treated.</H2>
          <P>
            A heart attack needs a catheterisation lab. If the nearest ER does not have one, it will
            stabilise you and then transfer you, and that transfer uses up the minutes that count.
            So distance gets the least weight in the ranking.
          </P>

          <div style={{ marginBottom: '34px' }}>
            <DispatchScene />
            <Cap>
              An illustrative example. Drive times come from road-network routing. Cath lab and
              diversion status come from what each hospital reports.
            </Cap>
          </div>

          <Panel label="How a hospital gets chosen">
            <Flow
              nodes={[
                {
                  id: 'c',
                  col: 0,
                  row: 0,
                  label: 'Nearby hospitals',
                  sub: 'OpenStreetMap, 50 km\n8 nearest kept',
                  kind: 'end',
                },
                {
                  id: 'er',
                  col: 1,
                  row: 0,
                  label: 'Drop non-ERs',
                  sub: 'rehab, psychiatric,\nnursing, surgery centres',
                },
                {
                  id: 'eta',
                  col: 2,
                  row: 0,
                  label: 'Real drive time',
                  sub: 'road routing (OSRM)\none call for all 8',
                },
                {
                  id: 'traf',
                  col: 3,
                  row: 0,
                  label: 'Traffic',
                  sub: 'live if available,\nelse time of day',
                },
                {
                  id: 'cap',
                  col: 3,
                  row: 1,
                  label: 'Can it treat this?',
                  sub: 'NJ DOH heart-attack data\nyes ×0.75 · ? ×1.2 · no ×1.8',
                },
                {
                  id: 'acc',
                  col: 2,
                  row: 1,
                  label: 'Hospital status',
                  sub: 'diverting ×2.2\naccepting ×0.85',
                },
                {
                  id: 'rank',
                  col: 1,
                  row: 1,
                  label: 'Rank',
                  sub: 'minutes × all factors\nlowest score wins',
                },
                { id: 'far', col: 1, row: 2, label: '25 min or more?', kind: 'decision' },
                {
                  id: 'call',
                  col: 0,
                  row: 2,
                  label: 'Call 911 first',
                  sub: 'GPS shown for the\ndispatcher, then drive',
                },
                {
                  id: 'go',
                  col: 2,
                  row: 2,
                  label: 'Go',
                  sub: 'directions, ER brief,\nfamily texted',
                  kind: 'end',
                },
              ]}
              edges={[
                { from: 'c', to: 'er' },
                { from: 'er', to: 'eta' },
                { from: 'eta', to: 'traf' },
                { from: 'traf', to: 'cap' },
                { from: 'cap', to: 'acc' },
                { from: 'acc', to: 'rank' },
                { from: 'rank', to: 'far' },
                { from: 'far', to: 'call', label: 'yes' },
                { from: 'far', to: 'go', label: 'no' },
              ]}
            />
          </Panel>
        </div>
      </section>

      {/* ── 03 RISK ───────────────────────────────────────────────────────── */}
      <section style={{ padding: '88px 24px 0' }}>
        <div style={WRAP}>
          <Head title="How urgent it is" />
          <H2>A single reading tells you less than the trend.</H2>
          <P>
            When you log vitals, the score is plain arithmetic on published thresholds: the
            vital-sign parts of NEWS2, the early-warning score hospitals use to spot patients who
            are getting worse. The same numbers always give the same result, and every point can be
            traced back to the reading behind it.
          </P>
          <P>
            Most families do not own a smartwatch or a pulse oximeter, so the phone becomes the
            sensor. Pressing a fingertip over the camera and flash measures the pulse from tiny
            changes in colour as blood arrives with each beat. Resting the phone on the chest lets
            the motion sensor count breaths. Apple Health readings can be imported on the phone
            without uploading anything. All seven NEWS2 measurements are then laid out point by
            point, ready to show a doctor or paramedic.{' '}
            <a href="/check" style={{ color: '#141413', fontWeight: 700 }}>
              Try the vitals check →
            </a>
          </P>

          <TrendScene />
          <Cap>
            Real NEWS2 thresholds, made-up readings. Readings 3, 4 and 5 each count as low on their
            own, but put side by side they are already climbing two readings before the score
            reaches medium.
          </Cap>

          <div style={{ marginTop: '30px' }}>
            <Grid>
              <Panel label="What each vital can contribute">
                <BarChart
                  bars={[
                    {
                      label: 'Respiratory rate',
                      value: 3,
                      color: CRIT,
                      note: '≤8 or ≥25 scores 3',
                    },
                    { label: 'Oxygen saturation', value: 3, color: CRIT, note: '≤91% scores 3' },
                    { label: 'Systolic BP', value: 3, color: CRIT, note: '≤90 or ≥220 scores 3' },
                    { label: 'Pulse', value: 3, color: CRIT, note: '≤40 or ≥131 scores 3' },
                  ]}
                  max={3}
                  format={(v) => `up to +${v}`}
                />
                <Cap>
                  Any one of these scoring 3 escalates on its own, even if the total is low.
                </Cap>
              </Panel>
              <Panel label="Two layers, only one of them validated">
                <Flow
                  nodes={[
                    { id: 'v', col: 0, row: 0, label: 'Vitals logged' },
                    {
                      id: 'n',
                      col: 1,
                      row: 0,
                      label: 'Partial NEWS2',
                      sub: 'validated',
                      color: GREEN_DEEP,
                    },
                    {
                      id: 'b',
                      col: 1,
                      row: 1,
                      label: 'Personal baseline',
                      sub: 'heuristic',
                      color: INK3,
                    },
                    { id: 'o', col: 2, row: 0, label: 'Level + reasons', kind: 'end', color: CRIT },
                  ]}
                  edges={[
                    { from: 'v', to: 'n' },
                    { from: 'n', to: 'o' },
                    {
                      from: 'b',
                      to: 'o',
                      label: 'can never reach high',
                      dashed: true,
                      color: INK3,
                    },
                  ]}
                />
                <Cap>
                  The personal baseline is not clinically validated, so it can raise a low score to
                  medium but never to high. A test enforces this.
                </Cap>
              </Panel>
            </Grid>
          </div>

          <div
            style={{
              borderLeft: `3px solid ${CRIT}`,
              padding: '4px 0 4px 18px',
              marginTop: '30px',
            }}
          >
            <p style={{ color: CRIT, fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
              Shown on every alert
            </p>
            <p style={{ color: INK, fontSize: '15.5px', lineHeight: 1.7, maxWidth: '740px' }}>
              NEWS2 uses seven measurements. Relay can record all seven, but only the ones you
              enter, and a phone cannot take your temperature, judge your level of consciousness, or
              tell whether you are on oxygen. When anything is missing, the score is marked{' '}
              <strong>partial</strong> and lists what is missing. A partial score can only{' '}
              <strong>under</strong>-estimate risk. If it says high, get help. If it says low, that
              is not a reason to skip getting help. Relay supports a decision; it does not diagnose.
            </p>
          </div>
        </div>
      </section>

      {/* ── 04 THE RELAY ──────────────────────────────────────────────────── */}
      <section style={{ padding: '88px 24px 0' }}>
        <div style={WRAP}>
          <Head title="Telling everyone else" />
          <H2>Your family, the hospital and a driver find out together.</H2>
          <P>
            When SOS goes off, a shared room opens. Family see your live location and the same
            countdown you do. If you stop responding, someone with you can take over. If the
            hospital is a connected partner, its emergency board gets your blood type, allergies and
            medications before you set off. The app only says the ER is expecting you once a real
            person there has confirmed it.
          </P>

          <Panel label="What starts, and what depends on what">
            <Flow
              nodes={[
                { id: 's', col: 0, row: 0, label: 'SOS', sub: 'the press', fill: ORANGE },
                {
                  id: 'r',
                  col: 1,
                  row: 0,
                  label: 'Relay room opens',
                  sub: 'realtime, shared',
                  color: GREEN_DEEP,
                },
                {
                  id: 'h',
                  col: 2,
                  row: 0,
                  label: 'ER board alerted',
                  sub: 'profile sent ahead',
                  color: GREEN_DEEP,
                },
                {
                  id: 'c',
                  col: 1,
                  row: 1,
                  label: 'Care circle notified',
                  sub: 'push + live map',
                  color: INK3,
                },
                {
                  id: 'd',
                  col: 2,
                  row: 1,
                  label: 'Ride dispatched',
                  sub: 'turn-by-turn in app',
                  color: INK3,
                },
                {
                  id: 'g',
                  col: 0,
                  row: 1,
                  label: 'Guardian watch',
                  sub: 'if you go quiet',
                  color: WARN,
                },
              ]}
              edges={[
                { from: 's', to: 'r' },
                { from: 'r', to: 'h' },
                { from: 'r', to: 'c' },
                { from: 'c', to: 'd' },
                { from: 'g', to: 'r', label: 'escalates', dashed: true, color: WARN },
              ]}
            />
          </Panel>
        </div>
      </section>

      {/* ── 05 NAVIGATION ─────────────────────────────────────────────────── */}
      <section style={{ padding: '88px 24px 0' }}>
        <div style={WRAP}>
          <Head title="Getting there" />
          <H2>Directions are built in, so nobody has to switch apps.</H2>
          <P>
            If a frightened family member jumps to a separate maps app, the hospital brief, the
            arrival time and the shared room get left behind. So turn-by-turn lives inside Relay:
            vector maps, a camera that follows the car, snap-to-route, a wake lock so the screen
            stays on at junctions, and a night mode.
          </P>

          <Panel label="The navigation loop, every GPS tick">
            <Flow
              nodes={[
                { id: 'g', col: 0, row: 0, label: 'GPS fix', sub: 'every ~1s' },
                {
                  id: 's',
                  col: 1,
                  row: 0,
                  label: 'Snap to route',
                  sub: 'windowed search',
                  color: GREEN_DEEP,
                },
                { id: 'j', col: 2, row: 0, label: 'Match good?', kind: 'decision', color: INK },
                {
                  id: 'a',
                  col: 3,
                  row: 0,
                  label: 'Advance step',
                  sub: 'camera + voice',
                  kind: 'end',
                  color: CRIT,
                },
                {
                  id: 'f',
                  col: 2,
                  row: 1,
                  label: 'Full re-scan',
                  sub: 'after a GPS jump',
                  color: WARN,
                },
              ]}
              edges={[
                { from: 'g', to: 's' },
                { from: 's', to: 'j' },
                { from: 'j', to: 'a', label: 'yes' },
                { from: 'j', to: 'f', label: 'no' },
                { from: 'f', to: 'a', label: 'retry' },
              ]}
            />
            <Cap>
              The re-scan branch is there because of a real bug: after a GPS jump, the old search
              locked onto the wrong part of the route and reported about half the real distance.
            </Cap>
          </Panel>
        </div>
      </section>

      {/* end */}
      <section style={{ padding: '80px 24px 100px' }}>
        <div style={WRAP}>
          <div style={{ borderTop: `2px solid ${INK}`, paddingTop: '30px' }}>
            <h2
              style={{
                color: INK,
                fontSize: 'clamp(28px, 4.6vw, 48px)',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                lineHeight: 1.05,
                marginBottom: '20px',
              }}
            >
              Set it up before you need it.
            </h2>
            <p
              style={{
                color: INK2,
                fontSize: '16px',
                lineHeight: 1.7,
                maxWidth: '620px',
                marginBottom: '28px',
              }}
            >
              It takes a few minutes, and it is what makes all of this work when it counts.
            </p>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => router.push('/login?signup=1')}
                style={{
                  background: INK,
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '15px',
                  padding: '14px 26px',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  borderRadius: 10,
                }}
              >
                Make your free profile
              </button>
              <button
                onClick={() => router.push('/card')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: INK,
                  fontWeight: 600,
                  fontSize: '15px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  padding: 0,
                  textDecoration: 'underline',
                }}
              >
                Or make an emergency card
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
