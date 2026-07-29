\
'use client'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#FFFFFF', fontFamily: '-apple-system, system-ui, sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px', maxWidth: '420px', margin: '0 auto' }}>
          <p style={{ color: '#9AA2AD', fontSize: '11px', fontWeight: 700, letterSpacing: '1.6px', textTransform: 'uppercase', margin: '0 0 10px' }}>
            Relay Arc — critical error
          </p>
          <h1 style={{ color: '#0E1218', fontSize: '28px', fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.1, margin: '0 0 10px' }}>
            The app failed to start.
          </h1>
          <p style={{ color: '#5B6371', fontSize: '15px', lineHeight: 1.6, margin: '0 0 26px' }}>
            If this is an emergency, call your local emergency number now — 911 in the US, 108 in India, 112 across Europe.
          </p>
          <a href="tel:112" style={{ display: 'block', textAlign: 'center', background: '#D91414', color: 'white', fontWeight: 800, fontSize: '17px', padding: '18px', borderRadius: '12px', textDecoration: 'none', marginBottom: '10px' }}>
            Call 112
          </a>
          <button onClick={reset} style={{ background: 'none', color: '#0E1218', fontWeight: 700, fontSize: '15px', padding: '15px', borderRadius: '12px', border: '1.5px solid #0E1218', cursor: 'pointer', width: '100%' }}>
            Reload the app
          </button>
        </div>
      </body>
    </html>
  )
}
