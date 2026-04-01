'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, Circle, Clock, Star, Sparkles } from 'lucide-react'
import EnrichmentCard from './EnrichmentCard'
import WorkbookLogModal from './WorkbookLogModal'

interface Task {
  id: string
  kid_name: string
  subject: string
  task_label: string
  task_description: string | null
  duration_min: number
  stars_value: number
  completed: boolean
}

interface SubjectBlock {
  subject: string
  tasks: Task[]
  totalTasks: number
  completedTasks: number
  totalMinutes: number
}

interface StarPopup {
  amount: number
  key: number
}

const SUBJECT_ICONS: Record<string, string> = {
  Math: '📐',
  ELAR: '📚',
  Science: '🔬',
  'Social Studies': '🌎',
  Art: '🎨',
  'Life Skills': '🛠️',
  PE: '🏃',
}

const SUBJECT_COLORS: Record<string, { bg: string; border: string; header: string; check: string }> = {
  Math: { bg: 'bg-blue-50', border: 'border-blue-200', header: 'bg-blue-100 text-blue-800', check: 'text-blue-500' },
  ELAR: { bg: 'bg-purple-50', border: 'border-purple-200', header: 'bg-purple-100 text-purple-800', check: 'text-purple-500' },
  Science: { bg: 'bg-emerald-50', border: 'border-emerald-200', header: 'bg-emerald-100 text-emerald-800', check: 'text-emerald-500' },
  'Social Studies': { bg: 'bg-amber-50', border: 'border-amber-200', header: 'bg-amber-100 text-amber-800', check: 'text-amber-500' },
  Art: { bg: 'bg-pink-50', border: 'border-pink-200', header: 'bg-pink-100 text-pink-800', check: 'text-pink-500' },
  'Life Skills': { bg: 'bg-teal-50', border: 'border-teal-200', header: 'bg-teal-100 text-teal-800', check: 'text-teal-500' },
  PE: { bg: 'bg-orange-50', border: 'border-orange-200', header: 'bg-orange-100 text-orange-800', check: 'text-orange-500' },
}

const DEFAULT_COLORS = { bg: 'bg-gray-50', border: 'border-gray-200', header: 'bg-gray-100 text-gray-800', check: 'text-gray-500' }

interface HomeschoolTaskBlockProps {
  kidName: string
  onStarEarned?: (amount: number, source: string) => void
}

// Detect workbook tasks by label
function isWorkbookTask(label: string): string | null {
  const lower = label.toLowerCase()
  if (lower.includes('summer bridge')) return label.replace(/ \(.*\)/, '').replace(/ —.*/, '').trim()
  if (lower.includes('ixl')) return label.replace(/ —.*/, '').trim()
  return null
}

