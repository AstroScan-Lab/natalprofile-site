/* NatalProfile service worker — offline shell + PWA install. Cache name changes with every asset change.
   Only complete answers (200, same site) are kept: no error pages, no partial (206) answers; at most MAX_PAGES
   visited pages, the oldest go first (the site has ~6000 pages). */
const CACHE = 'np-b52e13c1';
const PRECACHE = ["./", "./404.html", "./manifest.json", "./favicon.png", "./assets/np.css?v=b52e13c1", "./assets/np.js?v=b52e13c1", "./assets/np-fx.js?v=b52e13c1", "./assets/fonts/inter-latin.woff2", "./img/stars.svg"];
const MAX_PAGES = 100;
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
const SHELL = new Set(PRECACHE.map(p => new URL(p, self.registration.scope).href));
function keep(request, response) {
  return caches.open(CACHE).then(c => c.put(request, response).then(() => c.keys()).then(keys => {
    const pages = keys.filter(k => !SHELL.has(k.url) && !/\/assets\//.test(k.url));
    return Promise.all(pages.slice(0, Math.max(0, pages.length - MAX_PAGES)).map(k => c.delete(k)));
  })).catch(() => {});
}
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => {
    if (r.status === 200 && r.type === 'basic') keep(e.request, r.clone());
    return r;
  }).catch(() => caches.match(e.request).then(r => r || caches.match('./404.html'))));
});
