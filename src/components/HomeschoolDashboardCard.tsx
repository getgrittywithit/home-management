'use client'

import { useState, useEffect } from 'react'
import { BookOpen, AlertTriangle } from 'lucide-react'

interface KidSummary {
  name: string
  mascot: string
  subjects_done: number
  subjects_total: number
  focus_sessions: number
}

interface HomeschoolDashboardCardProps {
  onNavigate?: () => void
}

export default function HomeschoolDashboardCard({ onNavigate }: HomeschoolDashboardCardProps) {
  const [kids, setKids] = useState<KidSummary[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/homeschool?action=dashboard_summary')
      .then(r => r.json())
      .then(data => {
        setKids(data.kids || [])
        setLoaded(true)
      })
      .catch(() => {
        // Fallback with placeholder structure
        setKids([
          { name: 'Amos', mascot: '🦉', subjects_done: 0, subjects_total: 0, focus_sessions: 0 },
          { name: 'Ellie', mascot: '🐱', subjects_done: 0, subjects_total: 0, focus_sessions: 0 },
          { name: 'Wyatt', mascot: '🐕', subjects_done: 0, subjects_total: 0, focus_sessions: 0 },
          { name: 'Hannah', mascot: '🐰', subjects_done: 0, subjects_total: 0, focus_sessions: 0 },
        ])
        setLoaded(true)
      })
  }, [])

  const now = new Date()
  const isAfter10am = now.getHours() >= 10

  if (!loaded) return null

  return (
    <div className="bg-white rounded-lg border shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-teal-600" />
          Homeschool Today
        </h3>
        {onNavigate && (
          <button
            onClick={onNavigate}
            className="text-sm text-teal-600 hover:text-teal-800 font-medium"
          >
            Open Homeschool &rarr;
          </button>
        )}
      </div>

      <div className="space-y-2">
        {kids.map(kid => {
          const concern = isAfter10am && kid.focus_sessions === 0
          return (
            <div
              key={kid.name}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                concern ? 'bg-amber-50' : 'bg-gray-50'
              }`}
            >
              <span className="text-lg">{kid.mascot}</span>
              <span className="font-medium text-gray-800 flex-1">{kid.name}</span>
              <span className="text-xs text-gray-500">
                {kid.subjects_done}/{kid.subjects_total} subjects
              </span>
              <span className="text-xs text-gray-500">
                {kid.focus_sessions} focus
              </span>
              {concern && (
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
