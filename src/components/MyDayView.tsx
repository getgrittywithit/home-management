'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, Circle, Star, Clock, Sparkles, MessageSquare, Send, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import EnrichmentCard from './EnrichmentCard'
import DigiPetMiniWidget from './DigiPetMiniWidget'
import confetti from 'canvas-confetti'
import PositiveReportButton from './PositiveReportButton'
import SpeakerButton from './SpeakerButton'
import KidMealPicker from './KidMealPicker'
import WeeklyMealCalendar from './WeeklyMealCalendar'
import GroceryDeadlineBar from './GroceryDeadlineBar'
import GroceryRequestBox from './GroceryRequestBox'
import { isOnline, queueAction, cacheData } from '@/lib/offline-store'

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

// Map task source/id to digi-pet task_type for star awards
function getDigiPetTaskType(task: DayTask): string | null {
  // ID-based matching first (most specific)
  if (task.id.startsWith('med-am-')) return 'med_am'
  if (task.id.startsWith('med-pm-')) return 'med_pm'
  if (task.id.startsWith('zone-')) return 'zone_chore'
  if (task.id.startsWith('dishes-') || task.id.startsWith('dinner-')) return 'daily_chore'
  if (task.id.startsWith('belle-')) return 'belle_care'
  if (task.id.startsWith('spike-') || task.id.startsWith('hades-') || task.id.startsWith('midnight-')) return 'pet_care'
  if (task.id.startsWith('tidy-') || task.id.includes('tidy')) return 'tidy'
  if (task.id.startsWith('hygiene-') || task.id.startsWith('skincare-')) return 'hygiene'
  if (task.id.startsWith('laundry-')) return 'daily_chore'
  if (task.id.startsWith('school-') || task.id.startsWith('schoolroom-')) return 'lesson'
  if (task.id.startsWith('parent-')) return 'parent_task'
  // Fallback by source
  if (task.source === 'zone') return 'zone_chore'
  if (task.source === 'dishes') return 'daily_chore'
  if (task.source === 'belle') return 'belle_care'
  if (task.source === 'school') return 'lesson'
  if (task.source === 'daily_care') return 'hygiene'
  if (task.source === 'habit') return 'daily_chore'
  return null
}

