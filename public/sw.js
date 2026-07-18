self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', () => self.clients.claim())

const CACHE = 'relay-offline-v1'

// Offline emergency kit: same-origin GETs are cached as you browse, so the
// SOS screen, medical profile and dashboard keep working with zero signal.
// Cross-origin requests (map tiles, routing) are never mediated — SW fetches
// are governed by the SW's connect-src CSP and silently broke them before.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return
  if (event.request.method !== 'GET') return

  // Immutable build assets: cache-first
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icon')) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(event.request)
        if (hit) return hit
        const res = await fetch(event.request)
        if (res.ok) cache.put(event.request, res.clone())
        return res
      })
    )
    return
  }

  // Everything else same-origin: network-first, cache fallback, offline page last
  event.respondWith(
    fetch(event.request).then((res) => {
      if (res.ok) {
        const copy = res.clone()
        caches.open(CACHE).then((cache) => cache.put(event.request, copy))
      }
      return res
    }).catch(async () => {
      const hit = await caches.match(event.request)
      if (hit) return hit
      // For navigation requests, return a minimal offline page
      if (event.request.mode === 'navigate') {
        return new Response(
          `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline · Relay Arc</title></head>
<body style="background:#F4F5F7;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px;font-family:-apple-system,sans-serif;text-align:center">
<div style="width:64px;height:64px;border-radius:20px;background:#D91414;display:flex;align-items:center;justify-content:center;margin-bottom:20px;">
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2L15 9H21L16 13.5L18 21L12 17L6 21L8 13.5L3 9H9L12 2Z" fill="#FFFFFF"/></svg>
</div>
<h2 style="color:#0E1218;font-size:22px;font-weight:900;letter-spacing:-0.8px;margin:0 0 8px">You're offline</h2>
<p style="color:#5B6371;font-size:14px;margin:0 0 24px;line-height:1.6;max-width:260px">Check your connection, then try again.</p>
<button onclick="location.reload()" style="background:#D91414;color:white;font-weight:700;font-size:14px;padding:14px 28px;border-radius:14px;border:none;cursor:pointer;">Try again</button>
<p style="margin-top:16px;color:#9AA2AD;font-size:12px">In an emergency, always call 911 directly</p>
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