export default function HomeschoolTaskBlock({ kidName, onStarEarned }: HomeschoolTaskBlockProps) {
  const [blocks, setBlocks] = useState<SubjectBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [starPopups, setStarPopups] = useState<StarPopup[]>([])
  const [totalCompleted, setTotalCompleted] = useState(0)
  const [totalTasks, setTotalTasks] = useState(0)
  const [workbookModal, setWorkbookModal] = useState<{ task: Task; workbookName: string } | null>(null)

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/homeschool?action=get_todays_tasks&kid_name=${kidName}`)
      const json = await res.json()

      const bySubject: Record<string, Task[]> = json.by_subject || {}
      const subjectOrder = ['Math', 'ELAR', 'Science', 'Social Studies', 'Art', 'Life Skills', 'PE']

      const orderedBlocks: SubjectBlock[] = []
      // First add subjects in the predefined order
      for (const subj of subjectOrder) {
        if (bySubject[subj]) {
          const tasks = bySubject[subj]
          orderedBlocks.push({
            subject: subj,
            tasks,
            totalTasks: tasks.length,
            completedTasks: tasks.filter((t: Task) => t.completed).length,
            totalMinutes: tasks.reduce((sum: number, t: Task) => sum + t.duration_min, 0),
          })
        }
      }
      // Then add any remaining subjects not in the predefined order
      for (const subj of Object.keys(bySubject)) {
        if (!subjectOrder.includes(subj)) {
          const tasks = bySubject[subj]
          orderedBlocks.push({
            subject: subj,
            tasks,
            totalTasks: tasks.length,
            completedTasks: tasks.filter((t: Task) => t.completed).length,
            totalMinutes: tasks.reduce((sum: number, t: Task) => sum + t.duration_min, 0),
          })
        }
      }

      setBlocks(orderedBlocks)
      setTotalTasks(json.total_tasks || 0)
      setTotalCompleted(json.completed_tasks || 0)
    } catch (err) {
      console.error('Failed to load tasks:', err)
    } finally {
      setLoading(false)
    }
  }, [kidName])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const handleTaskClick = (task: Task) => {
    if (task.completed) {
      // Unchecking — always direct toggle
      handleToggle(task)
      return
    }
    // Check if this is a workbook task
    const wbName = isWorkbookTask(task.task_label)
    if (wbName) {
      setWorkbookModal({ task, workbookName: wbName })
      return
    }
    handleToggle(task)
  }

  const handleWorkbookComplete = (task: Task) => {
    // Mark the daily task as complete after workbook logging
    handleToggle(task)
    setWorkbookModal(null)
  }

  const handleToggle = async (task: Task) => {
    // Optimistic update
    setBlocks(prev => prev.map(block => ({
      ...block,
      tasks: block.tasks.map(t =>
        t.id === task.id ? { ...t, completed: !t.completed } : t
      ),
      completedTasks: block.tasks.reduce((sum, t) =>
        sum + (t.id === task.id ? (!t.completed ? 1 : 0) : (t.completed ? 1 : 0)), 0
      ),
    })))

    if (!task.completed) {
      setTotalCompleted(prev => prev + 1)
    } else {
      setTotalCompleted(prev => prev - 1)
    }

    try {
      const res = await fetch('/api/homeschool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_task',
          task_id: task.id,
          kid_name: kidName,
        }),
      })
      const json = await res.json()

      if (json.completed && json.stars_earned > 0) {
        // Show star popup
        const popupKey = Date.now()
        setStarPopups(prev => [...prev, { amount: json.stars_earned, key: popupKey }])
        setTimeout(() => {
          setStarPopups(prev => prev.filter(p => p.key !== popupKey))
        }, 2000)

        // Award stars through digi-pet system
        await fetch('/api/digi-pet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'award_task_stars',
            kid_name: kidName.toLowerCase(),
            task_type: 'lesson',
            source_ref: `hs-task-${task.id}-${new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })}`,
          }),
        })
        onStarEarned?.(json.stars_earned, 'homeschool_task')
      }
    } catch (err) {
      console.error('Toggle failed:', err)
      // Revert on error
      fetchTasks()
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-3" />
            <div className="space-y-2">
              <div className="h-4 bg-gray-100 rounded w-full" />
              <div className="h-4 bg-gray-100 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (blocks.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
        <p className="text-gray-500">No tasks scheduled for today.</p>
      </div>
    )
  }

  const overallProgress = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0

  return (
    <div className="space-y-4 relative">
      {/* Star popups */}
      {starPopups.map(popup => (
        <div
          key={popup.key}
          className="fixed top-20 right-6 z-50 pointer-events-none"
        >
          <div
            className="bg-yellow-100 border border-yellow-300 text-yellow-800 font-bold px-4 py-2 rounded-full shadow-lg text-sm flex items-center gap-1"
            style={{ animation: 'starFloat 2s ease-out forwards' }}
          >
            <Star className="w-4 h-4 fill-yellow-500" /> +{popup.amount} stars
          </div>
        </div>
      ))}

      <style>{`
        @keyframes starFloat {
          0% { opacity: 0; transform: translateY(10px) scale(0.8); }
          15% { opacity: 1; transform: translateY(0) scale(1); }
          70% { opacity: 1; transform: translateY(-20px) scale(1); }
          100% { opacity: 0; transform: translateY(-40px) scale(0.9); }
        }
        @keyframes checkPop {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
      `}</style>

      {/* Overall progress bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Today&apos;s Progress
          </span>
          <span className="text-sm text-gray-500">
            {totalCompleted}/{totalTasks} tasks · {overallProgress}%
          </span>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              overallProgress === 100 ? 'bg-green-500' :
              overallProgress >= 50 ? 'bg-blue-500' :
              overallProgress > 0 ? 'bg-amber-500' : 'bg-gray-200'
            }`}
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        {overallProgress === 100 && (
          <p className="text-sm text-green-600 font-medium mt-2 flex items-center gap-1">
            <Sparkles className="w-4 h-4" /> All done for today! Great job!
          </p>
        )}
      </div>

      {/* Subject blocks */}
      {blocks.map(block => {
        const colors = SUBJECT_COLORS[block.subject] || DEFAULT_COLORS
        const icon = SUBJECT_ICONS[block.subject] || '📝'
        const blockDone = block.completedTasks === block.totalTasks
        const blockProgress = block.totalTasks > 0 ? Math.round((block.completedTasks / block.totalTasks) * 100) : 0

        return (
          <div key={block.subject}>
            <div className={`rounded-xl border ${colors.border} ${colors.bg} overflow-hidden`}>
              {/* Subject header */}
              <div className={`${colors.header} px-4 py-3 flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{icon}</span>
                  <span className="font-semibold">{block.subject}</span>
                  <span className="text-xs opacity-70">({block.totalMinutes} min)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${blockDone ? 'text-green-700' : ''}`}>
                    {block.completedTasks}/{block.totalTasks}
                    {blockDone && ' ✓'}
                  </span>
                  {/* Mini progress */}
                  <div className="w-16 h-1.5 bg-white/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${blockDone ? 'bg-green-500' : 'bg-white/80'}`}
                      style={{ width: `${blockProgress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Tasks */}
              <div className="divide-y divide-white/50">
                {block.tasks.map(task => (
                  <button
                    key={task.id}
                    onClick={() => handleTaskClick(task)}
                    className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/50 transition-colors group"
                  >
                    <div style={task.completed ? { animation: 'checkPop 0.3s ease' } : {}}>
                      {task.completed ? (
                        <CheckCircle2 className={`w-6 h-6 ${colors.check} fill-current`} />
                      ) : (
                        <Circle className="w-6 h-6 text-gray-300 group-hover:text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-medium ${task.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {task.task_label}
                      </span>
                      {task.task_description && !task.completed && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{task.task_description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 shrink-0">
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-3 h-3" /> {task.duration_min}m
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Star className="w-3 h-3" /> {task.stars_value}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Enrichment card — appears when all tasks in this subject are done */}
            {blockDone && (
              <EnrichmentCard
                kidName={kidName}
                subject={block.subject.toLowerCase().replace(/ /g, '_')}
                onStarEarned={onStarEarned}
              />
            )}
          </div>
        )
      })}

      {/* Workbook page logging modal */}
      {workbookModal && (
        <WorkbookLogModal
          kidName={kidName}
          workbookName={workbookModal.workbookName}
          onClose={() => setWorkbookModal(null)}
          onLogged={() => handleWorkbookComplete(workbookModal.task)}
        />
      )}
    </div>
  )
}
