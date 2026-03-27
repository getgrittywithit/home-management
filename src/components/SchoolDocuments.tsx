'use client'

import { useState, useEffect } from 'react'
import { FileText, Plus, Trash2, Eye, Upload } from 'lucide-react'

const DOC_TYPES = ['IEP', '504_Plan', 'Progress_Report', 'Report_Card', 'ARD_Notes', 'Medical_Form', 'Speech_Report', 'Other']
const DOC_COLORS: Record<string, string> = {
  IEP: 'bg-blue-100 text-blue-700', '504_Plan': 'bg-purple-100 text-purple-700',
  ARD_Notes: 'bg-amber-100 text-amber-700', Progress_Report: 'bg-green-100 text-green-700',
  Report_Card: 'bg-emerald-100 text-emerald-700', Medical_Form: 'bg-red-100 text-red-700',
  Speech_Report: 'bg-teal-100 text-teal-700', Other: 'bg-gray-100 text-gray-600',
}

interface SchoolDocumentsProps {
  kid: string
  filterTypes?: string[]
}

export default function SchoolDocuments({ kid, filterTypes }: SchoolDocumentsProps) {
  const [docs, setDocs] = useState<any[]>([])
  const [showUpload, setShowUpload] = useState(false)
  const [form, setForm] = useState({ doc_type: 'IEP', doc_name: '', academic_year: '2025-2026', summary: '' })
  const [submitting, setSubmitting] = useState(false)

  const loadDocs = () => {
    const typeParam = filterTypes ? `&doc_type=${filterTypes[0]}` : ''
    fetch(`/api/parent/teacher?action=get_school_documents&kid=${kid}${typeParam}`)
      .then(r => r.json())
      .then(d => {
        let documents = d.documents || []
        if (filterTypes && filterTypes.length > 1) {
          documents = documents.filter((doc: any) => filterTypes.includes(doc.doc_type))
        }
        setDocs(documents)
      })
      .catch(() => {})
  }

  useEffect(() => { loadDocs() }, [kid])

  const saveDoc = async () => {
    if (!form.doc_name.trim()) return
    setSubmitting(true)
    await fetch('/api/parent/teacher', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_document', kid, ...form })
    })
    setForm({ doc_type: 'IEP', doc_name: '', academic_year: '2025-2026', summary: '' })
    setShowUpload(false)
    setSubmitting(false)
    loadDocs()
  }

  const deleteDoc = async (id: number) => {
    await fetch('/api/parent/teacher', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_document', id })
    })
    loadDocs()
  }

  return (
    <div className="border rounded-lg">
      <div className="flex items-center justify-between p-3">
        <span className="font-medium text-sm flex items-center gap-1.5"><FileText className="w-4 h-4 text-gray-500" /> Documents</span>
        <button onClick={() => setShowUpload(true)} className="text-xs text-blue-600 flex items-center gap-1 hover:text-blue-800">
          <Plus className="w-3.5 h-3.5" /> Add Document
        </button>
      </div>

      {showUpload && (
        <div className="px-3 pb-3 space-y-2 bg-gray-50 border-t">
          <select value={form.doc_type} onChange={e => setForm(p => ({ ...p, doc_type: e.target.value }))} className="w-full text-sm border rounded px-2 py-1.5 mt-2">
            {DOC_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
          <input type="text" value={form.doc_name} onChange={e => setForm(p => ({ ...p, doc_name: e.target.value }))} placeholder="Document name (e.g. Annual ARD — Feb 2026)" className="w-full text-sm border rounded px-2 py-1.5" />
          <input type="text" value={form.academic_year} onChange={e => setForm(p => ({ ...p, academic_year: e.target.value }))} placeholder="Academic year (e.g. 2025-2026)" className="w-full text-sm border rounded px-2 py-1.5" />
          <textarea value={form.summary} onChange={e => setForm(p => ({ ...p, summary: e.target.value }))} placeholder="Notes / key takeaways" rows={2} className="w-full text-sm border rounded px-2 py-1.5 resize-none" />
          <div className="flex gap-2">
            <button onClick={saveDoc} disabled={submitting || !form.doc_name.trim()} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50">Save</button>
            <button onClick={() => setShowUpload(false)} className="text-xs text-gray-500">Cancel</button>
          </div>
        </div>
      )}

      <div className="divide-y">
        {docs.map((doc: any) => (
          <div key={doc.id} className="px-3 py-2.5 group">
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${DOC_COLORS[doc.doc_type] || DOC_COLORS.Other}`}>
                {doc.doc_type.replace(/_/g, ' ')}
              </span>
              <span className="text-sm font-medium text-gray-900">{doc.doc_name}</span>
              <button onClick={() => deleteDoc(doc.id)} className="ml-auto p-1 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded">
                <Trash2 className="w-3 h-3 text-gray-400" />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
              {doc.academic_year && <span>{doc.academic_year}</span>}
              {doc.upload_date && <span>Uploaded {new Date(doc.upload_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
            </div>
            {doc.summary && <p className="text-xs text-gray-400 mt-0.5">{doc.summary}</p>}
          </div>
        ))}
        {docs.length === 0 && <div className="p-3 text-xs text-gray-400 text-center">No documents on file</div>}
      </div>
    </div>
  )
}
