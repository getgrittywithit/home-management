'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DollarSign, TrendingUp, TrendingDown, ShoppingCart, Receipt,
  CreditCard, RefreshCw, Plus, Check, X, AlertTriangle, Calendar,
  ChevronDown, ChevronRight, Eye, EyeOff, Flag, Trash2, Edit3,
  ArrowUpRight, ArrowDownRight, Wallet, PiggyBank, BarChart2
} from 'lucide-react'
import SnapBudgetCard from './finance/SnapBudgetCard'

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function getMonthStr(offset = 0) {
  const d = new Date()
  d.setMonth(d.getMonth() + offset)
  return d.toISOString().slice(0, 7)
}

function monthLabel(m: string) {
  const [y, mo] = m.split('-')
  const d = new Date(parseInt(y), parseInt(mo) - 1)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// ── Sub-Tab Type ─────────────────────────────────────────────────────────────
type SubTab = 'overview' | 'groceries' | 'bills' | 'subscriptions' | 'income'

const SUB_TABS: { id: SubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart2 },
  { id: 'groceries', label: 'Groceries', icon: ShoppingCart },
  { id: 'bills', label: 'Bills', icon: Receipt },
  { id: 'subscriptions', label: 'Subscriptions', icon: RefreshCw },
  { id: 'income', label: 'Income', icon: TrendingUp },
]

