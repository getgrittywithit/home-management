'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, ChefHat, ChevronUp, Clock, Users, BookOpen, Printer } from 'lucide-react'
import RecipeCard from './RecipeCard'

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
  picked_at?: string
}

interface WeekData {
  week_start: string
  week_number: number
  days: DayPlan[]
}

interface RecipeMeta {
  prep_time_min: number | null
  cook_time_min: number | null
  servings: number | null
}

interface AvailableMeal {
  id: string
  name: string
  sides: string | null
}

interface Props {
  kidName?: string  // Reserved for future kid-specific filtering
  isParent?: boolean
  compact?: boolean
  onViewRecipe?: (mealId: string) => void
}

const THEME_EMOJI: Record<string, string> = {
  'american-comfort': '🇺🇸', 'soup-comfort': '🍲', 'asian': '🥡', 'bar-night': '🥗',
  'easy-lazy': '🥪', 'pizza-italian': '🍕', 'grill': '🔥', 'experiment': '🔬',
  'roast-comfort': '🏡', 'brunch': '🍳', 'mexican': '🌮',
}

const THEME_LABEL: Record<string, string> = {
  'american-comfort': 'American Comfort', 'soup-comfort': 'Soup / Crockpot', 'asian': 'Asian Night', 'bar-night': 'Bar Night',
  'easy-lazy': 'Easy / Lazy', 'pizza-italian': 'Pizza & Italian', 'grill': 'Grill Night', 'experiment': 'Experiment',
  'roast-comfort': 'Roast / Comfort', 'brunch': 'Brunch / Light', 'mexican': 'Mexican Night',
}

