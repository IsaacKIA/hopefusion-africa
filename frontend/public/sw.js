/**
 * HopeFusion Africa — Service Worker
 * Handles offline caching (PWA offline mode) and background push events.
 */

const CACHE_NAME = 'hopefusion-cache-v1';
const OFFLINE_URL = '/offline';
const APP_ICON = '/icons/icon-192x192.png';

const ASSETS_TO_CACHE = [
  OFFLINE_URL,
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/badge-72x72.png',
];

/* ── Service Worker Installation ─────────────────────────────── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching offline fallback and key assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

/* ── Service Worker Activation ───────────────────────────────── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting stale cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

/* ── Request Interception & Caching ─────────────────────────── */
self.addEventListener('fetch', (event) => {
  // Only handle same-origin GET requests
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip caching API routes or server-side auth redirects
  if (event.request.url.includes('/api/v1/') || event.request.url.includes('/auth/')) {
    return;
  }

  // Handle navigate request (HTML pages) -> Network first, offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        console.log('[SW] Network request failed. Serving offline fallback page');
        return caches.match(OFFLINE_URL);
      })
    );
    return;
  }

  // Handle other static assets -> Cache first, network fallback
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        // Only cache valid standard responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      }).catch(() => {
        // Silent catch for asset fetch failure
      });
    })
  );
});

/* ── Push Event ─────────────────────────────────────────────── */
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'HopeFusion', body: event.data?.text() || '' };
  }

  const title   = data.title || 'HopeFusion Africa';
  const options = {
    body:    data.body  || '',
    icon:    data.icon  || APP_ICON,
    badge:   '/icons/badge-72x72.png',
    tag:     data.data?.type || 'general',
    renotify: true,
    data: {
      url:  data.url  || '/',
      type: data.data?.type || 'general',
      ...data.data,
    },
    actions: getActions(data.data?.type),
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

/* ── Notification Click ─────────────────────────────────────── */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if already open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      // Otherwise open a new tab
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

/* ── Notification Close ─────────────────────────────────────── */
self.addEventListener('notificationclose', () => {
  // Analytics/logging hooks can go here
});

/* ── Helper: Context-Aware Action Buttons ───────────────────── */
function getActions(type) {
  switch (type) {
    case 'message':
      return [{ action: 'reply', title: '💬 Open Chat' }];
    case 'call':
      return [
        { action: 'accept', title: '✅ Open App' },
        { action: 'dismiss', title: '❌ Dismiss' },
      ];
    case 'match':
      return [{ action: 'view', title: '🎯 View Match' }];
    default:
      return [];
  }
}
