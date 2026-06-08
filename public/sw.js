self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', () => self.clients.claim())
self.addEventListener('fetch', (event) => event.respondWith(fetch(event.request)))

self.addEventListener('push', function(event) {
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: data.data || {}
    })
  )
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/dashboard'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
      for (var c of list) {
        if (c.url.includes(self.location.origin) && 'focus' in c) {
          c.navigate(url)
          return c.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})
