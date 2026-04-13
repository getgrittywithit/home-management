'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Package, Plus, Minus, Search, Loader2, X, ChevronDown, ChevronRight,
  Refrigerator, Snowflake, Archive, ChefHat, Sparkles, Pill, Heart, Home, Baby, Trash2,
} from 'lucide-react'

// ── Category config ──────────────────────────────────────────────────────

interface CategoryInfo {
  key: string
  label: string
  icon: any
  color: string
}

const CATEGORIES: CategoryInfo[] = [
  { key: 'Fridge',           label: 'Fridge',        icon: Refrigerator, color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { key: 'Freezer',          label: 'Freezer',       icon: Snowflake,    color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
  { key: 'Pantry',           label: 'Pantry',        icon: Archive,      color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { key: 'Baking Cabinet',   label: 'Baking',        icon: ChefHat,      color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { key: 'Spice Cabinet',    label: 'Spices',        icon: Sparkles,     color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { key: 'Medicine Cabinet', label: 'Medicine',      icon: Pill,         color: 'bg-red-100 text-red-700 border-red-300' },
  { key: 'Supplements',      label: 'Supplements',   icon: Heart,        color: 'bg-pink-100 text-pink-700 border-pink-300' },
  { key: 'Household',        label: 'Household',     icon: Home,         color: 'bg-green-100 text-green-700 border-green-300' },
  { key: 'Personal Care',    label: 'Personal Care', icon: Baby,         color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { key: 'Pets',             label: 'Pets',          icon: Package,      color: 'bg-stone-100 text-stone-700 border-stone-300' },
]

const STORE_COLORS: Record<string, string> = {
  Walmart: 'bg-blue-100 text-blue-700',
  HEB: 'bg-red-100 text-red-700',
  Amazon: 'bg-orange-100 text-orange-700',
  CVS: 'bg-red-100 text-red-700',
}

// ── Types ────────────────────────────────────────────────────────────────

interface InventoryItem {
  id: number
  name: string
  canonical_name: string
  category: string
  sub_category: string
  preferred_store: string | null
  available_stores: string[] | null
  par_level: number
  par_unit: string
  reorder_threshold: number
  current_stock: number
  location: string | null
  last_purchased: string | null
  notes: string | null
}

interface CategoryCount {
  category: string
  total: number
  low_stock: number
}

// ── Main ─────────────────────────────────────────────────────────────────

export default function InventoryBoard() {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].key)
  const [items, setItems] = useState<InventoryItem[]>([])
  const [counts, setCounts] = useState<CategoryCount[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [storeFilter, setStoreFilter] = useState<string>('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [showAdd, setShowAdd] = useState(false)

  const loadCounts = useCallback(async () => {
    try {
      const res = await fetch('/api/inventory?action=category_counts')
      const data = await res.json()
      setCounts(data.counts || [])
    } catch { /* ignore */ }
  }, [])

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ action: 'list', category: activeCategory })
      if (storeFilter) params.set('store', storeFilter)
      if (lowStockOnly) params.set('low_stock', 'true')
      if (search.trim()) params.set('search', search.trim())
      const res = await fetch(`/api/inventory?${params}`)
      const data = await res.json()
      setItems(data.items || [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [activeCategory, storeFilter, lowStockOnly, search])

  useEffect(() => { loadCounts() }, [loadCounts])
  useEffect(() => { loadItems() }, [loadItems])

  // Group items by sub_category
  const grouped = useMemo(() => {
    const by: Record<string, InventoryItem[]> = {}
    for (const item of items) {
      if (!by[item.sub_category]) by[item.sub_category] = []
      by[item.sub_category].push(item)
    }
    return by
  }, [items])

  const countFor = (cat: string) => counts.find(c => c.category === cat)

  const updateStock = async (item: InventoryItem, delta: number) => {
    // Optimistic
    setItems(prev => prev.map(i => i.id === item.id
      ? { ...i, current_stock: Math.max(0, i.current_stock + delta) }
      : i
    ))
    try {
      await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_stock', id: item.id, delta }),
      })
      loadCounts()
    } catch {
      // Rollback
      setItems(prev => prev.map(i => i.id === item.id
        ? { ...i, current_stock: Math.max(0, i.current_stock - delta) }
        : i
      ))
    }
  }

  const toggleCollapse = (sub: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(sub)) next.delete(sub)
      else next.add(sub)
      return next
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b bg-gradient-to-r from-blue-50 to-purple-50 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-600" />
          Household Inventory
        </h2>
        <button
          onClick={() => setShowAdd(true)}
          className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-semibold hover:bg-blue-600 flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Item
        </button>
      </div>

      {/* Category tabs */}
      <div className="border-b overflow-x-auto">
        <div className="flex gap-1 p-2 min-w-max">
          {CATEGORIES.map(cat => {
            const info = countFor(cat.key)
            const active = activeCategory === cat.key
            const Icon = cat.icon
            return (
              <button
                key={cat.key}
                onClick={() => { setActiveCategory(cat.key); setCollapsed(new Set()) }}
                className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                  active
                    ? `${cat.color} border-2`
                    : 'border-2 border-transparent bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.label}
                {info && (
                  <>
                    <span className="text-[10px] text-gray-500 font-normal">{info.total}</span>
                    {info.low_stock > 0 && (
                      <span className="text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold">
                        {info.low_stock}
                      </span>
                    )}
                  </>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="px-5 py-3 border-b bg-gray-50 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search items..."
            className="w-full pl-7 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm"
          />
        </div>
        <select
          value={storeFilter}
          onChange={e => setStoreFilter(e.target.value)}
          className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
        >
          <option value="">All stores</option>
          <option value="Walmart">Walmart</option>
          <option value="HEB">HEB</option>
          <option value="Amazon">Amazon</option>
          <option value="CVS">CVS</option>
        </select>
        <label className="flex items-center gap-1.5 text-xs text-gray-700">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={e => setLowStockOnly(e.target.checked)}
            className="w-3.5 h-3.5"
          />
          Low stock only
        </label>
      </div>

      {/* Body */}
      <div className="p-4 max-h-[65vh] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500">
            No items in {activeCategory}
            {(search || storeFilter || lowStockOnly) && ' matching your filters'}.
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([sub, subItems]) => {
              const isCollapsed = collapsed.has(sub)
              return (
                <div key={sub}>
                  <button
                    onClick={() => toggleCollapse(sub)}
                    className="w-full flex items-center justify-between mb-2 text-left"
                  >
                    <h3 className="text-xs uppercase tracking-wide font-bold text-gray-600">
                      {sub} <span className="text-gray-400 font-normal">({subItems.length})</span>
                    </h3>
                    {isCollapsed ? <ChevronRight className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </button>
                  {!isCollapsed && (
                    <div className="space-y-1.5">
                      {subItems.map(item => (
                        <InventoryRow key={item.id} item={item} onUpdateStock={updateStock} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add item modal */}
      {showAdd && (
        <AddItemModal
          defaultCategory={activeCategory}
          onClose={() => setShowAdd(false)}
          onAdded={() => { setShowAdd(false); loadItems(); loadCounts() }}
        />
      )}
    </div>
  )
}

// ── Row ──────────────────────────────────────────────────────────────────

function InventoryRow({ item, onUpdateStock }: { item: InventoryItem; onUpdateStock: (item: InventoryItem, delta: number) => void }) {
  const pct = item.par_level > 0 ? item.current_stock / item.par_level : 0
  const statusColor = item.current_stock === 0
    ? 'bg-red-50 border-red-200'
    : pct < 1
      ? 'bg-yellow-50 border-yellow-200'
      : 'bg-green-50 border-green-200'

  const stockColor = item.current_stock === 0
    ? 'text-red-700'
    : pct < 1
      ? 'text-yellow-700'
      : 'text-green-700'

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${statusColor}`}>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 truncate">{item.name}</div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {item.preferred_store && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STORE_COLORS[item.preferred_store] || 'bg-gray-100 text-gray-700'}`}>
              {item.preferred_store}
            </span>
          )}
          {item.notes && (
            <span className="text-[10px] text-gray-500 italic truncate">{item.notes}</span>
          )}
        </div>
      </div>
      <div className={`text-xs font-bold whitespace-nowrap ${stockColor}`}>
        {item.current_stock} / {item.par_level} {item.par_unit}
      </div>
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => onUpdateStock(item, -1)}
          disabled={item.current_stock === 0}
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-30"
          aria-label="Decrease stock"
        >
          <Minus className="w-3.5 h-3.5 text-gray-600" />
        </button>
        <button
          onClick={() => onUpdateStock(item, 1)}
          className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-50"
          aria-label="Increase stock"
        >
          <Plus className="w-3.5 h-3.5 text-gray-600" />
        </button>
      </div>
    </div>
  )
}

// ── Add modal ────────────────────────────────────────────────────────────

function AddItemModal({ defaultCategory, onClose, onAdded }: {
  defaultCategory: string
  onClose: () => void
  onAdded: () => void
}) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState(defaultCategory)
  const [subCategory, setSubCategory] = useState('')
  const [preferredStore, setPreferredStore] = useState('Walmart')
  const [parLevel, setParLevel] = useState('1')
  const [parUnit, setParUnit] = useState('item')
  const [currentStock, setCurrentStock] = useState('0')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!name.trim() || !subCategory.trim()) {
      setError('Name and sub-category are required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_item',
          name: name.trim(),
          category,
          sub_category: subCategory.trim(),
          preferred_store: preferredStore,
          par_level: parseInt(parLevel) || 1,
          par_unit: parUnit || 'item',
          current_stock: parseInt(currentStock) || 0,
          notes: notes.trim() || null,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      onAdded()
    } catch (e: any) {
      setError(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Add Inventory Item</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</div>}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
                {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sub-category *</label>
              <input type="text" value={subCategory} onChange={e => setSubCategory(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. Fresh Fruit" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Store</label>
              <select value={preferredStore} onChange={e => setPreferredStore(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm bg-white">
                <option value="Walmart">Walmart</option>
                <option value="HEB">HEB</option>
                <option value="Amazon">Amazon</option>
                <option value="CVS">CVS</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Par</label>
              <input type="number" min={1} value={parLevel} onChange={e => setParLevel(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
              <input type="text" value={parUnit} onChange={e => setParUnit(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Current stock</label>
            <input type="number" min={0} value={currentStock} onChange={e => setCurrentStock(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Optional" />
          </div>
        </div>
        <div className="px-5 py-3 border-t bg-gray-50 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-white">Cancel</button>
          <button onClick={handleSave} disabled={saving || !name.trim() || !subCategory.trim()} className="px-4 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1.5">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Add Item
          </button>
        </div>
      </div>
    </div>
  )
}
