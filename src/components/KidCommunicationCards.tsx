'use client'

import { useState, useEffect } from 'react'
import { Send, MessageCircle } from 'lucide-react'

interface Announcement {
  id: string
  message: string
  created_at: string
}

interface RecentReply {
  parent_reply: string
  reply_at: string
}

export default function KidCommunicationCards({ childName }: { childName: string }) {
  const [note, setNote] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [recentReply, setRecentReply] = useState<RecentReply | null>(null)

  const childKey = childName.toLowerCase()

  useEffect(() => {
    fetch('/api/kids/messages?action=get_announcements')
      .then(r => r.json())
      .then(data => setAnnouncements(data.announcements || []))
      .catch(() => {})

    fetch(`/api/kids/messages?action=get_messages&kid=${childKey}`)
      .then(r => r.json())
      .then(data => {
        const msgs = data.messages || []
        const withReply = msgs.find((m: any) => m.parent_reply)
        if (withReply) {
          setRecentReply({ parent_reply: withReply.parent_reply, reply_at: withReply.reply_at })
        }
      })
      .catch(() => {})
  }, [childKey])

  const sendNote = async () => {
    if (!note.trim() || sending) return
    setSending(true)
    try {
      await fetch('/api/kids/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_message', kid: childKey, message: note.trim() })
      })
      setSent(true)
      setNote('')
      setTimeout(() => setSent(false), 4000)
    } catch {
      // silent fail
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Note to Mom */}
      <div className="bg-white rounded-lg border shadow-sm p-5">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
          <MessageCircle className="w-5 h-5 text-pink-500" />
          Leave a Note for Mom
        </h3>

        {sent ? (
          <div className="p-4 bg-yellow-50 rounded-lg text-center">
            <p className="text-yellow-800 font-medium">Mom will see it soon!</p>
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              value={note}
              onChange={e => setNote(e.target.value.substring(0, 300))}
              placeholder="What's on your mind?"
              rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">{note.length}/300</span>
              <button
                onClick={sendNote}
                disabled={!note.trim() || sending}
                className="bg-pink-500 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-pink-600 disabled:opacity-50 flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
                Send Note
              </button>
            </div>
          </div>
        )}

        {recentReply && (
          <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
            <p className="text-xs font-medium text-purple-600 mb-1">Mom said:</p>
            <p className="text-sm text-purple-900">{recentReply.parent_reply}</p>
            <p className="text-xs text-purple-400 mt-1">
              {new Date(recentReply.reply_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </p>
          </div>
        )}
      </div>

      {/* Family Announcements */}
      {announcements.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-3">From Mom</h3>
          <div className="space-y-2">
            {announcements.map(a => (
              <div key={a.id} className="p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                <p className="text-sm text-yellow-900">{a.message}</p>
                <p className="text-xs text-yellow-500 mt-1">
                  {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
