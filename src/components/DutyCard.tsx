'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'

interface Task { key: string; label: string; emoji: string; completed: boolean }
interface DutyData {
  isMyDay: boolean
  todaysManagers?: string[]
  todaysAssigned?: string[]
  tasks: Task[]
}

export default function DutyCard({ childName }: { childName: string }) {
  const [dinner, setDinner] = useState<DutyData | null>(null)
  const [laundry, setLaundry] = useState<DutyData | null>(null)
  const [loaded, setLoaded] = useState(false)

  const childKey = childName.toLowerCase()

  useEffect(() => {
    fetch(`/api/kids/duties?kid=${childKey}`)
      .then(r => r.json())
      .then(data => {
        setDinner(data.dinnerManager || null)
        setLaundry(data.laundry || null)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [childKey])

  const toggleTask = async (duty: string, taskKey: string, completed: boolean, setFn: (fn: (prev: DutyData | null) => DutyData | null) => void) => {
    setFn(prev => prev ? { ...prev, tasks: prev.tasks.map(t => t.key === taskKey ? { ...t, completed: !completed } : t) } : prev)
    await fetch('/api/kids/duties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: completed ? 'uncomplete_duty_task' : 'complete_duty_task',
        kid_name: childKey, duty, task: taskKey,
      })
    }).catch(() => {})
  }

  if (!loaded) return null

  return (
    <>
      {/* Dinner Manager */}
      {dinner && <SingleDutyCard
        title="Dinner Manager"
        emoji="🍳"
        subtitle="You're leading the kitchen tonight"
        data={dinner}
        duty="dinner_manager"
        nameField="todaysManagers"
        bonusText="+10 pts when complete"
        onToggle={(key, completed) => toggleTask('dinner_manager', key, completed, setDinner)}
      />}

      {/* Laundry */}
      {laundry && <SingleDutyCard
        title="Laundry"
        emoji="🧺"
        subtitle="Collect, wash, keep machines running"
        data={laundry}
        duty="laundry"
        nameField="todaysAssigned"
        onToggle={(key, completed) => toggleTask('laundry', key, completed, setLaundry)}
      />}
    </>
  )
}

function SingleDutyCard({ title, emoji, subtitle, data, duty, nameField, bonusText, onToggle }: {
  title: string; emoji: string; subtitle: string; data: DutyData; duty: string; nameField: string; bonusText?: string
  onToggle: (key: string, completed: boolean) => void
}) {
  const names = (data as any)[nameField] as string[] || []
  const isParentOnly = names.length > 0 && names.every(n => ['Levi', 'Lola'].includes(n))

  // Parent-only day: show tiny info or nothing
  if (!data.isMyDay && isParentOnly) {
    return (
      <div className="text-center text-xs text-gray-400 py-1">
        {emoji} {title} today: {names.join(' & ')}
      </div>
    )
  }

  // Not your day
  if (!data.isMyDay) {
    return (
      <div className="bg-white rounded-lg border shadow-sm p-3 flex items-center gap-2">
        <span className="text-lg">{emoji}</span>
        <div>
          <span className="text-sm font-medium text-gray-700">{title}</span>
          <span className="text-sm text-gray-500 ml-2">Tonight: {names.join(' & ')}</span>
        </div>
      </div>
    )
  }

  // Your day — full card
  const done = data.tasks.filter(t => t.completed).length
  const total = data.tasks.length
  const allDone = done === total && total > 0

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-violet-100 to-purple-100 px-4 py-3 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-violet-900 text-sm">{emoji} {title} — Your {duty === 'dinner_manager' ? 'Night' : 'Day'}!</h3>
          <p className="text-xs text-violet-700">{subtitle}</p>
        </div>
        <div className="text-right">
          <span className="text-sm font-bold text-violet-800">{done}/{total}</span>
          {bonusText && !allDone && <p className="text-xs text-violet-600">{bonusText}</p>}
        </div>
      </div>

      {allDone ? (
        <div className="p-5 text-center">
          <p className="text-2xl">{emoji}✨</p>
          <p className="text-sm font-medium text-green-700 mt-1">All done!</p>
        </div>
      ) : (
        <div className="divide-y">
          {data.tasks.map(t => (
            <button key={t.key} onClick={() => onToggle(t.key, t.completed)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50">
              {t.completed ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />
              )}
              <span className="text-base">{t.emoji}</span>
              <span className={`text-sm flex-1 ${t.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>{t.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
