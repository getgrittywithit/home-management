'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, Circle, Star, Clock, Sparkles, MessageSquare, Send, AlertTriangle } from 'lucide-react'
import EnrichmentCard from './EnrichmentCard'

// ============================================================================
// Types
// ============================================================================
interface DayTask {
  id: string
  label: string
  description?: string
  steps: string[]
  stars: number
  completed: boolean
  source: string // 'zone' | 'habit' | 'school' | 'belle' | 'dishes' | 'daily_care'
  sourceId?: string
  timeBlock: 'morning' | 'school' | 'afternoon' | 'evening'
}

interface StarPopup {
  amount: number
  key: number
}

interface MyDayViewProps {
  kidName: string
  previewMode?: boolean
  onStarEarned?: (amount: number, source: string) => void
}

// ============================================================================
// Constants
// ============================================================================
const BELLE_WEEKDAY: Record<number, string> = {
  1: 'kaylee', 2: 'amos', 3: 'hannah', 4: 'wyatt', 5: 'ellie',
}

const DISH_ROTATION: Record<number, string> = {
  1: 'kaylee', 2: 'amos', 3: 'hannah', 4: 'wyatt', 5: 'ellie', 6: 'zoey',
}

const MED_KIDS = ['amos', 'wyatt'] // Kids who take Focalin AM + Clonidine PM

const BLOCK_STYLES: Record<string, { border: string; bg: string; header: string; headerText: string; icon: string }> = {
  morning: { border: 'border-amber-200', bg: 'bg-amber-50/50', header: 'bg-amber-100', headerText: 'text-amber-800', icon: '🌅' },
  school:  { border: 'border-blue-200',  bg: 'bg-blue-50/50',  header: 'bg-blue-100',  headerText: 'text-blue-800',  icon: '📚' },
  afternoon: { border: 'border-green-200', bg: 'bg-green-50/50', header: 'bg-green-100', headerText: 'text-green-800', icon: '🌤️' },
  evening: { border: 'border-indigo-200', bg: 'bg-indigo-50/50', header: 'bg-indigo-100', headerText: 'text-indigo-800', icon: '🌙' },
}

const BLOCK_LABELS: Record<string, string> = {
  morning: 'MORNING (do these first)',
  school: 'SCHOOL TIME',
  afternoon: 'AFTERNOON',
  evening: 'EVENING',
}

