const APP_CACHE = 'shar-app-cache-v1';
const STATIC_CACHE = 'shar-static-cache-v1';
const CORE_ASSETS = ['/', '/offline.html', '/favicon.png', '/apple-touch-icon.png', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key !== APP_CACHE && key !== STATIC_CACHE)
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const networkResponse = await fetch(request);
        const appCache = await caches.open(APP_CACHE);
        appCache.put(request, networkResponse.clone()).catch(() => undefined);
        return networkResponse;
      } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        const fallback = await caches.match('/offline.html');
        return fallback || Response.error();
      }
    })());
    return;
  }

  const isStatic = isSameOrigin && ['script', 'style', 'font', 'image'].includes(request.destination);
  if (!isStatic) return;

  event.respondWith((async () => {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);
    const networkPromise = fetch(request)
      .then((response) => {
        if (response && response.ok) {
          cache.put(request, response.clone()).catch(() => undefined);
        }
        return response;
      })
      .catch(() => undefined);

    if (cached) {
      return cached;
    }

    const fromNetwork = await networkPromise;
    return fromNetwork || Response.error();
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification?.data?.url || '/account';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_) {
    payload = {};
  }

  const title = payload.title || 'Новое уведомление';
  const options = {
    body: payload.body || '',
    icon: '/Group 8.png',
    badge: '/Group 8.png',
    tag: payload.tag || 'generic-notification',
    renotify: payload.renotify ?? true,
    requireInteraction: payload.requireInteraction ?? true,
    silent: payload.silent ?? false,
    timestamp: Date.now(),
    vibrate: payload.vibrate || [250, 120, 250],
    data: {
      url: payload.url || '/account',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});
