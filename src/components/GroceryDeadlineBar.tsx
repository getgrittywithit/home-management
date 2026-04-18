'use client'

import { useState, useEffect } from 'react'
import { Clock, Lock, AlertTriangle } from 'lucide-react'

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

interface GrocerySettings {
  pickup_day_1: number
  pickup_day_2: number
  deadline_hours_before: number
  auto_assign_on_miss: boolean
}

interface Props {
  kidName: string
}

export default function GroceryDeadlineBar({ kidName }: Props) {
  const [settings, setSettings] = useState<GrocerySettings | null>(null)
  const [autoAssigned, setAutoAssigned] = useState(false)

  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
  const todayDow = (now.getDay() + 6) % 7 // Mon=0

  useEffect(() => {
    fetch('/api/meal-plan/week?action=get_grocery_settings')
      .then(r => r.json())
      .then(data => {
        if (data.settings) setSettings(data.settings)
      })
      .catch(() => {})
  }, [])

  // Auto-assign check: if deadline passed and auto_assign enabled
  useEffect(() => {
    if (!settings?.auto_assign_on_miss) return

    // Check if any deadline has passed for next week
    const deadlines = getDeadlineInfo(settings)
    const pastDeadline = deadlines.find(d => d.isPast)
    if (!pastDeadline) return

    // Trigger auto-assign for next week (the API handles idempotency — already-picked days are skipped)
    const nextMonday = getNextMonday()
    fetch('/api/meal-plan/week', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'auto_assign_unpicked', week_start: nextMonday }),
    })
      .then(r => r.json())
      .then(data => { if (data.auto_assigned > 0) setAutoAssigned(true) })
      .catch(() => {})
  }, [settings])

  // Fire deadline notification for this kid if needed
  useEffect(() => {
    if (!settings) return
    const deadlines = getDeadlineInfo(settings)
    const todayDeadline = deadlines.find(d => d.isDeadlineDay && !d.isPast)
    if (!todayDeadline || now.getHours() < 12) return

    // Check if kid has already picked
    fetch('/api/meal-plan/week?action=get_current_and_next')
      .then(r => r.json())
      .then(data => {
        const nextDays = data.next_week?.days || []
        const kid = kidName.toLowerCase()
        const unpicked = nextDays.filter((d: any) =>
          !d.meal_id && d.kid_name !== 'parents' && d.status !== 'off_night' &&
          (d.kid_name === kid || (kid === 'hannah' && d.kid_name === 'ellie'))
        )
        if (unpicked.length > 0) {
          const displayName = kidName.charAt(0).toUpperCase() + kidName.slice(1)
          fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'create',
              title: `${displayName} hasn't picked dinner yet`,
              message: `Picks lock at ${todayDeadline.deadlineTimeDisplay} today.`,
              source_type: 'meal_deadline',
              source_ref: `deadline-${kid}-${now.toLocaleDateString('en-CA')}`,
              link_tab: 'food-meals',
              icon: '⏰',
            }),
          }).catch(() => {})
        }
      })
      .catch(() => {})
  }, [settings, kidName])

  function getNextMonday(): string {
    const d = new Date(now)
    d.setDate(d.getDate() + (7 - todayDow))
    if (todayDow === 0) d.setDate(d.getDate() + 7) // if already Monday, go to next
    return d.toLocaleDateString('en-CA')
  }

  function getDeadlineInfo(s: GrocerySettings) {
    // Each pickup day has a deadline: deadline_hours_before hours before midnight of pickup day
    // Deadline falls on (pickup_day - 1) if hours < 24, or earlier
    const deadlines = [s.pickup_day_1, s.pickup_day_2].map(pickupDow => {
      const hoursBeforeMidnight = s.deadline_hours_before
      const daysBack = hoursBeforeMidnight >= 24 ? 2 : 1
      const deadlineDow = (pickupDow + 7 - daysBack) % 7
      const deadlineHour = (24 - (hoursBeforeMidnight % 24)) % 24

      const isDeadlineDay = todayDow === deadlineDow
      // Is the deadline past?
      const isPast = todayDow > deadlineDow || (todayDow === deadlineDow && now.getHours() >= deadlineHour)

      const ampm = deadlineHour >= 12 ? 'pm' : 'am'
      const displayHour = deadlineHour > 12 ? deadlineHour - 12 : deadlineHour === 0 ? 12 : deadlineHour

      return {
        pickupDow,
        pickupDay: DAY_NAMES[pickupDow],
        deadlineDow,
        deadlineDay: DAY_NAMES[deadlineDow],
        deadlineHour,
        deadlineTimeDisplay: `${displayHour}${ampm}`,
        isDeadlineDay,
        isPast,
      }
    })
    return deadlines
  }

  if (!settings) return null

  const deadlines = getDeadlineInfo(settings)

  // Find the most relevant deadline (next upcoming or today)
  const todayDeadline = deadlines.find(d => d.isDeadlineDay && !d.isPast)
  const pastDeadline = deadlines.find(d => d.isPast && d.isDeadlineDay)
  const nextDeadline = deadlines.sort((a, b) => {
    const aDist = ((a.deadlineDow - todayDow) + 7) % 7
    const bDist = ((b.deadlineDow - todayDow) + 7) % 7
    return aDist - bDist
  })[0]

  if (autoAssigned) {
    return (
      <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-2.5 flex items-center gap-2 text-sm text-gray-600">
        <Lock className="w-4 h-4 text-gray-400 shrink-0" />
        <span>🔒 Picks locked — some meals were auto-assigned by Mom&apos;s system</span>
      </div>
    )
  }

  if (pastDeadline) {
    return (
      <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-2.5 flex items-center gap-2 text-sm text-gray-600">
        <Lock className="w-4 h-4 text-gray-400 shrink-0" />
        <span>🔒 Some picks locked — next deadline {nextDeadline?.deadlineDay} at {nextDeadline?.deadlineTimeDisplay}</span>
      </div>
    )
  }

  if (todayDeadline) {
    return (
      <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 flex items-center gap-2 text-sm text-amber-700 font-medium">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
        <span>⏰ Picks lock TODAY at {todayDeadline.deadlineTimeDisplay}!</span>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-2.5 flex items-center gap-2 text-sm text-blue-700">
      <Clock className="w-4 h-4 text-blue-400 shrink-0" />
      <span>🕐 Picks lock {nextDeadline?.deadlineDay} at {nextDeadline?.deadlineTimeDisplay}</span>
    </div>
  )
}
