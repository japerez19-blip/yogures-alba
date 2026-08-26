// Service Worker para Yogures Alba PWA
const CACHE_NAME = 'yogures-alba-v3';
const ASSETS = [
  '/static/manifest.json',
  '/static/icon-192.png',
  '/static/icon-512.png',
  '/static/campana.wav'
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

// Notificaciones del sistema (estilo WhatsApp / Red Social)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'NOTIFICACION') {
    self.registration.showNotification(event.data.titulo, {
      body: event.data.cuerpo,
      icon: '/static/icon-192.png',
      badge: '/static/icon-192.png',
      vibrate: [500, 150, 500, 150, 500],
      requireInteraction: true,
      tag: event.data.tag || ('notif-' + Date.now()),
      renotify: true,
      data: { url: '/abuela' }
    });
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
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