// ============================================================================
// Main Component
// ============================================================================
export default function FinanceTab() {
  const [subTab, setSubTab] = useState<SubTab>('overview')
  const [month, setMonth] = useState(getMonthStr())

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-500 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="w-7 h-7" /> Finance Dashboard
        </h1>
        <p className="text-green-100 mt-1">Track spending, bills, subscriptions, and income</p>
      </div>

      {/* Sub-tab Nav */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
        {SUB_TABS.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                subTab === t.id
                  ? 'bg-white text-green-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Month Selector */}
      <div className="flex items-center gap-2">
        <button onClick={() => setMonth(getMonthStr(-1))} className="px-3 py-1.5 text-sm bg-white border rounded-md hover:bg-gray-50">Prev</button>
        <span className="text-sm font-medium text-gray-700 min-w-[140px] text-center">{monthLabel(month)}</span>
        <button onClick={() => setMonth(getMonthStr(1))} className="px-3 py-1.5 text-sm bg-white border rounded-md hover:bg-gray-50">Next</button>
        <button onClick={() => setMonth(getMonthStr())} className="px-3 py-1.5 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 ml-2">Today</button>
      </div>

      {/* Tab Content */}
      {subTab === 'overview' && <OverviewPanel month={month} />}
      {subTab === 'groceries' && <GroceriesPanel month={month} />}
      {subTab === 'bills' && <BillsPanel />}
      {subTab === 'subscriptions' && <SubscriptionsPanel />}
      {subTab === 'income' && <IncomePanel month={month} />}
    </div>
  )
}

// ============================================================================
// Overview Panel
// ============================================================================
function OverviewPanel({ month }: { month: string }) {
  const [summary, setSummary] = useState<any>(null)
  const [grocery, setGrocery] = useState<any>(null)
  const [subTotals, setSubTotals] = useState<any>(null)
  const [upcomingBills, setUpcomingBills] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showBalances, setShowBalances] = useState(true)
  const [editingAccount, setEditingAccount] = useState<string | null>(null)
  const [editBalance, setEditBalance] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/finance?action=get_monthly_summary&month=${month}`).then(r => r.json()).catch(() => ({ income: 0, expense: 0, net: 0 })),
      fetch(`/api/finance?action=get_grocery_spend&month=${month}`).then(r => r.json()).catch(() => ({ total: 0 })),
      fetch(`/api/finance?action=get_subscription_totals`).then(r => r.json()).catch(() => ({ effective_monthly: 0, count: 0 })),
      fetch(`/api/finance?action=get_upcoming_bills&days=14`).then(r => r.json()).catch(() => ({ bills: [] })),
      fetch(`/api/finance?action=get_bank_balances`).then(r => r.json()).catch(() => ({ accounts: [] })),
      fetch(`/api/finance?action=get_budget_categories`).then(r => r.json()).catch(() => ({ categories: [] })),
      fetch(`/api/finance?action=get_transactions&month=${month}`).then(r => r.json()).catch(() => ({ transactions: [] })),
    ]).then(([sum, groc, subs, bills, accts, cats, txns]) => {
      setSummary(sum)
      setGrocery(groc)
      setSubTotals(subs)
      setUpcomingBills(bills.bills || [])
      setAccounts(accts.accounts || [])
      setCategories(cats.categories || [])
      setTransactions(txns.transactions || [])
    }).finally(() => setLoading(false))
  }, [month])

  useEffect(() => { load() }, [load])

  const handleUpdateBalance = async (accountId: string) => {
    await fetch('/api/finance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_bank_balance', id: accountId, balance: parseFloat(editBalance) }),
    })
    setEditingAccount(null)
    setEditBalance('')
    load()
  }

  // Category spending breakdown
  const categorySpend: Record<string, number> = {}
  for (const t of transactions.filter((t: any) => t.type === 'expense')) {
    const cat = t.category || 'general'
    categorySpend[cat] = (categorySpend[cat] || 0) + parseFloat(t.amount)
  }
  const maxCatSpend = Math.max(...Object.values(categorySpend), 1)

  const unpaidBills = upcomingBills.filter(b => !b.is_paid_this_month)

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading finance data...</div>
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Income"
          value={fmt(summary?.income || 0)}
          icon={<TrendingUp className="w-5 h-5 text-green-600" />}
          color="bg-green-50 border-green-200"
        />
        <SummaryCard
          label="Groceries"
          value={fmt(grocery?.total || 0)}
          sub={`${grocery?.trip_count || 0} trips`}
          icon={<ShoppingCart className="w-5 h-5 text-orange-600" />}
          color="bg-orange-50 border-orange-200"
        />
        <SummaryCard
          label="Bills Due"
          value={`${unpaidBills.length}`}
          sub={unpaidBills.length > 0 ? `Next: ${unpaidBills[0]?.days_until_due}d` : 'All paid'}
          icon={<Receipt className="w-5 h-5 text-blue-600" />}
          color="bg-blue-50 border-blue-200"
        />
        <SummaryCard
          label="Subscriptions"
          value={fmt(subTotals?.effective_monthly || 0)}
          sub={`${subTotals?.count || 0} active`}
          icon={<RefreshCw className="w-5 h-5 text-purple-600" />}
          color="bg-purple-50 border-purple-200"
        />
      </div>

      {/* Net Income Bar */}
      <div className="bg-white border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">Monthly Summary</h3>
          <span className={`text-lg font-bold ${(summary?.net || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            Net: {fmt(summary?.net || 0)}
          </span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 w-20">Income</span>
            <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
              <div className="bg-green-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, summary?.income ? 100 : 0)}%` }} />
            </div>
            <span className="text-sm font-medium text-gray-700 w-24 text-right">{fmt(summary?.income || 0)}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 w-20">Expenses</span>
            <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
              <div
                className="bg-red-400 h-full rounded-full transition-all"
                style={{ width: `${summary?.income ? Math.min(100, ((summary?.expense || 0) / summary.income) * 100) : 0}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-700 w-24 text-right">{fmt(summary?.expense || 0)}</span>
          </div>
        </div>
      </div>

      {/* Category Spend Chart */}
      {Object.keys(categorySpend).length > 0 && (
        <div className="bg-white border rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Spending by Category</h3>
          <div className="space-y-3">
            {Object.entries(categorySpend)
              .sort(([, a], [, b]) => b - a)
              .map(([cat, amount]) => {
                const catInfo = categories.find((c: any) => c.name === cat)
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-28 capitalize truncate">{cat}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(amount / maxCatSpend) * 100}%`,
                          backgroundColor: catInfo?.color || '#6B7280',
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700 w-20 text-right">{fmt(amount)}</span>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Bank Balances */}
      <div className="bg-white border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-gray-600" /> Bank Balances
          </h3>
          <button onClick={() => setShowBalances(!showBalances)} className="text-gray-400 hover:text-gray-600">
            {showBalances ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </button>
        </div>
        {accounts.length === 0 ? (
          <p className="text-sm text-gray-500">No bank accounts configured yet. Use the API to add accounts.</p>
        ) : (
          <div className="space-y-3">
            {accounts.map((acct: any) => (
              <div key={acct.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">{acct.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{acct.account_type}</p>
                </div>
                <div className="flex items-center gap-2">
                  {editingAccount === acct.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.01"
                        value={editBalance}
                        onChange={e => setEditBalance(e.target.value)}
                        className="w-28 px-2 py-1 text-sm border rounded"
                        autoFocus
                      />
                      <button onClick={() => handleUpdateBalance(acct.id)} className="p-1 text-green-600 hover:text-green-700">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingAccount(null)} className="p-1 text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="font-semibold text-gray-800">
                        {showBalances ? fmt(parseFloat(acct.balance) || 0) : '****'}
                      </span>
                      <button
                        onClick={() => { setEditingAccount(acct.id); setEditBalance(acct.balance?.toString() || '0') }}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Summary Card
// ============================================================================
function SummaryCard({ label, value, sub, icon, color }: {
  label: string; value: string; sub?: string; icon: React.ReactNode; color: string
}) {
  return (
    <div className={`border rounded-xl p-4 ${color}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-medium text-gray-600">{label}</span>
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

// ============================================================================
// Groceries Panel
// ============================================================================
function GroceriesPanel({ month }: { month: string }) {
  const [snapData, setSnapData] = useState<any>(null)
  const [stores, setStores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState<any>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/finance?action=get_snap_vs_cash&month=${month}`).then(r => r.json()).catch(() => ({ snap: 0, cash: 0, total: 0, weekly: [] })),
      fetch(`/api/finance?action=get_grocery_by_store&month=${month}`).then(r => r.json()).catch(() => ({ stores: [] })),
      fetch(`/api/finance?action=get_finance_config`).then(r => r.json()).catch(() => ({ config: null })),
    ]).then(([snap, storeData, cfg]) => {
      setSnapData(snap)
      setStores(storeData.stores || [])
      setConfig(cfg.config)
    }).finally(() => setLoading(false))
  }, [month])

  if (loading) return <div className="text-center py-12 text-gray-500">Loading grocery data...</div>

  const groceryBudget = config?.grocery_budget || 1500
  const snapBudget = config?.snap_monthly || 1200
  const totalSpent = snapData?.total || 0
  const snapSpent = snapData?.snap || 0
  const cashSpent = snapData?.cash || 0

  const maxWeekly = Math.max(...(snapData?.weekly || []).map((w: any) => w.total), 1)

  return (
    <div className="space-y-6">
      {/* D75b FIN-SNAP-1 — Smart SNAP analytics layer */}
      <SnapBudgetCard month={month} />

      {/* SNAP vs Cash Tracker */}
      <div className="bg-white border rounded-xl p-5">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-blue-600" /> SNAP vs Cash
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-600 font-medium">SNAP (EBT)</p>
            <p className="text-2xl font-bold text-blue-800">{fmt(snapSpent)}</p>
            <div className="mt-2 bg-blue-100 rounded-full h-2 overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.min(100, (snapSpent / snapBudget) * 100)}%` }} />
            </div>
            <p className="text-xs text-blue-600 mt-1">{fmt(Math.max(0, snapBudget - snapSpent))} remaining of {fmt(snapBudget)}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-600 font-medium">Cash / Debit</p>
            <p className="text-2xl font-bold text-green-800">{fmt(cashSpent)}</p>
            <div className="mt-2 bg-green-100 rounded-full h-2 overflow-hidden">
              <div className="bg-green-500 h-full rounded-full" style={{ width: `${Math.min(100, (cashSpent / (groceryBudget - snapBudget)) * 100)}%` }} />
            </div>
            <p className="text-xs text-green-600 mt-1">of {fmt(groceryBudget - snapBudget)} budget</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 font-medium">Total Grocery</p>
            <p className="text-2xl font-bold text-gray-800">{fmt(totalSpent)}</p>
            <div className="mt-2 bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full ${totalSpent > groceryBudget ? 'bg-red-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(100, (totalSpent / groceryBudget) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{fmt(Math.max(0, groceryBudget - totalSpent))} remaining of {fmt(groceryBudget)}</p>
          </div>
        </div>
      </div>

      {/* Store Breakdown */}
      <div className="bg-white border rounded-xl p-5">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-orange-600" /> Store Breakdown
        </h3>
        {stores.length === 0 ? (
          <p className="text-sm text-gray-500">No grocery purchases recorded this month.</p>
        ) : (
          <div className="space-y-3">
            {stores.map((s: any, i: number) => {
              const colors = ['bg-blue-500', 'bg-orange-500', 'bg-purple-500', 'bg-teal-500', 'bg-pink-500']
              const pct = totalSpent > 0 ? (s.total / totalSpent) * 100 : 0
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 w-28 truncate font-medium">{s.store}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                    <div className={`${colors[i % colors.length]} h-full rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm text-gray-600 w-24 text-right">{fmt(s.total)}</span>
                  <span className="text-xs text-gray-400 w-16 text-right">{s.trips} trips</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Weekly Trend */}
      {(snapData?.weekly || []).length > 0 && (
        <div className="bg-white border rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Weekly Spending Trend</h3>
          <div className="flex items-end gap-2 h-40">
            {snapData.weekly.map((w: any, i: number) => {
              const pct = (w.total / maxWeekly) * 100
              const weekLabel = new Date(w.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500">{fmt(w.total)}</span>
                  <div className="w-full bg-gray-100 rounded-t-md relative" style={{ height: '120px' }}>
                    <div className="absolute bottom-0 left-0 right-0 bg-emerald-500 rounded-t-md transition-all" style={{ height: `${pct}%` }}>
                      {w.snap > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 bg-blue-500 rounded-t-md" style={{ height: `${(w.snap / w.total) * 100}%` }} />
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">{weekLabel}</span>
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-500 rounded" /> SNAP</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-500 rounded" /> Cash</div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Bills Panel
// ============================================================================
function BillsPanel() {
  const [bills, setBills] = useState<any[]>([])
  const [upcomingBills, setUpcomingBills] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState({ name: '', amount: '', due_day: '', category: 'general', autopay: false, notes: '' })
  const [marking, setMarking] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/finance?action=get_bills').then(r => r.json()).catch(() => ({ bills: [] })),
      fetch('/api/finance?action=get_upcoming_bills&days=30').then(r => r.json()).catch(() => ({ bills: [] })),
    ]).then(([allBills, upcoming]) => {
      setBills(allBills.bills || [])
      setUpcomingBills(upcoming.bills || [])
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    if (!form.name || !form.amount || !form.due_day) return
    await fetch('/api/finance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_bill',
        name: form.name,
        amount: parseFloat(form.amount),
        due_day: parseInt(form.due_day),
        category: form.category,
        autopay: form.autopay,
        notes: form.notes,
      }),
    })
    setShowAddForm(false)
    setForm({ name: '', amount: '', due_day: '', category: 'general', autopay: false, notes: '' })
    load()
  }

  const handleMarkPaid = async (billId: string) => {
    setMarking(billId)
    await fetch('/api/finance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_bill_paid', bill_id: billId }),
    })
    setMarking(null)
    load()
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Loading bills...</div>

  const monthlyTotal = bills.reduce((sum: number, b: any) => sum + (parseFloat(b.amount) || 0), 0)

  return (
    <div className="space-y-6">
      {/* Bills Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-600">Monthly Bills</p>
          <p className="text-2xl font-bold text-blue-800">{fmt(monthlyTotal)}</p>
          <p className="text-xs text-blue-500 mt-1">{bills.length} bills</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-600">Upcoming (30d)</p>
          <p className="text-2xl font-bold text-amber-800">{upcomingBills.filter(b => !b.is_paid_this_month).length}</p>
          <p className="text-xs text-amber-500 mt-1">unpaid bills due</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm text-green-600">Autopay</p>
          <p className="text-2xl font-bold text-green-800">{bills.filter((b: any) => b.autopay).length}</p>
          <p className="text-xs text-green-500 mt-1">bills on autopay</p>
        </div>
      </div>

      {/* Upcoming Bills */}
      {upcomingBills.length > 0 && (
        <div className="bg-white border rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" /> Upcoming Bills
          </h3>
          <div className="space-y-2">
            {upcomingBills.map((bill: any) => (
              <div key={bill.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                bill.is_paid_this_month ? 'bg-green-50 border-green-200' :
                bill.days_until_due <= 3 ? 'bg-red-50 border-red-200' :
                bill.days_until_due <= 7 ? 'bg-amber-50 border-amber-200' :
                'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center gap-3">
                  {bill.is_paid_this_month ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <Calendar className="w-5 h-5 text-gray-400" />
                  )}
                  <div>
                    <p className="font-medium text-gray-800">{bill.name}</p>
                    <p className="text-xs text-gray-500">
                      Due day {bill.due_day} {bill.autopay && <span className="text-blue-600 ml-1">(autopay)</span>}
                      {!bill.is_paid_this_month && <span className="ml-1">- {bill.days_until_due}d away</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-800">{fmt(parseFloat(bill.amount) || 0)}</span>
                  {!bill.is_paid_this_month && (
                    <button
                      onClick={() => handleMarkPaid(bill.id)}
                      disabled={marking === bill.id}
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      {marking === bill.id ? '...' : 'Mark Paid'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Bills */}
      <div className="bg-white border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">All Bills</h3>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Plus className="w-4 h-4" /> Add Bill
          </button>
        </div>

        {showAddForm && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Bill name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="px-3 py-2 border rounded-md text-sm" />
              <input placeholder="Amount" type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="px-3 py-2 border rounded-md text-sm" />
              <input placeholder="Due day (1-31)" type="number" min="1" max="31" value={form.due_day} onChange={e => setForm({ ...form, due_day: e.target.value })} className="px-3 py-2 border rounded-md text-sm" />
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="px-3 py-2 border rounded-md text-sm">
                <option value="general">General</option>
                <option value="housing">Housing</option>
                <option value="utilities">Utilities</option>
                <option value="insurance">Insurance</option>
                <option value="phone">Phone</option>
                <option value="internet">Internet</option>
                <option value="car">Car</option>
              </select>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.autopay} onChange={e => setForm({ ...form, autopay: e.target.checked })} className="rounded" />
                Autopay
              </label>
              <input placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="flex-1 px-3 py-2 border rounded-md text-sm" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleAdd} className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700">Save</button>
              <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">Cancel</button>
            </div>
          </div>
        )}

        {bills.length === 0 ? (
          <p className="text-sm text-gray-500">No bills configured yet. Add your first bill above.</p>
        ) : (
          <div className="space-y-2">
            {bills.map((bill: any) => (
              <div key={bill.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">{bill.name}</p>
                  <p className="text-xs text-gray-500">
                    Due day {bill.due_day} | {bill.category}
                    {bill.autopay && <span className="text-blue-600 ml-1">(autopay)</span>}
                  </p>
                </div>
                <span className="font-semibold text-gray-800">{fmt(parseFloat(bill.amount) || 0)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Subscriptions Panel
// ============================================================================
function SubscriptionsPanel() {
  const [subs, setSubs] = useState<any[]>([])
  const [totals, setTotals] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState({ name: '', amount: '', billing_cycle: 'monthly', category: 'general', notes: '' })

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/finance?action=get_subscriptions').then(r => r.json()).catch(() => ({ subscriptions: [] })),
      fetch('/api/finance?action=get_subscription_totals').then(r => r.json()).catch(() => ({ monthly_total: 0, annual_total: 0, effective_monthly: 0, count: 0 })),
    ]).then(([subData, totalData]) => {
      setSubs(subData.subscriptions || [])
      setTotals(totalData)
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    if (!form.name || !form.amount) return
    await fetch('/api/finance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add_subscription',
        name: form.name,
        amount: parseFloat(form.amount),
        billing_cycle: form.billing_cycle,
        category: form.category,
        notes: form.notes,
      }),
    })
    setShowAddForm(false)
    setForm({ name: '', amount: '', billing_cycle: 'monthly', category: 'general', notes: '' })
    load()
  }

  const handleFlag = async (id: string) => {
    await fetch('/api/finance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'flag_subscription_review', id }),
    })
    load()
  }

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this subscription?')) return
    await fetch('/api/finance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel_subscription', id }),
    })
    load()
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Loading subscriptions...</div>

  const activeSubs = subs.filter((s: any) => s.status === 'active')
  const reviewSubs = subs.filter((s: any) => s.status === 'review')
  const cancelledSubs = subs.filter((s: any) => s.status === 'cancelled')

  return (
    <div className="space-y-6">
      {/* Totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <p className="text-sm text-purple-600">Monthly Cost</p>
          <p className="text-2xl font-bold text-purple-800">{fmt(totals?.monthly_total || 0)}</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <p className="text-sm text-indigo-600">Annual Cost</p>
          <p className="text-2xl font-bold text-indigo-800">{fmt(totals?.annual_total || 0)}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-600">Effective Monthly</p>
          <p className="text-2xl font-bold text-blue-800">{fmt(totals?.effective_monthly || 0)}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm text-green-600">Annual Total</p>
          <p className="text-2xl font-bold text-green-800">{fmt((totals?.effective_monthly || 0) * 12)}</p>
          <p className="text-xs text-green-500 mt-1">projected yearly</p>
        </div>
      </div>

      {/* Review Flags */}
      {reviewSubs.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
            <Flag className="w-5 h-5" /> Flagged for Review ({reviewSubs.length})
          </h3>
          <div className="space-y-2">
            {reviewSubs.map((sub: any) => (
              <div key={sub.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200">
                <div>
                  <p className="font-medium text-gray-800">{sub.name}</p>
                  <p className="text-xs text-gray-500">{sub.billing_cycle} | {sub.category}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800">{fmt(parseFloat(sub.amount) || 0)}</span>
                  <button onClick={() => handleCancel(sub.id)} className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200">
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Subscriptions */}
      <div className="bg-white border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Active Subscriptions ({activeSubs.length})</h3>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>

        {showAddForm && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Subscription name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="px-3 py-2 border rounded-md text-sm" />
              <input placeholder="Amount" type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="px-3 py-2 border rounded-md text-sm" />
              <select value={form.billing_cycle} onChange={e => setForm({ ...form, billing_cycle: e.target.value })} className="px-3 py-2 border rounded-md text-sm">
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
                <option value="weekly">Weekly</option>
              </select>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="px-3 py-2 border rounded-md text-sm">
                <option value="general">General</option>
                <option value="streaming">Streaming</option>
                <option value="software">Software</option>
                <option value="education">Education</option>
                <option value="health">Health</option>
                <option value="storage">Storage</option>
              </select>
            </div>
            <input placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm" />
            <div className="flex gap-2">
              <button onClick={handleAdd} className="px-4 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700">Save</button>
              <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">Cancel</button>
            </div>
          </div>
        )}

        {activeSubs.length === 0 ? (
          <p className="text-sm text-gray-500">No active subscriptions. Add one above.</p>
        ) : (
          <div className="space-y-2">
            {activeSubs.map((sub: any) => (
              <div key={sub.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">{sub.name}</p>
                  <p className="text-xs text-gray-500">{sub.billing_cycle} | {sub.category} {sub.renewal_date && `| renews ${new Date(sub.renewal_date).toLocaleDateString()}`}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800">
                    {fmt(parseFloat(sub.amount) || 0)}
                    <span className="text-xs text-gray-400 font-normal">/{sub.billing_cycle === 'annual' ? 'yr' : 'mo'}</span>
                  </span>
                  <button onClick={() => handleFlag(sub.id)} className="p-1 text-amber-500 hover:text-amber-600" title="Flag for review">
                    <Flag className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleCancel(sub.id)} className="p-1 text-red-400 hover:text-red-600" title="Cancel">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cancelled */}
      {cancelledSubs.length > 0 && (
        <div className="bg-white border rounded-xl p-5">
          <h3 className="font-semibold text-gray-400 mb-3">Cancelled ({cancelledSubs.length})</h3>
          <div className="space-y-2">
            {cancelledSubs.map((sub: any) => (
              <div key={sub.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg opacity-60">
                <p className="text-sm text-gray-500 line-through">{sub.name}</p>
                <span className="text-sm text-gray-400">{fmt(parseFloat(sub.amount) || 0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Income Panel
// ============================================================================
function IncomePanel({ month }: { month: string }) {
  const [entries, setEntries] = useState<any[]>([])
  const [monthTotal, setMonthTotal] = useState(0)
  const [ytdTotal, setYtdTotal] = useState(0)
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState({ source: '', amount: '', income_date: '', notes: '', category: 'business' })

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/finance?action=get_income&month=${month}`).then(r => r.json()).catch(() => ({ entries: [], month_total: 0, ytd_total: 0 })),
      fetch(`/api/finance?action=get_monthly_summary&month=${month}`).then(r => r.json()).catch(() => ({ income: 0, expense: 0, net: 0 })),
    ]).then(([incomeData, summaryData]) => {
      setEntries(incomeData.entries || [])
      setMonthTotal(incomeData.month_total || 0)
      setYtdTotal(incomeData.ytd_total || 0)
      setSummary(summaryData)
    }).finally(() => setLoading(false))
  }, [month])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    if (!form.source || !form.amount) return
    await fetch('/api/finance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'log_income',
        source: form.source,
        amount: parseFloat(form.amount),
        income_date: form.income_date || new Date().toISOString().split('T')[0],
        notes: form.notes,
        category: form.category,
      }),
    })
    setShowAddForm(false)
    setForm({ source: '', amount: '', income_date: '', notes: '', category: 'business' })
    load()
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Loading income data...</div>

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm text-green-600">Monthly Income</p>
          <p className="text-2xl font-bold text-green-800">{fmt(monthTotal)}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-sm text-emerald-600">YTD Income</p>
          <p className="text-2xl font-bold text-emerald-800">{fmt(ytdTotal)}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-600">Monthly Expenses</p>
          <p className="text-2xl font-bold text-red-800">{fmt(summary?.expense || 0)}</p>
        </div>
        <div className={`border rounded-xl p-4 ${(summary?.net || 0) >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
          <p className="text-sm text-gray-600">Net</p>
          <p className={`text-2xl font-bold ${(summary?.net || 0) >= 0 ? 'text-blue-800' : 'text-red-800'}`}>
            {fmt(summary?.net || 0)}
          </p>
          <div className="flex items-center gap-1 mt-1">
            {(summary?.net || 0) >= 0 ? (
              <ArrowUpRight className="w-4 h-4 text-green-600" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-red-600" />
            )}
            <span className="text-xs text-gray-500">income vs expense</span>
          </div>
        </div>
      </div>

      {/* Income vs Expense Visual */}
      <div className="bg-white border rounded-xl p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Income vs Expense</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 w-20">Income</span>
            <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
              <div className="bg-green-500 h-full rounded-full flex items-center justify-end pr-2" style={{ width: `${Math.min(100, monthTotal > 0 ? 100 : 0)}%` }}>
                {monthTotal > 0 && <span className="text-xs text-white font-medium">{fmt(monthTotal)}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 w-20">Expense</span>
            <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
              <div
                className="bg-red-400 h-full rounded-full flex items-center justify-end pr-2"
                style={{ width: `${monthTotal > 0 ? Math.min(100, ((summary?.expense || 0) / monthTotal) * 100) : 0}%` }}
              >
                {(summary?.expense || 0) > 0 && <span className="text-xs text-white font-medium">{fmt(summary?.expense || 0)}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Income Form */}
      <div className="bg-white border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-green-600" /> Income Log
          </h3>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Plus className="w-4 h-4" /> Log Income
          </button>
        </div>

        {showAddForm && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Source (e.g. Triton Cleaning)" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} className="px-3 py-2 border rounded-md text-sm" />
              <input placeholder="Amount" type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="px-3 py-2 border rounded-md text-sm" />
              <input type="date" value={form.income_date} onChange={e => setForm({ ...form, income_date: e.target.value })} className="px-3 py-2 border rounded-md text-sm" />
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="px-3 py-2 border rounded-md text-sm">
                <option value="business">Business</option>
                <option value="triton">Triton Cleaning</option>
                <option value="employment">Employment</option>
                <option value="freelance">Freelance</option>
                <option value="other">Other</option>
              </select>
            </div>
            <input placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm" />
            <div className="flex gap-2">
              <button onClick={handleAdd} className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700">Save</button>
              <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">Cancel</button>
            </div>
          </div>
        )}

        {entries.length === 0 ? (
          <p className="text-sm text-gray-500">No income entries this month. Log your first income above.</p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry: any, i: number) => (
              <div key={entry.id || i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">{entry.source}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(entry.income_date).toLocaleDateString()} | {entry.category}
                    {entry.notes && ` | ${entry.notes}`}
                  </p>
                </div>
                <span className="font-semibold text-green-700">{fmt(parseFloat(entry.amount) || 0)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
