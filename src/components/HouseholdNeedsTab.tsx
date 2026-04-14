'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ShoppingBag, Plus, Star, Check, X, Edit3, Trash2, Copy, ChevronDown, ChevronRight,
  History, Loader2, Archive, Tag,
} from 'lucide-react'

interface NeedItem {
  id: string
  category: string
  name: string
  brand: string | null
  model: string | null
  price_min: string | number | null
  price_max: string | number | null
  notes: string | null
  photo_url: string | null
  is_starred: boolean
  status: 'active' | 'pending' | 'purchased' | 'cancelled' | 'denied'
  requested_by: string | null
  approved_by: string | null
  approved_at: string | null
  denied_reason: string | null
  purchased_at: string | null
  purchased_price: string | number | null
  purchased_where: string | null
  for_person: string | null
  created_at: string
}

interface NeedCategory {
  id: string
  name: string
  icon: string
  sort_order: number
  is_archived: boolean
}

const ALL_PEOPLE = ['Family', 'Amos', 'Zoey', 'Kaylee', 'Ellie', 'Wyatt', 'Hannah', 'Lola', 'Levi']

function fmtPrice(min: any, max: any): string {
  if (min != null && max != null) return `$${Number(min)}\u2013$${Number(max)}`
  if (max != null) return `under $${Number(max)}`
  if (min != null) return `from $${Number(min)}`
  return ''
}

function titleCase(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : ''
}

