'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Circle, X } from 'lucide-react'

const KID_DISPLAY: Record<string, string> = {
  amos: 'Amos', ellie: 'Ellie', wyatt: 'Wyatt', hannah: 'Hannah', kaylee: 'Kaylee'
}
const BELLE_KIDS = ['amos', 'ellie', 'wyatt', 'hannah', 'kaylee']

interface Task { key: string; label: string; emoji: string; time: string; completed: boolean }
interface GroomTask { key: string; label: string; emoji: string; completed: boolean }
interface IncomingSwap { id: string; requesting_kid: string; swap_type: string; swap_date: string; reason: string }

export default function BelleCareCard({ childName }: { childName: string }) {
  const [info, setInfo] = useState<any>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [grooming, setGrooming] = useState<GroomTask[]>([])
  const [loaded, setLoaded] = useState(false)
  const [showSwapModal, setShowSwapModal] = useState(false)
  const [swapTarget, setSwapTarget] = useState('')
  const [swapReason, setSwapReason] = useState('')
  const [swapSending, setSwapSending] = useState(false)
  const [swapSent, setSwapSent] = useState(false)

  const childKey = childName.toLowerCase()

  useEffect(() => {
    if (childKey === 'zoey') { setLoaded(true); return }
    Promise.all([
      fetch(`/api/kids/belle?action=get_my_assignment_info&kid=${childKey}`).then(r => r.json()),
      fetch(`/api/kids/belle?action=get_my_tasks_today&kid=${childKey}`).then(r => r.json()),
    ]).then(([infoData, taskData]) => {
      setInfo(infoData)
      if (taskData.assigned) {
        setTasks(taskData.tasks || [])
        setGrooming(taskData.grooming || [])
      }
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [childKey])

  const toggleTask = async (taskKey: string, completed: boolean) => {
    setTasks(prev => prev.map(t => t.key === taskKey ? { ...t, completed: !completed } : t))
    await fetch('/api/kids/belle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: completed ? 'uncomplete_task' : 'complete_task', kid_name: childKey, task: taskKey })
    }).catch(() => {})
  }

  const toggleGrooming = async (taskKey: string, completed: boolean) => {
    setGrooming(prev => prev.map(t => t.key === taskKey ? { ...t, completed: !completed } : t))
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
    const d = new Date(today + 'T12:00:00')
    const dow = d.getDay()
    const satDate = dow === 0 ? new Date(d.getTime() - 86400000).toLocaleDateString('en-CA') : today
    await fetch('/api/kids/belle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete_grooming_task', kid_name: childKey, task: taskKey, weekend_start: satDate })
    }).catch(() => {})
  }

  const sendSwap = async () => {
    if (!swapTarget || swapReason.trim().length < 5) return
    setSwapSending(true)
    const swapDate = info?.isToday
      ? new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      : info?.nextWeekendSat || info?.nextWeekdayDate || ''
    const swapType = info?.upcomingWeekendThisWeek ? 'weekend' : 'weekday'
    await fetch('/api/kids/belle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'request_swap', requesting_kid: childKey, covering_kid: swapTarget, swap_type: swapType, swap_date: swapDate, reason: swapReason.trim() })
    })
    setSwapSending(false)
    setSwapSent(true)
    setShowSwapModal(false)
  }

  const respondSwap = async (id: string, response: 'accepted' | 'declined') => {
    await fetch('/api/kids/belle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'respond_to_swap', id, response })
    })
    setInfo((prev: any) => ({ ...prev, incomingSwaps: (prev?.incomingSwaps || []).filter((s: any) => s.id !== id) }))
  }

  const cancelSwap = async (id: string) => {
    await fetch('/api/kids/belle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel_swap', id })
    })
    setInfo((prev: any) => ({ ...prev, outgoingSwap: null }))
  }

  if (!loaded) return null
  if (childKey === 'zoey') return null

  if (!info) return null

  // ── Incoming swap requests ──
  const incomingSwaps: IncomingSwap[] = info.incomingSwaps || []

  // ── State 1: Today IS their day ──
  if (info.isToday) {
    const done = tasks.filter(t => t.completed).length + grooming.filter(t => t.completed).length
    const total = tasks.length + grooming.length
    const allDone = done === total && total > 0
    const coveringFor = info.acceptedCovering?.find((s: any) => s.swap_date === new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }))

    return (
      <div className="space-y-3">
        {incomingSwaps.map(s => <SwapRequestCard key={s.id} swap={s} onRespond={respondSwap} />)}
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className={`px-4 py-3 flex items-center justify-between ${coveringFor ? 'bg-blue-100' : 'bg-gradient-to-r from-amber-100 to-orange-100'}`}>
            <div>
              <h3 className="font-semibold text-amber-900 text-sm">🐾 Belle Care — Your Day!</h3>
              {coveringFor && <p className="text-xs text-blue-700">🔄 Covering for {KID_DISPLAY[coveringFor.requesting_kid]}</p>}
            </div>
            <span className="text-sm font-bold text-amber-800">{done}/{total}</span>
          </div>
          {allDone ? (
            <div className="p-5 text-center">
              <p className="text-2xl">🐾✨</p>
              <p className="text-sm font-medium text-green-700 mt-1">Belle is all taken care of!</p>
            </div>
          ) : (
            <div className="divide-y">
              {tasks.map(t => (
                <TaskRow key={t.key} task={t} onToggle={() => toggleTask(t.key, t.completed)} />
              ))}
              {grooming.length > 0 && (
                <>
                  <div className="px-4 py-2 bg-purple-50 text-xs font-medium text-purple-700">Weekend Grooming (due by Sunday midnight)</div>
                  {grooming.map(t => (
                    <TaskRow key={t.key} task={{ ...t, time: '' }} onToggle={() => toggleGrooming(t.key, t.completed)} />
                  ))}
                </>
              )}
            </div>
          )}
          <p className="px-4 py-2 text-xs text-gray-400 italic">Belle can't tell you when she needs care — that's why she's counting on you 🐾</p>
        </div>
      </div>
    )
  }

  // ── State 3: Weekend coming this week ──
  if (info.upcomingWeekendThisWeek) {
    return (
      <div className="space-y-3">
        {incomingSwaps.map(s => <SwapRequestCard key={s.id} swap={s} onRespond={respondSwap} />)}
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <h3 className="font-semibold text-amber-900 text-sm mb-2">🐾 Belle Care — Weekend Coming!</h3>
          <p className="text-sm text-gray-700 mb-3">
            Your day is every <span className="font-medium">{info.myWeekday}</span> + this weekend (Sat–Sun)!
          </p>
          <div className="space-y-1 text-sm text-gray-600 mb-3">
            <p>🐾 AM Feed + Walk — Sat & Sun, 7:00 AM</p>
            <p>🍽️ PM Feed — Sat & Sun, 5:00 PM</p>
            <p>🌙 PM Walk — Sat & Sun, 7:00 PM</p>
          </div>
          {info.daysUntilWeekday && (
            <p className="text-xs text-gray-500">Your next weekday: {info.myWeekday}, {info.nextWeekdayDate}</p>
          )}
          <SwapButton info={info} onOpen={() => setShowSwapModal(true)} onCancel={cancelSwap} swapSent={swapSent} />
        </div>
        {showSwapModal && <SwapModal childKey={childKey} info={info} swapTarget={swapTarget} setSwapTarget={setSwapTarget} swapReason={swapReason} setSwapReason={setSwapReason} onSend={sendSwap} onClose={() => setShowSwapModal(false)} sending={swapSending} />}
      </div>
    )
  }

  // ── State 2: Not their day ──
  return (
    <div className="space-y-3">
      {incomingSwaps.map(s => <SwapRequestCard key={s.id} swap={s} onRespond={respondSwap} />)}
      <div className="bg-white rounded-lg border shadow-sm p-4">
        <h3 className="font-semibold text-gray-700 text-sm mb-2">🐾 Belle Care</h3>
        <p className="text-sm text-gray-600">
          Your day is every <span className="font-medium">{info.myWeekday}</span>
        </p>
        <p className="text-sm text-gray-500">
          Today Belle is with <span className="font-medium">{KID_DISPLAY[info.todayAssignee] || info.todayAssignee}</span> 🐾
        </p>
        {info.daysUntilWeekday && (
          <p className="text-xs text-gray-400 mt-2">Your next day with Belle: in {info.daysUntilWeekday} days ({info.myWeekday}, {info.nextWeekdayDate})</p>
        )}
        {info.nextWeekendDaysAway && info.nextWeekendDaysAway <= 14 && (
          <p className="text-xs text-gray-400">Your weekend with Belle: in {info.nextWeekendDaysAway} days</p>
        )}
        <SwapButton info={info} onOpen={() => setShowSwapModal(true)} onCancel={cancelSwap} swapSent={swapSent} />
      </div>
      {showSwapModal && <SwapModal childKey={childKey} info={info} swapTarget={swapTarget} setSwapTarget={setSwapTarget} swapReason={swapReason} setSwapReason={setSwapReason} onSend={sendSwap} onClose={() => setShowSwapModal(false)} sending={swapSending} />}
    </div>
  )
}

