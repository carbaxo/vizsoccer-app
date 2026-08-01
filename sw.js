/* Service worker: deja la app usable sin conexión (campo sin cobertura). */
const VERSION = 'v4';
const SHELL_CACHE = `shell-${VERSION}`;
const MEDIA_CACHE = `media-${VERSION}`;
const SHELL = [
  './',
  './index.html',
  './planes.html',
  './ui.css',
  './ui.js',
  './data.js',
  './ejercicios.json',
  './planes_entrenamiento.json',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL_CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => ![SHELL_CACHE, MEDIA_CACHE].includes(key)).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
  const isMedia = /\.(webp|gif|svg|png)$/.test(new URL(request.url).pathname);
  if (isMedia) {
    // Los GIF no cambian: primero caché, y si no está, red + guardado.
    event.respondWith(
      caches.open(MEDIA_CACHE).then(cache => cache.match(request).then(hit => hit || fetch(request).then(response => {
        if (response.ok) cache.put(request, response.clone());
        return response;
      })))
    );
    return;
  }
  // Shell y datos: red primero (para recibir actualizaciones) con respaldo en caché.
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true }))
  );
});
