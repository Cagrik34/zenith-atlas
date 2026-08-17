/**
 * Zenith Atlas – Service Worker (PWA Offline & Cache Engine)
 * Version: 1.0.0
 * Author: Çağrı Giray Keşan
 */

const CACHE_NAME = 'zenith-atlas-cache-v1';

const STATIC_ASSETS = [
    './',
    './index.html',
    './src/css/styles.css',
    './src/js/app.js',
    './src/data/funds_db.js',
    './src/data/markets.js',
    './src/data/prices.js',
    './src/data/news.js',
    './manifest.webmanifest',
    './src/icons/icon-192.png',
    './src/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        }).then(() => {
            return self.skipWaiting();
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME) {
                        return caches.delete(name);
                    }
                })
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', (event) => {
    // Only handle GET requests
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // For WebSocket and real-time live data bypass cache
    if (url.protocol === 'ws:' || url.protocol === 'wss:') return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                // Return cached version immediately, update in background if online
                fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, networkResponse.clone());
                        });
                    }
                }).catch(() => {
                    // Offline - ignore network error
                });
                return cachedResponse;
            }

            // Fallback to network
            return fetch(event.request).then((networkResponse) => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
                return networkResponse;
            }).catch(() => {
                // If offline and request is HTML document, return cached index.html
                if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