// ============================================================================
// Component
// ============================================================================
export default function MyDayView({ kidName, previewMode, onStarEarned }: MyDayViewProps) {
  const [tasks, setTasks] = useState<DayTask[]>([])
  const [loading, setLoading] = useState(true)
  const [starPopups, setStarPopups] = useState<StarPopup[]>([])
  const [blockCelebration, setBlockCelebration] = useState<{ block: string; message: string; key: number } | null>(null)
  const [headerBouncing, setHeaderBouncing] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteSending, setNoteSending] = useState(false)
  const [noteSent, setNoteSent] = useState(false)
  const [announcement, setAnnouncement] = useState<string | null>(null)
  const [schoolDone, setSchoolDone] = useState(false)
  const [mealRefreshKey, setMealRefreshKey] = useState(0)
  const [expandedInstructions, setExpandedInstructions] = useState<Set<string>>(new Set())
  const [weeklyGoal, setWeeklyGoal] = useState<{ target: number; earned: number } | null>(null)
  const [lessonNote, setLessonNote] = useState<string | null>(null)

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

    // Fetch task instructions for "How to do this" steps
    let instructionMap: Record<string, string[]> = {}
    try {
      const instrRes = await fetch('/api/homeschool?action=get_task_instructions')
      const instrData = await instrRes.json()
      for (const instr of (instrData.instructions || [])) {
        instructionMap[`${instr.task_source}:${instr.task_key}`] = instr.steps
      }
    } catch { /* no instructions available */ }

    // 1. Homeschool tasks (school block) — from homeschool API
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

    // 2. ALL daily tasks from checklist API (single source of truth)
    try {
      const clRes = await fetch(`/api/kids/checklist?child=${kid}`)
      const clData = await clRes.json()

      // Map time to timeBlock
      const getTimeBlock = (time: string | undefined, _cat: string): 'morning' | 'school' | 'afternoon' | 'evening' => {
        if (!time) return 'morning'
        const hour = parseInt(time) || 0
        if (time.toLowerCase().includes('pm') && hour !== 12) return hour >= 5 ? 'evening' : 'afternoon'
        if (time.includes('After') || time.includes('after')) return 'evening'
        if (hour >= 17 || time.includes('8:00 PM') || time.includes('8:30 PM') || time.includes('8:15 PM')) return 'evening'
        if (hour >= 12 || time.includes('12:') || time.includes('3:')) return 'afternoon'
        return 'morning'
      }

      const getSource = (_cat: string, id: string): string => {
        if (id.startsWith('zone-')) return 'zone'
        if (id.startsWith('belle-')) return 'belle'
        if (id.startsWith('dishes-') || id.startsWith('dinner-')) return 'dishes'
        if (id.startsWith('med-')) return 'daily_care'
        if (id.startsWith('hygiene-') || id.startsWith('skincare-')) return 'daily_care'
        if (id.startsWith('laundry-')) return 'habit'
        return 'habit'
      }

      const getStars = (_cat: string, id: string): number => {
        if (id.startsWith('zone-')) return 5
        if (id.startsWith('belle-')) return 3
        if (id.startsWith('dishes-')) return 3
        if (id.startsWith('dinner-')) return 3
        if (id.startsWith('med-')) return 2
        if (id.startsWith('laundry-')) return 3
        return 2
      }

      for (const item of [...(clData.required || []), ...(clData.dailyCare || [])]) {
        // Skip items already added from school tasks
        if (allTasks.some(t => t.id === item.id)) continue
        const tb = getTimeBlock(item.time, item.category)
        const source = getSource(item.category, item.id)
        // Look up instruction steps
        const catKey = item.category || ''
        const idBase = item.id.replace(/-\d{4}-\d{2}-\d{2}$/, '')
        const steps = instructionMap[`${catKey}:${idBase}`] || (item.description ? [item.description] : [])

        allTasks.push({
          id: item.id,
          label: item.title,
          description: item.description || undefined,
          steps,
          stars: item.points || getStars(item.category, item.id),
          completed: item.completed || false,
          source,
          timeBlock: tb,
        })
      }
    } catch { /* checklist API failed */ }

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

    // Fetch mom's lesson note for today
    try {
      const noteRes = await fetch(`/api/lesson-notes?action=get_morning_plan&kid_name=${kid}`)
      const noteData = await noteRes.json()
      setLessonNote(noteData.morning_plan || null)
    } catch { /* no note */ }

    // Fetch weekly star goal
    try {
      const goalRes = await fetch(`/api/economy?action=get_weekly_goal&kid_name=${kid}`)
      const goalData = await goalRes.json()
      if (goalData.goal) setWeeklyGoal({ target: goalData.goal.target_stars || 50, earned: goalData.goal.earned_stars || 0 })
    } catch { /* no goal data */ }
  }, [kid, isBelleDay, isDishDay, hasMeds, now])

  useEffect(() => { fetchTasks() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Celebration messages (rotates) ──
  const BLOCK_CELEBRATIONS = [
    'Great job', 'Crushed it', "You're on fire", 'Amazing work',
    'Way to go', 'Nailed it', 'Legend', 'Superstar',
  ]

  const fireBlockConfetti = (blockLabel: string) => {
    // Fire confetti from both sides toward center
    const message = BLOCK_CELEBRATIONS[Math.floor(Math.random() * BLOCK_CELEBRATIONS.length)]
    setBlockCelebration({ block: blockLabel, message, key: Date.now() })
    setTimeout(() => setBlockCelebration(null), 2500)

    try {
      const end = Date.now() + 800
      const colors = ['#fbbf24', '#f59e0b', '#34d399', '#60a5fa', '#c084fc']
      ;(function frame() {
        confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors })
        confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors })
        if (Date.now() < end) requestAnimationFrame(frame)
      })()
    } catch { /* confetti optional */ }
  }

  // ── Toggle task ──
  const handleToggle = async (task: DayTask) => {
    if (previewMode) return

    // Snapshot block state BEFORE the toggle so we can detect transition-to-complete
    const blockBefore = tasks.filter(t => t.timeBlock === task.timeBlock)
    const wasBlockComplete = blockBefore.length > 0 && blockBefore.every(t => t.completed)

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t))

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
    const sourceRef = `checklist-${task.id}-${today}`
    const taskType = getDigiPetTaskType(task)
    const online = isOnline()

    console.log('[Stars] MyDayView toggle:', { id: task.id, source: task.source, taskType, completing: !task.completed })

    // Build the actions to perform
    const checklistBody = { action: 'toggle', child: kid, eventId: task.id, eventSummary: task.label }
    const starAwardBody = taskType ? { action: 'award_task_stars', kid_name: kid, task_type: taskType, source_ref: sourceRef } : null
    const starReverseBody = taskType ? { action: 'reverse_task_stars', kid_name: kid, source_ref: sourceRef } : null

    if (!task.completed) {
      // Show star popup + bounce the header counter
      const key = Date.now()
      setStarPopups(prev => [...prev, { amount: task.stars, key }])
      setTimeout(() => setStarPopups(prev => prev.filter(p => p.key !== key)), 2000)
      setHeaderBouncing(true)
      setTimeout(() => setHeaderBouncing(false), 500)

      // Detect block completion: was NOT complete, now IS complete with this task
      const blockAfter = blockBefore.map(t => t.id === task.id ? { ...t, completed: true } : t)
      const nowBlockComplete = blockAfter.length > 0 && blockAfter.every(t => t.completed)
      if (!wasBlockComplete && nowBlockComplete) {
        const blockLabel = task.timeBlock === 'morning' ? 'Morning' :
          task.timeBlock === 'school' ? 'School' :
          task.timeBlock === 'afternoon' ? 'Afternoon' : 'Evening'
        fireBlockConfetti(blockLabel)
      }

      if (online) {
        // Award stars via digi-pet
        if (starAwardBody) {
          try {
            console.log('[Stars] MyDayView award:', kid, taskType, sourceRef)
            const res = await fetch('/api/digi-pet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(starAwardBody) })
            const data = await res.json()
            console.log('[Stars] MyDayView award result:', data)
          } catch (err) { console.error('[Stars] MyDayView award failed:', err) }
        }
        // For school tasks, also toggle in homeschool system
        if (task.source === 'school' && task.sourceId) {
          try {
            await fetch('/api/homeschool', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'toggle_task', task_id: task.sourceId, kid_name: kid }) })
          } catch { /* toggle failed */ }
        }
      } else {
        // Offline — queue the actions
        if (starAwardBody) queueAction('/api/digi-pet', 'POST', starAwardBody)
        if (task.source === 'school' && task.sourceId) {
          queueAction('/api/homeschool', 'POST', { action: 'toggle_task', task_id: task.sourceId, kid_name: kid })
        }
      }
      onStarEarned?.(task.stars, task.source)
    } else {
      // Unchecking — reverse star transaction
      if (online) {
        if (starReverseBody) {
          try {
            console.log('[Stars] MyDayView reverse:', kid, sourceRef)
            await fetch('/api/digi-pet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(starReverseBody) })
          } catch (err) { console.error('[Stars] MyDayView reverse failed:', err) }
        }
      } else {
        if (starReverseBody) queueAction('/api/digi-pet', 'POST', starReverseBody)
      }
      onStarEarned?.(0, task.source) // trigger nav bar refresh
    }

    // Always sync to daily checklist (both check and uncheck)
    if (online) {
      try {
        await fetch('/api/kids/checklist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(checklistBody) })
      } catch { /* checklist sync failed */ }
    } else {
      queueAction('/api/kids/checklist', 'POST', checklistBody)
      // Cache the optimistic state locally
      cacheData(`checklist_${kid}`, tasks.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t))
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
      {/* Star popups — upgraded fly-up + scale + fade (D74 ANIM-1) */}
      {starPopups.map(p => (
        <div key={p.key} className="fixed top-20 right-6 z-50 pointer-events-none">
          <div className="bg-gradient-to-r from-yellow-200 to-amber-300 border-2 border-yellow-400 text-amber-900 font-bold px-4 py-2 rounded-full shadow-2xl text-sm flex items-center gap-1.5"
            style={{ animation: 'starFlyUp 1.4s cubic-bezier(0.2, 0.8, 0.3, 1) forwards' }}>
            <Star className="w-5 h-5 fill-yellow-500 text-yellow-600" /> +{p.amount}
          </div>
        </div>
      ))}

      {/* Block celebration banner — D74 ANIM-2 */}
      {blockCelebration && (
        <div key={blockCelebration.key} className="fixed inset-x-0 top-24 z-[55] flex justify-center pointer-events-none px-4">
          <div
            className="bg-gradient-to-r from-fuchsia-500 via-pink-500 to-amber-400 text-white font-bold px-6 py-3 rounded-2xl shadow-2xl text-center max-w-md"
            style={{ animation: 'blockCelebrate 2.5s cubic-bezier(0.2, 0.8, 0.3, 1) forwards' }}
          >
            <div className="text-lg">🎉 {blockCelebration.message}, {displayName}! 🎉</div>
            <div className="text-xs font-semibold opacity-90 mt-0.5">{blockCelebration.block} block complete</div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes starFlyUp {
          0%   { opacity: 0; transform: translate(0, 20px) scale(0.7); }
          12%  { opacity: 1; transform: translate(0, 0) scale(1.15); }
          25%  { opacity: 1; transform: translate(0, -8px) scale(1); }
          75%  { opacity: 1; transform: translate(0, -40px) scale(1); }
          100% { opacity: 0; transform: translate(0, -80px) scale(0.6); }
        }
        @keyframes blockCelebrate {
          0%   { opacity: 0; transform: translateY(-30px) scale(0.7); }
          15%  { opacity: 1; transform: translateY(0) scale(1.08); }
          25%  { opacity: 1; transform: translateY(0) scale(1); }
          80%  { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-20px) scale(0.9); }
        }
        @keyframes headerBounce {
          0%, 100% { transform: scale(1); }
          40%      { transform: scale(1.35); }
          60%      { transform: scale(0.95); }
          80%      { transform: scale(1.08); }
        }
        .header-bouncing { animation: headerBounce 0.5s ease-out; }
      `}</style>

      {/* Pinned Mom Message — always at top */}
      {announcement && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">📌</span>
            <div>
              <p className="text-sm font-semibold text-amber-900">Message from Mom</p>
              <p className="text-sm text-amber-800 mt-1">{announcement}</p>
            </div>
          </div>
        </div>
      )}

      {/* Mom's Lesson Note */}
      {lessonNote && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">📝</span>
            <div>
              <p className="text-sm font-semibold text-purple-900">Mom&apos;s Note for Today</p>
              <p className="text-sm text-purple-800 mt-1">{lessonNote}</p>
            </div>
          </div>
        </div>
      )}

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
          <div className={`px-3 py-2 rounded-xl text-center bg-yellow-400/20 ml-auto ${headerBouncing ? 'header-bouncing' : ''}`}>
            <div className="text-lg font-bold flex items-center gap-1">
              <Star className="w-4 h-4 fill-white" /> {totalStars}
            </div>
            <div className="text-[10px] uppercase tracking-wider opacity-80">Today</div>
          </div>
        </div>
      </div>

      {/* Digi-Pet mini widget — D72 PET-1 */}
      <DigiPetMiniWidget
        kidName={kidName}
        onOpen={() => {
          try { window.dispatchEvent(new CustomEvent('kid-nav', { detail: { tab: 'digi-pet' } })) } catch { /* ignore */ }
        }}
      />

      {/* Weekly Star Goal */}
      {weeklyGoal && (
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /> Weekly Star Goal
            </span>
            <span className="text-sm font-bold text-amber-600">
              {weeklyGoal.earned}/{weeklyGoal.target}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div className={`h-full rounded-full transition-all ${weeklyGoal.earned >= weeklyGoal.target ? 'bg-green-500' : 'bg-amber-400'}`}
              style={{ width: `${Math.min(100, Math.round((weeklyGoal.earned / weeklyGoal.target) * 100))}%` }} />
          </div>
          {weeklyGoal.earned >= weeklyGoal.target && (
            <p className="text-xs text-green-600 font-medium mt-1.5">Goal met! Keep it up!</p>
          )}
          {weeklyGoal.earned === 0 && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-600 font-medium mb-1">💡 Earn stars by completing daily tasks!</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500">
                <span>🐕 Belle Care <span className="text-amber-600 font-semibold">+3 ⭐</span></span>
                <span>🧹 Zone Chores <span className="text-amber-600 font-semibold">+5 ⭐</span></span>
                <span>🌙 Bedtime Routine <span className="text-amber-600 font-semibold">+2 ⭐</span></span>
              </div>
            </div>
          )}
        </div>
      )}

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
                        {/* Collapsible "How to do this" instructions */}
                        {!task.completed && task.steps.length > 0 && (
                          <div className="mt-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setExpandedInstructions(prev => {
                                  const next = new Set(prev)
                                  if (next.has(task.id)) next.delete(task.id)
                                  else next.add(task.id)
                                  return next
                                })
                              }}
                              className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 transition-colors"
                            >
                              {expandedInstructions.has(task.id) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              <span>How to do this</span>
                            </button>
                            {expandedInstructions.has(task.id) && (
                              <div className="mt-1 space-y-0.5 pl-1 border-l-2 border-blue-100 relative">
                                <div className="absolute -top-1 right-0">
                                  <SpeakerButton steps={task.steps} size="sm" />
                                </div>
                                {task.steps.map((step, i) => (
                                  <div key={i} className="text-xs text-gray-600 flex items-start gap-1.5 pl-1 pr-7">
                                    <span className="text-blue-300 font-bold mt-px">{i + 1}.</span>
                                    <span>{step}</span>
                                  </div>
                                ))}
                              </div>
                            )}
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

      {/* Meal Picker */}
      <WeeklyMealCalendar key={mealRefreshKey} kidName={kidName} compact />
      <GroceryDeadlineBar kidName={kidName} />
      <KidMealPicker kidName={kidName} previewMode={previewMode} onPick={() => setMealRefreshKey(k => k + 1)} />
      <GroceryRequestBox kidName={kidName} />

      {/* Messages & Alerts */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-600" />
          Messages
        </h2>

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

        {/* Positive reporting */}
        {!previewMode && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
            <PositiveReportButton kidName={kidName} source="self" />
            <PositiveReportButton kidName={kidName} source="sibling" />
          </div>
        )}
      </div>
    </div>
  )
}
