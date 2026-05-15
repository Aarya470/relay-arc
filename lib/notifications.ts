export async function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
  try {
    await navigator.serviceWorker.register('/sw.js')
  } catch (e) {
    // SW registration failed silently
  }
}

export async function registerPushNotifications(userId: string) {
  await registerServiceWorker()
}

export async function sendPushNotification(userId: string, title: string, body: string) {
  return
}
