'use client'

import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, Calendar, Loader2 } from 'lucide-react'
import { ALL_KIDS, KID_DISPLAY, KID_SCHOOL_TYPE } from '@/lib/constants'
import { MODE_EFFECTS } from '@/lib/dayModeTypes'
import { parseDateLocal } from '@/lib/date-local'

const MODE_PILLS: Record<string, { label: string; emoji: string; bg: string }> = {
  normal:     { label: 'Normal',     emoji: '📋', bg: 'bg-gray-100 text-gray-700' },
  fun_friday: { label: 'Fun Fri',    emoji: '🌟', bg: 'bg-yellow-100 text-yellow-800' },
  off_day:    { label: 'Off',        emoji: '🌿', bg: 'bg-green-100 text-green-800' },
  sick_day:   { label: 'Sick',       emoji: '💛', bg: 'bg-amber-100 text-amber-800' },
  half_day:   { label: 'Half',       emoji: '⏰', bg: 'bg-blue-100 text-blue-800' },
  vacation:   { label: 'Vacation',   emoji: '🏖', bg: 'bg-cyan-100 text-cyan-800' },
  field_trip: { label: 'Field Trip', emoji: '🚐', bg: 'bg-purple-100 text-purple-800' },
  work_day:   { label: 'Work Day',   emoji: '🔨', bg: 'bg-orange-100 text-orange-800' },
  catch_up:   { label: 'Catch-Up',   emoji: '📚', bg: 'bg-indigo-100 text-indigo-800' },
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const ALL_MODES = Object.keys(MODE_PILLS)

function getMonday(offset: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offset * 7)
  d.setHours(12, 0, 0, 0)
  return d
}

function formatDate(d: Date): string { return d.toLocaleDateString('en-CA') }

interface Props {
  onClose: () => void
}

