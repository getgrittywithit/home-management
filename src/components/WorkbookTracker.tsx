'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Save } from 'lucide-react'
import { HOMESCHOOL_KIDS, KID_DISPLAY } from '@/lib/constants'

export default function WorkbookTracker() {
  const [data, setData] = useState<Record<string, any[]>>({})
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    Promise.all(
      [...HOMESCHOOL_KIDS].map(async kid => {
        const res = await fetch(`/api/school/workbook-progress?kid_name=${kid}`).then(r => r.json()).catch(() => ({ workbooks: [] }))
        return [kid, res.workbooks || []] as const
      })
    ).then(entries => setData(Object.fromEntries(entries)))
  }, [])

  const updatePage = async (kid: string, type: string, page: number) => {
    setSaving(`${kid}-${type}`)
    await fetch('/api/school/workbook-progress', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kid_name: kid, workbook_type: type, last_page_completed: page }),
    }).catch(() => {})
    setData(prev => ({
      ...prev,
      [kid]: (prev[kid] || []).map(w => w.workbook_type === type ? { ...w, last_page_completed: page } : w),
    }))
    setSaving(null)
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 mb-3">
        <BookOpen className="w-4 h-4 text-emerald-500" /> Workbook Progress
      </h3>
      <div className="space-y-3">
        {[...HOMESCHOOL_KIDS].map(kid => (
          <div key={kid}>
            <p className="text-xs font-semibold text-gray-500 mb-1">{KID_DISPLAY[kid]}</p>
            <div className="grid grid-cols-2 gap-2">
              {(data[kid] || []).map((wb: any) => (
                <div key={wb.id} className="flex items-center gap-2 text-xs">
                  <span className="text-gray-600 w-24 truncate">{wb.workbook_type === 'summer_bridge' ? 'Summer Bridge' : 'Ultimate Math'}</span>
                  <input type="number" value={wb.last_page_completed || 0} min={0}
                    onChange={e => updatePage(kid, wb.workbook_type, parseInt(e.target.value) || 0)}
                    className="w-14 border rounded px-1.5 py-1 text-xs text-center" />
                  <span className="text-gray-400">{wb.total_pages ? `/ ${wb.total_pages}` : ''}</span>
                  {saving === `${kid}-${wb.workbook_type}` && <Save className="w-3 h-3 text-green-500 animate-pulse" />}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
