'use client'
// How we built it. Plain-language write-up with two live demos that run the
// real app code in the browser.
import SiteHeader from '@/components/SiteHeader'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

// The triage weights are 153 KB. Load them when someone reaches the demo, not on
// first paint.
const TriageDemo = dynamic(() => import('@/components/TriageDemo'), {
  ssr: false,
  loading: () => <DemoSkeleton label="loading the model…" />,
})
const RiskDemo = dynamic(() => import('@/components/RiskDemo'), {
  ssr: false,
  loading: () => <DemoSkeleton label="loading the scorer…" />,
})

// The page green, and why it is this one.
const T1 = '#141413',
  T2 = '#3F3D36',
  T3 = '#5C5A52'
// BG2 was #3A6440, a dark inner panel built for the dark page. Once the page
// went light it kept its dark fill while the text on it stayed ink and grey,
// which measured 2.70:1 and 1.01:1. A light tint of the page restores both.
const BORDER = '#7EB382',
  BG2 = '#CEE9C9'
const RED = '#A33417',
  ACCENT = '#42623C'
const WRAP = {
  maxWidth: '1120px',
  margin: '0 auto',
} as const

function DemoSkeleton({ label }: { label: string }) {
  return (
    <div
      style={{
        background: BG2,
        height: '340px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span style={{ color: T3, fontSize: '14px' }}>{label}</span>
    </div>
  )
}

function SectionHead({ title }: { title: string }) {
  return null
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="ds-title"
      style={{ fontSize: 'clamp(28px, 3.8vw, 48px)', marginBottom: '24px', maxWidth: '900px' }}
    >
      {children}
    </h2>
  )
}

function P({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <p
      style={{
        color: T2,
        fontSize: '16px',
        lineHeight: 1.7,
        marginBottom: '18px',
        maxWidth: wide ? '780px' : '660px',
      }}
    >
      {children}
    </p>
  )
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div
      style={{ borderTop: `1px solid ${BORDER}`, padding: '16px 0', display: 'flex', gap: '18px' }}
    >
      <span style={{ color: T1, fontSize: '15px', fontWeight: 700, minWidth: '22px' }}>{n}.</span>
      <div>
        <p style={{ color: T1, fontSize: '15px', fontWeight: 700, marginBottom: '5px' }}>{title}</p>
        <p style={{ color: T2, fontSize: '14px', lineHeight: 1.65, maxWidth: '620px' }}>{body}</p>
      </div>
    </div>
  )
}

function Stat({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div style={{ borderTop: `1px solid rgba(20,20,19,0.15)`, paddingTop: '10px' }}>
      <p
        style={{
          color: T1,
          fontSize: 'clamp(22px, 3vw, 30px)',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          lineHeight: 1,
        }}
      >
        {v}
      </p>
      <p style={{ color: T2, fontSize: '14px', fontWeight: 600, marginTop: '7px' }}>{k}</p>
      {sub && (
        <p style={{ color: T3, fontSize: '11.5px', lineHeight: 1.5, marginTop: '5px' }}>{sub}</p>
      )}
    </div>
  )
}