export default function PlanTheWeekView({ onClose }: Props) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [modes, setModes] = useState<Record<string, string>>({})
  const [original, setOriginal] = useState<Record<string, string>>({})
  const [bisd, setBisd] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editCell, setEditCell] = useState<string | null>(null)
  const [bulkConfirm, setBulkConfirm] = useState<{ type: 'col' | 'row'; key: string; mode: string } | null>(null)

  const monday = getMonday(weekOffset)
  const dates = DAYS.map((_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return formatDate(d)
  })
  const start = dates[0]
  const end = dates[6]

  const fetchData = async () => {
    setLoading(true)
    const [modesRes, bisdRes] = await Promise.all([
      fetch(`/api/day-mode?action=get_range&start=${start}&end=${end}`).then(r => r.json()).catch(() => ({ modes: [] })),
      fetch(`/api/day-mode?action=suggest_from_bisd&start=${start}&end=${end}`).then(r => r.json()).catch(() => ({ suggestions: [] })),
    ])

    const modeMap: Record<string, string> = {}
    for (const m of (modesRes.modes || [])) {
      if (m.kid_name && m.status === 'active') {
        modeMap[`${m.kid_name}-${m.date?.split('T')[0] || m.date}`] = m.mode_type
      }
    }
    setModes(modeMap)
    setOriginal({ ...modeMap })
    setBisd(bisdRes.suggestions || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [weekOffset])

  const cellKey = (kid: string, date: string) => `${kid}-${date}`
  const getMode = (kid: string, date: string) => modes[cellKey(kid, date)] || 'normal'

  const setCell = (kid: string, date: string, mode: string) => {
    setModes(prev => ({ ...prev, [cellKey(kid, date)]: mode }))
    setEditCell(null)
  }

  const bulkSetCol = (date: string, mode: string) => {
    const updated = { ...modes }
    for (const kid of [...ALL_KIDS]) { updated[cellKey(kid, date)] = mode }
    setModes(updated)
    setBulkConfirm(null)
  }

  const bulkSetRow = (kid: string, mode: string) => {
    const updated = { ...modes }
    for (const date of dates) { updated[cellKey(kid, date)] = mode }
    setModes(updated)
    setBulkConfirm(null)
  }

  const hasChanges = JSON.stringify(modes) !== JSON.stringify(original)

  const applyChanges = async () => {
    setSaving(true)
    const changes: { kid: string; date: string; mode: string }[] = []
    for (const kid of [...ALL_KIDS]) {
      for (const date of dates) {
        const key = cellKey(kid, date)
        if (modes[key] && modes[key] !== (original[key] || 'normal')) {
          changes.push({ kid, date, mode: modes[key] })
        }
      }
    }

    for (const c of changes) {
      await fetch('/api/day-mode', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_mode', kid_name: c.kid, date: c.date, mode_type: c.mode, set_by: 'parent' }),
      }).catch(() => {})
    }

    setOriginal({ ...modes })
    setSaving(false)
  }

  const applyBisdSuggestion = async (suggestion: any) => {
    for (const kid of suggestion.affects_kids) {
      setCell(kid, suggestion.date, suggestion.suggested_mode)
    }
  }

  const bisdDates = new Set(bisd.map((b: any) => b.date))

  if (loading) return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-blue-500" />
            <h2 className="font-bold text-gray-900">Plan the Week</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setWeekOffset(w => w - 1)} className="p-1.5 hover:bg-gray-100 rounded"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setWeekOffset(0)} className="text-xs text-blue-600 hover:text-blue-700 px-2">Today</button>
            <button onClick={() => setWeekOffset(w => w + 1)} className="p-1.5 hover:bg-gray-100 rounded"><ChevronRight className="w-4 h-4" /></button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded ml-2"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="p-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left py-2 pr-2 text-gray-500 w-20">Kid</th>
                {dates.map((date, i) => (
                  <th key={date} className="text-center py-2 px-1 min-w-[80px]">
                    <button onClick={() => setBulkConfirm({ type: 'col', key: date, mode: 'off_day' })}
                      className="hover:bg-gray-100 rounded px-1 py-0.5 w-full">
                      <span className="block text-gray-500">{DAYS[i]}</span>
                      <span className="block text-gray-400 text-[10px]">{parseDateLocal(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      {bisdDates.has(date) && <span className="text-[10px]" title="BISD event">🏫</span>}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...ALL_KIDS].map(kid => (
                <tr key={kid} className="border-t border-gray-100">
                  <td className="py-1.5 pr-2">
                    <button onClick={() => setBulkConfirm({ type: 'row', key: kid, mode: 'off_day' })}
                      className="text-left hover:text-blue-600 font-medium text-gray-800">
                      {KID_DISPLAY[kid]}
                      <span className="text-[9px] text-gray-400 ml-0.5">{KID_SCHOOL_TYPE[kid] === 'public' ? '🏫' : ''}</span>
                    </button>
                  </td>
                  {dates.map(date => {
                    const mode = getMode(kid, date)
                    const pill = MODE_PILLS[mode] || MODE_PILLS.normal
                    const isEditing = editCell === cellKey(kid, date)
                    const changed = mode !== (original[cellKey(kid, date)] || 'normal')
                    return (
                      <td key={date} className="py-1.5 px-0.5 text-center relative">
                        {isEditing ? (
                          <select value={mode} onChange={e => setCell(kid, date, e.target.value)} autoFocus
                            onBlur={() => setEditCell(null)}
                            className="text-[10px] border rounded px-1 py-1 w-full">
                            {ALL_MODES.map(m => <option key={m} value={m}>{MODE_PILLS[m].emoji} {MODE_PILLS[m].label}</option>)}
                          </select>
                        ) : (
                          <button onClick={() => setEditCell(cellKey(kid, date))}
                            className={`${pill.bg} rounded-full px-1.5 py-0.5 text-[10px] font-medium w-full truncate ${changed ? 'ring-2 ring-blue-400' : ''}`}>
                            {pill.emoji} {pill.label}
                          </button>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {bisd.length > 0 && (
          <div className="px-4 pb-2">
            <p className="text-xs text-gray-500 font-semibold mb-1.5">BISD Calendar</p>
            <div className="space-y-1">
              {bisd.map((s: any, i: number) => (
                <div key={i} className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-1.5 text-xs">
                  <span className="text-blue-800">🏫 {s.title} ({parseDateLocal(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})</span>
                  <button onClick={() => applyBisdSuggestion(s)} className="text-blue-600 font-medium hover:text-blue-700">Apply</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {bulkConfirm && (
          <div className="fixed inset-0 bg-black/30 z-[60] flex items-center justify-center" onClick={() => setBulkConfirm(null)}>
            <div className="bg-white rounded-xl p-5 shadow-xl max-w-sm" onClick={e => e.stopPropagation()}>
              <p className="text-sm text-gray-900 font-medium mb-3">
                Apply <span className="font-bold">Off Day</span> to {bulkConfirm.type === 'col' ? `all 6 kids on ${parseDateLocal(bulkConfirm.key).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}` : `${KID_DISPLAY[bulkConfirm.key]}'s whole week`}?
              </p>
              <div className="flex gap-2">
                <select value={bulkConfirm.mode} onChange={e => setBulkConfirm({ ...bulkConfirm, mode: e.target.value })}
                  className="text-xs border rounded px-2 py-1.5 flex-1">
                  {ALL_MODES.map(m => <option key={m} value={m}>{MODE_PILLS[m].emoji} {MODE_PILLS[m].label}</option>)}
                </select>
                <button onClick={() => bulkConfirm.type === 'col' ? bulkSetCol(bulkConfirm.key, bulkConfirm.mode) : bulkSetRow(bulkConfirm.key, bulkConfirm.mode)}
                  className="bg-blue-500 text-white px-4 py-1.5 rounded text-xs font-medium hover:bg-blue-600">Apply</button>
                <button onClick={() => setBulkConfirm(null)} className="text-gray-500 text-xs">Cancel</button>
              </div>
            </div>
          </div>
        )}

        <div className="sticky bottom-0 bg-white border-t p-3 flex items-center justify-between">
          <span className="text-xs text-gray-400">{hasChanges ? 'Unsaved changes' : 'No changes'}</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="text-xs text-gray-500 px-3 py-1.5">Cancel</button>
            <button onClick={applyChanges} disabled={!hasChanges || saving}
              className="bg-blue-500 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-600 disabled:opacity-50">
              {saving ? 'Saving...' : 'Apply Schedule'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
