'use client'

import { WifiOff, RefreshCw, Check, CloudOff } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useSyncManager } from '@/hooks/useSyncManager'

export default function OfflineBanner() {
  const online = useOnlineStatus()
  const { pendingCount, syncing, syncResult, syncNow } = useSyncManager()

  // Nothing to show
  if (online && !syncing && !syncResult && pendingCount === 0) return null

  return (
    <div className={`fixed top-0 left-0 right-0 z-[9998] text-center text-xs py-1.5 px-4 transition-colors ${
      !online ? 'bg-amber-500 text-white' :
      syncing ? 'bg-blue-500 text-white' :
      syncResult ? (syncResult.failed > 0 ? 'bg-amber-500 text-white' : 'bg-green-500 text-white') :
      'bg-amber-100 text-amber-800'
    }`}>
      {!online && (
        <span className="flex items-center justify-center gap-1.5">
          <WifiOff className="w-3.5 h-3.5" />
          You&apos;re offline — your changes are being saved locally
          {pendingCount > 0 && (
            <span className="bg-white/20 rounded-full px-2 py-0.5 ml-1">{pendingCount} queued</span>
          )}
        </span>
      )}
      {online && syncing && (
        <span className="flex items-center justify-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Syncing {pendingCount} changes...
        </span>
      )}
      {online && !syncing && syncResult && (
        <span className="flex items-center justify-center gap-1.5">
          <Check className="w-3.5 h-3.5" />
          {syncResult.synced > 0 && `${syncResult.synced} changes synced!`}
          {syncResult.failed > 0 && ` ${syncResult.failed} failed — will retry`}
        </span>
      )}
      {online && !syncing && !syncResult && pendingCount > 0 && (
        <span className="flex items-center justify-center gap-1.5">
          <CloudOff className="w-3.5 h-3.5" />
          {pendingCount} changes pending sync
          <button onClick={syncNow} className="underline ml-1 hover:no-underline">Sync now</button>
        </span>
      )}
    </div>
  )
}
