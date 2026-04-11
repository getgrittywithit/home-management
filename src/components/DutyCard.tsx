'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Circle, ChevronDown, ChevronUp } from 'lucide-react'
import HelpDropdown from './HelpDropdown'
import SpeakerButton from './SpeakerButton'

interface Task { key: string; label: string; emoji: string; completed: boolean; instructions?: string; task_type?: string }

const DUTY_HELP: Record<string, string[]> = {
  dinner_manager: [
    "You're the Dinner Manager tonight — you run the kitchen!",
    'Check the meal plan to see what\'s for dinner',
    'Get ingredients out and follow the recipe or Mom\'s instructions',
    'Set the table before food is ready',
    'Call everyone when it\'s time to eat',
    'Help clean up after',
  ],
  laundry: [
    'Check the hampers and collect dirty clothes',
    'Sort by color if needed (darks, lights, towels)',
    'Start a load in the washer with one scoop of detergent',
    'When the washer is done, move to the dryer',
    'Fold and put away when dry',
  ],
}
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
  const [expandedTask, setExpandedTask] = useState<string | null>(null)
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
  // Separate anchor (required) tasks from rotating tasks
  const anchorTasks = data.tasks.filter(t => t.task_type === 'anchor')
  const rotatingTasks = data.tasks.filter(t => t.task_type === 'rotating')
  const unsortedTasks = data.tasks.filter(t => !t.task_type)
  // If tasks have types, show them grouped; otherwise show flat list
  const hasTypes = anchorTasks.length > 0 || rotatingTasks.length > 0

  const done = data.tasks.filter(t => t.completed).length
  const total = data.tasks.length
  const allDone = done === total && total > 0

  const renderTask = (t: Task) => (
    <div key={t.key}>
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
        <button onClick={() => onToggle(t.key, t.completed)} className="flex-shrink-0">
          {t.completed ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : (
            <Circle className="w-5 h-5 text-gray-300" />
          )}
        </button>
        <span className="text-base">{t.emoji}</span>
        <span className={`text-sm flex-1 ${t.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>{t.label}</span>
        {t.instructions && (
          <button
            onClick={() => setExpandedTask(expandedTask === t.key ? null : t.key)}
            className="flex-shrink-0 p-1 hover:bg-gray-100 rounded"
          >
            {expandedTask === t.key ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
        )}
      </div>
      {expandedTask === t.key && t.instructions && (
        <div className="px-12 pb-3 text-xs text-gray-600 bg-gray-50 whitespace-pre-line relative">
          <div className="absolute top-1 right-3">
            <SpeakerButton text={t.instructions} size="sm" />
          </div>
          <span className="pr-8">{t.instructions}</span>
        </div>
      )}
    </div>
  )

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

      {/* Card-level help */}
      {DUTY_HELP[duty] && (
        <div className="px-4 pt-2">
          <HelpDropdown instructions={DUTY_HELP[duty]} label={`How ${title.toLowerCase()} works`} compact />
        </div>
      )}

      {allDone ? (
        <div className="p-5 text-center">
          <p className="text-2xl">{emoji}</p>
          <p className="text-sm font-medium text-green-700 mt-1">All done!</p>
        </div>
      ) : hasTypes ? (
        <div>
          {anchorTasks.length > 0 && (
            <>
              <div className="px-4 py-2 bg-amber-50 border-b text-xs font-semibold text-amber-800 uppercase tracking-wide">Required Steps</div>
              <div className="divide-y">{anchorTasks.map(renderTask)}</div>
            </>
          )}
          {rotatingTasks.length > 0 && (
            <>
              <div className="px-4 py-2 bg-sky-50 border-b text-xs font-semibold text-sky-800 uppercase tracking-wide">Rotating Tasks</div>
              <div className="divide-y">{rotatingTasks.map(renderTask)}</div>
            </>
          )}
          {unsortedTasks.length > 0 && (
            <div className="divide-y">{unsortedTasks.map(renderTask)}</div>
          )}
        </div>
      ) : (
        <div className="divide-y">
          {data.tasks.map(renderTask)}
        </div>
      )}
    </div>
  )
}
