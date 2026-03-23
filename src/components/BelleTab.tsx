'use client'

import { Dog, Clock, Scissors, Bath } from 'lucide-react'

// Fixed weekday helpers (do not rotate)
const WEEKDAY_HELPERS: Record<number, string> = {
  1: 'Kaylee',  // Monday
  2: 'Amos',    // Tuesday
  3: 'Hannah',  // Wednesday
  4: 'Wyatt',   // Thursday
  5: 'Ellie',   // Friday
}

// Weekend helpers rotate on a 5-week cycle
const WEEKEND_ROTATION = ['Amos', 'Kaylee', 'Hannah', 'Wyatt', 'Ellie']

// Grooming happens biweekly: bath on Saturday, nail trim on Sunday
// Week 1 of grooming cycle aligns with week 1 of weekend rotation
const GROOMING_CYCLE_START = new Date(2026, 2, 15) // March 15, 2026 (Sunday)

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getWeekendCycleWeek(today: Date = new Date()): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const weeksSinceStart = Math.floor((today.getTime() - GROOMING_CYCLE_START.getTime()) / msPerWeek)
  return (((weeksSinceStart % 5) + 5) % 5)
}

function getWeekendHelper(today: Date = new Date()): string {
  return WEEKEND_ROTATION[getWeekendCycleWeek(today)]
}

function isGroomingWeekend(today: Date = new Date()): boolean {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const weeksSinceStart = Math.floor((today.getTime() - GROOMING_CYCLE_START.getTime()) / msPerWeek)
  return weeksSinceStart % 2 === 0
}

function getHelperForDay(dayOfWeek: number, today: Date = new Date()): string {
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    return WEEKDAY_HELPERS[dayOfWeek]
  }
  // Weekend
  return getWeekendHelper(today)
}

function getWeekDates(today: Date = new Date()): Date[] {
  const dayOfWeek = today.getDay()
  const sunday = new Date(today)
  sunday.setDate(today.getDate() - dayOfWeek)
  sunday.setHours(0, 0, 0, 0)

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday)
    d.setDate(sunday.getDate() + i)
    return d
  })
}

export default function BelleTab() {
  const today = new Date()
  const todayDay = today.getDay()
  const todayHelper = getHelperForDay(todayDay, today)
  const grooming = isGroomingWeekend(today)
  const weekDates = getWeekDates(today)
  const isThursdayOrLater = todayDay >= 4 // Thursday=4

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 rounded-lg">
        <div className="flex items-center gap-3">
          <Dog className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">Belle</h1>
            <p className="text-purple-100">Guardian of Belle's Mystical Wardrobe</p>
          </div>
        </div>
      </div>

      {/* Today */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Today</h2>
          <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
            {todayHelper}
          </span>
        </div>

        <div className="space-y-3">
          <TaskRow time="7:00 AM" label="AM Feed + Walk" />
          <TaskRow time="5:00 PM" label="PM Feed" />
          <TaskRow time="6:30 PM" label="PM Walk" />

          {/* Grooming tasks on grooming weekends */}
          {grooming && todayDay === 6 && (
            <TaskRow time="10:00 AM" label="Bath Time" icon="bath" />
          )}
          {grooming && todayDay === 0 && (
            <TaskRow time="10:00 AM" label="Nail Trim" icon="nail" />
          )}
        </div>
      </div>

      {/* This Week */}
      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-bold text-gray-900 mb-4">This Week</h2>

        <div className="grid grid-cols-7 gap-2">
          {weekDates.map((date, i) => {
            const dayNum = date.getDay()
            const isToday = date.toDateString() === today.toDateString()
            const isWeekend = dayNum === 0 || dayNum === 6
            const showWeekendHelper = isThursdayOrLater || !isWeekend
            const helper = getHelperForDay(dayNum, date)
            const groomingThisWeek = isGroomingWeekend(date)
            const showBathBadge = groomingThisWeek && dayNum === 6 && showWeekendHelper
            const showNailBadge = groomingThisWeek && dayNum === 0 && showWeekendHelper

            return (
              <div
                key={i}
                className={`text-center rounded-lg p-2 ${
                  isToday
                    ? 'bg-purple-100 border-2 border-purple-400'
                    : isWeekend && !showWeekendHelper
                      ? 'bg-gray-50 border border-gray-200'
                      : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <p className={`text-xs font-semibold uppercase ${
                  isToday ? 'text-purple-700' : 'text-gray-500'
                }`}>
                  {DAY_NAMES[dayNum]}
                </p>
                <p className="text-xs text-gray-400">
                  {date.getMonth() + 1}/{date.getDate()}
                </p>

                {isWeekend && !showWeekendHelper ? (
                  <p className="text-xs text-gray-400 mt-1 italic">TBD</p>
                ) : (
                  <p className={`text-xs font-medium mt-1 ${
                    isToday ? 'text-purple-700' : 'text-gray-700'
                  }`}>
                    {helper}
                  </p>
                )}

                {isToday && (
                  <div className="mt-1">
                    <Dog className="w-4 h-4 mx-auto text-purple-500" />
                  </div>
                )}

                {showBathBadge && (
                  <div className="mt-1 text-sm" title="Bath Day">🛁</div>
                )}
                {showNailBadge && (
                  <div className="mt-1 text-sm" title="Nail Trim">💅</div>
                )}
              </div>
            )
          })}
        </div>

        {grooming && (
          <p className="text-xs text-gray-500 mt-3 text-center">
            🛁 Grooming weekend — Bath on Saturday, Nail Trim on Sunday
          </p>
        )}
      </div>
    </div>
  )
}

function TaskRow({ time, label, icon }: { time: string; label: string; icon?: 'bath' | 'nail' }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex-shrink-0 w-5 h-5 text-gray-400">
        {icon === 'bath' ? (
          <span className="text-lg leading-none">🛁</span>
        ) : icon === 'nail' ? (
          <span className="text-lg leading-none">💅</span>
        ) : (
          <Clock className="w-5 h-5" />
        )}
      </div>
      <div className="flex-1">
        <span className="text-sm font-medium text-gray-900">{label}</span>
      </div>
      <span className="text-xs font-medium text-gray-500">{time}</span>
    </div>
  )
}
