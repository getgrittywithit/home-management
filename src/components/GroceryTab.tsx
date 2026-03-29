'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Package, Plus, Edit3, Trash2, ChevronDown, ChevronRight,
  ShoppingCart, FileText, Upload, AlertTriangle, Store, X,
  BarChart3, ListChecks
} from 'lucide-react'
import SpendingDashboard from './SpendingDashboard'
import WeeklyListGenerator from './WeeklyListGenerator'

// ── Types ──

interface PantryItem {
  id: string
  name: string
  canonical_name: string
  quantity: number
  unit: string | null
  department: string
  preferred_store: string
  low_stock_threshold: number | null
  active: boolean
  updated_at: string
}

interface Purchase {
  id: string
  store: string
  purchase_date: string
  total_amount: number
  snap_amount: number
  cash_amount: number
  item_count: number
}

interface PurchaseItem {
  id: string
  purchase_id: string
  name: string
  quantity: number
  unit: string | null
  unit_price: number | null
  total_price: number | null
  department: string
}

// ── Constants ──

const DEPARTMENTS = ['Meat', 'Frozen', 'Pantry', 'Produce', 'Dairy', 'Bakery', 'Other'] as const
const STORE_OPTIONS = ['either', 'walmart', 'heb'] as const

const DEPT_COLORS: Record<string, string> = {
  Meat: 'bg-red-100 text-red-700',
  Frozen: 'bg-cyan-100 text-cyan-700',
  Pantry: 'bg-amber-100 text-amber-700',
  Produce: 'bg-green-100 text-green-700',
  Dairy: 'bg-blue-100 text-blue-700',
  Bakery: 'bg-yellow-100 text-yellow-700',
  Other: 'bg-gray-100 text-gray-700',
}

const STORE_COLORS: Record<string, string> = {
  either: 'bg-gray-100 text-gray-600',
  walmart: 'bg-blue-100 text-blue-700',
  heb: 'bg-red-100 text-red-700',
}

const STORE_LABELS: Record<string, string> = {
  either: 'Either',
  walmart: 'Walmart',
  heb: 'H-E-B',
}

const FILTER_PILLS = ['All', 'Low Stock', 'Meat', 'Frozen', 'Pantry', 'Produce', 'Dairy'] as const

// ── Component ──

