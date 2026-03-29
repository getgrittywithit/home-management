'use client'

import { useState, useEffect } from 'react'
import {
  Star, AlertTriangle, Users, BarChart3, ChevronDown, ChevronUp,
  Download, TrendingUp, TrendingDown
} from 'lucide-react'

interface TopMeal {
  meal_id: number
  meal_name: string
  theme: string
  avg_rating: number
  rating_count: number
}

interface KidPattern {
  kid_name: string
  avg_rating: number
  total_ratings: number
  top_tags: string[] | null
  low_rated_meals: { meal_name: string; avg_rating: number }[]
}

interface AnalyticsData {
  top_rated: TopMeal[]
  needs_attention: TopMeal[]
  kid_patterns: KidPattern[]
}

const TAG_LABELS: Record<string, string> = {
  'too-spicy': 'Too Spicy', 'too-bland': 'Too Bland', 'too-salty': 'Too Salty',
  'wanted-more': 'Wanted More', 'too-much-food': 'Too Much Food',
  'loved-the-sides': 'Loved Sides', 'didnt-like-sides': "Didn't Like Sides",
  'would-eat-again': 'Would Eat Again', 'not-again': 'Not Again',
  'texture-too-soft': 'Too Soft', 'texture-too-crunchy': 'Too Crunchy',
  'texture-mixed': 'Mixed Textures', 'strong-smell': 'Strong Smell',
  'foods-touching': 'Foods Touching', 'temperature-issue': 'Temp Issue',
  'color-put-me-off': 'Color Issue', 'looked-weird': 'Looked Weird',
  'same-as-always-good': 'Consistent Fav', 'new-and-liked-it': 'New Liked',
  'new-and-didnt-like-it': "New Didn't Like",
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4].map(i => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
        />
      ))}
    </div>
  )
}

export default function MealFeedbackAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedKid, setExpandedKid] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/feedback?action=analytics')
      .then(r => r.json())
      .then(d => {
        if (!d.error) setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const exportSensoryReport = () => {
    if (!data) return
    let report = 'MEAL FEEDBACK SENSORY REPORT\n'
    report += `Generated: ${new Date().toLocaleDateString()}\n`
    report += '='.repeat(40) + '\n\n'

    if (data.top_rated.length > 0) {
      report += 'TOP RATED MEALS:\n'
      data.top_rated.forEach(m => {
        report += `  ${m.meal_name} (${m.theme}) - ${m.avg_rating}/4 (${m.rating_count} ratings)\n`
      })
      report += '\n'
    }

    if (data.needs_attention.length > 0) {
      report += 'NEEDS ATTENTION:\n'
      data.needs_attention.forEach(m => {
        report += `  ${m.meal_name} (${m.theme}) - ${m.avg_rating}/4 (${m.rating_count} ratings)\n`
      })
      report += '\n'
    }

    if (data.kid_patterns.length > 0) {
      report += 'PER-CHILD PATTERNS:\n'
      data.kid_patterns.forEach(k => {
        report += `\n  ${k.kid_name}:\n`
        report += `    Average rating: ${k.avg_rating}/4 (${k.total_ratings} total)\n`
        if (k.top_tags?.length) {
          report += `    Common tags: ${k.top_tags.map(t => TAG_LABELS[t] || t).join(', ')}\n`
        }
        if (k.low_rated_meals.length > 0) {
          report += `    Consistently dislikes: ${k.low_rated_meals.map(m => `${m.meal_name} (${m.avg_rating}/4)`).join(', ')}\n`
        }
      })
    }

    const blob = new Blob([report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sensory-report-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-100 rounded w-48" />
        <div className="h-32 bg-gray-100 rounded-lg" />
      </div>
    )
  }

  if (!data || (data.top_rated.length === 0 && data.kid_patterns.length === 0)) {
    return (
      <div className="text-center py-8 text-gray-400">
        <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-50" />
        <p className="text-sm font-medium">No meal feedback yet</p>
        <p className="text-xs mt-1">Feedback will appear here once kids start rating their meals</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-orange-500" />
          Meal Feedback Analytics
        </h2>
        <button
          onClick={exportSensoryReport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export Sensory Report
        </button>
      </div>

      {/* Top Rated Meals */}
      {data.top_rated.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <h3 className="font-semibold text-gray-900">Top Rated Meals</h3>
          </div>
          <div className="divide-y">
            {data.top_rated.map(meal => (
              <div key={meal.meal_id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">{meal.meal_name || 'Unknown Meal'}</div>
                  <div className="text-xs text-gray-500">{meal.theme} · {meal.rating_count} ratings</div>
                </div>
                <div className="flex items-center gap-2">
                  <StarRating rating={meal.avg_rating} />
                  <span className="text-sm font-semibold text-gray-700">{meal.avg_rating}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Needs Attention */}
      {data.needs_attention.length > 0 && (
        <div className="bg-white rounded-lg border border-amber-200 shadow-sm">
          <div className="px-4 py-3 border-b border-amber-200 bg-amber-50 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-amber-900">Needs Attention</h3>
          </div>
          <div className="divide-y divide-amber-100">
            {data.needs_attention.map(meal => (
              <div key={meal.meal_id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">{meal.meal_name || 'Unknown Meal'}</div>
                  <div className="text-xs text-gray-500">{meal.theme} · {meal.rating_count} ratings</div>
                </div>
                <div className="flex items-center gap-2">
                  <StarRating rating={meal.avg_rating} />
                  <span className="text-sm font-semibold text-red-600">{meal.avg_rating}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-Kid Patterns */}
      {data.kid_patterns.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" />
            <h3 className="font-semibold text-gray-900">Per-Kid Patterns</h3>
          </div>
          <div className="divide-y">
            {data.kid_patterns.map(kid => {
              const isExpanded = expandedKid === kid.kid_name
              return (
                <div key={kid.kid_name}>
                  <button
                    onClick={() => setExpandedKid(isExpanded ? null : kid.kid_name)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-700">
                        {kid.kid_name.charAt(0)}
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-medium text-gray-900">{kid.kid_name}</div>
                        <div className="text-xs text-gray-500">{kid.total_ratings} ratings · avg {kid.avg_rating}/4</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StarRating rating={kid.avg_rating} />
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-3 space-y-3">
                      {/* Tags */}
                      {kid.top_tags && kid.top_tags.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1">Common Feedback</p>
                          <div className="flex flex-wrap gap-1">
                            {kid.top_tags.filter(Boolean).slice(0, 10).map(tag => (
                              <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                                {TAG_LABELS[tag] || tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Low rated meals */}
                      {kid.low_rated_meals.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-red-500 mb-1 flex items-center gap-1">
                            <TrendingDown className="w-3 h-3" />
                            Consistently Rates Low
                          </p>
                          <div className="space-y-1">
                            {kid.low_rated_meals.map(m => (
                              <div key={m.meal_name} className="flex items-center justify-between text-xs">
                                <span className="text-gray-700">{m.meal_name}</span>
                                <span className="text-red-500 font-medium">{m.avg_rating}/4</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Empty detail state */}
                      {(!kid.top_tags || kid.top_tags.filter(Boolean).length === 0) && kid.low_rated_meals.length === 0 && (
                        <p className="text-xs text-gray-400 italic">No detailed patterns yet</p>
                      )}
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
