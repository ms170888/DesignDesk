// DesignDesk Service Worker — offline support with cache-first for statics

const CACHE_NAME = 'designdesk-v1';
const APP_SHELL = [
  './app.html',
  './app/styles/app.css',
  './app/main.js',
  './app/store.js',
  './app/router.js',
  './app/seed-data.js',
  './app/core/icons.js',
  './app/core/utils.js',
  './app/core/analytics.js',
  './app/core/keyboard.js',
  './app/components/sidebar.js',
  './app/components/topbar.js',
  './app/components/modal.js',
  './app/components/toast.js',
  './app/views/dashboard.js',
  './app/views/procurement.js',
  './app/views/schedule.js',
  './app/views/invoicing.js',
  './app/views/suppliers.js',
  './app/views/moodboard-editor.js',
  './app/views/floorplan-editor.js',
  './app/views/client-portal.js',
  './app/views/ai-assistant.js',
  './app/views/presentations.js',
  './app/views/settings.js',
  './app/views/onboarding.js',
  './app/views/help.js'
];

// ── Install: precache app shell ─────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Use addAll with a fallback — don't let one missing file break install
        return Promise.allSettled(
          APP_SHELL.map(url => cache.add(url).catch(err => {
            console.warn(`[SW] Failed to cache ${url}:`, err);
          }))
        );
      })
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean old caches ──────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch strategy ──────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin (like Google Fonts — let browser handle)
  if (!request.url.startsWith(self.location.origin)) return;

  // For navigation requests (HTML), try network first, fall back to cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache the latest version
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match('./app.html')))
    );
    return;
  }

  // For static assets (JS, CSS), cache-first strategy
  if (request.url.match(/\.(js|css|svg|png|jpg|jpeg|gif|ico|woff2?)$/)) {
    event.respondWith(
      caches.match(request)
        .then(cached => {
          if (cached) {
            // Return cached, but update in background
            fetch(request).then(response => {
              if (response.ok) {
                caches.open(CACHE_NAME).then(cache => cache.put(request, response));
              }
            }).catch(() => {});
            return cached;
          }
          // Not cached — fetch and cache
          return fetch(request).then(response => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
            }
            return response;
          });
        })
        .catch(() => new Response('', { status: 503, statusText: 'Offline' }))
    );
    return;
  }

  // For everything else, network first with cache fallback
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
