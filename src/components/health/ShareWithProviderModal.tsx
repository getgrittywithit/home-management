'use client'

import { useState } from 'react'
import { ClipboardList, X, Loader2 } from 'lucide-react'

interface ShareWithProviderModalProps {
  onClose: () => void
}

export default function ShareWithProviderModal({ onClose }: ShareWithProviderModalProps) {
  const [exportKid, setExportKid] = useState('amos')
  const [exportRange, setExportRange] = useState(30)
  const [reportType, setReportType] = useState<'provider' | 'ard'>('provider')
  const [meetingType, setMeetingType] = useState('ARD')
  const [exporting, setExporting] = useState(false)

  const handleExportPDF = async () => {
    setExporting(true)
    try {
      if (reportType === 'provider') {
        const res = await fetch('/api/health/export-pdf', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kid_name: exportKid, date_range: exportRange }),
        })
        if (!res.ok) throw new Error('Export failed')
        const blob = await res.blob()
        window.open(URL.createObjectURL(blob), '_blank')
      } else {
        const res = await fetch('/api/health', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'generate_ard_packet', kid_name: exportKid, meeting_type: meetingType }),
        })
        if (!res.ok) throw new Error('Export failed')
        const blob = await res.blob()
        window.open(URL.createObjectURL(blob), '_blank')
      }
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

        {/* Report Type Toggle */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">Report Type</label>
          <div className="flex rounded-lg overflow-hidden border text-sm">
            <button onClick={() => setReportType('provider')}
              className={`flex-1 px-3 py-2 font-medium transition ${reportType === 'provider' ? 'bg-teal-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              Provider Report
            </button>
            <button onClick={() => setReportType('ard')}
              className={`flex-1 px-3 py-2 font-medium transition ${reportType === 'ard' ? 'bg-teal-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              ARD/IEP Packet
            </button>
          </div>
        </div>

        {/* Select Child */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Select Child</label>
          <select value={exportKid} onChange={e => setExportKid(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm">
            {['amos', 'zoey', 'kaylee', 'ellie', 'wyatt', 'hannah'].map(k => (
              <option key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</option>
            ))}
          </select>
        </div>

        {/* Provider Report: Date Range */}
        {reportType === 'provider' && (
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
        )}

        {/* ARD Packet: Meeting Type */}
        {reportType === 'ard' && (
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Meeting Type</label>
            <select value={meetingType} onChange={e => setMeetingType(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="ARD">ARD</option>
              <option value="IEP">IEP</option>
              <option value="504">504</option>
              <option value="Speech">Speech</option>
              <option value="Other">Other</option>
            </select>
          </div>
        )}

        <button onClick={handleExportPDF} disabled={exporting}
          className="w-full bg-teal-500 text-white py-3 rounded-lg font-medium hover:bg-teal-600 disabled:opacity-50 flex items-center justify-center gap-2">
          {exporting ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : reportType === 'ard' ? 'Generate ARD Packet' : 'Generate PDF'}
        </button>
        <p className="text-xs text-gray-500 text-center">
          {reportType === 'ard' ? 'Generates a multi-page packet with IEP goals, accommodations, behavioral data, and attendance.' : 'PDF opens in a new tab. Print or save to share with your provider.'}
        </p>
      </div>
    </div>
  )
}
