'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'

interface Task {
  key: string
  label: string
  emoji: string
  time: string
  completed: boolean
}

export default function BelleCareCard({ childName }: { childName: string }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [assigned, setAssigned] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const childKey = childName.toLowerCase()

  useEffect(() => {
    fetch(`/api/kids/belle?action=get_my_tasks_today&kid=${childKey}`)
      .then(r => r.json())
      .then(data => {
        setAssigned(data.assigned || false)
        setTasks(data.tasks || [])
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [childKey])

  const toggleTask = async (taskKey: string, currentlyCompleted: boolean) => {
    setTasks(prev => prev.map(t => t.key === taskKey ? { ...t, completed: !currentlyCompleted } : t))
    await fetch('/api/kids/belle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: currentlyCompleted ? 'uncomplete_task' : 'complete_task',
        kid_name: childKey,
        task: taskKey,
      })
    }).catch(() => {})
  }

  if (!loaded) return null

  // Zoey: special static card
  if (childKey === 'zoey') {
    return (
      <div className="bg-amber-50 rounded-lg border border-amber-100 p-4 text-center">
        <p className="text-sm text-amber-800">🐾 <span className="font-medium">Belle Emergency?</span></p>
        <p className="text-xs text-amber-600 mt-1">Not your week for Belle care — find today's caretaker or ask Mom if something needs attention.</p>
      </div>
    )
  }

  // Not assigned today — show nothing
  if (!assigned) return null

  const done = tasks.filter(t => t.completed).length
  const total = tasks.length
  const allDone = done === total && total > 0

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      {/* Banner */}
      <div className="bg-gradient-to-r from-amber-100 to-orange-100 px-4 py-3 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-amber-900 text-sm flex items-center gap-1">🐾 Belle Care — Your Day!</h3>
        </div>
        <span className="text-sm font-bold text-amber-800">{done}/{total}</span>
      </div>

      {allDone ? (
        <div className="p-5 text-center">
          <p className="text-2xl">🐾✨</p>
          <p className="text-sm font-medium text-green-700 mt-1">Belle is taken care of!</p>
        </div>
      ) : (
        <div className="divide-y">
          {tasks.map(t => (
            <button
              key={t.key}
              onClick={() => toggleTask(t.key, t.completed)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50"
            >
              {t.completed ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />
              )}
              <span className="text-base">{t.emoji}</span>
              <span className={`text-sm flex-1 ${t.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                {t.label}
              </span>
              {t.time && <span className="text-xs text-gray-400">{t.time}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
