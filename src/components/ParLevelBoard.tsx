'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Check, AlertTriangle, MapPin, RefreshCw, ChevronDown
} from 'lucide-react'

// ── Types ──

interface ParCell {
  item_id: string
  location_id: string
  par_level: number
  current_qty: number
}

interface ParItem {
  id: string
  name: string
  department: string
  unit: string | null
  cells: Record<string, ParCell>
  total_have: number
  total_par: number
}

interface ParLocation {
  id: string
  name: string
}

interface ParBoardData {
  items: ParItem[]
  locations: ParLocation[]
}

const DEPARTMENTS = ['All', 'Cleaning', 'Baking Goods', 'Spices & Seasonings', 'Medications & Health', 'Supplements'] as const

// ── Component ──

export default function ParLevelBoard() {
  const [data, setData] = useState<ParBoardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [deptFilter, setDeptFilter] = useState('All')
  const [editingCell, setEditingCell] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [showAddItem, setShowAddItem] = useState(false)
  const [showAddLocation, setShowAddLocation] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemDept, setNewItemDept] = useState('Cleaning')
  const [newItemUnit, setNewItemUnit] = useState('')
  const [newLocationName, setNewLocationName] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  const fetchBoard = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stock?action=get_par_board')
      const json = await res.json()
      if (!json.error) setData(json)
    } catch {
      console.error('Failed to load par board')
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchBoard() }, [fetchBoard])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const saveCell = async (itemId: string, locationId: string, value: number, field: 'par' | 'qty') => {
    try {
      await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          field === 'par'
            ? { action: 'set_par_level', item_id: itemId, location_id: locationId, par_level: value }
            : { action: 'set_quantity', item_id: itemId, location_id: locationId, quantity: value }
        ),
      })
      fetchBoard()
    } catch {
      showToast('Failed to save')
    }
    setEditingCell(null)
  }

  const addItem = async () => {
    if (!newItemName.trim()) return
    try {
      // PR2 (Item 2.1): action name was 'add_par_item' but the API only
      // implements 'add_stock_item'. fetch() doesn't throw on a 400, so
      // the success toast fired even though no row was inserted. Now we
      // call the real action and check res.ok before claiming success.
      const res = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_stock_item',
          name: newItemName.trim(),
          department: newItemDept,
          unit: newItemUnit || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        showToast(err.error ? `Failed: ${err.error}` : 'Failed to add item')
        return
      }
      setNewItemName('')
      setNewItemUnit('')
      setShowAddItem(false)
      fetchBoard()
      showToast('Item added')
    } catch {
      showToast('Failed to add item')
    }
  }

  const addLocation = async () => {
    if (!newLocationName.trim()) return
    try {
      // Same fix as addItem — was calling 'add_par_location', API has 'add_location'.
      const res = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_location',
          name: newLocationName.trim(),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        showToast(err.error ? `Failed: ${err.error}` : 'Failed to add location')
        return
      }
      setNewLocationName('')
      setShowAddLocation(false)
      fetchBoard()
      showToast('Location added')
    } catch {
      showToast('Failed to add location')
    }
  }

  // Filter items
  const filteredItems = data?.items.filter(item =>
    deptFilter === 'All' || item.department === deptFilter
  ) || []

  // Sort: shortfall items float to top
  const sortedItems = [...filteredItems].sort((a, b) => {
    const aShort = Math.max(0, a.total_par - a.total_have)
    const bShort = Math.max(0, b.total_par - b.total_have)
    if (aShort > 0 && bShort === 0) return -1
    if (aShort === 0 && bShort > 0) return 1
    return a.name.localeCompare(b.name)
  })

  const locations = data?.locations || []

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-gray-100 rounded-lg" />
        <div className="h-64 bg-gray-100 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Department filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {DEPARTMENTS.map(dept => (
          <button
            key={dept}
            onClick={() => setDeptFilter(dept)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              deptFilter === dept
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {dept}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowAddLocation(!showAddLocation)}
            className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700"
          >
            <MapPin className="w-3.5 h-3.5" />
            Add Location
          </button>
          <button
            onClick={() => setShowAddItem(!showAddItem)}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Item
          </button>
          <button
            onClick={fetchBoard}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Add Location form */}
      {showAddLocation && (
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200 space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newLocationName}
              onChange={e => setNewLocationName(e.target.value)}
              className="flex-1 border rounded px-3 py-2 text-sm"
              placeholder="Location name (e.g. Kitchen, Bathroom, Garage)"
              onKeyDown={e => { if (e.key === 'Enter') addLocation() }}
            />
            <button onClick={addLocation} disabled={!newLocationName.trim()} className="px-4 py-2 bg-purple-600 text-white rounded text-sm font-medium disabled:opacity-50 hover:bg-purple-700">Add</button>
            <button onClick={() => setShowAddLocation(false)} className="px-4 py-2 text-gray-500 text-sm hover:text-gray-700">Cancel</button>
          </div>
        </div>
      )}

      {/* Add Item form */}
      {showAddItem && (
        <div className="bg-green-50 rounded-lg p-4 border border-green-200 space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newItemName}
              onChange={e => setNewItemName(e.target.value)}
              className="flex-1 border rounded px-3 py-2 text-sm"
              placeholder="Item name..."
            />
            <input
              type="text"
              value={newItemUnit}
              onChange={e => setNewItemUnit(e.target.value)}
              className="w-20 border rounded px-3 py-2 text-sm"
              placeholder="Unit"
            />
            <select
              value={newItemDept}
              onChange={e => setNewItemDept(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            >
              {DEPARTMENTS.filter(d => d !== 'All').map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={addItem} disabled={!newItemName.trim()} className="px-4 py-2 bg-green-600 text-white rounded text-sm font-medium disabled:opacity-50 hover:bg-green-700">Add Item</button>
            <button onClick={() => setShowAddItem(false)} className="px-4 py-2 text-gray-500 text-sm hover:text-gray-700">Cancel</button>
          </div>
        </div>
      )}

      {/* Par Level Grid */}
      {sortedItems.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No par level items{deptFilter !== 'All' ? ` in "${deptFilter}"` : ''}</p>
          <p className="text-xs mt-1">Add items and locations to start tracking supply levels</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-sm border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-3 py-2 font-semibold text-gray-700 sticky left-0 bg-gray-50 z-10 min-w-[160px]">Item</th>
                {locations.map(loc => (
                  <th key={loc.id} className="text-center px-2 py-2 font-medium text-gray-600 whitespace-nowrap" title={loc.name}>
                    {loc.name.length > 10 ? loc.name.slice(0, 9) + '...' : loc.name}
                  </th>
                ))}
                <th className="text-center px-2 py-2 font-semibold text-gray-700">Have</th>
                <th className="text-center px-2 py-2 font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map(item => {
                const shortfall = Math.max(0, item.total_par - item.total_have)
                return (
                  <tr key={item.id} className={`border-b hover:bg-gray-50 transition-colors ${shortfall > 0 ? 'bg-amber-50/50' : ''}`}>
                    <td className="px-3 py-2 font-medium text-gray-900 sticky left-0 bg-white z-10">
                      <div>{item.name}</div>
                      {item.unit && <span className="text-[10px] text-gray-400">{item.unit}</span>}
                    </td>
                    {locations.map(loc => {
                      const cell = item.cells[loc.id]
                      const cellKey = `${item.id}:${loc.id}`
                      const parLevel = cell?.par_level ?? 0
                      const currentQty = cell?.current_qty ?? 0
                      const isEditing = editingCell === cellKey

                      return (
                        <td key={loc.id} className="text-center px-1 py-1">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              autoFocus
                              defaultValue={parLevel}
                              className="w-14 border rounded px-1 py-0.5 text-center text-sm"
                              onBlur={e => saveCell(item.id, loc.id, parseFloat(e.target.value) || 0, 'par')}
                              onKeyDown={e => {
                                if (e.key === 'Enter') saveCell(item.id, loc.id, parseFloat((e.target as HTMLInputElement).value) || 0, 'par')
                                if (e.key === 'Escape') setEditingCell(null)
                              }}
                            />
                          ) : (
                            <button
                              onClick={() => { setEditingCell(cellKey); setEditValue(String(parLevel)) }}
                              className={`w-full py-1 rounded text-xs font-medium transition-colors ${
                                parLevel > 0
                                  ? currentQty >= parLevel
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                    : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                  : 'text-gray-300 hover:bg-gray-100 hover:text-gray-500'
                              }`}
                              title={`Par: ${parLevel}, Have: ${currentQty}`}
                            >
                              {parLevel > 0 ? `${currentQty}/${parLevel}` : '-'}
                            </button>
                          )}
                        </td>
                      )
                    })}
                    <td className="text-center px-2 py-2 font-semibold text-gray-700">{item.total_have}</td>
                    <td className="text-center px-2 py-2">
                      {shortfall > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                          +{shortfall} needed
                        </span>
                      ) : (
                        <Check className="w-4 h-4 text-green-500 mx-auto" />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
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
