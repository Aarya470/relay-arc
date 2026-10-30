import { supabase } from '@/lib/supabase'

export async function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
  try {
    await navigator.serviceWorker.register('/sw.js')
  } catch {}
}

export async function registerPushNotifications(userId: string) {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window)
  )
    return

  try {
    // Explicitly request notification permission before trying to subscribe
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return

    const reg = await navigator.serviceWorker.ready

    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY
      if (!vapidKey) {
        console.warn('NEXT_PUBLIC_VAPID_KEY not set. Push notifications disabled')
        return
      }
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) return

    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ subscription: sub, userId }),
    })
  } catch (e) {
    console.error('Push registration failed', e)
  }
}

/**
 * Sends a push and says whether it worked.
 *
 * WHY THE RETURN VALUE MATTERS
 * This used to return void and log its failures to the console. Three callers
 * awaited it and then told somebody the message had been delivered:
 *   - the emergency routing screen, "Your emergency is visible to your care team"
 *   - the care team patient view, "Reminder sent for <medication>"
 *   - the guardian escalation path
 *
 * None of them could tell. /api/push/send returns 404 "No subscription found"
 * whenever the recipient has not granted notification permission and registered
 * a subscription, which for most people has never happened. So the common case
 * was a failed send followed by a confident claim that it had arrived.
 *
 * 'no-subscription' is separated out because it is not a fault. It means the
 * person has no device signed up for push, which is worth saying differently
 * from a network failure or a server error.
 */
export type PushResult = 'sent' | 'no-subscription' | 'failed'

export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
): Promise<PushResult> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) return 'failed'

    const res = await fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId, title, body }),
    })
    if (res.ok) return 'sent'
    if (res.status === 404) return 'no-subscription'
    const err = await res.json().catch(() => ({}))
    console.error('Push notification failed:', res.status, err)
    return 'failed'
  } catch (e) {
    console.error('sendPushNotification error:', e)
    return 'failed'
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}
