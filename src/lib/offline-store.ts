// Offline data store — IndexedDB for action queue, localStorage for read cache
import { openDB, type IDBPDatabase } from 'idb'

// ============================================================
// READ CACHE (localStorage — simple, fast, good enough for GETs)
// ============================================================
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
    if (Date.now() - timestamp > maxAgeMs) return null
    return data
  } catch { return null }
}

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

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

// ============================================================
// ACTION QUEUE (IndexedDB — reliable, survives SW updates)
// ============================================================

const DB_NAME = 'familyops-offline'
const DB_VERSION = 1
const STORE_NAME = 'pendingActions'

export interface PendingAction {
  id: string
  timestamp: number
  endpoint: string
  method: string
  body: any
  kidId?: string
  actionType: string // 'checklist_toggle', 'meal_pick', 'mood_log', 'med_log', etc.
  status: 'pending' | 'syncing' | 'failed' | 'completed'
  retryCount: number
  errorMessage?: string
}

let dbPromise: Promise<IDBPDatabase> | null = null

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
          store.createIndex('status', 'status')
          store.createIndex('timestamp', 'timestamp')
        }
      },
    })
  }
  return dbPromise
}

export async function enqueueAction(action: Omit<PendingAction, 'id' | 'timestamp' | 'status' | 'retryCount'>): Promise<PendingAction> {
  const db = await getDB()
  const pending: PendingAction = {
    ...action,
    id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
    status: 'pending',
    retryCount: 0,
  }
  await db.put(STORE_NAME, pending)
  return pending
}

export async function dequeueAction(id: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORE_NAME, id)
}

export async function getPendingActions(): Promise<PendingAction[]> {
  const db = await getDB()
  const all = await db.getAll(STORE_NAME)
  return all
    .filter((a: PendingAction) => a.status === 'pending' || a.status === 'failed')
    .sort((a: PendingAction, b: PendingAction) => a.timestamp - b.timestamp)
}

export async function getPendingCount(): Promise<number> {
  const db = await getDB()
  const all = await db.getAll(STORE_NAME)
  return all.filter((a: PendingAction) => a.status !== 'completed').length
}

export async function markSyncing(id: string): Promise<void> {
  const db = await getDB()
  const action = await db.get(STORE_NAME, id) as PendingAction | undefined
  if (action) {
    action.status = 'syncing'
    await db.put(STORE_NAME, action)
  }
}

export async function markFailed(id: string, error: string): Promise<void> {
  const db = await getDB()
  const action = await db.get(STORE_NAME, id) as PendingAction | undefined
  if (action) {
    action.status = 'failed'
    action.errorMessage = error
    action.retryCount += 1
    await db.put(STORE_NAME, action)
  }
}

export async function clearCompleted(): Promise<void> {
  const db = await getDB()
  const all = await db.getAll(STORE_NAME) as PendingAction[]
  for (const a of all) {
    if (a.status === 'completed') await db.delete(STORE_NAME, a.id)
  }
}

export async function clearAll(): Promise<void> {
  const db = await getDB()
  await db.clear(STORE_NAME)
}

// Drain queue — replay all pending actions in order
export async function drainQueue(): Promise<{ synced: number; failed: number }> {
  const pending = await getPendingActions()
  if (pending.length === 0) return { synced: 0, failed: 0 }

  let synced = 0
  let failed = 0

  for (const action of pending) {
    if (action.retryCount >= 3) {
      // Max retries reached — leave as failed for manual review
      failed++
      continue
    }

    try {
      await markSyncing(action.id)
      const res = await fetch(action.endpoint, {
        method: action.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.body),
      })
      if (res.ok) {
        await dequeueAction(action.id)
        synced++
      } else {
        await markFailed(action.id, `HTTP ${res.status}`)
        failed++
      }
    } catch (err) {
      // Probably still offline — stop replaying
      await markFailed(action.id, err instanceof Error ? err.message : 'Network error')
      failed++
      break
    }
  }

  return { synced, failed }
}

// === Legacy compatibility (for anything still importing old API) ===
export function queueAction(url: string, method: string, body: any) {
  enqueueAction({ endpoint: url, method, body, actionType: 'legacy' }).catch(() => {})
}

export function getQueue(): { length: number }[] {
  // Sync accessor for backward compat — returns empty, real count via getPendingCount()
  return []
}

export { clearAll as clearQueue }
