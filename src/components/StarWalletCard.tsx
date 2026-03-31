'use client'

import { useState, useEffect } from 'react'
import { Star, Flame } from 'lucide-react'

interface StarWalletCardProps {
  childName: string
  onNavigateRewards?: () => void
  onNavigatePet?: () => void
}

export default function StarWalletCard({ childName, onNavigateRewards, onNavigatePet }: StarWalletCardProps) {
  const kidKey = childName.toLowerCase()
  const [data, setData] = useState<{
    balance: number
    available: number
    held: number
    streak_days: number
    today_earned: number
  } | null>(null)
  const [goal, setGoal] = useState<{
    goal_name: string
    target_stars: number
    progress_pct: number
    current_balance: number
  } | null>(null)

  useEffect(() => {
    if (!kidKey) return
    fetch(`/api/stars?action=get_balance&kid_name=${kidKey}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})

    fetch(`/api/stars?action=get_savings_goals&kid_name=${kidKey}`)
      .then(r => r.json())
      .then(d => {
        if (d.goals && d.goals.length > 0) setGoal(d.goals[0])
      })
      .catch(() => {})
  }, [kidKey])

  if (!data) return null

  return (
    <div className="bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-400 rounded-lg shadow-sm p-5 text-white">
      {/* Balance */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Star className="w-8 h-8 fill-white/80" />
          <span className="text-4xl font-black">{data.available}</span>
          <span className="text-amber-100 text-sm font-medium mt-1">stars</span>
        </div>
        {data.streak_days > 0 && (
          <div className="flex items-center gap-1 bg-white/20 rounded-full px-2.5 py-1">
            <Flame className="w-4 h-4 text-orange-200" />
            <span className="text-sm font-bold">{data.streak_days}d</span>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="flex gap-2 mb-3">
        {onNavigatePet && (
          <button
            onClick={onNavigatePet}
            className="flex-1 bg-white/20 hover:bg-white/30 rounded-lg py-2 text-sm font-semibold transition-colors text-center"
          >
            <span className="mr-1">🐾</span> Pet Shop
          </button>
        )}
        {onNavigateRewards && (
          <button
            onClick={onNavigateRewards}
            className="flex-1 bg-white/20 hover:bg-white/30 rounded-lg py-2 text-sm font-semibold transition-colors text-center"
          >
            <span className="mr-1">🎁</span> Rewards Store
          </button>
        )}
      </div>

      {/* Savings goal */}
      {goal && (
        <div className="bg-white/20 rounded-lg p-3">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="font-medium truncate">{goal.goal_name}</span>
            <span className="text-amber-100 flex-shrink-0 ml-2">{goal.current_balance}/{goal.target_stars}</span>
          </div>
          <div className="w-full bg-white/30 rounded-full h-2">
            <div
              className="bg-white h-2 rounded-full transition-all"
              style={{ width: `${goal.progress_pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Today earned */}
      {data.today_earned > 0 && (
        <p className="text-xs text-amber-100 mt-2 text-center">
          +{data.today_earned} stars earned today
        </p>
      )}
    </div>
  )
}
