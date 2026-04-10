'use client'

import { useState, useEffect } from 'react'
import { Loader2, Shuffle, Check, X, ChefHat } from 'lucide-react'

interface DayPlan {
  day_of_week: number
  day_name: string
  meal_id: string | null
  meal_name: string | null
  theme: string
  kid_name: string
  manager_display: string
  status: string
  parent_override_note: string | null
  sides: string | null
}

interface WeekData {
  week_start: string
  week_number: number
  days: DayPlan[]
}

interface Props {
  kidName?: string       // If set, show kid-specific controls
  isParent?: boolean     // Parent gets swap/off-night controls
  compact?: boolean      // Compact mode for kid portal home
}

const THEME_EMOJI: Record<string, string> = {
  'american-comfort': '🇺🇸', 'soup-comfort': '🍲', 'asian': '🥡', 'bar-night': '🥗',
  'easy-lazy': '🥪', 'pizza-italian': '🍕', 'grill': '🔥', 'experiment': '🔬',
  'roast-comfort': '🏡', 'brunch': '🍳', 'mexican': '🌮',
}

export default function WeeklyMealCalendar({ kidName, isParent, compact }: Props) {
  const [thisWeek, setThisWeek] = useState<WeekData | null>(null)
  const [nextWeek, setNextWeek] = useState<WeekData | null>(null)
  const [viewing, setViewing] = useState<'this' | 'next'>('this')
  const [todayDow, setTodayDow] = useState(0)
  const [pickStatus, setPickStatus] = useState<{ total: number; picked: number; waiting_on: string[] }>({ total: 7, picked: 0, waiting_on: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/meal-plan/week?action=get_current_and_next')
      .then(r => r.json())
      .then(data => {
        setThisWeek(data.this_week)
        setNextWeek(data.next_week)
        setTodayDow(data.today_dow)
        setPickStatus(data.pick_status || { total: 7, picked: 0, waiting_on: [] })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>

  const week = viewing === 'this' ? thisWeek : nextWeek
  if (!week) return null

  const handleOffNight = async (dow: number) => {
    const dayData = week.days?.find((d: any) => d.day_of_week === dow)
    const isCurrentlyOff = dayData?.status === 'off_night'
    await fetch('/api/meal-plan/week', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: isCurrentlyOff ? 'restore' : 'parent_off_night',
        week_start: week.week_start,
        day_of_week: dow,
      }),
    })
    // Refresh
    const data = await fetch('/api/meal-plan/week?action=get_current_and_next').then(r => r.json())
    setThisWeek(data.this_week)
    setNextWeek(data.next_week)
    setPickStatus(data.pick_status)
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-gradient-to-r from-orange-50 to-amber-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChefHat className="w-5 h-5 text-orange-600" />
          <h3 className="font-bold text-gray-900 text-sm">{viewing === 'this' ? "This Week's Meals" : "Next Week's Meals"}</h3>
          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Wk {week.week_number}</span>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setViewing('this')} className={`text-xs px-2 py-1 rounded ${viewing === 'this' ? 'bg-orange-200 text-orange-800 font-medium' : 'text-gray-500'}`}>This</button>
          <button onClick={() => setViewing('next')} className={`text-xs px-2 py-1 rounded ${viewing === 'next' ? 'bg-orange-200 text-orange-800 font-medium' : 'text-gray-500'}`}>Next</button>
        </div>
      </div>

      {/* 7-day grid */}
      <div className="grid grid-cols-7 divide-x text-center">
        {week.days.map((day) => {
          const isToday = viewing === 'this' && day.day_of_week === todayDow
          const isOffNight = day.status === 'off_night'
          const isAutoAssigned = day.parent_override_note === 'Auto-assigned'

          return (
            <div key={day.day_of_week} className={`p-2 ${isToday ? 'bg-orange-50 ring-2 ring-inset ring-orange-300' : ''} ${compact ? 'py-1.5' : 'py-3'}`}>
              <div className={`text-xs font-medium ${isToday ? 'text-orange-700' : 'text-gray-500'}`}>
                {day.day_name.slice(0, 3)}
              </div>

              <div className={`mt-1 text-xs ${compact ? '' : 'min-h-[32px]'}`}>
                {isOffNight ? (
                  <span className="text-gray-400">🍳 Off</span>
                ) : day.meal_name ? (
                  <span className={`font-medium ${isToday ? 'text-orange-900' : 'text-gray-800'}`}>
                    {THEME_EMOJI[day.theme] || '🍽️'} {compact ? day.meal_name.split(' ').slice(0, 2).join(' ') : day.meal_name}
                  </span>
                ) : (
                  <span className="text-gray-300 italic">?</span>
                )}
                {isAutoAssigned && <span className="text-[10px] text-gray-400 block">🤖</span>}
              </div>

              <div className="text-[10px] text-gray-400 mt-0.5">
                {day.manager_display}
              </div>

              {/* Parent controls */}
              {isParent && viewing === 'next' && !compact && (
                <button onClick={() => handleOffNight(day.day_of_week)}
                  className="text-[10px] text-gray-400 hover:text-gray-600 mt-1">
                  {isOffNight ? 'Restore' : 'Off Night'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Pick status (parent view) */}
      {isParent && viewing === 'next' && (
        <div className="px-4 py-2 border-t bg-gray-50 text-xs text-gray-600">
          {pickStatus.picked === pickStatus.total ? (
            <span className="text-green-600 font-medium">✅ All picks in</span>
          ) : (
            <span>
              {pickStatus.picked}/{pickStatus.total} picked
              {pickStatus.waiting_on.length > 0 && (
                <span className="text-amber-600 ml-1">— Waiting on: {pickStatus.waiting_on.join(', ')}</span>
              )}
            </span>
          )}
        </div>
      )}

      {/* Today highlight indicator */}
      {viewing === 'this' && !compact && (
        <div className="px-4 py-1.5 border-t text-[10px] text-gray-400 text-center">
          Today is highlighted
        </div>
      )}
    </div>
  )
}
