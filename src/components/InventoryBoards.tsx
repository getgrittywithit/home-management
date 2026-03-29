'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Minus, RefreshCw, ChevronDown, ChevronUp, AlertTriangle,
  Check, Clock, Bell, Package, Pill, Leaf
} from 'lucide-react'

// ── Types ──

interface InventoryItem {
  id: string
  name: string
  quantity: number
  unit: string | null
  department: string
  storage_location: string | null
  source_store: string | null
  best_by_date: string | null
  opened_date: string | null
  is_rx: boolean
  is_subscribe_save: boolean
  refill_date: string | null
  notes: string | null
}

interface InventoryBoardsProps {
  section?: 'all' | 'medicine'
}

const STORE_BADGE: Record<string, string> = {
  walmart: 'bg-blue-100 text-blue-700',
  heb: 'bg-red-100 text-red-700',
  amazon: 'bg-amber-100 text-amber-700',
  costco: 'bg-green-100 text-green-700',
}

const LOCATION_BADGE: Record<string, string> = {
  'baking-cabinet': 'bg-yellow-100 text-yellow-700',
  'fridge': 'bg-cyan-100 text-cyan-700',
  'pantry': 'bg-amber-100 text-amber-700',
  'spice-rack': 'bg-orange-100 text-orange-700',
  'medicine-cabinet': 'bg-purple-100 text-purple-700',
}

function getFreshnessStatus(openedDate: string | null): { label: string; color: string } {
  if (!openedDate) return { label: 'Sealed', color: 'text-green-600 bg-green-50' }
  const opened = new Date(openedDate)
  const now = new Date()
  const months = (now.getTime() - opened.getTime()) / (1000 * 60 * 60 * 24 * 30)
  if (months < 12) return { label: 'Fresh', color: 'text-green-600 bg-green-50' }
  if (months < 18) return { label: 'Check', color: 'text-amber-600 bg-amber-50' }
  return { label: 'Replace', color: 'text-red-600 bg-red-50' }
}

function getBestByStatus(bestBy: string | null): { label: string; color: string } | null {
  if (!bestBy) return null
  const date = new Date(bestBy)
  const now = new Date()
  const days = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  if (days < 0) return { label: 'Expired', color: 'text-red-600 bg-red-50' }
  if (days < 30) return { label: 'Expiring soon', color: 'text-amber-600 bg-amber-50' }
  return null
}

// ── Component ──

