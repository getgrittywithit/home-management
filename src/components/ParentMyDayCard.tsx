'use client'

import { useState, useEffect } from 'react'
import { Sun, Loader2, ArrowRight } from 'lucide-react'

const BELLE_WEEKDAY: Record<number, string> = { 1: 'Kaylee', 2: 'Amos', 3: 'Hannah', 4: 'Wyatt', 5: 'Ellie' }
const BELLE_WEEKEND_ROTATION = ['Hannah', 'Wyatt', 'Amos', 'Kaylee', 'Ellie']
const BELLE_WEEKEND_EPOCH = new Date('2026-06-13T12:00:00')

const ZONE_NAMES = ['Hotspot', 'Kitchen', 'Guest Bath', 'Kids Bath', 'Pantry', 'Floors']
const ZONE_EPOCH = new Date('2026-03-16T12:00:00')

const MEAL_EPOCH = new Date('2026-03-30T12:00:00')
const MEAL_WEEK1 = [
  { day: 0, manager: 'Parents', theme: 'Roast/Comfort' },
  { day: 1, manager: 'Kaylee', theme: 'American Comfort' },
  { day: 2, manager: 'Zoey', theme: 'Asian Night' },
  { day: 3, manager: 'Wyatt', theme: 'Bar Night' },
  { day: 4, manager: 'Amos', theme: 'Mexican Night' },
  { day: 5, manager: 'Ellie & Hannah', theme: 'Pizza & Italian' },
  { day: 6, manager: 'Levi/Parents', theme: 'Grill Night' },
]
const MEAL_WEEK2 = [
  { day: 0, manager: 'Parents', theme: 'Brunch/Light' },
  { day: 1, manager: 'Kaylee', theme: 'Soup/Comfort/Crockpot' },
  { day: 2, manager: 'Zoey', theme: 'Asian Night' },
  { day: 3, manager: 'Wyatt', theme: 'Easy/Lazy Night' },
  { day: 4, manager: 'Amos', theme: 'Mexican Night' },
  { day: 5, manager: 'Ellie & Hannah', theme: 'Pizza & Italian' },
  { day: 6, manager: 'Levi/Parents', theme: 'Experiment/Big Cook' },
]

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface ParentMyDayCardProps {
  onNavigate?: (tab: string) => void
}

export default function ParentMyDayCard({ onNavigate }: ParentMyDayCardProps) {
  const [items, setItems] = useState<string[]>([])
  const [manualCount, setManualCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => { buildBriefing() }, [])

  const buildBriefing = async () => {
    const now = new Date()
    const chicagoStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
    const chicagoDate = new Date(chicagoStr + 'T12:00:00')
    const dow = chicagoDate.getDay()
    const dayName = DAY_NAMES[dow]
    const briefing: string[] = []

    // Meds (only show before 9am AND only if at least one AM med is NOT paused)
    const chicagoHour = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' })).getHours()
    if (dow >= 1 && dow <= 5 && chicagoHour < 9) {
      try {
        const pausedRes = await fetch('/api/med-toggle?action=get_all').then(r => r.json())
        const paused: Array<{ kid_name: string; med_key: string; is_paused: boolean }> = pausedRes.medications || []
        const isPausedAM = (kid: string) => paused.some(p => p.kid_name === kid && p.med_key === 'am' && p.is_paused)
        const active = ['amos', 'wyatt'].filter(k => !isPausedAM(k))
        if (active.length > 0) {
          const names = active.map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(' & ')
          briefing.push(`\uD83D\uDC8A Meds: ${names} need AM Focalin`)
        }
      } catch { /* silent — skip med line if API fails */ }
    }

    // Belle
    if (dow >= 1 && dow <= 5) {
      briefing.push(`\uD83D\uDC15 Belle: ${BELLE_WEEKDAY[dow]}'s day (${dayName.slice(0, 3)})`)
    } else {
      const sat = new Date(chicagoDate)
      sat.setDate(sat.getDate() + (6 - dow)) // next/this Saturday
      const weeks = Math.floor((sat.getTime() - BELLE_WEEKEND_EPOCH.getTime()) / (7 * 86400000))
      const idx = ((weeks % 5) + 5) % 5
      briefing.push(`\uD83D\uDC15 Belle: ${BELLE_WEEKEND_ROTATION[idx]}'s weekend`)
    }

    // Zones
    const zoneWeeks = Math.floor((chicagoDate.getTime() - ZONE_EPOCH.getTime()) / (7 * 86400000))
    const zoneWeekNum = ((zoneWeeks % 6) + 6) % 6 + 1
    briefing.push(`\uD83E\uDDF9 Zones: Week ${zoneWeekNum} of 6`)

    // Dinner
    const mealWeeks = Math.floor((chicagoDate.getTime() - MEAL_EPOCH.getTime()) / (7 * 86400000))
    const mealWeek = mealWeeks % 2 === 0 ? 1 : 2
    const meals = mealWeek === 1 ? MEAL_WEEK1 : MEAL_WEEK2
    const todayMeal = meals.find(m => m.day === dow)
    if (todayMeal) {
      briefing.push(`\uD83C\uDF7D\uFE0F Dinner: ${todayMeal.manager} manages (${todayMeal.theme})`)
    }

    // Upcoming appointments (from calendar API)
    try {
      const calRes = await fetch('/api/calendar?action=get_events&start_date=' + chicagoStr + '&end_date=' + (() => {
        const d = new Date(chicagoDate); d.setDate(d.getDate() + 3); return d.toLocaleDateString('en-CA')
      })()).then(r => r.json()).catch(() => ({ events: [] }))
      const events = calRes.events || []
      for (const ev of events.slice(0, 3)) {
        const evDate = new Date(ev.start)
        const label = evDate.toLocaleDateString('en-CA') === chicagoStr ? 'Today' :
          evDate.toLocaleDateString('en-CA') === (() => { const d = new Date(chicagoDate); d.setDate(d.getDate() + 1); return d.toLocaleDateString('en-CA') })() ? 'Tomorrow' :
          evDate.toLocaleDateString('en-US', { weekday: 'short' })
        briefing.push(`\uD83D\uDCC5 ${label}: ${ev.title}`)
      }
    } catch {}

    // Manual tasks from my-day
    try {
      const myDayRes = await fetch('/api/parent/my-day').then(r => r.json()).catch(() => ({}))
      const manual = myDayRes.manual_tasks || []
      const incomplete = manual.filter((t: any) => !t.completed)
      setManualCount(incomplete.length)
      if (incomplete.length > 0) {
        briefing.push(`\uD83D\uDCCB ${incomplete.length} to-do item${incomplete.length > 1 ? 's' : ''} on your list`)
      }
    } catch {}

    setItems(briefing)
    setLoading(false)
  }

  const chicagoNow = new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: 'America/Chicago' })

  return (
    <div className="bg-white rounded-lg border shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Sun className="w-4 h-4 text-amber-500" /> Lola&apos;s {chicagoNow}
        </h3>
        {onNavigate && (
          <button onClick={() => onNavigate('my-day')} className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5">
            Open Full My Day <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-3 text-gray-400"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></div>
      ) : (
        <div className="space-y-1.5">
          {items.map((item, i) => (
            <p key={i} className="text-sm text-gray-700">{item}</p>
          ))}
          {items.length === 0 && <p className="text-sm text-gray-400">Nothing pressing today!</p>}
        </div>
      )}
    </div>
  )
}
