'use client'

import { useState, useEffect } from 'react'
import { Star, Gem } from 'lucide-react'

interface StarBalanceHeaderProps {
  childName: string
}

export default function StarBalanceHeader({ childName }: StarBalanceHeaderProps) {
  const [stars, setStars] = useState<number | null>(null)
  const [gems, setGems] = useState<number | null>(null)
  const kidKey = childName.toLowerCase()

  useEffect(() => {
    if (!kidKey) return
    // Fetch star balance from existing endpoint
    fetch(`/api/kids/points?action=get_balance&child=${kidKey}`)
      .then(r => r.json())
      .then(data => setStars(data.balance?.current_points ?? 0))
      .catch(() => {})
    // Fetch gem balance from economy API
    fetch(`/api/economy?action=get_balances&kid_name=${kidKey}`)
      .then(r => r.json())
      .then(data => setGems(data.balances?.gem_balance ?? 0))
      .catch(() => setGems(0))
  }, [kidKey])

  if (stars === null) return null

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">
        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
        <span className="text-xs font-bold text-amber-700">{stars}</span>
      </div>
      {gems !== null && gems > 0 && (
        <div className="flex items-center gap-1 bg-purple-50 border border-purple-200 rounded-full px-2.5 py-0.5">
          <Gem className="w-3.5 h-3.5 text-purple-500" />
          <span className="text-xs font-bold text-purple-700">{gems}</span>
        </div>
      )}
    </div>
  )
}
