import { ImageResponse } from 'next/og'

export const alt = 'Relay Arc — cardiac emergency response'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', background: '#141413', padding: '72px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '15px', background: '#A33417', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '30px', fontWeight: 700 }}>
            ♥
          </div>
          <div style={{ color: 'white', fontSize: '34px', fontWeight: 700, letterSpacing: '-1px', display: 'flex' }}>Relay Arc</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ color: 'white', fontSize: '86px', fontWeight: 800, letterSpacing: '-4px', lineHeight: 1.02, display: 'flex' }}>
            When every minute
          </div>
          <div style={{ color: 'white', fontSize: '86px', fontWeight: 800, letterSpacing: '-4px', lineHeight: 1.02, display: 'flex' }}>
            is the margin<span style={{ color: '#A33417' }}>.</span>
          </div>
          <div style={{ color: '#7E7C74', fontSize: '30px', marginTop: '26px', display: 'flex', maxWidth: '900px' }}>
            Cardiac emergency response — the right hospital, your records sent ahead, your family moving.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '3px solid #A33417', paddingTop: '26px' }}>
          <div style={{ color: '#5C5A52', fontSize: '24px', display: 'flex' }}>relay-arc.vercel.app</div>
          <div style={{ color: '#5C5A52', fontSize: '24px', display: 'flex' }}>SOS → hospital briefed in under 60s</div>
        </div>
      </div>
    ),
    { ...size }
  )
}
