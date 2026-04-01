'use client'

import { useState, useEffect } from 'react'
import { ChefHat, Check, Clock } from 'lucide-react'

interface KidMealPickerProps {
  kidName: string
  previewMode?: boolean
}

const DINNER_ROTATION: Record<string, Record<string, { kid: string; theme: string; emoji: string; label: string }>> = {
  week1: {
    monday: { kid: 'kaylee', theme: 'american-comfort', emoji: '🇺🇸', label: 'American Comfort Night' },
    tuesday: { kid: 'zoey', theme: 'asian', emoji: '🥡', label: 'Asian Night' },
    wednesday: { kid: 'wyatt', theme: 'bar-night', emoji: '🥗', label: 'Bar Night' },
    thursday: { kid: 'amos', theme: 'mexican', emoji: '🌮', label: 'Mexican Night' },
    friday: { kid: 'ellie', theme: 'pizza-italian', emoji: '🍕', label: 'Pizza & Italian Night' },
    saturday: { kid: 'parents', theme: 'grill', emoji: '🔥', label: 'Grill Night' },
    sunday: { kid: 'parents', theme: 'roast-comfort', emoji: '🏡', label: 'Roast/Comfort Sunday' },
  },
  week2: {
    monday: { kid: 'kaylee', theme: 'soup-comfort', emoji: '🍲', label: 'Soup/Comfort Night' },
    tuesday: { kid: 'zoey', theme: 'asian', emoji: '🥡', label: 'Asian Night' },
    wednesday: { kid: 'wyatt', theme: 'easy-lazy', emoji: '🥪', label: 'Easy/Lazy Night' },
    thursday: { kid: 'amos', theme: 'mexican', emoji: '🌮', label: 'Mexican Night' },
    friday: { kid: 'ellie', theme: 'pizza-italian', emoji: '🍕', label: 'Pizza & Italian Night' },
    saturday: { kid: 'parents', theme: 'experiment', emoji: '🔬', label: 'Experiment/Big Cook' },
    sunday: { kid: 'parents', theme: 'brunch', emoji: '🍳', label: 'Brunch Sunday' },
  },
}

export default function KidMealPicker({ kidName, previewMode }: KidMealPickerProps) {
  const [meals, setMeals] = useState<any[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [existingPick, setExistingPick] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const kid = kidName.toLowerCase()
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
  const EPOCH = new Date('2026-03-30T00:00:00')
  const weeks = Math.floor((now.getTime() - EPOCH.getTime()) / (7 * 24 * 60 * 60 * 1000))
  const currentWeek = weeks % 2 === 0 ? 1 : 2
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const dayName = days[now.getDay()]
  const weekKey = `week${currentWeek}`
  const todaysDinner = DINNER_ROTATION[weekKey]?.[dayName]

  // Find this kid's dinner night this week
  const myNight = Object.entries(DINNER_ROTATION[weekKey] || {}).find(([_, v]) => v.kid === kid || (v.kid === 'ellie' && kid === 'hannah'))
  const myDayName = myNight?.[0]
  const myDinner = myNight?.[1]

  const getSeason = () => {
    const month = now.getMonth() + 1
    return (month >= 3 && month <= 8) ? 'spring-summer' : 'fall-winter'
  }

  useEffect(() => {
    if (!myDinner) { setLoading(false); return }

    // Check existing pick
    const todayStr = now.toLocaleDateString('en-CA')
    fetch(`/api/parent/meal-requests?action=my_request&kid=${kid}&date=${todayStr}`)
      .then(r => r.json())
      .then(data => {
        if (data.request) setExistingPick(data.request)
      })
      .catch(() => {})

    // Load available meals for theme
    fetch(`/api/parent/meal-requests?action=available_meals&theme=${myDinner.theme}&season=${getSeason()}`)
      .then(r => r.json())
      .then(data => { setMeals(data.meals || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [kid, myDinner?.theme])

  const handleSubmit = async () => {
    if (!selected || previewMode) return
    const meal = meals.find(m => m.id === selected)
    if (!meal) return

    await fetch('/api/parent/meal-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'submit_pick',
        kid_name: kid,
        meal_id: selected,
        assigned_date: now.toLocaleDateString('en-CA'),
      }),
    }).catch(() => {})
    setSubmitted(true)
  }

  if (!myDinner) return null
  if (loading) return null

  // Already picked
  if (existingPick) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
        <div className="flex items-center gap-2 mb-1">
          <ChefHat className="w-4 h-4 text-green-600" />
          <span className="font-semibold text-green-800 text-sm">Your Dinner Pick</span>
        </div>
        <p className="text-sm text-green-700">
          {myDinner.emoji} {existingPick.meal_name} — {existingPick.status === 'approved' ? 'Approved!' : 'Waiting for Mom to approve'}
        </p>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-center">
        <Check className="w-6 h-6 text-green-600 mx-auto mb-1" />
        <p className="text-sm font-medium text-green-800">Pick submitted! Mom will confirm.</p>
      </div>
    )
  }

  const dayLabel = myDayName ? myDayName.charAt(0).toUpperCase() + myDayName.slice(1) : ''

  return (
    <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-orange-800 flex items-center gap-2 text-sm">
          <ChefHat className="w-4 h-4" /> Your Dinner Night — {dayLabel}
        </h3>
        <span className="text-xs text-orange-600">{myDinner.emoji} {myDinner.label}</span>
      </div>

      <p className="text-xs text-orange-700">Pick your meal so Mom can shop!</p>

      {meals.length === 0 ? (
        <p className="text-xs text-gray-500 italic">No meals available for this theme yet.</p>
      ) : (
        <div className="space-y-1.5">
          {meals.map(meal => (
            <button
              key={meal.id}
              onClick={() => !previewMode && setSelected(meal.id)}
              disabled={previewMode}
              className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-colors ${
                selected === meal.id
                  ? 'border-orange-400 bg-orange-100 text-orange-900'
                  : 'border-orange-100 bg-white text-gray-700 hover:border-orange-300'
              }`}
            >
              <span className="font-medium">{meal.name}</span>
              {meal.sides && <span className="text-xs text-gray-500 ml-2">· {meal.sides}</span>}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <button onClick={handleSubmit} disabled={previewMode}
          className="w-full bg-orange-500 text-white py-2.5 rounded-xl font-medium hover:bg-orange-600 disabled:opacity-50">
          Submit Pick
        </button>
      )}

      <p className="text-[10px] text-orange-500 flex items-center gap-1">
        <Clock className="w-3 h-3" /> Pick by the day before so Mom can shop!
      </p>
    </div>
  )
}
