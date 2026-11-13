const CACHE_PREFIX = "cloudl-static-";
const CACHE_NAME = `${CACHE_PREFIX}v1`;
const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icons/cloudl-icon-192.png",
  "/icons/cloudl-icon-512.png",
  "/icons/cloudl-maskable-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE_URLS);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames
      .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // APIs include availability and private order/staff data: always use the network, never cache.
  if (url.pathname.startsWith("/api/")) return;

  // Do not cache navigation responses. Online pages stay fresh; offline navigations get only a safe notice.
  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        return await fetch(request);
      } catch {
        return (await caches.match(OFFLINE_URL)) || Response.error();
      }
    })());
    return;
  }

  if (!isPublicStaticAsset(url.pathname) || request.headers.has("authorization")) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;

    try {
      const response = await fetch(request);
      const cacheControl = response.headers.get("Cache-Control") || "";
      if (response.ok && response.type === "basic" && !/no-store/i.test(cacheControl)) {
        await cache.put(request, response.clone());
      }
      return response;
    } catch {
      return cached || Response.error();
    }
  })());
});

function isPublicStaticAsset(pathname) {
  if (pathname.startsWith("/assets/payments/")) return false;
  return pathname.startsWith("/assets/")
    || pathname === "/favicon.svg"
    || pathname === "/icons.svg"
    || pathname === "/manifest.webmanifest"
    || pathname.startsWith("/icons/");
}
