self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', () => self.clients.claim())

const CACHE = 'relay-offline-v1'  // same name: keep what people already cached

// Offline emergency kit: same-origin GETs are cached as you browse, so the
// SOS screen, medical profile and dashboard keep working with zero signal.
// Cross-origin requests (map tiles, routing) are never mediated — SW fetches
// are governed by the SW's connect-src CSP and silently broke them before.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return
  if (event.request.method !== 'GET') return

  // API responses are never cached and never replayed.
  //
  // The rule below caches every same-origin GET that succeeds and serves it
  // back on the next failure, which is right for a page and wrong for an
  // endpoint. A cached /api/ response comes back with status 200 and no hint
  // of its age, so the app treats a reading from last week as the answer to
  // the question it just asked. On this app that could be a health
  // intelligence summary or a vitals history standing in for current data
  // while the person is offline and cannot tell.
  //
  // A page rendering from cache is a stale page, which is the point of an
  // offline kit. An endpoint answering from cache is a lie about freshness.
  if (url.pathname.startsWith('/api/')) return

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
      // A page is the same shell whatever its query string (?type=…&id=…), so
      // an emergency started offline can still open a routing page cached
      // under a different id. Pages only: never for anything else.
      if (event.request.mode === 'navigate') {
        const shell = await caches.match(event.request, { ignoreSearch: true })
        if (shell) return shell
      }
      // For navigation requests, return a minimal offline page
      if (event.request.mode === 'navigate') {
        // THIS PAGE WAS STILL IN THE OLD PALETTE AND STILL SAID 911.
        //
        // Two things were wrong with it, and both only show up when somebody is
        // offline, which is when nobody is looking.
        //
        // It painted #F4F5F7 grey and #D91414 red with a star mark, the scheme
        // the app used before the green rebrand. So the one screen a person
        // sees when their signal drops looked like a different application.
        //
        // Worse, it hardcoded "always call 911 directly". Every other surface
        // resolves the number from the timezone, because this project is
        // India-first and 911 is not the number there. The offline screen was
        // telling somebody in Pune or Berlin to dial a number that does not
        // answer, at the exact moment the app had nothing else to offer them.
        // Inlined here rather than imported because a service worker cannot
        // reach lib/. Keep it in step with lib/emergency-number.ts.
        const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || '' } catch { return '' } })()
        const emg =
          (tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta') ? '108'
          : tz.startsWith('America/')   ? '911'
          : tz.startsWith('Europe/')    ? '112'
          : tz.startsWith('Australia/') ? '000'
          : '112'
        return new Response(
          `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline · Relay Arc</title></head>
<body style="background:#B3DDAC;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;text-align:center">
<a href="tel:${emg}" style="display:flex;align-items:center;justify-content:center;gap:10px;background:#A33417;color:#FFFFFF;font-weight:900;font-size:20px;letter-spacing:-0.3px;text-decoration:none;padding:20px 28px;border-radius:14px;min-height:64px;width:100%;max-width:320px;margin-bottom:28px">Call ${emg} now</a>
<h2 style="color:#141413;font-size:22px;font-weight:800;letter-spacing:-0.6px;margin:0 0 8px">You are offline</h2>
<p style="color:#5C5A52;font-size:14px;margin:0 0 24px;line-height:1.6;max-width:280px">Check your connection, then try again. Your emergency card and medical profile still work without signal.</p>
<a href="/card" style="display:block;background:#141413;color:#FFFFFF;font-weight:700;font-size:15px;text-decoration:none;padding:15px 28px;border-radius:14px;min-height:48px;width:100%;max-width:320px;margin-bottom:12px">Open my emergency card</a>
<button onclick="location.reload()" style="background:#FFFFFF;color:#141413;font-weight:700;font-size:14px;padding:14px 28px;border-radius:14px;border:1px solid #98C890;cursor:pointer;font-family:inherit;min-height:48px">Try again</button>
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