export default function Engineering() {
  const router = useRouter()

  return (
    <div className="ds-chapters" style={{ background: '#B3DDAC', minHeight: '100dvh' }}>
      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <SiteHeader />

      {/* top */}
      <section className="ds-ch">
        <div style={WRAP}>
          <p style={{ color: T2, fontSize: '15px', fontWeight: 600, marginBottom: '18px' }}>
            How we built it
          </p>
          <h1
            className="ds-display"
            style={{
              color: T1,
              fontSize: 'clamp(40px, 6vw, 80px)',
              fontWeight: 800,
              lineHeight: 1.02,
              letterSpacing: '-0.03em',
              marginBottom: '28px',
              maxWidth: '900px',
            }}
          >
            We built the important parts ourselves.
          </h1>

          <P wide>
            A lot of health apps send everything to another company&apos;s server and wait for an
            answer. That breaks when there is no signal, and nobody can explain why the app said
            what it said.
          </P>
          <P wide>
            So the parts that matter most in an emergency are ours. They work out what is wrong, how
            serious it is, which hospital to go to, and the directions to get there. They run on the
            phone and they work without internet. Two of them are running on this page right now, so
            you can try them.
          </P>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '24px',
              margin: '44px 0 0',
            }}
          >
            <Stat k="to decide what's wrong" v="0.2 ms" sub="on the phone, no internet" />
            <Stat k="to score the vitals" v="0.015 ms" sub="same answer every time" />
            <Stat k="size of both models" v="153 KB" sub="built into the app" />
            <Stat k="cost per use" v="$0" sub="nothing to pay for" />
          </div>
        </div>
      </section>

      {/* triage */}
      <section className="ds-ch">
        <div style={WRAP}>
          <SectionHead title="Figuring out what's wrong" />
          <H2>It has to work even when there&apos;s no signal.</H2>
          <P>
            Someone who can barely breathe can&apos;t wait for a server, and a basement or a back
            road may not have signal at all. So the phone reads what you typed or said and decides
            on its own, almost instantly. It only asks the online AI for help when it isn&apos;t
            sure.
          </P>

          <div style={{ margin: '34px 0 46px' }}>
            <TriageDemo />
          </div>

          
          <P>
            There are two small models and we average their answers. The first one counts which
            words and word pairs show up. It is simple on purpose, because you can see exactly which
            words made it decide, like the list above. The second is a small neural network that
            also looks at pieces of words, so a typo or an unusual spelling still works. We trained
            both ourselves in Python.
          </P>

          <div style={{ marginBottom: '40px' }}>
            <Step
              n="1"
              title="We wrote the examples ourselves"
              body="576 sentences written the way people actually talk when they're scared, in English, Spanish, Hindi and Marathi. 'chest is paining', 'he won't wake up', 'me falta el aire'. Not doctor words."
            />
            <Step
              n="2"
              title="We taught it what 'no' means"
              body="'No chest pain but I can't breathe' should not count as chest pain. Words that come right after 'no' or 'not' are marked so the model knows they were ruled out."
            />
            <Step
              n="3"
              title="We trained it and cut the junk"
              body="After training, words that barely mattered were removed. The neural network was adjusted so that when it says it's 90% sure, it's right about 90% of the time. Before that it said 99% sure even when it was wrong."
            />
            <Step
              n="4"
              title="We put the model inside the app"
              body="The trained model is saved as one TypeScript file. Nothing has to download, so it works the very first time you open the app, even if the phone has never been online."
            />
            <Step
              n="5"
              title="We checked both versions match"
              body="A test makes sure the app gives exactly the same answers as the Python version we trained. If they ever drifted apart, the test fails."
            />
          </div>

          <div
            style={{
              border: `1px solid rgba(20,20,19,0.15)`,
              marginBottom: '20px',
              borderRadius: 0,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                borderBottom: `1px solid rgba(20,20,19,0.15)`,
                padding: '11px 16px',
                background: BG2,
              }}
            >
              <span style={{ color: T1, fontSize: '14px', fontWeight: 700 }}>
                Our model vs. a big online AI, on 49 sentences neither had seen
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '460px' }}>
                <thead>
                  <tr>
                    {['', 'Ours, on the phone', 'gpt-oss-20b, online'].map((h, i) => (
                      <th
                        key={h}
                        style={{
                          textAlign: i === 0 ? 'left' : 'right',
                          padding: '11px 16px',
                          borderBottom: `1px solid ${BORDER}`,
                          color: T3,
                          fontSize: '13px',
                          fontWeight: 600,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Right answers, all sentences', '85.7%', '89.8%', 1],
                    ['Right answers when it was sure (76% of sentences)', '100%', '-', 0],
                    ['Time to answer', '0.2 ms', '467 ms', 0],
                    ['Works with no signal', 'yes', 'no', 0],
                    ['Shows why it decided', 'yes', 'no', 0],
                    ['Cost', 'free', 'paid per use', 0],
                  ].map(([k, a, b, llamaWins]) => (
                    <tr key={k as string}>
                      <td
                        style={{
                          padding: '11px 16px',
                          borderBottom: `1px solid ${BORDER}`,
                          color: T1,
                          fontSize: '14px',
                          fontWeight: 600,
                        }}
                      >
                        {k}
                      </td>
                      <td
                        style={{
                          padding: '11px 16px',
                          borderBottom: `1px solid ${BORDER}`,
                          textAlign: 'right',
                          fontSize: '14px',
                          fontWeight: 700,
                          color: llamaWins ? T2 : T1,
                        }}
                      >
                        {a}
                      </td>
                      <td
                        style={{
                          padding: '11px 16px',
                          borderBottom: `1px solid ${BORDER}`,
                          textAlign: 'right',
                          fontSize: '14px',
                          fontWeight: 700,
                          color: llamaWins ? T1 : T3,
                        }}
                      >
                        {b}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div
            style={{
              borderLeft: `3px solid ${RED}`,
              paddingLeft: '18px',
              marginBottom: '44px',
              maxWidth: '720px',
            }}
          >
            <p
              style={{
                color: T1,
                fontSize: '17px',
                fontWeight: 700,
                lineHeight: 1.5,
                marginBottom: '10px',
              }}
            >
              The online AI is a little more accurate on its own. Used together, they do better than
              either.
            </p>
            <p style={{ color: T2, fontSize: '15px', lineHeight: 1.7 }}>
              Every sentence our model got wrong was one where it already said it wasn&apos;t sure.
              So about 3 out of 4 emergencies are decided right on the phone, with no mistakes in
              this test, and the unsure ones go to the online AI. Together they got 93.9% right. If
              there&apos;s no internet, the phone&apos;s best guess is used so nobody gets stuck.
              (The online model changed on 16 August 2026 when Groq retired the old one, so we ran
              the test again.)
            </p>
          </div>

          <div
            style={{ background: BG2, padding: '24px', marginBottom: '20px', borderRadius: 0 }}
          >
            <p style={{ color: T1, fontSize: '15px', fontWeight: 700, marginBottom: '10px' }}>
              What went wrong the first time
            </p>
            <p
              style={{
                color: T2,
                fontSize: '15px',
                lineHeight: 1.7,
                maxWidth: '720px',
                marginBottom: '14px',
              }}
            >
              When we first added more examples, the model got <em>worse</em>: from 86.7% to 78.5%.
              Some important words only appeared once, so if that one sentence ended up in the test
              set, the model had never seen the word.
            </p>
            <p style={{ color: T2, fontSize: '15px', lineHeight: 1.7, maxWidth: '720px' }}>
              Now every important word needs at least three different example sentences, and we test
              five different ways instead of once. We also threw out an early test that said we were
              100% and Groq was 0%. It was wrong: some test sentences had leaked into training, and
              Groq errors were being counted as wrong answers.
            </p>
          </div>
        </div>
      </section>

      {/* risk */}
      <section className="ds-ch">
        <div style={WRAP}>
          <SectionHead title="How serious is it" />
          <H2>A warning is only useful if a doctor can check it.</H2>
          <P>
            This used to be an AI reading your daily check in and guessing. That was a bad idea. If
            you show a doctor &ldquo;the app said I was at risk,&rdquo; they need to see which
            reading caused it, and get the same answer if they run it again. An AI can give two
            different answers to the same question.
          </P>
          <P>
            So now it&apos;s simple math using <strong style={{ color: T1 }}>NEWS2</strong>, the
            warning score hospitals in the UK use to spot patients getting worse. Same vitals in,
            same answer out, every time, and every point shows which reading it came from.
          </P>

          <div style={{ margin: '34px 0 46px' }}>
            <RiskDemo />
          </div>

          
          <P>
            NEWS2 uses the same cutoffs for everyone. That works in a hospital but can miss people
            with long-term illness. If your normal resting pulse is 58 and today it&apos;s 76, NEWS2
            still says zero. So a second part compares you to your own last three weeks: your pulse
            against your usual, a rising pulse, and days you didn&apos;t log, because being too sick
            to log means something too.
          </P>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '22px',
              marginBottom: '38px',
            }}
          >
            <div
              style={{
                border: `1px solid ${BORDER}`,
                padding: '20px',
                borderRadius: 0,
                background: '#fff',
              }}
            >
              <p style={{ color: ACCENT, fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
                Proven
              </p>
              <p style={{ color: T1, fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>
                NEWS2
              </p>
              <p style={{ color: T2, fontSize: '14px', lineHeight: 1.65 }}>
                The cutoffs are copied from the published table and checked by 40 tests, so nobody
                can change them by accident. It follows the official rules, including that one very
                bad reading is enough to raise the alarm.
              </p>
            </div>
            <div
              style={{
                border: `1px solid ${BORDER}`,
                padding: '20px',
                borderRadius: 0,
                background: '#fff',
              }}
            >
              <p style={{ color: T3, fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
                Not proven yet
              </p>
              <p style={{ color: T1, fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>
                Your normal
              </p>
              <p style={{ color: T2, fontSize: '14px', lineHeight: 1.65 }}>
                Marked as unproven everywhere it shows up, and it can never raise a <em>high</em>{' '}
                alert on its own. A test checks this by feeding it every warning sign at once with
                NEWS2 at zero.
              </p>
            </div>
          </div>

          <div
            style={{
              borderLeft: `3px solid ${RED}`,
              padding: '4px 0 4px 18px',
              marginBottom: '20px',
            }}
          >
            <p style={{ color: RED, fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>
              We say this everywhere the score appears
            </p>
            <p style={{ color: T1, fontSize: '16px', lineHeight: 1.7, maxWidth: '740px' }}>
              NEWS2 uses seven readings and the app supports all seven. If one is missing, the score
              says which one. A score with missing readings can only come out too low, never too
              high. So it&apos;s a good reason to get help, but never a reason not to. This is a
              helper, not a diagnosis, and it does not replace a doctor or 911.
            </p>
          </div>
        </div>
      </section>

      {/* hospital */}
      <section className="ds-ch">
        <div style={WRAP}>
          <SectionHead title="Picking a hospital" />
          <H2>The closest hospital isn&apos;t always the right one.</H2>
          <P>
            For a heart attack you need a hospital that can open the blocked artery, not the small
            one down the street that will have to send you somewhere else. So distance matters
            least.
          </P>

          <div
            style={{
              border: `1px solid rgba(20,20,19,0.15)`,
              marginBottom: '26px',
              borderRadius: 0,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                borderBottom: `1px solid rgba(20,20,19,0.15)`,
                padding: '11px 16px',
                background: BG2,
              }}
            >
              <span style={{ color: T1, fontSize: '14px', fontWeight: 700 }}>What it looks at</span>
            </div>
            <div style={{ padding: '4px 16px 14px', background: '#fff' }}>
              {[
                [
                  'Real drive time',
                  'Actual driving time on real roads to every nearby hospital, not just distance.',
                ],
                [
                  'Traffic',
                  'Live traffic when available. If not, it uses typical traffic for that time of day and says "estimated".',
                ],
                [
                  'What they can treat',
                  'A heart unit for heart problems, a stroke unit for strokes, a trauma center for injuries. Hospitals without the right unit move down the list.',
                ],
                [
                  'If they are full',
                  'Partner hospitals can say when their ER is full. Those get pushed down instead of being sent more patients.',
                ],
                [
                  'How recent',
                  'Anything a hospital reported more than four hours ago is ignored, because old information can be wrong.',
                ],
              ].map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    borderTop: `1px solid ${BORDER}`,
                    padding: '14px 0',
                    display: 'flex',
                    gap: '18px',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ color: T1, fontSize: '14px', fontWeight: 700, minWidth: '170px' }}>
                    {k}
                  </span>
                  <span
                    style={{
                      color: T2,
                      fontSize: '14px',
                      lineHeight: 1.6,
                      flex: 1,
                      minWidth: '240px',
                    }}
                  >
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <P>
            When a hospital is connected, its ER screen shows you&apos;re coming before you leave:
            what happened, when you&apos;ll arrive, blood type, allergies and medicines. The app
            only says &ldquo;the ER is expecting you&rdquo; when a real partner hospital confirmed
            it. Anything that is a demo is labeled as a demo.
          </P>
        </div>
      </section>

      {/* navigation */}
      <section className="ds-ch">
        <div style={WRAP}>
          <SectionHead title="Directions" />
          <H2>Sending you to another map app loses everything.</H2>
          <P>
            If the app kicks you out to a different map, your hospital info and arrival time get
            left behind. So directions are built in, with turn by turn steps, a screen that stays on
            while you drive, and a night mode.
          </P>
          <P>
            One bug we caught with our own tests. After the GPS jumped, the app sometimes matched
            you to the wrong part of the route and said you had driven 4.9 km when it was really
            9.7. Now it double checks the whole route when that happens.
          </P>
        </div>
      </section>

      {/* limits */}
      <section className="ds-ch">
        <div style={WRAP}>
          <SectionHead title="What it can't do yet" />
          <H2>Here&apos;s what still needs work.</H2>

          <div style={{ marginBottom: '20px' }}>
            {[
              [
                '576 examples is not a lot',
                'The model gets better with more real examples. Those should come from real users who agree to share, not from us making up more sentences.',
              ],
              [
                'Some topics are thin',
                'There are not many injury examples yet, and telling a stroke apart from someone passing out still needs more data.',
              ],
              [
                'NEWS2 is made for adults',
                'Kids under 16 should use a different score called PEWS. The app warns about this when it knows your age.',
              ],
              [
                'One table needs a doctor to check it',
                'The sources we used did not agree on the temperature cutoffs, so that part is marked for a doctor to confirm.',
              ],
              [
                '"Your normal" is not proven',
                'It is careful and limited, but it has not been tested on real patients yet, and it says so.',
              ],
              [
                'No sitting vs-standing pulse yet',
                'For conditions like POTS, comparing your pulse lying down and standing up matters. We do not collect that yet.',
              ],
              [
                'Few hospitals are connected',
                'Drive time ranking works anywhere. Live "ER is full" updates only work at hospitals that have signed up.',
              ],
            ].map(([k, v]) => (
              <div key={k} style={{ borderTop: `1px solid ${BORDER}`, padding: '16px 0' }}>
                <p style={{ color: T1, fontSize: '15px', fontWeight: 700, marginBottom: '5px' }}>
                  {k}
                </p>
                <p style={{ color: T2, fontSize: '14px', lineHeight: 1.65, maxWidth: '700px' }}>
                  {v}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* end */}
      <section className="ds-ch">
        <div style={WRAP}>
          <div>
            <h2
              style={{
                color: T1,
                fontSize: 'clamp(24px, 3.4vw, 32px)',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                lineHeight: 1.05,
                marginBottom: '20px',
                maxWidth: '820px',
              }}
            >
              Set it up before you need it.
            </h2>
            <p
              style={{
                color: T2,
                fontSize: '16px',
                lineHeight: 1.7,
                maxWidth: '620px',
                marginBottom: '28px',
              }}
            >
              Your profile takes a few minutes, and it&apos;s what makes all of this work when it
              counts.
            </p>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => router.push('/login?signup=1')}
                className="ds-btn ds-btn-ink sh-slant"
              >
                Make your free profile
              </button>
              <button
                onClick={() => router.push('/demo')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: T1,
                  fontWeight: 600,
                  fontSize: '15px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  padding: 0,
                  textDecoration: 'underline',
                }}
              >
                Try the demo
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
