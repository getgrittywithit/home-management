'use client'

import { useState, useEffect } from 'react'
import {
  AlertTriangle, CheckCircle2, MessageCircle, Star, Clock,
  BookOpen, Home, Dog, Calendar, Zap, Send, Plus, Megaphone,
  ChevronRight
} from 'lucide-react'
import AvailabilityWidget from './AvailabilityWidget'

// ============================================================================
// Types
// ============================================================================
interface AttentionItem {
  id: string
  type: 'sick' | 'meal_request' | 'message' | 'reward' | 'zone_missed'
  kid_name: string
  title: string
  detail: string
  time: string
  actions: { label: string; action: string; variant: 'primary' | 'secondary' | 'danger' }[]
}

interface KidTaskProgress {
  kid_name: string
  total_tasks: number
  completed_tasks: number
  focus_mins: number
}

interface OverviewDashboardProps {
  onNavigate: (tab: string) => void
}

// ============================================================================
// Needs Your Attention Bar
// ============================================================================
function NeedsAttentionBar({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [items, setItems] = useState<AttentionItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [flagsRes, mealsRes, msgsRes] = await Promise.all([
          fetch('/api/parent/flags?action=get_all_flags').then(r => r.json()).catch(() => ({})),
          fetch('/api/parent/meal-requests?status=pending').then(r => r.json()).catch(() => ({ requests: [] })),
          fetch('/api/kids/messages?action=get_unread_count').then(r => r.json()).catch(() => ({ count: 0 })),
        ])

        const attention: AttentionItem[] = []

        // Sick reports
        for (const s of (flagsRes.sick_days || [])) {
          attention.push({
            id: `sick-${s.kid_name}`,
            type: 'sick',
            kid_name: s.kid_name,
            title: `${s.kid_name.charAt(0).toUpperCase() + s.kid_name.slice(1)} not feeling well`,
            detail: s.reason || '',
            time: s.reported_at ? new Date(s.reported_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) : '',
            actions: [{ label: 'View Health', action: 'health', variant: 'primary' }],
          })
        }

        // Break requests
        for (const b of (flagsRes.break_requests || [])) {
          attention.push({
            id: `break-${b.kid_name}`,
            type: 'sick',
            kid_name: b.kid_name,
            title: `${b.kid_name.charAt(0).toUpperCase() + b.kid_name.slice(1)} needs a break`,
            detail: b.reason || '',
            time: '',
            actions: [{ label: 'View', action: 'health', variant: 'secondary' }],
          })
        }

        // Meal requests
        for (const m of (mealsRes.requests || [])) {
          attention.push({
            id: `meal-${m.id}`,
            type: 'meal_request',
            kid_name: m.kid_name,
            title: `${m.kid_name} requested "${m.meal_name}" for ${m.requested_date}`,
            detail: '',
            time: '',
            actions: [
              { label: 'Approve', action: 'approve-meal', variant: 'primary' },
              { label: 'Swap', action: 'food-inventory', variant: 'secondary' },
            ],
          })
        }

        // Unread messages
        if ((msgsRes.count || 0) > 0) {
          attention.push({
            id: 'unread-msgs',
            type: 'message',
            kid_name: '',
            title: `${msgsRes.count} unread message${msgsRes.count > 1 ? 's' : ''} from kids`,
            detail: '',
            time: '',
            actions: [{ label: 'Reply', action: 'messages-alerts', variant: 'primary' }],
          })
        }

        setItems(attention)
      } catch (err) {
        console.error('Failed to load attention items:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleAction = (action: string) => {
    onNavigate(action)
  }

  if (loading) return null

  if (items.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-green-500" />
        <span className="text-green-700 font-medium">Nothing needs attention right now</span>
      </div>
    )
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-amber-200 flex items-center justify-between">
        <h3 className="font-semibold text-amber-900 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Needs Your Attention ({items.length})
        </h3>
        <button
          onClick={() => onNavigate('messages-alerts')}
          className="text-xs text-amber-700 hover:text-amber-900 font-medium flex items-center gap-1"
        >
          View All <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      <div className="divide-y divide-amber-100">
        {items.slice(0, 5).map(item => (
          <div key={item.id} className="px-4 py-3 flex items-center gap-3">
            <span className="text-lg shrink-0">
              {item.type === 'sick' ? '🤒' : item.type === 'meal_request' ? '🍕' : item.type === 'message' ? '💬' : item.type === 'reward' ? '⭐' : '🏠'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 font-medium truncate">{item.title}</p>
              {item.time && <p className="text-xs text-gray-500">{item.time}</p>}
            </div>
            <div className="flex gap-1.5 shrink-0">
              {item.actions.map((a, i) => (
                <button
                  key={i}
                  onClick={() => handleAction(a.action)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                    a.variant === 'primary' ? 'bg-blue-600 text-white hover:bg-blue-700' :
                    a.variant === 'danger' ? 'bg-red-600 text-white hover:bg-red-700' :
                    'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Today's School Progress Card
// ============================================================================
function TodaysSchoolCard({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [progress, setProgress] = useState<KidTaskProgress[]>([])
  const [wordOfDay, setWordOfDay] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const KID_ICONS: Record<string, string> = {
    amos: '🦉', ellie: '🐱', wyatt: '🐕', hannah: '🐰',
  }
  const KID_GRADES: Record<string, string> = {
    amos: '10th', ellie: '6th', wyatt: '4th', hannah: '3rd',
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/homeschool?action=get_task_progress').then(r => r.json()).catch(() => ({ progress: [] })),
      fetch('/api/vocab?action=get_word_of_the_day').then(r => r.json()).catch(() => ({})),
    ]).then(([progData, wodData]) => {
      setProgress(progData.progress || [])
      setWordOfDay(wodData.word ? wodData : null)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-8 bg-gray-100 rounded" />)}
        </div>
      </div>
    )
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'America/Chicago' })

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-teal-600" />
          Today&apos;s School
        </h3>
        <span className="text-xs text-gray-500">{today}</span>
      </div>
      <div className="p-4 space-y-3">
        {progress.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-2">No school data today</p>
        ) : (
          progress.map(kid => {
            const pct = kid.total_tasks > 0 ? Math.round((kid.completed_tasks / kid.total_tasks) * 100) : 0
            const icon = KID_ICONS[kid.kid_name.toLowerCase()] || '👦'
            const grade = KID_GRADES[kid.kid_name.toLowerCase()] || ''
            return (
              <button
                key={kid.kid_name}
                onClick={() => onNavigate('homeschool')}
                className="w-full flex items-center gap-3 hover:bg-gray-50 rounded-lg p-1 -m-1 transition-colors"
              >
                <span className="text-lg">{icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {kid.kid_name} <span className="text-gray-400 font-normal text-xs">({grade})</span>
                    </span>
                    <span className="text-xs text-gray-500">
                      {kid.completed_tasks}/{kid.total_tasks} done · {kid.focus_mins}m
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct === 100 ? 'bg-green-500' : pct >= 50 ? 'bg-blue-500' : pct > 0 ? 'bg-amber-500' : 'bg-gray-200'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
      {wordOfDay && (
        <div className="px-5 py-3 bg-indigo-50 border-t border-indigo-100 text-sm">
          <span className="text-indigo-600 font-medium">Word of the Day: </span>
          <span className="text-indigo-800 font-semibold">{wordOfDay.word}</span>
          {wordOfDay.part_of_speech && <span className="text-indigo-400 italic"> ({wordOfDay.part_of_speech})</span>}
          {wordOfDay.definition && <span className="text-indigo-600"> — {wordOfDay.definition.slice(0, 80)}{wordOfDay.definition.length > 80 ? '...' : ''}</span>}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Zone Progress Card
// ============================================================================
function ZoneProgressCard({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [zones, setZones] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/homeschool?action=get_task_progress')
      .then(r => r.json())
      .catch(() => ({ progress: [] }))
    // Zone data would come from a zone-specific API — for now show a placeholder
  }, [])

  return (
    <button
      onClick={() => onNavigate('chores')}
      className="w-full bg-white rounded-xl border border-gray-200 p-5 text-left hover:border-green-300 transition-colors"
    >
      <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
        <Home className="w-4 h-4 text-green-600" />
        Today&apos;s Zones
      </h3>
      <p className="text-sm text-gray-500">Tap to view zone progress and assignments</p>
    </button>
  )
}

// ============================================================================
// Belle Care Card
// ============================================================================
function BelleCareCard() {
  const WEEKDAY_ASSIGNMENTS: Record<number, string> = {
    1: 'Kaylee', 2: 'Amos', 3: 'Hannah', 4: 'Wyatt', 5: 'Ellie',
  }

  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
  const dayNum = now.getDay()
  const assignedKid = WEEKDAY_ASSIGNMENTS[dayNum]

  if (!assignedKid) return null // Weekend — rotation-based

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-2">
        <Dog className="w-4 h-4 text-amber-600" />
        Belle Care Today
      </h3>
      <p className="text-sm text-gray-600">
        {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][dayNum]} = <span className="font-medium">{assignedKid}</span>
      </p>
      <div className="flex gap-4 mt-2 text-xs text-gray-500">
        <span>AM Feed + Walk (7:00am)</span>
        <span>PM Feed (5:00pm)</span>
        <span>PM Walk (6:30pm)</span>
      </div>
    </div>
  )
}

// ============================================================================
// Stars Today Card
// ============================================================================
function StarsTodayCard({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [stars, setStars] = useState<{ kid_name: string; today: number; total: number }[]>([])

  useEffect(() => {
    fetch('/api/stars?action=get_all_store_items')
      .then(r => r.json())
      .catch(() => ({}))
    // Simplified — in production would pull from digi_pet_star_log
  }, [])

  return (
    <button
      onClick={() => onNavigate('stars-rewards')}
      className="w-full bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-amber-300 transition-colors"
    >
      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
        <Star className="w-4 h-4 text-amber-500" />
        Stars & Rewards
      </h3>
      <p className="text-sm text-gray-500 mt-1">Tap to view star balances and pending redemptions</p>
    </button>
  )
}

// ============================================================================
// Coming Up Card
// ============================================================================
function ComingUpCard({ onNavigate }: { onNavigate: (tab: string) => void }) {
  return (
    <button
      onClick={() => onNavigate('calendar')}
      className="w-full bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-pink-300 transition-colors"
    >
      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-pink-600" />
        Calendar
      </h3>
      <p className="text-sm text-gray-500 mt-1">Tap to view upcoming events and appointments</p>
    </button>
  )
}

// ============================================================================
// Quick Actions Bar
// ============================================================================
function QuickActionsBar({ onNavigate }: { onNavigate: (tab: string) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {[
        { label: 'Announce', icon: Megaphone, action: 'messages-alerts', color: 'bg-pink-50 text-pink-700 border-pink-200' },
        { label: 'Add Task', icon: Plus, action: 'homeschool', color: 'bg-teal-50 text-teal-700 border-teal-200' },
        { label: 'Message Kid', icon: Send, action: 'messages-alerts', color: 'bg-blue-50 text-blue-700 border-blue-200' },
        { label: 'Add Event', icon: Calendar, action: 'calendar', color: 'bg-purple-50 text-purple-700 border-purple-200' },
      ].map(item => {
        const Icon = item.icon
        return (
          <button
            key={item.label}
            onClick={() => onNavigate(item.action)}
            className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium hover:shadow-sm transition-all ${item.color}`}
          >
            <Icon className="w-4 h-4" />
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

// ============================================================================
// Main Overview Dashboard
// ============================================================================
export default function OverviewDashboard({ onNavigate }: OverviewDashboardProps) {
  return (
    <div className="space-y-4 p-6 max-w-6xl mx-auto">
      {/* Mom Availability + Quick Actions */}
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <AvailabilityWidget />
        </div>
      </div>

      {/* Needs Attention (top priority) */}
      <NeedsAttentionBar onNavigate={onNavigate} />

      {/* Quick Actions */}
      <QuickActionsBar onNavigate={onNavigate} />

      {/* Main cards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Today's School */}
        <TodaysSchoolCard onNavigate={onNavigate} />

        {/* Right column */}
        <div className="space-y-4">
          <ZoneProgressCard onNavigate={onNavigate} />
          <BelleCareCard />
        </div>
      </div>

      {/* Secondary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StarsTodayCard onNavigate={onNavigate} />
        <ComingUpCard onNavigate={onNavigate} />
      </div>
    </div>
  )
}
