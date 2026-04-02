'use client'

import { useState } from 'react'
import { ChefHat, Check, Clock, AlertCircle } from 'lucide-react'

const DINNER_ROTATION: Record<string, Record<string, { kid: string; theme: string; emoji: string; label: string }>> = {
  week1: {
    monday: { kid: 'kaylee', theme: 'american-comfort', emoji: '🇺🇸', label: 'American Comfort' },
    tuesday: { kid: 'zoey', theme: 'asian', emoji: '🥡', label: 'Asian Night' },
    wednesday: { kid: 'wyatt', theme: 'bar-night', emoji: '🥗', label: 'Bar Night' },
    thursday: { kid: 'amos', theme: 'mexican', emoji: '🌮', label: 'Mexican Night' },
    friday: { kid: 'ellie', theme: 'pizza-italian', emoji: '🍕', label: 'Pizza & Italian' },
    saturday: { kid: 'parents', theme: 'grill', emoji: '🔥', label: 'Grill Night' },
    sunday: { kid: 'parents', theme: 'roast-comfort', emoji: '🏡', label: 'Roast/Comfort' },
  },
  week2: {
    monday: { kid: 'kaylee', theme: 'soup-comfort', emoji: '🍲', label: 'Soup/Comfort' },
    tuesday: { kid: 'zoey', theme: 'asian', emoji: '🥡', label: 'Asian Night' },
    wednesday: { kid: 'wyatt', theme: 'easy-lazy', emoji: '🥪', label: 'Easy/Lazy Night' },
    thursday: { kid: 'amos', theme: 'mexican', emoji: '🌮', label: 'Mexican Night' },
    friday: { kid: 'hannah', theme: 'pizza-italian', emoji: '🍕', label: 'Pizza & Italian' },
    saturday: { kid: 'parents', theme: 'experiment', emoji: '🔬', label: 'Experiment/Big Cook' },
    sunday: { kid: 'parents', theme: 'brunch', emoji: '🍳', label: 'Brunch Sunday' },
  },
}

const KID_DISPLAY: Record<string, string> = {
  kaylee: 'Kaylee', zoey: 'Zoey', wyatt: 'Wyatt', amos: 'Amos',
  ellie: 'Ellie', hannah: 'Hannah', parents: 'Parents',
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function WeeklyDinnerRotation() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
  const EPOCH = new Date('2026-03-30T00:00:00')
  const weeks = Math.floor((now.getTime() - EPOCH.getTime()) / (7 * 24 * 60 * 60 * 1000))
  const currentWeek = weeks % 2 === 0 ? 1 : 2

  const [viewWeek, setViewWeek] = useState(currentWeek)

  // Get Monday of current week
  const dayOfWeek = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7))

  const weekKey = `week${viewWeek}`
  const rotation = DINNER_ROTATION[weekKey] || {}
  const todayName = DAYS[(dayOfWeek + 6) % 7] // Convert Sunday=0 to Monday-first

  const getSeason = () => {
    const month = now.getMonth() + 1
    return (month >= 3 && month <= 8) ? 'Spring/Summer' : 'Fall/Winter'
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 text-white">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <ChefHat className="w-5 h-5" />
            Dinner Rotation — Week {viewWeek}
          </h3>
          <div className="flex gap-1">
            <button
              onClick={() => setViewWeek(1)}
              className={`px-3 py-1 rounded text-xs font-medium ${viewWeek === 1 ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'}`}
            >
              Week 1
            </button>
            <button
              onClick={() => setViewWeek(2)}
              className={`px-3 py-1 rounded text-xs font-medium ${viewWeek === 2 ? 'bg-white/30' : 'bg-white/10 hover:bg-white/20'}`}
            >
              Week 2
            </button>
          </div>
        </div>
        <p className="text-orange-100 text-xs mt-1">
          {monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {
            new Date(monday.getTime() + 6 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          } · {getSeason()} menu
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500 bg-gray-50">
              <th className="p-3 font-medium">Day</th>
              <th className="p-3 font-medium">Manager</th>
              <th className="p-3 font-medium">Theme</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {DAYS.map((day, i) => {
              const entry = rotation[day]
              if (!entry) return null
              const isToday = day === todayName && viewWeek === currentWeek
              const dateStr = new Date(monday.getTime() + i * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

              return (
                <tr key={day} className={isToday ? 'bg-orange-50' : 'hover:bg-gray-50'}>
                  <td className="p-3">
                    <div className="font-medium text-gray-900">
                      {DAY_SHORT[i]}
                      {isToday && <span className="ml-1.5 text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded-full">TODAY</span>}
                    </div>
                    <div className="text-xs text-gray-400">{dateStr}</div>
                  </td>
                  <td className="p-3">
                    <span className="font-medium text-gray-800 capitalize">
                      {KID_DISPLAY[entry.kid] || entry.kid}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1.5">
                      <span>{entry.emoji}</span>
                      <span className="text-gray-700">{entry.label}</span>
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
