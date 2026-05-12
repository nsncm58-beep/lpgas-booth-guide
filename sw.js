// LPGas Booth Guide — Service Worker v4
// HTML is network-first so updates deploy immediately without bumping this file.

const CACHE_NAME = 'lpgas-guide-v4';
const ASSETS = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png'];

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

self.addEventListener('fetch', event => {
    const req = event.request;
    // Network-first for HTML — ensures new pushes are picked up immediately
    if (req.destination === 'document' || req.url.endsWith('.html')) {
        event.respondWith(
            fetch(req).then(res => {
                const clone = res.clone();
                caches.open(CACHE_NAME).then(c => c.put(req, clone));
                return res;
            }).catch(() => caches.match(req))
        );
    } else {
        // Cache-first for fonts, icons, manifest
        event.respondWith(
            caches.match(req).then(cached => cached || fetch(req).then(res => {
                const clone = res.clone();
                caches.open(CACHE_NAME).then(c => c.put(req, clone));
                return res;
            }))
        );
    }
});
