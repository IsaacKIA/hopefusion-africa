/**
 * HopeFusion Africa — Service Worker v4
 * In development: self-unregisters to prevent stale JS cache issues.
 * In production: handles offline caching and push notifications.
 */

const CACHE_NAME = 'hopefusion-cache-v4';
const OFFLINE_URL = '/offline';
const APP_ICON = '/icons/icon-192x192.png';

// Self-unregister in development to prevent stale module errors
if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') {
  self.addEventListener('install', () => {
    self.skipWaiting();
  });
  self.addEventListener('activate', async () => {
    // Delete ALL caches in dev
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    // Unregister this service worker
    await self.registration.unregister();
    // Force all clients to reload with fresh network responses
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    clients.forEach(client => client.navigate(client.url));
  });
  // Do NOT intercept any fetches in dev
  return;
}

const ASSETS_TO_CACHE = [
  OFFLINE_URL,
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/badge-72x72.png',
];

/* ── Installation ─────────────────────────────────────────────── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching offline assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

/* ── Activation ───────────────────────────────────────────────── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting stale cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      )
    )
  );
  self.clients.claim();
});

/* ── Fetch Interception ───────────────────────────────────────── */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) return;

  // Never cache: API calls, JS/TS bundles, Next.js chunks
  if (
    event.request.url.includes('/api/') ||
    event.request.url.includes('/_next/') ||
    event.request.url.includes('/__nextjs') ||
    event.request.url.includes('.js') ||
    event.request.url.includes('.ts')
  ) {
    return;
  }

  // HTML pages: network first, offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Static assets: cache first, network fallback
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() => {});
    })
  );
});

/* ── Push ─────────────────────────────────────────────────────── */
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch { data = { title: 'HopeFusion', body: event.data?.text() || '' }; }

  const title = data.title || 'HopeFusion Africa';
  const options = {
    body: data.body || '',
    icon: data.icon || APP_ICON,
    badge: '/icons/badge-72x72.png',
    tag: data.data?.type || 'general',
    renotify: true,
    data: { url: data.url || '/', type: data.data?.type || 'general', ...data.data },
    actions: getActions(data.data?.type),
    vibrate: [200, 100, 200],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

/* ── Notification Click ───────────────────────────────────────── */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener('notificationclose', () => {});

function getActions(type) {
  switch (type) {
    case 'message': return [{ action: 'reply', title: '💬 Open Chat' }];
    case 'call': return [{ action: 'accept', title: '✅ Open App' }, { action: 'dismiss', title: '❌ Dismiss' }];
    case 'match': return [{ action: 'view', title: '🎯 View Match' }];
    default: return [];
  }
}
