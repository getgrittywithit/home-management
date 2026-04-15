'use client'

import { useEffect, useState } from 'react'
import {
  Calendar, Clock, Users, DollarSign,
  MapPin, CheckCircle, CheckCircle2, Zap,
  Phone, Home, Utensils, Shirt, X, Dog
} from 'lucide-react'
import { DashboardData, FamilyEvent, Zone } from '@/types'
import { getCurrentZoneAssignments, getCurrentZoneWeek, getCurrentZoneWeekRange } from '@/lib/zoneRotation'
import PostGreenlightModal from './PostGreenlightModal'
import LogRevenueModal from './LogRevenueModal'
import CheckZonesPanel from './CheckZonesPanel'

interface DashboardProps {
  initialData?: DashboardData
}

export default function Dashboard({ initialData }: DashboardProps) {
  const [data, setData] = useState<DashboardData | null>(initialData || null)
  const [loading, setLoading] = useState(!initialData)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [isClient, setIsClient] = useState(false)
  const [greenlightOpen, setGreenlightOpen] = useState(false)
  const [greenlightActive, setGreenlightActive] = useState(false)
  const [revenueOpen, setRevenueOpen] = useState(false)
  const [zonesOpen, setZonesOpen] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isClient) {
      fetchDashboardData()

      // Refresh every 2 minutes
      const interval = setInterval(fetchDashboardData, 2 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [isClient])

  useEffect(() => {
    if (isClient) {
      fetch('/api/kids/messages?action=get_active_greenlight')
        .then(r => r.json())
        .then(data => setGreenlightActive(!!data.greenlight))
        .catch(() => {})
    }
  }, [isClient])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const dashboardData = await response.json()
      
      // Provide fallback data structure if API returns incomplete data
      const safeDashboardData: DashboardData = {
        onCallParent: dashboardData.onCallParent || 'System Loading',
        todaysEvents: dashboardData.todaysEvents || [],
        todaysRevenue: dashboardData.todaysRevenue || 0,
        weeklyRevenue: dashboardData.weeklyRevenue || 0,
        monthlyRevenue: dashboardData.monthlyRevenue || 0,
        overdueZones: dashboardData.overdueZones || [],
        upcomingPickups: dashboardData.upcomingPickups || []
      }
      
      setData(safeDashboardData)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      
      // Set fallback data instead of leaving it null
      setData({
        onCallParent: 'System Loading',
        todaysEvents: [],
        todaysRevenue: 0,
        weeklyRevenue: 0,
        monthlyRevenue: 0,
        overdueZones: [],
        upcomingPickups: []
      })
    } finally {
      setLoading(false)
    }
  }

  if (!isClient || loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Family Ops Dashboard...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <p className="text-red-600">Failed to load dashboard data</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/favicon.svg" alt="Family Ops" className="w-10 h-10 rounded-xl" />
                <h1 className="text-3xl font-bold text-gray-900">Family Ops Dashboard</h1>
              </div>
              <p className="text-gray-600">
                Greenhouse Playbook - Managing 2 adults + 6 kids with systems that work
              </p>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p>Last updated: {isClient ? lastUpdated.toLocaleTimeString() : 'Loading...'}</p>
              <div className="flex items-center mt-1">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                System operational
              </div>
            </div>
          </div>
        </header>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* On-Call Parent */}
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-primary-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">On-Call Today</p>
                <p className="text-2xl font-bold text-gray-900">{data.onCallParent}</p>
                <p className="text-xs text-gray-500">
                  {getCurrentDayRotation()}
                </p>
              </div>
            </div>
          </div>

          {/* Revenue Tracking */}
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Today / Week</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${data.todaysRevenue} / ${data.weeklyRevenue}
                </p>
                <p className="text-xs text-gray-500">Plant business</p>
              </div>
            </div>
          </div>

          {/* Pickup Windows */}
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pickup Windows</p>
                <p className="text-2xl font-bold text-gray-900">
                  {getNextPickupWindow()}
                </p>
                <p className="text-xs text-gray-500">Every hour</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Today's Schedule */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Calendar className="mr-2 h-5 w-5" />
                  Today's Schedule
                  {data.upcomingPickups.length > 0 && (
                    <span className="ml-2 bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                      {data.upcomingPickups.length} pickup{data.upcomingPickups.length !== 1 ? 's' : ''} soon
                    </span>
                  )}
                </h2>
              </div>
              <div className="p-6">
                {data.todaysEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-gray-500">
                      No events scheduled for today. Ready for anything! 🎯
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {data.todaysEvents.map((event: FamilyEvent) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Zone Rotation */}
            <ZoneRotationCard />
            {/* Today's Duties */}
            <TodaysDutiesCard />
            {/* Belle */}
            <BelleCard />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Quick Commands
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <QuickActionButton
                icon={
                  <span className="relative">
                    <Zap className="h-5 w-5" />
                    {greenlightActive && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </span>
                }
                label={greenlightActive ? "Update Family Alert" : "Post Family Alert"}
                color="primary"
                onClick={() => setGreenlightOpen(true)}
              />
              <QuickActionButton
                icon={<DollarSign className="h-5 w-5" />}
                label="Log Revenue"
                color="green"
                onClick={() => setRevenueOpen(true)}
              />
              <QuickActionButton
                icon={<Home className="h-5 w-5" />}
                label="Check Zones"
                color="orange"
                onClick={() => setZonesOpen(true)}
              />
            </div>
          </div>
        </div>

        <PostGreenlightModal open={greenlightOpen} onClose={() => setGreenlightOpen(false)} onPosted={() => { setGreenlightActive(prev => !prev); fetchDashboardData() }} />
        <LogRevenueModal open={revenueOpen} onClose={() => setRevenueOpen(false)} onLogged={fetchDashboardData} />
        <CheckZonesPanel open={zonesOpen} onClose={() => setZonesOpen(false)} />
      </div>
    </div>
  )
}

// Fixed weekly schedules (do not rotate)
const DINNER_MANAGER: Record<number, string> = {
  0: 'Levi',             // Sunday
  1: 'Kaylee',           // Monday
  2: 'Zoey',             // Tuesday
  3: 'Wyatt',            // Wednesday
  4: 'Amos',             // Thursday
  5: 'Ellie & Hannah',   // Friday
  6: 'Lola',             // Saturday
}

const LAUNDRY_SCHEDULE: Record<number, { who: string; note: string }> = {
  0: { who: 'Wyatt',                    note: 'towels + overflow' },
  1: { who: 'Levi',                     note: 'work clothes' },
  2: { who: 'Lola',                     note: 'personal + sheets' },
  3: { who: 'Ellie, Hannah & Kaylee',   note: '' },
  4: { who: 'Amos',                     note: '' },
  5: { who: 'Ellie, Hannah & Kaylee',   note: '' },
  6: { who: 'Zoey',                     note: 'bedding day' },
}

const DISHES_SCHEDULE = {
  breakfast: 'Amos & Wyatt',
  lunch: 'Ellie & Hannah',
  dinner: 'Zoey & Kaylee',
}

interface TonightMeal {
  meal_name: string | null
  recipe_id: string | null
}

interface RecipeData {
  title: string
  ingredients: string[]
  steps: string[]
}

function TodaysDutiesCard() {
  const day = new Date().getDay()
  const dinner = DINNER_MANAGER[day]
  const laundry = LAUNDRY_SCHEDULE[day]

  const [tonightMeal, setTonightMeal] = useState<TonightMeal | null>(null)
  const [recipeModal, setRecipeModal] = useState<RecipeData | null>(null)
  const [mealLoaded, setMealLoaded] = useState(false)

  // Fetch tonight's meal
  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
    fetch(`/api/meal-plan?start=${today}&end=${today}`)
      .then(r => r.json())
      .then((rows: { meal_name: string | null; recipe_id: string | null }[]) => {
        if (rows.length > 0) {
          setTonightMeal({ meal_name: rows[0].meal_name, recipe_id: rows[0].recipe_id })
        }
        setMealLoaded(true)
      })
      .catch(() => setMealLoaded(true))
  }, [])

  const openRecipe = async () => {
    if (!tonightMeal) return
    if (tonightMeal.recipe_id) {
      try {
        const res = await fetch(`/api/recipes?id=${tonightMeal.recipe_id}`)
        if (res.ok) {
          const recipe = await res.json()
          setRecipeModal({ title: recipe.title, ingredients: recipe.ingredients || [], steps: recipe.steps || [] })
          return
        }
      } catch {}
    }
    // No recipe attached — show informational modal
    setRecipeModal({ title: tonightMeal.meal_name || '', ingredients: [], steps: [] })
  }

  return (
    <>
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold text-gray-900">
          Today's Duties
        </h2>
      </div>
      <div className="p-6 space-y-4">
        {/* Dinner Manager */}
        <div className="flex items-start gap-3">
          <Utensils className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Dinner Manager</p>
            <p className="text-sm font-semibold text-gray-900">{dinner}</p>
            {mealLoaded && (
              <div className="mt-1">
                {tonightMeal?.meal_name ? (
                  <button
                    onClick={openRecipe}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium hover:bg-green-200 transition-colors"
                  >
                    🍽️ {tonightMeal.meal_name}
                  </button>
                ) : (
                  <p className="text-xs text-gray-400">No meal planned yet</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Laundry */}
        <div className="flex items-start gap-3">
          <Shirt className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Laundry</p>
            <p className="text-sm font-semibold text-gray-900">{laundry.who}</p>
            {laundry.note && (
              <p className="text-xs text-gray-500">{laundry.note}</p>
            )}
          </div>
        </div>

        {/* Dishes */}
        <div className="border-t pt-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Dishes & Cleanup</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Breakfast</span>
              <span className="font-medium text-gray-900">{DISHES_SCHEDULE.breakfast}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Lunch</span>
              <span className="font-medium text-gray-900">{DISHES_SCHEDULE.lunch}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Dinner</span>
              <span className="font-medium text-gray-900">{DISHES_SCHEDULE.dinner}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Recipe View Modal */}
    {recipeModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setRecipeModal(null)}>
        <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="p-6 border-b flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">{recipeModal.title}</h3>
            <button onClick={() => setRecipeModal(null)} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 space-y-6">
            {recipeModal.ingredients.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Ingredients</h4>
                <ul className="space-y-1">
                  {recipeModal.ingredients.map((ing, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-700">
                      <span className="text-green-500 mt-0.5">•</span>
                      <span className="text-base">{ing}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {recipeModal.steps.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Steps</h4>
                <ol className="space-y-3">
                  {recipeModal.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-7 h-7 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-sm font-bold">{i + 1}</span>
                      <span className="text-base text-gray-800 pt-0.5 leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {recipeModal.ingredients.length === 0 && recipeModal.steps.length === 0 && (
              <p className="text-gray-400 text-center py-4">No recipe added yet.</p>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  )
}

// Helper Components
function EventCard({ event }: { event: FamilyEvent }) {
  const startTime = new Date(event.start_time)
  const isUpcoming = startTime.getTime() - Date.now() < 4 * 60 * 60 * 1000 // Next 4 hours
  
  return (
    <div className={`p-4 rounded-lg border ${
      isUpcoming ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-1">
            <h3 className="font-medium text-gray-900">{event.title}</h3>
            {event.swap_flag && (
              <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                SWAP PENDING
              </span>
            )}
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              <span>{startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              {event.captain_name && (
                <>
                  <span className="mx-2">•</span>
                  <Users className="h-4 w-4 mr-1" />
                  <span>Captain: {event.captain_name}</span>
                </>
              )}
            </div>
            {event.location && (
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                <span>{event.location}</span>
              </div>
            )}
            {event.contact_info && (
              <div className="flex items-center">
                <Phone className="h-4 w-4 mr-1" />
                <span>{event.contact_info}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function QuickActionButton({ 
  icon, 
  label, 
  color, 
  onClick 
}: { 
  icon: React.ReactNode
  label: string
  color: 'primary' | 'blue' | 'green' | 'orange'
  onClick: () => void
}) {
  const colorClasses = {
    primary: 'bg-primary-50 text-primary-700 hover:bg-primary-100',
    blue: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
    green: 'bg-green-50 text-green-700 hover:bg-green-100',
    orange: 'bg-orange-50 text-orange-700 hover:bg-orange-100'
  }

  return (
    <button 
      className={`p-4 rounded-lg font-medium transition-colors flex flex-col items-center space-y-2 ${colorClasses[color]}`}
      onClick={onClick}
    >
      {icon}
      <span className="text-sm">{label}</span>
    </button>
  )
}

// ── Belle Card ──────────────────────────────────────────────────

const BELLE_WEEKDAY_HELPERS: Record<number, string> = {
  1: 'Kaylee', 2: 'Amos', 3: 'Hannah', 4: 'Wyatt', 5: 'Ellie',
}

// 5-week weekend rotation: Hannah → Wyatt → Amos → Kaylee → Ellie → repeat
const BELLE_WEEKEND_ROTATION = ['Hannah', 'Wyatt', 'Amos', 'Kaylee', 'Ellie']
const BELLE_WEEKEND_ANCHOR = new Date(2026, 2, 28) // Saturday March 28, 2026 = Week 1 (Hannah)
const BELLE_WEEKEND_OFFSET = 0

function getBelleWeekendHelper(date: Date): string {
  const sat = new Date(date)
  if (sat.getDay() === 0) sat.setDate(sat.getDate() - 1) // Sunday → use preceding Saturday
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const weeksSince = Math.floor((sat.getTime() - BELLE_WEEKEND_ANCHOR.getTime()) / msPerWeek)
  const idx = (((weeksSince + BELLE_WEEKEND_OFFSET) % 5) + 5) % 5
  return BELLE_WEEKEND_ROTATION[idx]
}

function getBelleHelper(dayOfWeek: number, date: Date): string {
  if (dayOfWeek >= 1 && dayOfWeek <= 5) return BELLE_WEEKDAY_HELPERS[dayOfWeek]
  return getBelleWeekendHelper(date)
}

function isBelleGroomingWeekend(date: Date): boolean {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const weeksSince = Math.floor((date.getTime() - BELLE_WEEKEND_ANCHOR.getTime()) / msPerWeek)
  return weeksSince % 2 === 0
}

function getBelleWeekDates(today: Date): Date[] {
  const dayOfWeek = today.getDay()
  // Monday = day 1, so shift: Mon=0, Tue=1, ..., Sun=6
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7)) // Back to Monday
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

const BELLE_TASKS_KEY = 'belle-daily-tasks'
const BELLE_DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getBelleTodayKey(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
}

function loadBelleTasks(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(BELLE_TASKS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as { date: string; tasks: string[] }
    if (parsed.date === getBelleTodayKey()) return parsed.tasks
  } catch {}
  return []
}

function saveBelleTasks(tasks: string[]) {
  localStorage.setItem(BELLE_TASKS_KEY, JSON.stringify({ date: getBelleTodayKey(), tasks }))
}

const BELLE_DAILY_TASKS = [
  { id: 'am-feed-walk', label: 'AM Feed + Walk', time: '7:00 AM' },
  { id: 'pm-feed', label: 'PM Feed', time: '5:00 PM' },
  { id: 'pm-walk', label: 'PM Walk', time: '6:30 PM' },
]

function BelleCard() {
  const today = new Date()
  const todayDay = today.getDay()
  const todayHelper = getBelleHelper(todayDay, today)
  const grooming = isBelleGroomingWeekend(today)
  const weekDates = getBelleWeekDates(today)

  const [checked, setChecked] = useState<string[]>([])

  useEffect(() => {
    setChecked(loadBelleTasks())
  }, [])

  // Midnight reset timer
  useEffect(() => {
    const chicagoNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
    const midnight = new Date(chicagoNow)
    midnight.setDate(midnight.getDate() + 1)
    midnight.setHours(0, 0, 0, 0)
    const ms = midnight.getTime() - chicagoNow.getTime()
    const timer = setTimeout(() => { setChecked([]); saveBelleTasks([]) }, Math.max(ms, 1000))
    return () => clearTimeout(timer)
  }, [checked])

  const toggleTask = (id: string) => {
    setChecked(prev => {
      const next = prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
      saveBelleTasks(next)
      return next
    })
  }

  // Build extra grooming tasks for today
  const extraTasks: { id: string; label: string; time: string; emoji: string }[] = []
  if (grooming && todayDay === 6) extraTasks.push({ id: 'bath', label: 'Bath Time', time: '10:00 AM', emoji: '🛁' })
  if (grooming && todayDay === 0) extraTasks.push({ id: 'nail', label: 'Nail Trim', time: '10:00 AM', emoji: '💅' })

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="p-4 border-b bg-purple-50 rounded-t-lg flex items-center gap-2">
        <Dog className="h-5 w-5 text-purple-600" />
        <h2 className="text-lg font-semibold text-purple-900">Belle</h2>
        <span className="ml-auto bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full text-xs font-semibold">
          {todayHelper}
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Today's tasks with checkboxes */}
        <div className="space-y-2">
          {BELLE_DAILY_TASKS.map(task => {
            const done = checked.includes(task.id)
            return (
              <div key={task.id} className="flex items-center gap-2">
                <button onClick={() => toggleTask(task.id)} className="flex-shrink-0">
                  {done ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />
                  )}
                </button>
                <span className={`text-sm flex-1 ${done ? 'line-through text-gray-400' : 'text-gray-700'}`}>{task.label}</span>
                <span className="text-xs text-gray-400">{task.time}</span>
              </div>
            )
          })}
          {extraTasks.map(task => {
            const done = checked.includes(task.id)
            return (
              <div key={task.id} className="flex items-center gap-2">
                <button onClick={() => toggleTask(task.id)} className="flex-shrink-0">
                  {done ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />
                  )}
                </button>
                <span className={`text-sm flex-1 ${done ? 'line-through text-gray-400' : 'text-gray-700'}`}>{task.emoji} {task.label}</span>
                <span className="text-xs text-gray-400">{task.time}</span>
              </div>
            )
          })}
        </div>

        {/* This Week strip */}
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">This Week</p>
          <div className="grid grid-cols-7 gap-1.5">
            {weekDates.map((date, i) => {
              const dayNum = date.getDay()
              const isToday = date.toDateString() === today.toDateString()
              const helper = getBelleHelper(dayNum, date)
              const groomWeek = isBelleGroomingWeekend(date)

              return (
                <div
                  key={i}
                  className={`text-center rounded-lg py-2 px-1 ${
                    isToday ? 'bg-purple-100 border-2 border-purple-400' : 'bg-gray-50 border border-gray-200'
                  }`}
                >
                  <p className={`text-[10px] font-semibold uppercase ${isToday ? 'text-purple-700' : 'text-gray-500'}`}>
                    {BELLE_DAY_NAMES[dayNum]}
                  </p>
                  <p className={`text-xs font-medium mt-0.5 ${isToday ? 'text-purple-700' : 'text-gray-700'}`}>
                    {helper}
                  </p>
                  {isToday && <Dog className="w-3 h-3 mx-auto mt-0.5 text-purple-500" />}
                  {groomWeek && dayNum === 6 && <div className="text-xs mt-0.5">🛁</div>}
                  {groomWeek && dayNum === 0 && <div className="text-xs mt-0.5">💅</div>}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper functions
function getCurrentDayRotation() {
  const day = new Date().getDay()
  const rotations = {
    1: 'Mon: Lola', // Monday
    2: 'Tue: Levi', // Tuesday
    3: 'Wed: Lola', // Wednesday
    4: 'Thu: Levi', // Thursday
    5: 'Fri: Levi', // Friday
    6: 'Sat: Alt',  // Saturday
    0: 'Sun: Alt'   // Sunday
  }
  return rotations[day as keyof typeof rotations] || 'Check schedule'
}

function getNextPickupWindow() {
  const now = new Date()
  const minutes = now.getMinutes()
  
  if (minutes < 15) return ':15'
  if (minutes < 45) return ':45'
  return `${now.getHours() + 1}:15`
}

function ZoneRotationCard() {
  const assignments = getCurrentZoneAssignments()
  const zoneWeek = getCurrentZoneWeek()
  const { start, end } = getCurrentZoneWeekRange()

  const formatShortDate = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const zoneColors: Record<string, string> = {
    'Kitchen': 'bg-amber-100 text-amber-800',
    'Hotspot': 'bg-red-100 text-red-800',
    'Guest Bathroom': 'bg-indigo-100 text-indigo-800',
    'Kids Bathroom': 'bg-purple-100 text-purple-800',
    'Pantry': 'bg-emerald-100 text-emerald-800',
    'Floors': 'bg-orange-100 text-orange-800',
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold text-gray-900">
          Zone Rotation
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Week {zoneWeek} of 6 &middot; {formatShortDate(start)} – {formatShortDate(end)}
        </p>
      </div>
      <div className="p-6">
        <div className="space-y-3">
          {assignments.map(({ kid, zone }) => (
            <div key={kid} className="flex items-center justify-between text-sm">
              <span className="text-gray-700 font-medium">{kid}</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${zoneColors[zone] || 'bg-gray-100 text-gray-800'}`}>
                {zone}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}