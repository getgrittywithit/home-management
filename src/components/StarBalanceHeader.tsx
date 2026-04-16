'use client'

import { useState, useEffect } from 'react'
import { Star, Gem } from 'lucide-react'

interface StarBalanceHeaderProps {
  childName: string
  refreshKey?: number
}

export default function StarBalanceHeader({ childName, refreshKey }: StarBalanceHeaderProps) {
  const [stars, setStars] = useState<number | null>(null)
  const [gems, setGems] = useState<number | null>(null)
  const kidKey = childName.toLowerCase()


  useEffect(() => {
    if (!kidKey) return
    // Short delay to let DB writes settle, then fetch actual balance
    const timer = setTimeout(() => {
      fetch(`/api/economy?action=get_balances&kid_name=${kidKey}`)
        .then(r => r.json())
        .then(data => {
          const b = data.balances || {}
          setStars(b.stars_balance ?? 0)
          setGems(b.gem_balance ?? 0)
        })
        .catch(() => { setStars(0); setGems(0) })
    }, 600) // 600ms delay ensures DB write + recalc from toggle has landed
    return () => clearTimeout(timer)
  }, [kidKey, refreshKey])

  if (stars === null) return null

  return (
    <div className="flex flex-wrap items-center gap-1">
      <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
        <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
        <span className="text-[11px] font-bold text-amber-700">{stars}</span>
      </div>
      {gems !== null && gems > 0 && (
        <div className="flex items-center gap-1 bg-purple-50 border border-purple-200 rounded-full px-2 py-0.5">
          <Gem className="w-3 h-3 text-purple-500" />
          <span className="text-[11px] font-bold text-purple-700">{gems}</span>
        </div>
      )}
    </div>
  )
}
