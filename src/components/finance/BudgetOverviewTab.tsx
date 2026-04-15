'use client'

// ============================================================================
// D78 FIN-4 — Budget Overview
// Unified view of all budget_categories × current month actuals.
// Pulls /api/finance?action=get_budget_overview. Food category links to
// Meals/Grocery tabs via tabChange events. Other categories show open needs
// count and a "Set Budget" prompt when monthly_amount is null.
// ============================================================================

import { useEffect, useState } from 'react'
import {
  Wallet, TrendingUp, Edit3, ShoppingBag, ChevronRight, X, Check, Loader2,
} from 'lucide-react'

type Category = {
  id: string
  slug: string
  name: string
  emoji: string | null
  funding_source: 'snap' | 'cash' | 'both' | null
  monthly_amount: number | null
  monthly_snap: number | null
  monthly_cash: number | null
  budgeted: number
  spent_snap: number
  spent_cash: number
  spent: number
  remaining: number
  open_needs: number
}

type Totals = {
  budgeted: number
  spent: number
  spent_snap: number
  spent_cash: number
  remaining: number
}

function fmt(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

function currentMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function jumpToTab(tabId: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('tabChange', { detail: { tab: tabId } }))
}

export default function BudgetOverviewTab() {
  const [month] = useState(currentMonthKey())
  const [categories, setCategories] = useState<Category[]>([])
  const [totals, setTotals] = useState<Totals | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingCat, setEditingCat] = useState<Category | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/finance?action=get_budget_overview&month=${month}`)
      const data = await res.json()
      setCategories(data.categories || [])
      setTotals(data.totals || null)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [month])

  async function saveBudget(cat: Category, amount: number, snap: number, cash: number) {
    setSaving(true)
    try {
      await fetch('/api/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_budget',
          slug: cat.slug,
          monthly_amount: amount || null,
          monthly_snap: cat.funding_source === 'cash' ? null : snap || null,
          monthly_cash: cat.funding_source === 'snap' ? null : cash || null,
        }),
      })
      setEditingCat(null)
      await load()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading budget…
      </div>
    )
  }

  const snapCategories = categories.filter(
    (c) => c.funding_source === 'snap' || c.funding_source === 'both'
  )
  const cashCategories = categories.filter((c) => c.funding_source === 'cash')

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Wallet className="w-6 h-6 text-blue-600" />
          Family Budget — {monthLabel(month)}
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Single source of truth across Food, Grocery, Shopping Lists, and Needs.
        </p>
      </div>

      {/* Totals */}
      {totals && (
        <div className="rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50 p-5 space-y-3">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Total Budget</div>
              <div className="text-xl font-bold text-gray-900">{fmt(totals.budgeted)}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Spent</div>
              <div className="text-xl font-bold text-gray-900">{fmt(totals.spent)}</div>
              <div className="text-[11px] text-gray-500">
                SNAP {fmt(totals.spent_snap)} · Cash {fmt(totals.spent_cash)}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Remaining</div>
              <div className="text-xl font-bold text-emerald-600">{fmt(totals.remaining)}</div>
            </div>
          </div>
          <div className="w-full h-3 bg-white rounded-full overflow-hidden border border-indigo-200">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all"
              style={{
                width: `${totals.budgeted > 0 ? Math.min(100, (totals.spent / totals.budgeted) * 100) : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* SNAP + mixed categories */}
      {snapCategories.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" /> SNAP & Food
          </h3>
          <div className="space-y-2">
            {snapCategories.map((c) => (
              <CategoryRow key={c.id} cat={c} onEdit={() => setEditingCat(c)} />
            ))}
          </div>
        </section>
      )}

      {/* Cash-only categories */}
      {cashCategories.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-amber-600" /> Cash Categories
          </h3>
          <div className="space-y-2">
            {cashCategories.map((c) => (
              <CategoryRow key={c.id} cat={c} onEdit={() => setEditingCat(c)} />
            ))}
          </div>
        </section>
      )}

      {/* Cross-link card */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-between">
        <div>
          <div className="font-semibold text-gray-900">Shopping lists &amp; needs</div>
          <div className="text-xs text-gray-600">
            Open the Needs List tab to add, prioritize, or mark items purchased.
          </div>
        </div>
        <button
          onClick={() => jumpToTab('needs-list')}
          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium flex items-center gap-1"
        >
          Open Needs List <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Edit modal */}
      {editingCat && (
        <BudgetEditModal
          cat={editingCat}
          onClose={() => setEditingCat(null)}
          onSave={saveBudget}
          saving={saving}
        />
      )}
    </div>
  )
}

function CategoryRow({ cat, onEdit }: { cat: Category; onEdit: () => void }) {
  const pct = cat.budgeted > 0 ? Math.min(100, (cat.spent / cat.budgeted) * 100) : 0
  const isFood = cat.slug === 'food'
  const hasBudget = cat.monthly_amount != null && cat.monthly_amount > 0

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center text-xl flex-shrink-0">
            {cat.emoji || '📦'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-gray-900 truncate">{cat.name}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              {hasBudget ? (
                <>
                  Spent {fmt(cat.spent)} of {fmt(cat.budgeted)}
                  {cat.funding_source === 'both' && (
                    <span className="ml-1 text-gray-400">
                      (SNAP {fmt(cat.spent_snap)} · Cash {fmt(cat.spent_cash)})
                    </span>
                  )}
                </>
              ) : (
                <span className="text-amber-600 font-medium">No budget set</span>
              )}
              {cat.open_needs > 0 && (
                <span className="ml-2 inline-block px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold">
                  {cat.open_needs} open need{cat.open_needs === 1 ? '' : 's'}
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onEdit}
          className="text-gray-400 hover:text-gray-700 p-1 rounded"
          aria-label="Edit budget"
        >
          <Edit3 className="w-4 h-4" />
        </button>
      </div>
      {hasBudget && (
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {isFood && (
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => jumpToTab('food-inventory')}
            className="text-[11px] text-blue-600 hover:text-blue-800 font-medium"
          >
            → View Meals
          </button>
          <button
            onClick={() => jumpToTab('shopping')}
            className="text-[11px] text-blue-600 hover:text-blue-800 font-medium"
          >
            → View Grocery
          </button>
        </div>
      )}
    </div>
  )
}

function BudgetEditModal({
  cat, onClose, onSave, saving,
}: {
  cat: Category
  onClose: () => void
  onSave: (cat: Category, amount: number, snap: number, cash: number) => void
  saving: boolean
}) {
  const [amount, setAmount] = useState(cat.monthly_amount?.toString() || '')
  const [snap, setSnap] = useState(cat.monthly_snap?.toString() || '')
  const [cash, setCash] = useState(cat.monthly_cash?.toString() || '')

  const showSnapSplit = cat.funding_source === 'both' || cat.funding_source === 'snap'
  const showCashSplit = cat.funding_source === 'both'

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
      >
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="text-xl">{cat.emoji || '📦'}</span>
            {cat.name}
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Monthly budget (total)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              />
            </div>
          </div>
          {showSnapSplit && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                SNAP portion
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={snap}
                  onChange={(e) => setSnap(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>
            </div>
          )}
          {showCashSplit && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Cash portion
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={cash}
                  onChange={(e) => setCash(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>
            </div>
          )}
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
          >
            Cancel
          </button>
          <button
            disabled={saving}
            onClick={() =>
              onSave(
                cat,
                parseFloat(amount) || 0,
                parseFloat(snap) || 0,
                parseFloat(cash) || 0
              )
            }
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-1 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
