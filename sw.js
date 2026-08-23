const CACHE_NAME = '10fit-v3';
const OFFLINE_URL = './index.html';

// How long to wait for the network before falling back to the cached app.
// Gyms have bad reception; a slow connection must not stall the launch.
const NETWORK_TIMEOUT_MS = 3000;
// Local assets the app cannot work without. Cached atomically — if any of these
// fail the install should fail, because a half-cached shell is worse than none.
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './apple-touch-icon.png'
];

// Third-party assets. Cached best-effort: a CDN hiccup, an offline first visit,
// or a blocked host must not stop the service worker from installing.
const OPTIONAL_ASSETS = [
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        await cache.addAll(CORE_ASSETS);
        await Promise.allSettled(
          OPTIONAL_ASSETS.map((url) =>
            cache.add(new Request(url, { mode: 'no-cors' }))
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

function isHtmlRequest(request) {
  return request.mode === 'navigate'
    || request.destination === 'document'
    || (request.headers.get('accept') || '').includes('text/html');
}

function fetchWithTimeout(request, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('network timeout')), ms);
    fetch(request).then(
      (res) => { clearTimeout(timer); resolve(res); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

/* The app itself is fetched network-first.

   Serving HTML cache-first meant a deployed fix never reached an installed
   app: the browser only re-checks sw.js, never index.html, so the first
   cached copy was served forever and the only way out was reinstalling —
   which on iOS takes the user's saved history with it. */
async function cachedApp(cache, request) {
  return (await cache.match(request)) || (await cache.match(OFFLINE_URL));
}

async function htmlNetworkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  // Known offline: go straight to the cache. Waiting on requests that cannot
  // succeed turned an offline launch into a multi-second stall.
  if (self.navigator && self.navigator.onLine === false) {
    const offlineCopy = await cachedApp(cache, request);
    if (offlineCopy) return offlineCopy;
  }

  try {
    const fresh = await fetchWithTimeout(request, NETWORK_TIMEOUT_MS);
    if (fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    return cachedApp(cache, request);
  }
}

// Icons, fonts and libraries are versioned by the cache name, so cache-first
// stays right for them — it keeps launches fast and works offline.
async function assetCacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  // An uncached third-party asset while offline can only fail; failing at once
  // keeps it from holding up the rest of the page.
  if (self.navigator && self.navigator.onLine === false) return Response.error();

  try {
    const res = await fetchWithTimeout(request, NETWORK_TIMEOUT_MS);
    if (res && res.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, res.clone());
    }
    return res;
  } catch (err) {
    return Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    isHtmlRequest(event.request)
      ? htmlNetworkFirst(event.request)
      : assetCacheFirst(event.request)
  );
});
