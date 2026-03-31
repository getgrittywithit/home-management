'use client'

import { useState, useEffect } from 'react'
import { Star } from 'lucide-react'

interface StarBalanceHeaderProps {
  childName: string
}

export default function StarBalanceHeader({ childName }: StarBalanceHeaderProps) {
  const [balance, setBalance] = useState<number | null>(null)
  const kidKey = childName.toLowerCase()

  useEffect(() => {
    if (!kidKey) return
    fetch(`/api/stars?action=get_balance&kid_name=${kidKey}`)
      .then(r => r.json())
      .then(data => setBalance(data.available ?? data.balance ?? 0))
      .catch(() => {})
  }, [kidKey])

  if (balance === null) return null

  return (
    <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
      <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
      <span className="text-sm font-bold text-amber-700">{balance}</span>
    </div>
  )
}
