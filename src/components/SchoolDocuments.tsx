'use client'

import { useState, useEffect } from 'react'
import { FileText, Plus, Trash2, Upload, Lock, ExternalLink } from 'lucide-react'

const DOC_TYPES = [
  'IEP', '504_Plan', 'ARD_Notes', 'Evaluation_Report', 'FIE',
  'BIP', 'Progress_Report', 'Report_Card', 'Speech_Eval', 'OT_Eval',
  'Psych_Eval', 'Medical_Letter', 'Accommodation_Request', 'Parent_Input_Form',
  'Transition_Plan', 'Medical_Form', 'Speech_Report', 'Other',
]
const DOC_COLORS: Record<string, string> = {
  IEP: 'bg-blue-100 text-blue-700', '504_Plan': 'bg-purple-100 text-purple-700',
  ARD_Notes: 'bg-amber-100 text-amber-700', Progress_Report: 'bg-green-100 text-green-700',
  Report_Card: 'bg-emerald-100 text-emerald-700', Medical_Form: 'bg-red-100 text-red-700',
  Speech_Report: 'bg-teal-100 text-teal-700', Evaluation_Report: 'bg-orange-100 text-orange-700',
  FIE: 'bg-rose-100 text-rose-700', BIP: 'bg-yellow-100 text-yellow-800',
  Speech_Eval: 'bg-teal-100 text-teal-700', OT_Eval: 'bg-cyan-100 text-cyan-700',
  Psych_Eval: 'bg-indigo-100 text-indigo-700', Medical_Letter: 'bg-red-100 text-red-600',
  Accommodation_Request: 'bg-violet-100 text-violet-700', Parent_Input_Form: 'bg-pink-100 text-pink-700',
  Transition_Plan: 'bg-sky-100 text-sky-700', Other: 'bg-gray-100 text-gray-600',
}

interface SchoolDocumentsProps {
  kid: string
  filterTypes?: string[]
}

export default function SchoolDocuments({ kid, filterTypes }: SchoolDocumentsProps) {
  const [docs, setDocs] = useState<any[]>([])
  const [showUpload, setShowUpload] = useState(false)
  const [form, setForm] = useState({
    doc_type: 'IEP', doc_name: '', academic_year: '2025-2026', summary: '',
    file_url: '', is_encrypted: false, encryption_note: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFile(true)
    const reader = new FileReader()
    reader.onload = () => {
      setForm(p => ({
        ...p,
        file_url: reader.result as string,
        doc_name: p.doc_name || file.name.replace(/\.[^.]+$/, ''),
      }))
      setUploadingFile(false)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const saveDoc = async () => {
    if (!form.doc_name.trim()) return
    setSubmitting(true)
    await fetch('/api/parent/teacher', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_document', kid,
        doc_type: form.doc_type, doc_name: form.doc_name,
        academic_year: form.academic_year, summary: form.summary,
        file_url: form.file_url || null,
        is_encrypted: form.is_encrypted, encryption_note: form.encryption_note || null,
      })
    })
    setForm({ doc_type: 'IEP', doc_name: '', academic_year: '2025-2026', summary: '', file_url: '', is_encrypted: false, encryption_note: '' })
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

          {/* File Upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center">
            {form.file_url ? (
              <div className="flex items-center gap-2 text-sm text-green-700">
                <FileText className="w-4 h-4" />
                <span className="font-medium">File attached</span>
                <button onClick={() => setForm(p => ({ ...p, file_url: '' }))} className="text-red-500 text-xs ml-auto">Remove</button>
              </div>
            ) : (
              <label className="cursor-pointer flex flex-col items-center gap-1">
                <Upload className="w-5 h-5 text-gray-400" />
                <span className="text-xs text-gray-500">{uploadingFile ? 'Processing...' : 'Click to upload PDF, image, or scan'}</span>
                <input type="file" accept=".pdf,image/*" onChange={handleFileSelect} className="hidden" />
              </label>
            )}
          </div>

          {/* Encryption toggle */}
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_encrypted} onChange={e => setForm(p => ({ ...p, is_encrypted: e.target.checked }))}
              className="rounded border-gray-300" id="encrypted" />
            <label htmlFor="encrypted" className="text-xs text-gray-600 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Document is encrypted/password-protected
            </label>
          </div>
          {form.is_encrypted && (
            <input type="text" value={form.encryption_note} onChange={e => setForm(p => ({ ...p, encryption_note: e.target.value }))}
              placeholder="Password hint (e.g. initials + year)" className="w-full text-sm border rounded px-2 py-1.5" />
          )}

          <textarea value={form.summary} onChange={e => setForm(p => ({ ...p, summary: e.target.value }))} placeholder="Notes / key takeaways" rows={2} className="w-full text-sm border rounded px-2 py-1.5 resize-none" />
          <div className="flex gap-2">
            <button onClick={saveDoc} disabled={submitting || !form.doc_name.trim()} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50">
              {form.file_url ? 'Upload & Save' : 'Save'}
            </button>
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
              {doc.is_encrypted && <span title={doc.encryption_note || 'Encrypted'}><Lock className="w-3 h-3 text-amber-500" /></span>}
              {doc.file_url && (
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-700 ml-1" title="View document">
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <button onClick={() => deleteDoc(doc.id)} className="ml-auto p-1 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded">
                <Trash2 className="w-3 h-3 text-gray-400" />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
              {doc.academic_year && <span>{doc.academic_year}</span>}
              {doc.upload_date && <span>Uploaded {(() => { try { const d = new Date(typeof doc.upload_date === 'string' && doc.upload_date.length === 10 ? doc.upload_date + 'T12:00:00' : doc.upload_date); return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) } catch { return '' } })()}</span>}
              {doc.file_url && <span className="text-blue-500">📎 File attached</span>}
            </div>
            {doc.summary && <p className="text-xs text-gray-400 mt-0.5">{doc.summary}</p>}
          </div>
        ))}
        {docs.length === 0 && <div className="p-3 text-xs text-gray-400 text-center">No documents on file. Upload IEP/504 plans, evaluations, and other documents.</div>}
      </div>
    </div>
  )
}
