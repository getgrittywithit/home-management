'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react'

interface SenderRule {
  id: number; sender_pattern: string; sender_name: string | null
  default_category: string; default_priority: string; auto_archive: boolean
}

const CATEGORIES = ['school', 'medical', 'triton', 'finance', 'family', 'subscriptions', 'junk']
const PRIORITIES = ['urgent', 'normal', 'low', 'archive']

export default function SenderRules({ onBack }: { onBack: () => void }) {
  const [rules, setRules] = useState<SenderRule[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ sender_pattern: '', sender_name: '', default_category: 'school', default_priority: 'normal', auto_archive: false })
  const [editId, setEditId] = useState<number | null>(null)

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/email?action=get_sender_rules')
      const data = await res.json()
      setRules(data.rules || [])
    } catch { /* silent */ }
  }

  useEffect(() => { fetchRules() }, [])

  const handleSave = async () => {
    if (!form.sender_pattern.trim()) return
    await fetch('/api/email', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_sender_rule', id: editId, ...form }) }).catch(() => {})
    setShowForm(false); setEditId(null)
    setForm({ sender_pattern: '', sender_name: '', default_category: 'school', default_priority: 'normal', auto_archive: false })
    fetchRules()
  }

  const handleDelete = async (id: number) => {
    await fetch('/api/email', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_sender_rule', id }) }).catch(() => {})
    fetchRules()
  }

  const handleEdit = (rule: SenderRule) => {
    setEditId(rule.id)
    setForm({ sender_pattern: rule.sender_pattern, sender_name: rule.sender_name || '',
      default_category: rule.default_category, default_priority: rule.default_priority,
      auto_archive: rule.auto_archive })
    setShowForm(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800">
          <ArrowLeft className="w-4 h-4" /> Back to Inbox
        </button>
        <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ sender_pattern: '', sender_name: '', default_category: 'school', default_priority: 'normal', auto_archive: false }) }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-500 text-white hover:bg-indigo-600">
          <Plus className="w-3 h-3" /> Add Rule
        </button>
      </div>

      <h2 className="text-lg font-bold text-gray-900">Sender Rules</h2>
      <p className="text-sm text-gray-500">Rules auto-categorize emails by sender pattern. Use % as wildcard (e.g., %@boerneisd.net).</p>

      {showForm && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-3 border">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Sender Pattern</label>
              <input type="text" value={form.sender_pattern} onChange={e => setForm(f => ({ ...f, sender_pattern: e.target.value }))}
                placeholder="%@example.com" className="w-full border rounded px-3 py-1.5 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Display Name</label>
              <input type="text" value={form.sender_name} onChange={e => setForm(f => ({ ...f, sender_name: e.target.value }))}
                placeholder="Optional label" className="w-full border rounded px-3 py-1.5 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Category</label>
              <select value={form.default_category} onChange={e => setForm(f => ({ ...f, default_category: e.target.value }))}
                className="w-full border rounded px-3 py-1.5 text-sm mt-1">
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Priority</label>
              <select value={form.default_priority} onChange={e => setForm(f => ({ ...f, default_priority: e.target.value }))}
                className="w-full border rounded px-3 py-1.5 text-sm mt-1">
                {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.auto_archive} onChange={e => setForm(f => ({ ...f, auto_archive: e.target.checked }))} />
              Auto-archive
            </label>
            <div className="flex gap-2">
              <button onClick={() => { setShowForm(false); setEditId(null) }}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded">Cancel</button>
              <button onClick={handleSave}
                className="flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium bg-indigo-500 text-white hover:bg-indigo-600">
                <Save className="w-3 h-3" /> {editId ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Pattern</th>
              <th className="text-left px-4 py-2 font-medium">Name</th>
              <th className="text-left px-4 py-2 font-medium">Category</th>
              <th className="text-left px-4 py-2 font-medium">Priority</th>
              <th className="text-left px-4 py-2 font-medium">Auto-Archive</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rules.map(rule => (
              <tr key={rule.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleEdit(rule)}>
                <td className="px-4 py-2 font-mono text-xs">{rule.sender_pattern}</td>
                <td className="px-4 py-2 text-gray-600">{rule.sender_name || '-'}</td>
                <td className="px-4 py-2"><span className="px-2 py-0.5 rounded-full text-xs bg-gray-100">{rule.default_category}</span></td>
                <td className="px-4 py-2 text-gray-600">{rule.default_priority}</td>
                <td className="px-4 py-2">{rule.auto_archive ? 'Yes' : '-'}</td>
                <td className="px-4 py-2">
                  <button onClick={e => { e.stopPropagation(); handleDelete(rule.id) }}
                    className="p-1 text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rules.length === 0 && <p className="text-center text-gray-400 py-6 text-sm">No sender rules configured.</p>}
      </div>
    </div>
  )
}
