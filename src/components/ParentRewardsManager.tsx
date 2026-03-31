'use client'

import { useState, useEffect } from 'react'
import {
  Star, ShoppingBag, Clock, CheckCircle, XCircle, Plus, Edit2, Eye, EyeOff,
  Archive, Save, X, RotateCcw, ChevronDown, ChevronUp, Loader2, Users, Flame, Target
} from 'lucide-react'
import { getAllFamilyData } from '@/lib/familyConfig'

const familyData = getAllFamilyData()
const familyChildren = familyData.children.filter(Boolean)

type ManagerTab = 'store' | 'requests' | 'kids'

interface StoreItem {
  id: number
  name: string
  description: string | null
  category: string
  star_cost: number
  requires_approval: boolean
  visible: boolean
  archived: boolean
  notes: string | null
}

interface PendingRequest {
  id: number
  kid_name: string
  item_id: number
  stars_held: number
  status: string
  kid_note: string | null
  parent_note: string | null
  created_at: string
  item_name: string
  item_description: string | null
  item_category: string
  star_cost: number
}

export default function ParentRewardsManager() {
  const [tab, setTab] = useState<ManagerTab>('requests')
  const [items, setItems] = useState<StoreItem[]>([])
  const [requests, setRequests] = useState<PendingRequest[]>([])
  const [loaded, setLoaded] = useState(false)
  const [editingItem, setEditingItem] = useState<StoreItem | null>(null)
  const [showAddItem, setShowAddItem] = useState(false)
  const [selectedKid, setSelectedKid] = useState<string>(familyChildren[0]?.name?.toLowerCase() || '')
  const [kidData, setKidData] = useState<any>(null)
  const [kidDataLoaded, setKidDataLoaded] = useState(false)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [declineNote, setDeclineNote] = useState<Record<number, string>>({})
  const [expandedHistory, setExpandedHistory] = useState(false)

  // New item form
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newCat, setNewCat] = useState('Activities')
  const [newCost, setNewCost] = useState('10')
  const [newApproval, setNewApproval] = useState(true)
  const [newNotes, setNewNotes] = useState('')

  const loadStore = () => {
    Promise.all([
      fetch('/api/stars?action=get_all_store_items').then(r => r.json()),
      fetch('/api/stars?action=get_pending_requests').then(r => r.json()),
    ]).then(([storeData, reqData]) => {
      setItems(storeData.items || [])
      setRequests(reqData.requests || [])
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }

  useEffect(() => { loadStore() }, [])

  // Load per-kid data
  useEffect(() => {
    if (tab === 'kids' && selectedKid) {
      setKidDataLoaded(false)
      fetch(`/api/stars?action=get_kid_balance_summary&kid_name=${selectedKid}`)
        .then(r => r.json())
        .then(d => { setKidData(d); setKidDataLoaded(true) })
        .catch(() => setKidDataLoaded(true))
    }
  }, [tab, selectedKid])

  const handleApprove = async (id: number) => {
    setActionLoading(id)
    try {
      await fetch('/api/stars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve_redemption', redemption_id: id }),
      })
      loadStore()
    } catch { /* ignore */ }
    finally { setActionLoading(null) }
  }

  const handleDecline = async (id: number) => {
    setActionLoading(id)
    try {
      await fetch('/api/stars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decline_redemption', redemption_id: id, parent_note: declineNote[id] || null }),
      })
      setDeclineNote(prev => { const n = { ...prev }; delete n[id]; return n })
      loadStore()
    } catch { /* ignore */ }
    finally { setActionLoading(null) }
  }

  const handleAddItem = async () => {
    if (!newName.trim()) return
    await fetch('/api/stars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_store_item',
        name: newName.trim(),
        description: newDesc.trim() || null,
        category: newCat,
        star_cost: parseInt(newCost) || 10,
        requires_approval: newApproval,
        notes: newNotes.trim() || null,
      }),
    })
    setNewName(''); setNewDesc(''); setNewCat('Activities'); setNewCost('10'); setNewNotes(''); setNewApproval(true)
    setShowAddItem(false)
    loadStore()
  }

  const handleUpdateItem = async (item: StoreItem, updates: Partial<StoreItem>) => {
    await fetch('/api/stars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_store_item', item_id: item.id, ...updates }),
    })
    loadStore()
  }

  const handleSaveEdit = async () => {
    if (!editingItem) return
    await fetch('/api/stars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_store_item',
        item_id: editingItem.id,
        name: editingItem.name,
        description: editingItem.description,
        category: editingItem.category,
        star_cost: editingItem.star_cost,
        requires_approval: editingItem.requires_approval,
        notes: editingItem.notes,
      }),
    })
    setEditingItem(null)
    loadStore()
  }

  const handleReverse = async (logId: number) => {
    const note = prompt('Reason for reversal (optional):')
    await fetch('/api/stars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reverse_deduction', log_id: logId, note: note || null }),
    })
    // Reload kid data
    if (selectedKid) {
      const d = await fetch(`/api/stars?action=get_kid_balance_summary&kid_name=${selectedKid}`).then(r => r.json())
      setKidData(d)
    }
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Star className="w-7 h-7" /> Stars & Rewards Manager
        </h1>
        <p className="text-amber-100 mt-1">Manage the store, approve requests, and view kid balances</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        {([
          { id: 'requests' as ManagerTab, label: 'Requests', count: requests.length },
          { id: 'store' as ManagerTab, label: 'Store Manager', count: 0 },
          { id: 'kids' as ManagerTab, label: 'Per-Kid View', count: 0 },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors ${
              tab === t.id
                ? 'bg-amber-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className="ml-1.5 bg-white/20 text-xs px-1.5 py-0.5 rounded-full">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Requests Tab ── */}
      {tab === 'requests' && (
        <div className="space-y-3">
          {requests.length === 0 ? (
            <div className="bg-white rounded-lg border p-8 text-center text-gray-400">
              <Clock className="w-8 h-8 mx-auto mb-2" />
              <p>No pending requests</p>
            </div>
          ) : (
            requests.map(req => (
              <div key={req.id} className="bg-white rounded-lg border shadow-sm p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium capitalize">
                      {req.kid_name}
                    </span>
                    <h4 className="font-semibold text-gray-900 mt-1">{req.item_name}</h4>
                    <p className="text-sm text-gray-500">{req.item_category} - {req.star_cost} stars</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' })}
                  </span>
                </div>
                {req.kid_note && (
                  <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded mb-3 italic">
                    Kid&apos;s note: {req.kid_note}
                  </p>
                )}
                {req.item_description && (
                  <p className="text-xs text-gray-500 mb-3">{req.item_description}</p>
                )}
                <div className="flex gap-2 items-center">
                  <button
                    onClick={() => handleApprove(req.id)}
                    disabled={actionLoading === req.id}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50"
                  >
                    {actionLoading === req.id ? '...' : 'Approve'}
                  </button>
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={declineNote[req.id] || ''}
                      onChange={e => setDeclineNote(prev => ({ ...prev, [req.id]: e.target.value }))}
                      placeholder="Decline reason (optional)"
                      className="flex-1 border rounded-lg px-3 py-2 text-sm"
                    />
                    <button
                      onClick={() => handleDecline(req.id)}
                      disabled={actionLoading === req.id}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Store Manager Tab ── */}
      {tab === 'store' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Store Items ({items.length})</h3>
            <button
              onClick={() => setShowAddItem(true)}
              className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-600 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>

          {/* Add Item Form */}
          {showAddItem && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-gray-900">New Store Item</h4>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="Item name" className="border rounded-lg px-3 py-2 text-sm col-span-2" />
                <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)}
                  placeholder="Description (optional)" className="border rounded-lg px-3 py-2 text-sm col-span-2 h-16 resize-none" />
                <select value={newCat} onChange={e => setNewCat(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm">
                  <option>Screen Time</option>
                  <option>Social</option>
                  <option>Activities</option>
                  <option>Chore Passes</option>
                </select>
                <input type="number" value={newCost} onChange={e => setNewCost(e.target.value)}
                  placeholder="Star cost" className="border rounded-lg px-3 py-2 text-sm" />
                <textarea value={newNotes} onChange={e => setNewNotes(e.target.value)}
                  placeholder="Notes (optional)" className="border rounded-lg px-3 py-2 text-sm col-span-2 h-12 resize-none" />
                <label className="flex items-center gap-2 text-sm col-span-2">
                  <input type="checkbox" checked={newApproval} onChange={e => setNewApproval(e.target.checked)} />
                  Requires parent approval
                </label>
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddItem} className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-600">
                  Save Item
                </button>
                <button onClick={() => setShowAddItem(false)} className="text-gray-500 text-sm px-3">Cancel</button>
              </div>
            </div>
          )}

          {/* Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {items.map(item => (
              <div key={item.id} className={`bg-white rounded-lg border shadow-sm p-4 ${
                item.archived ? 'opacity-50' : !item.visible ? 'opacity-75' : ''
              }`}>
                {editingItem?.id === item.id ? (
                  <div className="space-y-2">
                    <input type="text" value={editingItem.name} onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                      className="w-full border rounded px-2 py-1 text-sm font-semibold" />
                    <textarea value={editingItem.description || ''} onChange={e => setEditingItem({ ...editingItem, description: e.target.value })}
                      className="w-full border rounded px-2 py-1 text-sm h-12 resize-none" placeholder="Description" />
                    <div className="flex gap-2">
                      <select value={editingItem.category} onChange={e => setEditingItem({ ...editingItem, category: e.target.value })}
                        className="border rounded px-2 py-1 text-sm flex-1">
                        <option>Screen Time</option><option>Social</option><option>Activities</option><option>Chore Passes</option>
                      </select>
                      <input type="number" value={editingItem.star_cost} onChange={e => setEditingItem({ ...editingItem, star_cost: parseInt(e.target.value) || 0 })}
                        className="border rounded px-2 py-1 text-sm w-20" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleSaveEdit} className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 flex items-center gap-1">
                        <Save className="w-3 h-3" /> Save
                      </button>
                      <button onClick={() => setEditingItem(null)} className="text-gray-500 text-sm">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <h4 className="font-semibold text-gray-900">{item.name}</h4>
                        <p className="text-xs text-gray-500">{item.category}</p>
                      </div>
                      <div className="flex items-center gap-1 text-amber-600">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span className="font-bold text-sm">{item.star_cost}</span>
                      </div>
                    </div>
                    {item.description && <p className="text-xs text-gray-600 mb-2">{item.description}</p>}
                    <div className="flex gap-1 mt-2">
                      <button onClick={() => setEditingItem({ ...item })} className="text-gray-400 hover:text-gray-600 p-1">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleUpdateItem(item, { visible: !item.visible })}
                        className="text-gray-400 hover:text-gray-600 p-1" title={item.visible ? 'Hide' : 'Show'}>
                        {item.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => handleUpdateItem(item, { archived: !item.archived })}
                        className="text-gray-400 hover:text-gray-600 p-1" title={item.archived ? 'Unarchive' : 'Archive'}>
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                      {item.archived && <span className="text-xs text-gray-400 ml-1">Archived</span>}
                      {!item.visible && !item.archived && <span className="text-xs text-gray-400 ml-1">Hidden</span>}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Per-Kid View Tab ── */}
      {tab === 'kids' && (
        <div className="space-y-4">
          {/* Kid selector */}
          <div className="flex gap-2 flex-wrap">
            {familyChildren.map(child => {
              const key = child.name.toLowerCase()
              return (
                <button
                  key={key}
                  onClick={() => setSelectedKid(key)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedKid === key
                      ? 'bg-amber-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {child.name}
                </button>
              )
            })}
          </div>

          {!kidDataLoaded ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : kidData ? (
            <div className="space-y-4">
              {/* Balance card */}
              <div className="bg-gradient-to-r from-amber-400 to-yellow-400 text-white p-5 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg capitalize">{selectedKid}&apos;s Stars</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Star className="w-6 h-6 fill-white/80" />
                      <span className="text-3xl font-black">{kidData.balance}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    {kidData.streak > 0 && (
                      <div className="flex items-center gap-1">
                        <Flame className="w-5 h-5 text-orange-200" />
                        <span className="font-bold">{kidData.streak}d streak</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Savings goals */}
              {kidData.goals && kidData.goals.length > 0 && (
                <div className="bg-white rounded-lg border shadow-sm p-4">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-purple-600" /> Savings Goals
                  </h4>
                  {kidData.goals.map((g: any) => (
                    <div key={g.id} className="mb-2">
                      <div className="flex justify-between text-sm">
                        <span>{g.goal_name}</span>
                        <span className="text-gray-500">{kidData.balance}/{g.target_stars}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${Math.min(100, Math.round((kidData.balance / g.target_stars) * 100))}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Transaction history */}
              <div className="bg-white rounded-lg border shadow-sm">
                <button
                  onClick={() => setExpandedHistory(!expandedHistory)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
                >
                  <h4 className="font-semibold text-gray-900">Transaction History</h4>
                  {expandedHistory ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                {expandedHistory && kidData.history && (
                  <div className="px-4 pb-4 space-y-2">
                    {kidData.history.map((entry: any) => (
                      <div key={entry.id} className="flex items-center justify-between text-sm">
                        <div className="flex-1 min-w-0">
                          <span className="text-gray-700 truncate block">{entry.reason}</span>
                          <span className="text-xs text-gray-400">
                            {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Chicago' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                          <span className={`font-semibold ${
                            entry.change_amount > 0 ? 'text-green-600' : 'text-rose-600'
                          }`}>
                            {entry.change_amount > 0 ? '+' : ''}{entry.change_amount}
                          </span>
                          {entry.change_amount < 0 && entry.source !== 'reversal' && (
                            <button
                              onClick={() => handleReverse(entry.id)}
                              className="text-gray-400 hover:text-blue-600 p-1"
                              title="Reverse this deduction"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border p-8 text-center text-gray-400">
              <p>No star data for this kid yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
