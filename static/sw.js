// Service Worker para Yogures Alba PWA
const CACHE_NAME = 'yogures-alba-v2';
const ASSETS = [
  '/static/manifest.json',
  '/static/icon-192.png',
  '/static/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// Notificaciones del sistema
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'NUEVO_PEDIDO') {
    self.registration.showNotification(event.data.titulo, {
      body: event.data.cuerpo,
      icon: '/static/icon-192.png',
      badge: '/static/icon-192.png',
      vibrate: [300, 150, 300, 150, 500],
      tag: 'pedido-' + Date.now(),
      renotify: true
    });
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes('/abuela') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/abuela');
      }
    })
  );
});
