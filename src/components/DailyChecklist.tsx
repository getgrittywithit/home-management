'use client'

import { useState, useEffect } from 'react'
import {
  CheckCircle2, Circle, Lock, DollarSign, Sparkles,
  Dog, Utensils, Home, Trash2, Trophy, ChevronDown, ChevronUp, Heart, Camera,
} from 'lucide-react'
import ZoneDetailCard from './ZoneDetailCard'
import MorningCheckinCard from './MorningCheckinCard'

// Map checklist categories/ids to digi-pet star task_types
function getStarTaskType(item: { id: string; category: string }): string | null {
  if (item.id.startsWith('med-am-')) return 'med_am'
  if (item.id.startsWith('med-pm-')) return 'med_pm'
  if (item.category === 'zone') return 'zone_chore'
  if (item.category === 'dishes') return 'daily_chore'
  if (item.category === 'belle') return 'belle_care'
  if (item.category === 'school_clean') return 'lesson'
  return null
}

// Award digi-pet stars after a task completion
async function awardTaskStars(kidName: string, item: { id: string; category: string }) {
  const taskType = getStarTaskType(item)
  if (!taskType) return null
  try {
    const res = await fetch('/api/digi-pet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'award_task_stars',
        kid_name: kidName.toLowerCase(),
        task_type: taskType,
        source_ref: `checklist-${item.id}-${new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })}`,
      }),
    })
    return await res.json()
  } catch {
    return null
  }
}

interface ChecklistItem {
  id: string
  title: string
  description?: string
  category: string
  time?: string
  points?: number
  completed: boolean
}

interface DailyChecklistProps {
  childName: string
  onStarEarned?: (amount: number) => void
}

const CATEGORY_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  zone: { icon: <Home className="w-4 h-4" />, color: 'text-amber-600' },
  dishes: { icon: <Utensils className="w-4 h-4" />, color: 'text-blue-600' },
  belle: { icon: <Dog className="w-4 h-4" />, color: 'text-purple-600' },
  tidy: { icon: <Sparkles className="w-4 h-4" />, color: 'text-green-600' },
  school_clean: { icon: <Trash2 className="w-4 h-4" />, color: 'text-teal-600' },
  parent_task: { icon: <Sparkles className="w-4 h-4" />, color: 'text-rose-600' },
  hygiene: { icon: <Sparkles className="w-4 h-4" />, color: 'text-sky-600' },
  earn_money: { icon: <DollarSign className="w-4 h-4" />, color: 'text-emerald-600' },
  pet: { icon: <Heart className="w-4 h-4" />, color: 'text-pink-600' },
}

// Map zone names from the 6-week rotation to zone_definitions keys
const ZONE_NAME_TO_KEY: Record<string, string> = {
  'hotspot': 'kitchen_zone', // Hotspot is kitchen area
  'kitchen': 'kitchen_zone',
  'guest bathroom': 'kids_bathroom', // reuse bathroom tasks
  'kids bathroom': 'kids_bathroom',
  'pantry': 'kitchen_zone', // pantry tasks overlap kitchen
  'floors': 'kitchen_zone', // floors tasks overlap kitchen
}

function getZoneKeyForItem(item: ChecklistItem, childName: string, currentZone: string | null): string | null {
  const titleLower = item.title.toLowerCase()

  // Zone chores — map from kid's current zone assignment
  if (item.category === 'zone' && currentZone) {
    const zoneKey = ZONE_NAME_TO_KEY[currentZone.toLowerCase()]
    if (zoneKey) return zoneKey
  }

  // Belle care
  if (item.category === 'belle' || titleLower.includes('belle care')) return 'belle_care'

  // Pet care zones
  if (titleLower.includes('hades care')) return 'pet_hades'
  if (titleLower.includes('spike care') && !titleLower.includes('helper')) return 'pet_spike'
  if (titleLower.includes('spike helper')) return 'pet_spike'
  if (titleLower.includes('midnight care')) return 'pet_midnight'

  // Dish duty — map per kid to their assigned block
  const kidLower = childName.toLowerCase()
  if (titleLower.includes('breakfast dishes')) return 'breakfast_dishes'
  if (titleLower.includes('lunch dishes')) return 'lunch_dishes'
  if (titleLower.includes('evening dishes')) return 'evening_dishes'

  // Dinner manager
  if (titleLower.includes('dinner manager')) return 'dinner_manager'

  // Laundry
  if (titleLower.includes('laundry day')) return 'laundry_room'

  // School room
  if (item.category === 'school_clean' || titleLower.includes('school room')) return 'school_room'

  // Hygiene / routines
  if (titleLower.includes('morning routine')) return 'morning_routine'
  if (titleLower.includes('bedtime routine')) return 'bedtime_routine'

  // Evening tidy maps to bedroom
  if (titleLower.includes('evening tidy')) return `bedroom_${kidLower}`

  return null
}

