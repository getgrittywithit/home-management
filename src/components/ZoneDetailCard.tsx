'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Info, Sparkles, Heart, Anchor, Plus } from 'lucide-react'
import ZonePhotoUpload from './ZonePhotoUpload'

interface ZoneTask {
  id: number
  task_text: string
  task_type: string
  health_priority: boolean
  equipment: string | null
  equipment_label: string | null
  duration_mins: number
  instructions: string[] | null
  once_daily: boolean
  completed: boolean
  rotation_id: number | null
  completed_at: string | null
}

interface FeedingEntry {
  fed_date: string
  quantity: number
  notes: string
}

interface FeedingReminder {
  days_since_fed: number | null
  last_fed: string | null
  reminder_level: string
  message: string
}

interface ZoneInfo {
  zone_key: string
  display_name: string
  zone_type: string
  done_means: string
  supplies: { item: string; emoji: string }[]
  zone_principle: string | null
  assigned_to?: string[] | null
  is_shared?: boolean
}

interface ZoneDetailCardProps {
  zoneKey: string
  childName: string
  onAllComplete?: () => void
}

const EQUIPMENT_ICONS: Record<string, string> = {
  regular_vacuum: '🔌',
  shop_vac: '💪',
  carpet_machine: '🧺',
  mop: '🫧',
}

