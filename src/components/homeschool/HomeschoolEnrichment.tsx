'use client'

import { useState, useEffect } from 'react'
import { StudentData } from './types'
import ParentEnrichmentSummary from '../ParentEnrichmentSummary'
import FinancialLiteracyPanel from '../FinancialLiteracyPanel'
import { Plus, X, Sparkles } from 'lucide-react'

interface Props {
  students: StudentData[]
}

const CATEGORIES = [
  { id: 'financial_literacy', label: 'Financial Literacy', icon: '💰' },
  { id: 'art', label: 'Art & Creativity', icon: '🎨' },
  { id: 'music', label: 'Music', icon: '🎵' },
  { id: 'typing', label: 'Typing / Computer Skills', icon: '💻' },
  { id: 'cooking', label: 'Cooking & Life Skills', icon: '🍳' },
  { id: 'pe', label: 'Physical Education', icon: '🏃' },
  { id: 'nature', label: 'Nature & Gardening', icon: '🌱' },
  { id: 'theater', label: 'Theater & Drama', icon: '🎭' },
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
  const [logCategory, setLogCategory] = useState('art')
  const [logTitle, setLogTitle] = useState('')
  const [logDesc, setLogDesc] = useState('')
  const [logDuration, setLogDuration] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/enrichment?action=get_activities').then(r => r.json()).then(d => setActivities(d.activities || [])).catch(() => {})
    fetch('/api/enrichment?action=get_monthly_summary').then(r => r.json()).then(d => setMonthlySummary(d.summary || [])).catch(() => {})
  }, [])

  const handleLogActivity = async () => {
    if (!logTitle.trim()) return
    setSaving(true)
    const res = await fetch('/api/enrichment', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'log_activity', kid_name: logKid, category: logCategory, title: logTitle.trim(), description: logDesc.trim() || null, duration_minutes: logDuration ? parseInt(logDuration) : 0 }),
    }).then(r => r.json()).catch(() => null)
    if (res?.activity) setActivities(prev => [res.activity, ...prev])
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
            {students.map(s => <FinancialLiteracyPanel key={s.id} kidName={s.name} isParent={true} />)}
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
                <select value={logCategory} onChange={e => setLogCategory(e.target.value)} className="border rounded px-2 py-1.5 text-sm">
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

          {/* Categories Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {CATEGORIES.map(cat => {
              const catActivities = activities.filter(a => a.category === cat.id)
              const catSummary = monthlySummary.filter(s => s.category === cat.id)
              const totalMins = catSummary.reduce((s: number, r: any) => s + (Number(r.total_minutes) || 0), 0)
              return (
                <div key={cat.id} className="bg-white rounded-lg border shadow-sm p-4 text-center">
                  <span className="text-3xl block mb-2">{cat.icon}</span>
                  <h4 className="text-sm font-semibold text-gray-900">{cat.label}</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    {catActivities.length > 0 ? `${catActivities.length} activities` : 'Not started'}
                  </p>
                  {totalMins > 0 && <p className="text-xs text-emerald-600 font-medium mt-0.5">{totalMins} min this month</p>}
                </div>
              )
            })}
          </div>

          {/* Recent Activity Log */}
          <div className="bg-white rounded-lg border shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-emerald-500" /> Recent Activities
            </h3>
            {activities.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No enrichment activities logged yet. Tap &quot;Log Activity&quot; to start!</p>
            ) : (
              <div className="space-y-2">
                {activities.slice(0, 15).map((a: any) => {
                  const cat = CATEGORIES.find(c => c.id === a.category)
                  return (
                    <div key={a.id} className="flex items-center gap-3 text-sm py-1.5 border-b border-gray-100 last:border-0">
                      <span className="text-lg">{cat?.icon || '🎯'}</span>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-gray-800">{a.title}</span>
                        <span className="text-gray-400 ml-2 text-xs">{a.kid_name}</span>
                      </div>
                      {a.duration_minutes > 0 && <span className="text-xs text-gray-500">{a.duration_minutes} min</span>}
                      <span className="text-xs text-emerald-600 font-medium">+{a.gems_earned || 2} gems</span>
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
