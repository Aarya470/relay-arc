import { ImageResponse } from 'next/og'

// The link preview card.
//
// WHAT WAS WRONG WITH THE OLD ONE
// It was a black card with "When every minute is the margin." in 86px type, and
// it read as generated rather than made. Three specific reasons, all fixed here:
//
//  1. It did not look like the site. The site is green. The card was black, so
//     anyone who clicked through landed somewhere that looked unrelated.
//  2. The headline was a slogan rather than a fact. "When every minute is the
//     margin" says nothing a reader can check or act on.
//  3. It printed relay-arc.vercel.app, because openGraph.url was hardcoded to
//     the deploy subdomain. Sharing the site advertised the wrong address.
//
// The copy here is plain on purpose: what it is, what it costs, what it needs.
export const alt = 'Relay Arc, a free emergency app for heart and dysautonomia conditions'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const PAGE = '#57945C'
const PANEL = '#EDF4EC'
const INK = '#141413'
const ORANGE = '#D97757'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', background: PAGE, padding: '68px 72px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '54px', height: '54px', background: ORANGE, display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: INK,
            fontSize: '26px', fontWeight: 800, letterSpacing: '-1px',
          }}>
            RA
          </div>
          <div style={{ color: '#FFFFFF', fontSize: '34px', fontWeight: 800, letterSpacing: '-1px', display: 'flex' }}>
            Relay Arc
          </div>
        </div>

        {/* White on this green is 3.62:1, which clears the 3:1 bar for large
            text. Nothing small sits directly on the page, same rule as the site. */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ color: '#FFFFFF', fontSize: '68px', fontWeight: 800, letterSpacing: '-3px', lineHeight: 1.05, display: 'flex' }}>
            The closest hospital is not
          </div>
          <div style={{ color: '#FFFFFF', fontSize: '68px', fontWeight: 800, letterSpacing: '-3px', lineHeight: 1.05, display: 'flex' }}>
            always the right one.
          </div>

          <div style={{
            display: 'flex', background: PANEL, padding: '20px 24px', marginTop: '30px',
            color: INK, fontSize: '27px', lineHeight: 1.4, maxWidth: '860px',
          }}>
            Free. It works out what is happening, finds a hospital that can treat it,
            and sends your medical details ahead.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ color: '#FFFFFF', fontSize: '25px', fontWeight: 700, display: 'flex' }}>
            relay-arc.org
          </div>
          <div style={{ color: '#FFFFFF', fontSize: '25px', display: 'flex' }}>
            No account needed for the emergency card
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
