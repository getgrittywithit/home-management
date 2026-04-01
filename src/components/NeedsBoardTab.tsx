'use client'

import { useState, useEffect, useRef } from 'react'
import { ShoppingCart, Check, CheckCircle2, ClipboardList, AlertTriangle, Gift, Camera, MessageSquare } from 'lucide-react'

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
const RESOLVE_LABELS: Record<string, string> = {
  supply_needed: 'Got It',
  ran_out_of: 'Got It',
  subject_idea: 'Noted',
  interest: 'Noted',
}
const ALL_KIDS = ['all', 'amos', 'ellie', 'wyatt', 'hannah', 'zoey', 'kaylee']
const CATEGORY_FILTERS = ['all', 'subject_idea', 'interest', 'supply_needed', 'ran_out_of']

interface Note {
  id: string
  kid_name: string
  category: string
  note: string
  created_at: string
  read_at: string | null
  resolved: boolean
  resolved_at: string | null
}

export default function NeedsBoardTab() {
  const [shoppingList, setShoppingList] = useState<Note[]>([])
  const [allNotes, setAllNotes] = useState<Note[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [kidFilter, setKidFilter] = useState('all')
  const [catFilter, setCatFilter] = useState('all')
  const [loaded, setLoaded] = useState(false)
  const markedReadRef = useRef(false)

  // Additional data sources
  const [sickAlerts, setSickAlerts] = useState<{ kid_name: string; sick_date: string }[]>([])
  const [pendingRewards, setPendingRewards] = useState<{ id: number; kid_name: string; reward_name: string; coins_spent: number; created_at: string }[]>([])
  const [pendingSubmissions, setPendingSubmissions] = useState<{ id: number; kid_name: string; task_name: string; submitted_at: string }[]>([])
  const [unreadMessages, setUnreadMessages] = useState<{ from_kid: string; count: number }[]>([])

  useEffect(() => { loadData() }, [])

  const safeFetch = async (url: string, fallback: any) => {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 10000)
      const r = await fetch(url, { signal: controller.signal })
      clearTimeout(timer)
      if (!r.ok) return fallback
      return await r.json()
    } catch { return fallback }
  }

  const loadData = async () => {
    const [shopData, allData, flagsData] = await Promise.all([
      safeFetch('/api/kids/school-notes?action=get_shopping_list', { items: [] }),
      safeFetch('/api/kids/school-notes?action=get_all_notes', { notes: [], unreadCount: 0 }),
      safeFetch('/api/parent/flags?action=get_all_flags', {}),
    ])
    setShoppingList(shopData.items || [])
    setAllNotes(allData.notes || [])
    setUnreadCount(allData.unreadCount || 0)
    setSickAlerts(flagsData.sick_days || [])
    setUnreadMessages(flagsData.messages || [])

    const [rewardData, subData] = await Promise.all([
      safeFetch('/api/rewards?action=get_pending_redemptions', { redemptions: [] }),
      safeFetch('/api/rewards?action=get_pending_submissions', { submissions: [] }),
    ])
    setPendingRewards(rewardData.redemptions || [])
    setPendingSubmissions(subData.submissions || [])

    setLoaded(true)
  }

  const resolve = async (id: string) => {
    await fetch('/api/kids/school-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resolve_note', id })
    })
    const update = (notes: Note[]) => notes.map(n =>
      n.id === id ? { ...n, resolved: true, resolved_at: new Date().toISOString() } : n
    )
    setShoppingList(prev => update(prev))
    setAllNotes(prev => update(prev))
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
    if (kidFilter !== 'all' && n.kid_name !== kidFilter) return false
    if (catFilter !== 'all' && n.category !== catFilter) return false
    return true
  })

  const activeShoppingItems = shoppingList.filter(n => !n.resolved)
  const resolvedShoppingItems = shoppingList.filter(n => n.resolved)

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

      {/* ─── Needs Attention Now ─── */}
      {(sickAlerts.length > 0 || pendingRewards.length > 0 || pendingSubmissions.length > 0 || unreadMessages.length > 0) && (
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-4 border-b flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            <h2 className="font-bold text-gray-900">Needs Attention Now</h2>
            <span className="bg-rose-100 text-rose-700 text-xs px-2 py-0.5 rounded-full">
              {sickAlerts.length + pendingRewards.length + pendingSubmissions.length + unreadMessages.reduce((s, m) => s + m.count, 0)}
            </span>
          </div>
          <div className="divide-y">
            {/* Sick day alerts */}
            {sickAlerts.map((s, i) => (
              <div key={`sick-${i}`} className="flex items-center gap-3 px-4 py-3 bg-rose-50/40">
                <span className="w-2.5 h-2.5 bg-rose-500 rounded-full flex-shrink-0" />
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${KID_COLORS[s.kid_name] || 'bg-gray-100 text-gray-700'}`}>
                  {(KID_DISPLAY[s.kid_name] || s.kid_name).charAt(0)}
                </span>
                <span className="text-sm text-gray-800 flex-1">
                  <span className="font-medium">{KID_DISPLAY[s.kid_name] || s.kid_name}</span> is not feeling well today
                </span>
                <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">Sick Day</span>
              </div>
            ))}

            {/* Pending reward redemptions */}
            {pendingRewards.map(r => (
              <div key={`reward-${r.id}`} className="flex items-center gap-3 px-4 py-3 bg-amber-50/40">
                <Gift className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${KID_COLORS[r.kid_name] || 'bg-gray-100 text-gray-700'}`}>
                  {(KID_DISPLAY[r.kid_name] || r.kid_name).charAt(0)}
                </span>
                <span className="text-sm text-gray-800 flex-1">
                  <span className="font-medium">{KID_DISPLAY[r.kid_name] || r.kid_name}</span> redeemed: {r.reward_name} ({r.coins_spent} coins)
                </span>
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Pending</span>
              </div>
            ))}

            {/* Pending zone photo submissions */}
            {pendingSubmissions.map(s => (
              <div key={`sub-${s.id}`} className="flex items-center gap-3 px-4 py-3 bg-blue-50/40">
                <Camera className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${KID_COLORS[s.kid_name] || 'bg-gray-100 text-gray-700'}`}>
                  {(KID_DISPLAY[s.kid_name] || s.kid_name).charAt(0)}
                </span>
                <span className="text-sm text-gray-800 flex-1">
                  <span className="font-medium">{KID_DISPLAY[s.kid_name] || s.kid_name}</span> submitted: {s.task_name}
                </span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Review</span>
              </div>
            ))}

            {/* Unread kid messages */}
            {unreadMessages.map((m, i) => (
              <div key={`msg-${i}`} className="flex items-center gap-3 px-4 py-3">
                <MessageSquare className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${KID_COLORS[m.from_kid] || 'bg-gray-100 text-gray-700'}`}>
                  {(KID_DISPLAY[m.from_kid] || m.from_kid).charAt(0)}
                </span>
                <span className="text-sm text-gray-800 flex-1">
                  <span className="font-medium">{KID_DISPLAY[m.from_kid] || m.from_kid}</span> sent {m.count} unread message{m.count > 1 ? 's' : ''}
                </span>
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Unread</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
          {activeShoppingItems.length === 0 && resolvedShoppingItems.length === 0 ? (
            <div className="p-6 text-center text-gray-400">All stocked up!</div>
          ) : (
            <>
              {activeShoppingItems.map(item => {
                const cat = CATEGORY_LABELS[item.category] || { emoji: '📝', label: item.category }
                const isUnread = !item.read_at
                return (
                  <div key={item.id} className={`flex items-center gap-3 px-4 py-3 ${isUnread ? 'bg-blue-50/40' : ''}`}>
                    {isUnread ? (
                      <span className="w-2.5 h-2.5 bg-blue-500 rounded-full flex-shrink-0" />
                    ) : (
                      <span className="w-2.5 h-2.5 flex-shrink-0" />
                    )}
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
              })}
              {resolvedShoppingItems.map(item => {
                const cat = CATEGORY_LABELS[item.category] || { emoji: '📝', label: item.category }
                return (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3 bg-gray-50/80">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 opacity-50 ${KID_COLORS[item.kid_name] || 'bg-gray-100 text-gray-700'}`}>
                      {(KID_DISPLAY[item.kid_name] || item.kid_name).charAt(0)}
                    </span>
                    <span className="text-sm text-gray-400 line-through flex-1">{item.note}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {item.resolved_at ? timeAgo(item.resolved_at) : ''}
                    </span>
                  </div>
                )
              })}
            </>
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
              const isUnread = !note.read_at && !note.resolved
              const isResolved = note.resolved
              const resolveLabel = RESOLVE_LABELS[note.category] || 'Done'

              return (
                <div key={note.id} className={`flex items-center gap-3 px-4 py-3 ${isResolved ? 'bg-gray-50/80' : isUnread ? 'bg-blue-50/40' : ''}`}>
                  {/* Status indicator */}
                  {isResolved ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : isUnread ? (
                    <span className="w-2.5 h-2.5 bg-blue-500 rounded-full flex-shrink-0" />
                  ) : (
                    <span className="w-2.5 h-2.5 flex-shrink-0" />
                  )}

                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isResolved ? 'opacity-50' : ''} ${KID_COLORS[note.kid_name] || 'bg-gray-100 text-gray-700'}`}>
                    {(KID_DISPLAY[note.kid_name] || note.kid_name).charAt(0)}
                  </span>
                  <span className={`text-xs font-medium w-14 flex-shrink-0 ${isResolved ? 'text-gray-400' : 'text-gray-600'}`}>{KID_DISPLAY[note.kid_name]}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${isResolved ? 'bg-gray-100 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                    {cat.emoji} {cat.label}
                  </span>
                  <span className={`text-sm flex-1 ${isResolved ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{note.note}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(note.created_at)}</span>
                  {!isResolved ? (
                    <button
                      onClick={() => resolve(note.id)}
                      className="text-xs text-green-600 hover:text-green-800 flex items-center gap-1 flex-shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" /> {resolveLabel}
                    </button>
                  ) : (
                    <span className="text-xs text-green-600 flex-shrink-0">
                      {note.resolved_at ? timeAgo(note.resolved_at) : ''}
                    </span>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
