'use client'

import { useState, useEffect } from 'react'
import { ClipboardList, Check, AlertTriangle } from 'lucide-react'
import { KID_DISPLAY } from '@/lib/constants'

interface MakeupItem {
  id: number
  kid_name: string
  subject: string
  assignment_description?: string
  absent_date?: string
  due_date?: string
  sick_date?: string
  status: string
}

export default function MakeupWorkCard() {
  const [items, setItems] = useState<MakeupItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/attendance?action=get_makeup_work&status=assigned').then(r => r.json()).catch(() => ({ makeup_work: [] })),
      fetch('/api/parent/teacher', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_overview' }),
      }).then(r => r.json()).catch(() => ({ makeup: [] })),
    ]).then(([attendance, teacher]) => {
      const all = [
        ...(attendance.makeup_work || []),
        ...(teacher.makeup || []),
      ]
      const unique = all.filter((item, i, arr) => arr.findIndex(a => a.id === item.id && a.kid_name === item.kid_name) === i)
      setItems(unique.filter((i: any) => i.status === 'assigned' || i.status === 'pending'))
      setLoading(false)
    })
  }, [])

  const markComplete = async (item: MakeupItem) => {
    await fetch('/api/attendance', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete_makeup', id: item.id }),
    }).catch(() => {})
    setItems(prev => prev.filter(i => i.id !== item.id))
  }

  if (loading || items.length === 0) return null

  const today = new Date().toLocaleDateString('en-CA')
  const overdue = items.filter(i => i.due_date && i.due_date < today)

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 mb-3">
        <ClipboardList className="w-4 h-4 text-orange-500" />
        Makeup Work
        {overdue.length > 0 && (
          <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
            <AlertTriangle className="w-3 h-3" /> {overdue.length} overdue
          </span>
        )}
      </h3>
      <div className="space-y-2">
        {items.map(item => {
          const isOverdue = item.due_date && item.due_date < today
          return (
            <div key={`${item.id}-${item.kid_name}`}
              className={`flex items-center justify-between p-2.5 rounded-lg border ${isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50'}`}>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {KID_DISPLAY[item.kid_name] || item.kid_name} — {item.subject}
                </p>
                <p className="text-xs text-gray-500">
                  {item.assignment_description || 'Makeup assignment'}
                  {item.due_date && <span className={`ml-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                    · Due {new Date(item.due_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>}
                </p>
              </div>
              <button onClick={() => markComplete(item)}
                className="p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200" title="Mark complete">
                <Check className="w-4 h-4" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
