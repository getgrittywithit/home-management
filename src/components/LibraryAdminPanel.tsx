'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Tag, Save, Search, BarChart2 } from 'lucide-react'

export default function LibraryAdminPanel() {
  const [books, setBooks] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'tag' | 'stats'>('tag')
  const [edits, setEdits] = useState<Record<number, any>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/library/books?limit=100').then(r => r.json()).then(d => setBooks(d.books || [])).catch(() => {})
  }, [])

  const filtered = books.filter(b => !search || b.title?.toLowerCase().includes(search.toLowerCase()) || b.author?.toLowerCase().includes(search.toLowerCase()))

  const updateField = (bookId: number, field: string, value: any) => {
    setEdits(prev => ({ ...prev, [bookId]: { ...(prev[bookId] || {}), id: bookId, [field]: value } }))
  }

  const saveAll = async () => {
    const changes = Object.values(edits).filter(e => e.id)
    if (changes.length === 0) return
    setSaving(true)
    await fetch('/api/library/books', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'bulk_tag', books: changes }),
    }).catch(() => {})
    setSaving(false)
    setEdits({})
  }

  const untagged = books.filter(b => !b.reading_grade_equivalent).length
  const tagged = books.length - untagged
  const withPrompts = books.filter(b => b.has_bookbuddy_prompts).length

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white p-5 rounded-xl">
        <h2 className="text-xl font-bold flex items-center gap-2"><BookOpen className="w-6 h-6" /> Library Admin</h2>
        <p className="text-purple-200 text-sm mt-1">{books.length} books · {tagged} tagged · {untagged} need tagging</p>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab('tag')} className={`px-3 py-1.5 rounded-full text-xs font-medium ${tab === 'tag' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
          <Tag className="w-3 h-3 inline mr-1" />Tag Books
        </button>
        <button onClick={() => setTab('stats')} className={`px-3 py-1.5 rounded-full text-xs font-medium ${tab === 'stats' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
          <BarChart2 className="w-3 h-3 inline mr-1" />Stats
        </button>
      </div>

      {tab === 'tag' && (
        <div className="bg-white rounded-xl border p-4">
          <div className="flex gap-2 mb-3">
            <div className="flex-1 relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search books..."
                className="w-full border rounded-lg pl-8 pr-3 py-1.5 text-xs" />
            </div>
            <button onClick={saveAll} disabled={Object.keys(edits).length === 0 || saving}
              className="bg-purple-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 flex items-center gap-1">
              <Save className="w-3 h-3" /> {saving ? 'Saving...' : `Save (${Object.keys(edits).length})`}
            </button>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-[10px]">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  <th className="text-left py-1.5 px-1">Title</th>
                  <th className="text-left py-1.5 px-1 w-16">Grade</th>
                  <th className="text-left py-1.5 px-1 w-16">Lexile</th>
                  <th className="text-left py-1.5 px-1 w-20">Genre</th>
                  <th className="text-left py-1.5 px-1 w-32">Interest Tags</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 50).map(b => (
                  <tr key={b.id} className="border-t border-gray-100">
                    <td className="py-1 px-1">
                      <p className="font-medium text-gray-900 truncate max-w-[200px]">{b.title}</p>
                      <p className="text-gray-400">{b.author}</p>
                    </td>
                    <td className="py-1 px-1">
                      <input defaultValue={b.reading_grade_equivalent || ''} placeholder="e.g. 3.0"
                        className="w-14 border rounded px-1 py-0.5"
                        onBlur={e => e.target.value !== (b.reading_grade_equivalent || '') && updateField(b.id, 'reading_grade_equivalent', e.target.value)} />
                    </td>
                    <td className="py-1 px-1">
                      <input type="number" defaultValue={b.lexile_level || ''} placeholder="450"
                        className="w-14 border rounded px-1 py-0.5"
                        onBlur={e => updateField(b.id, 'lexile_level', parseInt(e.target.value) || null)} />
                    </td>
                    <td className="py-1 px-1">
                      <select defaultValue={b.genre || ''} className="w-full border rounded px-1 py-0.5"
                        onChange={e => updateField(b.id, 'genre', e.target.value)}>
                        <option value="">—</option>
                        <option>fiction</option><option>nonfiction</option><option>biography</option>
                        <option>science</option><option>history</option><option>poetry</option><option>graphic_novel</option>
                      </select>
                    </td>
                    <td className="py-1 px-1">
                      <input defaultValue={(b.interest_tags || []).join(', ')} placeholder="tag1, tag2"
                        className="w-full border rounded px-1 py-0.5"
                        onBlur={e => updateField(b.id, 'interest_tags', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'stats' && (
        <div className="bg-white rounded-xl border p-4 space-y-3">
          <h3 className="font-semibold text-sm text-gray-900">Library Statistics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-purple-700">{books.length}</p>
              <p className="text-[10px] text-purple-500">Total Books</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{tagged}</p>
              <p className="text-[10px] text-green-500">Tagged</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-amber-700">{untagged}</p>
              <p className="text-[10px] text-amber-500">Need Tagging</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-700">{withPrompts}</p>
              <p className="text-[10px] text-blue-500">With Prompts</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
