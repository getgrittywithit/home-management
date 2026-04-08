'use client'

import { useState, useEffect } from 'react'
import { WifiOff, RefreshCw, Check } from 'lucide-react'
import { drainQueue, getQueue } from '@/lib/offline-store'

export default function OfflineBanner() {
  const [online, setOnline] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ synced: number; failed: number } | null>(null)
  const [queueSize, setQueueSize] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateStatus = () => {
      setOnline(navigator.onLine)
      setQueueSize(getQueue().length)
    }

    updateStatus()
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', updateStatus)
    const interval = setInterval(() => setQueueSize(getQueue().length), 5000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', updateStatus)
      clearInterval(interval)
    }
  }, [])

  const handleOnline = async () => {
    setOnline(true)
    const queue = getQueue()
    if (queue.length > 0) {
      setSyncing(true)
      const result = await drainQueue()
      setSyncResult(result)
      setSyncing(false)
      setQueueSize(getQueue().length)
      setTimeout(() => setSyncResult(null), 3000)
    }
  }

  if (online && !syncing && !syncResult && queueSize === 0) return null

  return (
    <div className={`fixed top-0 left-0 right-0 z-[9998] text-center text-xs py-1.5 px-4 ${
      !online ? 'bg-amber-500 text-white' :
      syncing ? 'bg-blue-500 text-white' :
      syncResult ? 'bg-green-500 text-white' :
      'bg-amber-100 text-amber-800'
    }`}>
      {!online && (
        <span className="flex items-center justify-center gap-1.5">
          <WifiOff className="w-3.5 h-3.5" />
          Offline — changes will sync when WiFi returns
          {queueSize > 0 && <span className="bg-white/20 rounded-full px-2 py-0.5 ml-1">{queueSize} queued</span>}
        </span>
      )}
      {online && syncing && (
        <span className="flex items-center justify-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Syncing {queueSize} changes...
        </span>
      )}
      {online && syncResult && (
        <span className="flex items-center justify-center gap-1.5">
          <Check className="w-3.5 h-3.5" /> Synced! {syncResult.synced} changes saved.
          {syncResult.failed > 0 && ` (${syncResult.failed} failed)`}
        </span>
      )}
    </div>
  )
}
