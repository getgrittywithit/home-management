'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, Sparkles, ChevronDown, ChevronUp, CheckCircle2, Circle } from 'lucide-react'
import {
  DAILY_FOCUS,
  MONTHLY_HABITS
} from '@/lib/choresConfig'
import { getCurrentZoneAssignments, getCurrentZoneWeek, getCurrentZoneWeekRange, type ZoneName } from '@/lib/zoneRotation'

const ZONE_COLORS: Record<ZoneName, string> = {
  'Kitchen': 'bg-amber-100 text-amber-800',
  'Hotspot': 'bg-red-100 text-red-800',
  'Pantry': 'bg-emerald-100 text-emerald-800',
  'Floors': 'bg-orange-100 text-orange-800',
  'Kids Bathroom': 'bg-purple-100 text-purple-800',
  'Guest Bathroom': 'bg-indigo-100 text-indigo-800',
}

interface ZoneProgress {
  kid: string
  zone: ZoneName
  total: number
  completed: number
  tasks: { task_text: string; completed: boolean }[]
}

interface ChoresTabProps {
  familyMembers?: { name: string; age: number; role: 'parent' | 'child' }[]
  isParent?: boolean
}

export default function ChoresTab({ familyMembers = [], isParent = true }: ChoresTabProps) {
  const [progress, setProgress] = useState<ZoneProgress[]>([])
  const [expandedKid, setExpandedKid] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  const zoneWeek = getCurrentZoneWeek()
  const { start, end } = getCurrentZoneWeekRange()
  const assignments = getCurrentZoneAssignments()
  const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const getDayName = (day: number) => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day]
  const getCurrentMonthHabit = () => MONTHLY_HABITS.find(h => h.month === new Date().getMonth() + 1)

  // Zone key mapping from display names to DB zone_keys
  const ZONE_DB_KEY: Record<string, string> = {
    'Kitchen': 'kitchen_zone',
    'Hotspot': 'hotspot',
    'Pantry': 'pantry',
    'Floors': 'floors',
    'Kids Bathroom': 'kids_bathroom',
    'Guest Bathroom': 'guest_bathroom',
  }

  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
    const fetches = assignments.map(({ kid, zone }) => {
      const zoneKey = ZONE_DB_KEY[zone] || zone.toLowerCase().replace(/\s+/g, '_')
      return fetch(`/api/kids/zone-tasks?action=get_zone_tasks&zone=${zoneKey}&kid=${kid.toLowerCase()}&date=${today}`)
        .then(r => r.json())
        .then(data => ({
          kid,
          zone,
          total: data.total || 0,
          completed: data.completed_count || 0,
          tasks: (data.tasks || []).map((t: any) => ({ task_text: t.task_text, completed: t.completed })),
        }))
        .catch(() => ({ kid, zone, total: 0, completed: 0, tasks: [] }))
    })

    Promise.all(fetches).then(results => {
      setProgress(results)
      setLoaded(true)
    })
  }, [])

  const getStatus = (p: ZoneProgress) => {
    if (p.total === 0) return { label: 'No Tasks', color: 'text-gray-400', icon: '—' }
    if (p.completed === p.total) return { label: 'Done', color: 'text-green-600', icon: '✅' }
    if (p.completed > 0) return { label: 'In Progress', color: 'text-amber-600', icon: '🔄' }
    return { label: 'Not Started', color: 'text-gray-400', icon: '⏳' }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 rounded-lg">
        <h2 className="text-2xl font-bold mb-2">Family Chore System</h2>
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{getDayName(new Date().getDay())}&apos;s Focus: {DAILY_FOCUS[getDayName(new Date().getDay()).toLowerCase() as keyof typeof DAILY_FOCUS]}</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>Monthly Habit: {getCurrentMonthHabit()?.habit}</span>
          </div>
        </div>
        <p className="text-purple-200 text-sm mt-2">Week {zoneWeek} of 6 &middot; {formatDate(start)} – {formatDate(end)}</p>
      </div>

      {/* Zone Status Board */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-bold text-gray-900">Zone Status Board</h3>
          <p className="text-xs text-gray-500 mt-0.5">Tap a row to see task details</p>
        </div>

        {!loaded ? (
          <div className="p-8 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500" />
          </div>
        ) : (
          <div className="divide-y">
            {progress.map(p => {
              const status = getStatus(p)
              const pct = p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0
              const isExpanded = expandedKid === p.kid

              return (
                <div key={p.kid}>
                  <button
                    onClick={() => setExpandedKid(isExpanded ? null : p.kid)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium text-sm text-gray-900 w-20 text-left">{p.kid}</span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${ZONE_COLORS[p.zone] || 'bg-gray-100 text-gray-700'}`}>
                      {p.zone}
                    </span>
                    <div className="flex-1 mx-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${pct === 100 ? 'bg-green-500' : pct > 0 ? 'bg-amber-400' : 'bg-gray-200'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 w-10 text-right">{pct}%</span>
                    <span className={`text-xs font-medium w-24 text-right ${status.color}`}>
                      {status.icon} {status.label}
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </button>

                  {/* Expandable task detail (read-only) */}
                  {isExpanded && p.tasks.length > 0 && (
                    <div className="px-4 pb-3 bg-gray-50">
                      <div className="pl-20 space-y-1">
                        {p.tasks.map((t, i) => (
                          <div key={i} className="flex items-center gap-2 py-0.5">
                            {t.completed ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                            ) : (
                              <Circle className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                            )}
                            <span className={`text-xs ${t.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                              {t.task_text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
