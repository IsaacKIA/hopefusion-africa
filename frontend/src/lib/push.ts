/**
 * HopeFusion Africa — Client-Side Push Notification Utility
 * Handles browser permission, Web Push subscription, and FCM token registration.
 */

const PUSH_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

/* ── Convert VAPID Base64 key to Uint8Array ────────────────── */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const output  = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

/* ── Register Service Worker ───────────────────────────────── */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log('[Push] Service Worker registered:', reg.scope);
    return reg;
  } catch (err) {
    console.error('[Push] Service Worker registration failed:', err);
    return null;
  }
}

/* ── Request Notification Permission ──────────────────────── */
export async function requestPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  return Notification.requestPermission();
}

/* ── Subscribe to Push ─────────────────────────────────────── */
export async function subscribeToPush(token: string): Promise<boolean> {
  try {
    const permission = await requestPermission();
    if (permission !== 'granted') {
      console.log('[Push] Notification permission denied');
      return false;
    }

    if (!VAPID_PUBLIC_KEY) {
      console.warn('[Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY not set — Web Push skipped');
      return false;
    }

    const reg = await registerServiceWorker();
    if (!reg) return false;

    // Get or create Web Push subscription
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    const { endpoint, keys } = subscription.toJSON() as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };

    // Save subscription to backend
    const res = await fetch(`${PUSH_API}/api/v1/push/subscribe`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        type:        'webpush',
        endpoint,
        p256dh:      keys.p256dh,
        auth:        keys.auth,
        deviceLabel: `${getBrowserName()} on ${getOSName()}`,
      }),
    });

    if (!res.ok) throw new Error(await res.text());
    console.log('[Push] Web Push subscription saved ✅');
    return true;
  } catch (err) {
    console.error('[Push] Subscribe failed:', err);
    return false;
  }
}

/* ── Unsubscribe from Push ─────────────────────────────────── */
export async function unsubscribeFromPush(token: string): Promise<void> {
  try {
    if (!('serviceWorker' in navigator)) return;

    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      await fetch(`${PUSH_API}/api/v1/push/unsubscribe`, {
        method:  'DELETE',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ endpoint }),
      });
      console.log('[Push] Unsubscribed ✅');
    }
  } catch (err) {
    console.error('[Push] Unsubscribe failed:', err);
  }
}

/* ── Helpers ───────────────────────────────────────────────── */
function getBrowserName(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome'))  return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari'))  return 'Safari';
  if (ua.includes('Edge'))    return 'Edge';
  return 'Browser';
}

function getOSName(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac'))     return 'macOS';
  if (ua.includes('Linux'))   return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Unknown OS';
}
