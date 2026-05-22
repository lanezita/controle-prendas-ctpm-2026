const CACHE_NAME = 'prendas-2026-v2';
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
      console.log('[Service Worker] Caching static shells for prendas-2026-v2');
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

// To handle skipWaiting messaging from front-end
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch Interceptor: Smart caching strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // CRITICAL RULE: NEVER cache Supabase API calls, Authentication, RPC, REST or Edge Functions
  const isSupabase = url.hostname.includes('supabase.co') || url.pathname.includes('supabase');
  const isDynamicEnd = url.pathname.startsWith('/api') || url.pathname.includes('/functions/') || url.pathname.includes('/auth/');
  const isVercelSystem = url.pathname.includes('/_vercel/') || url.pathname.startsWith('/_');
  
  if (isSupabase || isDynamicEnd || isVercelSystem) {
    return; // Pass through to the real live network
  }

  // Non-GET requests (e.g., POST launches, audits) should NEVER be cached or intercepted by cache
  if (event.request.method !== 'GET') {
    return;
  }

  // Ensure dynamic/live endpoints or queries like dev tools/login auth are bypassed
  if (url.searchParams.has('code') || url.searchParams.has('token') || url.pathname.includes('/login')) {
    return;
  }

  // Handle static local assets with Network-First fallback to Cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If it's a valid local asset response, cache it dynamically
        // Only cache basic responses (no cors/opaque responses, and avoid caching dynamic/JSON data or anything not static)
        const isStaticAsset = 
          url.pathname === '/' || 
          url.pathname.endsWith('.html') || 
          url.pathname.endsWith('.js') || 
          url.pathname.endsWith('.css') || 
          url.pathname.endsWith('.svg') || 
          url.pathname.endsWith('.webmanifest') || 
          url.pathname.endsWith('.png') || 
          url.pathname.includes('/assets/');

        if (response && response.status === 200 && response.type === 'basic' && isStaticAsset) {
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
          if (event.request.mode === 'navigate' || url.pathname === '/' || !url.pathname.includes('.')) {
            return caches.match('/');
          }
        });
      })
  );
});