export default function HouseholdNeedsTab() {
  const [items, setItems] = useState<NeedItem[]>([])
  const [categories, setCategories] = useState<NeedCategory[]>([])
  const [history, setHistory] = useState<NeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<NeedItem | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [showCategoriesAdmin, setShowCategoriesAdmin] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [denyDialog, setDenyDialog] = useState<NeedItem | null>(null)
  const [purchaseDialog, setPurchaseDialog] = useState<NeedItem | null>(null)

  const flashToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 2500)
  }

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [listRes, catRes, histRes] = await Promise.all([
        fetch('/api/household-needs?action=list').then((r) => r.json()),
        fetch('/api/household-needs?action=categories').then((r) => r.json()),
        fetch('/api/household-needs?action=list&include_history=1').then((r) => r.json()),
      ])
      setItems(listRes.items || [])
      setCategories(catRes.categories || [])
      setHistory((histRes.items || []).filter((i: NeedItem) => i.status === 'purchased'))
    } catch (err) {
      console.error('needs load failed', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const active = items.filter((i) => i.status === 'active')
  const pending = items.filter((i) => i.status === 'pending')

  // Group active by category; starred first within each group
  const grouped: Record<string, NeedItem[]> = {}
  for (const i of active) {
    if (!grouped[i.category]) grouped[i.category] = []
    grouped[i.category].push(i)
  }
  for (const c of Object.keys(grouped)) {
    grouped[c].sort((a, b) => {
      if (a.is_starred !== b.is_starred) return a.is_starred ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }

  const categoryMeta = (name: string): NeedCategory | undefined =>
    categories.find((c) => c.name === name)

  const orderedCategoryNames = [
    ...categories.filter((c) => grouped[c.name]).map((c) => c.name),
    ...Object.keys(grouped).filter((c) => !categories.find((x) => x.name === c)),
  ]

  const toggleCat = (c: string) => {
    setCollapsedCats((prev) => ({ ...prev, [c]: !prev[c] }))
  }

  const toggleStar = async (it: NeedItem) => {
    await fetch('/api/household-needs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'star', id: it.id, is_starred: !it.is_starred }),
    })
    loadAll()
  }

  const approveRequest = async (it: NeedItem) => {
    await fetch('/api/household-needs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', id: it.id }),
    })
    flashToast(`Approved "${it.name}"`)
    loadAll()
  }

  const confirmDeny = async (reason: string) => {
    if (!denyDialog) return
    await fetch('/api/household-needs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deny', id: denyDialog.id, denied_reason: reason }),
    })
    flashToast(`Denied "${denyDialog.name}"`)
    setDenyDialog(null)
    loadAll()
  }

  const confirmPurchase = async (price: string, where: string) => {
    if (!purchaseDialog) return
    await fetch('/api/household-needs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'mark_purchased',
        id: purchaseDialog.id,
        purchased_price: price ? parseFloat(price) : null,
        purchased_where: where || null,
      }),
    })
    flashToast(`Marked "${purchaseDialog.name}" as purchased`)
    setPurchaseDialog(null)
    loadAll()
  }

  const deleteItem = async (it: NeedItem) => {
    if (!confirm(`Remove "${it.name}" from the needs list?`)) return
    await fetch('/api/household-needs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id: it.id }),
    })
    loadAll()
  }

  const exportAppleNotes = async () => {
    try {
      const res = await fetch('/api/household-needs?action=export_apple_notes')
      const json = await res.json()
      if (json.text) {
        await navigator.clipboard.writeText(json.text)
        flashToast('Copied to clipboard — paste into Apple Notes')
      }
    } catch (err) {
      flashToast('Copy failed — try again')
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
        Loading needs list...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-sky-600" />
            Household Needs
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            📋 {active.length} item{active.length !== 1 ? 's' : ''} across {Object.keys(grouped).length} categor{Object.keys(grouped).length === 1 ? 'y' : 'ies'}
            {' · '}
            {active.filter((i) => i.is_starred).length} starred
            {pending.length > 0 && (
              <span className="text-amber-600 font-medium"> · 🔔 {pending.length} kid request{pending.length > 1 ? 's' : ''} pending</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportAppleNotes}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
            title="Copy list as formatted text for Apple Notes"
          >
            <Copy className="w-3.5 h-3.5" /> Apple Notes
          </button>
          <button
            onClick={() => setShowCategoriesAdmin(true)}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            title="Manage categories"
          >
            <Tag className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setEditing(null); setShowAdd(true) }}
            className="flex items-center gap-1 bg-sky-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-sky-700"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>
      </div>

      {/* Pending kid requests */}
      {pending.length > 0 && (
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
          <h3 className="text-sm font-semibold text-amber-900 mb-2">
            🔔 Kid Requests ({pending.length})
          </h3>
          <div className="space-y-2">
            {pending.map((it) => (
              <div
                key={it.id}
                className="flex items-center gap-2 bg-white rounded-lg border border-amber-200 p-2.5"
              >
                <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium capitalize">
                  {it.requested_by || 'kid'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{it.name}</div>
                  <div className="text-[11px] text-gray-500">
                    {it.category}
                    {it.notes && <span className="ml-1 text-gray-400">· {it.notes}</span>}
                  </div>
                </div>
                <button
                  onClick={() => approveRequest(it)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 text-xs font-semibold"
                  title="Approve"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDenyDialog(it)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 text-xs font-semibold"
                  title="Deny"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category accordion */}
      {orderedCategoryNames.length === 0 ? (
        <div className="text-center text-gray-400 py-12 border-2 border-dashed border-gray-200 rounded-xl">
          <ShoppingBag className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">No items yet</p>
          <p className="text-xs mt-1">Add the first thing you need.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orderedCategoryNames.map((catName) => {
            const catItems = grouped[catName]
            const collapsed = collapsedCats[catName]
            const meta = categoryMeta(catName)
            return (
              <div key={catName} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <button
                  onClick={() => toggleCat(catName)}
                  className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-50 text-left"
                >
                  {collapsed ? (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="text-lg">{meta?.icon || '📦'}</span>
                  <span className="font-semibold text-gray-900 flex-1">{catName}</span>
                  <span className="text-xs text-gray-400">{catItems.length} item{catItems.length !== 1 ? 's' : ''}</span>
                </button>
                {!collapsed && (
                  <div className="divide-y divide-gray-100">
                    {catItems.map((it) => (
                      <div key={it.id}>
                        <div
                          className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                          onClick={() => setExpandedId(expandedId === it.id ? null : it.id)}
                        >
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleStar(it) }}
                            className={`mt-0.5 flex-shrink-0 ${it.is_starred ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'}`}
                            aria-label="Star"
                          >
                            <Star className={`w-4 h-4 ${it.is_starred ? 'fill-yellow-400' : ''}`} />
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-gray-900">
                                {it.brand ? `${it.brand} ` : ''}{it.name}
                              </span>
                              {fmtPrice(it.price_min, it.price_max) && (
                                <span className="text-xs text-gray-500">{fmtPrice(it.price_min, it.price_max)}</span>
                              )}
                              {it.for_person && it.for_person !== 'Family' && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded-full">
                                  for {it.for_person}
                                </span>
                              )}
                            </div>
                            {(it.model || it.notes) && (
                              <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                                {it.model && <span>Model: {it.model}</span>}
                                {it.model && it.notes && <span> · </span>}
                                {it.notes && <span>{it.notes}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                        {expandedId === it.id && (
                          <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
                            <div className="pt-3 space-y-2 text-sm">
                              {it.brand && <div><span className="text-gray-500">Brand:</span> {it.brand}</div>}
                              {it.model && <div><span className="text-gray-500">Model:</span> {it.model}</div>}
                              {fmtPrice(it.price_min, it.price_max) && (
                                <div><span className="text-gray-500">Price:</span> {fmtPrice(it.price_min, it.price_max)}</div>
                              )}
                              {it.notes && <div><span className="text-gray-500">Notes:</span> {it.notes}</div>}
                              {it.for_person && <div><span className="text-gray-500">For:</span> {it.for_person}</div>}
                              {it.requested_by && it.requested_by !== 'parent' && (
                                <div className="text-xs text-gray-400">Added by {titleCase(it.requested_by)}</div>
                              )}
                              <div className="flex gap-2 pt-2">
                                <button
                                  onClick={() => { setEditing(it); setShowAdd(true) }}
                                  className="flex items-center gap-1 text-xs bg-white border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-100"
                                >
                                  <Edit3 className="w-3 h-3" /> Edit
                                </button>
                                <button
                                  onClick={() => setPurchaseDialog(it)}
                                  className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-200"
                                >
                                  <Check className="w-3 h-3" /> Mark Purchased
                                </button>
                                <button
                                  onClick={() => deleteItem(it)}
                                  className="flex items-center gap-1 text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 ml-auto"
                                >
                                  <Trash2 className="w-3 h-3" /> Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Purchased history */}
      {history.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-50"
          >
            {showHistory ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
            <History className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-gray-700 text-sm">Recently Purchased</span>
            <span className="text-xs text-gray-400 ml-auto">{history.length}</span>
          </button>
          {showHistory && (
            <div className="divide-y divide-gray-100">
              {history.slice(0, 20).map((it) => (
                <div key={it.id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                  <span className="text-gray-400 line-through">{it.brand ? `${it.brand} ` : ''}{it.name}</span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {it.purchased_price != null && `$${Number(it.purchased_price)}`}
                    {it.purchased_where && ` · ${it.purchased_where}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit modal */}
      {showAdd && (
        <NeedItemForm
          item={editing}
          categories={categories}
          onClose={() => { setShowAdd(false); setEditing(null) }}
          onSaved={() => { setShowAdd(false); setEditing(null); loadAll() }}
        />
      )}

      {/* Deny dialog */}
      {denyDialog && (
        <DenyReasonDialog
          item={denyDialog}
          onCancel={() => setDenyDialog(null)}
          onConfirm={confirmDeny}
        />
      )}

      {/* Purchase dialog */}
      {purchaseDialog && (
        <PurchaseDialog
          item={purchaseDialog}
          onCancel={() => setPurchaseDialog(null)}
          onConfirm={confirmPurchase}
        />
      )}

      {/* Categories admin */}
      {showCategoriesAdmin && (
        <CategoriesAdminModal
          categories={categories}
          onClose={() => setShowCategoriesAdmin(false)}
          onChanged={loadAll}
        />
      )}
    </div>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

function NeedItemForm({
  item, categories, onClose, onSaved,
}: {
  item: NeedItem | null
  categories: NeedCategory[]
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(item?.name || '')
  const [category, setCategory] = useState(item?.category || (categories[0]?.name || 'Other'))
  const [brand, setBrand] = useState(item?.brand || '')
  const [model, setModel] = useState(item?.model || '')
  const [priceMin, setPriceMin] = useState(item?.price_min != null ? String(item.price_min) : '')
  const [priceMax, setPriceMax] = useState(item?.price_max != null ? String(item.price_max) : '')
  const [forPerson, setForPerson] = useState(item?.for_person || 'Family')
  const [notes, setNotes] = useState(item?.notes || '')
  const [photoUrl, setPhotoUrl] = useState(item?.photo_url || '')
  const [isStarred, setIsStarred] = useState(!!item?.is_starred)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!name.trim()) return
    setSaving(true)
    const payload: any = {
      name: name.trim(),
      category,
      brand: brand || null,
      model: model || null,
      price_min: priceMin ? parseFloat(priceMin) : null,
      price_max: priceMax ? parseFloat(priceMax) : null,
      for_person: forPerson,
      notes: notes || null,
      photo_url: photoUrl || null,
      is_starred: isStarred,
    }
    try {
      if (item) {
        await fetch('/api/household-needs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update', id: item.id, ...payload }),
        })
      } else {
        await fetch('/api/household-needs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create', ...payload }),
        })
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">{item ? 'Edit Item' : 'Add Item'}</h3>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-700">Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Stand Mixer"
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-400 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-700">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700">For</label>
              <select
                value={forPerson}
                onChange={(e) => setForPerson(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
              >
                {ALL_PEOPLE.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-700">Brand</label>
              <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="KitchenAid" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700">Model</label>
              <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="K45WW" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-700">Price min</label>
              <input type="number" step="0.01" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} placeholder="80" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700">Price max</label>
              <input type="number" step="0.01" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} placeholder="150" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Solid stainless steel — no coating to flake" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700">Photo URL (optional)</label>
            <input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://..." className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={isStarred} onChange={(e) => setIsStarred(e.target.checked)} className="w-4 h-4 rounded border-gray-300" />
            <Star className={`w-4 h-4 ${isStarred ? 'text-yellow-500 fill-yellow-400' : 'text-gray-400'}`} />
            Star as priority
          </label>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
          <button
            onClick={save}
            disabled={!name.trim() || saving}
            className="flex-1 bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-sky-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : (item ? 'Save changes' : 'Add item')}
          </button>
        </div>
      </div>
    </div>
  )
}

function DenyReasonDialog({ item, onCancel, onConfirm }: { item: NeedItem; onCancel: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Deny request</h3>
          <p className="text-xs text-gray-500 mt-0.5">"{item.name}" from {titleCase(item.requested_by || 'kid')}</p>
        </div>
        <div className="p-5">
          <label className="text-xs font-semibold text-gray-700">Reason (optional)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="We already have one..."
            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
          <button
            onClick={() => onConfirm(reason)}
            className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700"
          >
            Deny request
          </button>
        </div>
      </div>
    </div>
  )
}

function PurchaseDialog({ item, onCancel, onConfirm }: { item: NeedItem; onCancel: () => void; onConfirm: (price: string, where: string) => void }) {
  const [price, setPrice] = useState('')
  const [where, setWhere] = useState('')
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Mark as purchased</h3>
          <p className="text-xs text-gray-500 mt-0.5">"{item.name}"</p>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-700">Price paid</label>
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="95.00"
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700">Where</label>
            <input
              value={where}
              onChange={(e) => setWhere(e.target.value)}
              placeholder="Target / Goodwill / Amazon"
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
          <button
            onClick={() => onConfirm(price, where)}
            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700"
          >
            Mark purchased
          </button>
        </div>
      </div>
    </div>
  )
}

function CategoriesAdminModal({
  categories, onClose, onChanged,
}: {
  categories: NeedCategory[]
  onClose: () => void
  onChanged: () => void
}) {
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('📦')
  const [saving, setSaving] = useState(false)

  const createCat = async () => {
    if (!newName.trim()) return
    setSaving(true)
    try {
      await fetch('/api/household-needs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_category', name: newName.trim(), icon: newIcon }),
      })
      setNewName('')
      setNewIcon('📦')
      onChanged()
    } finally { setSaving(false) }
  }

  const archive = async (c: NeedCategory) => {
    if (!confirm(`Archive category "${c.name}"? Existing items keep their category name.`)) return
    await fetch('/api/household-needs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_category', id: c.id, is_archived: true }),
    })
    onChanged()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Manage Categories</h3>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                <span className="text-lg">{c.icon}</span>
                <span className="flex-1 text-sm font-medium text-gray-900">{c.name}</span>
                <button
                  onClick={() => archive(c)}
                  className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                  title="Archive"
                >
                  <Archive className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-3">
            <label className="text-xs font-semibold text-gray-700">Add category</label>
            <div className="flex gap-2 mt-1">
              <input
                value={newIcon}
                onChange={(e) => setNewIcon(e.target.value)}
                maxLength={2}
                className="w-12 text-center px-2 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Workshop"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <button
                onClick={createCat}
                disabled={!newName.trim() || saving}
                className="bg-sky-600 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-sky-700 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
