'use client'

import { Cloud } from 'lucide-react'

export default function PendingSyncIndicator({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <span className="inline-flex items-center text-amber-500 ml-1" title="Pending sync — will save when online">
      <Cloud className="w-3 h-3 animate-pulse" />
    </span>
  )
}
