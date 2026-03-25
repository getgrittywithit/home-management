'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Send, Plus, Trash2, X, MessageCircle, Megaphone, CheckCircle2
} from 'lucide-react'

interface Message {
  id: string
  from_kid: string
  message: string
  created_at: string
  read_at: string | null
  parent_reply: string | null
  reply_at: string | null
  resolved: boolean
  resolved_at: string | null
}

interface Announcement {
  id: string
  message: string
  created_at: string
  created_by: string
}

const KID_DISPLAY: Record<string, string> = {
  amos: 'Amos', ellie: 'Ellie', wyatt: 'Wyatt', hannah: 'Hannah', zoey: 'Zoey', kaylee: 'Kaylee'
}
const KID_COLORS: Record<string, string> = {
  amos: 'bg-blue-100 text-blue-700',
  ellie: 'bg-purple-100 text-purple-700',
  wyatt: 'bg-green-100 text-green-700',
  hannah: 'bg-pink-100 text-pink-700',
  zoey: 'bg-amber-100 text-amber-700',
  kaylee: 'bg-teal-100 text-teal-700',
}
const ALL_KIDS = ['all', 'zoey', 'kaylee', 'amos', 'ellie', 'wyatt', 'hannah']

export default function MessagesTab() {
  const [messages, setMessages] = useState<Message[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [filter, setFilter] = useState('all')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [showNewAnnouncement, setShowNewAnnouncement] = useState(false)
  const [announcementText, setAnnouncementText] = useState('')
  const [loaded, setLoaded] = useState(false)
  const markedReadRef = useRef(false)

  useEffect(() => { loadData() }, [])

  const loadData = () => {
    Promise.all([
      fetch('/api/kids/messages?action=get_all_messages').then(r => r.json()),
      fetch('/api/kids/messages?action=get_announcements').then(r => r.json()),
    ]).then(([msgData, annData]) => {
      const msgs: Message[] = msgData.messages || []
      setMessages(msgs)
      setUnreadCount(msgData.unreadCount || 0)
      setAnnouncements(annData.announcements || [])
      setLoaded(true)

      // Auto-mark unread as read on first load
      if (!markedReadRef.current) {
        markedReadRef.current = true
        const unreadIds = msgs.filter(m => !m.read_at).map(m => m.id)
        if (unreadIds.length > 0) {
          fetch('/api/kids/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'mark_read', ids: unreadIds })
          })
        }
      }
    }).catch(() => setLoaded(true))
  }

  const markResolved = async (id: string) => {
    await fetch('/api/kids/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_resolved', id })
    })
    setMessages(prev => prev.map(m => m.id === id ? { ...m, resolved: true, resolved_at: new Date().toISOString(), read_at: m.read_at || new Date().toISOString() } : m))
  }

  const sendReply = async (id: string) => {
    if (!replyText.trim()) return
    await fetch('/api/kids/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reply_to_message', id, reply: replyText.trim() })
    })
    setMessages(prev => prev.map(m =>
      m.id === id ? { ...m, parent_reply: replyText.trim(), reply_at: new Date().toISOString(), read_at: m.read_at || new Date().toISOString() } : m
    ))
    setReplyingTo(null)
    setReplyText('')
  }

  const createAnnouncement = async () => {
    if (!announcementText.trim()) return
    await fetch('/api/kids/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_announcement', message: announcementText.trim() })
    })
    setShowNewAnnouncement(false)
    setAnnouncementText('')
    loadData()
  }

  const removeAnnouncement = async (id: string) => {
    await fetch('/api/kids/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deactivate_announcement', id })
    })
    setAnnouncements(prev => prev.filter(a => a.id !== id))
  }

  const filtered = filter === 'all' ? messages : messages.filter(m => m.from_kid === filter)

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-500 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-pink-100">Kid notes and family announcements</p>
      </div>

      {/* ─── Kid Notes Inbox ─── */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-pink-500" />
            Kid Notes
            {unreadCount > 0 && (
              <span className="bg-pink-500 text-white text-xs px-2 py-0.5 rounded-full">{unreadCount} new</span>
            )}
          </h2>
        </div>

        {/* Filter */}
        <div className="p-3 border-b flex gap-1 overflow-x-auto">
          {ALL_KIDS.map(kid => (
            <button
              key={kid}
              onClick={() => setFilter(kid)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                filter === kid
                  ? 'bg-pink-100 text-pink-700 border border-pink-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {kid === 'all' ? 'All Kids' : KID_DISPLAY[kid] || kid}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="divide-y">
          {filtered.length === 0 && (
            <div className="p-8 text-center text-gray-400">No messages yet</div>
          )}
          {filtered.map(msg => {
            const isUnread = !msg.read_at
            const isResolved = msg.resolved

            return (
              <div key={msg.id} className={`p-4 ${isResolved ? 'bg-gray-50/80' : isUnread ? 'bg-blue-50/40' : ''}`}>
                <div className="flex items-start gap-3">
                  {/* Status indicator */}
                  <div className="flex-shrink-0 pt-1">
                    {isResolved ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : isUnread ? (
                      <span className="block w-2.5 h-2.5 bg-blue-500 rounded-full mt-0.5 ml-0.5" />
                    ) : (
                      <span className="block w-2.5 h-2.5 rounded-full mt-0.5 ml-0.5" />
                    )}
                  </div>

                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${KID_COLORS[msg.from_kid] || 'bg-gray-100 text-gray-700'}`}>
                    {(KID_DISPLAY[msg.from_kid] || msg.from_kid).charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-medium text-sm ${isResolved ? 'text-gray-400' : 'text-gray-900'}`}>{KID_DISPLAY[msg.from_kid] || msg.from_kid}</span>
                      <span className="text-xs text-gray-400">{timeAgo(msg.created_at)}</span>
                      {isResolved && (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Resolved</span>
                      )}
                    </div>
                    <p className={`text-sm ${isResolved ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{msg.message}</p>

                    {/* Reply display */}
                    {msg.parent_reply && (
                      <div className={`mt-2 p-2.5 rounded-lg border ${isResolved ? 'bg-gray-50 border-gray-200' : 'bg-purple-50 border-purple-100'}`}>
                        <p className={`text-xs font-medium mb-0.5 ${isResolved ? 'text-gray-400' : 'text-purple-600'}`}>Your reply:</p>
                        <p className={`text-sm ${isResolved ? 'text-gray-400' : 'text-purple-900'}`}>{msg.parent_reply}</p>
                        {msg.reply_at && (
                          <p className="text-xs text-gray-400 mt-1">{timeAgo(msg.reply_at)}</p>
                        )}
                      </div>
                    )}

                    {/* Reply input */}
                    {replyingTo === msg.id && (
                      <div className="mt-2 flex gap-2">
                        <input
                          type="text"
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && sendReply(msg.id)}
                          placeholder="Write a reply..."
                          className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
                          autoFocus
                        />
                        <button onClick={() => sendReply(msg.id)}
                          className="bg-purple-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-purple-600 flex items-center gap-1">
                          <Send className="w-3.5 h-3.5" /> Reply
                        </button>
                        <button onClick={() => { setReplyingTo(null); setReplyText('') }}
                          className="text-gray-400 hover:text-gray-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Action buttons */}
                    {replyingTo !== msg.id && !isResolved && (
                      <div className="mt-2 flex gap-3">
                        <button onClick={() => { setReplyingTo(msg.id); setReplyText('') }}
                          className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1">
                          <Send className="w-3.5 h-3.5" /> {msg.parent_reply ? 'Update Reply' : 'Reply'}
                        </button>
                        <button onClick={() => markResolved(msg.id)}
                          className="text-xs text-green-600 hover:text-green-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ─── Family Announcements ─── */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-amber-500" />
            Family Announcements
          </h2>
          <button onClick={() => setShowNewAnnouncement(true)}
            className="bg-amber-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-amber-600 flex items-center gap-1">
            <Plus className="w-4 h-4" /> New Announcement
          </button>
        </div>

        <div className="p-4 space-y-3">
          {showNewAnnouncement && (
            <div className="p-4 bg-gray-50 rounded-lg border space-y-2">
              <textarea
                value={announcementText}
                onChange={e => setAnnouncementText(e.target.value)}
                placeholder="Write an announcement for all kids..."
                rows={3}
                className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-300"
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={createAnnouncement} disabled={!announcementText.trim()}
                  className="bg-amber-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-amber-600 disabled:opacity-50">
                  Post to All Kids
                </button>
                <button onClick={() => { setShowNewAnnouncement(false); setAnnouncementText('') }}
                  className="text-gray-500 text-sm px-3 py-1.5">Cancel</button>
              </div>
            </div>
          )}

          {announcements.map(a => (
            <div key={a.id} className="p-3 bg-yellow-50 rounded-lg border border-yellow-100 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-yellow-900">{a.message}</p>
                <p className="text-xs text-yellow-500 mt-1">
                  {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} by {a.created_by}
                </p>
              </div>
              <button onClick={() => removeAnnouncement(a.id)}
                className="text-yellow-400 hover:text-red-500 flex-shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {announcements.length === 0 && !showNewAnnouncement && (
            <p className="text-center text-gray-400 py-4">No active announcements</p>
          )}
        </div>
      </div>
    </div>
  )
}
