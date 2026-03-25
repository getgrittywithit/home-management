'use client'

import { useState, useEffect } from 'react'

export default function TonightsDinnerCard() {
  const [dinner, setDinner] = useState<string | null>(null)
  const [manager, setManager] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/kids/dashboard?action=get_tonights_dinner')
      .then(r => r.json())
      .then(data => {
        setDinner(data.dinner || null)
        setManager(data.dinnerManager || '')
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  if (!loaded) return null

  return (
    <div className="bg-white rounded-lg border shadow-sm p-4 flex items-center gap-3">
      <span className="text-2xl">🍽️</span>
      <div>
        <p className="text-sm font-medium text-gray-900">Tonight's Dinner</p>
        <p className="text-sm text-gray-600">{dinner || "Check with Mom for tonight's dinner"}</p>
        {manager && <p className="text-xs text-gray-400">Dinner Manager: {manager}</p>}
      </div>
    </div>
  )
}
