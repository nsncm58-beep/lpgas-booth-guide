// NCM Events Guide: Service Worker
// HTML is network-first so updates deploy immediately.
// User state lives in localStorage (legacy key: lpgas_v3, kept so existing
// devices don't lose data) and is never touched by the cache.

const CACHE_NAME = 'ncm-events-guide-v107';
const ASSETS = [
    './index.html', './manifest.json', './icon-192.png', './icon-512.png', './favicon.png', './ncm-logo.png',
    './logo-lpgas.png', './logo-golfdom.png', './logo-lm.png', './logo-pmp.png', './logo-pq.png', './logo-ncm.png',
    './Forza-Medium.woff2', './Forza-Bold.woff2', './Forza-Black.woff2',
    './Gotham-Book.woff2', './Gotham-Medium.woff2', './Gotham-Bold.woff2',
    './Camber-Medium.woff2', './Camber-Bold.woff2',
    './msal-browser.min.js'
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

self.addEventListener('fetch', event => {
    const req = event.request;
    // Only handle GETs, and never touch Firebase/Google API traffic: caching
    // Firestore long-poll responses would grow the cache with one-time URLs
    // for the whole show and risk replaying stale data. (gstatic SDK files
    // and the cdnjs QR lib still cache normally below.)
    if (req.method !== 'GET') return;
    const host = new URL(req.url).hostname;
    if (host.endsWith('googleapis.com') || host.endsWith('firebaseapp.com')) return;
    if (req.destination === 'document' || req.url.endsWith('.html')) {
        // Network-first with a short leash. Show-floor connections often hang
        // rather than fail, so if the network hasn't answered in 3 seconds the
        // cached app opens immediately; the network response (when it finally
        // lands) still refreshes the cache for the next launch. Fully offline,
        // the fetch rejects fast and the cache serves. Only 200s are cached —
        // caching an error page once poisoned every later offline launch.
        event.respondWith((async () => {
            const cache = await caches.open(CACHE_NAME);
            const network = fetch(req, { cache: 'no-cache' }).then(res => {
                if (res && res.ok) cache.put(req, res.clone());
                return res;
            });
            const timedOut = Symbol();
            const winner = await Promise.race([
                network.catch(() => null),
                new Promise(r => setTimeout(() => r(timedOut), 3000))
            ]);
            if (winner && winner !== timedOut && winner.ok) return winner;
            const cached = await cache.match(req);
            if (cached) { network.catch(() => {}); return cached; }
            // Nothing cached yet (first ever visit): give the network its shot.
            return network.then(res => res || cached).catch(() => cached);
        })());
    } else {
        event.respondWith(
            caches.match(req).then(cached => cached || fetch(req).then(res => {
                if (res && res.ok) {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then(c => c.put(req, clone));
                }
                return res;
            }))
        );
    }
});
