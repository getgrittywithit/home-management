'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, LayoutGrid, List, Plus, Upload, Package, Loader2, X, ChevronDown } from 'lucide-react'

const ASSET_TYPES = [
  { value: 'book', label: 'Book', emoji: '📚' },
  { value: 'workbook', label: 'Workbook', emoji: '📓' },
  { value: 'curriculum', label: 'Curriculum', emoji: '📖' },
  { value: 'game', label: 'Game', emoji: '🎲' },
  { value: 'stem_kit', label: 'STEM Kit', emoji: '🔬' },
  { value: 'manipulative', label: 'Manipulative', emoji: '🧩' },
  { value: 'art_supply', label: 'Art Supply', emoji: '🎨' },
  { value: 'digital_subscription', label: 'Digital Sub', emoji: '💻' },
  { value: 'instrument', label: 'Instrument', emoji: '🎵' },
  { value: 'sporting_equipment', label: 'Sports', emoji: '⚽' },
  { value: 'tech_device', label: 'Tech', emoji: '📱' },
  { value: 'printable', label: 'Printable', emoji: '🖨️' },
  { value: 'other', label: 'Other', emoji: '📦' },
]

const CONDITION_BADGE: Record<string, { label: string; color: string }> = {
  new: { label: 'New', color: 'bg-green-100 text-green-700' },
  good: { label: 'Good', color: 'bg-blue-100 text-blue-700' },
  worn: { label: 'Worn', color: 'bg-yellow-100 text-yellow-700' },
  damaged: { label: 'Damaged', color: 'bg-orange-100 text-orange-700' },
  broken: { label: 'Broken', color: 'bg-red-100 text-red-700' },
}

const SOURCES = [
  { value: 'tefa_purchase', label: 'TEFA Purchase' },
  { value: 'pre_tefa_owned', label: 'Already Owned' },
  { value: 'gift', label: 'Gift' },
  { value: 'thrift', label: 'Thrift' },
  { value: 'library_book', label: 'Library Book' },
  { value: 'other', label: 'Other' },
]

interface Asset {
  id: string
  asset_name: string
  asset_type: string
  description: string | null
  category_tags: string[]
  topic_tags: string[]
  condition: string
  status: string
  source: string
  home_location: string | null
  is_consumable: boolean
  quantity_on_hand: number
  unit_link_count: number
  kids_used: string[] | null
  updated_at: string
}

