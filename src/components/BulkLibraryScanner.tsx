'use client'

import { useState } from 'react'
import { X, BookOpen, CheckCircle, Keyboard, Camera, Loader2, Trash2 } from 'lucide-react'
import BarcodeScanner from './BarcodeScanner'

interface BulkItem {
  tempId: string
  isbn: string
  title: string
  author_or_publisher: string | null
  description?: string | null
  cover_image_url?: string | null
  subject_tags?: string[]
}

type Mode = 'choose' | 'scan' | 'paste' | 'review'

const ALL_KIDS = ['amos', 'zoey', 'kaylee', 'ellie', 'wyatt', 'hannah']

export default function BulkLibraryScanner({
  onClose,
  onComplete,
}: {
  onClose: () => void
  onComplete?: (added: number, skipped: number) => void
}) {
  const [mode, setMode] = useState<Mode>('choose')
  const [items, setItems] = useState<BulkItem[]>([])
  const [recentToast, setRecentToast] = useState<string | null>(null)
  const [pasteText, setPasteText] = useState('')
  const [pasteProgress, setPasteProgress] = useState<{ done: number; total: number } | null>(null)
  const [assignKid, setAssignKid] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitProgress, setSubmitProgress] = useState(0)
  const [resultMsg, setResultMsg] = useState<string | null>(null)

  const flashToast = (msg: string) => {
    setRecentToast(msg)
    setTimeout(() => setRecentToast((m) => (m === msg ? null : m)), 2000)
  }

  const lookupAndAdd = async (isbn: string): Promise<BulkItem | null> => {
    const clean = isbn.replace(/[^0-9Xx]/g, '')
    if (!clean) return null
    // Client dedup
    if (items.some((i) => i.isbn === clean)) {
      flashToast(`Already in list: ${clean}`)
      return null
    }
    try {
      const res = await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'lookup_barcode', barcode: clean, barcode_type: 'isbn' }),
      })
      const json = await res.json()
      if (json.found && json.item?.title) {
        const entry: BulkItem = {
          tempId: `${clean}-${Date.now()}`,
          isbn: clean,
          title: json.item.title,
          author_or_publisher: json.item.author_or_publisher || null,
          description: json.item.description || null,
          cover_image_url: json.item.cover_image_url || null,
          subject_tags: json.item.subject_tags || [],
        }
        setItems((prev) => [entry, ...prev])
        flashToast(`✓ ${entry.title}`)
        return entry
      }
      flashToast(`Not found: ${clean}`)
    } catch (err) {
      flashToast(`Lookup failed: ${clean}`)
    }
    return null
  }

  const handleScan = async (code: string) => {
    // Kick off lookup; debounce in BarcodeScanner (3s) prevents flood per code
    await lookupAndAdd(code)
  }

  const handlePasteLookup = async () => {
    const codes = pasteText.split(/[\n,\s]+/).map((s) => s.trim()).filter(Boolean)
    if (codes.length === 0) return
    setPasteProgress({ done: 0, total: codes.length })
    for (let i = 0; i < codes.length; i++) {
      await lookupAndAdd(codes[i])
      setPasteProgress({ done: i + 1, total: codes.length })
    }
    setPasteProgress(null)
    setPasteText('')
    setMode('review')
  }

  const removeItem = (tempId: string) => {
    setItems((prev) => prev.filter((i) => i.tempId !== tempId))
  }

  const handleSubmitAll = async () => {
    if (items.length === 0) return
    setSubmitting(true)
    setSubmitProgress(0)
    try {
      const payload = items.map((i) => ({
        item_type: 'book',
        title: i.title,
        author_or_publisher: i.author_or_publisher,
        isbn: i.isbn,
        description: i.description,
        cover_image_url: i.cover_image_url,
        subject_tags: i.subject_tags,
        condition: 'good',
        who_uses: assignKid ? [assignKid] : [],
      }))

      // Optimistic progress tween
      const tween = setInterval(() => {
        setSubmitProgress((p) => Math.min(p + 8, 90))
      }, 120)

      const res = await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bulk_add_items', items: payload }),
      })
      clearInterval(tween)
      setSubmitProgress(100)

      const json = await res.json()
      const added = json.items_added || 0
      const skipped = json.items_skipped || 0
      setResultMsg(
        skipped > 0
          ? `Added ${added} book${added !== 1 ? 's' : ''} · ${skipped} skipped (already in library)`
          : `Added ${added} book${added !== 1 ? 's' : ''} to the library`
      )
      onComplete?.(added, skipped)
      setTimeout(() => {
        setItems([])
        setSubmitting(false)
        setSubmitProgress(0)
        setResultMsg(null)
        onClose()
      }, 1800)
    } catch (err) {
      console.error('bulk_add_items failed', err)
      setSubmitting(false)
      setSubmitProgress(0)
      setResultMsg('Bulk add failed — please try again')
    }
  }

  // Scan mode uses the BarcodeScanner directly as its own overlay
  if (mode === 'scan') {
    return (
      <BarcodeScanner
        continuous
        title="Bulk Scan"
        onScan={handleScan}
        onClose={() => setMode(items.length > 0 ? 'review' : 'choose')}
        footerSlot={
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-gray-900">
                  {items.length} book{items.length !== 1 ? 's' : ''} scanned
                </span>
              </div>
              <button
                onClick={() => setMode('review')}
                disabled={items.length === 0}
                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300"
              >
                Done — Review
              </button>
            </div>
            {recentToast && (
              <div className="text-xs text-center text-green-700 bg-green-50 rounded px-2 py-1 border border-green-200">
                {recentToast}
              </div>
            )}
          </div>
        }
      />
    )
  }

  // Modal wrapper for all other modes
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">
              {mode === 'choose' && 'Bulk Add Books'}
              {mode === 'paste' && 'Paste ISBNs'}
              {mode === 'review' && `Review (${items.length})`}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {mode === 'choose' && (
            <div className="p-5 space-y-3">
              <p className="text-sm text-gray-600 mb-2">
                Add many books at once by scanning their barcodes continuously or pasting a list of ISBNs.
              </p>
              <button
                onClick={() => setMode('scan')}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50/40 transition-all active:scale-[0.99]"
              >
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Camera className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-gray-900">Scan with Camera</div>
                  <div className="text-xs text-gray-500">Continuous mode — keep scanning book after book</div>
                </div>
              </button>
              <button
                onClick={() => setMode('paste')}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all active:scale-[0.99]"
              >
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <Keyboard className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-gray-900">Paste ISBNs</div>
                  <div className="text-xs text-gray-500">For books without scannable barcodes</div>
                </div>
              </button>
              {items.length > 0 && (
                <button
                  onClick={() => setMode('review')}
                  className="w-full mt-2 py-3 rounded-xl border border-green-200 bg-green-50 text-green-800 font-semibold text-sm hover:bg-green-100"
                >
                  Review {items.length} pending book{items.length !== 1 ? 's' : ''} →
                </button>
              )}
            </div>
          )}

          {mode === 'paste' && (
            <div className="p-5 space-y-3">
              <label className="text-xs font-semibold text-gray-700">
                Paste ISBNs (one per line, or comma-separated)
              </label>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={8}
                placeholder={'9780590353403\n9780439023528\n9780064404990'}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:border-blue-400 focus:outline-none"
              />
              {pasteProgress && (
                <div>
                  <div className="text-xs text-gray-600 mb-1">
                    Looking up… {pasteProgress.done} / {pasteProgress.total}
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${(pasteProgress.done / pasteProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handlePasteLookup}
                  disabled={!pasteText.trim() || !!pasteProgress}
                  className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {pasteProgress ? 'Looking up…' : 'Look Up All'}
                </button>
                <button
                  onClick={() => setMode('choose')}
                  className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {mode === 'review' && (
            <div className="p-5 space-y-3">
              {items.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500">No books yet.</p>
                  <button
                    onClick={() => setMode('choose')}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Start scanning →
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Assign to a kid (optional)</label>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setAssignKid(null)}
                        className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
                          !assignKid ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        No assignment
                      </button>
                      {ALL_KIDS.map((k) => (
                        <button
                          key={k}
                          onClick={() => setAssignKid(k)}
                          className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
                            assignKid === k ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {k}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
                    {items.map((it) => (
                      <div key={it.tempId} className="flex items-center gap-3 p-2.5">
                        {it.cover_image_url ? (
                          <img
                            src={it.cover_image_url}
                            alt={it.title}
                            className="w-10 h-14 object-cover rounded flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-14 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <BookOpen className="w-5 h-5 text-gray-300" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 line-clamp-1">{it.title}</div>
                          {it.author_or_publisher && (
                            <div className="text-xs text-gray-500 line-clamp-1">{it.author_or_publisher}</div>
                          )}
                          <div className="text-[10px] text-gray-400 font-mono">{it.isbn}</div>
                        </div>
                        <button
                          onClick={() => removeItem(it.tempId)}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 flex-shrink-0"
                          aria-label="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        {mode === 'review' && items.length > 0 && (
          <div className="border-t border-gray-100 p-4 space-y-2">
            {submitting && (
              <div>
                <div className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Adding to library…
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 transition-all" style={{ width: `${submitProgress}%` }} />
                </div>
              </div>
            )}
            {resultMsg && !submitting && (
              <div className="text-xs text-center text-green-700 bg-green-50 rounded px-2 py-1.5 border border-green-200 flex items-center justify-center gap-1">
                <CheckCircle className="w-3 h-3" /> {resultMsg}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setMode('scan')}
                disabled={submitting}
                className="px-4 py-2.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
              >
                + Scan More
              </button>
              <button
                onClick={handleSubmitAll}
                disabled={submitting}
                className="flex-1 bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
              >
                Add All to Library ({items.length})
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
