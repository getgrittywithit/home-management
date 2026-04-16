'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, X, Loader2, Sparkles } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AiBuddyChatProps {
  role: 'kid' | 'parent'
  kidName?: string
  displayName?: string
}

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function AiBuddyChat({ role, kidName, displayName }: AiBuddyChatProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [conversationId] = useState(() => crypto.randomUUID())
  const scrollRef = useRef<HTMLDivElement>(null)

  const name = displayName || kidName || 'there'
  const buddyName = role === 'kid' ? 'Daily Helper' : 'Family Assistant'
  const buddyIcon = role === 'kid' ? <Sparkles className="w-5 h-5" /> : '🏠'
  const limit = role === 'kid' ? 20 : 50
  const greetingKey = role === 'kid' && kidName
    ? `aibuddy-greeting-${kidName.toLowerCase()}-${todayKey()}`
    : null

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = useCallback(async (rawMessage: string) => {
    const userMsg = rawMessage.trim()
    if (!userMsg) return
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setSending(true)
    try {
      const res = await fetch('/api/ai-buddy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          kid_name: kidName,
          message: userMsg,
          conversation_id: conversationId,
        }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || "I couldn't process that." }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Something went wrong. Try again!" }])
    }
    setSending(false)
  }, [role, kidName, conversationId])

  const handleSend = async () => {
    if (!input.trim() || sending) return
    const userMsg = input.trim()
    setInput('')
    await sendMessage(userMsg)
  }

  // First open of the day: auto-send a morning greeting so the Buddy
  // responds with a daily rundown instead of showing an empty chat.
  useEffect(() => {
    if (!open || role !== 'kid' || !greetingKey || messages.length > 0 || sending) return
    const alreadyGreeted = typeof window !== 'undefined' && sessionStorage.getItem(greetingKey) === '1'
    if (alreadyGreeted) return
    if (typeof window !== 'undefined') sessionStorage.setItem(greetingKey, '1')
    sendMessage("Good morning! What's my day look like?")
  }, [open, role, greetingKey, messages.length, sending, sendMessage])

  const suggestions = role === 'kid'
    ? ['What do I need to do today?', 'How many stars do I have?', 'What should I read?']
    : ['How did the kids do today?', "Who's on dinner tonight?", 'What zone is Wyatt in?']

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-28 md:bottom-6 right-4 md:right-6 z-40 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 flex items-center gap-2 px-4 py-3 md:w-14 md:h-14 md:px-0 md:py-0 md:justify-center"
        title={`Ask ${buddyName}`}
      >
        {buddyIcon}
        <span className="text-sm font-medium md:hidden">{buddyName}</span>
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col" style={{ maxHeight: '500px' }}>
      {/* Header */}
      <div className="bg-blue-600 text-white px-4 py-3 rounded-t-2xl flex items-center justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            {buddyIcon} {buddyName}
          </h3>
          <p className="text-[10px] text-blue-100 mt-0.5">
            {role === 'kid' ? 'Your daily portal assistant' : 'Family assistant'}
          </p>
        </div>
        <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: '200px', maxHeight: '350px' }}>
        {messages.length === 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-600 mb-3">
              Hi {name}! I can help you with:
            </p>
            <div className="space-y-2">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(s); }}
                  className="w-full text-left text-sm bg-gray-50 hover:bg-blue-50 rounded-lg px-3 py-2 text-gray-700 hover:text-blue-700 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-br-sm'
                : 'bg-gray-100 text-gray-800 rounded-bl-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask me anything..."
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="bg-blue-600 text-white w-10 h-10 rounded-xl flex items-center justify-center hover:bg-blue-700 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1 text-center">
          {messages.filter(m => m.role === 'user').length}/{limit} messages today
        </p>
      </div>
    </div>
  )
}
