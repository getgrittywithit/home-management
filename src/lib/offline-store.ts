// Offline data store using localStorage (simple, works everywhere)
// IndexedDB would be better for large datasets but localStorage is fine for MVP

const STORE_PREFIX = 'familyops_'

export function cacheData(key: string, data: any) {
  try {
    localStorage.setItem(STORE_PREFIX + key, JSON.stringify({ data, timestamp: Date.now() }))
  } catch { /* storage full or unavailable */ }
}

export function getCachedData(key: string, maxAgeMs = 3600000): any | null {
  try {
    const raw = localStorage.getItem(STORE_PREFIX + key)
    if (!raw) return null
    const { data, timestamp } = JSON.parse(raw)
    if (Date.now() - timestamp > maxAgeMs) return null // expired
    return data
  } catch { return null }
}

// Offline action queue
const QUEUE_KEY = STORE_PREFIX + 'action_queue'

interface QueuedAction {
  id: string
  url: string
  method: string
  body: any
  timestamp: number
}

export function queueAction(url: string, method: string, body: any) {
  try {
    const queue = getQueue()
    queue.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, url, method, body, timestamp: Date.now() })
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  } catch { /* queue failed */ }
}

export function getQueue(): QueuedAction[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function clearQueue() {
  localStorage.removeItem(QUEUE_KEY)
}

export async function drainQueue(): Promise<{ synced: number; failed: number }> {
  const queue = getQueue()
  if (queue.length === 0) return { synced: 0, failed: 0 }

  let synced = 0
  let failed = 0
  const remaining: QueuedAction[] = []

  for (const action of queue) {
    try {
      const res = await fetch(action.url, {
        method: action.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.body),
      })
      if (res.ok) { synced++ } else { remaining.push(action); failed++ }
    } catch { remaining.push(action); failed++ }
  }

  if (remaining.length > 0) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining))
  } else {
    clearQueue()
  }

  return { synced, failed }
}

// Online status detection
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

// Fetch with offline fallback — tries network first, falls back to cache
export async function fetchWithCache(url: string, cacheKey: string, maxAgeMs = 3600000): Promise<any> {
  if (isOnline()) {
    try {
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        cacheData(cacheKey, data)
        return data
      }
    } catch { /* network failed, try cache */ }
  }
  return getCachedData(cacheKey, maxAgeMs)
}