// ── Sub-components ──

function TaskRow({ task, onToggle }: { task: { key: string; label: string; emoji: string; time: string; completed: boolean }; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50">
      {task.completed ? <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" /> : <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />}
      <span className="text-base">{task.emoji}</span>
      <span className={`text-sm flex-1 ${task.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>{task.label}</span>
      {task.time && <span className="text-xs text-gray-400">{task.time}</span>}
    </button>
  )
}

function SwapButton({ info, onOpen, onCancel, swapSent }: { info: any; onOpen: () => void; onCancel: (id: string) => void; swapSent: boolean }) {
  if (swapSent) return <p className="text-xs text-teal-600 mt-2">Request sent!</p>
  if (info.outgoingSwap) {
    return (
      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs text-gray-500">⏳ Waiting on {KID_DISPLAY[info.outgoingSwap.covering_kid]}...</span>
        <button onClick={() => onCancel(info.outgoingSwap.id)} className="text-xs text-red-500 hover:text-red-700">Cancel</button>
      </div>
    )
  }
  return (
    <button onClick={onOpen} className="mt-3 text-xs text-teal-600 hover:text-teal-800 font-medium">
      Need a swap? 🔄
    </button>
  )
}

function SwapModal({ childKey, info, swapTarget, setSwapTarget, swapReason, setSwapReason, onSend, onClose, sending }: any) {
  const others = BELLE_KIDS.filter(k => k !== childKey)
  const isWeekend = info.upcomingWeekendThisWeek
  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">🔄 Request a Swap</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        {isWeekend && (
          <div className="p-2 bg-amber-50 rounded text-xs text-amber-700 mb-3">Weekend swaps cover BOTH Saturday AND Sunday.</div>
        )}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Ask who?</label>
            <select value={swapTarget} onChange={e => setSwapTarget(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mt-1">
              <option value="">Pick someone...</option>
              {others.map(k => <option key={k} value={k}>{KID_DISPLAY[k]}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Why do you need a swap?</label>
            <input type="text" value={swapReason} onChange={e => setSwapReason(e.target.value)}
              placeholder="At least 5 characters..."
              className="w-full border rounded-lg px-3 py-2 text-sm mt-1" />
          </div>
          <button onClick={onSend} disabled={!swapTarget || swapReason.trim().length < 5 || sending}
            className="w-full bg-teal-500 text-white py-2 rounded-lg text-sm hover:bg-teal-600 disabled:opacity-50">
            Send Request
          </button>
        </div>
      </div>
    </div>
  )
}

function SwapRequestCard({ swap, onRespond }: { swap: IncomingSwap; onRespond: (id: string, r: 'accepted' | 'declined') => void }) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h4 className="font-semibold text-blue-900 text-sm mb-1">🔄 Swap Request from {KID_DISPLAY[swap.requesting_kid]}</h4>
      <p className="text-sm text-blue-800">
        Asking you to cover Belle on {swap.swap_type === 'weekend' ? 'this weekend' : swap.swap_date}
      </p>
      <p className="text-xs text-blue-600 mt-1">Reason: "{swap.reason}"</p>
      {swap.swap_type === 'weekend' && (
        <p className="text-xs text-blue-700 mt-1 font-medium">This means you'd cover ALL of Belle's care both days.</p>
      )}
      <div className="flex gap-2 mt-3">
        <button onClick={() => onRespond(swap.id, 'accepted')} className="bg-green-500 text-white px-3 py-1.5 rounded text-xs hover:bg-green-600">✅ Yes, I'll cover</button>
        <button onClick={() => onRespond(swap.id, 'declined')} className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-xs hover:bg-gray-300">❌ Sorry, I can't</button>
      </div>
    </div>
  )
}