// ============================================================================
// Component
// ============================================================================
export default function MyDayView({ kidName, previewMode, onStarEarned }: MyDayViewProps) {
  const [tasks, setTasks] = useState<DayTask[]>([])
  const [loading, setLoading] = useState(true)
  const [starPopups, setStarPopups] = useState<StarPopup[]>([])
  const [noteText, setNoteText] = useState('')
  const [noteSending, setNoteSending] = useState(false)
  const [noteSent, setNoteSent] = useState(false)
  const [announcement, setAnnouncement] = useState<string | null>(null)
  const [schoolDone, setSchoolDone] = useState(false)

  const kid = kidName.toLowerCase()
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
  const dayOfWeek = now.getDay() // 0=Sun
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5
  const isBelleDay = BELLE_WEEKDAY[dayOfWeek] === kid
  const isDishDay = DISH_ROTATION[dayOfWeek] === kid
  const hasMeds = MED_KIDS.includes(kid)
  const displayName = kidName.charAt(0).toUpperCase() + kidName.slice(1)

  const greetings = () => {
    const hour = now.getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  // ── Fetch all data sources ──
  const fetchTasks = useCallback(async () => {
    const allTasks: DayTask[] = []

    // Fetch task instructions
    let instructionMap: Record<string, string[]> = {}
    try {
      const instrRes = await fetch('/api/homeschool?action=get_task_instructions')
      const instrData = await instrRes.json()
      for (const instr of (instrData.instructions || [])) {
        instructionMap[`${instr.task_source}:${instr.task_key}`] = instr.steps
      }
    } catch { /* no instructions available */ }

    // 1. Homeschool tasks (school block)
    try {
      const res = await fetch(`/api/homeschool?action=get_todays_tasks&kid_name=${kid}`)
      const data = await res.json()
      for (const task of (data.tasks || [])) {
        allTasks.push({
          id: `school-${task.id}`,
          label: task.task_label,
          description: task.task_description || undefined,
          steps: task.task_description ? [task.task_description] : [],
          stars: task.stars_value || 2,
          completed: task.completed,
          source: 'school',
          sourceId: task.id,
          timeBlock: 'school',
        })
      }
    } catch { /* no school tasks */ }

    // 2. Zone chores (morning + afternoon)
    try {
      const res = await fetch(`/api/kids/zone-tasks?kid_name=${kid}`)
      const data = await res.json()
      const zoneName = data.zone_name || ''
      const zoneKey = zoneName.toLowerCase().replace(/[^a-z]/g, '_').replace(/_+/g, '_')
      const zoneSteps = instructionMap[`zone:${zoneKey}`] || [`Complete your ${zoneName} zone tasks`]
      if (zoneName) {
        allTasks.push({
          id: 'zone-morning',
          label: `Morning Zone: ${zoneName}`,
          steps: zoneSteps,
          stars: 8,
          completed: false,
          source: 'zone',
          timeBlock: 'morning',
        })
        allTasks.push({
          id: 'zone-afternoon',
          label: `Afternoon Zone: ${zoneName}`,
          steps: ['Re-check your zone area', 'Touch up anything that needs it', 'Make sure it stays clean'],
          stars: 8,
          completed: false,
          source: 'zone',
          timeBlock: 'afternoon',
        })
      }
    } catch { /* no zone data */ }

    // 3. Static morning tasks
    allTasks.push({
      id: 'make-bed',
      label: 'Make bed',
      steps: instructionMap['habit:make_bed'] || ['Pull up sheets', 'Straighten comforter', 'Arrange pillows'],
      stars: 2,
      completed: false,
      source: 'habit',
      timeBlock: 'morning',
    })

    if (hasMeds) {
      allTasks.push({
        id: 'med-am',
        label: 'Morning Focalin',
        steps: instructionMap['habit:morning_focalin'] || ['Take with breakfast, not on empty stomach'],
        stars: 2,
        completed: false,
        source: 'daily_care',
        timeBlock: 'morning',
      })
    }

    if (isBelleDay) {
      allTasks.push({
        id: 'belle-am',
        label: 'Belle: AM Feed + Walk',
        steps: instructionMap['belle:am_feed_walk'] || ['Fresh water', '1 scoop food', 'Walk — leash + bags'],
        stars: 6,
        completed: false,
        source: 'belle',
        timeBlock: 'morning',
      })
    }

    if (isDishDay) {
      allTasks.push({
        id: 'dishes-morning',
        label: 'Morning Dishes Helper',
        steps: instructionMap['dishes:morning_dishes'] || ['Clear dishes to sink', 'Wipe table', 'Load dishwasher'],
        stars: 3,
        completed: false,
        source: 'dishes',
        timeBlock: 'morning',
      })
    }

    // 4. Afternoon tasks
    allTasks.push({
      id: 'dishes-lunch',
      label: 'Lunch Dishes',
      steps: instructionMap['dishes:lunch_dishes'] || ['Wash 5 items', 'Dry and put away', 'Wipe counters'],
      stars: 3,
      completed: false,
      source: 'dishes',
      timeBlock: 'afternoon',
    })

    allTasks.push({
      id: 'school-room-clean',
      label: 'School Room Group Clean',
      steps: instructionMap['habit:school_room_clean'] || ['Put away materials', 'Wipe desk', 'Push in chairs'],
      stars: 3,
      completed: false,
      source: 'habit',
      timeBlock: 'afternoon',
    })

    // 5. Evening tasks
    if (isBelleDay) {
      allTasks.push({
        id: 'belle-pm-feed',
        label: 'Belle: PM Feed',
        steps: instructionMap['belle:pm_feed'] || ['1 scoop food at 5pm', 'Check water'],
        stars: 3,
        completed: false,
        source: 'belle',
        timeBlock: 'evening',
      })
      allTasks.push({
        id: 'belle-pm-walk',
        label: 'Belle: PM Walk',
        steps: instructionMap['belle:pm_walk'] || ['Walk at 6:30pm', 'Leash + poop bags'],
        stars: 3,
        completed: false,
        source: 'belle',
        timeBlock: 'evening',
      })
    }

    allTasks.push({
      id: 'evening-tidy',
      label: 'Evening Tidy & Reset',
      steps: instructionMap['habit:evening_tidy'] || ['Pick up items', 'Shoes by door', 'Bag ready for tomorrow'],
      stars: 3,
      completed: false,
      source: 'habit',
      timeBlock: 'evening',
    })

    if (hasMeds) {
      allTasks.push({
        id: 'med-pm',
        label: 'Evening Clonidine',
        steps: instructionMap['habit:evening_clonidine'] || ['Take at bedtime with water'],
        stars: 2,
        completed: false,
        source: 'daily_care',
        timeBlock: 'evening',
      })
    }

    allTasks.push({
      id: 'dental-pm',
      label: 'Brush + Floss',
      steps: instructionMap['habit:brush_teeth_pm'] || ['2 minutes, all 4 quadrants', 'Floss', 'Rinse'],
      stars: 1,
      completed: false,
      source: 'habit',
      timeBlock: 'evening',
    })

    // Load completions from checklist
    try {
      const today = now.toLocaleDateString('en-CA')
      const res = await fetch(`/api/kids/checklist?child=${kid}&date=${today}`)
      const data = await res.json()
      const completedIds = new Set((data.items || []).filter((i: any) => i.completed).map((i: any) => i.id))
      for (const t of allTasks) {
        if (completedIds.has(t.id)) t.completed = true
      }
    } catch { /* no checklist data */ }

    setTasks(allTasks)
    setLoading(false)

    // Check if all school tasks are done
    const schoolTasks = allTasks.filter(t => t.timeBlock === 'school')
    setSchoolDone(schoolTasks.length > 0 && schoolTasks.every(t => t.completed))

    // Load announcement
    try {
      const msgRes = await fetch('/api/kids/messages?action=get_announcements')
      const msgData = await msgRes.json()
      if (msgData.announcements?.length > 0) {
        setAnnouncement(msgData.announcements[0].message)
      }
    } catch { /* no announcements */ }
  }, [kid, isBelleDay, isDishDay, hasMeds, now])

  useEffect(() => { fetchTasks() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Toggle task ──
  const handleToggle = async (task: DayTask) => {
    if (previewMode) return

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t))

    if (!task.completed) {
      // Show star popup
      const key = Date.now()
      setStarPopups(prev => [...prev, { amount: task.stars, key }])
      setTimeout(() => setStarPopups(prev => prev.filter(p => p.key !== key)), 2000)

      // Award stars
      try {
        const taskType = task.source === 'zone' ? 'zone_chore' :
          task.source === 'belle' ? 'belle_care' :
          task.source === 'school' ? 'lesson' :
          task.source === 'daily_care' ? 'med_am' :
          'daily_chore'

        await fetch('/api/digi-pet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'award_task_stars',
            kid_name: kid,
            task_type: taskType,
            source_ref: `myday-${task.id}-${now.toLocaleDateString('en-CA')}`,
          }),
        })
      } catch { /* star award failed */ }

      // For school tasks, also toggle in homeschool system
      if (task.source === 'school' && task.sourceId) {
        try {
          await fetch('/api/homeschool', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'toggle_task', task_id: task.sourceId, kid_name: kid }),
          })
        } catch { /* toggle failed */ }
      }

      onStarEarned?.(task.stars, task.source)
    }

    // Check school completion
    const updatedTasks = tasks.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t)
    const schoolTasks = updatedTasks.filter(t => t.timeBlock === 'school')
    setSchoolDone(schoolTasks.length > 0 && schoolTasks.every(t => t.completed))
  }

  // ── Send note ──
  const handleSendNote = async () => {
    if (!noteText.trim() || previewMode) return
    setNoteSending(true)
    try {
      await fetch('/api/kids/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_message', kid_name: kid, message: noteText, type: 'note' }),
      })
      setNoteSent(true)
      setNoteText('')
      setTimeout(() => setNoteSent(false), 3000)
    } catch { /* send failed */ }
    setNoteSending(false)
  }

  // ── Render ──
  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[1,2,3].map(i => (
          <div key={i} className="rounded-xl border border-gray-200 p-5 animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-1/3 mb-4" />
            <div className="space-y-2">
              <div className="h-4 bg-gray-100 rounded" />
              <div className="h-4 bg-gray-100 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.completed).length
  const totalStars = tasks.filter(t => t.completed).reduce((sum, t) => sum + t.stars, 0)
  const blocks = ['morning', 'school', 'afternoon', 'evening'] as const

  const countByBlock = (block: string) => {
    const blockTasks = tasks.filter(t => t.timeBlock === block)
    return { total: blockTasks.length, done: blockTasks.filter(t => t.completed).length }
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4">
      {/* Star popups */}
      {starPopups.map(p => (
        <div key={p.key} className="fixed top-20 right-6 z-50 pointer-events-none">
          <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 font-bold px-4 py-2 rounded-full shadow-lg text-sm flex items-center gap-1"
            style={{ animation: 'starFloat 2s ease-out forwards' }}>
            <Star className="w-4 h-4 fill-yellow-500" /> +{p.amount} stars
          </div>
        </div>
      ))}
      <style>{`@keyframes starFloat { 0% { opacity:0; transform:translateY(10px) scale(0.8); } 15% { opacity:1; transform:translateY(0) scale(1); } 70% { opacity:1; transform:translateY(-20px); } 100% { opacity:0; transform:translateY(-40px) scale(0.9); } }`}</style>

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl p-5">
        <h1 className="text-2xl font-bold">{greetings()}, {displayName}!</h1>
        <p className="text-blue-100 text-sm mt-1">
          {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <div className="flex gap-3 mt-3">
          {blocks.map(block => {
            const c = countByBlock(block)
            if (c.total === 0) return null
            const done = c.done === c.total
            return (
              <div key={block} className={`px-3 py-2 rounded-xl text-center ${done ? 'bg-white/20' : 'bg-white/10'}`}>
                <div className="text-lg font-bold">{c.done}/{c.total}</div>
                <div className="text-[10px] uppercase tracking-wider opacity-80">
                  {block === 'morning' ? 'Chores' : block === 'school' ? 'School' : block === 'afternoon' ? 'After' : 'Evening'}
                </div>
              </div>
            )
          })}
          <div className="px-3 py-2 rounded-xl text-center bg-yellow-400/20 ml-auto">
            <div className="text-lg font-bold flex items-center gap-1">
              <Star className="w-4 h-4 fill-white" /> {totalStars}
            </div>
            <div className="text-[10px] uppercase tracking-wider opacity-80">Today</div>
          </div>
        </div>
      </div>

      {/* Time blocks */}
      {blocks.map(block => {
        const blockTasks = tasks.filter(t => t.timeBlock === block)
        if (blockTasks.length === 0) return null
        const style = BLOCK_STYLES[block]
        const allDone = blockTasks.every(t => t.completed)

        return (
          <div key={block}>
            <div className={`rounded-2xl border-2 ${style.border} ${style.bg} overflow-hidden`}>
              <div className={`${style.header} px-5 py-3 flex items-center justify-between`}>
                <h2 className={`font-bold ${style.headerText} flex items-center gap-2`}>
                  <span>{style.icon}</span> {BLOCK_LABELS[block]}
                </h2>
                {allDone && <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">All done!</span>}
              </div>

              <div className="p-3 space-y-1">
                {blockTasks.map(task => (
                  <button
                    key={task.id}
                    onClick={() => handleToggle(task)}
                    disabled={previewMode}
                    className={`w-full text-left rounded-xl p-3 transition-all ${
                      task.completed
                        ? 'bg-white/60 opacity-60'
                        : 'bg-white hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5" style={task.completed ? { animation: 'checkPop 0.3s ease' } : {}}>
                        {task.completed ? (
                          <CheckCircle2 className="w-6 h-6 text-green-500" />
                        ) : (
                          <Circle className="w-6 h-6 text-gray-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`font-medium ${task.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                            {task.label}
                          </span>
                          <span className="text-xs text-amber-600 font-medium shrink-0 ml-2 flex items-center gap-0.5">
                            +{task.stars} <Star className="w-3 h-3" />
                          </span>
                        </div>
                        {/* Steps — always visible */}
                        {!task.completed && task.steps.length > 0 && (
                          <div className="mt-1.5 space-y-0.5">
                            {task.steps.map((step, i) => (
                              <div key={i} className="text-xs text-gray-500 flex items-start gap-1.5 pl-0.5">
                                <span className="text-gray-300 mt-px">├─</span>
                                <span>{step}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Enrichment trigger after school */}
            {block === 'school' && schoolDone && (
              <div className="mt-2">
                <EnrichmentCard kidName={kidName} subject="math" onStarEarned={onStarEarned} />
              </div>
            )}
          </div>
        )
      })}

      <style>{`@keyframes checkPop { 0% { transform: scale(1); } 50% { transform: scale(1.3); } 100% { transform: scale(1); } }`}</style>

      {/* Messages & Alerts */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-600" />
          Messages
        </h2>

        {announcement && (
          <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-lg p-3">
            <p className="text-xs font-medium text-amber-800">Message from Mom</p>
            <p className="text-sm text-amber-700 mt-0.5">{announcement}</p>
          </div>
        )}

        <div>
          <p className="text-sm text-gray-600 mb-2">Leave a Note for Mom</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendNote()}
              placeholder="Type a message..."
              disabled={previewMode}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-400 focus:outline-none disabled:opacity-50"
            />
            <button
              onClick={handleSendNote}
              disabled={!noteText.trim() || noteSending || previewMode}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          {noteSent && <p className="text-xs text-green-600 mt-1">Sent!</p>}
        </div>
      </div>
    </div>
  )
}
