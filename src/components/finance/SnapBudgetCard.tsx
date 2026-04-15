'use client'

// ============================================================================
// D75b FIN-SNAP-1 — SNAP Smart Budget Manager
// Smart analytics layer sitting above the existing SNAP vs Cash tracker.
// Calculates burn rate, projected runout date, days remaining, and a
// per-day budget to make SNAP last the full month. Cross-references the
// existing pantry_stock so parents see "use what you have" nudges.
// ============================================================================

import { useState, useEffect } from 'react'
import { ShoppingCart, TrendingDown, Calendar, AlertTriangle, Package, Info } from 'lucide-react'

interface SnapData {
  snap: number
  cash: number
  total: number
  weekly: { week_start: string; snap: number; cash: number; total: number }[]
}

interface FinanceConfig {
  snap_monthly_amount?: number
  snap_monthly?: number
  cash_grocery_budget?: number
  monthly_grocery_budget?: number
  budget_reset_day?: number
}

function fmt(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate()
}

interface Props {
  month: string // YYYY-MM
}

export default function SnapBudgetCard({ month }: Props) {
  const [snap, setSnap] = useState<SnapData | null>(null)
  const [config, setConfig] = useState<FinanceConfig | null>(null)
  const [pantryCount, setPantryCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/finance?action=get_snap_vs_cash&month=${month}`).then((r) => r.json()).catch(() => null),
      fetch('/api/finance?action=get_finance_config').then((r) => r.json()).catch(() => null),
      fetch('/api/grocery?action=list_pantry').then((r) => r.json()).catch(() => null),
    ]).then(([s, cfg, pan]) => {
      setSnap(s || { snap: 0, cash: 0, total: 0, weekly: [] })
      setConfig(cfg?.config || cfg || null)
      const items = pan?.items || pan?.pantry || []
      setPantryCount(Array.isArray(items) ? items.length : 0)
    }).finally(() => setLoading(false))
  }, [month])

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5 animate-pulse">
        <div className="h-6 w-48 bg-blue-100 rounded mb-4" />
        <div className="h-24 bg-blue-100 rounded" />
      </div>
    )
  }

  const snapBudget = Number(config?.snap_monthly_amount || config?.snap_monthly || 1141)
  const snapSpent = Number(snap?.snap || 0)
  const snapRemaining = Math.max(0, snapBudget - snapSpent)
  const pctUsed = snapBudget > 0 ? Math.min(100, (snapSpent / snapBudget) * 100) : 0
  const pctRemaining = Math.round(100 - pctUsed)

  // ----- Date math -----
  const [yearStr, monthStr] = month.split('-')
  const y = parseInt(yearStr)
  const m = parseInt(monthStr)
  const totalDaysInMonth = daysInMonth(y, m)

  // Days elapsed in the target month (cap at totalDaysInMonth if viewing a past month)
  const now = new Date()
  const isCurrentMonth = now.getFullYear() === y && now.getMonth() + 1 === m
  const daysElapsed = isCurrentMonth
    ? now.getDate()
    : now > new Date(y, m - 1, 1)
      ? totalDaysInMonth
      : 0
  const daysRemaining = Math.max(0, totalDaysInMonth - daysElapsed)

  // Burn rate: average daily SNAP spend so far
  const dailyBurn = daysElapsed > 0 ? snapSpent / daysElapsed : 0
  // Required pace: even-spend pace across the full month
  const requiredPace = totalDaysInMonth > 0 ? snapBudget / totalDaysInMonth : 0
  // Daily budget to make remaining SNAP last the remaining days
  const dailyBudgetToLast = daysRemaining > 0 ? snapRemaining / daysRemaining : 0

  // Projected runout date: assume continued daily burn
  let projectedRunoutDate: Date | null = null
  let runoutDaysEarly = 0
  if (dailyBurn > 0 && snapRemaining > 0) {
    const daysUntilRunout = snapRemaining / dailyBurn
    projectedRunoutDate = new Date(y, m - 1, daysElapsed + Math.floor(daysUntilRunout))
    // How many days early compared to month end?
    const monthEnd = new Date(y, m - 1, totalDaysInMonth)
    const diffMs = monthEnd.getTime() - projectedRunoutDate.getTime()
    runoutDaysEarly = Math.round(diffMs / (1000 * 60 * 60 * 24))
  }

  // Pace status
  type Pace = 'empty' | 'ahead' | 'on_pace' | 'behind' | 'done'
  let pace: Pace = 'on_pace'
  if (snapSpent === 0 && daysElapsed > 3) pace = 'empty'
  else if (snapSpent === 0) pace = 'on_pace'
  else if (dailyBurn > requiredPace * 1.1) pace = 'ahead'      // >10% over pace = spending too fast
  else if (dailyBurn < requiredPace * 0.9) pace = 'behind'     // <90% of pace = room to spend
  if (snapRemaining === 0) pace = 'done'

  const paceMeta: Record<Pace, { label: string; emoji: string; color: string; tone: string }> = {
    empty: { label: 'No SNAP purchases yet', emoji: '🌱', color: 'text-gray-600', tone: 'bg-gray-100 border-gray-200' },
    ahead: { label: 'Slightly ahead of pace', emoji: '⚠️', color: 'text-amber-700', tone: 'bg-amber-50 border-amber-200' },
    on_pace: { label: 'On pace', emoji: '✅', color: 'text-green-700', tone: 'bg-green-50 border-green-200' },
    behind: { label: 'Under pace — room to spend', emoji: '💚', color: 'text-emerald-700', tone: 'bg-emerald-50 border-emerald-200' },
    done: { label: 'SNAP fully spent this month', emoji: '💳', color: 'text-gray-600', tone: 'bg-gray-100 border-gray-200' },
  }
  const meta = paceMeta[pace]

  // ----- Smart tips -----
  const tips: string[] = []
  if (snapRemaining > 0 && daysRemaining > 0) {
    tips.push(`You have ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left and ${fmt(snapRemaining)} remaining.`)
    tips.push(`Daily budget to make SNAP last the month: ${fmt(dailyBudgetToLast)}/day`)
  }
  if (pace === 'ahead') {
    tips.push('Consider a pantry-focused week — use what you already have.')
  }
  if (pantryCount > 0) {
    tips.push(`You have ${pantryCount} items in your pantry inventory.`)
  }

  // Next SNAP deposit: 1st of next month
  const nextDeposit = new Date(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 1)
  const nextDepositLabel = nextDeposit.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

  return (
    <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-bold text-blue-900 flex items-center gap-2">
            🍎 SNAP Budget Manager
          </h3>
          <p className="text-xs text-blue-700 mt-0.5">
            {new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} · Deposit {fmt(snapBudget)}
          </p>
        </div>
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full border ${meta.tone} ${meta.color}`}>
          <span>{meta.emoji}</span> {meta.label}
        </span>
      </div>

      {/* Balance bar */}
      <div>
        <div className="flex items-center justify-between text-sm font-semibold mb-1">
          <span className="text-blue-900">Balance: {fmt(snapRemaining)}</span>
          <span className="text-gray-600">Used: {fmt(snapSpent)}</span>
        </div>
        <div className="w-full h-3 bg-white rounded-full overflow-hidden border border-blue-200">
          <div
            className={`h-full transition-all ${
              pctUsed >= 90 ? 'bg-red-500' :
              pctUsed >= 75 ? 'bg-amber-500' :
              'bg-gradient-to-r from-blue-500 to-indigo-500'
            }`}
            style={{ width: `${pctUsed}%` }}
          />
        </div>
        <p className="text-[11px] text-gray-600 mt-1">{pctRemaining}% remaining</p>
      </div>

      {/* Burn rate + runout */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/70 rounded-lg border border-blue-100 p-3">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
            <TrendingDown className="w-3 h-3" /> Burn Rate
          </div>
          <div className="text-lg font-bold text-gray-900">{fmt(dailyBurn)}<span className="text-xs font-normal text-gray-500">/day</span></div>
          <div className="text-[11px] text-gray-500">Required pace: {fmt(requiredPace)}/day</div>
        </div>
        <div className="bg-white/70 rounded-lg border border-blue-100 p-3">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
            <Calendar className="w-3 h-3" /> Runout
          </div>
          <div className="text-lg font-bold text-gray-900">
            {projectedRunoutDate
              ? projectedRunoutDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : snapSpent === 0
                ? `${daysRemaining}d left`
                : pace === 'done' ? '—' : 'Month end'}
          </div>
          <div className="text-[11px] text-gray-500">
            {runoutDaysEarly > 0
              ? `${runoutDaysEarly}d before SNAP refills`
              : runoutDaysEarly < 0
                ? `${Math.abs(runoutDaysEarly)}d of cushion`
                : 'Right on pace'}
          </div>
        </div>
      </div>

      {/* Smart tips */}
      {tips.length > 0 && (
        <div className="rounded-lg bg-white/70 border border-blue-100 p-3">
          <div className="flex items-center gap-1 text-[10px] font-semibold text-blue-700 uppercase tracking-wide mb-1.5">
            <Info className="w-3 h-3" /> SNAP Tips
          </div>
          <ul className="text-xs text-gray-700 space-y-1">
            {tips.map((t, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-blue-400 mt-0.5">•</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pantry cross-ref */}
      {pantryCount > 0 && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-2">
          <Package className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-emerald-900">
              {pantryCount} items in pantry — use what you have
            </div>
            <div className="text-[11px] text-emerald-700">
              A pantry-focused week can save SNAP dollars.
            </div>
          </div>
        </div>
      )}

      {/* Pace warning (ahead only) */}
      {pace === 'ahead' && runoutDaysEarly > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-xs text-amber-900">
            <div className="font-semibold">At current pace, SNAP runs out {runoutDaysEarly} day{runoutDaysEarly > 1 ? 's' : ''} early.</div>
            <div className="text-amber-700 mt-0.5">Slow grocery runs or lean on pantry staples to stretch the month.</div>
          </div>
        </div>
      )}

      {/* Footer: next deposit */}
      <div className="flex items-center justify-between text-[11px] text-gray-500 border-t border-blue-100 pt-2">
        <span className="flex items-center gap-1">
          <ShoppingCart className="w-3 h-3" />
          {snap?.weekly?.length || 0} week{(snap?.weekly?.length || 0) === 1 ? '' : 's'} of activity
        </span>
        <span>Next SNAP deposit: {nextDepositLabel}</span>
      </div>
    </div>
  )
}
