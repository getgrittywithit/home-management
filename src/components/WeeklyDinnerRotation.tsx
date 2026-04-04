'use client'

import { useState, useEffect } from 'react'
import { ChefHat, Check, Clock, ChevronDown, ChevronUp, Settings, X, Loader2 } from 'lucide-react'

const DINNER_ROTATION: Record<string, Record<string, { kid: string; theme: string; emoji: string; label: string }>> = {
  week1: {
    monday: { kid: 'kaylee', theme: 'american-comfort', emoji: '🇺🇸', label: 'American Comfort' },
    tuesday: { kid: 'zoey', theme: 'asian', emoji: '🥡', label: 'Asian Night' },
    wednesday: { kid: 'wyatt', theme: 'bar-night', emoji: '🥗', label: 'Bar Night' },
    thursday: { kid: 'amos', theme: 'mexican', emoji: '🌮', label: 'Mexican Night' },
    friday: { kid: 'ellie & hannah', theme: 'pizza-italian', emoji: '🍕', label: 'Pizza & Italian' },
    saturday: { kid: 'parents', theme: 'grill', emoji: '🔥', label: 'Grill Night' },
    sunday: { kid: 'parents', theme: 'roast-comfort', emoji: '🏡', label: 'Roast/Comfort' },
  },
  week2: {
    monday: { kid: 'kaylee', theme: 'soup-comfort', emoji: '🍲', label: 'Soup/Comfort' },
    tuesday: { kid: 'zoey', theme: 'asian', emoji: '🥡', label: 'Asian Night' },
    wednesday: { kid: 'wyatt', theme: 'easy-lazy', emoji: '🥪', label: 'Easy/Lazy Night' },
    thursday: { kid: 'amos', theme: 'mexican', emoji: '🌮', label: 'Mexican Night' },
    friday: { kid: 'ellie & hannah', theme: 'pizza-italian', emoji: '🍕', label: 'Pizza & Italian' },
    saturday: { kid: 'parents', theme: 'experiment', emoji: '🔬', label: 'Experiment/Big Cook' },
    sunday: { kid: 'parents', theme: 'brunch', emoji: '🍳', label: 'Brunch Sunday' },
  },
}

