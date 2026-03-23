'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, Clock, CheckCircle2, Users, Sparkles, Home, Edit3, Save, X } from 'lucide-react'
import {
  ZONES,
  DAILY_ROUTINES,
  WEEKLY_BLESSING,
  DAILY_FOCUS,
  AGE_APPROPRIATE_CHORES,
  MONTHLY_HABITS
} from '@/lib/choresConfig'
import { getCurrentZoneAssignments, getCurrentZoneWeek, getCurrentZoneWeekRange, type ZoneName } from '@/lib/zoneRotation'

const ZONE_TASKS: Record<ZoneName, string[]> = {
  'Kitchen': [
    'Flip or run the dishwasher',
    'Hand wash large pans & gadgets that can\'t go in the dishwasher',
    'Shine the sink — leave it empty and gleaming',
    'Wipe down & tidy the island',
    'Sweep the floor',
  ],
  'Hotspot': [
    'Collect & put away shoes on the shoe shelf — keep the walkway clear',
    'Return out-of-place items to their proper homes',
    'Wipe down coffee bar + empty & wash Keurig pods',
    'Sweep floor — coffee grounds, wrappers, and water drips',
    'Tidy and wipe all hotspot surfaces — entryway table, coffee bar counter, catchall spots',
  ],
  'Pantry': [
    'Check fridges — pull expired or old food, reorganize shelves',
    'Tidy Ziploc bags — off the floor and neatly stored',
    'Declutter pantry shelves — check for expired items, straighten and face products',
    'Wipe down pantry shelves, cabinet faces, and small appliances',
    'Refill and organize containers, spices, and frequently used items',
  ],
  'Floors': [
    'Pick up items off the floor first — clear the path',
    'Sweep all high-traffic areas',
    'Vacuum living areas and rugs',
    'Spot mop any sticky or dirty patches',
    'Check floor vents and baseboards for dust buildup',
  ],
  'Kids Bathroom': [
    'Wipe sink & faucet — leave it clean and dry',
    'Wipe toilet seat, handle & base',
    'Sweep floor',
    'Wipe mirror',
    'Hang or fold towels neatly + restock toilet paper if low',
  ],
  'Guest Bathroom': [
    'Wipe sink & faucet — leave it clean and dry',
    'Wipe toilet seat, handle & base',
    'Clean mirror',
    'Sweep floor',
    'Freshen towels + restock guest supplies if low',
  ],
}

const ZONE_COLORS: Record<ZoneName, { bg: string; border: string; tag: string }> = {
  'Kitchen':        { bg: 'bg-amber-50',   border: 'border-amber-300',   tag: 'bg-amber-100 text-amber-800' },
  'Hotspot':        { bg: 'bg-red-50',     border: 'border-red-300',     tag: 'bg-red-100 text-red-800' },
  'Pantry':         { bg: 'bg-emerald-50', border: 'border-emerald-300', tag: 'bg-emerald-100 text-emerald-800' },
  'Floors':         { bg: 'bg-orange-50',  border: 'border-orange-300',  tag: 'bg-orange-100 text-orange-800' },
  'Kids Bathroom':  { bg: 'bg-purple-50',  border: 'border-purple-300',  tag: 'bg-purple-100 text-purple-800' },
  'Guest Bathroom': { bg: 'bg-indigo-50',  border: 'border-indigo-300',  tag: 'bg-indigo-100 text-indigo-800' },
}

const SIDE_MISSIONS_STORAGE_KEY = 'chores-side-missions'

interface ChoresTabProps {
  familyMembers?: { name: string; age: number; role: 'parent' | 'child' }[]
}

