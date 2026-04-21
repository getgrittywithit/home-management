'use client'

import { useEffect, useState } from 'react'
import {
  Printer, FileText, ClipboardList, UtensilsCrossed, BookOpen,
  GraduationCap, Home, Download, Loader2, AlertCircle, LayoutDashboard
} from 'lucide-react'
import ReefNotesEditor from '../ReefNotesEditor'

type Form = {
  id: string
  category: string
  title: string
  description: string | null
  form_type: 'static' | 'dynamic'
  file_url: string | null
  icon: string | null
  sort_order: number
  requires_data: boolean
  data_source: string | null
}

const CATEGORY_META: Record<
  string,
  { label: string; description: string; color: string }
> = {
  medical: {
    label: 'Medical & Behavioral',
    description: 'Assessments, screenings, and health forms',
    color: 'bg-rose-50 border-rose-200',
  },
  meal: {
    label: 'Meals & Food',
    description: 'Weekly meal plans and grocery templates',
    color: 'bg-emerald-50 border-emerald-200',
  },
  reading: {
    label: 'Reading & ELAR',
    description: 'Reading logs and literacy trackers',
    color: 'bg-sky-50 border-sky-200',
  },
  school: {
    label: 'School & IEP',
    description: 'IEP goals, 504 plans, and school forms',
    color: 'bg-amber-50 border-amber-200',
  },
  household: {
    label: 'Household',
    description: 'Zone chores, checklists, and chore trackers',
    color: 'bg-indigo-50 border-indigo-200',
  },
}

const CATEGORY_ORDER = ['medical', 'meal', 'reading', 'school', 'household']

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ClipboardList,
  UtensilsCrossed,
  BookOpen,
  GraduationCap,
  Home,
  LayoutDashboard,
}

function getIcon(icon: string | null) {
  if (icon && ICON_MAP[icon]) return ICON_MAP[icon]
  return FileText
}

function getWeekStart(): string {
  const d = new Date()
  const dow = d.getDay()
  if (dow === 0) d.setDate(d.getDate() + 1)
  else if (dow === 6) d.setDate(d.getDate() + 2)
  else d.setDate(d.getDate() - ((dow + 6) % 7))
  return d.toLocaleDateString('en-CA')
}

export default function PrintCenter() {
  const [forms, setForms] = useState<Form[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generating, setGenerating] = useState<string | null>(null)
  const [showReefEditor, setShowReefEditor] = useState(false)

  useEffect(() => {
    loadForms()
  }, [])

  async function loadForms() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/print-center?action=list_forms')
      if (!res.ok) throw new Error('Failed to load forms')
      const data = await res.json()
      setForms(data.forms || [])
    } catch (e: any) {
      setError(e.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  async function handlePrint(form: Form) {
    if (form.form_type === 'static') {
      if (form.file_url) {
        window.open(form.file_url, '_blank')
      }
      return
    }

    // Week at a Glance — opens ReefNotes editor first
    if (form.data_source === 'week_at_a_glance_current') {
      setShowReefEditor(true)
      return
    }

    // Zone Checklist — opens print page directly
    if (form.data_source === 'zone_checklist_current') {
      const ws = getWeekStart()
      window.open(`/api/print-center/zone-checklist?week_start=${ws}&format=print`, '_blank')
      return
    }

    // Other dynamic — generate PDF
    if (!form.data_source) return
    setGenerating(form.id)
    try {
      const res = await fetch('/api/print-center', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          data_source: form.data_source,
        }),
      })
      if (!res.ok) throw new Error('Failed to generate PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      // Let the tab hold the URL — don't revoke immediately
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (e: any) {
      alert(e.message || 'Failed to generate PDF')
    } finally {
      setGenerating(null)
    }
  }

  const byCategory: Record<string, Form[]> = {}
  for (const f of forms) {
    if (!byCategory[f.category]) byCategory[f.category] = []
    byCategory[f.category].push(f)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Printer className="w-7 h-7 text-blue-600" />
            Print Center
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Printable forms and dynamic PDFs generated from live family data.
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading forms…
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {!loading && !error && forms.length === 0 && (
        <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 text-center">
          No printable forms available yet.
        </div>
      )}

      {showReefEditor && (
        <ReefNotesEditor
          weekStart={getWeekStart()}
          onClose={() => setShowReefEditor(false)}
          onSaveAndPrint={() => {
            setShowReefEditor(false)
            window.open(`/api/print-center/week-at-a-glance?week_start=${getWeekStart()}&format=print`, '_blank')
          }}
        />
      )}

      {!loading && !error && forms.length > 0 && (
        <div className="space-y-8">
          {CATEGORY_ORDER.filter((c) => byCategory[c]?.length).map((cat) => {
            const meta = CATEGORY_META[cat] || {
              label: cat,
              description: '',
              color: 'bg-gray-50 border-gray-200',
            }
            return (
              <section key={cat}>
                <div className="mb-3">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {meta.label}
                  </h2>
                  {meta.description && (
                    <p className="text-sm text-gray-600">{meta.description}</p>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {byCategory[cat].map((form) => {
                    const Icon = getIcon(form.icon)
                    const isDynamic = form.form_type === 'dynamic'
                    const hasFile = !!form.file_url
                    const isGenerating = generating === form.id
                    const disabled =
                      !isDynamic && !hasFile ? true : isGenerating
                    return (
                      <div
                        key={form.id}
                        className={`p-4 rounded-xl border ${meta.color} flex flex-col`}
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className="p-2 bg-white rounded-lg border border-gray-200">
                            <Icon className="w-5 h-5 text-gray-700" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 leading-tight">
                              {form.title}
                            </h3>
                            <div className="mt-1 flex items-center gap-2">
                              <span
                                className={`inline-block text-[10px] uppercase font-bold tracking-wide px-2 py-0.5 rounded ${
                                  isDynamic
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {isDynamic ? 'Live Data' : 'Blank Template'}
                              </span>
                            </div>
                          </div>
                        </div>
                        {form.description && (
                          <p className="text-xs text-gray-600 mb-3 flex-1">
                            {form.description}
                          </p>
                        )}
                        <button
                          onClick={() => handlePrint(form)}
                          disabled={disabled}
                          className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                            disabled
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : isDynamic
                              ? 'bg-blue-600 hover:bg-blue-700 text-white'
                              : 'bg-white hover:bg-gray-50 border border-gray-300 text-gray-800'
                          }`}
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Generating…
                            </>
                          ) : !isDynamic && !hasFile ? (
                            'Upload pending'
                          ) : isDynamic ? (
                            <>
                              <Download className="w-4 h-4" />
                              Generate & Print
                            </>
                          ) : (
                            <>
                              <Printer className="w-4 h-4" />
                              Open & Print
                            </>
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
