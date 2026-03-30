'use client'

import { useState, useEffect } from 'react'
import { Flame, AlertTriangle, ChevronRight } from 'lucide-react'

interface MemberSummary {
  name: string
  total: number
  done: number
  medAlerts: string[]
}

const MEMBER_COLORS: Record<string, string> = {
  Lola: 'bg-rose-500', Michael: 'bg-blue-600', Amos: 'bg-blue-500', Ellie: 'bg-purple-500',
  Wyatt: 'bg-green-500', Hannah: 'bg-pink-500', Zoey: 'bg-amber-500', Kaylee: 'bg-teal-500'
}

interface HabitsDashboardCardProps {
  onNavigate: () => void
}

export default function HabitsDashboardCard({ onNavigate }: HabitsDashboardCardProps) {
  const [members, setMembers] = useState<MemberSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    fetch(`/api/habits?action=get_all_habits_today&date=${today}`)
      .then(r => r.json())
      .then(data => {
        const grouped = data.habits_by_member || {}
        const summaries: MemberSummary[] = Object.entries(grouped).map(([name, habits]: [string, any]) => {
          const total = habits.length
          const done = habits.filter((h: any) => h.completion_status === 'completed').length
          const medAlerts = habits
            .filter((h: any) => h.category === 'health' && h.emoji === '\uD83D\uDC8A' && h.completion_status !== 'completed')
            .map((h: any) => h.title)
          return { name, total, done, medAlerts }
        })
        setMembers(summaries)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const allMedAlerts = members.flatMap(m => m.medAlerts.map(a => `${m.name}: ${a}`))

  if (loading || members.length === 0) return null

  return (
    <div className="bg-white border rounded-xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" /> Habits
        </h3>
        <button
          onClick={onNavigate}
          className="text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1"
        >
          Open <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Per-member progress */}
      <div className="space-y-2">
        {members.map(m => (
          <div key={m.name} className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${MEMBER_COLORS[m.name] || 'bg-gray-400'}`}>
              {m.name[0]}
            </div>
            <span className="text-sm text-gray-700 flex-1">{m.name}</span>
            <div className="flex items-center gap-2">
              <div className="w-20 bg-gray-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${m.done === m.total ? 'bg-green-500' : 'bg-orange-400'}`}
                  style={{ width: `${m.total > 0 ? (m.done / m.total) * 100 : 0}%` }}
                />
              </div>
              <span className={`text-xs font-semibold w-8 text-right ${m.done === m.total ? 'text-green-600' : 'text-gray-600'}`}>
                {m.done}/{m.total}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Medication alerts */}
      {allMedAlerts.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          {allMedAlerts.map((alert, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-full mt-1">
              <AlertTriangle className="w-3 h-3" /> {alert}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