function isExpandableItem(item: ChecklistItem): boolean {
  const titleLower = item.title.toLowerCase()
  return item.category === 'zone' ||
    item.category === 'belle' ||
    item.category === 'pet' ||
    item.category === 'dishes' ||
    item.category === 'school_clean' ||
    titleLower.includes('morning routine') ||
    titleLower.includes('bedtime routine') ||
    titleLower.includes('evening tidy') ||
    titleLower.includes('dinner manager') ||
    titleLower.includes('laundry day')
}

export default function DailyChecklist({ childName, onStarEarned }: DailyChecklistProps) {
  const [required, setRequired] = useState<ChecklistItem[]>([])
  const [dailyCare, setDailyCare] = useState<ChecklistItem[]>([])
  const [earnMoney, setEarnMoney] = useState<ChecklistItem[]>([])
  const [allRequiredDone, setAllRequiredDone] = useState(false)
  const [zone, setZone] = useState<string | null>(null)
  const [stats, setStats] = useState({ requiredTotal: 0, requiredDone: 0, dailyCareTotal: 0, dailyCareDone: 0, earnMoneyTotal: 0, earnMoneyDone: 0 })
  const [loaded, setLoaded] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})
  const [pointsToast, setPointsToast] = useState<{ show: boolean; amount: number; balance: number }>({ show: false, amount: 0, balance: 0 })
  const [showCelebration, setShowCelebration] = useState(false)
  const [prevAllDone, setPrevAllDone] = useState(false)
  const [starPopup, setStarPopup] = useState<{ amount: number; key: number } | null>(null)
  const [isSickDay, setIsSickDay] = useState(false)

  const childKey = childName.toLowerCase()

  useEffect(() => {
    fetch(`/api/kids/checklist?child=${childKey}`)
      .then(r => r.json())
      .then(data => {
        setRequired(data.required || [])
        setDailyCare(data.dailyCare || [])
        setEarnMoney(data.earnMoney || [])
        setAllRequiredDone(data.allRequiredDone || false)
        setZone(data.zone || null)
        setStats(data.stats || stats)
        setIsSickDay(data.isSickDay || false)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [childKey])

  // Celebration trigger: fires once per session per day when all required tasks become done
  useEffect(() => {
    if (!loaded) return
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
    const sessionKey = `checklist-celebrated-${childKey}-${today}`
    if (allRequiredDone && !prevAllDone && stats.requiredTotal > 0 && !sessionStorage.getItem(sessionKey)) {
      setShowCelebration(true)
      sessionStorage.setItem(sessionKey, '1')
      setTimeout(() => setShowCelebration(false), 2500)
      // ZONE-5: Notify parent that all required tasks are done
      fetch('/api/kids/checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'all_required_complete', kid_name: childKey }),
      }).catch(() => {})
    }
    setPrevAllDone(allRequiredDone)
  }, [allRequiredDone, loaded, stats.requiredTotal, childKey, prevAllDone])

  const toggle = async (item: ChecklistItem, tier: 'required' | 'dailyCare' | 'earnMoney') => {
    // Optimistic update
    const update = (items: ChecklistItem[]) => items.map(i => i.id === item.id ? { ...i, completed: !i.completed } : i)
    if (tier === 'required') {
      const updated = update(required)
      setRequired(updated)
      setAllRequiredDone(updated.every(t => t.completed))
      setStats(s => ({ ...s, requiredDone: updated.filter(t => t.completed).length }))
    } else if (tier === 'dailyCare') {
      const updated = update(dailyCare)
      setDailyCare(updated)
      setStats(s => ({ ...s, dailyCareDone: updated.filter(t => t.completed).length }))
    } else {
      const updated = update(earnMoney)
      setEarnMoney(updated)
      setStats(s => ({ ...s, earnMoneyDone: updated.filter(t => t.completed).length }))
    }

    const newCompleted = !item.completed
    try {
      const toggleRes = await fetch('/api/kids/checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', child: childKey, eventId: item.id, eventSummary: item.title })
      })
      // Show points toast if earned
      try {
        const toggleData = await toggleRes.json()
        if (toggleData.points_awarded && toggleData.points_awarded > 0) {
          setPointsToast({ show: true, amount: toggleData.points_awarded, balance: toggleData.new_balance || 0 })
          setTimeout(() => setPointsToast({ show: false, amount: 0, balance: 0 }), 2500)
        }
      } catch {}
      // Award digi-pet stars on task completion, reverse on uncheck
      if (newCompleted) {
        const result = await awardTaskStars(childKey, item)
        if (result && result.amount && !result.already_awarded) {
          const total = (result.amount || 0) + (result.bonus_stars || 0)
          setStarPopup({ amount: total, key: Date.now() })
          setTimeout(() => setStarPopup(null), 2200)
          onStarEarned?.(total)
        }
      } else {
        // Reverse stars on uncheck
        const taskType = getStarTaskType(item)
        if (taskType) {
          const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
          try {
            await fetch('/api/digi-pet', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'reverse_task_stars', kid_name: childKey, source_ref: `checklist-${item.id}-${today}` }),
            })
            onStarEarned?.(0) // trigger nav bar refresh
          } catch { /* reversal failed */ }
        }
      }
    } catch (err) {
      console.error('Toggle error:', err)
    }
  }

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }))
  }

  const handleZoneAllComplete = (item: ChecklistItem, tier: 'required' | 'dailyCare') => {
    // Auto-check the parent checklist item when all zone sub-tasks are done
    if (!item.completed) {
      toggle(item, tier)
    }
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    )
  }

  const totalDone = stats.requiredDone + stats.dailyCareDone + stats.earnMoneyDone
  const totalAll = stats.requiredTotal + stats.dailyCareTotal + stats.earnMoneyTotal
  // earnedPoints used for earn-money chore tracking (future use)
  const _earnedPoints = earnMoney.filter(c => c.completed).reduce((sum, c) => sum + (c.points || 0), 0)

  return (
    <div className="space-y-6 relative">
      {/* Star award popup */}
      {starPopup && <StarPopup amount={starPopup.amount} key={starPopup.key} />}

      {/* Points earned toast */}
      {pointsToast.show && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 font-bold px-4 py-2 rounded-full shadow-lg z-50 animate-bounce">
          +{pointsToast.amount} ⭐ · Balance: {pointsToast.balance}
        </div>
      )}

      {/* Celebration burst overlay */}
      {showCelebration && <CelebrationBurst />}

      {/* GAP-13: Sick Day Rest Banner */}
      {isSickDay && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-center gap-3">
          <span className="text-2xl">🤒</span>
          <div>
            <p className="font-bold text-rose-900">Rest Day — Feel Better!</p>
            <p className="text-sm text-rose-700">Mom has been notified. Only essential tasks today.</p>
          </div>
        </div>
      )}

      {/* Morning check-in (Kaylee/Zoey only, weekdays) */}
      <MorningCheckinCard childName={childName} />

      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-teal-500 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Daily Checklist</h1>
            <p className="text-green-100">{childName}&apos;s tasks for today</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{totalDone}/{totalAll}</div>
            <div className="text-xs text-green-100">Tasks done</div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-3 rounded-lg border text-center">
          <div className="text-xl font-bold text-amber-600">{stats.requiredDone}/{stats.requiredTotal}</div>
          <div className="text-xs text-gray-500">Required</div>
        </div>
        <div className="bg-white p-3 rounded-lg border text-center">
          <div className="text-xl font-bold text-sky-600">{stats.dailyCareDone}/{stats.dailyCareTotal}</div>
          <div className="text-xs text-gray-500">Daily Care</div>
        </div>
        <div className="bg-white p-3 rounded-lg border text-center">
          <div className="text-xl font-bold text-emerald-600">{totalDone * 2} {'\u2B50'}</div>
          <div className="text-xs text-gray-500">Today</div>
        </div>
      </div>

      {/* Tier 1: Required */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-4 border-b bg-amber-50 rounded-t-lg">
          <h2 className="font-bold text-amber-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Required — Because You Live Here
          </h2>
          <p className="text-xs text-amber-700 mt-1">No pay — these come first</p>
        </div>
        <div className="divide-y">
          {required.map(item => (
            <ExpandableChecklistRow
              key={item.id}
              item={item}
              onToggle={() => toggle(item, 'required')}
              childName={childName}
              currentZone={zone}
              expanded={expandedItems[item.id]}
              onToggleExpand={() => toggleExpand(item.id)}
              onZoneAllComplete={() => handleZoneAllComplete(item, 'required')}
            />
          ))}
          {required.length === 0 && (
            <div className="p-6 text-center text-gray-400">No required tasks today</div>
          )}
          {required.some(item => item.category === 'dishes') && (
            <div className="px-4 py-2 bg-blue-50 border-t text-xs text-blue-700 italic">
              Wash your 5 handwash items at your meal time — not later.
            </div>
          )}
        </div>
      </div>

      {/* Tier 2: Daily Care */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-4 border-b bg-sky-50 rounded-t-lg">
          <h2 className="font-bold text-sky-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Daily Care — Take Care of You
          </h2>
        </div>
        <div className="divide-y">
          {dailyCare.map(item => (
            <ExpandableChecklistRow
              key={item.id}
              item={item}
              onToggle={() => toggle(item, 'dailyCare')}
              childName={childName}
              currentZone={zone}
              expanded={expandedItems[item.id]}
              onToggleExpand={() => toggleExpand(item.id)}
              onZoneAllComplete={() => handleZoneAllComplete(item, 'dailyCare')}
            />
          ))}
        </div>
      </div>

      {/* Tier 3: Earn Money */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className={`p-4 border-b rounded-t-lg ${allRequiredDone ? 'bg-emerald-50' : 'bg-gray-100'}`}>
          <h2 className={`font-bold flex items-center gap-2 ${allRequiredDone ? 'text-emerald-900' : 'text-gray-500'}`}>
            {allRequiredDone ? <Trophy className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            Earn Money Chores
          </h2>
          <p className={`text-xs mt-1 ${allRequiredDone ? 'text-emerald-700' : 'text-gray-400'}`}>
            {allRequiredDone
              ? `${earnMoney.length} chores available — earn points for each!`
              : 'Complete all required tasks first to unlock'}
          </p>
        </div>
        {allRequiredDone ? (
          <div className="divide-y">
            {earnMoney.map(item => (
              <ChecklistRow key={item.id} item={item} onToggle={() => toggle(item, 'earnMoney')} showPoints />
            ))}
            {earnMoney.length === 0 && (
              <div className="p-6 text-center text-gray-400">No earn-money chores set up yet. Ask a parent to add some!</div>
            )}
          </div>
        ) : (
          <div className="p-6 text-center">
            <Lock className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            <p className="text-gray-400 text-sm">Finish your required tasks to unlock earn-money chores</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ExpandableChecklistRow({ item, onToggle, childName, currentZone, expanded, onToggleExpand, onZoneAllComplete, showPoints }: {
  item: ChecklistItem
  onToggle: () => void
  childName: string
  currentZone: string | null
  expanded?: boolean
  onToggleExpand: () => void
  onZoneAllComplete: () => void
  showPoints?: boolean
}) {
  const expandable = isExpandableItem(item)
  const zoneKey = expandable ? getZoneKeyForItem(item, childName, currentZone) : null

  // UX-1B: Parse description into substeps for non-zone expandable items
  const substeps = (!zoneKey && item.description)
    ? item.description.split(/[,;]/).map(s => s.trim()).filter(Boolean)
    : []
  const hasSubsteps = substeps.length > 1
  const canExpand = (expandable && zoneKey) || hasSubsteps

  // Substep state — loaded from server, persisted via toggle_substep
  const [substepState, setSubstepState] = useState<boolean[]>(substeps.map(() => false))
  const [substepsLoaded, setSubstepsLoaded] = useState(false)

  // Load substep progress on mount
  useEffect(() => {
    if (!hasSubsteps || substepsLoaded) return
    fetch('/api/kids/checklist', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_substep_progress', child: childName.toLowerCase() }),
    }).then(r => r.json()).then(data => {
      if (data.progress?.[item.id]) {
        setSubstepState(data.progress[item.id])
      }
      setSubstepsLoaded(true)
    }).catch(() => setSubstepsLoaded(true))
  }, [hasSubsteps, substepsLoaded, item.id, childName])

  const toggleSubstep = async (index: number) => {
    const newState = [...substepState]
    newState[index] = !newState[index]
    setSubstepState(newState)

    try {
      const res = await fetch('/api/kids/checklist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_substep', child: childName.toLowerCase(),
          eventId: item.id, substepIndex: index, totalSubsteps: substeps.length,
        }),
      })
      const data = await res.json()
      if (data.substep_progress) setSubstepState(data.substep_progress)
      if (data.all_complete && !item.completed) {
        onToggle() // Trigger parent completion + stars
      }
    } catch (e) {
      console.error('Substep toggle failed:', e)
      newState[index] = !newState[index] // Revert on error
      setSubstepState(newState)
    }
  }

  return (
    <div>
      <div className={`flex items-center gap-3 px-4 py-3 ${item.completed ? 'bg-gray-50/50' : ''}`}>
        <button onClick={hasSubsteps ? onToggleExpand : onToggle} className="flex-shrink-0">
          {item.completed ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : hasSubsteps ? (
            <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center text-[9px] font-bold text-gray-400">
              {substepState.filter(Boolean).length}/{substeps.length}
            </div>
          ) : (
            <Circle className="w-5 h-5 text-gray-300" />
          )}
        </button>
        <div className={`flex-shrink-0 ${(CATEGORY_ICONS[item.category] || { color: 'text-gray-500' }).color}`}>
          {(CATEGORY_ICONS[item.category] || { icon: <Circle className="w-4 h-4" /> }).icon}
        </div>
        <div className="flex-1 min-w-0">
          <span className={`text-sm ${item.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
            {item.title}
          </span>
          {item.description && !expanded && !hasSubsteps && (
            <p className={`text-xs ${item.completed ? 'text-gray-300' : 'text-gray-500'}`}>{item.description}</p>
          )}
          {hasSubsteps && !expanded && (
            <p className="text-xs text-gray-400">{substepState.filter(Boolean).length} of {substeps.length} steps done</p>
          )}
        </div>
        {item.time && !canExpand && <span className="text-xs text-gray-400 flex-shrink-0">{item.time}</span>}
        {showPoints && item.points && (
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex-shrink-0">
            +{item.points} pts
          </span>
        )}
        {item.completed && (
          <label className="flex-shrink-0 p-1 hover:bg-gray-100 rounded cursor-pointer" title="Add photo">
            <Camera className="w-4 h-4 text-gray-400 hover:text-blue-500" />
            <input type="file" accept="image/*" capture="environment" className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = async () => {
                  await fetch('/api/kids/checklist', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'upload_task_photo', kid_name: childName, task_key: item.id, photo_url: reader.result }) }).catch(() => {})
                }
                reader.readAsDataURL(file)
              }} />
          </label>
        )}
        {canExpand && (
          <button onClick={onToggleExpand} className="flex-shrink-0 p-1 hover:bg-gray-100 rounded">
            {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
        )}
      </div>

      {/* UX-1B: Substep checkboxes for non-zone items */}
      {expanded && hasSubsteps && !zoneKey && (
        <div className="px-4 pb-3 pl-12 space-y-1">
          {substeps.map((step, idx) => (
            <button key={idx} onClick={() => toggleSubstep(idx)}
              className="flex items-center gap-2 w-full text-left py-1.5 hover:bg-gray-50 rounded px-2 -mx-2">
              {substepState[idx] ? (
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />
              )}
              <span className={`text-sm ${substepState[idx] ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                {step}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Inline zone detail card */}
      {expanded && zoneKey && (
        <div className="px-4 pb-3" style={{ transition: 'max-height 0.3s ease' }}>
          <ZoneDetailCard
            zoneKey={zoneKey}
            childName={childName}
            onAllComplete={onZoneAllComplete}
          />
        </div>
      )}
    </div>
  )
}

function ChecklistRow({ item, onToggle, showPoints }: { item: ChecklistItem; onToggle: () => void; showPoints?: boolean }) {
  const cat = CATEGORY_ICONS[item.category] || { icon: <Circle className="w-4 h-4" />, color: 'text-gray-500' }

  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${item.completed ? 'bg-gray-50/50' : ''}`}>
      <button onClick={onToggle} className="flex-shrink-0">
        {item.completed ? (
          <CheckCircle2 className="w-5 h-5 text-green-600" />
        ) : (
          <Circle className="w-5 h-5 text-gray-300" />
        )}
      </button>
      <div className={`flex-shrink-0 ${cat.color}`}>{cat.icon}</div>
      <div className="flex-1 min-w-0">
        <span className={`text-sm ${item.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
          {item.title}
        </span>
        {item.description && (
          <p className={`text-xs ${item.completed ? 'text-gray-300' : 'text-gray-500'}`}>{item.description}</p>
        )}
      </div>
      {item.time && <span className="text-xs text-gray-400 flex-shrink-0">{item.time}</span>}
      {showPoints && item.points && (
        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex-shrink-0">
          +{item.points} pts
        </span>
      )}
    </div>
  )
}

// ── Star award popup animation ──
function StarPopup({ amount }: { amount: number }) {
  return (
    <div className="fixed top-20 right-6 z-50 pointer-events-none">
      <div
        className="bg-amber-100 border border-amber-300 text-amber-800 font-bold px-4 py-2 rounded-full shadow-lg text-sm"
        style={{
          animation: 'starFloat 2s ease-out forwards',
        }}
      >
        +{amount} stars earned
      </div>
      <style>{`
        @keyframes starFloat {
          0% { opacity: 0; transform: translateY(10px) scale(0.8); }
          15% { opacity: 1; transform: translateY(0) scale(1); }
          70% { opacity: 1; transform: translateY(-20px) scale(1); }
          100% { opacity: 0; transform: translateY(-40px) scale(0.9); }
        }
      `}</style>
    </div>
  )
}

// ── Celebration burst animation ──
const PARTICLE_COLORS = [
  'bg-yellow-400', 'bg-pink-400', 'bg-green-400', 'bg-blue-400',
  'bg-purple-400', 'bg-red-400', 'bg-amber-400', 'bg-teal-400',
  'bg-rose-400', 'bg-indigo-400', 'bg-orange-400', 'bg-emerald-400',
]

function CelebrationBurst() {
  // Generate 20 particles with random angles and distances
  const particles = Array.from({ length: 20 }, (_, i) => {
    const angle = (i / 20) * 360
    const distance = 60 + Math.random() * 80
    const size = Math.random() > 0.5 ? 'w-3 h-3' : 'w-2 h-2'
    const shape = Math.random() > 0.4 ? 'rounded-full' : 'rotate-45'
    const color = PARTICLE_COLORS[i % PARTICLE_COLORS.length]
    const delay = Math.random() * 200
    const tx = Math.cos((angle * Math.PI) / 180) * distance
    const ty = Math.sin((angle * Math.PI) / 180) * distance
    return { size, shape, color, delay, tx, ty }
  })

  return (
    <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center overflow-hidden">
      {/* Central flash */}
      <div className="absolute animate-ping w-16 h-16 rounded-full bg-yellow-300 opacity-60" />
      {/* Trophy text */}
      <div
        className="absolute text-center z-10"
        style={{
          animation: 'celebFadeIn 0.3s ease-out forwards, celebFadeOut 0.5s ease-in 1.8s forwards',
        }}
      >
        <div className="text-4xl mb-1">
          <Trophy className="w-10 h-10 text-yellow-500 mx-auto" />
        </div>
        <p className="text-lg font-bold text-gray-900">All Done!</p>
        <p className="text-sm text-gray-500">Required tasks complete</p>
      </div>
      {/* Particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          className={`absolute ${p.size} ${p.shape} ${p.color}`}
          style={{
            animation: `celebBurst 0.8s ease-out ${p.delay}ms forwards, celebFadeOut 0.4s ease-in 1.6s forwards`,
            ['--tx' as string]: `${p.tx}px`,
            ['--ty' as string]: `${p.ty}px`,
          }}
        />
      ))}
      {/* Keyframes injected via style tag */}
      <style>{`
        @keyframes celebBurst {
          0% { transform: translate(0, 0) scale(0); opacity: 1; }
          60% { opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(1); opacity: 0.6; }
        }
        @keyframes celebFadeIn {
          0% { opacity: 0; transform: scale(0.5); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes celebFadeOut {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
