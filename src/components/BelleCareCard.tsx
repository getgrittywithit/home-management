'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'

interface Task {
  time: string
  task: string
  completed: boolean
}

const KID_DISPLAY: Record<string, string> = {
  amos: 'Amos', ellie: 'Ellie', wyatt: 'Wyatt', hannah: 'Hannah', zoey: 'Zoey', kaylee: 'Kaylee'
}

export default function BelleCareCard({ childName }: { childName: string }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isAssigned, setIsAssigned] = useState(false)
  const [assignee, setAssignee] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  const childKey = childName.toLowerCase()

  useEffect(() => {
    fetch(`/api/kids/belle?action=get_todays_tasks&kid=${childKey}`)
      .then(r => r.json())
      .then(data => {
        setTasks(data.tasks || [])
        setIsAssigned(data.isAssigned || false)
        setAssignee(data.assignee || null)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [childKey])

  const toggleTask = async (task: string, currentlyCompleted: boolean) => {
    setTasks(prev => prev.map(t => t.task === task ? { ...t, completed: !currentlyCompleted } : t))
    await fetch('/api/kids/belle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: currentlyCompleted ? 'uncomplete_task' : 'complete_task',
        kid_name: childKey,
        task,
      })
    }).catch(() => {})
  }

  if (!loaded) return null

  // Not assigned — show small line
  if (!isAssigned) {
    if (!assignee) return null
    return (
      <div className="text-center text-xs text-gray-400 py-2">
        🐾 Belle's care this week: {KID_DISPLAY[assignee] || assignee}
      </div>
    )
  }

  const done = tasks.filter(t => t.completed).length
  const total = tasks.length
  const allDone = done === total && total > 0

  const groups: Record<string, Task[]> = { Morning: [], Afternoon: [], Evening: [] }
  tasks.forEach(t => { if (groups[t.time]) groups[t.time].push(t) })

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      {/* Banner */}
      <div className="bg-gradient-to-r from-amber-100 to-orange-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🐾</span>
          <div>
            <h3 className="font-semibold text-amber-900 text-sm">Belle Care — Your Week!</h3>
            <p className="text-xs text-amber-700">You're on Belle duty this week 🐕</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-sm font-bold text-amber-800">{done}/{total}</span>
          <p className="text-xs text-amber-600">done today</p>
        </div>
      </div>

      {allDone ? (
        <div className="p-6 text-center">
          <p className="text-lg">🐾✨</p>
          <p className="text-sm font-medium text-green-700 mt-1">Belle is taken care of!</p>
        </div>
      ) : (
        <div className="divide-y">
          {(['Morning', 'Afternoon', 'Evening'] as const).map(time => {
            const timeTasks = groups[time]
            if (timeTasks.length === 0) return null
            return (
              <div key={time}>
                <div className="px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {time === 'Morning' ? '☀️' : time === 'Afternoon' ? '🌤' : '🌙'} {time}
                </div>
                {timeTasks.map(t => (
                  <button
                    key={t.task}
                    onClick={() => toggleTask(t.task, t.completed)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
                  >
                    {t.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />
                    )}
                    <span className={`text-sm ${t.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                      {t.task}
                    </span>
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
