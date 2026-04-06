'use client'

import { useState, useEffect } from 'react'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function WeeklyPrintable() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/family-huddle', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'generate_printable' }),
    })
      .then(r => r.json())
      .then(d => setData(d.printable))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>
  if (!data) return <div className="p-8 text-center text-gray-400">Could not load weekly data.</div>

  const zoneAssignments = data.zone_recap?.assignments || []
  const mealPlan = data.meal_plan || []
  const belle = data.belle_this_week || {}
  const laundry = data.laundry || {}
  const dishes = data.dishes || {}

  const mealByDay: Record<string, any> = {}
  mealPlan.forEach((m: any) => { mealByDay[m.day] = m })

  return (
    <div className="max-w-[900px] mx-auto p-6 font-serif text-[13px] leading-snug text-gray-900 print:p-4 print:text-[11px]">
      <style>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
          .print-page { page-break-after: auto; }
        }
        @page { margin: 0.5in; size: letter; }
      `}</style>

      {/* Print Button */}
      <div className="no-print mb-4 text-center">
        <button onClick={() => window.print()}
          className="px-6 py-2 bg-indigo-500 text-white rounded-lg font-sans font-medium hover:bg-indigo-600">
          Print This Page
        </button>
      </div>

      {/* Family Challenge Banner */}
      {data.family_challenge && (
        <div className="mb-4 rounded-lg px-4 py-3 text-center" style={{ backgroundColor: '#fef3c7', border: '2px solid #c47c2b' }}>
          <p className="text-xs font-semibold uppercase text-gray-600 mb-0.5">This Week&apos;s Family Challenge</p>
          <p className="font-bold text-gray-900">{data.family_challenge}</p>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold" style={{ color: '#1e2d4d' }}>Moses Family &mdash; Week at a Glance</h1>
        <p className="text-sm text-gray-600 mt-1">
          {data.week_label} &bull; Zone Week {data.zone_recap?.week_num || '?'}
          {data.meal_week && ` &bull; Meal Week ${data.meal_week}`}
        </p>
        <div className="mt-2 border-t-2" style={{ borderColor: '#c47c2b' }} />
      </div>

      {/* Main Day Table */}
      <table className="w-full border-collapse mb-4">
        <thead>
          <tr style={{ backgroundColor: '#1e2d4d', color: 'white' }}>
            <th className="px-2 py-1.5 text-left text-xs font-semibold w-24">Day</th>
            <th className="px-2 py-1.5 text-left text-xs font-semibold">Dinner Manager</th>
            <th className="px-2 py-1.5 text-left text-xs font-semibold">Laundry</th>
            <th className="px-2 py-1.5 text-left text-xs font-semibold w-32">Notes</th>
          </tr>
        </thead>
        <tbody>
          {DAYS.map((day, i) => {
            const meal = mealByDay[day]
            const isWeekend = i >= 5
            return (
              <tr key={day} className={`border-b ${isWeekend ? 'bg-green-50' : ''}`}>
                <td className="px-2 py-1.5 font-semibold">
                  {day.slice(0, 3)}
                  {i === 5 && <span className="text-[10px] text-gray-500 block">{'\u2193'}Weekend</span>}
                </td>
                <td className="px-2 py-1.5">
                  {meal ? (
                    <span>
                      <span className="font-semibold">{meal.manager}</span>
                      <span className="text-gray-600"> &mdash; {meal.theme}</span>
                      {meal.meal && <span className="text-gray-400 italic"> ({meal.meal})</span>}
                    </span>
                  ) : <span className="text-gray-400">&mdash;</span>}
                </td>
                <td className="px-2 py-1.5 text-gray-600">{laundry[day] || '\u2014'}</td>
                <td className="px-2 py-1.5 text-gray-400 text-xs">
                  {i === 5 && 'Weekly deep clean'}
                  {i === 0 && 'Trash out'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Bottom 3-Column Grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Column 1: Zones */}
        <div className="border rounded p-3">
          <h3 className="font-bold text-xs uppercase mb-2" style={{ color: '#1e2d4d' }}>
            Zones This Week (Wk {data.zone_recap?.week_num})
          </h3>
          <div className="space-y-1">
            {zoneAssignments.map((a: any) => (
              <div key={a.kid} className="flex justify-between text-xs">
                <span className="font-medium">{a.kid}</span>
                <span className="text-gray-600">{a.zone}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Belle Care */}
        <div className="border rounded p-3">
          <h3 className="font-bold text-xs uppercase mb-2" style={{ color: '#1e2d4d' }}>Belle Care</h3>
          <div className="space-y-0.5 text-xs">
            {['monday','tuesday','wednesday','thursday','friday'].map(day => (
              <div key={day} className="flex justify-between">
                <span className="capitalize text-gray-500">{day.slice(0, 3)}</span>
                <span>{belle[day]} (AM+PM)</span>
              </div>
            ))}
            <div className="flex justify-between font-bold mt-1 pt-1 border-t">
              <span>Sat &amp; Sun</span>
              <span>{belle.weekend_owner}</span>
            </div>
            {belle.grooming && (belle.grooming.bath || belle.grooming.nails) && (
              <div className="mt-1 text-[10px] text-gray-500">
                {belle.grooming.bath && <span>Bath Sat </span>}
                {belle.grooming.nails && <span>Nails Sun</span>}
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Dishes & Cleanup */}
        <div className="border rounded p-3">
          <h3 className="font-bold text-xs uppercase mb-2" style={{ color: '#1e2d4d' }}>Dishes &amp; Cleanup</h3>
          <div className="space-y-0.5 text-xs">
            <div className="flex justify-between"><span className="text-gray-500">Breakfast</span><span>{dishes.breakfast}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Lunch</span><span>{dishes.lunch}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Dinner cleanup</span><span>{dishes.dinner_cleanup}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Deep clean</span><span>{dishes.deep_clean}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Trash</span><span>{dishes.trash}</span></div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 text-center text-[10px] text-gray-400 border-t pt-2" style={{ borderColor: '#c47c2b' }}>
        Generated by Family Ops &bull; family-ops.grittysystems.com
      </div>
    </div>
  )
}
