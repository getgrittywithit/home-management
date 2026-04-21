'use client'

import { useState, useEffect } from 'react'
import { Moon, Check, Clock } from 'lucide-react'
import { HOMESCHOOL_KIDS, KID_DISPLAY } from '@/lib/constants'

const KID_EMOJI: Record<string, string> = { amos: '🧡', ellie: '🌻', wyatt: '⚡', hannah: '🌱' }

export default function ParentEveningWrap() {
  const [summaries, setSummaries] = useState<Record<string, { total: number; done: number; ixlMinutes: number }>>({})
  const [loaded, setLoaded] = useState(false)

  const hour = parseInt(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Chicago' }).format(new Date()))
  const isEvening = hour >= 18 && hour < 22

  useEffect(() => {
    if (!isEvening) { setLoaded(true); return }
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

    Promise.all(
      [...HOMESCHOOL_KIDS].map(async kid => {
        const [taskRes, ixlRes] = await Promise.all([
          fetch(`/api/homeschool?action=get_daily_tasks&kid_name=${kid}&date=${today}`).then(r => r.json()).catch(() => ({ tasks: [] })),
          fetch(`/api/school/ixl-log?kid_name=${kid}&days=1`).then(r => r.json()).catch(() => ({ logs: [] })),
        ])
        const tasks = taskRes.tasks || []
        const ixlLog = (ixlRes.logs || []).find((l: any) => l.log_date === today)
        return [kid, {
          total: tasks.length,
          done: tasks.filter((t: any) => t.status === 'completed').length,
          ixlMinutes: ixlLog?.minutes_spent || 0,
        }] as const
      })
    ).then(entries => { setSummaries(Object.fromEntries(entries)); setLoaded(true) })
  }, [isEvening])

  if (!isEvening || !loaded) return null

  const hasSummaries = Object.values(summaries).some(s => s.total > 0)
  if (!hasSummaries) return null

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 mb-3">
        <Moon className="w-4 h-4 text-indigo-500" /> Evening Wrap-Up
      </h3>
      <div className="space-y-2">
        {[...HOMESCHOOL_KIDS].map(kid => {
          const s = summaries[kid]
          if (!s || s.total === 0) return null
          const pct = Math.round((s.done / s.total) * 100)
          return (
            <div key={kid} className="flex items-center gap-2">
              <span className="text-sm">{KID_EMOJI[kid]}</span>
              <span className="text-xs font-medium text-gray-700 w-14">{KID_DISPLAY[kid]}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div className={`h-2 rounded-full ${pct === 100 ? 'bg-green-500' : pct > 50 ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[10px] text-gray-500 w-10 text-right">{s.done}/{s.total}</span>
              {s.ixlMinutes > 0 && (
                <span className="text-[10px] text-teal-600 flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" /> {s.ixlMinutes}m IXL
                </span>
              )}
              {pct === 100 && <Check className="w-3.5 h-3.5 text-green-500" />}
            </div>
          )
        })}
      </div>
      <p className="text-[10px] text-gray-400 mt-2 text-center">Great effort today, everyone.</p>
    </div>
  )
}
