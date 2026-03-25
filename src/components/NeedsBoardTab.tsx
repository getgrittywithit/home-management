'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart, Check, ClipboardList } from 'lucide-react'

const KID_DISPLAY: Record<string, string> = {
  amos: 'Amos', ellie: 'Ellie', wyatt: 'Wyatt', hannah: 'Hannah', zoey: 'Zoey', kaylee: 'Kaylee'
}
const KID_COLORS: Record<string, string> = {
  amos: 'bg-blue-100 text-blue-700',
  ellie: 'bg-purple-100 text-purple-700',
  wyatt: 'bg-green-100 text-green-700',
  hannah: 'bg-pink-100 text-pink-700',
  zoey: 'bg-amber-100 text-amber-700',
  kaylee: 'bg-teal-100 text-teal-700',
}
const CATEGORY_LABELS: Record<string, { emoji: string; label: string }> = {
  subject_idea: { emoji: '📚', label: 'Subject Idea' },
  interest: { emoji: '⭐', label: 'Interest' },
  supply_needed: { emoji: '🛒', label: 'Supply' },
  ran_out_of: { emoji: '📦', label: 'Ran Out Of' },
}
const ALL_KIDS = ['all', 'amos', 'ellie', 'wyatt', 'hannah', 'zoey', 'kaylee']
const CATEGORY_FILTERS = ['all', 'subject_idea', 'interest', 'supply_needed', 'ran_out_of']

interface Note {
  id: string
  kid_name: string
  category: string
  note: string
  created_at: string
}

export default function NeedsBoardTab() {
  const [shoppingList, setShoppingList] = useState<Note[]>([])
  const [allNotes, setAllNotes] = useState<Note[]>([])
  const [recentCount, setRecentCount] = useState(0)
  const [kidFilter, setKidFilter] = useState('all')
  const [catFilter, setCatFilter] = useState('all')
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = () => {
    Promise.all([
      fetch('/api/kids/school-notes?action=get_shopping_list').then(r => r.json()),
      fetch('/api/kids/school-notes?action=get_all_notes').then(r => r.json()),
    ]).then(([shopData, allData]) => {
      setShoppingList(shopData.items || [])
      setAllNotes(allData.notes || [])
      setRecentCount(allData.recentCount || 0)
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }

  const resolve = async (id: string) => {
    setResolvedIds(prev => new Set(prev).add(id))
    await fetch('/api/kids/school-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resolve_note', id })
    })
  }

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  }

  const filteredNotes = allNotes.filter(n => {
    if (resolvedIds.has(n.id)) return false
    if (kidFilter !== 'all' && n.kid_name !== kidFilter) return false
    if (catFilter !== 'all' && n.category !== catFilter) return false
    return true
  })

  const activeShoppingItems = shoppingList.filter(n => !resolvedIds.has(n.id))

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold">Needs Board</h1>
        <p className="text-teal-100">School notes, ideas, and supply requests from all kids</p>
      </div>

      {/* ─── Shopping List ─── */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-4 border-b flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-teal-600" />
          <h2 className="font-bold text-gray-900">Supply & Shopping List</h2>
          {activeShoppingItems.length > 0 && (
            <span className="bg-teal-100 text-teal-700 text-xs px-2 py-0.5 rounded-full">{activeShoppingItems.length} items</span>
          )}
        </div>
        <div className="divide-y">
          {activeShoppingItems.length === 0 ? (
            <div className="p-6 text-center text-gray-400">All stocked up!</div>
          ) : (
            activeShoppingItems.map(item => {
              const cat = CATEGORY_LABELS[item.category] || { emoji: '📝', label: item.category }
              return (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${KID_COLORS[item.kid_name] || 'bg-gray-100 text-gray-700'}`}>
                    {(KID_DISPLAY[item.kid_name] || item.kid_name).charAt(0)}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                    item.category === 'ran_out_of' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {cat.emoji} {cat.label}
                  </span>
                  <span className="text-sm text-gray-800 flex-1">{item.note}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(item.created_at)}</span>
                  <button
                    onClick={() => resolve(item.id)}
                    className="bg-green-100 text-green-700 px-2.5 py-1 rounded text-xs hover:bg-green-200 flex items-center gap-1 flex-shrink-0"
                  >
                    <Check className="w-3 h-3" /> Got It
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ─── All Notes ─── */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-4 border-b flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-purple-600" />
          <h2 className="font-bold text-gray-900">All School Notes</h2>
        </div>

        {/* Filters */}
        <div className="p-3 border-b space-y-2">
          <div className="flex gap-1 overflow-x-auto">
            {ALL_KIDS.map(kid => (
              <button key={kid} onClick={() => setKidFilter(kid)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                  kidFilter === kid ? 'bg-purple-100 text-purple-700 border border-purple-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {kid === 'all' ? 'All Kids' : KID_DISPLAY[kid]}
              </button>
            ))}
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {CATEGORY_FILTERS.map(cat => {
              const info = CATEGORY_LABELS[cat]
              return (
                <button key={cat} onClick={() => setCatFilter(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                    catFilter === cat ? 'bg-teal-100 text-teal-700 border border-teal-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {cat === 'all' ? 'All' : `${info?.emoji} ${info?.label}`}
                </button>
              )
            })}
          </div>
        </div>

        {/* Notes list */}
        <div className="divide-y">
          {filteredNotes.length === 0 ? (
            <div className="p-6 text-center text-gray-400">No notes matching filters</div>
          ) : (
            filteredNotes.map(note => {
              const cat = CATEGORY_LABELS[note.category] || { emoji: '📝', label: note.category }
              return (
                <div key={note.id} className="flex items-center gap-3 px-4 py-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${KID_COLORS[note.kid_name] || 'bg-gray-100 text-gray-700'}`}>
                    {(KID_DISPLAY[note.kid_name] || note.kid_name).charAt(0)}
                  </span>
                  <span className="text-xs font-medium text-gray-600 w-14 flex-shrink-0">{KID_DISPLAY[note.kid_name]}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 flex-shrink-0">
                    {cat.emoji} {cat.label}
                  </span>
                  <span className="text-sm text-gray-800 flex-1">{note.note}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(note.created_at)}</span>
                  <button
                    onClick={() => resolve(note.id)}
                    className="text-xs text-gray-400 hover:text-green-600 flex-shrink-0"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
