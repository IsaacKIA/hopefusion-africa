/**
 * HopeFusion Africa — Service Worker (PWA)
 * Offline-first, background sync, push notifications
 * Place this file at the root of your frontend: /sw.js
 */

const CACHE_VERSION   = 'hfa-v1.3';
const STATIC_CACHE    = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE   = `${CACHE_VERSION}-dynamic`;
const API_CACHE       = `${CACHE_VERSION}-api`;

// Files to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/hopefusion-homepage.html',
  '/hopefusion-register.html',
  '/hopefusion-startup-dashboard.html',
  '/hopefusion-investor-dashboard.html',
  '/hopefusion-admin-dashboard.html',
  '/hopefusion-marketplace.html',
  '/hopefusion-ai-matching.html',
  '/hopefusion-grant-platform.html',
  '/hopefusion-elearning.html',
  '/hopefusion-mentor-dashboard.html',
  '/hopefusion-govt-support.html',
  '/terms.html',
  '/privacy.html',
  '/hopefusion-connection-layer.js',
  '/hopefusion-i18n.js',
  '/hopefusion-webrtc-client.js',
  '/manifest.json',
  '/offline.html',
  'https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Sans:wght@300;400;500&family=Space+Grotesk:wght@400;500;600&display=swap',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css',
];


// API routes to cache with network-first strategy
const API_CACHE_ROUTES = [
  '/api/startups',
  '/api/mentors',
  '/api/grants',
  '/api/courses',
  '/api/notifications',
];

/* ── INSTALL ─────────────────────────────────────────────── */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing HopeFusion Africa service worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Pre-caching static assets');
      return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { mode: 'no-cors' })));
    }).then(() => self.skipWaiting())
  );
});

/* ── ACTIVATE ────────────────────────────────────────────── */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating HopeFusion Africa service worker...');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(key => key.startsWith('hfa-') && ![STATIC_CACHE, DYNAMIC_CACHE, API_CACHE].includes(key))
          .map(key => { console.log('[SW] Deleting old cache:', key); return caches.delete(key); })
      )
    ).then(() => self.clients.claim())
  );
});

/* ── FETCH STRATEGY ─────────────────────────────────────── */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and non-http(s) requests
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // API routes — network first, fall back to cache
  if (url.pathname.startsWith('/api/') && API_CACHE_ROUTES.some(r => url.pathname.startsWith(r))) {
    event.respondWith(networkFirstStrategy(request, API_CACHE, 5000));
    return;
  }

  // Navigation requests — cache first, fall back to offline page
  if (request.mode === 'navigate') {
    event.respondWith(navigationStrategy(request));
    return;
  }

  // Static assets — cache first
  event.respondWith(cacheFirstStrategy(request));
});

/* ── STRATEGIES ─────────────────────────────────────────── */

async function cacheFirstStrategy(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return caches.match('/offline.html');
  }
}

async function networkFirstStrategy(request, cacheName, timeout = 3000) {
  const cache = await caches.open(cacheName);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timer);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached || new Response(JSON.stringify({ error: 'Offline — showing cached data', offline: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function navigationStrategy(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || caches.match('/offline.html');
  }
}

/* ── BACKGROUND SYNC ─────────────────────────────────────── */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  switch (event.tag) {
    case 'sync-grant-applications':
      event.waitUntil(syncGrantApplications());
      break;
    case 'sync-messages':
      event.waitUntil(syncMessages());
      break;
    case 'sync-session-notes':
      event.waitUntil(syncSessionNotes());
      break;
  }
});

async function syncGrantApplications() {
  try {
    const db = await openIDB();
    const pending = await getAllFromStore(db, 'pending_grant_apps');
    for (const app of pending) {
      const res = await fetch('/api/grants/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${app.token}` },
        body: JSON.stringify(app.data),
      });
      if (res.ok) await deleteFromStore(db, 'pending_grant_apps', app.id);
    }
    console.log(`[SW] Synced ${pending.length} grant applications`);
  } catch (err) {
    console.error('[SW] Sync failed:', err);
  }
}

async function syncMessages() {
  console.log('[SW] Syncing offline messages...');
}
async function syncSessionNotes() {
  console.log('[SW] Syncing session notes...');
}

/* ── PUSH NOTIFICATIONS ──────────────────────────────────── */
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch { payload = { title: 'HopeFusion Africa', body: event.data.text() }; }

  const title   = payload.title || 'HopeFusion Africa';
  const options = {
    body:    payload.body || 'You have a new notification.',
    icon:    '/icons/icon-192x192.png',
    badge:   '/icons/badge-72x72.png',
    image:   payload.image,
    tag:     payload.tag || 'hfa-notification',
    renotify: true,
    data:    payload.data || {},
    actions: getNotifActions(payload.type),
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

function getNotifActions(type) {
  switch (type) {
    case 'new_match':
      return [{ action: 'view', title: 'View match' }, { action: 'dismiss', title: 'Dismiss' }];
    case 'grant_deadline':
      return [{ action: 'apply', title: 'Apply now' }, { action: 'later', title: 'Remind later' }];
    case 'session_reminder':
      return [{ action: 'join', title: 'Join session' }, { action: 'reschedule', title: 'Reschedule' }];
    case 'message':
      return [{ action: 'reply', title: 'Reply' }, { action: 'dismiss', title: 'Dismiss' }];
    default:
      return [{ action: 'open', title: 'Open app' }];
  }
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { action, data } = event;
  let url = '/';
  switch (action) {
    case 'view':
    case 'apply':
      url = data.url || '/hopefusion-ai-matching.html';
      break;
    case 'join':
      url = data.session_url || '/hopefusion-mentor-dashboard.html';
      break;
    case 'reply':
      url = `/hopefusion-investor-dashboard.html#messages`;
      break;
    default:
      url = data.url || '/';
  }
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      const existing = clients.find(c => c.url === url && 'focus' in c);
      return existing ? existing.focus() : self.clients.openWindow(url);
    })
  );
});

/* ── INDEXED DB HELPERS ──────────────────────────────────── */
function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('hopefusion-offline', 1);
    req.onsuccess  = () => resolve(req.result);
    req.onerror    = () => reject(req.error);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      ['pending_grant_apps', 'pending_messages', 'pending_session_notes'].forEach(store => {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: 'id', autoIncrement: true });
        }
      });
    };
  });
}
function getAllFromStore(db, store) {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}
function deleteFromStore(db, store, id) {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

console.log('[SW] HopeFusion Africa service worker loaded — v1.2');
