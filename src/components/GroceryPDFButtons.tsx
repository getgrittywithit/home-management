'use client'

import { useState } from 'react'
import { FileText, Loader2 } from 'lucide-react'

const KIDS = ['amos', 'zoey', 'kaylee', 'ellie', 'wyatt', 'hannah']

export default function GroceryPDFButtons() {
  const [showSensory, setShowSensory] = useState(false)
  const [sensoryKid, setSensoryKid] = useState('amos')
  const [sensoryRange, setSensoryRange] = useState('90')
  const [spendingRange, setSpendingRange] = useState('30')
  const [generating, setGenerating] = useState<string | null>(null)

  const generatePDF = async (action: string, params: Record<string, string>) => {
    setGenerating(action)
    try {
      const res = await fetch('/api/grocery', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...params }),
      })
      if (!res.ok) throw new Error('Failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch {
      alert('Failed to generate PDF. Check that data exists for the selected range.')
    }
    setGenerating(null)
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm p-4 space-y-4">
      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
        <FileText className="w-4 h-4" /> Grocery Reports
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sensory Report */}
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <p className="text-sm font-medium text-gray-700">Sensory Food Report</p>
          <p className="text-xs text-gray-500">Food preferences and sensory patterns for provider visits.</p>
          {!showSensory ? (
            <button onClick={() => setShowSensory(true)}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">Configure &amp; Generate</button>
          ) : (
            <div className="space-y-2">
              <select value={sensoryKid} onChange={e => setSensoryKid(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm">
                {KIDS.map(k => <option key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</option>)}
              </select>
              <select value={sensoryRange} onChange={e => setSensoryRange(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm">
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="180">Last 6 months</option>
              </select>
              <button onClick={() => generatePDF('generate_sensory_report', { kid_name: sensoryKid, range: sensoryRange })}
                disabled={generating === 'generate_sensory_report'}
                className="w-full flex items-center justify-center gap-1 bg-indigo-500 text-white py-1.5 rounded text-sm font-medium hover:bg-indigo-600 disabled:opacity-50">
                {generating === 'generate_sensory_report' ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Generate PDF
              </button>
            </div>
          )}
        </div>

        {/* Spending Report */}
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <p className="text-sm font-medium text-gray-700">Spending Report</p>
          <p className="text-xs text-gray-500">SNAP/cash breakdown, store spending, top items, budget tracking.</p>
          <select value={spendingRange} onChange={e => setSpendingRange(e.target.value)}
            className="w-full border rounded px-2 py-1.5 text-sm">
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <button onClick={() => generatePDF('generate_spending_report', { range: spendingRange })}
            disabled={generating === 'generate_spending_report'}
            className="w-full flex items-center justify-center gap-1 bg-emerald-500 text-white py-1.5 rounded text-sm font-medium hover:bg-emerald-600 disabled:opacity-50">
            {generating === 'generate_spending_report' ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Generate PDF
          </button>
        </div>
      </div>
    </div>
  )
}
