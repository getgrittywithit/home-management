// Family Ops Service Worker — Offline Queue & Sync
const CACHE_NAME = 'familyops-v2'
const OFFLINE_URL = '/'
const DB_NAME = 'familyops-offline'
const STORE_NAME = 'pendingActions'

// ============================================================
// INSTALL — cache the offline shell
// ============================================================
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll([OFFLINE_URL])))
  self.skipWaiting()
})

// ============================================================
// ACTIVATE — clean up old caches (NOT IndexedDB — that persists)
// ============================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// ============================================================
// FETCH — handle both reads (GET) and writes (POST/PUT/PATCH/DELETE)
// ============================================================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // --- WRITE REQUESTS (POST/PUT/PATCH/DELETE) ---
  if (event.request.method !== 'GET') {
    // Only intercept API calls, not form submissions or external requests
    if (!url.pathname.startsWith('/api/')) return

    event.respondWith(
      fetch(event.request.clone()).catch(async () => {
        // Network failed — register for background sync
        try {
          if (self.registration.sync) {
            await self.registration.sync.register('sync-offline-actions')
          }
        } catch (e) { /* sync registration failed, client-side will handle it */ }

        // Return a queued response so the client-side handler knows
        return new Response(JSON.stringify({ offline: true, queued: true, sw: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      })
    )
    return
  }

  // --- API GET REQUESTS — network-first with cache fallback ---
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).then(r => {
        if (r.ok) {
          const c = r.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, c))
        }
        return r
      }).catch(() => caches.match(event.request))
    )
    return
  }

  // --- STATIC ASSETS — cache-first for known types, network-first for rest ---
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached
      return fetch(event.request).then(r => {
        if (r.ok && (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.startsWith('/_next/'))) {
          const c = r.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, c))
        }
        return r
      }).catch(() =>
        event.request.mode === 'navigate'
          ? caches.match(OFFLINE_URL)
          : new Response('Offline', { status: 503 })
      )
    })
  )
})

// ============================================================
// BACKGROUND SYNC — replay queued actions when connectivity returns
// ============================================================
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-actions') {
    event.waitUntil(replayOfflineActions())
  }
})

async function replayOfflineActions() {
  let synced = 0
  let failed = 0

  try {
    const db = await openIndexedDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const all = await idbGetAll(store)
    await tx.done

    const pending = all
      .filter(a => a.status === 'pending' || a.status === 'failed')
      .sort((a, b) => a.timestamp - b.timestamp)

    for (const action of pending) {
      if (action.retryCount >= 3) { failed++; continue }

      try {
        // Mark syncing
        const txW = db.transaction(STORE_NAME, 'readwrite')
        await txW.objectStore(STORE_NAME).put({ ...action, status: 'syncing' })
        await txW.done

        const response = await fetch(action.endpoint, {
          method: action.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.body)
        })

        if (response.ok) {
          const txD = db.transaction(STORE_NAME, 'readwrite')
          await txD.objectStore(STORE_NAME).delete(action.id)
          await txD.done
          synced++
        } else {
          const txF = db.transaction(STORE_NAME, 'readwrite')
          await txF.objectStore(STORE_NAME).put({
            ...action,
            status: 'failed',
            retryCount: action.retryCount + 1,
            errorMessage: `HTTP ${response.status}`
          })
          await txF.done
          failed++
        }
      } catch (err) {
        // Still offline — stop replaying
        const txF = db.transaction(STORE_NAME, 'readwrite')
        await txF.objectStore(STORE_NAME).put({ ...action, status: 'pending' })
        await txF.done
        break
      }
    }

    db.close()
  } catch (err) {
    // IndexedDB not available in SW context — client-side will handle
  }

  // Notify all clients
  const clients = await self.clients.matchAll()
  clients.forEach(client => client.postMessage({
    type: 'SYNC_COMPLETE',
    result: { synced, failed }
  }))
}

// ============================================================
// IndexedDB helpers (no idb lib in SW — use raw API with promises)
// ============================================================
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('status', 'status')
        store.createIndex('timestamp', 'timestamp')
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function idbGetAll(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Polyfill for tx.done in raw IDB
Object.defineProperty(IDBTransaction.prototype, 'done', {
  get() {
    if (this._donePromise) return this._donePromise
    this._donePromise = new Promise((resolve, reject) => {
      this.oncomplete = () => resolve()
      this.onerror = () => reject(this.error)
      this.onabort = () => reject(this.error || new DOMException('AbortError'))
    })
    return this._donePromise
  }
})

// ============================================================================
// PUSH NOTIFICATIONS — D73 PUSH-1
// Receives push events from the web-push server, shows a native notification,
// and routes the click back to the app at the target link_tab.
// ============================================================================

self.addEventListener('push', (event) => {
  let payload = { title: 'Family Ops', body: 'You have a new notification', data: {} }
  try {
    if (event.data) payload = event.data.json()
  } catch (err) {
    // non-JSON push payload — fall back to text
    try { payload.body = event.data.text() } catch (_) {}
  }

  const options = {
    body: payload.body,
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    tag: payload.tag || undefined,
    silent: !!payload.silent,
    data: payload.data || {},
    requireInteraction: false,
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Family Ops', options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const linkTab = event.notification.data?.link_tab || null
  const targetUrl = linkTab ? `/dashboard?tab=${encodeURIComponent(linkTab)}` : '/dashboard'

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      // Focus an existing window if one is open
      for (const client of allClients) {
        if ('focus' in client) {
          try {
            await client.focus()
            if ('navigate' in client) {
              try { await client.navigate(targetUrl) } catch (_) {}
            }
            return
          } catch (_) {}
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })()
  )
})
