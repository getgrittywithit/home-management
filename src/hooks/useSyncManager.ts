'use client'

import { useState, useEffect, useCallback } from 'react'
import { drainQueue, getPendingCount } from '@/lib/offline-store'

export function useSyncManager() {
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ synced: number; failed: number } | null>(null)

  const refreshCount = useCallback(async () => {
    try {
      const count = await getPendingCount()
      setPendingCount(count)
    } catch { setPendingCount(0) }
  }, [])

  const syncNow = useCallback(async () => {
    setSyncing(true)
    try {
      const result = await drainQueue()
      setSyncResult(result)
      await refreshCount()
      setTimeout(() => setSyncResult(null), 3000)
    } finally {
      setSyncing(false)
    }
  }, [refreshCount])

  // Poll pending count every 5s + listen for SW sync messages
  useEffect(() => {
    refreshCount()
    const interval = setInterval(refreshCount, 5000)

    // Listen for service worker sync-complete messages
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_COMPLETE') {
        refreshCount()
        setSyncResult(event.data.result || { synced: 0, failed: 0 })
        setTimeout(() => setSyncResult(null), 3000)
      }
    }

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage)
    }

    return () => {
      clearInterval(interval)
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage)
      }
    }
  }, [refreshCount])

  // Auto-sync when coming back online
  useEffect(() => {
    const handleOnline = async () => {
      const count = await getPendingCount()
      if (count > 0) {
        // Try Background Sync first, fall back to client-side drain
        try {
          const reg = await navigator.serviceWorker?.ready
          if (reg && 'sync' in reg) {
            await (reg as any).sync.register('sync-offline-actions')
          } else {
            await syncNow()
          }
        } catch {
          await syncNow()
        }
      }
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [syncNow])

  return { pendingCount, syncing, syncResult, syncNow, refreshCount }
}
