'use client'

import { useState, useEffect } from 'react'
import { Pill, CheckCircle2, XCircle } from 'lucide-react'

const MED_KIDS = ['amos', 'wyatt']

export default function MedStatusCard() {
  const [status, setStatus] = useState<Record<string, { am: boolean; pm: boolean }>>({})
  const [loading, setLoading] = useState(true)
  const [centralHour, setCentralHour] = useState(0)

  useEffect(() => {
    const hour = parseInt(
      new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Chicago' }).format(new Date())
    )
    setCentralHour(hour)

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
    Promise.all(
      MED_KIDS.map(async kid => {
        try {
          const res = await fetch(`/api/health-hub?action=get_daily_med_status&kid_name=${kid}&date=${today}`)
          const data = await res.json()
          return [kid, { am: !!data?.am_taken, pm: !!data?.pm_taken }] as const
        } catch {
          return [kid, { am: false, pm: false }] as const
        }
      })
    ).then(entries => {
      setStatus(Object.fromEntries(entries))
      setLoading(false)
    })
  }, [])

  if (loading) return null

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 mb-3">
        <Pill className="w-4 h-4 text-blue-500" /> Meds Today
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {MED_KIDS.map(kid => {
          const s = status[kid] || { am: false, pm: false }
          const cap = kid.charAt(0).toUpperCase() + kid.slice(1)
          return (
            <div key={kid} className="space-y-1">
              <p className="font-medium text-sm">{cap}</p>
              <div className="flex items-center gap-2 text-xs">
                {s.am ? (
                  <span className="text-green-600 flex items-center gap-0.5"><CheckCircle2 className="w-3.5 h-3.5" /> AM Focalin</span>
                ) : (
                  <span className="text-red-500 flex items-center gap-0.5">
                    <XCircle className="w-3.5 h-3.5" /> AM Focalin
                    {centralHour >= 10 && <span className="text-red-600 font-medium animate-pulse ml-1">Overdue</span>}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs">
                {s.pm ? (
                  <span className="text-green-600 flex items-center gap-0.5"><CheckCircle2 className="w-3.5 h-3.5" /> PM Clonidine</span>
                ) : (
                  <span className="text-gray-400 flex items-center gap-0.5">
                    <XCircle className="w-3.5 h-3.5" /> PM Clonidine
                    {centralHour >= 21 && <span className="text-red-500 font-medium animate-pulse ml-1">Overdue</span>}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
