'use client'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#FFFFFF', fontFamily: '-apple-system, system-ui, sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px', maxWidth: '420px', margin: '0 auto' }}>
          <p style={{ color: '#5C5A52', fontSize: '11px', fontWeight: 700, letterSpacing: '1.6px', textTransform: 'uppercase', margin: '0 0 10px' }}>
            Relay Arc: critical error
          </p>
          <h1 style={{ color: '#141413', fontSize: '28px', fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.1, margin: '0 0 10px' }}>
            The app failed to start.
          </h1>
          <p style={{ color: '#5C5A52', fontSize: '15px', lineHeight: 1.6, margin: '0 0 26px' }}>
            If this is an emergency, call your local emergency number now. 911 in the US, 108 in India, 112 across Europe.
          </p>
          <a href="tel:112" style={{ display: 'block', textAlign: 'center', background: '#A33417', color: 'white', fontWeight: 800, fontSize: '17px', padding: '18px', borderRadius: '8px', textDecoration: 'none', marginBottom: '10px' }}>
            Call 112
          </a>
          <button onClick={reset} style={{ background: 'none', color: '#141413', fontWeight: 700, fontSize: '15px', padding: '15px', borderRadius: '8px', border: '1.5px solid #141413', cursor: 'pointer', width: '100%' }}>
            Reload the app
          </button>
        </div>
      </body>
    </html>
  )
}
