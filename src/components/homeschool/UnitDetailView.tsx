'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Plus, Trash2, Check, Loader2, Search, Link2, X, Beaker, Target, ClipboardList, AlertTriangle, Package } from 'lucide-react'

const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : ''

const EXTRA_TYPES = [
  { value: 'experiment', label: 'Experiment', emoji: '🧪' },
  { value: 'steam', label: 'STEAM', emoji: '🔬' },
  { value: 'art', label: 'Art Project', emoji: '🎨' },
  { value: 'field_trip', label: 'Field Trip', emoji: '🚌' },
  { value: 'recipe', label: 'Recipe/Cooking', emoji: '🍳' },
  { value: 'other', label: 'Other', emoji: '📝' },
]

const ASSESSMENT_TYPES = [
  { value: 'quiz', label: 'Quiz' }, { value: 'project', label: 'Project' },
  { value: 'narration', label: 'Narration' }, { value: 'portfolio', label: 'Portfolio' },
  { value: 'test', label: 'Test' }, { value: 'presentation', label: 'Presentation' },
  { value: 'other', label: 'Other' },
]

interface Props {
  unitId: string
  onBack: () => void
}

export default function UnitDetailView({ unitId, onBack }: Props) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Inline add states
  const [newObjective, setNewObjective] = useState('')
  const [newExtra, setNewExtra] = useState({ title: '', extra_type: 'experiment', description: '' })
  const [newAssessment, setNewAssessment] = useState({ title: '', assessment_type: 'quiz' })
  const [newGap, setNewGap] = useState('')
  const [showAddExtra, setShowAddExtra] = useState(false)
  const [showAddAssessment, setShowAddAssessment] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/curriculum-planner?action=get_unit_detail&unit_id=${unitId}`)
      const d = await res.json()
      setData(d)
    } catch {}
    setLoading(false)
  }, [unitId])

  useEffect(() => { load() }, [load])

  const post = async (action: string, payload: any) => {
    await fetch('/api/curriculum-planner', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    })
    load()
  }

  const linkAsset = async (assetId: string) => {
    await fetch('/api/family-library', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'link_to_unit', asset_id: assetId, outline_id: unitId }),
    })
    load()
  }

  const unlinkAsset = async (assetId: string) => {
    await fetch('/api/family-library', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'unlink_from_unit', asset_id: assetId, outline_id: unitId }),
    })
    load()
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-purple-500" /></div>
  }

  if (!data?.unit) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Unit not found.</p>
        <button onClick={onBack} className="mt-3 text-purple-600 text-sm hover:underline">Go back</button>
      </div>
    )
  }

  const unit = data.unit
  const objectives = data.objectives || []
  const extras = data.extras || []
  const assessments = data.assessments || []
  const gaps = data.gaps || []
  const linkedAssets = data.linked_assets || []
  const siblings = data.siblings || []

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-xl shadow border p-5">
        <button onClick={onBack} className="text-sm text-purple-600 hover:underline flex items-center gap-1 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to planner
        </button>
        <h2 className="text-xl font-bold text-slate-800">{unit.unit_title}</h2>
        <div className="flex flex-wrap gap-2 mt-2 text-sm text-slate-600">
          <span className="px-2 py-0.5 bg-slate-100 rounded">{cap(unit.kid_name)}</span>
          <span className="px-2 py-0.5 bg-slate-100 rounded">{unit.month} {unit.school_year}</span>
          <span className="px-2 py-0.5 bg-slate-100 rounded">{unit.subject}</span>
          <span className="px-2 py-0.5 bg-slate-100 rounded">{unit.duration_weeks || 4} weeks</span>
        </div>
        {(unit.pedagogy_tags || []).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {unit.pedagogy_tags.map((t: string) => (
              <span key={t} className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded">{t}</span>
            ))}
          </div>
        )}
        {unit.unit_description && <p className="text-sm text-slate-600 mt-3">{unit.unit_description}</p>}

        {siblings.length > 0 && (
          <div className="mt-3 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
            Also teaching this unit to: {siblings.map((s: any) => `${cap(s.kid_name)} (${s.month})`).join(', ')}
          </div>
        )}

        {/* Complete Unit button */}
        {!unit.actual_end_month && (
          <button
            onClick={async () => {
              if (!confirm(`Mark "${unit.unit_title}" as complete? This will create a portfolio entry.`)) return
              await post('complete_unit', { unit_id: unitId })
            }}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" /> Mark Unit Complete
          </button>
        )}
        {unit.actual_end_month && (
          <div className="mt-4 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
            Completed ({unit.actual_end_month}) — logged to portfolio
          </div>
        )}
      </div>

      {/* Objectives */}
      <Section title="Objectives" icon={<Target className="w-4 h-4" />}>
        {objectives.map((o: any) => (
          <div key={o.id} className="flex items-start gap-2 group">
            <button onClick={() => post('toggle_objective', { id: o.id })}
              className={`mt-0.5 w-4 h-4 border-2 rounded flex-shrink-0 ${o.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
              {o.completed && <Check className="w-3 h-3 text-white" />}
            </button>
            <span className={`text-sm flex-1 ${o.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
              {o.objective_text}
            </span>
            <button onClick={() => post('delete_objective', { id: o.id })}
              className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-red-500">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <div className="flex gap-2 mt-2">
          <input value={newObjective} onChange={e => setNewObjective(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newObjective.trim()) { post('save_objective', { unit_id: unitId, objective_text: newObjective.trim() }); setNewObjective('') } }}
            placeholder="Add objective..."
            className="flex-1 border rounded-lg px-3 py-1.5 text-sm" />
          <button onClick={() => { if (newObjective.trim()) { post('save_objective', { unit_id: unitId, objective_text: newObjective.trim() }); setNewObjective('') } }}
            className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </Section>

      {/* Resources — What We Already Own */}
      <Section title="Resources (What We Own)" icon={<Package className="w-4 h-4" />}>
        {linkedAssets.length > 0 ? (
          <div className="space-y-1.5">
            {linkedAssets.map((a: any) => (
              <div key={a.id} className="flex items-center gap-2 bg-teal-50 rounded-lg px-3 py-2 group">
                <Check className="w-4 h-4 text-teal-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-slate-800">{a.asset_name}</span>
                  <span className="text-xs text-slate-500 ml-2">({a.asset_type})</span>
                </div>
                <button onClick={() => unlinkAsset(a.id)}
                  className="opacity-0 group-hover:opacity-100 text-xs text-slate-400 hover:text-red-500">
                  Unlink
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 italic">No resources linked yet. Search your library below.</p>
        )}
        <div className="flex gap-2 mt-2">
          <button onClick={() => setShowLinkModal(true)}
            className="px-3 py-1.5 border border-teal-300 text-teal-700 rounded-lg text-sm hover:bg-teal-50 flex items-center gap-1">
            <Search className="w-3.5 h-3.5" /> Link from Family Library
          </button>
        </div>
      </Section>

      {/* Extras (STEAM / experiments / art) */}
      <Section title="Extras (STEAM, Experiments, Art)" icon={<Beaker className="w-4 h-4" />}>
        {extras.map((ex: any) => {
          const et = EXTRA_TYPES.find(t => t.value === ex.extra_type)
          return (
            <div key={ex.id} className="flex items-start gap-2 bg-white rounded-lg px-3 py-2 border group">
              <span className="text-sm flex-shrink-0">{et?.emoji || '📝'}</span>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-slate-800">{ex.title}</span>
                {ex.description && <p className="text-xs text-slate-500 mt-0.5">{ex.description}</p>}
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                ex.status === 'completed' ? 'bg-green-100 text-green-700' :
                ex.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                ex.status === 'skipped' ? 'bg-gray-100 text-gray-500' :
                'bg-yellow-100 text-yellow-700'
              }`}>{ex.status}</span>
              <button onClick={() => post('delete_extra', { id: ex.id })}
                className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-red-500">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        })}
        {showAddExtra ? (
          <div className="bg-slate-50 rounded-lg p-3 space-y-2 border">
            <div className="flex gap-2">
              <input value={newExtra.title} onChange={e => setNewExtra({ ...newExtra, title: e.target.value })}
                placeholder="Extra title..." className="flex-1 border rounded px-2 py-1.5 text-sm" />
              <select value={newExtra.extra_type} onChange={e => setNewExtra({ ...newExtra, extra_type: e.target.value })}
                className="border rounded px-2 py-1.5 text-sm">
                {EXTRA_TYPES.map(t => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
              </select>
            </div>
            <input value={newExtra.description} onChange={e => setNewExtra({ ...newExtra, description: e.target.value })}
              placeholder="Description (optional)..." className="w-full border rounded px-2 py-1.5 text-sm" />
            <div className="flex gap-2">
              <button onClick={() => { post('save_extra', { unit_id: unitId, ...newExtra }); setNewExtra({ title: '', extra_type: 'experiment', description: '' }); setShowAddExtra(false) }}
                disabled={!newExtra.title.trim()}
                className="px-3 py-1.5 bg-purple-600 text-white rounded text-sm disabled:opacity-50">Add</button>
              <button onClick={() => setShowAddExtra(false)} className="px-3 py-1.5 text-sm text-slate-600">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAddExtra(true)}
            className="text-sm text-purple-600 hover:underline flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Add extra
          </button>
        )}
      </Section>

      {/* Assessments */}
      <Section title="Assessments" icon={<ClipboardList className="w-4 h-4" />}>
        {assessments.map((a: any) => (
          <div key={a.id} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border group">
            <button onClick={() => post('save_assessment', { ...a, id: a.id, unit_id: unitId, completed: !a.completed })}
              className={`w-4 h-4 border-2 rounded flex-shrink-0 ${a.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
              {a.completed && <Check className="w-3 h-3 text-white" />}
            </button>
            <div className="flex-1 min-w-0">
              <span className={`text-sm font-medium ${a.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>{a.title}</span>
              <span className="text-xs text-slate-400 ml-2">{a.assessment_type}</span>
            </div>
            {a.score && <span className="text-xs font-medium text-emerald-600">{a.score}</span>}
            <button onClick={() => post('delete_assessment', { id: a.id })}
              className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-red-500">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {showAddAssessment ? (
          <div className="bg-slate-50 rounded-lg p-3 space-y-2 border">
            <div className="flex gap-2">
              <input value={newAssessment.title} onChange={e => setNewAssessment({ ...newAssessment, title: e.target.value })}
                placeholder="Assessment title..." className="flex-1 border rounded px-2 py-1.5 text-sm" />
              <select value={newAssessment.assessment_type} onChange={e => setNewAssessment({ ...newAssessment, assessment_type: e.target.value })}
                className="border rounded px-2 py-1.5 text-sm">
                {ASSESSMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { post('save_assessment', { unit_id: unitId, ...newAssessment }); setNewAssessment({ title: '', assessment_type: 'quiz' }); setShowAddAssessment(false) }}
                disabled={!newAssessment.title.trim()}
                className="px-3 py-1.5 bg-purple-600 text-white rounded text-sm disabled:opacity-50">Add</button>
              <button onClick={() => setShowAddAssessment(false)} className="px-3 py-1.5 text-sm text-slate-600">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAddAssessment(true)}
            className="text-sm text-purple-600 hover:underline flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Add assessment
          </button>
        )}
      </Section>

      {/* Gaps → Purchase Plan */}
      <Section title="Gaps (What We Need)" icon={<AlertTriangle className="w-4 h-4" />}>
        {gaps.map((g: any) => (
          <div key={g.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border group ${g.resolved ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
            <span className="text-sm flex-1">
              {g.resolved && <Check className="w-3.5 h-3.5 inline mr-1 text-green-600" />}
              <span className={g.resolved ? 'line-through text-slate-400' : 'text-slate-800'}>{g.item_name}</span>
            </span>
            {!g.resolved && !g.purchase_id && (
              <button onClick={() => {
                // Open purchase form pre-filled from gap
                const url = new URL(window.location.href)
                url.searchParams.set('prefill_purchase', JSON.stringify({
                  item_name: g.item_name,
                  kid_name: unit.kid_name,
                  linked_outline_id: unitId,
                  gap_id: g.id,
                }))
                // Use a simple approach: save to sessionStorage and let parent handle
                sessionStorage.setItem('curriculum_gap_purchase', JSON.stringify({
                  item_name: g.item_name, kid_name: unit.kid_name,
                  linked_outline_id: unitId, gap_id: g.id,
                }))
                alert(`To plan a purchase for "${g.item_name}", go to the TEFA Budget tab and click Add Purchase. The form will be pre-filled.`)
              }}
                className="text-xs text-orange-600 hover:underline whitespace-nowrap">Plan Purchase</button>
            )}
            {!g.resolved && g.purchase_id && (
              <span className="text-[10px] text-blue-600">Linked to purchase</span>
            )}
            {!g.resolved && !g.purchase_id && (
              <button onClick={() => post('resolve_gap', { id: g.id })}
                className="text-xs text-emerald-600 hover:underline">Resolve</button>
            )}
            <button onClick={() => post('delete_gap', { id: g.id })}
              className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-red-500">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <div className="flex gap-2 mt-2">
          <input value={newGap} onChange={e => setNewGap(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newGap.trim()) { post('save_gap', { unit_id: unitId, item_name: newGap.trim() }); setNewGap('') } }}
            placeholder="Item we need..."
            className="flex-1 border rounded-lg px-3 py-1.5 text-sm" />
          <button onClick={() => { if (newGap.trim()) { post('save_gap', { unit_id: unitId, item_name: newGap.trim() }); setNewGap('') } }}
            className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </Section>

      {/* Notes */}
      {unit.notes && (
        <Section title="Notes" icon={<span className="text-sm">📝</span>}>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{unit.notes}</p>
        </Section>
      )}

      {/* Library Link Modal */}
      {showLinkModal && (
        <LibraryLinkModal
          unitTopics={(unit.themes || []).concat(unit.subject ? [unit.subject] : [])}
          alreadyLinked={new Set(linkedAssets.map((a: any) => a.id))}
          onLink={linkAsset}
          onClose={() => setShowLinkModal(false)}
        />
      )}
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow border p-5">
      <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
        {icon} {title}
      </h3>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  )
}

function LibraryLinkModal({ unitTopics, alreadyLinked, onLink, onClose }: {
  unitTopics: string[]
  alreadyLinked: Set<string>
  onLink: (assetId: string) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState(unitTopics[0] || '')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const doSearch = async () => {
    if (!search.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/family-library?action=list_assets&search=${encodeURIComponent(search)}&status=all`)
      const d = await res.json()
      setResults(d.assets || [])
    } catch { setResults([]) }
    setLoading(false)
  }

  useEffect(() => { if (search) doSearch() }, []) // auto-search on open with topic

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Link from Family Library</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-5 py-3 border-b flex gap-2">
          <input value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') doSearch() }}
            placeholder="Search assets..." className="flex-1 border rounded-lg px-3 py-2 text-sm" />
          <button onClick={doSearch} className="px-3 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700">
            <Search className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1.5">
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
          ) : results.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No assets found. Try a different search term.</p>
          ) : (
            results.map(asset => {
              const linked = alreadyLinked.has(asset.id)
              return (
                <div key={asset.id} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 border ${linked ? 'bg-teal-50 border-teal-200' : 'hover:bg-slate-50'}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{asset.asset_name}</p>
                    <p className="text-xs text-slate-500">{asset.asset_type} · {asset.condition}</p>
                  </div>
                  {linked ? (
                    <span className="text-xs text-teal-600 font-medium flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Linked</span>
                  ) : (
                    <button onClick={() => { onLink(asset.id); onClose() }}
                      className="px-2.5 py-1 bg-teal-600 text-white rounded text-xs font-medium hover:bg-teal-700 flex items-center gap-1">
                      <Link2 className="w-3 h-3" /> Link
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
