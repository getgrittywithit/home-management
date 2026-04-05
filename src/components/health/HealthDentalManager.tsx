'use client'

import { useState } from 'react'
import { Plus, Trash2, CheckCircle } from 'lucide-react'

interface HealthDentalManagerProps {
  overview: any
  onRefresh: () => void
  onError: (msg: string) => void
}

export default function HealthDentalManager({ overview, onRefresh, onError }: HealthDentalManagerProps) {
  const [noteForm, setNoteForm] = useState({ child: '', note: '' })
  const [showNoteForm, setShowNoteForm] = useState(false)
  const KIDS = ['amos', 'zoey', 'kaylee', 'ellie', 'wyatt', 'hannah']

  const byKid: Record<string, any[]> = {}
  overview.items?.forEach((item: any) => {
    if (!byKid[item.child_name]) byKid[item.child_name] = []
    byKid[item.child_name].push(item)
  })

  const streakMap: Record<string, any> = {}
  overview.streaks?.forEach((s: any) => { streakMap[s.child_name] = s })

  const notesByKid: Record<string, any[]> = {}
  overview.notes?.forEach((n: any) => {
    if (!notesByKid[n.child_name]) notesByKid[n.child_name] = []
    notesByKid[n.child_name].push(n)
  })

  const handleAddNote = async () => {
    if (!noteForm.child || !noteForm.note.trim()) return
    try {
      await fetch('/api/kids/health', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_dental_note', child: noteForm.child, note: noteForm.note }) })
      setNoteForm({ child: '', note: '' }); setShowNoteForm(false); onRefresh()
    } catch { onError('Failed to add dental note') }
  }

  const handleDeleteNote = async (noteId: number) => {
    try {
      await fetch('/api/kids/health', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_dental_note', noteId }) })
      onRefresh()
    } catch { onError('Failed to delete note') }
  }

  const handleToggleItem = async (itemId: number, enabled: boolean) => {
    try {
      await fetch('/api/kids/health', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_dental_items', dentalItemId: itemId, enabled }) })
      onRefresh()
    } catch { onError('Failed to update item') }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">{'\uD83E\uDDB7'} Dental Manager</h3>
        <button onClick={() => setShowNoteForm(!showNoteForm)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-cyan-500 text-white hover:bg-cyan-600 transition">
          <Plus className="w-4 h-4" />Add Note
        </button>
      </div>

      {showNoteForm && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <select value={noteForm.child} onChange={e => setNoteForm(f => ({ ...f, child: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
            <option value="">Select child...</option>
            {KIDS.map(k => <option key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</option>)}
          </select>
          <input type="text" placeholder="Dental note (e.g., 2 cavities filled Jan 2026)" value={noteForm.note}
            onChange={e => setNoteForm(f => ({ ...f, note: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
          <div className="flex gap-2">
            <button onClick={handleAddNote} disabled={!noteForm.child || !noteForm.note.trim()}
              className="flex-1 bg-cyan-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-cyan-600 transition disabled:opacity-50">Add Note</button>
            <button onClick={() => setShowNoteForm(false)}
              className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-400 transition">Cancel</button>
          </div>
        </div>
      )}

      {KIDS.map(kid => {
        const items = byKid[kid] || []
        const streak = streakMap[kid]
        const notes = notesByKid[kid] || []
        const capName = kid.charAt(0).toUpperCase() + kid.slice(1)
        return (
          <div key={kid} className="bg-white rounded-lg p-5 shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900">{capName}</h4>
              {streak && (
                <span className="text-sm">
                  {streak.current_streak > 0 ? `\uD83D\uDD25 ${streak.current_streak}-day streak` : 'No streak yet'}
                  {streak.longest_streak > 0 && streak.longest_streak > streak.current_streak && (
                    <span className="text-xs text-gray-500 ml-1">(best: {streak.longest_streak})</span>
                  )}
                </span>
              )}
            </div>
            {notes.length > 0 && (
              <div className="mb-2 space-y-1">
                {notes.map((n: any) => (
                  <div key={n.id} className="flex items-center justify-between text-sm text-gray-600 bg-cyan-50 rounded px-3 py-1.5 group">
                    <span>{'\uD83D\uDCDD'} {n.note}</span>
                    <button onClick={() => handleDeleteNote(n.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {items.length > 0 ? (
              <div className="space-y-1">
                {items.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-2 text-sm">
                    <button onClick={() => handleToggleItem(item.id, !item.enabled)}
                      className={`w-4 h-4 rounded border flex-shrink-0 ${item.enabled ? 'bg-cyan-500 border-cyan-500' : 'bg-gray-200 border-gray-300'}`}>
                      {item.enabled && <CheckCircle className="w-4 h-4 text-white" />}
                    </button>
                    <span className={item.enabled ? 'text-gray-900' : 'text-gray-400 line-through'}>
                      {item.time_of_day === 'morning' ? '\u2600\uFE0F' : '\uD83C\uDF19'} {item.item_name}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No dental items configured</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
