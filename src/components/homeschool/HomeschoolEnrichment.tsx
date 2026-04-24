'use client'

import { useState, useEffect } from 'react'
import { StudentData } from './types'
import ParentEnrichmentSummary from '../ParentEnrichmentSummary'
import FinancialLiteracyPanel from '../FinancialLiteracyPanel'
import { Plus, X, Sparkles } from 'lucide-react'

interface Props {
  students: StudentData[]
}

// Aligned with the seeded enrichment_activities library (subjects column).
// 'financial_literacy' is rendered as its own sub-view tab, so it's filtered out of
// the generic category grid below.
const CATEGORIES = [
  { id: 'elar', label: 'Reading / ELAR', icon: '📖' },
  { id: 'math', label: 'Math', icon: '🔢' },
  { id: 'science', label: 'Science', icon: '🔬' },
  { id: 'social_studies', label: 'Social Studies', icon: '🌍' },
  { id: 'financial_literacy', label: 'Financial Literacy', icon: '💰' },
  { id: 'art', label: 'Art & Creativity', icon: '🎨' },
  { id: 'pe_outdoor', label: 'PE / Outdoor', icon: '🏃' },
  { id: 'life_skills', label: 'Life Skills', icon: '🧺' },
]

const ALL_KIDS = [
  { id: 'amos', label: 'Amos' }, { id: 'ellie', label: 'Ellie' },
  { id: 'wyatt', label: 'Wyatt' }, { id: 'hannah', label: 'Hannah' },
  { id: 'zoey', label: 'Zoey' }, { id: 'kaylee', label: 'Kaylee' },
]