export default function WeeklyMealCalendar({ isParent, compact, onViewRecipe }: Props) {
  const [thisWeek, setThisWeek] = useState<WeekData | null>(null)
  const [nextWeek, setNextWeek] = useState<WeekData | null>(null)
  const [viewing, setViewing] = useState<'this' | 'next'>('this')
  const [todayDow, setTodayDow] = useState(0)
  const [pickStatus, setPickStatus] = useState<{ total: number; picked: number; waiting_on: string[] }>({ total: 7, picked: 0, waiting_on: [] })
  const [loading, setLoading] = useState(true)
  const [expandedDow, setExpandedDow] = useState<number | null>(null)
  const [recipeMeta, setRecipeMeta] = useState<Record<string, RecipeMeta>>({})
  const [swapMeals, setSwapMeals] = useState<AvailableMeal[]>([])
  const [loadingSwap, setLoadingSwap] = useState(false)
  const [openRecipe, setOpenRecipe] = useState<{ mealId: string; dayLabel: string } | null>(null)

  const loadWeeks = useCallback(() => {
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

  useEffect(() => { loadWeeks() }, [loadWeeks])

  const week = viewing === 'this' ? thisWeek : nextWeek

  // When a day is expanded, auto-fetch recipe meta for that day's meal
  useEffect(() => {
    if (expandedDow == null || !week) return
    const day = week.days.find(d => d.day_of_week === expandedDow)
    if (!day?.meal_id || recipeMeta[day.meal_id]) return
    fetch(`/api/meals?action=get_recipe&meal_id=${day.meal_id}`)
      .then(r => r.json())
      .then(data => {
        if (data.meal) {
          setRecipeMeta(prev => ({
            ...prev,
            [data.meal.id]: {
              prep_time_min: data.meal.prep_time_min ?? null,
              cook_time_min: data.meal.cook_time_min ?? null,
              servings: data.meal.servings ?? null,
            },
          }))
        }
      })
      .catch(() => {})
  }, [expandedDow, week, recipeMeta])

  // Fetch swap meals when parent expands a day on next week
  useEffect(() => {
    if (!isParent || viewing !== 'next' || expandedDow == null || !week) {
      setSwapMeals([])
      return
    }
    const day = week.days.find(d => d.day_of_week === expandedDow)
    if (!day) return
    const month = new Date().getMonth() + 1
    const season = (month >= 3 && month <= 8) ? 'spring-summer' : 'fall-winter'
    setLoadingSwap(true)
    fetch(`/api/parent/meal-requests?action=available_meals&theme=${day.theme}&season=${season}`)
      .then(r => r.json())
      .then(data => setSwapMeals(data.meals || []))
      .catch(() => setSwapMeals([]))
      .finally(() => setLoadingSwap(false))
  }, [isParent, viewing, expandedDow, week])

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
  if (!week) return null

  const handleToggleDay = (dow: number) => {
    setExpandedDow(prev => (prev === dow ? null : dow))
  }

  const handleOffNight = async (dow: number) => {
    const dayData = week.days?.find(d => d.day_of_week === dow)
    const isCurrentlyOff = dayData?.status === 'off_night'
    await fetch('/api/meal-plan/week', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: isCurrentlyOff ? 'restore' : 'parent_off_night',
        week_start: week.week_start,
        day_of_week: dow,
      }),
    })
    loadWeeks()
  }

  const handleSwap = async (dow: number, mealId: string) => {
    await fetch('/api/meal-plan/week', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'parent_swap',
        week_start: week.week_start,
        day_of_week: dow,
        new_meal_id: mealId,
        note: 'Parent swapped',
      }),
    })
    setExpandedDow(null)
    loadWeeks()
  }

  const expandedDay = expandedDow != null ? week.days.find(d => d.day_of_week === expandedDow) : null

  // P1-B: today's-dinner-not-picked banner. Triggers when viewing this week,
  // today's slot has no meal yet, status isn't off-night, and it's still
  // before 8pm Chicago (after that, planning the day is moot).
  const todayDay = viewing === 'this' ? week.days.find(d => d.day_of_week === todayDow) : null
  const chicagoHour = (() => {
    try {
      // Hour-of-day in Chicago, 0-23
      return parseInt(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago', hour: 'numeric', hour12: false }))
    } catch {
      return new Date().getHours()
    }
  })()
  const showPickBanner = !!todayDay
    && !todayDay.meal_id
    && todayDay.status !== 'off_night'
    && chicagoHour < 20
  const todayManagedByParent = !!todayDay && /parent|lola|levi/i.test(todayDay.kid_name || '')

  const handlePrintWeek = () => {
    document.body.classList.add('printing-weekly')
    const cleanup = () => {
      document.body.classList.remove('printing-weekly')
      window.removeEventListener('afterprint', cleanup)
    }
    window.addEventListener('afterprint', cleanup)
    setTimeout(() => window.print(), 50)
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden meal-calendar-container">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-gradient-to-r from-orange-50 to-amber-50 flex items-center justify-between recipe-card-hide-print">
        <div className="flex items-center gap-2">
          <ChefHat className="w-5 h-5 text-orange-600" />
          <h3 className="font-bold text-gray-900 text-sm">Dinner Rotation</h3>
          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Week {week.week_number} of 2</span>
        </div>
        <div className="flex gap-1">
          <button onClick={() => { setViewing('this'); setExpandedDow(null) }}
            className={`text-xs px-2 py-1 rounded ${viewing === 'this' ? 'bg-orange-200 text-orange-800 font-medium' : 'text-gray-500'}`}>This</button>
          <button onClick={() => { setViewing('next'); setExpandedDow(null) }}
            className={`text-xs px-2 py-1 rounded ${viewing === 'next' ? 'bg-orange-200 text-orange-800 font-medium' : 'text-gray-500'}`}>Next</button>
        </div>
      </div>

      {/* P1-B: today's-dinner-not-picked banner */}
      {showPickBanner && todayDay && (
        <div className="px-4 py-3 border-b bg-amber-50 border-amber-200 recipe-card-hide-print">
          <div className="flex items-start gap-3">
            <span className="text-lg leading-none mt-0.5">🍽️</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900">
                Today&rsquo;s dinner isn&rsquo;t picked yet.
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                {todayDay.day_name}&rsquo;s theme: {THEME_EMOJI[todayDay.theme] || '🍽️'} {THEME_LABEL[todayDay.theme] || todayDay.theme}
                {' · '}
                {todayManagedByParent
                  ? 'Lola or Levi to pick.'
                  : `${todayDay.manager_display || todayDay.kid_name} is set to pick.`}
              </p>
            </div>
            <button
              onClick={() => { setViewing('this'); setExpandedDow(todayDow) }}
              className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded bg-amber-600 text-white hover:bg-amber-700"
            >
              {todayManagedByParent ? `Pick ${todayDay.day_name}'s meal →` : 'Open'}
            </button>
          </div>
        </div>
      )}

      {/* 7-day grid */}
      <div className="grid grid-cols-7 divide-x text-center recipe-card-hide-print">
        {week.days.map((day) => {
          const isToday = viewing === 'this' && day.day_of_week === todayDow
          const isOffNight = day.status === 'off_night'
          const isAutoAssigned = day.parent_override_note === 'Auto-assigned'
          const isExpanded = expandedDow === day.day_of_week

          return (
            <button
              key={day.day_of_week}
              onClick={() => handleToggleDay(day.day_of_week)}
              className={`p-2 text-left transition-colors ${compact ? 'py-1.5' : 'py-3'} ${
                isExpanded ? 'bg-orange-100' : isToday ? 'bg-orange-50 ring-2 ring-inset ring-orange-300' : 'hover:bg-gray-50'
              }`}
            >
              <div className={`text-xs font-medium text-center ${isToday ? 'text-orange-700' : 'text-gray-500'}`}>
                {day.day_name.slice(0, 3)}
                {isExpanded ? <ChevronUp className="w-3 h-3 inline ml-0.5" /> : null}
              </div>

              <div className={`mt-1 text-xs text-center ${compact ? '' : 'min-h-[32px]'}`}>
                <div className="text-base">{THEME_EMOJI[day.theme] || '🍽️'}</div>
                {isOffNight ? (
                  <span className="text-gray-400 text-[10px]">🍳 Off</span>
                ) : day.meal_name ? (
                  <span className={`font-medium text-[10px] line-clamp-2 ${isToday ? 'text-orange-900' : 'text-gray-800'}`}>
                    {compact ? day.meal_name.split(' ').slice(0, 2).join(' ') : day.meal_name}
                  </span>
                ) : (
                  <span className="text-gray-300 italic text-[10px]">?</span>
                )}
                {isAutoAssigned && <span className="text-[10px] text-gray-400 block">🤖</span>}
              </div>

              <div className="text-[10px] text-gray-400 mt-0.5 text-center truncate">
                {day.manager_display}
              </div>
            </button>
          )
        })}
      </div>

      {/* Expanded day detail panel */}
      {expandedDay && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-2 recipe-card-hide-print">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-900">
              {expandedDay.day_name} — {THEME_EMOJI[expandedDay.theme] || '🍽️'} {THEME_LABEL[expandedDay.theme] || ''}
            </div>
            <button
              onClick={() => setExpandedDow(null)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Close
            </button>
          </div>

          {expandedDay.status === 'off_night' ? (
            <div className="text-sm text-gray-500 italic">🍳 Off night — no dinner planned</div>
          ) : expandedDay.meal_name ? (
            <>
              <div className="text-base font-semibold text-gray-900">{expandedDay.meal_name}</div>
              {expandedDay.sides && <div className="text-xs text-gray-600">{expandedDay.sides}</div>}
              {expandedDay.meal_id && recipeMeta[expandedDay.meal_id] && (
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  {recipeMeta[expandedDay.meal_id].prep_time_min != null && (
                    <span><Clock className="w-3 h-3 inline mr-0.5" />Prep: {recipeMeta[expandedDay.meal_id].prep_time_min}m</span>
                  )}
                  {recipeMeta[expandedDay.meal_id].cook_time_min != null && (
                    <span><Clock className="w-3 h-3 inline mr-0.5" />Cook: {recipeMeta[expandedDay.meal_id].cook_time_min}m</span>
                  )}
                  {recipeMeta[expandedDay.meal_id].servings != null && (
                    <span><Users className="w-3 h-3 inline mr-0.5" />Serves: {recipeMeta[expandedDay.meal_id].servings}</span>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-gray-500 italic">No pick yet</div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {expandedDay.meal_id && (
              <button
                onClick={() => {
                  if (onViewRecipe) onViewRecipe(expandedDay.meal_id!)
                  else setOpenRecipe({ mealId: expandedDay.meal_id!, dayLabel: expandedDay.day_name })
                }}
                className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-medium hover:bg-orange-600 flex items-center gap-1"
              >
                <BookOpen className="w-3.5 h-3.5" />
                View Recipe
              </button>
            )}
            {isParent && viewing === 'next' && (
              <>
                <div className="flex-1 min-w-[180px]">
                  {loadingSwap ? (
                    <div className="flex items-center gap-1 text-xs text-gray-400 py-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" /> Loading...
                    </div>
                  ) : (
                    <select
                      onChange={e => { if (e.target.value) handleSwap(expandedDay.day_of_week, e.target.value) }}
                      className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
                      defaultValue=""
                    >
                      <option value="" disabled>Swap meal...</option>
                      {swapMeals.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                      {swapMeals.length === 0 && <option disabled>No meals for this theme</option>}
                    </select>
                  )}
                </div>
                <button
                  onClick={() => handleOffNight(expandedDay.day_of_week)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                    expandedDay.status === 'off_night'
                      ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      : 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200'
                  }`}
                >
                  {expandedDay.status === 'off_night' ? '↩ Restore' : '🍳 Off Night'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Pick status (parent, next week) */}
      {isParent && viewing === 'next' && (
        <div className="px-4 py-2 border-t bg-gray-50 text-xs text-gray-600 recipe-card-hide-print">
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

      {/* Print This Week — parent-only */}
      {isParent && (
        <div className="px-4 py-2 border-t bg-white text-center recipe-card-hide-print">
          <button
            onClick={handlePrintWeek}
            className="text-xs text-gray-600 hover:text-gray-900 font-medium inline-flex items-center gap-1"
          >
            <Printer className="w-3.5 h-3.5" />
            Print This Week
          </button>
        </div>
      )}

      {/* Today highlight indicator (kid-side, this week) */}
      {!isParent && viewing === 'this' && !compact && (
        <div className="px-4 py-1.5 border-t text-[10px] text-gray-400 text-center recipe-card-hide-print">
          Today is highlighted — tap any day to see details
        </div>
      )}

      {/* Hidden print-only block — portrait, fridge-friendly */}
      <div className="hidden meal-calendar-print-only">
        <h1 className="meal-calendar-print-title">
          Dinner Rotation — Week of {new Date(week.week_start).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </h1>
        <p className="meal-calendar-print-sub">
          Week {week.week_number} · {(new Date().getMonth() + 1) >= 3 && (new Date().getMonth() + 1) <= 8 ? 'Spring/Summer' : 'Fall/Winter'} Menu
        </p>
        <table className="meal-calendar-print-table meal-calendar-print-portrait">
          <tbody>
            {week.days.map(day => (
              <tr key={`row-${day.day_of_week}`}>
                <td className="mc-print-day">{day.day_name.toUpperCase()}</td>
                <td className="mc-print-meal">
                  <div className="mc-print-meal-name">
                    {day.status === 'off_night' ? 'Off Night' : (day.meal_name || '?')}
                  </div>
                  {day.sides && day.status !== 'off_night' && day.meal_name && (
                    <div className="mc-print-sides">{day.sides}</div>
                  )}
                  <div className="mc-print-meta">
                    {THEME_LABEL[day.theme] || day.theme} · {day.manager_display}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="meal-calendar-print-footer">
          Moses Family · Printed {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
        </p>
      </div>

      {/* Recipe card (default internal handler) */}
      {openRecipe && (
        <RecipeCard
          mealId={openRecipe.mealId}
          mode="full"
          audience={isParent ? 'parent' : 'kid'}
          dayLabel={openRecipe.dayLabel}
          onClose={() => setOpenRecipe(null)}
        />
      )}
    </div>
  )
}
