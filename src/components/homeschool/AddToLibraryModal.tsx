'use client'

import { useState } from 'react'
import { X, Plus, Search, Link2, Loader2 } from 'lucide-react'

// Map TEFA categories → asset types
const CATEGORY_TO_TYPE: Record<string, string> = {
  'Fiction': 'book', 'Nonfiction': 'book', 'Audiobooks': 'book', 'Textbooks': 'book',
  'Workbooks': 'workbook', 'Curriculum': 'curriculum',
  'STEM Kits': 'stem_kit', 'Learning Manipulatives': 'manipulative',
  'Art Supplies': 'art_supply', 'Educational Material Kits': 'stem_kit',
  'Keyboard Instruments': 'instrument', 'Percussion Instruments': 'instrument',
  'String Instruments': 'instrument', 'Wind Instruments': 'instrument', 'Instrument Accessories': 'instrument',
  'Sporting Equipment': 'sporting_equipment',
  'Laptops': 'tech_device', 'Tablets': 'tech_device', 'Desktops': 'tech_device',
  'Monitors': 'tech_device', 'Headphones': 'tech_device', 'Cameras': 'tech_device',
  'Printers': 'tech_device', '3D Printers': 'tech_device', 'Computer Accessories': 'computer_accessory',
  'Software Programs': 'software_license', 'Online Learning Program': 'digital_subscription',
  'Educational Applications': 'app', 'Calculators': 'tech_device',
}

interface Props {
  purchaseId: string
  itemName: string
  tefaCategory: string
  onClose: () => void
  onCreated: () => void
}

export default function AddToLibraryModal({ purchaseId, itemName, tefaCategory, onClose, onCreated }: Props) {
  const [mode, setMode] = useState<'create' | 'link' | null>(null)
  const [saving, setSaving] = useState(false)

  // Create new asset
  const [assetName, setAssetName] = useState(itemName)
  const [assetType, setAssetType] = useState(CATEGORY_TO_TYPE[tefaCategory] || 'other')

  // Link existing
  const [searchQ, setSearchQ] = useState(itemName.split(' ')[0] || '')
  const [results, setResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)

  const createAsset = async () => {
    if (!assetName.trim()) return
    setSaving(true)
    try {
      await fetch('/api/family-library', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_asset',
          asset_name: assetName.trim(),
          asset_type: assetType,
          source: 'tefa_purchase',
          source_purchase_id: purchaseId,
          condition: 'new',
          first_acquired_date: new Date().toLocaleDateString('en-CA'),
        }),
      })
      onCreated()
    } finally { setSaving(false) }
  }

  const searchLibrary = async () => {
    if (!searchQ.trim()) return
    setSearching(true)
    try {
      const res = await fetch(`/api/family-library?action=search_for_linking&q=${encodeURIComponent(searchQ)}`)
      const d = await res.json()
      setResults(d.results || [])
    } catch { setResults([]) }
    setSearching(false)
  }

  const linkExisting = async (assetId: string) => {
    setSaving(true)
    try {
      await fetch('/api/family-library', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_asset', id: assetId,
          source_purchase_id: purchaseId, source: 'tefa_purchase',
        }),
      })
      onCreated()
    } finally { setSaving(false) }
  }

  // Service categories (not physical assets)
  const isService = ['Tutoring', 'Behavioral Therapy', 'Occupational Therapy',
    'Physical Therapy', 'Speech Therapy', 'Online Classes', 'Higher Education Classes',
    'Trade School Classes', 'Fine Arts Instruction', 'Physical Education Instruction',
    'Test and Exam Fees', 'Transportation'].includes(tefaCategory)

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800">Add to Family Library?</h3>
            <p className="text-xs text-slate-500 mt-0.5">{itemName} has arrived</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5">
          {mode === null ? (
            <div className="space-y-3">
              <button onClick={() => setMode('create')}
                className="w-full text-left p-4 rounded-xl border-2 border-teal-200 hover:bg-teal-50 transition-colors">
                <div className="flex items-center gap-3">
                  <Plus className="w-5 h-5 text-teal-600" />
                  <div>
                    <p className="font-medium text-slate-800">Create new asset</p>
                    <p className="text-xs text-slate-500">Add to your permanent Family Library</p>
                  </div>
                </div>
              </button>
              <button onClick={() => { setMode('link'); searchLibrary() }}
                className="w-full text-left p-4 rounded-xl border-2 border-blue-200 hover:bg-blue-50 transition-colors">
                <div className="flex items-center gap-3">
                  <Link2 className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-slate-800">Link to existing asset</p>
                    <p className="text-xs text-slate-500">Already own this — link the purchase</p>
                  </div>
                </div>
              </button>
              <button onClick={onClose}
                className="w-full text-center p-3 text-sm text-slate-500 hover:text-slate-700">
                {isService ? 'This is a service — skip' : 'Skip for now'}
              </button>
            </div>
          ) : mode === 'create' ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Name</label>
                <input value={assetName} onChange={e => setAssetName(e.target.value)}
                  className="w-full mt-1 border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Type</label>
                <select value={assetType} onChange={e => setAssetType(e.target.value)}
                  className="w-full mt-1 border rounded-lg px-3 py-2 text-sm">
                  {['book','workbook','curriculum','game','stem_kit','manipulative','art_supply',
                    'digital_subscription','software_license','app','instrument','sporting_equipment',
                    'tech_device','computer_accessory','other'].map(t => (
                    <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setMode(null)} className="px-4 py-2 text-sm text-slate-600 border rounded-lg">Back</button>
                <button onClick={createAsset} disabled={saving || !assetName.trim()}
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-1.5">
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Add to Library
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') searchLibrary() }}
                  placeholder="Search your library..."
                  className="flex-1 border rounded-lg px-3 py-2 text-sm" />
                <button onClick={searchLibrary} className="px-3 py-2 bg-blue-600 text-white rounded-lg">
                  <Search className="w-4 h-4" />
                </button>
              </div>
              {searching ? (
                <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
              ) : results.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No matches found. Try a different search or create a new asset.</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {results.map((r: any) => (
                    <button key={r.id} onClick={() => linkExisting(r.id)} disabled={saving}
                      className="w-full text-left px-3 py-2 rounded-lg border hover:bg-blue-50 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{r.asset_name}</p>
                        <p className="text-xs text-slate-500">{r.asset_type} · {r.condition}</p>
                      </div>
                      <Link2 className="w-4 h-4 text-blue-500" />
                    </button>
                  ))}
                </div>
              )}
              <button onClick={() => setMode(null)} className="px-4 py-2 text-sm text-slate-600 border rounded-lg">Back</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
