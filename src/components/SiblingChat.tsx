'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, MessageCircle, Users } from 'lucide-react'
import { ALL_KIDS } from '@/lib/constants'

interface Message {
  id: string
  from_kid: string
  to_kid: string | null
  message: string
  message_type: string
  created_at: string
}

interface Props {
  kidName: string
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export default function SiblingChat({ kidName }: Props) {
  const kid = kidName.toLowerCase()
  const siblings = ALL_KIDS.filter(k => k !== kid)
  const [selectedSibling, setSelectedSibling] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const fetchMessages = async (sibling?: string | null) => {
    const target = sibling ?? selectedSibling
    if (!target) {
      const res = await fetch(`/api/social?action=get_messages&kid_name=${kid}`).catch(() => null)
      const data = res ? await res.json() : {}
      setMessages((data.messages || []).reverse())
      return
    }
    const res = await fetch(`/api/social?action=get_messages&kid_name=${kid}&to_kid=${target}`).catch(() => null)
    const data = res ? await res.json() : {}
    setMessages((data.messages || []).reverse())
  }

  useEffect(() => { fetchMessages() }, [kid])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  useEffect(() => {
    if (!selectedSibling) return
    const interval = setInterval(() => fetchMessages(), 15000)
    return () => clearInterval(interval)
  }, [selectedSibling, kid])

  const sendMessage = async () => {
    if (!newMsg.trim() || !selectedSibling) return
    setSending(true)
    try {
      await fetch('/api/social', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_message', from_kid: kid, to_kid: selectedSibling, message: newMsg.trim() }),
      })
      setNewMsg('')
      await fetchMessages()
    } catch {} finally { setSending(false) }
  }

  const selectSibling = (sib: string) => {
    setSelectedSibling(sib)
    fetchMessages(sib)
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-5 rounded-xl">
        <h2 className="text-xl font-bold flex items-center gap-2"><MessageCircle className="w-6 h-6" /> Messages</h2>
        <p className="text-blue-100 text-sm mt-1">Chat with your siblings</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => { setSelectedSibling(null); fetchMessages(null) }}
          className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${!selectedSibling ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          <Users className="w-3.5 h-3.5 inline mr-1" />All
        </button>
        {siblings.map(sib => (
          <button key={sib} onClick={() => selectSibling(sib)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${selectedSibling === sib ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {cap(sib)}
          </button>
        ))}
      </div>

      <div ref={scrollRef} className="bg-white border rounded-xl p-4 h-80 overflow-y-auto space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">
            {selectedSibling ? `No messages with ${cap(selectedSibling)} yet. Say hi!` : 'No messages yet. Pick a sibling to start chatting!'}
          </p>
        )}
        {messages.map(msg => {
          const isMe = msg.from_kid === kid
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${isMe ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-900'}`}>
                {!isMe && <p className="text-xs font-semibold mb-0.5 opacity-70">{cap(msg.from_kid)}</p>}
                <p className="text-sm">{msg.message}</p>
                <p className={`text-[10px] mt-1 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                  {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' })}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex gap-2">
        {!selectedSibling && (
          <select value="" onChange={e => { setSelectedSibling(e.target.value); fetchMessages(e.target.value) }}
            className="border rounded-xl px-3 py-2.5 text-sm text-gray-500 focus:ring-2 focus:ring-blue-300 focus:outline-none">
            <option value="" disabled>Send to...</option>
            {siblings.map(sib => <option key={sib} value={sib}>{cap(sib)}</option>)}
          </select>
        )}
        <input value={newMsg} onChange={e => setNewMsg(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder={selectedSibling ? `Message ${cap(selectedSibling)}...` : 'Pick a sibling to message...'}
          disabled={!selectedSibling}
          className="flex-1 border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none disabled:bg-gray-50" />
        <button onClick={sendMessage} disabled={sending || !newMsg.trim() || !selectedSibling}
          className="bg-blue-500 text-white rounded-xl px-4 py-2.5 hover:bg-blue-600 disabled:opacity-50">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
