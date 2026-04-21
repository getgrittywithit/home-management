'use client'

import { useState, useEffect } from 'react'
import { BookOpen, ExternalLink, Check, Calculator, Sparkles } from 'lucide-react'
import { HOMESCHOOL_KIDS } from '@/lib/constants'
import SpeakerButton from '../SpeakerButton'

const SUBJECT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Math: { bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-200' },
  ELAR: { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200' },
  Enrichment: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  Science: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
  'Social Studies': { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200' },
}

const GREETINGS = [
  'Ready when you are — here\'s your plan for today.',
  'Let\'s have a great learning day!',
  'Your plan is set — take your time with each one.',
  'Here\'s what we\'re working on today. You\'ve got this!',
]

interface Props { kidName: string }

export default function MySchoolToday({ kidName }: Props) {
  const kid = kidName.toLowerCase()
  const [tasks, setTasks] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)

  if (!(HOMESCHOOL_KIDS as readonly string[]).includes(kid)) return null

  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
    fetch(`/api/homeschool?action=get_daily_tasks&kid_name=${kid}&date=${today}`)
      .then(r => r.json())
      .then(d => { setTasks(d.tasks || []); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [kid])

  if (!loaded || tasks.length === 0) return null

  const displayName = kidName.charAt(0).toUpperCase() + kidName.slice(1)
  const greeting = GREETINGS[new Date().getDay() % GREETINGS.length]
  const completed = tasks.filter(t => t.status === 'completed').length
  const total = tasks.length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  const toggleTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    const newStatus = task.status === 'completed' ? 'pending' : 'completed'
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    await fetch('/api/homeschool', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_task', task_id: taskId, kid_name: kid }),
    }).catch(() => {})
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white p-4">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <BookOpen className="w-4 h-4" /> My School Today
        </h3>
        <p className="text-xs text-teal-100 mt-1">Hi {displayName}! {greeting}</p>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 bg-white/20 rounded-full h-2">
            <div className={`h-2 rounded-full ${pct === 100 ? 'bg-yellow-300' : 'bg-white'}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs">{completed}/{total}</span>
        </div>
      </div>

      <div className="p-3 space-y-2">
        {tasks.map((task: any) => {
          const colors = SUBJECT_COLORS[task.subject_name] || { bg: 'bg-gray-50', text: 'text-gray-800', border: 'border-gray-200' }
          const isDone = task.status === 'completed'
          return (
            <div key={task.id} className={`flex items-start gap-3 p-2.5 rounded-lg border ${isDone ? 'bg-green-50 border-green-200' : `${colors.bg} ${colors.border}`}`}>
              <button onClick={() => toggleTask(task.id)}
                className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-green-400'}`}>
                {isDone && <Check className="w-3 h-3" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${isDone ? 'line-through text-gray-400' : colors.text} font-medium`}>
                  {task.task_title || task.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}>{task.subject_name}</span>
                  {task.source_type && <span className="text-[10px] text-gray-400">{task.source_type.replace(/_/g, ' ')}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {!isDone && <SpeakerButton text={task.task_title || task.title} size="sm" rate={0.9} />}
                {task.deep_link_url && (
                  <a href={task.deep_link_url} target="_blank" rel="noopener noreferrer"
                    className="p-1 rounded hover:bg-gray-100" title="Open">
                    <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {pct === 100 && (
        <div className="bg-yellow-50 border-t border-yellow-200 p-3 text-center">
          <p className="text-sm font-medium text-yellow-800">Beautifully done, {displayName}! All finished for today.</p>
        </div>
      )}
    </div>
  )
}
