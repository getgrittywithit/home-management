'use client'

import { useState, useEffect } from 'react'
import { Loader2, Users } from 'lucide-react'

const MONTHS = ['August','September','October','November','December','January','February','March','April','May','June','July'] as const
const MONTH_SHORT = ['Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun','Jul']
const SUBJECTS = ['ELAR','Math','Science','Social Studies','Enrichment','Art','Music','PE','Life Skills'] as const

const SUBJECT_COLOR: Record<string, string> = {
  'ELAR': 'bg-blue-200 text-blue-800 border-blue-300',
  'Math': 'bg-emerald-200 text-emerald-800 border-emerald-300',
  'Science': 'bg-purple-200 text-purple-800 border-purple-300',
  'Social Studies': 'bg-amber-200 text-amber-800 border-amber-300',
  'Enrichment': 'bg-pink-200 text-pink-800 border-pink-300',
  'Art': 'bg-rose-200 text-rose-800 border-rose-300',
  'Music': 'bg-indigo-200 text-indigo-800 border-indigo-300',
  'PE': 'bg-lime-200 text-lime-800 border-lime-300',
  'Life Skills': 'bg-teal-200 text-teal-800 border-teal-300',
}

const KID_COLOR: Record<string, string> = {
  amos: 'bg-blue-300 text-blue-900 border-blue-400',
  ellie: 'bg-pink-300 text-pink-900 border-pink-400',
  wyatt: 'bg-emerald-300 text-emerald-900 border-emerald-400',
  hannah: 'bg-amber-300 text-amber-900 border-amber-400',
}

interface MapUnit {
  id: string
  kid_name: string
  month: string
  subject: string
  unit_title: string
  duration_weeks: number | null
  themes: string[]
  pedagogy_tags: string[]
}

interface Props {
  schoolYear: string
  selectedKid: string
  allKidsMode: boolean
  onOpenUnit: (unitId: string) => void
  onAddUnit: (month: string, subject: string) => void
}

export default function YearMapView({ schoolYear, selectedKid, allKidsMode, onOpenUnit, onAddUnit }: Props) {
  const [units, setUnits] = useState<MapUnit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const kidParam = allKidsMode ? '' : `&kid_name=${selectedKid}`
    fetch(`/api/curriculum-planner?action=get_year_map${kidParam}&school_year=${schoolYear}`)
      .then(r => r.json())
      .then(d => setUnits(d.units || []))
      .catch(() => setUnits([]))
      .finally(() => setLoading(false))
  }, [schoolYear, selectedKid, allKidsMode])

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-purple-500" /></div>
  }

  // Build lookup: subject × month → units[]
  const lookup = new Map<string, MapUnit[]>()
  for (const u of units) {
    const key = `${u.subject}::${u.month}`
    if (!lookup.has(key)) lookup.set(key, [])
    lookup.get(key)!.push(u)
  }

  return (
    <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 text-sm">
          Year Map {allKidsMode ? '(All Kids)' : ''}
        </h3>
        {allKidsMode && (
          <div className="flex gap-2">
            {Object.entries(KID_COLOR).map(([kid, cls]) => (
              <span key={kid} className={`text-[10px] px-1.5 py-0.5 rounded border ${cls}`}>
                {kid.charAt(0).toUpperCase() + kid.slice(1)}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Header row */}
          <div className="grid grid-cols-[120px_repeat(12,1fr)] border-b">
            <div className="p-2 text-xs font-semibold text-slate-500 bg-slate-50 border-r">Subject</div>
            {MONTH_SHORT.map((m, i) => (
              <div key={m} className={`p-2 text-xs font-semibold text-center border-r ${
                i < 5 ? 'text-slate-600' : i < 8 ? 'text-blue-600' : 'text-emerald-600'
              } bg-slate-50`}>
                {m}
                <div className="text-[9px] font-normal text-slate-400">
                  {i < 3 ? 'Q1' : i < 6 ? 'Q2' : i < 9 ? 'Q3' : 'Q4'}
                </div>
              </div>
            ))}
          </div>

          {/* Subject rows */}
          {SUBJECTS.map(subject => (
            <div key={subject} className="grid grid-cols-[120px_repeat(12,1fr)] border-b last:border-b-0 group">
              <div className="p-2 text-xs font-medium text-slate-700 bg-slate-50 border-r flex items-start">
                {subject}
              </div>
              {MONTHS.map((month, mi) => {
                const key = `${subject}::${month}`
                const cellUnits = lookup.get(key) || []
                const isEmpty = cellUnits.length === 0

                return (
                  <div
                    key={month}
                    className={`p-1 border-r min-h-[48px] ${isEmpty ? 'hover:bg-purple-50 cursor-pointer' : ''} transition-colors`}
                    onClick={() => isEmpty ? onAddUnit(month, subject) : undefined}
                    title={isEmpty ? `Add unit: ${subject} - ${month}` : undefined}
                  >
                    {cellUnits.map(u => {
                      const colorClass = allKidsMode
                        ? KID_COLOR[u.kid_name] || 'bg-gray-200 text-gray-700 border-gray-300'
                        : SUBJECT_COLOR[subject] || 'bg-gray-200 text-gray-700 border-gray-300'

                      return (
                        <button
                          key={u.id}
                          onClick={e => { e.stopPropagation(); onOpenUnit(u.id) }}
                          className={`w-full text-left px-1.5 py-1 rounded border text-[10px] leading-tight font-medium mb-0.5 truncate hover:opacity-80 transition-opacity ${colorClass}`}
                          title={`${u.unit_title}${allKidsMode ? ` (${u.kid_name})` : ''} — ${u.duration_weeks || 4}wk`}
                        >
                          {u.unit_title}
                          {allKidsMode && <span className="opacity-60 ml-0.5">({u.kid_name.charAt(0).toUpperCase()})</span>}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {units.length === 0 && (
        <div className="text-center py-8 text-sm text-slate-400">
          No units planned yet. Click any cell to add your first unit.
        </div>
      )}
    </div>
  )
}
