// LPGas Booth Guide — Service Worker v5
// HTML is network-first so updates deploy immediately.
// User state lives in localStorage (key: lpgas_v3) — never touched by the cache.

const CACHE_NAME = 'lpgas-guide-v21';
const ASSETS = [
    './index.html', './manifest.json', './icon-192.png', './icon-512.png', './ncm-logo.png',
    './logo-lpgas.png', './logo-golfdom.png', './logo-lm.png', './logo-pmp.png', './logo-pq.png', './logo-ncm.png',
    './Forza-Medium.woff2', './Forza-Bold.woff2', './Forza-Black.woff2',
    './Gotham-Book.woff2', './Gotham-Medium.woff2', './Gotham-Bold.woff2',
    './Camber-Medium.woff2', './Camber-Bold.woff2'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
    const req = event.request;
    if (req.destination === 'document' || req.url.endsWith('.html')) {
        event.respondWith(
            fetch(req).then(res => {
                const clone = res.clone();
                caches.open(CACHE_NAME).then(c => c.put(req, clone));
                return res;
            }).catch(() => caches.match(req))
        );
    } else {
        event.respondWith(
            caches.match(req).then(cached => cached || fetch(req).then(res => {
                const clone = res.clone();
                caches.open(CACHE_NAME).then(c => c.put(req, clone));
                return res;
            }))
        );
    }
});
