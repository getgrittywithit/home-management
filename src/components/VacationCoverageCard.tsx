'use client'

import { useState } from 'react'
import { Plane, Check, Loader2 } from 'lucide-react'
import { ALL_KIDS, KID_DISPLAY } from '@/lib/constants'

export default function VacationCoverageCard() {
  const [absentKids, setAbsentKids] = useState<string[]>([])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; coverage: any[] } | null>(null)

  const toggleKid = (kid: string) => {
    setAbsentKids(prev => prev.includes(kid) ? prev.filter(k => k !== kid) : [...prev, kid])
  }

  const handleSubmit = async () => {
    if (absentKids.length === 0 || !startDate || !endDate) return
    setSubmitting(true)
    const allCoverage: any[] = []
    for (const kid of absentKids) {
      try {
        const res = await fetch('/api/kids/belle', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'set_absence_coverage', absent_kid: kid, start_date: startDate, end_date: endDate, reason: reason || `${KID_DISPLAY[kid]} away` }),
        })
        const data = await res.json()
        if (data.coverage) allCoverage.push(...data.coverage.map((c: any) => ({ ...c, absent: kid })))
      } catch {}
    }

    for (const kid of absentKids) {
      await fetch('/api/parent/my-focus', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_task', title: `Coverage set: ${KID_DISPLAY[kid]} away ${startDate} to ${endDate}`, category: 'household', priority: 'normal' }),
      }).catch(() => {})
    }

    setResult({ success: true, coverage: allCoverage })
    setSubmitting(false)
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 mb-3">
        <Plane className="w-4 h-4 text-blue-500" /> Vacation Coverage
      </h3>
      <p className="text-xs text-gray-500 mb-3">Set Belle + zone coverage for kids who will be away</p>

      {result ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-green-700 text-sm">
            <Check className="w-4 h-4" /> Coverage set for {result.coverage.length} day(s)
          </div>
          {result.coverage.length > 0 && (
            <div className="text-xs text-gray-500 space-y-0.5">
              {result.coverage.slice(0, 5).map((c: any, i: number) => (
                <p key={i}>{c.date}: {KID_DISPLAY[c.kid] || c.kid} covers for {KID_DISPLAY[c.absent] || c.absent}</p>
              ))}
              {result.coverage.length > 5 && <p>...and {result.coverage.length - 5} more</p>}
            </div>
          )}
          <button onClick={() => setResult(null)} className="text-xs text-blue-600 hover:text-blue-700">Set another</button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">Who&apos;s leaving?</p>
            <div className="flex flex-wrap gap-1.5">
              {[...ALL_KIDS].map(kid => (
                <button key={kid} onClick={() => toggleKid(kid)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${absentKids.includes(kid) ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {KID_DISPLAY[kid]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500">Start</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full border rounded-lg px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500">End</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full border rounded-lg px-2 py-1.5 text-sm" />
            </div>
          </div>
          <input value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Reason (e.g., Visiting Grandma in SD)"
            className="w-full border rounded-lg px-3 py-1.5 text-sm" />
          <button onClick={handleSubmit}
            disabled={submitting || absentKids.length === 0 || !startDate || !endDate}
            className="w-full bg-blue-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Setting coverage...</> : 'Set Coverage'}
          </button>
        </div>
      )}
    </div>
  )
}
