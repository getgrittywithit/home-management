'use client'

import { CheckSquare, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { useDashboardData } from '@/context/DashboardDataContext'

const KID_DISPLAY: Record<string, string> = { amos: 'Amos', ellie: 'Ellie', wyatt: 'Wyatt', hannah: 'Hannah', zoey: 'Zoey', kaylee: 'Kaylee' }
const ALL_KIDS = ['amos', 'ellie', 'wyatt', 'hannah', 'zoey', 'kaylee']

interface KidCompletion {
  name: string
  required: { done: number; total: number }
  dailyCare: { done: number; total: number }
  earnMoney: { done: number; total: number }
}

function pctColor(done: number, total: number): string {
  if (total === 0) return 'text-gray-400'
  const pct = (done / total) * 100
  return pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'
}

function pctBg(done: number, total: number): string {
  if (total === 0) return 'bg-gray-300'
  const pct = (done / total) * 100
  return pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
}

export default function KidsChecklistOverview() {
  const { kidsChecklist, taskProgress, loaded } = useDashboardData()

  // Derive kids from context data
  const checklistKids = kidsChecklist.kids || []
  const progress = taskProgress.progress || []

  let kids: KidCompletion[]
  if (checklistKids.length > 0 && checklistKids.some((k: any) => k.required?.total > 0)) {
    kids = checklistKids
  } else if (progress.length > 0) {
    kids = ALL_KIDS.map(name => {
      const tp = progress.find((p: any) => p.kid_name === name)
      return {
        name,
        required: { done: tp?.completed_tasks || 0, total: tp?.total_tasks || 0 },
        dailyCare: { done: 0, total: 0 },
        earnMoney: { done: 0, total: 0 },
      }
    })
  } else {
    kids = ALL_KIDS.map(name => ({
      name, required: { done: 0, total: 0 }, dailyCare: { done: 0, total: 0 }, earnMoney: { done: 0, total: 0 },
    }))
  }

  const weekOf = kidsChecklist.weekOf || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

  if (!loaded) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" /></div>

  const weekEnd = weekOf ? new Date(new Date(weekOf + 'T12:00:00').getTime() + 6 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
  const weekStart = weekOf ? new Date(weekOf + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold">Kids Daily Tasks</h1>
        <p className="text-emerald-100">Week of {weekStart} – {weekEnd}</p>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="p-3 font-medium">Kid</th>
              <th className="p-3 font-medium text-center">Required</th>
              <th className="p-3 font-medium text-center">Daily Care</th>
              <th className="p-3 font-medium text-center">Earn Money</th>
              <th className="p-3 font-medium text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {kids.map(kid => {
              const reqPct = kid.required.total > 0 ? (kid.required.done / kid.required.total) * 100 : 0
              return (
                <tr key={kid.name}>
                  <td className="p-3 font-medium text-gray-900">{KID_DISPLAY[kid.name] || kid.name}</td>
                  <td className="p-3 text-center">
                    <span className={`font-medium ${pctColor(kid.required.done, kid.required.total)}`}>
                      {kid.required.done}/{kid.required.total}
                    </span>
                    {kid.required.total > 0 && (
                      <div className="w-16 h-1.5 mx-auto mt-1 bg-gray-200 rounded-full">
                        <div className={`h-full rounded-full ${pctBg(kid.required.done, kid.required.total)}`} style={{ width: `${reqPct}%` }} />
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`font-medium ${pctColor(kid.dailyCare.done, kid.dailyCare.total)}`}>
                      {kid.dailyCare.done}/{kid.dailyCare.total}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className="text-gray-500">{kid.earnMoney.done}/{kid.earnMoney.total}</span>
                  </td>
                  <td className="p-3 text-center">
                    {reqPct >= 100 ? (
                      <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Done
                      </span>
                    ) : reqPct > 0 ? (
                      <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-medium">
                        <Clock className="w-3.5 h-3.5" /> In Progress
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">Not Started</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
