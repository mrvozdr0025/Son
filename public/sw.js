// neonsform service worker: caching recent topics + offline support + push notifications

const CACHE_VERSION = "neonsform-cache-v1"
const STATIC_CACHE = `${CACHE_VERSION}-static`
const TOPICS_CACHE = `${CACHE_VERSION}-topics`

const STATIC_ASSETS = [
  "/",
  "/offline.html",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/favicon.ico",
]

const MAX_TOPIC_CACHE = 40

// Truncate cache to avoid uncontrolled growth
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  if (keys.length > maxItems) {
    await cache.delete(keys[0])
    await trimCache(cacheName, maxItems)
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[SW] Pre-caching static assets failed:", err)
      })
    })
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (!key.startsWith(CACHE_VERSION)) {
            return caches.delete(key)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

// Fetch strategy:
// 1. Topic pages (/konu/*) & navigation: Network first, cache update, fallback to cache, fallback to offline.html
// 2. Static assets & icons: Cache first, fallback to network
self.addEventListener("fetch", (event) => {
  const request = event.request
  const url = new URL(request.url)

  // Only handle GET requests within same origin
  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return
  }

  // Avoid caching API mutation routes or auth callbacks
  if (url.pathname.startsWith("/api/auth") || url.pathname.startsWith("/api/web-push")) {
    return
  }

  // Topic pages (/konu/*) or HTML documents: Network First with Cache Fallback
  if (request.mode === "navigate" || url.pathname.startsWith("/konu/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone()
            caches.open(TOPICS_CACHE).then((cache) => {
              cache.put(request, clone)
              trimCache(TOPICS_CACHE, MAX_TOPIC_CACHE)
            })
          }
          return response
        })
        .catch(async () => {
          // Try matched cache
          const cached = await caches.match(request)
          if (cached) return cached

          // Fallback to offline.html for navigation
          if (request.mode === "navigate") {
            const offlinePage = await caches.match("/offline.html")
            if (offlinePage) return offlinePage
          }

          return new Response("Çevrimdışısınız ve bu içerik önbellekte bulunamadı.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          })
        })
    )
    return
  }

  // Static assets (CSS, JS, Fonts, Images): Cache First with Network Fallback
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".webp")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone()
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone))
          }
          return response
        })
      })
    )
    return
  }
})

// Web Push notifications
self.addEventListener("push", (event) => {
  if (!event.data) return
  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: "neonsform", body: event.data.text() }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "neonsform", {
      body: payload.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: payload.url || "/bildirimler" },
      tag: payload.tag || "neonsform",
    })
  )
})

// Notification click action
self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification.data?.url || "/"
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    })
  )
})
