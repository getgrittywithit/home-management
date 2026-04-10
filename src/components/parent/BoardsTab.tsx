'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Check, X, ChevronRight, Calendar, Mail, ClipboardList,
  Loader2, Trash2, Edit3, MoreHorizontal, ArrowRight,
} from 'lucide-react'

interface Board {
  id: number; name: string; slug: string; columns: string[]; color: string; icon: string; position: number
}

interface ActionItem {
  id: number; title: string; description: string | null; source_type: string
  source_id: string | null; source_preview: string | null; category: string | null
  assigned_to: string; priority: string; status: string; due_date: string | null
  due_time: string | null; board: string; column_name: string; position: number
  notes: string | null; created_at: string; completed_at: string | null
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'border-l-red-500 bg-red-50', high: 'border-l-orange-400', normal: 'border-l-gray-200', low: 'border-l-gray-100',
}

const PRIORITY_DOTS: Record<string, string> = {
  urgent: 'bg-red-500', high: 'bg-orange-400', normal: 'bg-blue-400', low: 'bg-gray-300',
}

const SOURCE_ICONS: Record<string, string> = {
  email: '📧', calendar: '📅', school: '🏫', manual: '✏️',
}

const COL_LABELS: Record<string, string> = {
  inbox: 'Inbox', todo: 'To Do', in_progress: 'In Progress', waiting: 'Waiting', done: 'Done',
  leads: 'Leads', estimate_sent: 'Estimate Sent', scheduled: 'Scheduled', invoiced: 'Invoiced', paid: 'Paid',
  need_to_respond: 'Need to Respond', waiting_on_school: 'Waiting on School',
  waiting_on_results: 'Waiting on Results',
}

