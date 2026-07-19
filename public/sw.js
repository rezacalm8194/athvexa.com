// Athvexa service worker — Phase 1: app-shell caching so the dashboard
// still opens offline. Phase 2 will add an IndexedDB write-queue so
// check-ins made offline sync once the connection returns.

const CACHE = "athvexa-shell-v1";
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

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // writes (PATCH/POST) pass through untouched

  // Network-first for API calls, so data is always fresh when online.
  if (request.url.includes("/api/")) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  // Cache-first for the app shell / static assets.
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).catch(() => caches.match("/dashboard/player")))
  );
});