export default function ZoneDetailCard({ zoneKey, childName, onAllComplete }: ZoneDetailCardProps) {
  const [zone, setZone] = useState<ZoneInfo | null>(null)
  const [tasks, setTasks] = useState<ZoneTask[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)
  const [estimatedMins, setEstimatedMins] = useState(0)
  const [footerNote, setFooterNote] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [expandedInstructions, setExpandedInstructions] = useState<Record<number, boolean>>({})
  const [showConfetti, setShowConfetti] = useState(false)
  const [showBonusInput, setShowBonusInput] = useState(false)
  const [bonusText, setBonusText] = useState('')
  const [bonusSubmitting, setBonusSubmitting] = useState(false)
  const [helperNote, setHelperNote] = useState<string | null>(null)
  const [hasFeedingLog, setHasFeedingLog] = useState(false)
  const [feedingReminder, setFeedingReminder] = useState<FeedingReminder | null>(null)
  const [feedingHistory, setFeedingHistory] = useState<FeedingEntry[]>([])
  const [showFeedingLog, setShowFeedingLog] = useState(false)
  const [showFeedingForm, setShowFeedingForm] = useState(false)
  const [feedingQty, setFeedingQty] = useState(2)
  const [feedingNotes, setFeedingNotes] = useState('Ate immediately')
  const [feedingSubmitting, setFeedingSubmitting] = useState(false)

  const kidKey = childName.toLowerCase()

  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
    fetch(`/api/kids/zone-tasks?action=get_zone_tasks&zone=${zoneKey}&kid=${kidKey}&date=${today}`)
      .then(r => r.json())
      .then(data => {
        setZone(data.zone || null)
        setTasks(data.tasks || [])
        setTotalCount(data.total || 0)
        setCompletedCount(data.completed_count || 0)
        setEstimatedMins(data.estimated_mins || 0)
        setFooterNote(data.footer_note || null)
        setHelperNote(data.helper_note || null)
        setHasFeedingLog(data.has_feeding_log || false)
        setLoaded(true)

        // Load feeding data if this is a pet feeding zone
        if (data.has_feeding_log) {
          Promise.all([
            fetch(`/api/kids/zone-tasks?action=check_feeding_reminder&pet=hades&date=${today}`).then(r => r.json()).catch(() => null),
            fetch(`/api/kids/zone-tasks?action=get_feeding_history&pet=hades&limit=10`).then(r => r.json()).catch(() => ({ feedings: [] })),
          ]).then(([reminder, history]) => {
            if (reminder) setFeedingReminder(reminder)
            if (history?.feedings) setFeedingHistory(history.feedings)
          })
        }
      })
      .catch(() => setLoaded(true))
  }, [zoneKey, kidKey])

  const toggleTask = async (task: ZoneTask) => {
    if (!task.rotation_id) return
    const wasCompleted = task.completed
    const newCompleted = !wasCompleted

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: newCompleted } : t))
    const newCount = newCompleted ? completedCount + 1 : completedCount - 1
    setCompletedCount(newCount)

    // Check if all done
    if (newCompleted && newCount === totalCount && totalCount > 0) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 2000)
      onAllComplete?.()
    }

    try {
      const action = newCompleted ? 'complete_task' : 'uncomplete_task'
      await fetch('/api/kids/zone-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rotation_id: task.rotation_id })
      })
    } catch (err) {
      // Revert on error
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: wasCompleted } : t))
      setCompletedCount(wasCompleted ? completedCount : completedCount - 1)
    }
  }

  const markAllDone = async () => {
    setTasks(prev => prev.map(t => ({ ...t, completed: true })))
    setCompletedCount(totalCount)
    setShowConfetti(true)
    setTimeout(() => setShowConfetti(false), 2000)
    onAllComplete?.()

    try {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      await fetch('/api/kids/zone-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete_all', zone_key: zoneKey, kid: kidKey, date: today })
      })
    } catch { /* revert would be complex, trust the server */ }
  }

  const submitBonus = async () => {
    if (!bonusText.trim()) return
    setBonusSubmitting(true)
    try {
      await fetch('/api/kids/zone-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'log_bonus_task', kid: kidKey, description: bonusText.trim(), zone_key: zoneKey })
      })
      setBonusText('')
      setShowBonusInput(false)
    } catch { /* ignore */ }
    setBonusSubmitting(false)
  }

  const submitFeeding = async () => {
    setFeedingSubmitting(true)
    try {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      await fetch('/api/kids/zone-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'log_feeding', pet_key: 'hades', fed_by: kidKey, quantity: feedingQty, notes: feedingNotes, fed_date: today })
      })
      // Refresh feeding data
      const [reminder, history] = await Promise.all([
        fetch(`/api/kids/zone-tasks?action=check_feeding_reminder&pet=hades&date=${today}`).then(r => r.json()).catch(() => null),
        fetch(`/api/kids/zone-tasks?action=get_feeding_history&pet=hades&limit=10`).then(r => r.json()).catch(() => ({ feedings: [] })),
      ])
      if (reminder) setFeedingReminder(reminder)
      if (history?.feedings) setFeedingHistory(history.feedings)
      setShowFeedingForm(false)
      setFeedingQty(2)
      setFeedingNotes('Ate immediately')
    } catch { /* ignore */ }
    setFeedingSubmitting(false)
  }

  const toggleInstructions = (taskId: number) => {
    setExpandedInstructions(prev => ({ ...prev, [taskId]: !prev[taskId] }))
  }

  if (!loaded) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600" />
      </div>
    )
  }

  if (!zone || tasks.length === 0) {
    return null
  }

  const anchorTasks = tasks.filter(t => t.task_type === 'anchor')
  const rotatingTasks = tasks.filter(t => t.task_type === 'rotating')
  const weeklyTasks = tasks.filter(t => t.task_type === 'weekly')
  const monthlyTasks = tasks.filter(t => t.task_type === 'monthly')
  const extraTasks = [...rotatingTasks, ...weeklyTasks, ...monthlyTasks]

  // Separate personal care tasks (grooming/hygiene in routines)
  const isRoutine = zone.zone_type === 'routine'
  const personalCareTasks = isRoutine ? extraTasks.filter(t =>
    t.task_text.toLowerCase().includes('scrub') ||
    t.task_text.toLowerCase().includes('nail') ||
    t.task_text.toLowerCase().includes('ear') ||
    t.task_text.toLowerCase().includes('shave') ||
    t.task_text.toLowerCase().includes('lotion') ||
    t.task_text.toLowerCase().includes('moisturize') ||
    t.task_text.toLowerCase().includes('beard') ||
    t.task_text.toLowerCase().includes('face') ||
    t.task_text.toLowerCase().includes('body') ||
    t.task_text.toLowerCase().includes('deodorant') === false && false // deodorant stays in main
  ) : []
  // For now keep all extra tasks together — the divider shows within the card
  const hasPersonalCare = isRoutine && extraTasks.some(t =>
    t.task_text.toLowerCase().includes('scrub') ||
    t.task_text.toLowerCase().includes('nail') ||
    t.task_text.toLowerCase().includes('ear') ||
    t.task_text.toLowerCase().includes('shave') ||
    t.task_text.toLowerCase().includes('lotion') ||
    t.task_text.toLowerCase().includes('moisturize') ||
    t.task_text.toLowerCase().includes('beard') ||
    t.task_text.toLowerCase().includes('body')
  )

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden relative">
      {/* Confetti overlay */}
      {showConfetti && (
        <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
          <div className="text-4xl animate-bounce">✨🎉✨</div>
        </div>
      )}

      {/* Supplies strip */}
      {zone.supplies && zone.supplies.length > 0 && (
        <div className="px-3 py-2 bg-amber-50 border-b border-amber-100 overflow-x-auto">
          <div className="flex items-center gap-2 text-xs whitespace-nowrap">
            <span className="text-amber-600 font-medium shrink-0">Grab:</span>
            {zone.supplies.map((s, i) => (
              <span key={i} className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full shrink-0">
                {s.emoji} {s.item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Helper note (Spike helpers) */}
      {helperNote && (
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
          <p className="text-xs text-gray-400 italic">{helperNote} 👀</p>
        </div>
      )}

      {/* Feeding reminder banner (Hades) */}
      {hasFeedingLog && feedingReminder && feedingReminder.reminder_level !== 'none' && (
        <div className={`px-3 py-3 border-b ${
          feedingReminder.reminder_level === 'overdue' ? 'bg-red-50 border-red-200' :
          feedingReminder.reminder_level === 'due' ? 'bg-orange-50 border-orange-200' :
          'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-start gap-2">
            <span className="text-lg">🐍</span>
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                feedingReminder.reminder_level === 'overdue' ? 'text-red-800' :
                feedingReminder.reminder_level === 'due' ? 'text-orange-800' :
                'text-amber-800'
              }`}>Feeding reminder</p>
              <p className="text-xs text-gray-600 mt-0.5">{feedingReminder.message}</p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setShowFeedingForm(true)}
                  className="text-xs bg-white border rounded px-3 py-1 hover:bg-gray-50 font-medium"
                >
                  Log Feeding
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Anchor tasks */}
      <div className="divide-y divide-gray-100">
        {anchorTasks.map(task => (
          <TaskRow
            key={task.id}
            task={task}
            onToggle={() => toggleTask(task)}
            expanded={expandedInstructions[task.id]}
            onToggleInstructions={() => toggleInstructions(task.id)}
          />
        ))}

        {/* Divider for rotating tasks */}
        {extraTasks.length > 0 && (
          <div className="px-3 py-1.5 bg-gray-50 text-xs text-gray-400 text-center">
            today&apos;s extra tasks
          </div>
        )}

        {/* Rotating/weekly/monthly tasks */}
        {extraTasks.map((task, i) => (
          <div key={task.id}>
            {/* Personal care divider */}
            {hasPersonalCare && i > 0 && isPersonalCareTask(task) && !isPersonalCareTask(extraTasks[i - 1]) && (
              <div className="px-3 py-1.5 bg-gray-50 text-xs text-gray-400 text-center">
                personal care
              </div>
            )}
            <TaskRow
              task={task}
              onToggle={() => toggleTask(task)}
              expanded={expandedInstructions[task.id]}
              onToggleInstructions={() => toggleInstructions(task.id)}
            />
          </div>
        ))}
      </div>

      {/* Footer note (meal accountability) */}
      {footerNote && (
        <div className="px-3 py-2 bg-blue-50 border-t border-blue-100">
          <p className="text-xs text-gray-500 italic">{footerNote}</p>
        </div>
      )}

      {/* Done means + estimated time */}
      <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
        <div className="flex items-start gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
          <p className="text-xs text-gray-600">
            <span className="font-medium">Done means:</span> {zone.done_means}
          </p>
        </div>
        <p className="text-xs text-gray-400 italic mt-1">About {estimatedMins} minutes</p>
      </div>

      {/* Mark All Done button */}
      {completedCount < totalCount && (
        <div className="px-3 py-2 border-t border-gray-100">
          <button
            onClick={markAllDone}
            className="w-full bg-green-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors"
          >
            Mark All Done
          </button>
        </div>
      )}

      {/* Bonus task button */}
      <div className="px-3 py-2 border-t border-gray-100">
        {!showBonusInput ? (
          <button
            onClick={() => setShowBonusInput(true)}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Did something extra
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={bonusText}
              onChange={e => setBonusText(e.target.value)}
              placeholder="What did you do?"
              className="flex-1 text-xs border rounded px-2 py-1.5"
              onKeyDown={e => e.key === 'Enter' && submitBonus()}
              autoFocus
            />
            <button
              onClick={submitBonus}
              disabled={bonusSubmitting || !bonusText.trim()}
              className="text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 disabled:opacity-50"
            >
              +2 pts
            </button>
            <button
              onClick={() => { setShowBonusInput(false); setBonusText('') }}
              className="text-xs text-gray-400 px-2"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Feeding log section (Hades) */}
      {hasFeedingLog && (
        <div className="px-3 py-2 border-t border-gray-100">
          {/* Log feeding form */}
          {showFeedingForm && (
            <div className="mb-3 bg-gray-50 rounded p-3 space-y-2">
              <p className="text-sm font-medium text-gray-700">Log Feeding</p>
              <div className="flex gap-2 items-center">
                <label className="text-xs text-gray-500">Mice:</label>
                <input
                  type="number"
                  value={feedingQty}
                  onChange={e => setFeedingQty(parseInt(e.target.value) || 2)}
                  min={1} max={3}
                  className="w-14 text-sm border rounded px-2 py-1"
                />
                <label className="text-xs text-gray-500">Notes:</label>
                <select
                  value={feedingNotes}
                  onChange={e => setFeedingNotes(e.target.value)}
                  className="text-xs border rounded px-2 py-1 flex-1"
                >
                  <option>Ate immediately</option>
                  <option>Slow to strike</option>
                  <option>Refused — in shed</option>
                  <option>Refused — other</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={submitFeeding}
                  disabled={feedingSubmitting}
                  className="text-xs bg-green-600 text-white px-4 py-1.5 rounded hover:bg-green-700 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowFeedingForm(false)}
                  className="text-xs text-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Feeding history toggle */}
          <button
            onClick={() => setShowFeedingLog(!showFeedingLog)}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            🍽️ Feeding History
            {showFeedingLog ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {!showFeedingForm && (
              <span
                onClick={e => { e.stopPropagation(); setShowFeedingForm(true) }}
                className="ml-auto text-xs text-blue-500 hover:text-blue-700"
              >
                + Log Feeding
              </span>
            )}
          </button>

          {showFeedingLog && feedingHistory.length > 0 && (
            <div className="mt-2 space-y-1">
              {feedingHistory.map((f, i) => (
                <div key={i} className="text-sm text-gray-600">
                  <span className="font-medium">{new Date(f.fed_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  {' — '}{f.quantity} mice — {f.notes || 'no notes'}
                </div>
              ))}
            </div>
          )}
          {showFeedingLog && feedingHistory.length === 0 && (
            <p className="mt-2 text-xs text-gray-400">No feedings logged yet</p>
          )}
        </div>
      )}

      {/* Zone photo upload */}
      <div className="px-3 py-2 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-400">Done? Snap a photo for Mom to review</span>
        <ZonePhotoUpload kidName={childName} zoneName={zone.display_name} />
      </div>

      {/* Zone principle footer */}
      {zone.zone_principle && (
        <div className="px-3 pt-2 pb-3 border-t border-gray-100">
          <p className="text-xs text-gray-400 italic">{zone.zone_principle}</p>
        </div>
      )}
    </div>
  )
}

function isPersonalCareTask(task: ZoneTask): boolean {
  const t = task.task_text.toLowerCase()
  return t.includes('scrub') || t.includes('nail') || t.includes('ear') ||
    t.includes('shave') || t.includes('lotion') || t.includes('moisturize') ||
    t.includes('beard') || t.includes('body')
}

function TaskRow({ task, onToggle, expanded, onToggleInstructions }: {
  task: ZoneTask
  onToggle: () => void
  expanded?: boolean
  onToggleInstructions: () => void
}) {
  return (
    <div className={`${task.completed ? 'bg-gray-50/50' : ''}`}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* Checkbox */}
        <button onClick={onToggle} className="flex-shrink-0">
          {task.completed ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : (
            <Circle className="w-5 h-5 text-gray-300" />
          )}
        </button>

        {/* Task text + badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-sm ${task.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
              {task.task_text}
            </span>
          </div>

          {/* Badges row */}
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {task.task_type === 'anchor' && (
              <span className="text-gray-400 text-xs">always</span>
            )}
            {task.health_priority && (
              <span className="text-xs">❤️</span>
            )}
            {task.equipment && task.equipment_label && (
              <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                {EQUIPMENT_ICONS[task.equipment] || '🔧'} {task.equipment_label}
              </span>
            )}
            {task.task_type === 'weekly' && (
              <span className="text-gray-400 text-xs">weekly</span>
            )}
            {task.task_type === 'monthly' && (
              <span className="text-gray-400 text-xs">monthly</span>
            )}
          </div>
        </div>
      </div>

      {/* Expandable instructions — defensive: handle string, array, or null */}
      {(() => {
        let steps: string[] = []
        if (Array.isArray(task.instructions)) {
          steps = task.instructions.filter((s: any) => typeof s === 'string' && s.trim())
        } else if (typeof task.instructions === 'string') {
          try {
            const parsed = JSON.parse(task.instructions as string)
            if (Array.isArray(parsed)) steps = parsed.filter((s: any) => typeof s === 'string' && s.trim())
          } catch {
            if ((task.instructions as string).trim()) steps = [(task.instructions as string).trim()]
          }
        }
        if (steps.length === 0) return null
        return (
          <div className="px-3 pb-2">
            <button
              onClick={onToggleInstructions}
              className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
            >
              <Info className="w-3 h-3" />
              How to do this
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {expanded && (
              <div className="mt-2 bg-gray-50 rounded p-3">
                <ol className="list-decimal list-inside space-y-1.5 text-sm text-gray-700">
                  {steps.map((step: string, i: number) => (
                    <li key={i} className="leading-snug">{step}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}
