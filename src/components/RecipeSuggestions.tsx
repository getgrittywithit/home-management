'use client'

import { useState, useEffect } from 'react'
import {
  Sparkles, ChefHat, Package, RefreshCw, ThumbsUp
} from 'lucide-react'

interface SuggestedMeal {
  id: number
  name: string
  theme: string
  description: string
  season: string
  total_ingredients?: number
  in_stock_count?: number
}

export default function RecipeSuggestions() {
  const [mightLike, setMightLike] = useState<SuggestedMeal[]>([])
  const [useWhatYouHave, setUseWhatYouHave] = useState<SuggestedMeal[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSuggestions = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/grocery?action=suggestions')
      const data = await res.json()
      if (!data.error) {
        setMightLike(data.might_like || [])
        setUseWhatYouHave(data.use_what_you_have || [])
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    fetchSuggestions()
  }, [])

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-6 bg-gray-100 rounded w-40" />
        <div className="h-24 bg-gray-100 rounded-lg" />
      </div>
    )
  }

  if (mightLike.length === 0 && useWhatYouHave.length === 0) return null

  const themeColors: Record<string, string> = {
    chicken: 'bg-amber-100 text-amber-700',
    beef: 'bg-red-100 text-red-700',
    seafood: 'bg-cyan-100 text-cyan-700',
    pasta: 'bg-yellow-100 text-yellow-700',
    mexican: 'bg-orange-100 text-orange-700',
    asian: 'bg-emerald-100 text-emerald-700',
    breakfast: 'bg-pink-100 text-pink-700',
    soup: 'bg-teal-100 text-teal-700',
  }

  const getThemeColor = (theme: string) => {
    const key = (theme || '').toLowerCase()
    return themeColors[key] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="space-y-4">
      {/* You Might Like */}
      {mightLike.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              You Might Like
            </h3>
            <button onClick={fetchSuggestions} className="p-1 hover:bg-gray-100 rounded" title="Refresh suggestions">
              <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
          <div className="p-3 flex gap-3 overflow-x-auto">
            {mightLike.map(meal => (
              <div
                key={meal.id}
                className="flex-shrink-0 w-44 bg-gray-50 rounded-lg p-3 border hover:shadow-md transition-shadow"
              >
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${getThemeColor(meal.theme)}`}>
                  {meal.theme}
                </span>
                <h4 className="text-sm font-semibold text-gray-900 mt-1.5 line-clamp-2">{meal.name}</h4>
                {meal.description && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{meal.description}</p>
                )}
                <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                  <ChefHat className="w-3 h-3" />
                  {meal.season === 'year-round' ? 'Year-round' : meal.season}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Use What You Have */}
      {useWhatYouHave.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-green-500" />
              Use What You Have
            </h3>
          </div>
          <div className="divide-y">
            {useWhatYouHave.map(meal => {
              const pct = meal.total_ingredients && meal.total_ingredients > 0
                ? Math.round((meal.in_stock_count || 0) / meal.total_ingredients * 100)
                : 0
              return (
                <div key={meal.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{meal.name}</div>
                    <div className="text-xs text-gray-500">
                      {meal.theme} · {meal.in_stock_count || 0}/{meal.total_ingredients || '?'} ingredients in stock
                    </div>
                  </div>
                  {pct > 0 && (
                    <div className={`text-xs font-bold px-2 py-1 rounded-full ${
                      pct >= 80 ? 'bg-green-100 text-green-700' :
                      pct >= 50 ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {pct}% ready
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
