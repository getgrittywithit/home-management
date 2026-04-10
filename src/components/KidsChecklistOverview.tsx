'use client'

import { useState } from 'react'
import { CheckCircle2, Clock, ChevronDown, ChevronUp, Bell, Loader2 } from 'lucide-react'
import { useDashboardData } from '@/context/DashboardDataContext'

const KID_DISPLAY: Record<string, string> = { amos: 'Amos', ellie: 'Ellie', wyatt: 'Wyatt', hannah: 'Hannah', zoey: 'Zoey', kaylee: 'Kaylee' }
const ALL_KIDS = ['amos', 'ellie', 'wyatt', 'hannah', 'zoey', 'kaylee']

interface KidCompletion {
  name: string
  required: { done: number; total: number }
  dailyCare: { done: number; total: number }
  earnMoney: { done: number; total: number }
}

function pctColor(done: number, total: number): string {
  if (total === 0) return 'text-gray-400'
  const pct = (done / total) * 100
  return pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'
}

function pctBg(done: number, total: number): string {
  if (total === 0) return 'bg-gray-300'
  const pct = (done / total) * 100
  return pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
}

export default function KidsChecklistOverview() {
  const { kidsChecklist, taskProgress, loaded } = useDashboardData()
  const [expandedKid, setExpandedKid] = useState<string | null>(null)
  const [kidTasks, setKidTasks] = useState<any[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [nudgeSent, setNudgeSent] = useState<Record<string, boolean>>({})
  const [toastMsg, setToastMsg] = useState('')

  const checklistKids = kidsChecklist.kids || []
  const progress = taskProgress.progress || []

  let kids: KidCompletion[]
  if (checklistKids.length > 0 && checklistKids.some((k: any) => k.required?.total > 0)) {
    kids = checklistKids
  } else if (progress.length > 0) {
    kids = ALL_KIDS.map(name => {
      const tp = progress.find((p: any) => p.kid_name === name)
      return { name, required: { done: tp?.completed_tasks || 0, total: tp?.total_tasks || 0 }, dailyCare: { done: 0, total: 0 }, earnMoney: { done: 0, total: 0 } }
    })
  } else {
    kids = ALL_KIDS.map(name => ({ name, required: { done: 0, total: 0 }, dailyCare: { done: 0, total: 0 }, earnMoney: { done: 0, total: 0 } }))
  }

  const weekOf = kidsChecklist.weekOf || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

  const toggleExpand = async (kidName: string) => {
    if (expandedKid === kidName) {
      setExpandedKid(null)
      return
    }
    setExpandedKid(kidName)
    setLoadingTasks(true)
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
    const res = await fetch(`/api/kids/checklist?action=get_all_completion&date=${today}`).then(r => r.json()).catch(() => ({}))
    // Try to get individual tasks for this kid
    const kidData = (res.kids || []).find((k: any) => k.name === kidName)
    setKidTasks(kidData?.tasks || [])
    setLoadingTasks(false)
  }

  const sendNudge = async (kidName: string) => {
    await fetch('/api/notifications', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Mom says: time to get moving!',
        message: 'Check your daily tasks — let\'s knock them out!',
        source_type: 'parent_nudge',
        source_ref: `nudge-${kidName}-${Date.now()}`,
        icon: '\uD83D\uDC4B',
        target_role: 'kid',
        kid_name: kidName,
      }),
    }).catch(() => {})
    setNudgeSent(prev => ({ ...prev, [kidName]: true }))
    setToastMsg(`Nudge sent to ${KID_DISPLAY[kidName] || kidName}!`)
    setTimeout(() => setToastMsg(''), 2000)
  }

  const toggleTask = async (kidName: string, eventId: string, eventSummary: string) => {
    await fetch('/api/kids/checklist', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', child: kidName, eventId, eventSummary }),
    }).catch(() => {})
    // Refresh tasks
    toggleExpand(kidName)
  }

  if (!loaded) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" /></div>

  const weekEnd = weekOf ? new Date(new Date(weekOf + 'T12:00:00').getTime() + 6 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
  const weekStart = weekOf ? new Date(weekOf + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''

  return (
    <div className="space-y-6 relative">
      {toastMsg && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50">
          {'\u2705'} {toastMsg}
        </div>
      )}

      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-4 md:p-6 rounded-lg sticky top-0 z-10">
        <h1 className="text-xl md:text-2xl font-bold">Kids Daily Tasks</h1>
        <p className="text-emerald-100 text-sm">Week of {weekStart} – {weekEnd}</p>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="p-3 font-medium">Kid</th>
              <th className="p-3 font-medium text-center">Required</th>
              <th className="p-3 font-medium text-center">Daily Care</th>
              <th className="p-3 font-medium text-center">Earn Money</th>
              <th className="p-3 font-medium text-center">Status</th>
              <th className="p-3 font-medium text-center w-20">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {kids.map(kid => {
              const reqPct = kid.required.total > 0 ? (kid.required.done / kid.required.total) * 100 : 0
              const isExpanded = expandedKid === kid.name
              return (
                <tr key={kid.name} className="group">
                  <td className="p-3">
                    <button onClick={() => toggleExpand(kid.name)} className="flex items-center gap-1.5 font-medium text-gray-900 hover:text-indigo-600">
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                      {KID_DISPLAY[kid.name] || kid.name}
                    </button>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`font-medium ${pctColor(kid.required.done, kid.required.total)}`}>{kid.required.done}/{kid.required.total}</span>
                    {kid.required.total > 0 && (
                      <div className="w-16 h-1.5 mx-auto mt-1 bg-gray-200 rounded-full">
                        <div className={`h-full rounded-full ${pctBg(kid.required.done, kid.required.total)}`} style={{ width: `${reqPct}%` }} />
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`font-medium ${pctColor(kid.dailyCare.done, kid.dailyCare.total)}`}>{kid.dailyCare.done}/{kid.dailyCare.total}</span>
                  </td>
                  <td className="p-3 text-center">
                    <span className="text-gray-500">{kid.earnMoney.done}/{kid.earnMoney.total}</span>
                  </td>
                  <td className="p-3 text-center">
                    {reqPct >= 100 ? (
                      <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium"><CheckCircle2 className="w-3.5 h-3.5" /> Done</span>
                    ) : reqPct > 0 ? (
                      <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-medium"><Clock className="w-3.5 h-3.5" /> In Progress</span>
                    ) : (
                      <span className="text-gray-400 text-xs">Not Started</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <button onClick={() => sendNudge(kid.name)} disabled={nudgeSent[kid.name]}
                      className={`text-xs px-2 py-1 rounded ${nudgeSent[kid.name] ? 'bg-gray-100 text-gray-400' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
                      title="Send nudge notification">
                      <Bell className="w-3 h-3 inline" /> {nudgeSent[kid.name] ? 'Sent' : 'Nudge'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Expanded task list */}
        {expandedKid && (
          <div className="border-t bg-gray-50 p-4">
            <h4 className="font-medium text-gray-700 mb-2">{KID_DISPLAY[expandedKid]}&apos;s Tasks Today</h4>
            {loadingTasks ? (
              <div className="text-center py-3"><Loader2 className="w-4 h-4 animate-spin mx-auto text-gray-400" /></div>
            ) : kidTasks.length === 0 ? (
              <p className="text-sm text-gray-400">No individual task data available for today.</p>
            ) : (
              <div className="space-y-1">
                {kidTasks.map((task: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <button onClick={() => toggleTask(expandedKid, task.event_id || task.id, task.summary || task.title)}
                      className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${task.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-indigo-400'}`}>
                      {task.completed && <CheckCircle2 className="w-3 h-3" />}
                    </button>
                    <span className={task.completed ? 'text-gray-400 line-through' : 'text-gray-700'}>{task.summary || task.title || 'Task'}</span>
                    {task.category && <span className="text-xs text-gray-400 ml-auto">{task.category}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
