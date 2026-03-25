'use client'

import { useState, useEffect } from 'react'
import { Send } from 'lucide-react'

type Category = 'subject_idea' | 'interest' | 'supply_needed' | 'ran_out_of'

const CATEGORIES: { id: Category; emoji: string; label: string; placeholder: string }[] = [
  { id: 'subject_idea', emoji: '📚', label: 'Subject Idea', placeholder: 'What would you like to learn about?' },
  { id: 'interest', emoji: '⭐', label: 'Interest', placeholder: 'What are you into right now?' },
  { id: 'supply_needed', emoji: '🛒', label: 'Need a Supply', placeholder: 'What do you need for school or a hobby?' },
  { id: 'ran_out_of', emoji: '📦', label: 'Ran Out Of', placeholder: 'What did you run out of?' },
]

const CATEGORY_EMOJI: Record<string, string> = {
  subject_idea: '📚', interest: '⭐', supply_needed: '🛒', ran_out_of: '📦',
}

interface Note {
  id: string
  category: string
  note: string
  created_at: string
}

export default function KidSchoolNotesCard({ childName }: { childName: string }) {
  const [category, setCategory] = useState<Category>('subject_idea')
  const [note, setNote] = useState('')
  const [notes, setNotes] = useState<Note[]>([])
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  const childKey = childName.toLowerCase()

  useEffect(() => {
    fetch(`/api/kids/school-notes?kid=${childKey}`)
      .then(r => r.json())
      .then(data => setNotes(data.notes || []))
      .catch(() => {})
  }, [childKey])

  const submit = async () => {
    if (!note.trim() || sending) return
    setSending(true)
    try {
      await fetch('/api/kids/school-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_note', kid_name: childKey, category, note: note.trim() })
      })
      setNotes(prev => [{ id: crypto.randomUUID(), category, note: note.trim(), created_at: new Date().toISOString() }, ...prev])
      setNote('')
      setSent(true)
      setTimeout(() => setSent(false), 3000)
    } catch {
      // silent
    } finally {
      setSending(false)
    }
  }

  const selected = CATEGORIES.find(c => c.id === category)!

  return (
    <div className="bg-white p-5 rounded-lg border shadow-sm">
      <h2 className="text-lg font-bold mb-4">My Ideas & Needs</h2>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2 mb-3">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              category === cat.id
                ? 'bg-teal-100 text-teal-800 border-2 border-teal-400'
                : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
            }`}
          >
            {cat.emoji} {cat.label}
          </button>
        ))}
      </div>

      {/* Input */}
      {sent ? (
        <div className="p-3 bg-green-50 rounded-lg text-center mb-3">
          <p className="text-green-700 font-medium text-sm">Got it! Mom will see it</p>
        </div>
      ) : (
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value.substring(0, 200))}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder={selected.placeholder}
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
          />
          <button
            onClick={submit}
            disabled={!note.trim() || sending}
            className="bg-teal-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-teal-600 disabled:opacity-50 flex items-center gap-1"
          >
            <Send className="w-3.5 h-3.5" /> Submit
          </button>
        </div>
      )}

      {/* Recent notes */}
      {notes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {notes.slice(0, 5).map(n => (
            <span key={n.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-full text-xs text-gray-700">
              {CATEGORY_EMOJI[n.category] || '📝'} {n.note}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
