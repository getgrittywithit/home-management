'use client'

import { useState } from 'react'
import { ClipboardList, X, Loader2 } from 'lucide-react'

interface ShareWithProviderModalProps {
  onClose: () => void
}

export default function ShareWithProviderModal({ onClose }: ShareWithProviderModalProps) {
  const [exportKid, setExportKid] = useState('amos')
  const [exportRange, setExportRange] = useState(30)
  const [exporting, setExporting] = useState(false)

  const handleExportPDF = async () => {
    setExporting(true)
    try {
      const res = await fetch('/api/health/export-pdf', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kid_name: exportKid, date_range: exportRange }),
      })
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch (err) {
      console.error('PDF export error:', err)
    }
    setExporting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-teal-600" />
            Share with Provider
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Select Child</label>
          <select value={exportKid} onChange={e => setExportKid(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm">
            {['amos', 'zoey', 'kaylee', 'ellie', 'wyatt', 'hannah'].map(k => (
              <option key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">Date Range</label>
          <div className="flex gap-2">
            {[7, 30, 90].map(r => (
              <button key={r} onClick={() => setExportRange(r)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  exportRange === r ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                Last {r} Days
              </button>
            ))}
          </div>
        </div>
        <button onClick={handleExportPDF} disabled={exporting}
          className="w-full bg-teal-500 text-white py-3 rounded-lg font-medium hover:bg-teal-600 disabled:opacity-50 flex items-center justify-center gap-2">
          {exporting ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <>Generate PDF</>}
        </button>
        <p className="text-xs text-gray-500 text-center">PDF opens in a new tab. Print or save to share with your provider.</p>
      </div>
    </div>
  )
}
