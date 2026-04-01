'use client'

import { useState, useEffect } from 'react'
import { CheckSquare, CheckCircle2, AlertCircle, Clock } from 'lucide-react'

const KID_DISPLAY: Record<string, string> = { amos: 'Amos', ellie: 'Ellie', wyatt: 'Wyatt', hannah: 'Hannah', zoey: 'Zoey', kaylee: 'Kaylee' }

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
  const [weekOf, setWeekOf] = useState('')
  const [kids, setKids] = useState<KidCompletion[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/kids/checklist?action=get_all_completion').then(r => r.json()).catch(() => ({ weekOf: '', kids: [] })),
      fetch('/api/homeschool?action=get_task_progress').then(r => r.json()).catch(() => ({ progress: [] })),
    ]).then(([checklistData, taskData]) => {
      setWeekOf(checklistData.weekOf || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }))
      // Merge: if checklist data is empty but task progress exists, use task data
      const checklistKids = checklistData.kids || []
      const taskProgress = taskData.progress || []
      if (checklistKids.length > 0 && checklistKids.some((k: any) => k.required.total > 0)) {
        setKids(checklistKids)
      } else if (taskProgress.length > 0) {
        // Build from homeschool task progress
        const allKidNames = ['amos', 'ellie', 'wyatt', 'hannah', 'zoey', 'kaylee']
        setKids(allKidNames.map(name => {
          const tp = taskProgress.find((p: any) => p.kid_name === name)
          return {
            name,
            required: { done: tp?.completed_tasks || 0, total: tp?.total_tasks || 0 },
            dailyCare: { done: 0, total: 0 },
            earnMoney: { done: 0, total: 0 },
          }
        }))
      } else {
        setKids(checklistKids)
      }
      setLoaded(true)
    })
  }, [])

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
                    <span className={`font-semibold ${pctColor(kid.required.done, kid.required.total)}`}>
                      {kid.required.done}/{kid.required.total}
                    </span>
                    <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                      <div className={`${pctBg(kid.required.done, kid.required.total)} h-1 rounded-full`}
                        style={{ width: `${kid.required.total > 0 ? (kid.required.done / kid.required.total) * 100 : 0}%` }} />
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`font-semibold ${pctColor(kid.dailyCare.done, kid.dailyCare.total)}`}>
                      {kid.dailyCare.done}/{kid.dailyCare.total}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className="font-semibold text-gray-600">{kid.earnMoney.done}/{kid.earnMoney.total}</span>
                  </td>
                  <td className="p-3 text-center">
                    {reqPct >= 80 ? <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" /> :
                     reqPct >= 50 ? <Clock className="w-5 h-5 text-amber-500 mx-auto" /> :
                     kid.required.total === 0 ? <span className="text-gray-400">—</span> :
                     <AlertCircle className="w-5 h-5 text-red-500 mx-auto" />}
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
