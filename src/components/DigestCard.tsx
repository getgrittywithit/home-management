'use client'

import { useState, useEffect } from 'react'
import { Newspaper, TrendingUp, AlertTriangle } from 'lucide-react'

export default function DigestCard() {
  const [digest, setDigest] = useState<any>(null)

  useEffect(() => {
    fetch('/api/digest?action=get_latest')
      .then(r => r.json())
      .then(d => setDigest(d.digest || d))
      .catch(() => {})
  }, [])

  if (!digest?.summary) return null

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 mb-3">
        <Newspaper className="w-4 h-4 text-purple-500" /> Weekly Summary
      </h3>
      <p className="text-sm text-gray-700 mb-2">{digest.summary}</p>
      {digest.wins?.length > 0 && (
        <div className="space-y-1 mb-2">
          {digest.wins.map((w: string, i: number) => (
            <p key={i} className="text-xs text-green-700 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> {w}
            </p>
          ))}
        </div>
      )}
      {digest.concerns?.length > 0 && (
        <div className="space-y-1">
          {digest.concerns.map((c: string, i: number) => (
            <p key={i} className="text-xs text-amber-700 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {c}
            </p>
          ))}
        </div>
      )}
      {digest.week_start && (
        <p className="text-xs text-gray-400 mt-2">
          Week of {new Date(digest.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </p>
      )}
    </div>
  )
}
