'use client'

import { useState, useEffect } from 'react'
import {
  CheckCircle2, Clock, BookOpen, Palette, Coffee, Home as HomeIcon,
  Sun, TreePine, Utensils, Moon, Sparkles, ChevronRight
} from 'lucide-react'

interface ScheduleBlock {
  time: string
  duration: number
  summary: string
  category: string
}

const HOMESCHOOL_KIDS = [
  { name: 'Amos', grade: '10th Grade', emoji: '🎮', note: 'ADHD + autism — Focalin AM, Clonidine PM' },
  { name: 'Ellie', grade: '6th Grade', emoji: '🎭', note: 'Business-minded, loves life' },
  { name: 'Wyatt', grade: '4th Grade', emoji: '⚽', note: 'ADHD — Focalin AM, Clonidine PM' },
  { name: 'Hannah', grade: '3rd Grade', emoji: '🌟', note: 'Building confidence in reading & math' },
]

const CATEGORY_STYLES: Record<string, { bg: string; text: string; icon: React.ComponentType<{ className?: string }> }> = {
  academics: { bg: 'bg-green-100', text: 'text-green-800', icon: BookOpen },
  enrichment: { bg: 'bg-purple-100', text: 'text-purple-800', icon: Palette },
  chores: { bg: 'bg-amber-100', text: 'text-amber-800', icon: Sparkles },
  routine: { bg: 'bg-blue-100', text: 'text-blue-800', icon: HomeIcon },
  break: { bg: 'bg-gray-100', text: 'text-gray-600', icon: Coffee },
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function formatTime(time: string): string {
  const [h, m] = time.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${m} ${ampm}`
}

function getTodayKey(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
}

export default function HomeschoolTab() {
  const [schedule, setSchedule] = useState<ScheduleBlock[]>([])
  const [completions, setCompletions] = useState<Record<string, boolean>>({})
  const [selectedKid, setSelectedKid] = useState('Amos')
  const [loaded, setLoaded] = useState(false)
  const [currentMinutes, setCurrentMinutes] = useState(0)
  const dateStr = getTodayKey()

  // Load schedule + completions
  useEffect(() => {
    fetch(`/api/school/homeschool?date=${dateStr}`)
      .then(r => r.json())
      .then(data => {
        setSchedule(data.schedule || [])
        setCompletions(data.completions || {})
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [dateStr])

  // Update current time every minute
  useEffect(() => {
    const update = () => {
      const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
      setCurrentMinutes(now.getHours() * 60 + now.getMinutes())
    }
    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [])

  const toggleBlock = async (kidName: string, summary: string) => {
    const key = `${kidName}|${summary}`
    const newCompleted = !completions[key]
    setCompletions(prev => ({ ...prev, [key]: newCompleted }))

    try {
      await fetch('/api/school/homeschool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_checklist_item',
          data: { child_name: kidName, event_summary: summary, date: dateStr, completed: newCompleted }
        })
      })
    } catch (error) {
      console.error('Error toggling checklist item:', error)
    }
  }

  // Find current and next block
  const currentBlockIndex = schedule.findIndex((block, i) => {
    const start = timeToMinutes(block.time)
    const end = start + block.duration
    return currentMinutes >= start && currentMinutes < end
  })
  const nextBlockIndex = currentBlockIndex >= 0 ? currentBlockIndex + 1 : schedule.findIndex(b => timeToMinutes(b.time) > currentMinutes)

  // Count completions for each kid
  const getKidProgress = (kidName: string) => {
    const total = schedule.length
    const done = schedule.filter(b => completions[`${kidName}|${b.summary}`]).length
    return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 }
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    )
  }

  const selectedKidInfo = HOMESCHOOL_KIDS.find(k => k.name === selectedKid)
  const progress = getKidProgress(selectedKid)

  return (
    <div className="space-y-6">
      {/* Kid Selector Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {HOMESCHOOL_KIDS.map(kid => {
          const p = getKidProgress(kid.name)
          const isSelected = selectedKid === kid.name
          return (
            <button
              key={kid.name}
              onClick={() => setSelectedKid(kid.name)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                isSelected
                  ? 'border-teal-500 bg-teal-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-teal-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{kid.emoji}</span>
                <span className="font-bold text-gray-900">{kid.name}</span>
              </div>
              <p className="text-xs text-gray-500 mb-2">{kid.grade}</p>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-teal-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${p.pct}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{p.done}/{p.total} blocks</p>
            </button>
          )
        })}
      </div>

      {/* Selected Kid Header */}
      <div className="bg-gradient-to-r from-teal-500 to-green-500 text-white p-4 rounded-lg flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">{selectedKidInfo?.emoji} {selectedKid}'s Day</h2>
          <p className="text-teal-100 text-sm">{selectedKidInfo?.note}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{progress.pct}%</div>
          <div className="text-xs text-teal-100">{progress.done}/{progress.total} complete</div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Today's Block Schedule</h3>
          <span className="text-xs text-gray-500">
            {new Date().toLocaleDateString('en-US', { timeZone: 'America/Chicago', weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
        </div>
        <div className="divide-y">
          {schedule.map((block, i) => {
            const key = `${selectedKid}|${block.summary}`
            const done = !!completions[key]
            const isCurrent = i === currentBlockIndex
            const isNext = i === nextBlockIndex
            const isPast = timeToMinutes(block.time) + block.duration <= currentMinutes
            const style = CATEGORY_STYLES[block.category] || CATEGORY_STYLES.routine
            const Icon = style.icon

            return (
              <div
                key={i}
                className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                  isCurrent ? 'bg-teal-50 border-l-4 border-l-teal-500' :
                  isNext ? 'bg-green-50/50' :
                  isPast && !done ? 'bg-gray-50' : ''
                }`}
              >
                {/* Checkbox */}
                <button onClick={() => toggleBlock(selectedKid, block.summary)} className="flex-shrink-0">
                  {done ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <div className={`w-5 h-5 border-2 rounded-full ${isCurrent ? 'border-teal-500' : 'border-gray-300'}`} />
                  )}
                </button>

                {/* Time */}
                <div className="w-20 flex-shrink-0 text-right">
                  <span className={`text-sm font-medium ${isCurrent ? 'text-teal-700' : 'text-gray-500'}`}>
                    {formatTime(block.time)}
                  </span>
                </div>

                {/* Block info */}
                <div className="flex-1 flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                    <Icon className="w-3 h-3" />
                    {block.category}
                  </span>
                  <span className={`text-sm ${done ? 'line-through text-gray-400' : isCurrent ? 'font-semibold text-teal-900' : 'text-gray-800'}`}>
                    {block.summary}
                  </span>
                </div>

                {/* Duration + indicators */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-400">{block.duration}m</span>
                  {isCurrent && (
                    <span className="text-xs bg-teal-500 text-white px-2 py-0.5 rounded-full font-medium animate-pulse">
                      NOW
                    </span>
                  )}
                  {isNext && !isCurrent && (
                    <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                      <ChevronRight className="w-3 h-3" /> Next
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
