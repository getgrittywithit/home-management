'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, Check, CheckCheck, MessageSquare, Thermometer, Trophy, Flame, X, Heart, BookOpen, ChefHat } from 'lucide-react'

interface Notification {
  id: number
  title: string
  message: string
  icon: string | null
  source_type: string | null
  source_ref: string | null
  link_tab: string | null
  read_at: string | null
  created_at: string
}

interface NotificationBellProps {
  onNavigate?: (tabId: string) => void
  badgeCount?: number
  onFlagClick?: () => void
  role?: 'parent' | 'kid'
  kidName?: string
}

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  sick_day: <Thermometer className="w-4 h-4 text-rose-500" />,
  message: <MessageSquare className="w-4 h-4 text-blue-500" />,
  message_reply: <MessageSquare className="w-4 h-4 text-blue-500" />,
  all_tasks_complete: <Trophy className="w-4 h-4 text-amber-500" />,
  streak: <Flame className="w-4 h-4 text-orange-500" />,
  break_request: <Heart className="w-4 h-4 text-rose-400" />,
  break_acknowledged: <Heart className="w-4 h-4 text-green-500" />,
  school_note: <BookOpen className="w-4 h-4 text-indigo-500" />,
  meal_request: <ChefHat className="w-4 h-4 text-orange-400" />,
  meal_feedback_low: <ChefHat className="w-4 h-4 text-red-400" />,
  low_mood: <Heart className="w-4 h-4 text-rose-600" />,
  crisis_detection: <Thermometer className="w-4 h-4 text-red-600" />,
  concern_detection: <Heart className="w-4 h-4 text-amber-500" />,
  health_urgent: <Thermometer className="w-4 h-4 text-red-600" />,
  health_request: <Thermometer className="w-4 h-4 text-blue-500" />,
  med_completion: <Check className="w-4 h-4 text-green-500" />,
  refill_alert: <Bell className="w-4 h-4 text-amber-600" />,
  task_skip: <Bell className="w-4 h-4 text-gray-500" />,
  velocity_alert: <Bell className="w-4 h-4 text-amber-500" />,
  positive_report: <Trophy className="w-4 h-4 text-amber-500" />,
  positive_approved: <Trophy className="w-4 h-4 text-green-500" />,
  caught_being_good: <Trophy className="w-4 h-4 text-amber-500" />,
  achievement_earned: <Trophy className="w-4 h-4 text-purple-500" />,
  achievement_parent: <Trophy className="w-4 h-4 text-purple-500" />,
  library_submission: <BookOpen className="w-4 h-4 text-emerald-500" />,
  library_approved: <BookOpen className="w-4 h-4 text-green-500" />,
  dental_complete: <Check className="w-4 h-4 text-cyan-500" />,
  activity_logged: <Flame className="w-4 h-4 text-green-500" />,
  financial_level_advance: <Trophy className="w-4 h-4 text-green-600" />,
  zone_photo: <Check className="w-4 h-4 text-blue-500" />,
  parent_praise: <Heart className="w-4 h-4 text-pink-500" />,
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function NotificationBell({ onNavigate, badgeCount, onFlagClick, role = 'parent', kidName }: NotificationBellProps) {
  const roleParam = role === 'kid' && kidName ? `&role=kid&kid_name=${kidName.toLowerCase()}` : ''
  const [count, setCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch unread count
  useEffect(() => {
    const fetchCount = () => {
      fetch(`/api/notifications?action=get_unread_count${roleParam}`)
        .then(r => r.json())
        .then(data => setCount(data.count || 0))
        .catch(() => {})
    }
    fetchCount()
    const interval = setInterval(fetchCount, role === 'kid' ? 30000 : 120000)
    return () => clearInterval(interval)
  }, [])

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (open && !loaded) {
      fetch(`/api/notifications?action=get_recent&limit=20${roleParam}`)
        .then(r => r.json())
        .then(data => {
          setNotifications(data.notifications || [])
          setLoaded(true)
        })
        .catch(() => setLoaded(true))
    }
  }, [open, loaded])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const markRead = async (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    setCount(prev => Math.max(0, prev - 1))
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_read', id }),
    }).catch(() => {})
  }

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })))
    setCount(0)
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_all_read', role, kid_name: kidName?.toLowerCase() }),
    }).catch(() => {})
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => { setOpen(!open); if (!open) setLoaded(false) }}
        className="relative p-2 rounded-lg hover:bg-gray-100"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {(count + (badgeCount || 0)) > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">
            {(count + (badgeCount || 0)) > 99 ? '99+' : count + (badgeCount || 0)}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed md:absolute left-2 md:left-0 right-2 md:right-auto top-14 md:top-full mt-0 md:mt-2 w-auto md:w-96 bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] max-h-[28rem] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="font-semibold text-sm text-gray-900">Notifications</span>
            <div className="flex items-center gap-2">
              {count > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {!loaded ? (
              <div className="p-6 text-center text-gray-400 text-sm">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">No notifications yet</div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b last:border-b-0 ${
                    !n.read_at ? 'bg-blue-50/40' : ''
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5 text-lg">
                    {n.icon || (n.source_type && SOURCE_ICONS[n.source_type]
                      ? SOURCE_ICONS[n.source_type]
                      : <Bell className="w-4 h-4 text-gray-400" />)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!n.read_at ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                      {n.title}
                    </p>
                    {n.message && n.message !== n.title && (
                      <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400">{timeAgo(n.created_at)}</span>
                      {n.link_tab && onNavigate && (
                        <button
                          onClick={() => {
                            // Map notification link_tab to actual portal tab IDs (role-aware)
                            // Keep in sync with sidebar tab IDs in ParentPortalWithNav / KidPortalWithNav
                            const PARENT_TAB_MAP: Record<string, string> = {
                              // Food & Kitchen
                              'food-meals': 'food-inventory', 'food': 'food-inventory', 'food-inventory': 'food-inventory',
                              'kitchen': 'food-inventory',
                              // Pets
                              'pets': 'belle-care', 'belle-care': 'belle-care',
                              // Rewards & Stars
                              'achievements': 'stars-rewards', 'stars': 'stars-rewards', 'stars-rewards': 'stars-rewards',
                              'rewards': 'stars-rewards',
                              // Messages & Alerts
                              'requests': 'messages-alerts:messages', 'messages-alerts': 'messages-alerts:messages',
                              'messages': 'messages-alerts:messages',
                              // Chores & Zones
                              'chores': 'chores',
                              // Health
                              'health': 'health',
                              // Overview / Home
                              'my-day': 'overview', 'home': 'overview', 'overview': 'overview',
                              // Kids checklist
                              'kids-checklist': 'kids-checklist', 'kids': 'kids-checklist', 'checklist': 'kids-checklist',
                              // School
                              'school': 'school-advocacy', 'school-advocacy': 'school-advocacy',
                              // Homeschool & Library
                              'homeschool': 'homeschool', 'library': 'homeschool',
                              // Calendar & Finance
                              'calendar': 'calendar', 'finance': 'finance',
                              // Email & My Tasks
                              'email': 'email', 'my-tasks': 'my-tasks',
                              // Family Huddle
                              'family-huddle': 'family-huddle',
                            }
                            const KID_TAB_MAP: Record<string, string> = {
                              'messages-alerts': 'requests', 'messages': 'requests',
                              'requests': 'requests', 'achievements': 'achievements',
                              'chores': 'checklist', 'health': 'health', 'my-day': 'my-day',
                              'food-meals': 'my-day', 'food': 'my-day', 'checklist': 'checklist',
                              'home': 'my-day', 'overview': 'my-day', 'kids': 'my-day',
                              'stars': 'achievements', 'stars-rewards': 'achievements',
                              'belle-care': 'checklist', 'pets': 'checklist',
                              'school': 'my-day', 'homeschool': 'my-day', 'library': 'my-day',
                            }
                            const tabMap = role === 'kid' ? KID_TAB_MAP : PARENT_TAB_MAP
                            onNavigate(tabMap[n.link_tab!] || n.link_tab!); setOpen(false)
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          View
                        </button>
                      )}
                    </div>
                  </div>
                  {!n.read_at && (
                    <button
                      onClick={() => markRead(n.id)}
                      className="flex-shrink-0 p-1 hover:bg-gray-100 rounded"
                      title="Mark as read"
                    >
                      <Check className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
