'use client'

import { useState, useEffect } from 'react'
import { Trophy, Star } from 'lucide-react'

interface LeaderboardEntry {
  kid_name: string
  weekly_points: number
}

const KID_DISPLAY: Record<string, string> = {
  amos: 'Amos', ellie: 'Ellie', wyatt: 'Wyatt', hannah: 'Hannah', zoey: 'Zoey', kaylee: 'Kaylee',
}

const MEDALS = ['🥇', '🥈', '🥉']

export default function LeaderboardCard({ currentKid }: { currentKid?: string } = {}) {
  const [board, setBoard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/rewards?action=get_weekly_leaderboard')
      .then(r => r.ok ? r.json() : { leaderboard: [] })
      .then(data => { setBoard(data.leaderboard || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading || board.length === 0) return null

  return (
    <div className="bg-white border rounded-xl p-5">
      <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
        <Trophy className="w-5 h-5 text-amber-500" /> Weekly Leaderboard
      </h3>
      <div className="space-y-2">
        {board.map((entry, i) => (
          <div key={entry.kid_name} className={`flex items-center gap-3 p-2 rounded-lg ${
            currentKid && entry.kid_name === currentKid.toLowerCase() ? 'bg-yellow-50 border-l-2 border-yellow-400' : i === 0 ? 'bg-amber-50' : ''
          }`}>
            <span className="text-lg w-6 text-center">{MEDALS[i] || `${i + 1}.`}</span>
            <span className="font-medium text-gray-900 flex-1 capitalize">
              {KID_DISPLAY[entry.kid_name] || entry.kid_name}
            </span>
            <span className="text-sm font-semibold text-amber-600 flex items-center gap-1">
              {entry.weekly_points} <Star className="w-3.5 h-3.5" />
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