export default function InventoryBoards({ section = 'all' }: InventoryBoardsProps) {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSection, setExpandedSection] = useState<Record<string, boolean>>({
    baking: section !== 'medicine',
    spices: section !== 'medicine',
    medications: true,
    supplements: section === 'medicine',
  })
  const [toast, setToast] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState<string | null>(null)
  const [newItem, setNewItem] = useState({ name: '', quantity: '1', unit: '', department: '', storage_location: '', source_store: '', is_rx: false, is_subscribe_save: false })

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const depts = section === 'medicine'
        ? 'Medications & Health,Supplements'
        : 'Baking Goods,Spices & Seasonings,Medications & Health,Supplements'
      const res = await fetch(`/api/stock?action=get_inventory_boards&departments=${encodeURIComponent(depts)}`)
      const json = await res.json()
      if (!json.error) setItems(json.items || [])
    } catch {
      console.error('Failed to load inventory')
    }
    setLoading(false)
  }, [section])

  useEffect(() => { fetchItems() }, [fetchItems])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const adjustQuantity = async (item: InventoryItem, delta: number) => {
    const newQty = Math.max(0, item.quantity + delta)
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: newQty } : i))
    try {
      await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'adjust_inventory', id: item.id, quantity: newQty }),
      })
    } catch {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: item.quantity } : i))
    }
  }

  const addItem = async (dept: string) => {
    if (!newItem.name.trim()) return
    try {
      await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_inventory_item',
          name: newItem.name.trim(),
          quantity: parseFloat(newItem.quantity) || 1,
          unit: newItem.unit || null,
          department: dept,
          storage_location: newItem.storage_location || null,
          source_store: newItem.source_store || null,
          is_rx: newItem.is_rx,
          is_subscribe_save: newItem.is_subscribe_save,
        }),
      })
      setNewItem({ name: '', quantity: '1', unit: '', department: '', storage_location: '', source_store: '', is_rx: false, is_subscribe_save: false })
      setShowAddForm(null)
      fetchItems()
      showToast('Item added')
    } catch {
      showToast('Failed to add item')
    }
  }

  const setReminder = async (item: InventoryItem) => {
    const date = prompt('Enter refill reminder date (YYYY-MM-DD):')
    if (!date) return
    try {
      await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_refill_reminder', id: item.id, refill_date: date }),
      })
      fetchItems()
      showToast('Reminder set')
    } catch {
      showToast('Failed to set reminder')
    }
  }

  const toggleSection = (key: string) => {
    setExpandedSection(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Group items
  const bakingItems = items.filter(i => i.department === 'Baking Goods')
  const spiceItems = items.filter(i => i.department === 'Spices & Seasonings')
  const medItems = items.filter(i => i.department === 'Medications & Health')
  const suppItems = items.filter(i => i.department === 'Supplements')

  // Separate Rx from OTC in medications
  const rxItems = medItems.filter(i => i.is_rx)
  const otcItems = medItems.filter(i => !i.is_rx)

  const renderItemCard = (item: InventoryItem, showFreshness = false) => {
    const freshness = showFreshness ? getFreshnessStatus(item.opened_date) : null
    const bestByStatus = getBestByStatus(item.best_by_date)
    const locationKey = item.storage_location?.toLowerCase().replace(/\s+/g, '-') || ''

    return (
      <div key={item.id} className="border rounded-lg p-3 bg-white hover:shadow-sm transition-all">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-sm text-gray-900 truncate">{item.name}</span>
              {item.is_subscribe_save && <span title="Subscribe & Save" className="text-sm">🔄</span>}
            </div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {item.storage_location && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${LOCATION_BADGE[locationKey] || 'bg-gray-100 text-gray-600'}`}>
                  {item.storage_location}
                </span>
              )}
              {item.source_store && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STORE_BADGE[item.source_store] || 'bg-gray-100 text-gray-600'}`}>
                  {item.source_store}
                </span>
              )}
              {freshness && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${freshness.color}`}>
                  {freshness.label}
                </span>
              )}
              {bestByStatus && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${bestByStatus.color}`}>
                  {bestByStatus.label}
                </span>
              )}
            </div>
          </div>
          {/* Quantity adjust */}
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => adjustQuantity(item, -1)}
              className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-sm font-semibold text-gray-900 w-8 text-center">
              {item.quantity}
            </span>
            <button
              onClick={() => adjustQuantity(item, 1)}
              className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
        {item.unit && (
          <span className="text-[10px] text-gray-400">{item.unit}</span>
        )}
      </div>
    )
  }

  const renderRxCard = (item: InventoryItem) => (
    <div key={item.id} className="border border-purple-200 rounded-lg p-3 bg-purple-50/50 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Pill className="w-3.5 h-3.5 text-purple-500" />
            <span className="font-medium text-sm text-gray-900 truncate">{item.name}</span>
            {item.is_subscribe_save && <span title="Subscribe & Save" className="text-sm">🔄</span>}
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-purple-100 text-purple-700">Rx</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {item.refill_date && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-blue-50 text-blue-600 flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                Refill: {new Date(item.refill_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
            {item.source_store && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STORE_BADGE[item.source_store] || 'bg-gray-100 text-gray-600'}`}>
                {item.source_store}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={() => adjustQuantity(item, -1)}
            className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="text-sm font-semibold text-gray-900 w-8 text-center">{item.quantity}</span>
          <button
            onClick={() => adjustQuantity(item, 1)}
            className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>
      {item.unit && <span className="text-[10px] text-gray-400">{item.unit}</span>}
      <div className="mt-2">
        <button
          onClick={() => setReminder(item)}
          className="flex items-center gap-1 px-2 py-1 bg-purple-600 text-white rounded text-[10px] font-medium hover:bg-purple-700"
        >
          <Bell className="w-3 h-3" />
          Set Reminder
        </button>
      </div>
    </div>
  )

  const renderAddForm = (dept: string) => (
    <div className="bg-green-50 rounded-lg p-3 border border-green-200 space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newItem.name}
          onChange={e => setNewItem({ ...newItem, name: e.target.value })}
          className="flex-1 border rounded px-3 py-1.5 text-sm"
          placeholder="Item name..."
        />
        <input
          type="number"
          value={newItem.quantity}
          onChange={e => setNewItem({ ...newItem, quantity: e.target.value })}
          className="w-16 border rounded px-3 py-1.5 text-sm"
          placeholder="Qty"
        />
        <input
          type="text"
          value={newItem.unit}
          onChange={e => setNewItem({ ...newItem, unit: e.target.value })}
          className="w-16 border rounded px-3 py-1.5 text-sm"
          placeholder="Unit"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newItem.storage_location}
          onChange={e => setNewItem({ ...newItem, storage_location: e.target.value })}
          className="flex-1 border rounded px-3 py-1.5 text-sm"
          placeholder="Storage location"
        />
        <select
          value={newItem.source_store}
          onChange={e => setNewItem({ ...newItem, source_store: e.target.value })}
          className="border rounded px-3 py-1.5 text-sm"
        >
          <option value="">Store...</option>
          <option value="walmart">Walmart</option>
          <option value="heb">H-E-B</option>
          <option value="amazon">Amazon</option>
          <option value="costco">Costco</option>
        </select>
        {(dept === 'Medications & Health' || dept === 'Supplements') && (
          <>
            <label className="flex items-center gap-1 text-xs text-gray-600">
              <input type="checkbox" checked={newItem.is_rx} onChange={e => setNewItem({ ...newItem, is_rx: e.target.checked })} className="rounded" />
              Rx
            </label>
            <label className="flex items-center gap-1 text-xs text-gray-600">
              <input type="checkbox" checked={newItem.is_subscribe_save} onChange={e => setNewItem({ ...newItem, is_subscribe_save: e.target.checked })} className="rounded" />
              S&S
            </label>
          </>
        )}
      </div>
      <div className="flex gap-2">
        <button onClick={() => addItem(dept)} disabled={!newItem.name.trim()} className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-medium disabled:opacity-50 hover:bg-green-700">Add</button>
        <button onClick={() => setShowAddForm(null)} className="px-3 py-1.5 text-gray-500 text-xs hover:text-gray-700">Cancel</button>
      </div>
    </div>
  )

  const renderSection = (
    key: string,
    title: string,
    icon: React.ReactNode,
    headerBg: string,
    headerText: string,
    sectionItems: React.ReactNode,
    count: number,
    dept: string,
  ) => (
    <div key={key} className="border rounded-lg overflow-hidden bg-white shadow-sm">
      <button
        onClick={() => toggleSection(key)}
        className={`w-full px-4 py-3 flex items-center justify-between ${headerBg} transition-colors`}
      >
        <div className="flex items-center gap-2">
          {icon}
          <h3 className={`font-bold text-sm ${headerText}`}>{title}</h3>
          <span className={`text-xs ${headerText} opacity-70`}>({count})</span>
        </div>
        {expandedSection[key] ? <ChevronUp className={`w-4 h-4 ${headerText}`} /> : <ChevronDown className={`w-4 h-4 ${headerText}`} />}
      </button>
      {expandedSection[key] && (
        <div className="p-3 space-y-3">
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddForm(showAddForm === key ? null : key)}
              className="flex items-center gap-1 px-2.5 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700"
            >
              <Plus className="w-3 h-3" />
              Add {title.split(' ')[0]}
            </button>
          </div>
          {showAddForm === key && renderAddForm(dept)}
          {count === 0 ? (
            <p className="text-center py-4 text-xs text-gray-400">No items yet</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {sectionItems}
            </div>
          )}
        </div>
      )}
    </div>
  )

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-12 bg-gray-100 rounded-lg" />
        <div className="h-48 bg-gray-100 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-600" />
          {section === 'medicine' ? 'Medicine Cabinet' : 'Inventory Boards'}
        </h2>
        <button onClick={fetchItems} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Refresh">
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Baking Cabinet */}
      {section !== 'medicine' && renderSection(
        'baking',
        'Baking Cabinet',
        <Package className="w-4 h-4 text-yellow-700" />,
        'bg-yellow-50',
        'text-yellow-800',
        <>{bakingItems.map(item => renderItemCard(item))}</>,
        bakingItems.length,
        'Baking Goods',
      )}

      {/* Spice Cabinet */}
      {section !== 'medicine' && renderSection(
        'spices',
        'Spice Cabinet',
        <Leaf className="w-4 h-4 text-orange-700" />,
        'bg-orange-50',
        'text-orange-800',
        <>{spiceItems.map(item => renderItemCard(item, true))}</>,
        spiceItems.length,
        'Spices & Seasonings',
      )}

      {/* Medications */}
      {renderSection(
        'medications',
        'Medications & Health',
        <Pill className="w-4 h-4 text-purple-700" />,
        'bg-purple-50',
        'text-purple-800',
        <>
          {rxItems.length > 0 && (
            <>
              <div className="col-span-full text-xs font-semibold text-purple-600 uppercase tracking-wider mb-1">Prescriptions</div>
              {rxItems.map(item => renderRxCard(item))}
            </>
          )}
          {otcItems.length > 0 && (
            <>
              {rxItems.length > 0 && <div className="col-span-full text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 mt-2">Over the Counter</div>}
              {otcItems.map(item => renderItemCard(item))}
            </>
          )}
        </>,
        medItems.length,
        'Medications & Health',
      )}

      {/* Supplements */}
      {renderSection(
        'supplements',
        'Supplements',
        <Leaf className="w-4 h-4 text-green-700" />,
        'bg-green-50',
        'text-green-800',
        <>{suppItems.map(item => renderItemCard(item))}</>,
        suppItems.length,
        'Supplements',
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  )
}
