self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', () => self.clients.claim())

// Passthrough fetch with graceful offline fallback.
// IMPORTANT: only mediate same-origin requests. Cross-origin fetches made
// from inside a service worker are governed by the SW's connect-src CSP,
// which silently killed map tiles and routing (empty 503s).
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return
  event.respondWith(
    fetch(event.request).catch(() => {
      // For navigation requests, return a minimal offline page
      if (event.request.mode === 'navigate') {
        return new Response(
          `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline · Relay Arc</title></head>
<body style="background:#F2EFE9;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px;font-family:-apple-system,sans-serif;text-align:center">
<div style="width:64px;height:64px;border-radius:20px;background:linear-gradient(135deg,#5C8B74,#3D6B58);display:flex;align-items:center;justify-content:center;margin-bottom:20px;box-shadow:0 8px 24px rgba(92,139,116,0.25)">
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2L15 9H21L16 13.5L18 21L12 17L6 21L8 13.5L3 9H9L12 2Z" fill="#F2EFE9"/></svg>
</div>
<h2 style="color:#1A2820;font-size:22px;font-weight:900;letter-spacing:-0.8px;margin:0 0 8px">You're offline</h2>
<p style="color:rgba(26,40,32,0.5);font-size:14px;margin:0 0 24px;line-height:1.6;max-width:260px">Check your connection, then try again.</p>
<button onclick="location.reload()" style="background:linear-gradient(135deg,#5C8B74,#3D6B58);color:white;font-weight:700;font-size:14px;padding:14px 28px;border-radius:14px;border:none;cursor:pointer;box-shadow:0 6px 18px rgba(92,139,116,0.25)">Try again</button>
<p style="margin-top:16px;color:rgba(26,40,32,0.3);font-size:12px">In an emergency, always call 911 directly</p>
</body></html>`,
          { headers: { 'Content-Type': 'text/html' } }
        )
      }
      return new Response('', { status: 503 })
    })
  )
})

self.addEventListener('push', (event) => {
  // Guard against empty or non-JSON payloads
  if (!event.data) return

  let data = {}
  try {
    data = event.data.json()
  } catch {
    try {
      data = { title: event.data.text(), body: '' }
    } catch {
      data = { title: 'Relay Arc', body: 'New notification' }
    }
  }

  const title = data.title || 'Relay Arc'
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: data.data || {},
    requireInteraction: data.requireInteraction || false,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/dashboard'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes(self.location.origin) && 'focus' in c) {
          c.navigate(url)
          return c.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})
