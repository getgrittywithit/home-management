'use client'

import { useState, useEffect, useCallback } from 'react'
import { ClipboardList, Save, TrendingUp } from 'lucide-react'

interface ScoreRow {
  id: string
  kid_name: string
  assessment_type: string
  week_start: string
  skill_area: string | null
  score_earned: string | null
  score_possible: string | null
  part_scores: any
  time_seconds: number | null
  problems_attempted: number | null
  problems_correct: number | null
  book_title: string | null
}

const KIDS = ['Amos', 'Ellie', 'Wyatt', 'Hannah']

function mondayOf(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const dow = d.getDay()
  const diff = (dow + 6) % 7
  d.setDate(d.getDate() - diff)
  return d.toLocaleDateString('en-CA')
}

export default function AssessmentScoreEntry() {
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
  const [weekStart, setWeekStart] = useState(mondayOf(todayStr))
  const [weekFocus, setWeekFocus] = useState<any>(null)
  const [scores, setScores] = useState<ScoreRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  // Per-kid vocab score form state
  const [vocabScores, setVocabScores] = useState<Record<string, { partA: string; partB: string; partC: string }>>({})

  const load = useCallback(async () => {
    setLoaded(false)
    const [focusRes, histRes] = await Promise.all([
      fetch(`/api/assessments?action=get_weekly_focus&week_start=${weekStart}`).then(r => r.json()),
      fetch(`/api/assessments?action=get_assessment_history&weeks=8`).then(r => r.json()),
    ])
    setWeekFocus(focusRes.focus || null)
    setScores(histRes.scores || [])

    // Pre-populate form with existing scores for this week (if any)
    const existing: Record<string, { partA: string; partB: string; partC: string }> = {}
    const thisWeekVocab = (histRes.scores || []).filter((s: ScoreRow) =>
      s.assessment_type === 'vocab' && s.week_start === weekStart
    )
    for (const kid of KIDS) {
      const found = thisWeekVocab.find((s: ScoreRow) => s.kid_name.toLowerCase() === kid.toLowerCase())
      const parts = found?.part_scores || {}
      existing[kid] = {
        partA: parts.part_a != null ? String(parts.part_a) : '',
        partB: parts.part_b != null ? String(parts.part_b) : '',
        partC: parts.part_c != null ? String(parts.part_c) : '',
      }
    }
    setVocabScores(existing)
    setLoaded(true)
  }, [weekStart])

  useEffect(() => { load() }, [load])

  const saveVocabScores = async () => {
    if (!weekFocus?.vocab_book_id) {
      setSaveMsg('No vocab book set for this week')
      setTimeout(() => setSaveMsg(null), 3000)
      return
    }
    setSaving(true)
    try {
      for (const kid of KIDS) {
        const entry = vocabScores[kid]
        if (!entry) continue
        const a = parseFloat(entry.partA) || 0
        const b = parseFloat(entry.partB) || 0
        const c = parseFloat(entry.partC) || 0
        // Skip kids with no entered score at all
        if (!entry.partA && !entry.partB && !entry.partC) continue
        const total = a + b + c
        await fetch('/api/assessments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save_assessment_score',
            kid_name: kid,
            assessment_type: 'vocab',
            week_start: weekStart,
            book_id: weekFocus.vocab_book_id,
            skill_area: weekFocus.vocab_set_name || null,
            score_earned: total,
            score_possible: 15,
            part_scores: { part_a: a, part_b: b, part_c: c },
          }),
        })
      }
      setSaveMsg('Scores saved ✓')
      await load()
    } catch (err: any) {
      setSaveMsg('Error — ' + (err.message || 'failed'))
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(null), 3000)
    }
  }

  // Build 8-week history matrix for vocab scores
  const weeks: string[] = []
  const today = new Date(todayStr + 'T12:00:00')
  const thisMon = new Date(mondayOf(todayStr) + 'T12:00:00')
  for (let i = 7; i >= 0; i--) {
    const d = new Date(thisMon)
    d.setDate(d.getDate() - i * 7)
    weeks.push(d.toLocaleDateString('en-CA'))
  }

  const historyByKid: Record<string, Record<string, ScoreRow | undefined>> = {}
  for (const kid of KIDS) {
    historyByKid[kid] = {}
    for (const w of weeks) {
      historyByKid[kid][w] = scores.find(s =>
        s.assessment_type === 'vocab' &&
        s.kid_name.toLowerCase() === kid.toLowerCase() &&
        s.week_start === w
      )
    }
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-indigo-600" />
          Assessment Scores
        </h3>
        <input
          type="date"
          value={weekStart}
          onChange={e => setWeekStart(mondayOf(e.target.value))}
          className="text-xs border rounded px-2 py-1"
        />
      </div>

      {!loaded ? (
        <div className="text-sm text-gray-400 text-center py-6">Loading…</div>
      ) : (
        <>
          {/* Vocab Score Entry */}
          <div className="border border-indigo-100 rounded-lg p-4 bg-indigo-50/30">
            <h4 className="font-semibold text-sm text-indigo-900 mb-1">
              Vocab Test — {weekFocus?.vocab_book_title || 'no book set'}
              {weekFocus?.vocab_set_name && ` · ${weekFocus.vocab_set_name}`}
            </h4>
            <p className="text-xs text-gray-500 mb-3">
              Enter each kid's score after the Friday test. Part A = 10, Part B + C = 5 each (adjust as needed).
            </p>
            <div className="space-y-2">
              {KIDS.map(kid => {
                const entry = vocabScores[kid] || { partA: '', partB: '', partC: '' }
                const total = (parseFloat(entry.partA) || 0) + (parseFloat(entry.partB) || 0) + (parseFloat(entry.partC) || 0)
                return (
                  <div key={kid} className="flex items-center gap-2 text-sm">
                    <span className="w-16 font-medium">{kid}</span>
                    <label className="text-xs text-gray-500">A</label>
                    <input
                      type="number"
                      step="0.5"
                      value={entry.partA}
                      onChange={e => setVocabScores(p => ({ ...p, [kid]: { ...entry, partA: e.target.value } }))}
                      className="w-14 border rounded px-2 py-1 text-sm"
                      placeholder="—"
                    />
                    <label className="text-xs text-gray-500">B</label>
                    <input
                      type="number"
                      step="0.5"
                      value={entry.partB}
                      onChange={e => setVocabScores(p => ({ ...p, [kid]: { ...entry, partB: e.target.value } }))}
                      className="w-14 border rounded px-2 py-1 text-sm"
                      placeholder="—"
                    />
                    <label className="text-xs text-gray-500">C</label>
                    <input
                      type="number"
                      step="0.5"
                      value={entry.partC}
                      onChange={e => setVocabScores(p => ({ ...p, [kid]: { ...entry, partC: e.target.value } }))}
                      className="w-14 border rounded px-2 py-1 text-sm"
                      placeholder="—"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      {total > 0 ? `${total}/15` : '—'}
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-end gap-3 mt-3 pt-3 border-t">
              {saveMsg && <span className="text-xs text-gray-600">{saveMsg}</span>}
              <button
                onClick={saveVocabScores}
                disabled={saving}
                className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Save Scores
              </button>
            </div>
          </div>

          {/* Vocab History — last 8 weeks */}
          <div>
            <h4 className="font-semibold text-sm text-gray-900 mb-2 flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-gray-500" /> Vocab Progress — last 8 weeks
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1.5 pr-2">Kid</th>
                    {weeks.map(w => (
                      <th key={w} className="text-center py-1.5 px-1 font-normal text-gray-500">
                        {new Date(w + 'T12:00:00').toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {KIDS.map(kid => (
                    <tr key={kid} className="border-b border-gray-50">
                      <td className="py-1.5 pr-2 font-medium">{kid}</td>
                      {weeks.map(w => {
                        const row = historyByKid[kid][w]
                        if (!row) return <td key={w} className="text-center text-gray-300">—</td>
                        const earned = parseFloat(row.score_earned || '0')
                        const possible = parseFloat(row.score_possible || '15')
                        return (
                          <td key={w} className="text-center font-medium">
                            {earned}/{possible}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
