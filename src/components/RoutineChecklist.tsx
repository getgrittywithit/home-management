'use client'

import { useState, useEffect, useCallback } from 'react'
import { Check, Sun, Moon, Flame } from 'lucide-react'
import SpeakerButton from './SpeakerButton'
import HelpDropdown from './HelpDropdown'

interface RoutineItem {
  name: string
  type: string
  order: number
  // DC-1: routine items now carry an instruction_key so the kid can expand
  // "How to do this" per item instead of seeing the canned fallback. Mapped to
  // task_instructions via (instruction_source, instruction_key).
  instruction_key?: string | null
  instruction_source?: string | null
}

interface RoutineChecklistProps {
  kidName: string
}

const TYPE_EMOJI: Record<string, string> = {
  medication: '💊',
  hygiene: '🪥',
  tidy: '🧹',
  nutrition: '🍳',
  enrichment: '📖',
}

export default function RoutineChecklist({ kidName }: RoutineChecklistProps) {
  const [routines, setRoutines] = useState<Record<string, RoutineItem[]>>({})
  const [completed, setCompleted] = useState<Record<string, Set<string>>>({})
  const [streaks, setStreaks] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  // DC-1: instruction map keyed by `${task_source}:${task_key}` → steps[]
  const [instructions, setInstructions] = useState<Record<string, string[]>>({})

  const kid = kidName.toLowerCase()

  const fetchData = useCallback(async () => {
    try {
      const [routineRes, instrRes] = await Promise.all([
        fetch(`/api/routines?action=get_routine&kid_name=${kid}`),
        fetch('/api/homeschool?action=get_task_instructions'),
      ])
      const data = await routineRes.json()

      // Build instruction map
      try {
        const instrData = await instrRes.json()
        const map: Record<string, string[]> = {}
        for (const r of (instrData.instructions || [])) {
          const key = `${r.task_source}:${r.task_key}`
          map[key] = Array.isArray(r.steps) ? r.steps : []
        }
        setInstructions(map)
      } catch { /* non-fatal — items render without expand */ }

      const routineMap: Record<string, RoutineItem[]> = {}
      for (const r of (data.routines || [])) {
        routineMap[r.routine_type] = (r.items || []).sort((a: RoutineItem, b: RoutineItem) => a.order - b.order)
      }
      setRoutines(routineMap)

      const completionMap: Record<string, Set<string>> = {}
      for (const c of (data.completions || [])) {
        const items = c.items_completed || []
        completionMap[c.routine_type] = new Set(items.map((i: any) => i.name))
      }
      setCompleted(completionMap)

      const streakMap: Record<string, number> = {}
      for (const s of (data.streaks || [])) {
        streakMap[s.routine_type] = s.current_streak || 0
      }
      setStreaks(streakMap)
    } catch {}
    setLoading(false)
  }, [kid])

  useEffect(() => { fetchData() }, [fetchData])

  const toggleItem = async (routineType: string, itemName: string) => {
    // Optimistic update
    setCompleted(prev => {
      const updated = { ...prev }
      const items = new Set(updated[routineType] || [])
      if (items.has(itemName)) {
        items.delete(itemName)
      } else {
        items.add(itemName)
      }
      updated[routineType] = items
      return updated
    })

    await fetch('/api/routines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'toggle_routine_item',
        kid_name: kid,
        routine_type: routineType,
        item_name: itemName,
      }),
    }).catch(() => {})
  }

  // Determine which routine to show based on time of day
  const hour = new Date().getHours()
  const isMorning = hour < 14 // Show morning routine before 2pm
  const primaryType = isMorning ? 'morning' : 'evening'
  const secondaryType = isMorning ? 'evening' : 'morning'

  if (loading) return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="animate-pulse h-4 bg-gray-200 rounded w-32 mb-3" />
      <div className="animate-pulse h-3 bg-gray-100 rounded w-48" />
    </div>
  )

  const types = Object.keys(routines)
  if (types.length === 0) return null

  const renderRoutine = (type: string, expanded: boolean) => {
    const items = routines[type] || []
    const done = completed[type] || new Set()
    const streak = streaks[type] || 0
    const allDone = items.length > 0 && items.every(i => done.has(i.name))
    const Icon = type === 'morning' ? Sun : Moon

    if (!expanded && allDone) {
      return (
        <div key={type} className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg border border-green-200">
          <Icon className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium text-green-700 capitalize">{type} Routine</span>
          <Check className="w-4 h-4 text-green-600" />
          <span className="text-xs text-green-600 ml-auto">All done!</span>
          {streak > 1 && (
            <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
              <Flame className="w-3 h-3" /> {streak}d
            </span>
          )}
        </div>
      )
    }

    return (
      <div key={type} className={`rounded-2xl border ${allDone ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'} p-4 space-y-2`}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
            <Icon className={`w-4 h-4 ${type === 'morning' ? 'text-amber-500' : 'text-indigo-500'}`} />
            <span className="capitalize">{type} Routine</span>
            <span className="text-xs text-gray-400">{done.size}/{items.length}</span>
          </h3>
          <div className="flex items-center gap-2">
            {streak > 1 && (
              <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                <Flame className="w-3 h-3" /> {streak}d streak
              </span>
            )}
            {allDone && <span className="text-green-600 text-xs font-medium flex items-center gap-1"><Check className="w-3 h-3" /> Done!</span>}
          </div>
        </div>

        <div className="space-y-1">
          {items.map(item => {
            const isDone = done.has(item.name)
            const emoji = TYPE_EMOJI[item.type] || '📌'
            const instrKey = item.instruction_key && item.instruction_source
              ? `${item.instruction_source}:${item.instruction_key}`
              : null
            const itemSteps = instrKey ? instructions[instrKey] : null
            return (
              <div key={item.name} className={`rounded-lg ${isDone ? 'bg-green-50/50' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-3 py-2 px-3">
                  <button
                    onClick={() => toggleItem(type, item.name)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition flex-shrink-0 ${
                      isDone ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-green-400'
                    }`}
                  >
                    {isDone && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <span className={`text-sm flex-1 ${isDone ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                    {emoji} {item.name}
                  </span>
                  {!isDone && <SpeakerButton text={item.name} size="sm" rate={0.9} />}
                </div>
                {/* DC-1: per-item "How to do this" — rendered only when steps exist */}
                {itemSteps && itemSteps.length > 0 && (
                  <div className="px-3 pb-2 pl-12">
                    <HelpDropdown instructions={itemSteps} compact />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {routines[primaryType] && renderRoutine(primaryType, true)}
      {routines[secondaryType] && renderRoutine(secondaryType, false)}
    </div>
  )
}
