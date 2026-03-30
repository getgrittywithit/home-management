'use client'

import { useState, useEffect } from 'react'
import { DollarSign, ShoppingCart, Receipt, RefreshCw, TrendingUp, ChevronRight, Loader2 } from 'lucide-react'

interface MonthlySummary {
  income: number
  expense: number
  net: number
  month: string
}

interface GrocerySpend {
  total: number
  snap_total: number
  cash_total: number
  trip_count: number
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function FinanceDashboardCard({ onNavigate }: { onNavigate: () => void }) {
  const [summary, setSummary] = useState<MonthlySummary | null>(null)
  const [grocery, setGrocery] = useState<GrocerySpend | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/finance?action=get_monthly_summary').then(r => r.json()).catch(() => null),
      fetch('/api/finance?action=get_grocery_spend').then(r => r.json()).catch(() => null),
    ]).then(([sumData, grocData]) => {
      setSummary(sumData)
      setGrocery(grocData)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="bg-white border rounded-lg p-5">
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
      </div>
    )
  }

  const groceryBudget = 1500
  const grocerySpent = grocery?.total || 0
  const groceryPct = Math.min(100, Math.round((grocerySpent / groceryBudget) * 100))
  const totalIncome = summary?.income || 0
  const totalExpense = summary?.expense || 0

  return (
    <div className="bg-white border rounded-lg p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Finance</h3>
            <p className="text-xs text-gray-500">Monthly overview</p>
          </div>
        </div>
        <button
          onClick={onNavigate}
          className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-0.5"
        >
          Open Finance <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        {/* Grocery progress */}
        <div className="flex items-center gap-3">
          <ShoppingCart className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700 font-medium">Groceries</span>
              <span className="text-gray-600">{fmt(grocerySpent)}/{fmt(groceryBudget)} ({groceryPct}%)</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
              <div
                className={`h-2 rounded-full transition-all ${groceryPct > 90 ? 'bg-red-500' : groceryPct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${groceryPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Bills due */}
        <div className="flex items-center gap-3">
          <Receipt className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <div className="flex-1 flex items-center justify-between text-sm">
            <span className="text-gray-700 font-medium">Expenses</span>
            <span className="text-gray-600">{fmt(totalExpense)} this month</span>
          </div>
        </div>

        {/* Income */}
        <div className="flex items-center gap-3">
          <TrendingUp className="w-4 h-4 text-green-500 flex-shrink-0" />
          <div className="flex-1 flex items-center justify-between text-sm">
            <span className="text-gray-700 font-medium">Income</span>
            <span className="text-green-600 font-medium">{fmt(totalIncome)} this month</span>
          </div>
        </div>

        {/* Net */}
        {summary && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 font-medium">Net</span>
              <span className={`font-bold ${summary.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {summary.net >= 0 ? '+' : ''}{fmt(summary.net)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
