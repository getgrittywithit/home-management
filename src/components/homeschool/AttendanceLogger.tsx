'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle, Activity, FileText, XCircle, Loader2, Clock } from 'lucide-react'

interface AttendanceRow {
  kid_name: string
  attendance_date: string
  status: 'present' | 'absent' | 'sick' | 'excused'
  source: string
  notes: string | null
}

interface DailySummary {
  kid_name: string
  total: number
  completed: number
}

const HOMESCHOOL_KIDS = ['amos', 'ellie', 'wyatt', 'hannah']

const STATUS_META: Record<string, { label: string; emoji: string; color: string; activeColor: string }> = {
  present: { label: 'Present',  emoji: '✅', color: 'bg-green-50 text-green-700 border-green-200', activeColor: 'bg-green-500 text-white border-green-600' },
  sick:    { label: 'Sick',     emoji: '🤒', color: 'bg-amber-50 text-amber-700 border-amber-200', activeColor: 'bg-amber-500 text-white border-amber-600' },
  excused: { label: 'Excused',  emoji: '📝', color: 'bg-blue-50 text-blue-700 border-blue-200',    activeColor: 'bg-blue-500 text-white border-blue-600' },
  absent:  { label: 'Absent',   emoji: '❌', color: 'bg-red-50 text-red-700 border-red-200',       activeColor: 'bg-red-500 text-white border-red-600' },
}

function todayIso(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
}

function titleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function AttendanceLogger() {
  const [date, setDate] = useState<string>(todayIso())
  const [attendance, setAttendance] = useState<Record<string, AttendanceRow>>({})
  const [summary, setSummary] = useState<Record<string, DailySummary>>({})
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  const flashToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 2000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Load attendance for each kid (the teacher API filters by kid, so we loop)
      const attMap: Record<string, AttendanceRow> = {}
      await Promise.all(
        HOMESCHOOL_KIDS.map(async (kid) => {
          try {
            const res = await fetch(`/api/parent/teacher?action=get_attendance&kid_name=${kid}`)
            const json = await res.json()
            const row = (json.attendance || []).find((r: any) => r.attendance_date?.slice(0, 10) === date)
            if (row) attMap[kid] = { ...row, kid_name: kid, attendance_date: row.attendance_date.slice(0, 10) }
          } catch { /* skip */ }
        })
      )
      setAttendance(attMap)

      // Daily task completion summary for auto-detect
      try {
        const sumRes = await fetch(`/api/homeschool/daily?action=daily_summary&date=${date}`)
        const sumJson = await sumRes.json()
        const byKid: Record<string, DailySummary> = {}
        for (const row of sumJson.per_kid || []) byKid[row.kid_name] = row
        setSummary(byKid)
      } catch { /* skip */ }
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => { load() }, [load])

  const logAttendance = async (kid: string, status: string) => {
    const prevStatus = attendance[kid]?.status
    // Optimistic update
    setAttendance((prev) => ({
      ...prev,
      [kid]: { kid_name: kid, attendance_date: date, status: status as any, source: 'manual', notes: null },
    }))

    try {
      const res = await fetch('/api/parent/teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'log_attendance',
          kid_name: kid,
          attendance_date: date,
          status,
        }),
      })
      if (!res.ok) throw new Error('failed')
      flashToast(`${titleCase(kid)}: ${STATUS_META[status].label}`)
    } catch {
      // Revert on failure
      setAttendance((prev) => {
        const copy = { ...prev }
        if (prevStatus) copy[kid] = { ...copy[kid], status: prevStatus as any }
        else delete copy[kid]
        return copy
      })
      flashToast('Save failed')
    }
  }

  // Auto-detect: if a kid completed ≥1 task today and has no attendance record, suggest Present
  const autoDetectStatus = (kid: string): string | null => {
    const row = attendance[kid]
    if (row) return null
    const s = summary[kid]
    if (s && s.completed > 0) return 'present'
    return null
  }

  const applyAutoDetect = async () => {
    const toApply = HOMESCHOOL_KIDS.filter((k) => autoDetectStatus(k) === 'present')
    if (toApply.length === 0) {
      flashToast('Nothing to auto-detect')
      return
    }
    for (const kid of toApply) await logAttendance(kid, 'present')
    flashToast(`Auto-marked ${toApply.length} kid${toApply.length > 1 ? 's' : ''} present`)
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      <div className="rounded-xl border-2 border-teal-200 bg-teal-50/40 p-4">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <Activity className="w-5 h-5 text-teal-700" />
          <h3 className="text-sm font-bold text-teal-900">Daily Attendance</h3>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-2 py-1 border border-gray-200 rounded text-xs bg-white"
          />
          <button
            onClick={() => setDate(todayIso())}
            className="text-xs text-teal-700 hover:text-teal-900 font-medium"
          >
            Today
          </button>
          <button
            onClick={applyAutoDetect}
            disabled={loading}
            className="ml-auto inline-flex items-center gap-1 text-xs bg-white border border-teal-200 text-teal-700 px-2.5 py-1.5 rounded-lg hover:bg-teal-50 disabled:opacity-50"
          >
            <Clock className="w-3 h-3" /> Auto-detect from tasks
          </button>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-8">
            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
          </div>
        ) : (
          <div className="space-y-2">
            {HOMESCHOOL_KIDS.map((kid) => {
              const row = attendance[kid]
              const auto = autoDetectStatus(kid)
              const sum = summary[kid]
              return (
                <div key={kid} className="bg-white rounded-lg border border-gray-200 p-3">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-gray-900 capitalize w-16">{kid}</span>
                    {sum && sum.total > 0 && (
                      <span className="text-[10px] text-gray-500">
                        {sum.completed}/{sum.total} tasks done
                      </span>
                    )}
                    {auto && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-700 rounded">
                        auto: present
                      </span>
                    )}
                    {row?.source === 'sick_log' && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded">
                        from sick log
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(['present', 'sick', 'excused', 'absent'] as const).map((s) => {
                      const meta = STATUS_META[s]
                      const active = row?.status === s
                      return (
                        <button
                          key={s}
                          onClick={() => logAttendance(kid, s)}
                          className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border-2 transition-colors ${
                            active ? meta.activeColor : meta.color + ' hover:brightness-95'
                          }`}
                        >
                          <span>{meta.emoji}</span>
                          <span>{meta.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <p className="text-[10px] text-gray-500 mt-3 italic">
          Auto-detect marks any kid with ≥1 completed task as Present. Sick log (D37) auto-fills this too.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4 text-gray-500" />
          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Legend</h4>
        </div>
        <div className="flex flex-wrap gap-3 text-[11px] text-gray-600">
          <span className="inline-flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" /> Present — school day counted</span>
          <span className="inline-flex items-center gap-1"><span>🤒</span> Sick — triggers med pause + makeup work</span>
          <span className="inline-flex items-center gap-1"><FileText className="w-3 h-3 text-blue-500" /> Excused — planned absence</span>
          <span className="inline-flex items-center gap-1"><XCircle className="w-3 h-3 text-red-500" /> Absent — unplanned</span>
        </div>
      </div>
    </div>
  )
}
