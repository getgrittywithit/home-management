'use client'

import { useState, useEffect, useCallback } from 'react'
import { Calendar, DollarSign, Plus, X, CheckCircle2, Package, ShoppingCart, Sparkles, Trash2, AlertTriangle, BookOpen, Map, Users, RefreshCw, Upload } from 'lucide-react'
import FamilyLibrary from './FamilyLibrary'
import YearMapView from './YearMapView'
import UnitDetailView from './UnitDetailView'
import SuggestionBanner from './SuggestionBanner'
import PedagogyPresetPanel from './PedagogyPresetPanel'
import AddToLibraryModal from './AddToLibraryModal'
import AmazonImportModal from './AmazonImportModal'

const HOMESCHOOL_KIDS = [
  { id: 'amos', label: 'Amos', grade: '10th', color: 'from-blue-500 to-indigo-500' },
  { id: 'ellie', label: 'Ellie', grade: '6th', color: 'from-pink-500 to-rose-500' },
  { id: 'wyatt', label: 'Wyatt', grade: '4th', color: 'from-emerald-500 to-teal-500' },
  { id: 'hannah', label: 'Hannah', grade: '3rd', color: 'from-amber-500 to-orange-500' },
] as const

const SCHOOL_YEAR = '2026-27'

const MONTHS = [
  'August', 'September', 'October', 'November', 'December',
  'January', 'February', 'March', 'April', 'May', 'June', 'July',
] as const

const SUBJECTS = ['ELAR', 'Math', 'Science', 'Social Studies', 'Enrichment', 'Art', 'Music', 'PE', 'Life Skills'] as const

const PEDAGOGY_TAGS = ['Montessori', 'Waldorf', 'Charlotte Mason', 'Unschool', 'Classical', 'Hands-on', 'Literature-based'] as const

// Approved TEFA Marketplace categories
const TEFA_CATEGORIES = [
  'Uniforms', 'Fiction', 'Nonfiction', 'Audiobooks', 'Workbooks', 'Curriculum', 'Textbooks',
  'STEM Kits', 'Learning Manipulatives', 'Art Supplies', 'Educational Material Kits',
  'Printer Supplies', 'School Supplies',
  'Keyboard Instruments', 'Percussion Instruments', 'String Instruments', 'Wind Instruments', 'Instrument Accessories',
  'Sporting Equipment',
  'Laptops', 'Tablets', 'Desktops', 'Monitors', 'Headphones', 'Cameras', 'Webcams',
  'Printers', '3D Printers', 'Computer Accessories', 'Calculators', 'Internet Hot Spot',
  'Software Programs',
  'Tutoring', 'Behavioral Therapy', 'Occupational Therapy', 'Physical Therapy', 'Speech Therapy',
  'Online Classes', 'Higher Education Classes', 'Trade School Classes',
  'Fine Arts Instruction', 'Physical Education Instruction',
  'Test and Exam Fees', 'Transportation',
  'Online Learning Program', 'Educational Applications',
] as const

type OutlineItem = {
  id?: string; kid_name: string; school_year?: string; month: string; subject: string;
  unit_title: string; unit_description?: string; themes?: string[]; pedagogy_tags?: string[];
  notes?: string; sort_order?: number;
}

type PurchaseItem = {
  id?: string; kid_name: string; school_year?: string; tefa_category: string;
  item_name: string; item_description?: string; vendor?: string;
  estimated_cost: number; actual_cost?: number | null;
  priority: 'high' | 'medium' | 'low';
  status: 'wishlist' | 'ordered' | 'received' | 'in-use';
  purchased_date?: string; received_date?: string;
  linked_outline_id?: string | null; notes?: string;
}

type KidSummary = {
  kid_name: string; budget: number; spent: number; committed: number;
  remaining: number; wishlist_count: number; item_count: number;
}

