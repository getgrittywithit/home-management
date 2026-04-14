'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Upload, FileText, CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronRight,
  Loader2, Trash2, Edit3, Save, X, Import, ChefHat, Sparkles,
} from 'lucide-react'

interface StagingItem {
  id: string
  batch_id: string
  original_filename: string | null
  file_size_bytes: number | null
  parsed_data: ParsedRecipe | null
  status: 'uploaded' | 'extracted' | 'parsed' | 'imported' | 'skipped' | 'failed' | 'needs_review'
  error_message: string | null
  confidence: string | number | null
  imported_meal_id: string | null
  created_at: string
}

interface Batch {
  batch_id: string
  total: number
  ready: number
  review: number
  failed: number
  imported: number
  skipped: number
  created_at: string
}

interface ParsedRecipe {
  name: string
  meal_type: string
  theme_match: string
  season: string
  difficulty: string
  prep_time_min: number | null
  cook_time_min: number | null
  servings: number | null
  description: string
  ingredients: { item: string; amount?: string; notes?: string }[]
  instructions: string[]
  sides_starch_options: string[]
  sides_veggie_options: string[]
  dietary_notes: string[]
  has_mushrooms: boolean
  kid_manager_fit: string | null
  source: string
  confidence: number
}

const STATUS_META: Record<string, { color: string; label: string; icon: any }> = {
  uploaded:     { color: 'bg-gray-100 text-gray-600',       label: 'Uploaded',     icon: FileText },
  extracted:    { color: 'bg-gray-100 text-gray-600',       label: 'Extracted',    icon: FileText },
  parsed:       { color: 'bg-green-100 text-green-700',     label: 'Ready',        icon: CheckCircle },
  needs_review: { color: 'bg-amber-100 text-amber-700',     label: 'Needs Review', icon: AlertTriangle },
  failed:       { color: 'bg-red-100 text-red-700',         label: 'Failed',       icon: XCircle },
  imported:     { color: 'bg-blue-100 text-blue-700',       label: 'Imported',     icon: CheckCircle },
  skipped:      { color: 'bg-gray-100 text-gray-400',       label: 'Skipped',      icon: XCircle },
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Strip the data: URL prefix
      const base64 = result.includes(',') ? result.split(',')[1] : result
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function RecipeImportTab() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [activeBatch, setActiveBatch] = useState<string | null>(null)
  const [items, setItems] = useState<StagingItem[]>([])
  const [uploading, setUploading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<ParsedRecipe | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const flashToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 3000)
  }

  const loadBatches = useCallback(async () => {
    try {
      const res = await fetch('/api/recipe-import?action=list_batches')
      const json = await res.json()
      setBatches(json.batches || [])
      if (!activeBatch && json.batches?.[0]) {
        setActiveBatch(json.batches[0].batch_id)
      }
    } catch (err) {
      console.error('list_batches failed', err)
    }
  }, [activeBatch])

  const loadBatch = useCallback(async (batchId: string) => {
    if (!batchId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/recipe-import?action=list_batch&batch_id=${batchId}`)
      const json = await res.json()
      setItems(json.items || [])
    } catch (err) {
      console.error('list_batch failed', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadBatches() }, [loadBatches])
  useEffect(() => { if (activeBatch) loadBatch(activeBatch) }, [activeBatch, loadBatch])

  const handleFileUpload = async (fileList: FileList) => {
    const files = Array.from(fileList).filter((f) => f.type === 'application/pdf')
    if (files.length === 0) {
      flashToast('Pick one or more PDF files')
      return
    }
    setUploading(true)
    try {
      const payload = []
      for (const f of files) {
        const pdf_base64 = await readFileAsBase64(f)
        payload.push({ filename: f.name, size: f.size, pdf_base64 })
      }
      const res = await fetch('/api/recipe-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upload_batch', files: payload }),
      })
      const json = await res.json()
      if (json.batch_id) {
        setActiveBatch(json.batch_id)
        flashToast(`Uploaded ${json.count} files — parsing with AI now…`)
        // Auto-trigger parse
        await parseBatch(json.batch_id)
        loadBatches()
        loadBatch(json.batch_id)
      } else {
        flashToast('Upload failed')
      }
    } catch (err) {
      console.error(err)
      flashToast('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const parseBatch = async (batchId: string) => {
    setParsing(true)
    try {
      const res = await fetch('/api/recipe-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'parse_batch', batch_id: batchId }),
      })
      const json = await res.json()
      if (json.parsed != null) {
        flashToast(`Parsed ${json.parsed} ready · ${json.needs_review} review · ${json.failed} failed`)
      } else if (json.error) {
        flashToast(json.error)
      }
      loadBatch(batchId)
      loadBatches()
    } finally {
      setParsing(false)
    }
  }

  const importItem = async (item: StagingItem) => {
    const res = await fetch('/api/recipe-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'import_item', id: item.id }),
    })
    const json = await res.json()
    if (json.ok) flashToast(`Imported "${item.parsed_data?.name}"`)
    else flashToast('Import failed')
    if (activeBatch) loadBatch(activeBatch)
    loadBatches()
  }

  const importAllReady = async () => {
    const ready = items.filter((i) => i.status === 'parsed')
    if (ready.length === 0) return
    if (!confirm(`Import ${ready.length} recipes into the meal library?`)) return
    for (const item of ready) {
      await fetch('/api/recipe-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import_item', id: item.id }),
      })
    }
    flashToast(`Imported ${ready.length} recipes`)
    if (activeBatch) loadBatch(activeBatch)
    loadBatches()
  }

  const skipItem = async (item: StagingItem) => {
    await fetch('/api/recipe-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'skip_item', id: item.id }),
    })
    if (activeBatch) loadBatch(activeBatch)
  }

  const deleteBatch = async () => {
    if (!activeBatch) return
    if (!confirm('Delete this entire batch? (Non-imported items will be removed)')) return
    await fetch('/api/recipe-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_batch', batch_id: activeBatch }),
    })
    setActiveBatch(null)
    setItems([])
    loadBatches()
  }

  const startEdit = (item: StagingItem) => {
    if (!item.parsed_data) return
    setEditingId(item.id)
    setEditDraft(JSON.parse(JSON.stringify(item.parsed_data)))
  }

  const saveEdit = async () => {
    if (!editingId || !editDraft) return
    await fetch('/api/recipe-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_item', id: editingId, parsed_data: editDraft }),
    })
    flashToast('Saved changes')
    setEditingId(null)
    setEditDraft(null)
    if (activeBatch) loadBatch(activeBatch)
  }

  const counts = {
    total: items.length,
    ready: items.filter((i) => i.status === 'parsed').length,
    review: items.filter((i) => i.status === 'needs_review').length,
    failed: items.filter((i) => i.status === 'failed').length,
    imported: items.filter((i) => i.status === 'imported').length,
    skipped: items.filter((i) => i.status === 'skipped').length,
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
            <ChefHat className="w-5 h-5 text-emerald-600" />
            Recipe Import
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Scan paper recipes → upload PDFs → AI parses + categorizes → review → import into meal library
          </p>
        </div>
      </div>

      {/* Upload row */}
      <label className={`block rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
        uploading ? 'border-blue-300 bg-blue-50/50' : 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-400'
      }`}>
        <input
          type="file"
          accept="application/pdf"
          multiple
          disabled={uploading || parsing}
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-2">
          {uploading ? (
            <>
              <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
              <p className="text-sm font-semibold text-blue-700">Uploading…</p>
            </>
          ) : parsing ? (
            <>
              <Sparkles className="w-10 h-10 text-purple-500 animate-pulse" />
              <p className="text-sm font-semibold text-purple-700">Claude is parsing the recipes…</p>
              <p className="text-xs text-purple-500">This can take a minute for a big batch</p>
            </>
          ) : (
            <>
              <Upload className="w-10 h-10 text-emerald-400" />
              <p className="text-sm font-semibold text-emerald-700">Tap to choose PDF files</p>
              <p className="text-xs text-emerald-600">Up to 50 recipes per batch · 8MB per file</p>
            </>
          )}
        </div>
      </label>

      {/* Batch selector */}
      {batches.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-semibold text-gray-500 flex-shrink-0">Batches:</span>
          {batches.map((b) => {
            const isActive = activeBatch === b.batch_id
            const date = new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            return (
              <button
                key={b.batch_id}
                onClick={() => setActiveBatch(b.batch_id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {date} · {b.total} recipe{b.total !== 1 ? 's' : ''}
              </button>
            )
          })}
        </div>
      )}

      {/* Batch summary */}
      {activeBatch && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="font-semibold text-gray-700">Batch totals:</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-full">
              ✓ {counts.ready} ready
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full">
              ⚠ {counts.review} needs review
            </span>
            {counts.failed > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 rounded-full">
                ✗ {counts.failed} failed
              </span>
            )}
            {counts.imported > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                ✓ {counts.imported} imported
              </span>
            )}
            <div className="ml-auto flex gap-2">
              {counts.ready > 0 && (
                <button
                  onClick={importAllReady}
                  className="inline-flex items-center gap-1 bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-emerald-700"
                >
                  <Import className="w-3.5 h-3.5" /> Import All Ready ({counts.ready})
                </button>
              )}
              <button
                onClick={deleteBatch}
                className="inline-flex items-center gap-1 text-gray-500 hover:text-red-600 text-xs px-2 py-1.5 rounded-lg hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Item list */}
          {loading ? (
            <div className="text-center py-8 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">No recipes in this batch.</p>
          ) : (
            <div className="space-y-1.5">
              {items.map((item) => {
                const meta = STATUS_META[item.status]
                const StatusIcon = meta.icon
                const p = item.parsed_data
                const expanded = expandedId === item.id
                const isEditing = editingId === item.id
                const conf = item.confidence != null ? Number(item.confidence) : null
                return (
                  <div key={item.id} className="rounded-lg border border-gray-200 bg-gray-50/40">
                    <button
                      onClick={() => setExpandedId(expanded ? null : item.id)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-white"
                    >
                      {expanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                      <StatusIcon className={`w-4 h-4 ${meta.color.split(' ')[1]}`} />
                      <div className="flex-1 min-w-0 text-left">
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {p?.name || item.original_filename || '(unknown)'}
                        </div>
                        <div className="text-[11px] text-gray-500 truncate">
                          {p ? `${p.meal_type}${p.theme_match !== 'none' ? ` · ${p.theme_match}` : ''}${p.kid_manager_fit ? ` · ${p.kid_manager_fit}` : ''}` : item.original_filename}
                          {conf != null && ` · ${Math.round(conf * 100)}%`}
                        </div>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${meta.color}`}>
                        {meta.label}
                      </span>
                    </button>

                    {expanded && p && !isEditing && (
                      <div className="border-t border-gray-100 bg-white p-3 space-y-2 text-xs">
                        {p.description && <p className="text-gray-700 italic">"{p.description}"</p>}
                        {p.has_mushrooms && (
                          <div className="rounded bg-red-50 border border-red-200 text-red-700 px-2 py-1 font-semibold">
                            ⚠️ Contains mushrooms — Moses family hard no
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2 text-gray-600">
                          {p.prep_time_min != null && <div><span className="font-semibold">Prep:</span> {p.prep_time_min}m</div>}
                          {p.cook_time_min != null && <div><span className="font-semibold">Cook:</span> {p.cook_time_min}m</div>}
                          {p.servings != null && <div><span className="font-semibold">Servings:</span> {p.servings}</div>}
                          {p.difficulty && <div><span className="font-semibold">Difficulty:</span> {p.difficulty}</div>}
                          {p.season && <div><span className="font-semibold">Season:</span> {p.season}</div>}
                          {p.source && <div><span className="font-semibold">Source:</span> {p.source}</div>}
                        </div>
                        {p.ingredients?.length > 0 && (
                          <div>
                            <div className="font-semibold text-gray-700 mb-0.5">Ingredients ({p.ingredients.length}):</div>
                            <ul className="text-gray-600 pl-3 list-disc space-y-0.5">
                              {p.ingredients.slice(0, 6).map((ing, i) => (
                                <li key={i}>{ing.amount ? `${ing.amount} ` : ''}{ing.item}{ing.notes ? ` (${ing.notes})` : ''}</li>
                              ))}
                              {p.ingredients.length > 6 && <li className="text-gray-400">…{p.ingredients.length - 6} more</li>}
                            </ul>
                          </div>
                        )}
                        {p.instructions?.length > 0 && (
                          <div>
                            <div className="font-semibold text-gray-700 mb-0.5">Instructions ({p.instructions.length} steps)</div>
                          </div>
                        )}
                        {p.sides_starch_options?.length > 0 && (
                          <div>
                            <span className="font-semibold text-gray-700">Sides:</span>{' '}
                            <span className="text-gray-600">{[...p.sides_starch_options, ...p.sides_veggie_options].join(', ')}</span>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-100">
                          {(item.status === 'parsed' || item.status === 'needs_review') && (
                            <>
                              <button
                                onClick={() => importItem(item)}
                                className="inline-flex items-center gap-1 bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-emerald-700"
                              >
                                <Import className="w-3 h-3" /> Import
                              </button>
                              <button
                                onClick={() => startEdit(item)}
                                className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-200"
                              >
                                <Edit3 className="w-3 h-3" /> Edit
                              </button>
                              <button
                                onClick={() => skipItem(item)}
                                className="inline-flex items-center gap-1 text-red-600 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-50"
                              >
                                <X className="w-3 h-3" /> Skip
                              </button>
                            </>
                          )}
                          {item.status === 'imported' && (
                            <span className="text-blue-600 text-xs font-semibold">✓ Imported to meal library</span>
                          )}
                          {item.status === 'failed' && item.error_message && (
                            <span className="text-red-600 text-xs italic">{item.error_message}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {expanded && isEditing && editDraft && (
                      <div className="border-t border-gray-100 bg-white p-3 space-y-2 text-xs">
                        <div>
                          <label className="font-semibold text-gray-700">Name</label>
                          <input
                            value={editDraft.name}
                            onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                            className="w-full mt-0.5 px-2 py-1 border border-gray-200 rounded text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="font-semibold text-gray-700">Type</label>
                            <select
                              value={editDraft.meal_type}
                              onChange={(e) => setEditDraft({ ...editDraft, meal_type: e.target.value })}
                              className="w-full mt-0.5 px-2 py-1 border border-gray-200 rounded text-sm bg-white"
                            >
                              {['breakfast','lunch','dinner','side','dessert','drink','snack','sauce'].map(t => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="font-semibold text-gray-700">Theme</label>
                            <select
                              value={editDraft.theme_match}
                              onChange={(e) => setEditDraft({ ...editDraft, theme_match: e.target.value })}
                              className="w-full mt-0.5 px-2 py-1 border border-gray-200 rounded text-sm bg-white"
                            >
                              {['american','asian','mexican','italian','soup','grill','comfort','brunch','experiment','none'].map(t => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="font-semibold text-gray-700">Season</label>
                            <select
                              value={editDraft.season}
                              onChange={(e) => setEditDraft({ ...editDraft, season: e.target.value })}
                              className="w-full mt-0.5 px-2 py-1 border border-gray-200 rounded text-sm bg-white"
                            >
                              {['year-round','spring-summer','fall-winter'].map(t => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="font-semibold text-gray-700">Description</label>
                          <textarea
                            value={editDraft.description}
                            onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })}
                            rows={2}
                            className="w-full mt-0.5 px-2 py-1 border border-gray-200 rounded text-sm"
                          />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={saveEdit}
                            className="inline-flex items-center gap-1 bg-blue-600 text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-700"
                          >
                            <Save className="w-3 h-3" /> Save
                          </button>
                          <button
                            onClick={() => { setEditingId(null); setEditDraft(null) }}
                            className="text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-100"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {batches.length === 0 && !uploading && (
        <div className="text-center py-12 text-gray-400">
          <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No recipe batches yet.</p>
          <p className="text-xs mt-1">Scan paper recipes with your phone, save as PDF, upload here.</p>
        </div>
      )}
    </div>
  )
}
