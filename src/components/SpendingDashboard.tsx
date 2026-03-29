'use client'

import { useState, useEffect } from 'react'
import {
  DollarSign, TrendingUp, TrendingDown, Lightbulb, X, StickyNote,
  ShoppingCart, BarChart3, ArrowUpRight, ArrowDownRight, CreditCard
} from 'lucide-react'

interface SpendingOverview {
  current: {
    walmart_total: number
    heb_total: number
    combined_total: number
    snap_total: number
    cash_total: number
    trip_count: number
  }
  previous: { combined_total: number; trip_count: number }
  this_week: number
  last_week: number
  budget: number
}

interface Insight {
  id: number
  suggestion_text: string
  category: string
  created_at: string
}

interface TopItem {
  canonical_name: string
  purchase_count: number
  avg_price: number
  min_price: number
  max_price: number
}

export default function SpendingDashboard() {
  const [overview, setOverview] = useState<SpendingOverview | null>(null)
  const [insights, setInsights] = useState<Insight[]>([])
  const [topItems, setTopItems] = useState<TopItem[]>([])
  const [loading, setLoading] = useState(true)

  const currentMonth = new Date().toISOString().slice(0, 7)
  const monthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  useEffect(() => {
    Promise.all([
      fetch(`/api/grocery?action=spending_overview&month=${currentMonth}`).then(r => r.json()).catch(() => null),
      fetch('/api/grocery?action=get_insights').then(r => r.json()).catch(() => ({ insights: [] })),
      fetch('/api/grocery?action=top_items&days=90&limit=10').then(r => r.json()).catch(() => ({ items: [] })),
    ]).then(([ov, ins, top]) => {
      if (ov && !ov.error) setOverview(ov)
      setInsights(ins?.insights || [])
      setTopItems(top?.items || [])
      setLoading(false)
    })
  }, [currentMonth])

  const dismissInsight = async (id: number) => {
    setInsights(prev => prev.filter(i => i.id !== id))
    await fetch('/api/grocery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'dismiss_insight', id }),
    }).catch(() => {})
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-40 bg-gray-100 rounded-lg" />
        <div className="h-24 bg-gray-100 rounded-lg" />
      </div>
    )
  }

  const ov = overview
  const budgetUsed = ov ? (ov.current.combined_total / ov.budget) * 100 : 0
  const weekDiff = ov ? ov.this_week - ov.last_week : 0
  const weekUp = weekDiff > 0

  return (
    <div className="space-y-6">
      {/* Monthly Overview */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-4 border-b bg-gradient-to-r from-emerald-500 to-teal-500 rounded-t-lg">
          <div className="flex items-center justify-between text-white">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Spending Dashboard
              </h2>
              <p className="text-sm text-emerald-100">{monthLabel}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">${ov?.current.combined_total.toFixed(2) || '0.00'}</div>
              <div className="text-xs text-emerald-100">of ${ov?.budget || 1500} budget</div>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Budget bar */}
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600">Budget Used</span>
              <span className={`font-semibold ${budgetUsed > 90 ? 'text-red-600' : budgetUsed > 70 ? 'text-amber-600' : 'text-green-600'}`}>
                {budgetUsed.toFixed(0)}%
              </span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  budgetUsed > 90 ? 'bg-red-500' : budgetUsed > 70 ? 'bg-amber-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(budgetUsed, 100)}%` }}
              />
            </div>
          </div>

          {/* Store breakdown */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-blue-700 text-sm font-medium mb-1">
                <ShoppingCart className="w-4 h-4" />
                Walmart
              </div>
              <div className="text-xl font-bold text-blue-900">${ov?.current.walmart_total.toFixed(2) || '0.00'}</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-700 text-sm font-medium mb-1">
                <ShoppingCart className="w-4 h-4" />
                H-E-B
              </div>
              <div className="text-xl font-bold text-red-900">${ov?.current.heb_total.toFixed(2) || '0.00'}</div>
            </div>
          </div>

          {/* SNAP vs Cash */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-purple-700 text-sm font-medium mb-1">
                <CreditCard className="w-4 h-4" />
                SNAP
              </div>
              <div className="text-lg font-bold text-purple-900">${ov?.current.snap_total.toFixed(2) || '0.00'}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-700 text-sm font-medium mb-1">
                <DollarSign className="w-4 h-4" />
                Cash/Card
              </div>
              <div className="text-lg font-bold text-gray-900">${ov?.current.cash_total.toFixed(2) || '0.00'}</div>
            </div>
          </div>

          {/* This week vs last week */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
            <div>
              <div className="text-sm text-gray-600">This week</div>
              <div className="text-lg font-bold">${ov?.this_week.toFixed(2) || '0.00'}</div>
            </div>
            <div className="text-center">
              <div className={`flex items-center gap-1 text-sm font-semibold ${weekUp ? 'text-red-600' : 'text-green-600'}`}>
                {weekUp ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                ${Math.abs(weekDiff).toFixed(2)}
              </div>
              <div className="text-xs text-gray-400">vs last week</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Last week</div>
              <div className="text-lg font-bold text-gray-500">${ov?.last_week.toFixed(2) || '0.00'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Buddy Cards */}
      {insights.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            Financial Buddy
          </h3>
          {insights.map(insight => (
            <div key={insight.id} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-800">{insight.suggestion_text}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => dismissInsight(insight.id)}
                      className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      Dismiss
                    </button>
                    <button className="text-xs text-amber-700 hover:text-amber-900 flex items-center gap-1">
                      <StickyNote className="w-3 h-3" />
                      Note This
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Most Purchased Items */}
      {topItems.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Most Purchased (90 days)
            </h3>
          </div>
          <div className="divide-y">
            {topItems.map((item, i) => (
              <div key={item.canonical_name} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    i < 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {i + 1}
                  </span>
                  <div>
                    <div className="text-sm font-medium text-gray-900 capitalize">{item.canonical_name}</div>
                    <div className="text-xs text-gray-500">
                      {item.purchase_count}x purchased · ${item.avg_price} avg
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  ${item.min_price} - ${item.max_price}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!ov?.current.combined_total && topItems.length === 0 && insights.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm font-medium">No spending data yet</p>
          <p className="text-xs mt-1">Upload receipts in the Shopping tab to see analytics here</p>
        </div>
      )}
    </div>
  )
}
