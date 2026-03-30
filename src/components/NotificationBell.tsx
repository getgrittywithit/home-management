'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, Check, CheckCheck, MessageSquare, Thermometer, Trophy, Flame, X } from 'lucide-react'

interface Notification {
  id: number
  title: string
  message: string
  icon: string | null
  source_type: string | null
  link_tab: string | null
  read_at: string | null
  created_at: string
}

interface NotificationBellProps {
  onNavigate?: (tabId: string) => void
}

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  sick_day: <Thermometer className="w-4 h-4 text-rose-500" />,
  message: <MessageSquare className="w-4 h-4 text-blue-500" />,
  all_tasks_complete: <Trophy className="w-4 h-4 text-amber-500" />,
  streak: <Flame className="w-4 h-4 text-orange-500" />,
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

export default function NotificationBell({ onNavigate }: NotificationBellProps) {
  const [count, setCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch unread count
  useEffect(() => {
    const fetchCount = () => {
      fetch('/api/notifications?action=get_unread_count')
        .then(r => r.json())
        .then(data => setCount(data.count || 0))
        .catch(() => {})
    }
    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [])

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (open && !loaded) {
      fetch('/api/notifications?action=get_recent&limit=20')
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
      body: JSON.stringify({ action: 'mark_all_read' }),
    }).catch(() => {})
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => { setOpen(!open); if (!open) setLoaded(false) }}
        className="relative p-2 rounded-lg hover:bg-gray-100"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-[28rem] flex flex-col">
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
                  <div className="flex-shrink-0 mt-0.5">
                    {n.source_type && SOURCE_ICONS[n.source_type]
                      ? SOURCE_ICONS[n.source_type]
                      : <Bell className="w-4 h-4 text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!n.read_at ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400">{timeAgo(n.created_at)}</span>
                      {n.link_tab && onNavigate && (
                        <button
                          onClick={() => { onNavigate(n.link_tab!); setOpen(false) }}
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