export default function ChoresTab({ familyMembers = [] }: ChoresTabProps) {
  const [completedTasks, setCompletedTasks] = useState<string[]>([])
  const [sideMissions, setSideMissions] = useState<Record<string, string>>({})
  const [editingMission, setEditingMission] = useState<string | null>(null)
  const [missionDraft, setMissionDraft] = useState('')

  // Load side missions from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(SIDE_MISSIONS_STORAGE_KEY)
      if (saved) {
        try { setSideMissions(JSON.parse(saved)) } catch {}
      }
    }
  }, [])

  const saveSideMission = (kid: string) => {
    const updated = { ...sideMissions }
    if (missionDraft.trim()) {
      updated[kid] = missionDraft.trim()
    } else {
      delete updated[kid]
    }
    setSideMissions(updated)
    localStorage.setItem(SIDE_MISSIONS_STORAGE_KEY, JSON.stringify(updated))
    setEditingMission(null)
    setMissionDraft('')
  }

  const toggleTask = (taskId: string) => {
    setCompletedTasks(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    )
  }

  const getDayName = (day: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[day]
  }

  const getCurrentMonthHabit = () => {
    const currentMonth = new Date().getMonth() + 1
    return MONTHLY_HABITS.find(h => h.month === currentMonth)
  }

  const zoneWeek = getCurrentZoneWeek()
  const { start, end } = getCurrentZoneWeekRange()
  const assignments = getCurrentZoneAssignments()
  const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div className="space-y-6">
      {/* Header with current focus */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 rounded-lg">
        <h2 className="text-2xl font-bold mb-2">Family Chore System</h2>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{getDayName(new Date().getDay())}'s Focus: {DAILY_FOCUS[getDayName(new Date().getDay()).toLowerCase() as keyof typeof DAILY_FOCUS]}</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>Monthly Habit: {getCurrentMonthHabit()?.habit}</span>
          </div>
        </div>
      </div>

      {/* This Week's Zones */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">This Week's Zones</h3>
          <span className="text-sm text-gray-500">
            Week {zoneWeek} of 6 &middot; {formatDate(start)} – {formatDate(end)}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignments.map(({ kid, zone }) => {
            const colors = ZONE_COLORS[zone]
            const tasks = ZONE_TASKS[zone]
            const mission = sideMissions[kid]
            const isEditing = editingMission === kid

            return (
              <div key={kid} className={`rounded-lg border-2 ${colors.border} ${colors.bg} p-4`}>
                {/* Kid name + zone label */}
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-gray-900">{kid}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors.tag}`}>
                    {zone}
                  </span>
                </div>

                {/* Task list */}
                <ul className="space-y-1.5 mb-3">
                  {tasks.map((task, i) => {
                    const taskId = `zone-${kid}-${i}`
                    const done = completedTasks.includes(taskId)
                    return (
                      <li key={i} className="flex items-start gap-2">
                        <button onClick={() => toggleTask(taskId)} className="mt-0.5 flex-shrink-0">
                          {done ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />
                          )}
                        </button>
                        <span className={`text-sm ${done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                          {task}
                        </span>
                      </li>
                    )
                  })}
                </ul>

                {/* Side Mission */}
                {isEditing ? (
                  <div className="flex items-center gap-1 mt-2">
                    <input
                      type="text"
                      value={missionDraft}
                      onChange={e => setMissionDraft(e.target.value)}
                      placeholder="e.g. 🗑️ Trash — Mon & Tue"
                      className="flex-1 text-xs border rounded px-2 py-1"
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') saveSideMission(kid) }}
                    />
                    <button onClick={() => saveSideMission(kid)} className="text-green-600"><Save className="w-4 h-4" /></button>
                    <button onClick={() => { setEditingMission(null); setMissionDraft('') }} className="text-red-500"><X className="w-4 h-4" /></button>
                  </div>
                ) : mission ? (
                  <div
                    className="mt-2 flex items-center justify-between bg-white/60 rounded px-2 py-1 border border-dashed border-gray-300 cursor-pointer"
                    onClick={() => { setEditingMission(kid); setMissionDraft(mission) }}
                  >
                    <span className="text-xs text-gray-600">{mission}</span>
                    <Edit3 className="w-3 h-3 text-gray-400" />
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditingMission(kid); setMissionDraft('') }}
                    className="mt-2 text-xs text-gray-400 hover:text-gray-600"
                  >
                    + Add side mission
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Daily Routines */}
      <div className="bg-white p-6 rounded-lg border-2 border-blue-200">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Daily Routines</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {DAILY_ROUTINES.map(routine => (
            <div key={routine.name} className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <h4 className="font-semibold text-blue-900">{routine.name}</h4>
              </div>
              <ul className="space-y-1">
                {routine.tasks.map((task, index) => (
                  <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>{task}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-gray-500 mt-2">For: {routine.ageGroup}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Home Blessing */}
      <div className="bg-white p-6 rounded-lg border-2 border-green-200">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          Weekly Home Blessing (Monday)
        </h3>
        <p className="text-gray-600 mb-4">Quick maintenance tasks to keep the house running smoothly</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {WEEKLY_BLESSING.tasks.map((task, index) => {
            const taskId = `blessing-${index}`
            return (
              <div 
                key={taskId}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  completedTasks.includes(taskId) ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <button
                  onClick={() => toggleTask(taskId)}
                  className="mt-1"
                >
                  {completedTasks.includes(taskId) ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                  )}
                </button>
                <div className="flex-1">
                  <h5 className="font-medium">{task.name}</h5>
                  <p className="text-sm text-gray-600">{task.room}</p>
                  <p className="text-xs text-gray-500">{task.duration} min • {task.assignTo}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Progress Overview */}
      <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white p-6 rounded-lg">
        <h3 className="text-xl font-bold mb-2">Family Progress</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-3xl font-bold">{completedTasks.length}</p>
            <p className="text-sm">Tasks Completed</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{zoneWeek}/6</p>
            <p className="text-sm">Zone Week</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{new Date().getDate()}</p>
            <p className="text-sm">Day of Month</p>
          </div>
        </div>
      </div>
    </div>
  )
}