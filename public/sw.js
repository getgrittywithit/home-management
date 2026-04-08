// Family Ops Service Worker — Offline MVP
const CACHE_NAME = 'familyops-v1'
const OFFLINE_URL = '/'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll([OFFLINE_URL])))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))))
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET') return
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).then(r => {
        if (r.ok) { const c = r.clone(); caches.open(CACHE_NAME).then(cache => cache.put(event.request, c)) }
        return r
      }).catch(() => caches.match(event.request))
    )
    return
  }
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached
      return fetch(event.request).then(r => {
        if (r.ok && (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.startsWith('/_next/'))) {
          const c = r.clone(); caches.open(CACHE_NAME).then(cache => cache.put(event.request, c))
        }
        return r
      }).catch(() => event.request.mode === 'navigate' ? caches.match(OFFLINE_URL) : new Response('Offline', { status: 503 }))
    })
  )
})
