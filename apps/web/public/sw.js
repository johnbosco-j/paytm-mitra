// MITRA service worker: caches the app shell so MITRA opens with no network. API calls are never cached
// (money and demand data must always come from the server, which runs locally in offline setups).
const CACHE = "mitra-shell-v1";
const SHELL = ["/app", "/app/demand", "/login", "/manifest.webmanifest", "/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
  if (e.request.mode === "navigate") {
    // network first for pages, cached shell as fallback
    e.respondWith(fetch(e.request).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request).then((m) => m || caches.match("/app"))));
    return;
  }
  if (url.pathname.startsWith("/_next/static/") || /\.(png|jpg|svg|woff2|glb)$/.test(url.pathname)) {
    e.respondWith(caches.match(e.request).then((m) => m || fetch(e.request).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r; })));
  }
});