export default function BoardsTab() {
  const [boards, setBoards] = useState<Board[]>([])
  const [activeBoard, setActiveBoard] = useState<string>('personal')
  const [items, setItems] = useState<ActionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedItem, setExpandedItem] = useState<number | null>(null)
  const [showAdd, setShowAdd] = useState<string | null>(null) // column_name for add form
  const [newTitle, setNewTitle] = useState('')
  const [newPriority, setNewPriority] = useState('normal')
  const [newDueDate, setNewDueDate] = useState('')
  const [editingItem, setEditingItem] = useState<ActionItem | null>(null)
  const [moveMenu, setMoveMenu] = useState<number | null>(null)

  const fetchBoards = async () => {
    try {
      const res = await fetch('/api/boards?action=list_boards')
      const data = await res.json()
      setBoards((data.boards || []).map((b: any) => ({
        ...b,
        columns: typeof b.columns === 'string' ? JSON.parse(b.columns) : b.columns,
      })))
    } catch { /* silent */ }
  }

  const fetchItems = useCallback(async (boardSlug?: string) => {
    const slug = boardSlug || activeBoard
    try {
      const res = await fetch(`/api/boards?action=get_board&slug=${slug}`)
      const data = await res.json()
      setItems(data.items || [])
    } catch { /* silent */ }
    setLoading(false)
  }, [activeBoard])

  useEffect(() => { fetchBoards() }, [])
  useEffect(() => { setLoading(true); fetchItems() }, [activeBoard, fetchItems])

  const board = boards.find(b => b.slug === activeBoard)
  const columns: string[] = board?.columns || ['inbox', 'todo', 'in_progress', 'done']

  const handleAddItem = async (column: string) => {
    if (!newTitle.trim()) return
    await fetch('/api/action-items', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create', title: newTitle.trim(), board: activeBoard,
        column_name: column, priority: newPriority,
        due_date: newDueDate || null,
      }),
    })
    setNewTitle(''); setNewPriority('normal'); setNewDueDate(''); setShowAdd(null)
    fetchItems()
  }

  const handleMove = async (itemId: number, toColumn: string) => {
    // Optimistic update
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, column_name: toColumn, status: toColumn } : i))
    setMoveMenu(null)
    await fetch('/api/action-items', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'move', id: itemId, column_name: toColumn }),
    })
    fetchItems()
  }

  const handleComplete = async (itemId: number) => {
    setItems(prev => prev.filter(i => i.id !== itemId))
    await fetch('/api/action-items', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete', id: itemId }),
    })
    fetchItems()
  }

  const handleDelete = async (itemId: number) => {
    setItems(prev => prev.filter(i => i.id !== itemId))
    await fetch('/api/action-items', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id: itemId }),
    })
  }

  const handleUpdateItem = async (itemId: number, updates: Partial<ActionItem>) => {
    await fetch('/api/action-items', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', id: itemId, ...updates }),
    })
    setEditingItem(null)
    fetchItems()
  }

  const colItems = (col: string) => items.filter(i => i.column_name === col)

  return (
    <div className="p-4 md:p-6 max-w-full">
      {/* Board selector */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
        <ClipboardList className="w-5 h-5 text-gray-700 flex-shrink-0" />
        <h2 className="text-lg font-bold text-gray-900 flex-shrink-0">Boards</h2>
        <div className="flex gap-1.5 ml-3">
          {boards.map(b => (
            <button key={b.slug} onClick={() => setActiveBoard(b.slug)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                activeBoard === b.slug
                  ? 'text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={activeBoard === b.slug ? { backgroundColor: b.color } : {}}>
              <span>{b.icon}</span> {b.name}
              {colItems('inbox').length > 0 && activeBoard !== b.slug && (
                <span className="text-xs bg-red-100 text-red-600 px-1.5 rounded-full">
                  {items.filter(i => i.board === b.slug && i.column_name === 'inbox').length || ''}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Kanban columns */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: '60vh' }}>
          {columns.map(col => {
            const columnItems = colItems(col)
            const isDone = col === 'done' || col === 'paid'

            return (
              <div key={col} className="flex-shrink-0 w-72 bg-gray-50 rounded-xl border border-gray-200">
                {/* Column header */}
                <div className="px-3 py-2.5 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-700">{COL_LABELS[col] || col}</h3>
                    <span className="text-xs bg-gray-200 text-gray-600 px-1.5 rounded-full">{columnItems.length}</span>
                  </div>
                  <button onClick={() => { setShowAdd(col); setNewTitle(''); setNewPriority('normal'); setNewDueDate('') }}
                    className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Add form */}
                {showAdd === col && (
                  <div className="p-2 border-b border-gray-200 bg-white">
                    <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)}
                      placeholder="Task title..." autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') handleAddItem(col); if (e.key === 'Escape') setShowAdd(null) }}
                      className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                    <div className="flex gap-2 mt-1.5">
                      <select value={newPriority} onChange={e => setNewPriority(e.target.value)}
                        className="text-xs border rounded px-1.5 py-1">
                        <option value="urgent">Urgent</option>
                        <option value="high">High</option>
                        <option value="normal">Normal</option>
                        <option value="low">Low</option>
                      </select>
                      <input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)}
                        className="text-xs border rounded px-1.5 py-1 flex-1" />
                      <button onClick={() => handleAddItem(col)}
                        className="text-xs bg-indigo-500 text-white px-2 py-1 rounded hover:bg-indigo-600">Add</button>
                      <button onClick={() => setShowAdd(null)}
                        className="text-xs text-gray-400 hover:text-gray-600"><X className="w-3 h-3" /></button>
                    </div>
                  </div>
                )}

                {/* Cards */}
                <div className="p-2 space-y-2 max-h-[65vh] overflow-y-auto">
                  {columnItems.map(item => (
                    <div key={item.id}
                      className={`bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow transition cursor-pointer border-l-4 ${PRIORITY_COLORS[item.priority] || 'border-l-gray-200'}`}>
                      <div className="px-3 py-2.5" onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}>
                        <div className="flex items-start gap-2">
                          {/* Complete checkbox */}
                          <button onClick={e => { e.stopPropagation(); handleComplete(item.id) }}
                            className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border ${isDone ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-indigo-400'} flex items-center justify-center`}>
                            {isDone && <Check className="w-3 h-3" />}
                          </button>

                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${isDone ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                              {item.title}
                            </p>

                            {/* Meta row */}
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {item.source_type !== 'manual' && (
                                <span className="text-xs text-gray-400">{SOURCE_ICONS[item.source_type] || ''}</span>
                              )}
                              {item.due_date && (
                                <span className="text-xs text-gray-400 flex items-center gap-0.5">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(item.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                              <span className={`w-2 h-2 rounded-full ${PRIORITY_DOTS[item.priority]}`} />
                              {item.assigned_to && item.assigned_to !== 'lola' && (
                                <span className="text-xs bg-gray-100 text-gray-500 px-1.5 rounded">{item.assigned_to}</span>
                              )}
                            </div>
                          </div>

                          {/* Move menu */}
                          <button onClick={e => { e.stopPropagation(); setMoveMenu(moveMenu === item.id ? null : item.id) }}
                            className="flex-shrink-0 p-0.5 rounded hover:bg-gray-100 text-gray-400">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Move dropdown */}
                        {moveMenu === item.id && (
                          <div className="mt-2 bg-white border rounded-lg shadow-lg py-1 absolute z-10"
                            style={{ marginLeft: '60%' }}>
                            {columns.filter(c => c !== col).map(c => (
                              <button key={c} onClick={e => { e.stopPropagation(); handleMove(item.id, c) }}
                                className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-1.5">
                                <ArrowRight className="w-3 h-3 text-gray-400" /> {COL_LABELS[c] || c}
                              </button>
                            ))}
                            <div className="border-t my-1" />
                            <button onClick={e => { e.stopPropagation(); handleDelete(item.id) }}
                              className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-1.5">
                              <Trash2 className="w-3 h-3" /> Delete
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Expanded detail */}
                      {expandedItem === item.id && (
                        <div className="px-3 py-2 border-t border-gray-100 space-y-2">
                          {item.description && (
                            <p className="text-xs text-gray-600">{item.description}</p>
                          )}
                          {item.source_preview && (
                            <div className="text-xs text-gray-400 bg-gray-50 p-2 rounded italic">
                              {item.source_preview}
                            </div>
                          )}
                          {item.notes && (
                            <p className="text-xs text-gray-600 bg-yellow-50 p-2 rounded">{item.notes}</p>
                          )}

                          <div className="flex gap-2 pt-1">
                            <select value={item.priority}
                              onChange={e => handleUpdateItem(item.id, { priority: e.target.value } as any)}
                              className="text-xs border rounded px-1.5 py-1">
                              <option value="urgent">Urgent</option>
                              <option value="high">High</option>
                              <option value="normal">Normal</option>
                              <option value="low">Low</option>
                            </select>
                            <select value={item.assigned_to}
                              onChange={e => handleUpdateItem(item.id, { assigned_to: e.target.value } as any)}
                              className="text-xs border rounded px-1.5 py-1">
                              <option value="lola">Lola</option>
                              <option value="levi">Levi</option>
                            </select>
                            <input type="date" value={item.due_date || ''}
                              onChange={e => handleUpdateItem(item.id, { due_date: e.target.value || null } as any)}
                              className="text-xs border rounded px-1.5 py-1 flex-1" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {columnItems.length === 0 && !showAdd && (
                    <p className="text-xs text-gray-400 text-center py-4">No items</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
