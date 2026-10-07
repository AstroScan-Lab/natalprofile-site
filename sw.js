/* NatalProfile service worker — offline shell + PWA install. Cache name changes with every asset change. */
const CACHE = 'np-004deb45';
const PRECACHE = ["./", "./404.html", "./manifest.json", "./favicon.svg", "./assets/np.css?v=004deb45", "./assets/np.js?v=004deb45", "./assets/np-fx.js?v=004deb45", "./assets/fonts/inter-latin.woff2", "./img/stars.svg"];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('./404.html'))));
});
