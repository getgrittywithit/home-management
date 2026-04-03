'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Gamepad2, Puzzle, Camera, Loader2, Send, Check, Clock, X } from 'lucide-react'
import BarcodeScanner, { useCameraAvailable } from './BarcodeScanner'

interface Submission {
  id: number
  item_type: string
  title: string
  author_or_publisher: string | null
  reason: string | null
  status: string
  parent_note: string | null
  created_at: string
}

const TYPE_OPTIONS = [
  { value: 'book', label: 'Book', icon: BookOpen, color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'game', label: 'Game', icon: Gamepad2, color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { value: 'toy', label: 'Toy', icon: Puzzle, color: 'bg-pink-100 text-pink-700 border-pink-300' },
  { value: 'resource', label: 'Resource', icon: BookOpen, color: 'bg-green-100 text-green-700 border-green-300' },
]

export default function KidLibrarySubmit({ kidName }: { kidName: string }) {
  const [showForm, setShowForm] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const cameraAvailable = useCameraAvailable()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const [itemType, setItemType] = useState('book')
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [isbnUpc, setIsbnUpc] = useState('')
  const [reason, setReason] = useState('')

  useEffect(() => { loadSubmissions() }, [])

  const loadSubmissions = async () => {
    try {
      const res = await fetch(`/api/library?action=get_my_submissions&kid_name=${encodeURIComponent(kidName.toLowerCase())}`)
      const data = await res.json()
      setSubmissions(data.submissions || [])
    } catch {}
  }

  const lookupBarcode = async (code: string) => {
    setLookupLoading(true)
    try {
      const res = await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'lookup_barcode', barcode: code }),
      })
      const data = await res.json()
      if (data.found && data.item) {
        setTitle(data.item.title || '')
        setAuthor(data.item.author_or_publisher || '')
        setToast('Found it!')
        setTimeout(() => setToast(null), 2000)
      } else {
        setToast('Not found — type the info manually')
        setTimeout(() => setToast(null), 3000)
      }
    } catch {}
    setLookupLoading(false)
  }

  const handleScan = (code: string) => {
    setShowScanner(false)
    setIsbnUpc(code)
    lookupBarcode(code)
  }

  const handleSubmit = async () => {
    if (!title.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_item',
          kid_name: kidName.toLowerCase(),
          item_type: itemType,
          title: title.trim(),
          author_or_publisher: author.trim() || null,
          isbn_upc: isbnUpc.trim() || null,
          reason: reason.trim() || null,
        }),
      })
      if (res.ok) {
        resetForm()
        setShowForm(false)
        loadSubmissions()
        setToast('Suggestion sent to Mom!')
        setTimeout(() => setToast(null), 3000)
      }
    } catch {}
    setSubmitting(false)
  }

  const resetForm = () => {
    setItemType('book')
    setTitle('')
    setAuthor('')
    setIsbnUpc('')
    setReason('')
  }

  const pendingSubs = submissions.filter(s => s.status === 'pending')
  const approvedSubs = submissions.filter(s => s.status === 'approved')
  const rejectedSubs = submissions.filter(s => s.status === 'rejected')

  return (
    <div className="space-y-3">
      {/* Suggest button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg p-3 text-sm font-medium text-emerald-700 flex items-center justify-center gap-2 transition-colors"
        >
          <Send className="w-4 h-4" /> I Found Something Cool
        </button>
      )}

      {/* Submission form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-gray-900">Suggest an Item</h4>
            <button onClick={() => { setShowForm(false); resetForm() }} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Type selection */}
          <div className="grid grid-cols-4 gap-2">
            {TYPE_OPTIONS.map(opt => {
              const Icon = opt.icon
              return (
                <button
                  key={opt.value}
                  onClick={() => setItemType(opt.value)}
                  className={`p-2 rounded-lg border text-center text-xs font-medium transition-all ${
                    itemType === opt.value ? opt.color + ' border-2' : 'bg-gray-50 text-gray-500 border-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4 mx-auto mb-1" />
                  {opt.label}
                </button>
              )
            })}
          </div>

          {/* Scan / ISBN */}
          <div className="flex gap-2">
            <input
              type="text"
              value={isbnUpc}
              onChange={e => setIsbnUpc(e.target.value)}
              placeholder="ISBN or barcode number"
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
            />
            {cameraAvailable !== false && (
              <button onClick={() => setShowScanner(true)} className="bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-200 flex items-center gap-1">
                <Camera className="w-4 h-4" /> Scan
              </button>
            )}
            {isbnUpc && !lookupLoading && (
              <button onClick={() => lookupBarcode(isbnUpc)} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700">
                Look Up
              </button>
            )}
            {lookupLoading && <Loader2 className="w-5 h-5 animate-spin text-blue-500 self-center" />}
          </div>

          {/* Title + Author */}
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title *"
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={author}
            onChange={e => setAuthor(e.target.value)}
            placeholder="Author or creator (optional)"
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />

          {/* Reason */}
          <input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Why I want this / where I found it (optional)"
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />

          {/* Submit */}
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowForm(false); resetForm() }} className="text-sm text-gray-500 px-4 py-2">Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !title.trim()}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? 'Sending...' : 'Suggest to Mom'}
            </button>
          </div>
        </div>
      )}

      {/* My Submissions */}
      {submissions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-600">My Suggestions</h4>
          {pendingSubs.map(s => (
            <div key={s.id} className="flex items-center gap-2 bg-amber-50 rounded-lg p-2 text-sm">
              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="flex-1 text-gray-700">{s.title}</span>
              <span className="text-xs text-amber-600 font-medium">Waiting for Mom</span>
            </div>
          ))}
          {approvedSubs.map(s => (
            <div key={s.id} className="flex items-center gap-2 bg-green-50 rounded-lg p-2 text-sm">
              <Check className="w-4 h-4 text-green-500 shrink-0" />
              <span className="flex-1 text-gray-700">{s.title}</span>
              <span className="text-xs text-green-600 font-medium">Added to Library!</span>
            </div>
          ))}
          {rejectedSubs.map(s => (
            <div key={s.id} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 text-sm">
              <X className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="flex-1 text-gray-700">{s.title}</span>
              {s.parent_note && <span className="text-xs text-gray-500 italic">{s.parent_note}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Scanner modal */}
      {showScanner && <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg z-50 text-sm">
          {toast}
        </div>
      )}
    </div>
  )
}
