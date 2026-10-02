const CACHE_NAME = 'sap-sms-cache-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Service Worker Install - Pre-cache critical application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Pre-caching partial assets failed:', err);
      });
    })
  );
  self.skipWaiting();
});

// Service Worker Activate - Clean up outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Service Worker Fetch - Network-first for API requests, Cache-fallback for static shell
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Do not cache API network calls or non-GET requests
  if (requestUrl.pathname.startsWith('/api') || event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache valid responses for static assets
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Offline fallback to cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If navigation request fails, return cached index.html
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Network offline. Content currently unavailable.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' }),
          });
        });
      })
  );
});

// Push Notification Event Listener
self.addEventListener('push', (event) => {
  const fallback = {
    title: 'SAP-SMS Alert',
    body: 'You have a new academic update.',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: { url: '/dashboard' },
  };
  let payload = {};

  try {
    if (event.data) payload = event.data.json();
  } catch {
    if (event.data) payload = { body: event.data.text() };
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) payload = {};
  const data = {
    title: typeof payload.title === 'string' && payload.title.trim() ? payload.title.slice(0, 120) : fallback.title,
    body: typeof payload.body === 'string' ? payload.body.slice(0, 500) : fallback.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data) ? payload.data : fallback.data,
  };
  const sourceType = ['task', 'event'].includes(data.data.sourceType) ? data.data.sourceType : 'notice';
  const sourceId = typeof data.data.sourceId === 'string' ? data.data.sourceId.slice(0, 100) : 'test';

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: { url: data.data.url, sourceType, sourceId },
    tag: `sap-sms-${sourceType}-${sourceId}`,
    renotify: false,
    actions: [
      { action: 'open', title: 'Open Planner' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options).catch((error) => {
      console.error('Unable to display push notification:', error);
    })
  );
});

// Notification Click Event Listener
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const requestedPath = event.notification.data && event.notification.data.url;
  let targetUrl = '/dashboard';
  try {
    if (typeof requestedPath === 'string' && requestedPath.startsWith('/') && !requestedPath.startsWith('//')) {
      const candidate = new URL(requestedPath, self.location.origin);
      const allowedPath = /^\/(dashboard|tasks|subjects|attendance|timetable|events|settings|profile)?\/?$/.test(candidate.pathname);
      if (candidate.origin === self.location.origin && allowedPath) {
        targetUrl = `${candidate.pathname}${candidate.search}${candidate.hash}`;
      }
    }
  } catch {
    targetUrl = '/dashboard';
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (new URL(client.url).origin === self.location.origin && new URL(client.url).pathname === new URL(targetUrl, self.location.origin).pathname && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
