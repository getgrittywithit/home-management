'use client'
import { useState, useEffect } from 'react'
import { X, Zap } from 'lucide-react'

interface Props { open: boolean; onClose: () => void; onPosted: () => void }

export default function PostGreenlightModal({ open, onClose, onPosted }: Props) {
  const [text, setText] = useState('')
  const [active, setActive] = useState<{ id: number; message: string; created_at: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/kids/messages?action=get_active_greenlight')
      .then(r => r.json())
      .then(data => { setActive(data.greenlight || null); setText(''); setLoading(false) })
      .catch(() => setLoading(false))
  }, [open])

  const postGreenlight = async () => {
    if (!text.trim()) return
    setSubmitting(true)
    try {
      await fetch('/api/kids/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'post_greenlight', message: text.trim().substring(0, 200) })
      })
      onPosted()
      onClose()
    } catch {} finally { setSubmitting(false) }
  }

  const deactivateGreenlight = async () => {
    setSubmitting(true)
    try {
      await fetch('/api/kids/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deactivate_greenlight' })
      })
      onPosted()
      onClose()
    } catch {} finally { setSubmitting(false) }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            <h3 className="text-lg font-bold text-gray-900">Family Alert</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
            </div>
          ) : active ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-medium text-green-800 mb-1">Active Alert</p>
                <p className="text-green-700">{active.message}</p>
                <p className="text-xs text-green-500 mt-2">{new Date(active.created_at).toLocaleString()}</p>
              </div>
              <button
                onClick={deactivateGreenlight}
                disabled={submitting}
                className="w-full py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-50"
              >
                {submitting ? 'Deactivating...' : 'Deactivate Alert'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alert Message</label>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  maxLength={200}
                  rows={3}
                  placeholder="Post a family alert..."
                  className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">{text.length}/200</p>
              </div>
              <button
                onClick={postGreenlight}
                disabled={!text.trim() || submitting}
                className="w-full py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50"
              >
                {submitting ? 'Posting...' : 'Post Family Alert'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
