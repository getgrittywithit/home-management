'use client'

import { useState, useEffect } from 'react'
import { UserPlus, Pencil, Trash2, Phone, Mail, X } from 'lucide-react'

const ROLES = [
  { value: 'attendance_secretary', label: 'Attendance Secretary', color: 'bg-gray-100 text-gray-700' },
  { value: 'ard_coordinator', label: 'ARD Coordinator', color: 'bg-blue-100 text-blue-700' },
  { value: '504_facilitator', label: '504 Facilitator', color: 'bg-purple-100 text-purple-700' },
  { value: 'speech_therapist', label: 'Speech Therapist', color: 'bg-teal-100 text-teal-700' },
  { value: 'counselor', label: 'Counselor', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'principal', label: 'Principal', color: 'bg-amber-100 text-amber-700' },
  { value: 'special_ed_teacher', label: 'Special Ed Teacher', color: 'bg-green-100 text-green-700' },
  { value: 'other', label: 'Other', color: 'bg-gray-100 text-gray-600' },
]

const emptyForm = { contact_name: '', role: 'other', role_label: '', email: '', phone: '', phone_ext: '', notes: '' }

export default function SchoolContactCards({ kid }: { kid: string }) {
  const [contacts, setContacts] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)

  const loadContacts = () => {
    fetch(`/api/parent/teacher?action=get_special_contacts&kid=${kid}`)
      .then(r => r.json())
      .then(d => setContacts(d.contacts || []))
      .catch(() => {})
  }

  useEffect(() => { loadContacts() }, [kid])

  const saveContact = async () => {
    if (!form.contact_name.trim()) return
    const roleObj = ROLES.find(r => r.value === form.role)
    const payload = { ...form, role_label: form.role_label || roleObj?.label || form.role, kid }
    if (editId) {
      await fetch('/api/parent/teacher', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_special_contact', id: editId, ...payload }) })
    } else {
      await fetch('/api/parent/teacher', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_special_contact', ...payload }) })
    }
    setForm(emptyForm); setShowAdd(false); setEditId(null)
    loadContacts()
  }

  const deleteContact = async (id: number) => {
    await fetch('/api/parent/teacher', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_special_contact', id }) })
    loadContacts()
  }

  const startEdit = (c: any) => {
    setEditId(c.id)
    setForm({ contact_name: c.contact_name, role: c.role, role_label: c.role_label || '', email: c.email || '', phone: c.phone || '', phone_ext: c.phone_ext || '', notes: c.notes || '' })
    setShowAdd(true)
  }

  const getRoleColor = (role: string) => ROLES.find(r => r.value === role)?.color || 'bg-gray-100 text-gray-600'

  return (
    <div className="border rounded-lg">
      <div className="flex items-center justify-between p-3">
        <span className="font-medium text-sm">School Contacts</span>
        <button onClick={() => { setShowAdd(true); setEditId(null); setForm(emptyForm) }}
          className="text-xs text-green-600 flex items-center gap-1 hover:text-green-800">
          <UserPlus className="w-3.5 h-3.5" /> Add Contact
        </button>
      </div>

      {/* Add/Edit form */}
      {showAdd && (
        <div className="px-3 pb-3 space-y-2 bg-gray-50 border-t">
          <input type="text" value={form.contact_name} onChange={e => setForm(p => ({ ...p, contact_name: e.target.value }))}
            placeholder="Contact name" className="w-full text-sm border rounded px-2 py-1.5 mt-2" />
          <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} className="w-full text-sm border rounded px-2 py-1.5">
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="Email" className="text-sm border rounded px-2 py-1.5" />
            <div className="flex gap-1">
              <input type="text" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="Phone" className="flex-1 text-sm border rounded px-2 py-1.5" />
              <input type="text" value={form.phone_ext} onChange={e => setForm(p => ({ ...p, phone_ext: e.target.value }))} placeholder="Ext" className="w-16 text-sm border rounded px-2 py-1.5" />
            </div>
          </div>
          <input type="text" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Notes (optional)" className="w-full text-sm border rounded px-2 py-1.5" />
          <div className="flex gap-2">
            <button onClick={saveContact} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700">{editId ? 'Update' : 'Add'}</button>
            <button onClick={() => { setShowAdd(false); setEditId(null); setForm(emptyForm) }} className="text-xs text-gray-500">Cancel</button>
          </div>
        </div>
      )}

      {/* Contact cards */}
      <div className="divide-y">
        {contacts.map((c: any) => (
          <div key={c.id} className="px-3 py-2.5 group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRoleColor(c.role)}`}>{c.role_label || c.role}</span>
                <span className="text-sm font-medium text-gray-900">{c.contact_name}</span>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => startEdit(c)} className="p-1 hover:bg-gray-100 rounded"><Pencil className="w-3 h-3 text-gray-400" /></button>
                <button onClick={() => deleteContact(c.id)} className="p-1 hover:bg-red-50 rounded"><Trash2 className="w-3 h-3 text-gray-400" /></button>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
              {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {c.email}</span>}
              {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone}{c.phone_ext ? ` x${c.phone_ext}` : ''}</span>}
            </div>
            {c.notes && <p className="text-xs text-gray-400 mt-0.5">{c.notes}</p>}
          </div>
        ))}
        {contacts.length === 0 && <div className="p-3 text-xs text-gray-400 text-center">No contacts on file</div>}
      </div>
    </div>
  )
}