const KID_DISPLAY: Record<string, string> = {
  kaylee: 'Kaylee', zoey: 'Zoey', wyatt: 'Wyatt', amos: 'Amos',
  ellie: 'Ellie', hannah: 'Hannah', parents: 'Parents',
  'ellie & hannah': 'Ellie & Hannah',
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

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

interface AvailableMeal {
  id: string
  name: string
  sides: string | null
}

interface GrocerySettings {
  pickup_day_1: number
  pickup_day_2: number
  deadline_hours_before: number
  auto_assign_on_miss: boolean
}

export default function WeeklyDinnerRotation() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
  const EPOCH = new Date('2026-03-30T00:00:00')
  const weeks = Math.floor((now.getTime() - EPOCH.getTime()) / (7 * 24 * 60 * 60 * 1000))
  const currentWeek = weeks % 2 === 0 ? 1 : 2

  const [viewWeek, setViewWeek] = useState(currentWeek)
  const [thisWeek, setThisWeek] = useState<WeekData | null>(null)
  const [nextWeek, setNextWeek] = useState<WeekData | null>(null)
  const [pickStatus, setPickStatus] = useState<{ total: number; picked: number; waiting_on: string[] }>({ total: 7, picked: 0, waiting_on: [] })
  const [expandedDay, setExpandedDay] = useState<number | null>(null)
  const [swapMeals, setSwapMeals] = useState<AvailableMeal[]>([])
  const [loadingSwap, setLoadingSwap] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState<GrocerySettings>({ pickup_day_1: 6, pickup_day_2: 2, deadline_hours_before: 6, auto_assign_on_miss: true })
  const [savingSettings, setSavingSettings] = useState(false)

  // Get Monday of current week
  const dayOfWeek = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7))

  // FIX: Advance date for Week 2 view
  const displayMonday = new Date(monday)
  if (viewWeek !== currentWeek) {
    displayMonday.setDate(displayMonday.getDate() + (viewWeek > currentWeek ? 7 : -7))
  }

  const weekKey = `week${viewWeek}`
  const rotation = DINNER_ROTATION[weekKey] || {}
  const todayName = DAYS[(dayOfWeek + 6) % 7]

  const getSeason = () => {
    const month = now.getMonth() + 1
    return (month >= 3 && month <= 8) ? 'spring-summer' : 'fall-winter'
  }

  const getSeasonDisplay = () => {
    return getSeason() === 'spring-summer' ? 'Spring/Summer' : 'Fall/Winter'
  }

  // Fetch live week data
  const fetchWeekData = () => {
    fetch('/api/meal-plan/week?action=get_current_and_next')
      .then(r => r.json())
      .then(data => {
        setThisWeek(data.this_week)
        setNextWeek(data.next_week)
        setPickStatus(data.pick_status || { total: 7, picked: 0, waiting_on: [] })
      })
      .catch(() => {})
  }

  useEffect(() => {
    fetchWeekData()
    fetch('/api/meal-plan/week?action=get_grocery_settings')
      .then(r => r.json())
      .then(data => { if (data.settings) setSettings(data.settings) })
      .catch(() => {})
  }, [])

  // Get live data for current view
  const liveWeek = viewWeek === currentWeek ? thisWeek : nextWeek
  const getLiveDay = (dow: number): DayPlan | undefined => liveWeek?.days?.find(d => d.day_of_week === dow)

  // Expand day + load swap meals
  const handleExpandDay = async (dow: number) => {
    if (expandedDay === dow) { setExpandedDay(null); return }
    setExpandedDay(dow)
    setSwapMeals([])

    const dayKey = DAYS[dow]
    const entry = rotation[dayKey]
    if (!entry) return

    setLoadingSwap(true)
    try {
      const res = await fetch(`/api/parent/meal-requests?action=available_meals&theme=${entry.theme}&season=${getSeason()}`)
      const data = await res.json()
      setSwapMeals(data.meals || [])
    } catch { /* no meals */ }
    setLoadingSwap(false)
  }

  // Parent swap
  const handleSwap = async (dow: number, mealId: string) => {
    const weekData = viewWeek === currentWeek ? thisWeek : nextWeek
    if (!weekData) return
    await fetch('/api/meal-plan/week', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'parent_swap', week_start: weekData.week_start, day_of_week: dow, new_meal_id: mealId, note: 'Parent swapped' }),
    }).catch(() => {})
    setExpandedDay(null)
    fetchWeekData()
  }

  // Parent off night
  const handleOffNight = async (dow: number) => {
    const weekData = viewWeek === currentWeek ? thisWeek : nextWeek
    if (!weekData) return
    await fetch('/api/meal-plan/week', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'parent_off_night', week_start: weekData.week_start, day_of_week: dow }),
    }).catch(() => {})
    setExpandedDay(null)
    fetchWeekData()
  }

  // Save grocery settings
  const handleSaveSettings = async () => {
    setSavingSettings(true)
    await fetch('/api/meal-plan/week', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_grocery_settings', ...settings }),
    }).catch(() => {})
    setSavingSettings(false)
    setShowSettings(false)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 text-white">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <ChefHat className="w-5 h-5" />
            Dinner Rotation — Week {viewWeek}
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSettings(true)} className="p-1.5 rounded hover:bg-white/20 transition-colors" title="Grocery Settings">
              <Settings className="w-4 h-4" />
            </button>
            <div className="flex gap-1">
              <button onClick={() => { setViewWeek(1); setExpandedDay(null) }}
                className={`px-3 py-1 rounded text-xs font-medium ${viewWeek === 1 ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'}`}>
                Week 1
              </button>
              <button onClick={() => { setViewWeek(2); setExpandedDay(null) }}
                className={`px-3 py-1 rounded text-xs font-medium ${viewWeek === 2 ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'}`}>
                Week 2
              </button>
            </div>
          </div>
        </div>
        <p className="text-orange-100 text-xs mt-1">
          {displayMonday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {
            new Date(displayMonday.getTime() + 6 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          } · {getSeasonDisplay()} menu
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500 bg-gray-50">
              <th className="p-3 font-medium">Day</th>
              <th className="p-3 font-medium">Manager</th>
              <th className="p-3 font-medium">Theme</th>
              <th className="p-3 font-medium">Pick</th>
              <th className="p-3 font-medium w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {DAYS.map((day, i) => {
              const entry = rotation[day]
              if (!entry) return null
              const isToday = day === todayName && viewWeek === currentWeek
              const dateStr = new Date(displayMonday.getTime() + i * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              const live = getLiveDay(i)
              const isExpanded = expandedDay === i
              const isOffNight = live?.status === 'off_night'
              const isAutoAssigned = live?.parent_override_note === 'Auto-assigned'

              return (
                <tr key={day} className="group">
                  <td colSpan={5} className="p-0">
                    {/* Main row */}
                    <button
                      onClick={() => handleExpandDay(i)}
                      className={`w-full text-left grid grid-cols-[1fr_1fr_1fr_1.5fr_32px] items-center p-3 transition-colors ${
                        isToday ? 'bg-orange-50' : isExpanded ? 'bg-gray-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div>
                        <div className="font-medium text-gray-900">
                          {DAY_SHORT[i]}
                          {isToday && <span className="ml-1.5 text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded-full">TODAY</span>}
                        </div>
                        <div className="text-xs text-gray-400">{dateStr}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-800 capitalize">
                          {KID_DISPLAY[entry.kid] || entry.kid}
                        </span>
                      </div>
                      <div>
                        <span className="inline-flex items-center gap-1.5">
                          <span>{entry.emoji}</span>
                          <span className="text-gray-700">{entry.label}</span>
                        </span>
                      </div>
                      <div>
                        {isOffNight ? (
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">🍳 Off Night</span>
                        ) : live?.meal_name ? (
                          <span className="text-xs text-green-700 font-medium">
                            <Check className="w-3 h-3 inline mr-0.5" />
                            {live.meal_name}
                            {isAutoAssigned && <span className="text-gray-400 ml-1">🤖</span>}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No pick yet</span>
                        )}
                      </div>
                      <div className="text-gray-400">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>

                    {/* Expanded panel */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 bg-gray-50 border-t border-gray-100 space-y-3">
                        {/* Current pick info */}
                        {live?.meal_name && !isOffNight && (
                          <div className="text-xs text-gray-600 bg-white rounded-lg px-3 py-2 border">
                            <span className="font-medium">{live.meal_name}</span>
                            {live.sides && <span className="text-gray-400 ml-1">· {live.sides}</span>}
                            {live.picked_at && (
                              <span className="text-gray-400 ml-2">
                                — picked by {live.manager_display} on {new Date(live.picked_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                            {live.parent_override_note && live.parent_override_note !== 'Auto-assigned' && (
                              <span className="text-amber-600 ml-2">({live.parent_override_note})</span>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2 flex-wrap">
                          {/* Swap dropdown */}
                          <div className="flex-1 min-w-[200px]">
                            <label className="text-xs font-medium text-gray-500 mb-1 block">Swap Meal</label>
                            {loadingSwap ? (
                              <div className="flex items-center gap-1 text-xs text-gray-400 py-2">
                                <Loader2 className="w-3 h-3 animate-spin" /> Loading meals...
                              </div>
                            ) : (
                              <select
                                onChange={(e) => { if (e.target.value) handleSwap(i, e.target.value) }}
                                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
                                defaultValue=""
                              >
                                <option value="" disabled>Choose a {entry.label} meal...</option>
                                {swapMeals.map(m => (
                                  <option key={m.id} value={m.id}>{m.name}{m.sides ? ` · ${m.sides}` : ''}</option>
                                ))}
                                {swapMeals.length === 0 && <option disabled>No meals for this theme</option>}
                              </select>
                            )}
                          </div>

                          {/* Off Night button */}
                          <div className="flex items-end">
                            <button
                              onClick={() => handleOffNight(i)}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                isOffNight
                                  ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                  : 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200'
                              }`}
                            >
                              {isOffNight ? '↩ Restore' : '🍳 Off Night'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pick status */}
      <div className="px-4 py-3 border-t bg-gray-50 text-sm">
        {pickStatus.picked >= pickStatus.total ? (
          <span className="text-green-600 font-medium">✅ All picks in for next week</span>
        ) : (
          <span className="text-gray-600">
            <span className="font-medium">Next Week:</span> {pickStatus.picked}/{pickStatus.total} picked
            {pickStatus.waiting_on.length > 0 && (
              <span className="text-amber-600 ml-1">· Waiting on: {pickStatus.waiting_on.join(', ')}</span>
            )}
          </span>
        )}
      </div>

      {/* Grocery Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-600" /> Grocery Settings
              </h3>
              <button onClick={() => setShowSettings(false)} className="p-1 rounded hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Pickup Day 1</label>
                <select value={settings.pickup_day_1} onChange={e => setSettings(s => ({ ...s, pickup_day_1: parseInt(e.target.value) }))}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm">
                  {DAY_FULL.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Pickup Day 2</label>
                <select value={settings.pickup_day_2} onChange={e => setSettings(s => ({ ...s, pickup_day_2: parseInt(e.target.value) }))}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm">
                  {DAY_FULL.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Deadline (hours before pickup)</label>
                <select value={settings.deadline_hours_before} onChange={e => setSettings(s => ({ ...s, deadline_hours_before: parseInt(e.target.value) }))}
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm">
                  {[3, 6, 12, 18, 24].map(h => (
                    <option key={h} value={h}>{h} hours before ({h >= 24 ? '1 day' : `${24 - h > 12 ? (24 - h - 12) + 'pm' : (24 - h) + 'am'} day before`})</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Auto-assign missed picks</label>
                  <p className="text-xs text-gray-500">Randomly pick a themed meal if deadline passes</p>
                </div>
                <button
                  onClick={() => setSettings(s => ({ ...s, auto_assign_on_miss: !s.auto_assign_on_miss }))}
                  className={`w-11 h-6 rounded-full transition-colors ${settings.auto_assign_on_miss ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.auto_assign_on_miss ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowSettings(false)} className="flex-1 px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleSaveSettings} disabled={savingSettings}
                className="flex-1 px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-1">
                {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