export default function FamilyLibrary() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)

  const fetchAssets = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ action: 'list_assets' })
      if (search) params.set('search', search)
      if (typeFilter) params.set('asset_type', typeFilter)
      const res = await fetch(`/api/family-library?${params}`)
      const data = await res.json()
      setAssets(data.assets || [])
      setTotal(data.total || 0)
    } catch { setAssets([]) }
    setLoading(false)
  }, [search, typeFilter])

  useEffect(() => { fetchAssets() }, [fetchAssets])

  const typeInfo = (type: string) => ASSET_TYPES.find(t => t.value === type) || ASSET_TYPES[ASSET_TYPES.length - 1]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Family Library</h3>
          <p className="text-sm text-gray-500">{total} asset{total !== 1 ? 's' : ''} in your collection</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAdd(true)}
            className="px-3 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add Item
          </button>
          <button onClick={() => setShowImport(true)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-1.5">
            <Upload className="w-4 h-4" /> Import CSV
          </button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search assets by name or topic..."
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="">All Types</option>
          {ASSET_TYPES.map(t => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
        </select>
        <div className="flex border rounded-lg overflow-hidden">
          <button onClick={() => setViewMode('grid')}
            className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-teal-50 text-teal-700' : 'text-gray-500 hover:bg-gray-50'}`}>
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode('list')}
            className={`px-3 py-2 ${viewMode === 'list' ? 'bg-teal-50 text-teal-700' : 'text-gray-500 hover:bg-gray-50'}`}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <Package className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No assets yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Try importing a CSV of what you already own, or add your first item here.
          </p>
          <button onClick={() => setShowAdd(true)}
            className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700">
            Add First Item
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {assets.map(a => {
            const t = typeInfo(a.asset_type)
            const cond = CONDITION_BADGE[a.condition] || CONDITION_BADGE.good
            return (
              <button key={a.id} onClick={() => setSelectedAsset(a)}
                className="text-left bg-white border rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{t.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{a.asset_name}</p>
                    <p className="text-xs text-gray-500">{t.label}</p>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${cond.color}`}>{cond.label}</span>
                </div>
                {a.topic_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {a.topic_tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-teal-50 text-teal-700 rounded">{tag}</span>
                    ))}
                    {a.topic_tags.length > 3 && <span className="text-[10px] text-gray-400">+{a.topic_tags.length - 3}</span>}
                  </div>
                )}
                {a.kids_used && a.kids_used.length > 0 && (
                  <p className="text-[10px] text-gray-400 mt-2">
                    Used by: {a.kids_used.map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(', ')}
                  </p>
                )}
              </button>
            )
          })}
        </div>
      ) : (
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-gray-500 uppercase">
                <th className="p-3">Asset</th>
                <th className="p-3">Type</th>
                <th className="p-3">Condition</th>
                <th className="p-3">Location</th>
                <th className="p-3">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {assets.map(a => {
                const t = typeInfo(a.asset_type)
                const cond = CONDITION_BADGE[a.condition] || CONDITION_BADGE.good
                return (
                  <tr key={a.id} onClick={() => setSelectedAsset(a)} className="hover:bg-gray-50 cursor-pointer">
                    <td className="p-3 font-medium text-gray-900">{a.asset_name}</td>
                    <td className="p-3 text-gray-500">{t.emoji} {t.label}</td>
                    <td className="p-3"><span className={`text-xs px-1.5 py-0.5 rounded-full ${cond.color}`}>{cond.label}</span></td>
                    <td className="p-3 text-gray-500">{a.home_location || '—'}</td>
                    <td className="p-3 text-gray-500 capitalize">{a.source?.replace(/_/g, ' ') || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Asset Modal */}
      {showAdd && (
        <AddAssetModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); fetchAssets() }} />
      )}

      {/* Import CSV Modal */}
      {showImport && (
        <ImportCSVModal onClose={() => setShowImport(false)} onDone={() => { setShowImport(false); fetchAssets() }} />
      )}

      {/* Asset Detail Drawer */}
      {selectedAsset && (
        <AssetDetailDrawer asset={selectedAsset} onClose={() => setSelectedAsset(null)} onUpdated={fetchAssets} />
      )}
    </div>
  )
}

// ─── Add Asset Modal ──────────────────────────────────────────────────────────
function AddAssetModal({ onClose, onSaved, prefill }: { onClose: () => void; onSaved: () => void; prefill?: Partial<Asset> }) {
  const [form, setForm] = useState({
    asset_name: prefill?.asset_name || '',
    asset_type: prefill?.asset_type || 'other',
    description: '',
    condition: 'good',
    home_location: '',
    source: 'pre_tefa_owned',
    topic_tags: '',
    is_consumable: false,
    quantity_on_hand: 1,
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.asset_name.trim()) return
    setSaving(true)
    try {
      await fetch('/api/family-library', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_asset',
          ...form,
          topic_tags: form.topic_tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      })
      onSaved()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Add to Family Library</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">Name *</label>
            <input value={form.asset_name} onChange={e => setForm({ ...form, asset_name: e.target.value })}
              className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" placeholder="e.g. Schleich Ocean Animals Set" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Type</label>
              <select value={form.asset_type} onChange={e => setForm({ ...form, asset_type: e.target.value })}
                className="w-full mt-1 border rounded-lg px-3 py-2 text-sm">
                {ASSET_TYPES.map(t => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Condition</label>
              <select value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })}
                className="w-full mt-1 border rounded-lg px-3 py-2 text-sm">
                <option value="new">New</option>
                <option value="good">Good</option>
                <option value="worn">Worn</option>
                <option value="damaged">Damaged</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              rows={2} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" placeholder="Optional notes..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Location</label>
              <input value={form.home_location} onChange={e => setForm({ ...form, home_location: e.target.value })}
                className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" placeholder="e.g. School room shelf" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Source</label>
              <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}
                className="w-full mt-1 border rounded-lg px-3 py-2 text-sm">
                {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">Topic Tags (comma-separated)</label>
            <input value={form.topic_tags} onChange={e => setForm({ ...form, topic_tags: e.target.value })}
              className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" placeholder="ocean, marine biology, animals" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_consumable} onChange={e => setForm({ ...form, is_consumable: e.target.checked })}
              className="rounded border-gray-300 text-teal-600" />
            Consumable (gets used up — paper, paint, etc.)
          </label>
        </div>
        <div className="px-5 py-3 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 border rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.asset_name.trim()}
            className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50 flex items-center gap-1.5">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Add to Library
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Import CSV Modal ─────────────────────────────────────────────────────────
function ImportCSVModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [csv, setCsv] = useState('')
  const [preview, setPreview] = useState<any[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; errors: any[] } | null>(null)

  const parseCsv = () => {
    const lines = csv.trim().split('\n')
    if (lines.length < 2) return
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const rows = lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim())
      const obj: any = {}
      headers.forEach((h, i) => { obj[h] = vals[i] || '' })
      // Convert topic_tags from semicolon-separated to array
      if (obj.topic_tags) obj.topic_tags = obj.topic_tags.split(';').map((t: string) => t.trim()).filter(Boolean)
      else obj.topic_tags = []
      return obj
    }).filter(r => r.asset_name)
    setPreview(rows)
  }

  const doImport = async () => {
    if (preview.length === 0) return
    setImporting(true)
    try {
      const res = await fetch('/api/family-library', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bulk_import', items: preview }),
      })
      const data = await res.json()
      setResult({ imported: data.imported || 0, errors: data.errors || [] })
      if (data.imported > 0) setTimeout(onDone, 2000)
    } finally { setImporting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Import CSV</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600">
            Paste CSV with columns: <code className="text-xs bg-gray-100 px-1 rounded">asset_name, asset_type, description, condition, home_location, topic_tags</code>
            <br /><span className="text-xs text-gray-400">Separate topic_tags with semicolons. Max 500 rows.</span>
          </p>
          <textarea value={csv} onChange={e => setCsv(e.target.value)} rows={6}
            className="w-full border rounded-lg px-3 py-2 text-xs font-mono" placeholder="asset_name,asset_type,description,condition,home_location,topic_tags&#10;Schleich Ocean Set,manipulative,12-piece ocean animals,good,School room,ocean;marine biology" />
          <button onClick={parseCsv} className="px-3 py-1.5 border rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            Preview ({csv.split('\n').length - 1} rows)
          </button>
          {preview.length > 0 && (
            <div className="border rounded-lg overflow-x-auto max-h-48">
              <table className="w-full text-xs">
                <thead><tr className="bg-gray-50 border-b"><th className="p-2 text-left">Name</th><th className="p-2">Type</th><th className="p-2">Condition</th><th className="p-2">Tags</th></tr></thead>
                <tbody>
                  {preview.slice(0, 10).map((r, i) => (
                    <tr key={i} className="border-b"><td className="p-2">{r.asset_name}</td><td className="p-2">{r.asset_type}</td><td className="p-2">{r.condition}</td><td className="p-2">{(r.topic_tags || []).join(', ')}</td></tr>
                  ))}
                  {preview.length > 10 && <tr><td colSpan={4} className="p-2 text-gray-400 text-center">...and {preview.length - 10} more</td></tr>}
                </tbody>
              </table>
            </div>
          )}
          {result && (
            <div className={`p-3 rounded-lg text-sm ${result.errors.length > 0 ? 'bg-yellow-50 text-yellow-800' : 'bg-green-50 text-green-800'}`}>
              Imported {result.imported} of {preview.length} items.
              {result.errors.length > 0 && <span> {result.errors.length} errors.</span>}
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 border rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={doImport} disabled={importing || preview.length === 0}
            className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50">
            {importing ? 'Importing...' : `Import ${preview.length} Items`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Asset Detail Drawer ──────────────────────────────────────────────────────
function AssetDetailDrawer({ asset, onClose, onUpdated }: { asset: Asset; onClose: () => void; onUpdated: () => void }) {
  const [detail, setDetail] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [condition, setCondition] = useState(asset.condition)
  const [status, setStatus] = useState(asset.status)

  useEffect(() => {
    fetch(`/api/family-library?action=get_asset&id=${asset.id}`)
      .then(r => r.json())
      .then(d => { setDetail(d); setCondition(d.asset?.condition || asset.condition); setStatus(d.asset?.status || asset.status) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [asset.id])

  const updateField = async (field: string, value: string) => {
    await fetch('/api/family-library', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_asset', id: asset.id, [field]: value }),
    })
    onUpdated()
  }

  const t = ASSET_TYPES.find(at => at.value === asset.asset_type) || ASSET_TYPES[ASSET_TYPES.length - 1]

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex justify-end" onClick={onClose}>
      <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{t.emoji}</span>
            <div>
              <h3 className="font-bold text-gray-900">{asset.asset_name}</h3>
              <p className="text-xs text-gray-500">{t.label}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Condition</label>
                <select value={condition} onChange={e => { setCondition(e.target.value); updateField('condition', e.target.value) }}
                  className="w-full mt-1 border rounded-lg px-3 py-2 text-sm">
                  <option value="new">New</option><option value="good">Good</option>
                  <option value="worn">Worn</option><option value="damaged">Damaged</option>
                  <option value="broken">Broken</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Status</label>
                <select value={status} onChange={e => { setStatus(e.target.value); updateField('status', e.target.value) }}
                  className="w-full mt-1 border rounded-lg px-3 py-2 text-sm">
                  <option value="in_use">In Use</option><option value="storage">Storage</option>
                  <option value="loaned_out">Loaned Out</option><option value="donated">Donated</option>
                  <option value="sold">Sold</option><option value="trashed">Trashed</option>
                </select>
              </div>
            </div>

            {/* Details */}
            {detail?.asset?.description && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Description</label>
                <p className="text-sm text-gray-700 mt-1">{detail.asset.description}</p>
              </div>
            )}

            {detail?.asset?.home_location && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Location</label>
                <p className="text-sm text-gray-700 mt-1">{detail.asset.home_location}</p>
              </div>
            )}

            {detail?.asset?.topic_tags?.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Topics</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {detail.asset.topic_tags.map((tag: string) => (
                    <span key={tag} className="text-xs px-2 py-0.5 bg-teal-50 text-teal-700 rounded">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Source</label>
              <p className="text-sm text-gray-700 mt-1 capitalize">{(detail?.asset?.source || 'other').replace(/_/g, ' ')}</p>
            </div>

            {/* Usage History */}
            {detail?.unit_links?.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Used In Units</label>
                <div className="mt-1 space-y-1.5">
                  {detail.unit_links.map((ul: any) => (
                    <div key={ul.id} className="text-sm bg-gray-50 rounded-lg px-3 py-2">
                      <span className="font-medium">{ul.unit_title}</span>
                      <span className="text-gray-400"> — {ul.subject}, {ul.month} {ul.school_year}</span>
                      <span className="text-gray-400"> ({ul.kid_name})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Kid Affinity */}
            {detail?.kid_affinity?.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Kid Experience</label>
                <div className="mt-1 space-y-1">
                  {detail.kid_affinity.map((ka: any) => (
                    <div key={ka.id} className="text-sm flex items-center gap-2">
                      <span className="font-medium capitalize">{ka.kid_name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        ka.affinity_type === 'loved' ? 'bg-pink-50 text-pink-700' :
                        ka.affinity_type === 'struggled' ? 'bg-orange-50 text-orange-700' :
                        ka.affinity_type === 'outgrew' ? 'bg-gray-100 text-gray-600' :
                        'bg-blue-50 text-blue-700'
                      }`}>{ka.affinity_type}</span>
                      {ka.notes && <span className="text-gray-400 text-xs">— {ka.notes}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Danger Zone */}
            <div className="pt-4 border-t">
              <button onClick={async () => {
                if (!confirm('Move this asset to Trashed? Usage history is preserved.')) return
                await updateField('status', 'trashed')
                onClose()
              }} className="text-sm text-red-500 hover:text-red-700">
                Retire / Trash This Asset
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
