// Athvexa service worker — Phase 1: app-shell caching so the dashboard
// still opens offline. Phase 2 will add an IndexedDB write-queue so
// check-ins made offline sync once the connection returns.

const CACHE = "athvexa-shell-v5";
const SHELL = ["/dashboard/player", "/dashboard/coach", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

function isCacheableGet(request, response) {
  if (request.method !== "GET" || !response.ok) return false;
  if (new URL(request.url).origin !== self.location.origin) return false;
  return true;
}

async function putInCache(request, response) {
  if (!isCacheableGet(request, response)) return;
  const cache = await caches.open(CACHE);
  await cache.put(request, response.clone());
}

async function fromCacheOrOffline(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  return new Response("You're offline.", {
    status: 503,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    await putInCache(request, response);
    return response;
  } catch {
    return fromCacheOrOffline(request);
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    await putInCache(request, response);
    return response;
  } catch {
    return fromCacheOrOffline(request);
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/")) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});