export default function GroceryTab() {
  const [subTab, setSubTab] = useState<'pantry' | 'history' | 'import' | 'analytics' | 'weekly-list'>('pantry')

  // Pantry state
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([])
  const [pantryLoading, setPantryLoading] = useState(true)
  const [pantryFilter, setPantryFilter] = useState('All')
  const [editingPantryId, setEditingPantryId] = useState<string | null>(null)
  const [showAddPantry, setShowAddPantry] = useState(false)
  const [newPantryItem, setNewPantryItem] = useState({ name: '', quantity: '', unit: '', department: 'Other', preferred_store: 'either', low_stock_threshold: '' })

  // Purchase history state
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [purchasesLoading, setPurchasesLoading] = useState(false)
  const [expandedPurchase, setExpandedPurchase] = useState<string | null>(null)
  const [purchaseItems, setPurchaseItems] = useState<Record<string, PurchaseItem[]>>({})

  // Import state
  const [importStore, setImportStore] = useState('walmart')
  const [importDate, setImportDate] = useState(new Date().toISOString().split('T')[0])
  const [importTotal, setImportTotal] = useState('')
  const [importSnap, setImportSnap] = useState('')
  const [importCash, setImportCash] = useState('')
  const [importItems, setImportItems] = useState<Array<{ name: string; quantity: string; unit: string; unit_price: string; total_price: string; department: string }>>([])
  const [importSaving, setImportSaving] = useState(false)

  // ── Fetch pantry stock ──
  const fetchPantry = useCallback(async () => {
    try {
      const res = await fetch('/api/grocery?action=pantry_stock')
      const data = await res.json()
      setPantryItems(data.items || [])
    } catch {
      console.error('Failed to load pantry stock')
    } finally {
      setPantryLoading(false)
    }
  }, [])

  // ── Fetch purchase history ──
  const fetchPurchases = useCallback(async () => {
    setPurchasesLoading(true)
    try {
      const res = await fetch('/api/grocery?action=purchase_history&limit=20&offset=0')
      const data = await res.json()
      setPurchases(data.purchases || [])
    } catch {
      console.error('Failed to load purchases')
    } finally {
      setPurchasesLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPantry()
  }, [fetchPantry])

  useEffect(() => {
    if (subTab === 'history' && purchases.length === 0) fetchPurchases()
  }, [subTab, purchases.length, fetchPurchases])

  // ── Expand purchase items ──
  const togglePurchaseExpand = async (purchaseId: string) => {
    if (expandedPurchase === purchaseId) {
      setExpandedPurchase(null)
      return
    }
    setExpandedPurchase(purchaseId)
    if (!purchaseItems[purchaseId]) {
      try {
        const res = await fetch(`/api/grocery?action=purchase_items&purchase_id=${purchaseId}`)
        const data = await res.json()
        setPurchaseItems(prev => ({ ...prev, [purchaseId]: data.items || [] }))
      } catch {
        console.error('Failed to load purchase items')
      }
    }
  }

  // ── Pantry actions ──
  const adjustPantryQuantity = async (item: PantryItem, newQty: number) => {
    setPantryItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: newQty } : i))
    setEditingPantryId(null)
    try {
      await fetch('/api/grocery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'adjust_pantry', id: item.id, quantity: newQty, unit: item.unit }),
      })
    } catch {
      setPantryItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: item.quantity } : i))
    }
  }

  const addPantryItem = async () => {
    if (!newPantryItem.name.trim()) return
    try {
      const res = await fetch('/api/grocery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_pantry_item',
          name: newPantryItem.name.trim(),
          quantity: parseFloat(newPantryItem.quantity) || 0,
          unit: newPantryItem.unit || null,
          department: newPantryItem.department,
          preferred_store: newPantryItem.preferred_store,
          low_stock_threshold: parseFloat(newPantryItem.low_stock_threshold) || null,
        }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setPantryItems(prev => [...prev, data.item])
      setNewPantryItem({ name: '', quantity: '', unit: '', department: 'Other', preferred_store: 'either', low_stock_threshold: '' })
      setShowAddPantry(false)
    } catch {
      console.error('Failed to add pantry item')
    }
  }

  // ── Manual receipt import ──
  const addImportItem = () => {
    setImportItems(prev => [...prev, { name: '', quantity: '1', unit: '', unit_price: '', total_price: '', department: 'Other' }])
  }

  const updateImportItem = (index: number, field: string, value: string) => {
    setImportItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  const removeImportItem = (index: number) => {
    setImportItems(prev => prev.filter((_, i) => i !== index))
  }

  const submitReceipt = async () => {
    const validItems = importItems.filter(i => i.name.trim())
    if (validItems.length === 0) return

    setImportSaving(true)
    try {
      const res = await fetch('/api/grocery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upload_receipt',
          store: importStore,
          purchase_date: importDate,
          total_amount: parseFloat(importTotal) || 0,
          snap_amount: parseFloat(importSnap) || 0,
          cash_amount: parseFloat(importCash) || 0,
          items: validItems.map(item => ({
            name: item.name.trim(),
            quantity: parseFloat(item.quantity) || 1,
            unit: item.unit || null,
            unit_price: parseFloat(item.unit_price) || null,
            total_price: parseFloat(item.total_price) || null,
            department: item.department,
          })),
        }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      // Reset form
      setImportItems([])
      setImportTotal('')
      setImportSnap('')
      setImportCash('')
      // Refresh
      fetchPurchases()
      fetchPantry()
      alert(`Imported ${data.items_imported} items successfully!`)
    } catch {
      alert('Failed to import receipt')
    } finally {
      setImportSaving(false)
    }
  }

  // ── Filtered pantry ──
  const filteredPantry = pantryItems.filter(item => {
    if (pantryFilter === 'All') return true
    if (pantryFilter === 'Low Stock') return item.low_stock_threshold != null && item.quantity <= item.low_stock_threshold
    return item.department === pantryFilter
  })

  // Group pantry by department
  const pantryByDept: Record<string, PantryItem[]> = {}
  for (const item of filteredPantry) {
    const dept = item.department || 'Other'
    if (!pantryByDept[dept]) pantryByDept[dept] = []
    pantryByDept[dept].push(item)
  }

  return (
    <div className="space-y-4">
      {/* Sub-tab pills */}
      <div className="flex gap-2">
        {[
          { id: 'pantry' as const, label: 'Pantry Stock', icon: Package },
          { id: 'history' as const, label: 'Purchase History', icon: FileText },
          { id: 'import' as const, label: 'Import', icon: Upload },
          { id: 'analytics' as const, label: 'Spending', icon: BarChart3 },
          { id: 'weekly-list' as const, label: 'Weekly List', icon: ListChecks },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              subTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Pantry Stock ── */}
      {subTab === 'pantry' && (
        <div className="space-y-4">
          {/* Filter pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {FILTER_PILLS.map(pill => (
              <button
                key={pill}
                onClick={() => setPantryFilter(pill)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  pantryFilter === pill
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {pill}
                {pill === 'Low Stock' && (() => {
                  const count = pantryItems.filter(i => i.low_stock_threshold != null && i.quantity <= i.low_stock_threshold).length
                  return count > 0 ? ` (${count})` : ''
                })()}
              </button>
            ))}
            <div className="ml-auto">
              <button
                onClick={() => setShowAddPantry(!showAddPantry)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>
          </div>

          {/* Add pantry item form */}
          {showAddPantry && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3 border">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newPantryItem.name}
                  onChange={e => setNewPantryItem({ ...newPantryItem, name: e.target.value })}
                  className="flex-1 border rounded px-3 py-2 text-sm"
                  placeholder="Item name..."
                />
                <input
                  type="number"
                  value={newPantryItem.quantity}
                  onChange={e => setNewPantryItem({ ...newPantryItem, quantity: e.target.value })}
                  className="w-20 border rounded px-3 py-2 text-sm"
                  placeholder="Qty"
                />
                <input
                  type="text"
                  value={newPantryItem.unit}
                  onChange={e => setNewPantryItem({ ...newPantryItem, unit: e.target.value })}
                  className="w-20 border rounded px-3 py-2 text-sm"
                  placeholder="Unit"
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={newPantryItem.department}
                  onChange={e => setNewPantryItem({ ...newPantryItem, department: e.target.value })}
                  className="flex-1 border rounded px-3 py-2 text-sm"
                >
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select
                  value={newPantryItem.preferred_store}
                  onChange={e => setNewPantryItem({ ...newPantryItem, preferred_store: e.target.value })}
                  className="flex-1 border rounded px-3 py-2 text-sm"
                >
                  {STORE_OPTIONS.map(s => <option key={s} value={s}>{STORE_LABELS[s]}</option>)}
                </select>
                <input
                  type="number"
                  value={newPantryItem.low_stock_threshold}
                  onChange={e => setNewPantryItem({ ...newPantryItem, low_stock_threshold: e.target.value })}
                  className="w-24 border rounded px-3 py-2 text-sm"
                  placeholder="Low at..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={addPantryItem}
                  disabled={!newPantryItem.name.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium disabled:opacity-50 hover:bg-blue-700"
                >
                  Add
                </button>
                <button
                  onClick={() => setShowAddPantry(false)}
                  className="px-4 py-2 text-gray-500 text-sm hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Pantry items by department */}
          {pantryLoading ? (
            <div className="text-center py-8 text-gray-400">Loading pantry...</div>
          ) : filteredPantry.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No pantry items{pantryFilter !== 'All' ? ` in "${pantryFilter}"` : ''}</p>
              <p className="text-xs mt-1">Add items manually or import a receipt</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(pantryByDept).map(([dept, items]) => (
                <div key={dept}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${DEPT_COLORS[dept] || DEPT_COLORS.Other}`}>
                      {dept}
                    </span>
                    <span className="text-xs text-gray-400">{items.length} items</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {items.map(item => {
                      const isLow = item.low_stock_threshold != null && item.quantity <= item.low_stock_threshold
                      return (
                        <div
                          key={item.id}
                          className={`border rounded-lg p-3 bg-white transition-all ${isLow ? 'border-orange-300 bg-orange-50/50' : 'border-gray-200'}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="font-medium text-sm text-gray-900">{item.name}</div>
                            {isLow && <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            {editingPantryId === item.id ? (
                              <input
                                type="number"
                                defaultValue={item.quantity}
                                autoFocus
                                onBlur={e => adjustPantryQuantity(item, parseFloat(e.target.value) || 0)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') adjustPantryQuantity(item, parseFloat((e.target as HTMLInputElement).value) || 0)
                                  if (e.key === 'Escape') setEditingPantryId(null)
                                }}
                                className="w-16 border rounded px-2 py-0.5 text-sm"
                              />
                            ) : (
                              <button
                                onClick={() => setEditingPantryId(item.id)}
                                className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                                title="Click to adjust"
                              >
                                {item.quantity}{item.unit ? ` ${item.unit}` : ''}
                              </button>
                            )}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STORE_COLORS[item.preferred_store] || STORE_COLORS.either}`}>
                              {STORE_LABELS[item.preferred_store] || 'Either'}
                            </span>
                          </div>
                          {isLow && (
                            <div className="mt-1 text-[10px] text-orange-600 font-medium">
                              Low stock (threshold: {item.low_stock_threshold})
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Purchase History ── */}
      {subTab === 'history' && (
        <div className="space-y-3">
          {purchasesLoading ? (
            <div className="text-center py-8 text-gray-400">Loading purchases...</div>
          ) : purchases.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No purchase history yet</p>
              <p className="text-xs mt-1">Import a receipt to get started</p>
            </div>
          ) : (
            purchases.map(p => (
              <div key={p.id} className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => togglePurchaseExpand(p.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      p.store === 'walmart' ? 'bg-blue-100 text-blue-700' :
                      p.store === 'heb' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {p.store === 'heb' ? 'H-E-B' : p.store === 'walmart' ? 'Walmart' : p.store}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {new Date(p.purchase_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-900">${Number(p.total_amount).toFixed(2)}</span>
                    <span className="text-xs text-gray-500">{p.item_count} items</span>
                    {expandedPurchase === p.id
                      ? <ChevronDown className="w-4 h-4 text-gray-400" />
                      : <ChevronRight className="w-4 h-4 text-gray-400" />
                    }
                  </div>
                </button>

                {expandedPurchase === p.id && (
                  <div className="border-t px-4 py-3 bg-gray-50">
                    {/* Payment breakdown */}
                    {(Number(p.snap_amount) > 0 || Number(p.cash_amount) > 0) && (
                      <div className="flex gap-3 mb-3 text-xs text-gray-500">
                        {Number(p.snap_amount) > 0 && <span>SNAP: ${Number(p.snap_amount).toFixed(2)}</span>}
                        {Number(p.cash_amount) > 0 && <span>Cash: ${Number(p.cash_amount).toFixed(2)}</span>}
                      </div>
                    )}
                    {/* Items */}
                    {purchaseItems[p.id] ? (
                      <div className="space-y-1">
                        {purchaseItems[p.id].map(item => (
                          <div key={item.id} className="flex items-center justify-between text-sm py-1">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-900">{item.name}</span>
                              <span className="text-xs text-gray-400">x{item.quantity}{item.unit ? ` ${item.unit}` : ''}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${DEPT_COLORS[item.department] || DEPT_COLORS.Other}`}>
                                {item.department}
                              </span>
                            </div>
                            {item.total_price != null && (
                              <span className="text-gray-600 font-medium">${Number(item.total_price).toFixed(2)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400 py-2">Loading items...</div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Import ── */}
      {subTab === 'import' && (
        <div className="space-y-6">
          {/* Receipt upload placeholder */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Upload className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">Upload Receipt</p>
            <p className="text-xs text-gray-400 mt-1">
              Receipt parsing requires Veryfi API key (Settings) — coming soon
            </p>
          </div>

          {/* Manual entry form */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Manual Receipt Entry</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Store</label>
                <select
                  value={importStore}
                  onChange={e => setImportStore(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  <option value="walmart">Walmart</option>
                  <option value="heb">H-E-B</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                <input
                  type="date"
                  value={importDate}
                  onChange={e => setImportDate(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Total</label>
                <input
                  type="number"
                  step="0.01"
                  value={importTotal}
                  onChange={e => setImportTotal(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="$0.00"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">SNAP</label>
                <input
                  type="number"
                  step="0.01"
                  value={importSnap}
                  onChange={e => setImportSnap(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="$0.00"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cash/Card</label>
                <input
                  type="number"
                  step="0.01"
                  value={importCash}
                  onChange={e => setImportCash(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="$0.00"
                />
              </div>
            </div>

            {/* Items list */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-600">Items</label>
                <button
                  onClick={addImportItem}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  <Plus className="w-3 h-3" />
                  Add Item
                </button>
              </div>

              {importItems.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">No items yet. Click "Add Item" to start.</p>
              ) : (
                <div className="space-y-2">
                  {importItems.map((item, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-2.5 space-y-2">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={item.name}
                          onChange={e => updateImportItem(idx, 'name', e.target.value)}
                          className="flex-1 border rounded px-2 py-1.5 text-xs"
                          placeholder="Item name"
                        />
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={e => updateImportItem(idx, 'quantity', e.target.value)}
                          className="w-14 border rounded px-2 py-1.5 text-xs"
                          placeholder="Qty"
                        />
                        <input
                          type="text"
                          value={item.unit}
                          onChange={e => updateImportItem(idx, 'unit', e.target.value)}
                          className="w-14 border rounded px-2 py-1.5 text-xs"
                          placeholder="Unit"
                        />
                        <button
                          onClick={() => removeImportItem(idx)}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.01"
                          value={item.unit_price}
                          onChange={e => updateImportItem(idx, 'unit_price', e.target.value)}
                          className="w-20 border rounded px-2 py-1.5 text-xs"
                          placeholder="Unit $"
                        />
                        <input
                          type="number"
                          step="0.01"
                          value={item.total_price}
                          onChange={e => updateImportItem(idx, 'total_price', e.target.value)}
                          className="w-20 border rounded px-2 py-1.5 text-xs"
                          placeholder="Total $"
                        />
                        <select
                          value={item.department}
                          onChange={e => updateImportItem(idx, 'department', e.target.value)}
                          className="flex-1 border rounded px-2 py-1.5 text-xs"
                        >
                          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={submitReceipt}
              disabled={importSaving || importItems.filter(i => i.name.trim()).length === 0}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              {importSaving ? 'Importing...' : 'Import Receipt'}
            </button>
          </div>

          {/* Bulk import instructions */}
          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-bold text-gray-900">Walmart / H-E-B Bulk Import</h3>
            <div className="space-y-2 text-xs text-gray-500">
              <p><strong>Walmart:</strong> Log into walmart.com/account/purchasehistory, copy the receipt data, then paste it into the manual form above.</p>
              <p><strong>H-E-B:</strong> Open the H-E-B app, go to My Purchases, screenshot each receipt — OCR import coming in a future update.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Spending Analytics ── */}
      {subTab === 'analytics' && <SpendingDashboard />}

      {/* ── Weekly Shopping List ── */}
      {subTab === 'weekly-list' && <WeeklyListGenerator />}
    </div>
  )
}
