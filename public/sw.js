const CACHE_NAME = 'prendas2026-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/icon.svg',
  '/manifest.webmanifest'
];

// Installation: Cache initial critical static shells
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching static shells');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activation: Clean up old stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Interceptor: Smart caching strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // CRITICAL RULE: NEVER cache Supabase API calls, Authentication, RPC, REST or Edge Functions
  if (url.hostname.includes('supabase.co') || url.pathname.startsWith('/api') || url.pathname.includes('/functions/')) {
    return; // Pass through to the real live network
  }

  // Non-GET requests (e.g., POST launches) should NEVER be cached or intercepted by cache
  if (event.request.method !== 'GET') {
    return;
  }

  // Handle static local assets with Network-First fallback to Cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If it's a valid local asset response, cache it dynamically
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Offline Fallback logic
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If a navigation request fails and has no cache, serve the root SPA page structure
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});
