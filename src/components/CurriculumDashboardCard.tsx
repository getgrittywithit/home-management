'use client'

import { useState, useEffect } from 'react'
import { BookOpen, DollarSign, Calendar, ChevronRight } from 'lucide-react'

const KIDS = [
  { id: 'amos', label: 'Amos', color: 'text-blue-600' },
  { id: 'ellie', label: 'Ellie', color: 'text-pink-600' },
  { id: 'wyatt', label: 'Wyatt', color: 'text-emerald-600' },
  { id: 'hannah', label: 'Hannah', color: 'text-amber-600' },
]

interface KidBudget {
  kid_name: string
  budget: number
  spent: number
  committed: number
  remaining: number
  item_count: number
}

export default function CurriculumDashboardCard({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [summary, setSummary] = useState<{ kids: KidBudget[]; totals: any } | null>(null)
  const [units, setUnits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/curriculum-planner?action=get_summary&school_year=2026-27').then(r => r.json()).catch(() => null),
      fetch('/api/curriculum-planner?action=get_year_map&school_year=2026-27').then(r => r.json()).catch(() => ({ units: [] })),
    ]).then(([s, u]) => {
      setSummary(s?.kids ? s : null)
      // Find units starting this month or next
      const now = new Date()
      const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
      const curMonth = months[now.getMonth()]
      const nextMonth = months[(now.getMonth() + 1) % 12]
      const upcoming = (u?.units || []).filter((unit: any) =>
        unit.month === curMonth || unit.month === nextMonth
      ).slice(0, 3)
      setUnits(upcoming)
    }).finally(() => setLoading(false))
  }, [])

  if (loading || !summary) return null

  const totalRemaining = summary.totals?.total_remaining || 0
  const totalBudget = summary.totals?.total_budget || 8000
  const pctUsed = Math.round(((totalBudget - totalRemaining) / totalBudget) * 100)

  const budgetColor = pctUsed >= 90 ? 'text-red-600' : pctUsed >= 75 ? 'text-amber-600' : 'text-emerald-600'

  return (
    <div
      className="bg-white rounded-xl border shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onNavigate?.('curriculum')}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-purple-500" />
          Curriculum & TEFA
        </h3>
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </div>

      {/* Budget strip */}
      <div className="flex items-baseline gap-1.5 mb-2">
        <DollarSign className="w-3.5 h-3.5 text-slate-400" />
        <span className={`text-lg font-bold ${budgetColor}`}>
          ${totalRemaining.toLocaleString()}
        </span>
        <span className="text-xs text-slate-400">remaining across 4 kids</span>
      </div>

      {/* Per-kid mini bars */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {summary.kids.map(k => {
          const kidMeta = KIDS.find(km => km.id === k.kid_name)
          const kidPct = Math.round(((k.spent + k.committed) / k.budget) * 100)
          return (
            <div key={k.kid_name} className="text-center">
              <div className="text-[10px] font-medium text-slate-500">{kidMeta?.label || k.kid_name}</div>
              <div className="h-1.5 bg-slate-100 rounded-full mt-0.5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${kidPct >= 90 ? 'bg-red-400' : kidPct >= 75 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                  style={{ width: `${Math.min(kidPct, 100)}%` }}
                />
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">${k.remaining}</div>
            </div>
          )
        })}
      </div>

      {/* Upcoming units */}
      {units.length > 0 && (
        <div className="border-t pt-2">
          <div className="text-[10px] font-semibold text-slate-400 uppercase mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Coming Up
          </div>
          {units.map((u: any) => (
            <div key={u.id} className="text-xs text-slate-600 truncate">
              <span className="font-medium">{u.kid_name?.charAt(0).toUpperCase()}{u.kid_name?.slice(1)}</span>
              <span className="text-slate-400"> · {u.subject} · </span>
              {u.unit_title}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