export default function HomeschoolEnrichment({ students }: Props) {
  const [view, setView] = useState<'overview' | 'financial'>('overview')
  const [showLogForm, setShowLogForm] = useState(false)
  const [activities, setActivities] = useState<any[]>([])
  const [monthlySummary, setMonthlySummary] = useState<any[]>([])
  const [logKid, setLogKid] = useState('amos')
  const [logSubject, setLogSubject] = useState('art')
  const [logTitle, setLogTitle] = useState('')
  const [logDesc, setLogDesc] = useState('')
  const [logDuration, setLogDuration] = useState('')
  const [saving, setSaving] = useState(false)
  // Library = curated enrichment_activities rows. Logs = kid_activity_log entries.
  const [recentLogs, setRecentLogs] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/enrichment?action=get_activities').then(r => r.json()).then(d => setActivities(d.activities || [])).catch(() => {})
    fetch('/api/enrichment?action=get_monthly_summary').then(r => r.json()).then(d => setMonthlySummary(d.summary || [])).catch(() => {})
    fetch('/api/enrichment?action=get_recent_all_kids').then(r => r.json()).then(d => setRecentLogs(d.activities || [])).catch(() => {})
  }, [])

  const handleLogActivity = async () => {
    if (!logTitle.trim()) return
    setSaving(true)
    const res = await fetch('/api/enrichment', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'log_activity',
        kid_name: logKid,
        subject: logSubject,
        title: logTitle.trim(),
        notes: logDesc.trim() || null,
        duration_minutes: logDuration ? parseInt(logDuration) : 0,
      }),
    }).then(r => r.json()).catch(() => null)
    if (res?.log) {
      // Prepend a shaped row compatible with the Recent Activities display.
      setRecentLogs(prev => [{
        log_id: res.log.id, kid_name: res.log.child_name, subject: res.log.activity_type,
        title: logTitle.trim(), duration_minutes: res.log.duration_minutes,
        gem_reward: res.gems_earned, log_date: res.log.log_date,
      }, ...prev])
    }
    setLogTitle(''); setLogDesc(''); setLogDuration(''); setShowLogForm(false); setSaving(false)
  }

  return (
    <div className="space-y-6">
      {/* Tab toggle */}
      <div className="flex gap-2">
        <button onClick={() => setView('overview')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${view === 'overview' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
          All Enrichment
        </button>
        <button onClick={() => setView('financial')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${view === 'financial' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
          💰 Financial Literacy
        </button>
        <button onClick={() => setShowLogForm(true)}
          className="ml-auto flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600">
          <Plus className="w-4 h-4" /> Log Activity
        </button>
      </div>

      {view === 'financial' ? (
        <>
          <ParentEnrichmentSummary />
          <div className="grid gap-4 md:grid-cols-2">
            {/* Show FL cards for ALL 6 kids (homeschool + public school) */}
            {[...students.map(s => s.name), ...['Zoey', 'Kaylee'].filter(k => !students.some(s => s.name === k))].map(name => (
              <FinancialLiteracyPanel key={name} kidName={name} isParent={true} />
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Log Activity Form */}
          {showLogForm && (
            <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900 text-sm">Log Enrichment Activity (+2 gems)</h4>
                <button onClick={() => setShowLogForm(false)}><X className="w-4 h-4 text-gray-400" /></button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select value={logKid} onChange={e => setLogKid(e.target.value)} className="border rounded px-2 py-1.5 text-sm">
                  {ALL_KIDS.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
                </select>
                <select value={logSubject} onChange={e => setLogSubject(e.target.value)} className="border rounded px-2 py-1.5 text-sm">
                  {CATEGORIES.filter(c => c.id !== 'financial_literacy').map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                  ))}
                </select>
              </div>
              <input type="text" value={logTitle} onChange={e => setLogTitle(e.target.value)}
                placeholder="What did they do? (e.g., Watercolor painting)" className="w-full border rounded px-2 py-1.5 text-sm" />
              <div className="flex gap-2">
                <input type="number" value={logDuration} onChange={e => setLogDuration(e.target.value)}
                  placeholder="Minutes" className="w-24 border rounded px-2 py-1.5 text-sm" />
                <input type="text" value={logDesc} onChange={e => setLogDesc(e.target.value)}
                  placeholder="Description (optional)" className="flex-1 border rounded px-2 py-1.5 text-sm" />
              </div>
              <button onClick={handleLogActivity} disabled={!logTitle.trim() || saving}
                className="bg-emerald-500 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-emerald-600 disabled:opacity-50">
                {saving ? 'Saving...' : 'Log Activity'}
              </button>
            </div>
          )}

          {/* Categories Grid — counts come from library size per subject + month rollup from logs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {CATEGORIES.map(cat => {
              const catActivities = activities.filter((a: any) => a.subject === cat.id)
              const catSummary = monthlySummary.filter((s: any) => s.subject === cat.id)
              const totalMins = catSummary.reduce((s: number, r: any) => s + (Number(r.total_minutes) || 0), 0)
              return (
                <div key={cat.id} className="bg-white rounded-lg border shadow-sm p-4 text-center">
                  <span className="text-3xl block mb-2">{cat.icon}</span>
                  <h4 className="text-sm font-semibold text-gray-900">{cat.label}</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    {catActivities.length > 0 ? `${catActivities.length} in library` : 'No library items'}
                  </p>
                  {totalMins > 0 && <p className="text-xs text-emerald-600 font-medium mt-0.5">{totalMins} min this month</p>}
                </div>
              )
            })}
          </div>

          {/* Recent Activity Log — real completions from kid_activity_log */}
          <div className="bg-white rounded-lg border shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-emerald-500" /> Recent Activities
            </h3>
            {recentLogs.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No enrichment activities logged yet. Tap &quot;Log Activity&quot; to start!</p>
            ) : (
              <div className="space-y-2">
                {recentLogs.slice(0, 15).map((a: any) => {
                  const cat = CATEGORIES.find(c => c.id === a.subject)
                  const titleText = a.title || a.notes || a.subject || 'Enrichment activity'
                  return (
                    <div key={a.log_id} className="flex items-center gap-3 text-sm py-1.5 border-b border-gray-100 last:border-0">
                      <span className="text-lg">{cat?.icon || '🎯'}</span>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-gray-800">{titleText}</span>
                        <span className="text-gray-400 ml-2 text-xs capitalize">{a.kid_name}</span>
                      </div>
                      {a.duration_minutes > 0 && <span className="text-xs text-gray-500">{a.duration_minutes} min</span>}
                      <span className="text-xs text-emerald-600 font-medium">+{a.gem_reward || 2} gems</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