// Consistent currency formatting across the component.
// Always returns "$1,234.56" — with comma thousands separator + 2 decimals.
function fmtCurrency(n: number | string | null | undefined): string {
  const num = n == null ? 0 : Number(n)
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export default function CurriculumPlanner() {
  const [activeView, setActiveView] = useState<'outline' | 'budget' | 'library' | 'year_map'>('outline')
  const [openUnitId, setOpenUnitId] = useState<string | null>(null)
  const [allKidsMode, setAllKidsMode] = useState(false)
  const [showPhilosophy, setShowPhilosophy] = useState(false)
  const [quarterFilter, setQuarterFilter] = useState<'all' | 1 | 2 | 3 | 4>('all')
  const [quarterGoal, setQuarterGoal] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [libraryModalPurchase, setLibraryModalPurchase] = useState<{ id: string; name: string; category: string } | null>(null)
  const [showAmazonImport, setShowAmazonImport] = useState(false)
  const [selectedKid, setSelectedKid] = useState<string>('amos')
  const [outline, setOutline] = useState<OutlineItem[]>([])
  const [purchases, setPurchases] = useState<PurchaseItem[]>([])
  const [summary, setSummary] = useState<{ kids: KidSummary[]; totals: any } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showOutlineForm, setShowOutlineForm] = useState(false)
  const [showPurchaseForm, setShowPurchaseForm] = useState(false)
  const [editingOutline, setEditingOutline] = useState<OutlineItem | null>(null)
  const [editingPurchase, setEditingPurchase] = useState<PurchaseItem | null>(null)
  const [categorySearch, setCategorySearch] = useState('')

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [o, p, s] = await Promise.all([
        fetch(`/api/curriculum-planner?action=get_outline&kid_name=${selectedKid}&school_year=${SCHOOL_YEAR}`).then(r => r.json()),
        fetch(`/api/curriculum-planner?action=get_purchases&kid_name=${selectedKid}&school_year=${SCHOOL_YEAR}`).then(r => r.json()),
        fetch(`/api/curriculum-planner?action=get_summary&school_year=${SCHOOL_YEAR}`).then(r => r.json()),
      ])
      setOutline(o.outline || [])
      setPurchases(p.purchases || [])
      setSummary(s.kids ? s : null)
    } catch (err) {
      console.error('CurriculumPlanner load error', err)
    } finally {
      setLoading(false)
    }
  }, [selectedKid])

  useEffect(() => { loadAll() }, [loadAll])

  const selectedKidMeta = HOMESCHOOL_KIDS.find(k => k.id === selectedKid)!
  const selectedKidSummary = summary?.kids.find(k => k.kid_name === selectedKid)

  return (
    <div className="space-y-6">
      {/* Header with view toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Curriculum Planner
          </h2>
          <div className="flex items-center gap-2">
            <p className="text-sm text-slate-500">Year outline + TEFA funding tracker · {SCHOOL_YEAR}</p>
            <button onClick={() => setShowPhilosophy(true)}
              className="text-xs px-2 py-1 rounded border border-purple-200 text-purple-600 hover:bg-purple-50">
              Philosophy
            </button>
            <button onClick={async () => { setRefreshing(true); await loadAll(); setRefreshing(false) }}
              className="text-xs p-1 rounded border border-slate-200 text-slate-500 hover:bg-slate-50" title="Refresh data">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
          <button
            onClick={() => setActiveView('outline')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeView === 'outline' ? 'bg-white shadow text-purple-700' : 'text-slate-600'}`}
          >
            <Calendar className="w-4 h-4" /> Year Outline
          </button>
          <button
            onClick={() => setActiveView('budget')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeView === 'budget' ? 'bg-white shadow text-emerald-700' : 'text-slate-600'}`}
          >
            <DollarSign className="w-4 h-4" /> TEFA Budget
          </button>
          <button
            onClick={() => setActiveView('year_map')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeView === 'year_map' ? 'bg-white shadow text-indigo-700' : 'text-slate-600'}`}
          >
            <Map className="w-4 h-4" /> Year Map
          </button>
          <button
            onClick={() => setActiveView('library')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeView === 'library' ? 'bg-white shadow text-teal-700' : 'text-slate-600'}`}
          >
            <BookOpen className="w-4 h-4" /> Family Library
          </button>
        </div>
      </div>

      {/* Budget summary strip — always visible */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-xl p-4 shadow">
            <div className="text-xs uppercase tracking-wide opacity-75">Total Award</div>
            <div className="text-2xl font-bold">${summary.totals.total_budget.toLocaleString()}</div>
            <div className="text-xs mt-1 opacity-75">
              ${summary.totals.total_remaining.toLocaleString()} remaining
            </div>
          </div>
          {summary.kids.map(k => {
            const meta = HOMESCHOOL_KIDS.find(h => h.id === k.kid_name)!
            const pctUsed = Math.round(((k.spent + k.committed) / k.budget) * 100)
            return (
              <button
                key={k.kid_name}
                onClick={() => setSelectedKid(k.kid_name)}
                className={`text-left rounded-xl p-4 shadow transition-all ${selectedKid === k.kid_name ? 'ring-2 ring-purple-500' : ''} bg-gradient-to-br ${meta.color} text-white`}
              >
                <div className="text-xs uppercase tracking-wide opacity-90">{meta.label}</div>
                <div className="text-xl font-bold">${k.remaining.toLocaleString()}</div>
                <div className="text-xs mt-1 opacity-90">{pctUsed}% planned · {k.item_count} item{k.item_count === 1 ? '' : 's'}</div>
              </button>
            )
          })}
        </div>
      )}

      {/* Kid selector pills */}
      <div className="flex gap-2 flex-wrap">
        {HOMESCHOOL_KIDS.map(k => (
          <button
            key={k.id}
            onClick={() => setSelectedKid(k.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedKid === k.id
                ? `bg-gradient-to-r ${k.color} text-white shadow`
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {k.label} <span className="text-xs opacity-75 ml-1">({k.grade})</span>
          </button>
        ))}
      </div>

      {loading && <div className="text-sm text-slate-500">Loading...</div>}

      {/* YEAR OUTLINE VIEW */}
      {!loading && !openUnitId && activeView === 'outline' && (
        <div className="bg-white rounded-xl shadow border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">
              {selectedKidMeta.label}&apos;s Year Outline
              <span className="text-sm font-normal text-slate-500 ml-2">
                {outline.length} unit{outline.length !== 1 ? 's' : ''} planned
              </span>
            </h3>
            <button
              onClick={() => { setEditingOutline(null); setShowOutlineForm(true) }}
              className="px-3 py-2 rounded-lg bg-purple-600 text-white text-sm flex items-center gap-1.5 hover:bg-purple-700"
            >
              <Plus className="w-4 h-4" /> Add Unit
            </button>
          </div>

          {/* Quarter Tabs */}
          <div className="flex gap-1 mb-4 bg-slate-100 rounded-lg p-1">
            {([['all', 'All'] as const, [1, 'Q1 Aug–Oct'] as const, [2, 'Q2 Nov–Jan'] as const, [3, 'Q3 Feb–Apr'] as const, [4, 'Q4 May–Jul'] as const]).map(([q, label]) => (
              <button key={String(q)} onClick={() => setQuarterFilter(q)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${quarterFilter === q ? 'bg-white shadow text-purple-700' : 'text-slate-600'}`}>
                {label}
              </button>
            ))}
          </div>

          {outline.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No units planned yet for {selectedKidMeta.label} this year.</p>
              <p className="text-xs mt-1">Start with a theme or month — you can always refine later.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {MONTHS.map((month, mi) => {
                // Quarter filter: Q1=Aug-Oct(0-2), Q2=Nov-Jan(3-5), Q3=Feb-Apr(6-8), Q4=May-Jul(9-11)
                if (quarterFilter !== 'all') {
                  const qStart = (quarterFilter - 1) * 3
                  if (mi < qStart || mi >= qStart + 3) return null
                }
                const monthItems = outline.filter(o => o.month === month)
                if (monthItems.length === 0) return null
                return (
                  <div key={month} className="border-l-2 border-purple-200 pl-4">
                    <div className="text-sm font-semibold text-purple-700 mb-2">{month}</div>
                    <div className="space-y-2">
                      {monthItems.map(item => (
                        <div key={item.id}
                          onClick={() => item.id && setOpenUnitId(item.id)}
                          className="bg-slate-50 rounded-lg p-3 flex items-start gap-3 cursor-pointer hover:bg-purple-50 transition-colors">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">{item.subject}</span>
                              <span className="font-medium text-slate-800">{item.unit_title}</span>
                            </div>
                            {item.unit_description && <p className="text-sm text-slate-600 mt-1">{item.unit_description}</p>}
                            {item.pedagogy_tags && item.pedagogy_tags.length > 0 && (
                              <div className="flex gap-1 mt-2 flex-wrap">
                                {item.pedagogy_tags.map(t => (
                                  <span key={t} className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded">{t}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => { setEditingOutline(item); setShowOutlineForm(true) }}
                              className="text-xs text-slate-600 hover:text-purple-700 px-2 py-1"
                            >Edit</button>
                            <button
                              onClick={async () => {
                                if (!confirm('Delete this unit?')) return
                                await fetch('/api/curriculum-planner', {
                                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ action: 'delete_outline_item', id: item.id }),
                                })
                                loadAll()
                              }}
                              className="text-slate-400 hover:text-red-600 p-1"
                            ><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* BUDGET / PURCHASES VIEW */}
      {!loading && !openUnitId && activeView === 'budget' && (
        <div className="space-y-5">
          {/* Selected kid detailed card */}
          {selectedKidSummary && (
            <div className="bg-white rounded-xl shadow border border-slate-200 p-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="font-semibold text-slate-800">{selectedKidMeta.label}'s TEFA Budget</h3>
                  <p className="text-sm text-slate-500">{SCHOOL_YEAR} school year</p>
                </div>
                <div className="flex gap-6 items-center">
                  <div>
                    <div className="text-xs text-slate-500 uppercase">Spent</div>
                    <div className="text-lg font-bold text-red-600">{fmtCurrency(selectedKidSummary.spent)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 uppercase">Committed</div>
                    <div className="text-lg font-bold text-amber-600">{fmtCurrency(selectedKidSummary.committed)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 uppercase">Remaining</div>
                    <div className="text-lg font-bold text-emerald-600">{fmtCurrency(selectedKidSummary.remaining)}</div>
                  </div>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-4 h-3 rounded-full bg-slate-200 overflow-hidden flex">
                <div className="bg-red-500" style={{ width: `${(selectedKidSummary.spent / 2000) * 100}%` }} />
                <div className="bg-amber-500" style={{ width: `${(selectedKidSummary.committed / 2000) * 100}%` }} />
              </div>
              {selectedKidSummary.remaining < 0 && (
                <div className="mt-3 flex items-center gap-2 text-red-700 text-sm bg-red-50 rounded-lg p-2">
                  <AlertTriangle className="w-4 h-4" />
                  Over budget by {fmtCurrency(Math.abs(selectedKidSummary.remaining))}
                </div>
              )}
            </div>
          )}

          {/* Purchase list */}
          <div className="bg-white rounded-xl shadow border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">
                Planned Purchases
                <span className="text-sm font-normal text-slate-500 ml-2">
                  {purchases.length} item{purchases.length !== 1 ? 's' : ''}
                </span>
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAmazonImport(true)}
                  className="px-3 py-2 rounded-lg border border-orange-300 text-orange-700 text-sm flex items-center gap-1.5 hover:bg-orange-50"
                >
                  <Upload className="w-4 h-4" /> Amazon Import
                </button>
                <button
                  onClick={() => { setEditingPurchase(null); setShowPurchaseForm(true) }}
                  className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm flex items-center gap-1.5 hover:bg-emerald-700"
                >
                  <Plus className="w-4 h-4" /> Add Item
                </button>
              </div>
            </div>

            {purchases.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No purchases planned yet for {selectedKidMeta.label}.</p>
                <p className="text-xs mt-1">Add curriculum, tech, therapy, or any TEFA-approved items.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(['wishlist', 'ordered', 'received', 'in-use'] as const).map(status => {
                  const items = purchases.filter(p => p.status === status)
                  if (items.length === 0) return null
                  const labels = { wishlist: '📝 Wishlist', ordered: '📦 Ordered', received: '✅ Received', 'in-use': '🎓 In Use' }
                  return (
                    <div key={status} className="space-y-2">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-4">{labels[status]}</div>
                      {items.map(p => (
                        <PurchaseRow
                          key={p.id}
                          purchase={p}
                          onEdit={() => { setEditingPurchase(p); setShowPurchaseForm(true) }}
                          onStatusChange={async (newStatus) => {
                            await fetch('/api/curriculum-planner', {
                              method: 'POST', headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ action: 'update_purchase_status', id: p.id, status: newStatus }),
                            })
                            loadAll()
                            if (newStatus === 'received') {
                              setLibraryModalPurchase({ id: p.id!, name: p.item_name, category: p.tefa_category })
                            }
                          }}
                          onDelete={async () => {
                            if (!confirm('Delete this item?')) return
                            await fetch('/api/curriculum-planner', {
                              method: 'POST', headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ action: 'delete_purchase', id: p.id }),
                            })
                            loadAll()
                          }}
                        />
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Approved categories reference */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-emerald-900">Approved TEFA Categories (Texas Marketplace)</h3>
              <input
                type="text"
                placeholder="Search categories..."
                value={categorySearch}
                onChange={e => setCategorySearch(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-emerald-300 text-sm w-48"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TEFA_CATEGORIES
                .filter(c => !categorySearch || c.toLowerCase().includes(categorySearch.toLowerCase()))
                .map(c => (
                  <span key={c} className="text-xs px-2.5 py-1 bg-white text-emerald-700 rounded-full border border-emerald-200">{c}</span>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* UNIT DETAIL VIEW (takes over the page when a unit is selected) */}
      {openUnitId && (
        <UnitDetailView unitId={openUnitId} onBack={() => setOpenUnitId(null)} />
      )}

      {/* YEAR MAP VIEW */}
      {!loading && !openUnitId && activeView === 'year_map' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setAllKidsMode(!allKidsMode)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 ${
                allKidsMode ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}>
              <Users className="w-4 h-4" /> {allKidsMode ? 'All Kids' : 'Single Kid'}
            </button>
          </div>
          <YearMapView
            schoolYear={SCHOOL_YEAR}
            selectedKid={selectedKid}
            allKidsMode={allKidsMode}
            onOpenUnit={(id) => setOpenUnitId(id)}
            onAddUnit={(month, subject) => {
              setEditingOutline({ kid_name: selectedKid, month, subject, unit_title: '' } as any)
              setShowOutlineForm(true)
            }}
          />
        </div>
      )}

      {/* FAMILY LIBRARY VIEW */}
      {!loading && !openUnitId && activeView === 'library' && (
        <FamilyLibrary />
      )}

      {/* OUTLINE FORM MODAL */}
      {showOutlineForm && (
        <OutlineForm
          kid={selectedKid}
          initial={editingOutline}
          onClose={() => setShowOutlineForm(false)}
          onSaved={() => { setShowOutlineForm(false); loadAll() }}
        />
      )}

      {/* PURCHASE FORM MODAL */}
      {showPurchaseForm && (
        <PurchaseForm
          kid={selectedKid}
          outline={outline}
          initial={editingPurchase}
          onClose={() => setShowPurchaseForm(false)}
          onSaved={() => { setShowPurchaseForm(false); loadAll() }}
        />
      )}

      {showPhilosophy && (
        <PedagogyPresetPanel onClose={() => setShowPhilosophy(false)} />
      )}

      {showAmazonImport && (
        <AmazonImportModal
          onClose={() => setShowAmazonImport(false)}
          onImported={() => { setShowAmazonImport(false); loadAll() }}
        />
      )}

      {libraryModalPurchase && (
        <AddToLibraryModal
          purchaseId={libraryModalPurchase.id}
          itemName={libraryModalPurchase.name}
          tefaCategory={libraryModalPurchase.category}
          onClose={() => setLibraryModalPurchase(null)}
          onCreated={() => { setLibraryModalPurchase(null); loadAll() }}
        />
      )}
    </div>
  )
}

// ============================================================================
// PurchaseRow — sub-component for each purchase line
// ============================================================================
function PurchaseRow({ purchase, onEdit, onStatusChange, onDelete }: {
  purchase: PurchaseItem;
  onEdit: () => void;
  onStatusChange: (s: PurchaseItem['status']) => void;
  onDelete: () => void;
}) {
  // Coerce numeric fields from API (Postgres NUMERIC serializes as string)
  const estimatedCost = Number(purchase.estimated_cost) || 0
  const actualCost = purchase.actual_cost != null ? Number(purchase.actual_cost) : null
  const cost = actualCost ?? estimatedCost
  const priorityColor = {
    high: 'bg-red-100 text-red-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-slate-100 text-slate-600'
  }[purchase.priority]
  return (
    <div className="bg-slate-50 rounded-lg p-3 flex items-start gap-3">
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-slate-800">{purchase.item_name}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{purchase.tefa_category}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColor}`}>{purchase.priority}</span>
          {purchase.vendor && <span className="text-xs text-slate-500">@ {purchase.vendor}</span>}
        </div>
        {purchase.item_description && <p className="text-sm text-slate-600 mt-1">{purchase.item_description}</p>}
      </div>
      <div className="text-right">
        <div className="font-semibold text-slate-800">{fmtCurrency(cost)}</div>
        {actualCost != null && actualCost !== estimatedCost && (
          <div className="text-xs text-slate-400 line-through">est {fmtCurrency(estimatedCost)}</div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <select
          value={purchase.status}
          onChange={e => onStatusChange(e.target.value as PurchaseItem['status'])}
          className="text-xs px-2 py-1 rounded border border-slate-200"
        >
          <option value="wishlist">Wishlist</option>
          <option value="ordered">Ordered</option>
          <option value="received">Received</option>
          <option value="in-use">In Use</option>
        </select>
        <div className="flex gap-1">
          <button onClick={onEdit} className="text-xs text-slate-600 hover:text-purple-700 px-2">Edit</button>
          <button onClick={onDelete} className="text-slate-400 hover:text-red-600 p-0.5"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// OutlineForm — modal for adding/editing year outline items
// ============================================================================
function OutlineForm({ kid, initial, onClose, onSaved }: {
  kid: string; initial: OutlineItem | null;
  onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState<OutlineItem>(initial || {
    kid_name: kid, month: 'August', subject: 'ELAR',
    unit_title: '', unit_description: '', themes: [], pedagogy_tags: [], notes: '',
  })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!form.unit_title.trim()) return
    setSaving(true)
    try {
      await fetch('/api/curriculum-planner', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_outline_item', ...form, kid_name: kid, school_year: SCHOOL_YEAR }),
      })
      onSaved()
    } finally { setSaving(false) }
  }

  const togglePedagogy = (tag: string) => {
    const tags = new Set(form.pedagogy_tags || [])
    tags.has(tag) ? tags.delete(tag) : tags.add(tag)
    setForm({ ...form, pedagogy_tags: Array.from(tags) })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">{initial ? 'Edit Unit' : 'Add Unit to Outline'}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-500" /></button>
        </div>
        <div className="p-5 space-y-3">
          {/* Smart suggestions from Coral */}
          {!initial && (
            <SuggestionBanner
              kidName={kid}
              month={form.month}
              subject={form.subject}
              onAccept={(s) => setForm({
                ...form,
                unit_title: s.unit_title,
                unit_description: s.description,
                pedagogy_tags: s.pedagogy_tags,
                themes: s.objectives, // store objectives as themes for now
              })}
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600">Month</label>
              <select
                value={form.month}
                onChange={e => setForm({ ...form, month: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              >
                {MONTHS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Subject</label>
              <select
                value={form.subject}
                onChange={e => setForm({ ...form, subject: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              >
                {SUBJECTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Unit Title *</label>
            <input
              type="text"
              value={form.unit_title}
              onChange={e => setForm({ ...form, unit_title: e.target.value })}
              placeholder="e.g., Ocean Ecosystems, Ancient Egypt, Fractions Deep Dive"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Description</label>
            <textarea
              value={form.unit_description || ''}
              onChange={e => setForm({ ...form, unit_description: e.target.value })}
              placeholder="Brief summary of what you'll cover"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              rows={2}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Pedagogy approach</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {PEDAGOGY_TAGS.map(t => {
                const active = (form.pedagogy_tags || []).includes(t)
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => togglePedagogy(t)}
                    className={`text-xs px-2.5 py-1 rounded-full border ${active ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-600 border-slate-300'}`}
                  >{t}</button>
                )
              })}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Notes</label>
            <textarea
              value={form.notes || ''}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              rows={2}
            />
          </div>
        </div>
        <div className="p-5 border-t border-slate-200 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 text-sm">Cancel</button>
          <button
            onClick={save}
            disabled={saving || !form.unit_title.trim()}
            className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm disabled:opacity-50"
          >{saving ? 'Saving...' : 'Save Unit'}</button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// PurchaseForm — modal for adding/editing TEFA purchase items
// ============================================================================
function PurchaseForm({ kid, outline, initial, onClose, onSaved }: {
  kid: string; outline: OutlineItem[]; initial: PurchaseItem | null;
  onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState<PurchaseItem>(initial || {
    kid_name: kid, tefa_category: 'Curriculum', item_name: '',
    estimated_cost: 0, priority: 'medium', status: 'wishlist',
  })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!form.item_name.trim() || !form.tefa_category) return
    setSaving(true)
    try {
      await fetch('/api/curriculum-planner', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_purchase', ...form, kid_name: kid, school_year: SCHOOL_YEAR }),
      })
      onSaved()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">{initial ? 'Edit Purchase' : 'Add TEFA Purchase'}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-500" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600">Item Name *</label>
            <input
              type="text"
              value={form.item_name}
              onChange={e => setForm({ ...form, item_name: e.target.value })}
              placeholder="e.g., Schleich ocean animals set, Speech therapy Q1"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">TEFA Category *</label>
            <select
              value={form.tefa_category}
              onChange={e => setForm({ ...form, tefa_category: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            >
              {TEFA_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600">Estimated Cost *</label>
              <input
                type="number" step="0.01" min="0"
                value={form.estimated_cost}
                onChange={e => setForm({ ...form, estimated_cost: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Actual Cost</label>
              <input
                type="number" step="0.01" min="0"
                value={form.actual_cost ?? ''}
                onChange={e => setForm({ ...form, actual_cost: e.target.value === '' ? null : parseFloat(e.target.value) })}
                placeholder="(when known)"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Vendor</label>
            <input
              type="text"
              value={form.vendor || ''}
              onChange={e => setForm({ ...form, vendor: e.target.value })}
              placeholder="Optional — e.g., Rainbow Resource, Amazon, SaxonHomeschool"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600">Priority</label>
              <select
                value={form.priority}
                onChange={e => setForm({ ...form, priority: e.target.value as any })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Status</label>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value as any })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              >
                <option value="wishlist">Wishlist</option>
                <option value="ordered">Ordered</option>
                <option value="received">Received</option>
                <option value="in-use">In Use</option>
              </select>
            </div>
          </div>
          {outline.length > 0 && (
            <div>
              <label className="text-xs font-medium text-slate-600">Link to Outline Unit (optional)</label>
              <select
                value={form.linked_outline_id || ''}
                onChange={e => setForm({ ...form, linked_outline_id: e.target.value || null })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              >
                <option value="">— none —</option>
                {outline.map(o => (
                  <option key={o.id} value={o.id}>{o.month} · {o.subject} · {o.unit_title}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-slate-600">Notes</label>
            <textarea
              value={form.notes || ''}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              rows={2}
            />
          </div>
        </div>
        <div className="p-5 border-t border-slate-200 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 text-sm">Cancel</button>
          <button
            onClick={save}
            disabled={saving || !form.item_name.trim()}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm disabled:opacity-50"
          >{saving ? 'Saving...' : 'Save Purchase'}</button>
        </div>
      </div>
    </div>
  )
}
