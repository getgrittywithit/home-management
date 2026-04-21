'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, X, Clock, HelpCircle, Loader2 } from 'lucide-react'
import { HOMESCHOOL_KIDS } from '@/lib/constants'

interface Props {
  kidName: string
  personaKey: string
  personaName: string
  personaIcon: string
  onClose: () => void
}

export default function BuddyChatUI({ kidName, personaKey, personaName, personaIcon, onClose }: Props) {
  const kid = kidName.toLowerCase()
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [blocked, setBlocked] = useState(false)
  const [blockReason, setBlockReason] = useState('')
  const [sessionStart] = useState(Date.now())
  const [showBreakNudge, setShowBreakNudge] = useState(false)
  const [showAskGrownup, setShowAskGrownup] = useState(false)
  const [grownupSent, setGrownupSent] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  if (!(HOMESCHOOL_KIDS as readonly string[]).includes(kid)) return null

  useEffect(() => {
    fetch(`/api/ai-buddy?action=session_check&kid_name=${kid}&persona_key=${personaKey}`)
      .then(r => r.json()).then(d => {
        if (!d.allowed) { setBlocked(true); setBlockReason(d.reason || 'Access not available right now.') }
        else setRemaining(d.remaining_minutes ?? null)
      }).catch(() => {})
  }, [kid, personaKey])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  // Break nudge at 15 min
  useEffect(() => {
    const timer = setTimeout(() => setShowBreakNudge(true), 15 * 60 * 1000)
    return () => clearTimeout(timer)
  }, [])

  const sendMessage = async () => {
    if (!input.trim() || sending) return
    const text = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text }])
    setSending(true)

    try {
      const res = await fetch('/api/ai-buddy', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'kid', kid_name: kid, message: text, buddy_type: personaKey }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', text: data.reply || "Hmm, let me think about that..." }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: "I'm having trouble right now. Try again in a moment!" }])
    } finally { setSending(false) }
  }

  const askGrownup = async () => {
    const summary = messages.map(m => `${m.role === 'user' ? kidName : personaName}: ${m.text}`).join('\n')
    await fetch('/api/notifications', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        title: `${kidName} wants to ask a grown-up`,
        message: `From ${personaName} chat: ${summary.substring(0, 200)}...`,
        source_type: 'buddy_ask_grownup', source_ref: `ask-grownup-${kid}-${Date.now()}`,
        icon: '🙋', link_tab: 'homeschool',
      }),
    }).catch(() => {})
    setGrownupSent(true)
    setShowAskGrownup(false)
  }

  if (blocked) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm text-center">
          <p className="text-lg mb-2">{personaIcon}</p>
          <p className="text-sm text-gray-700 font-medium">{blockReason}</p>
          <button onClick={onClose} className="mt-4 text-sm text-blue-600">Close</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md h-[85vh] flex flex-col">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-3 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{personaIcon}</span>
            <div>
              <p className="font-bold text-sm">{personaName}</p>
              {remaining !== null && (
                <p className="text-[10px] text-indigo-200 flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" /> {remaining} min left today
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setShowAskGrownup(true)} title="Ask a grown-up"
              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30">
              <HelpCircle className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showBreakNudge && (
          <div className="bg-amber-50 border-b border-amber-200 p-2 text-center">
            <p className="text-xs text-amber-800">You&apos;ve been chatting for 15 minutes — take a quick stretch break?</p>
            <button onClick={() => setShowBreakNudge(false)} className="text-[10px] text-amber-600 mt-0.5">Got it!</button>
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">{personaIcon}</p>
              <p className="text-sm text-gray-600">Hi {kidName}! I&apos;m {personaName}. Ask me anything!</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                m.role === 'user' ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-900'
              }`}>
                {m.text}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl px-4 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            </div>
          )}
        </div>

        <div className="p-3 border-t">
          <div className="flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder={`Ask ${personaName}...`}
              className="flex-1 border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 focus:outline-none" />
            <button onClick={sendMessage} disabled={sending || !input.trim()}
              className="bg-indigo-500 text-white rounded-xl px-3 py-2 hover:bg-indigo-600 disabled:opacity-50">
              <Send className="w-4 h-4" />
            </button>
          </div>
          {grownupSent && <p className="text-[10px] text-green-600 text-center mt-1">Mom has been notified!</p>}
        </div>

        {showAskGrownup && (
          <div className="absolute inset-0 bg-black/30 z-10 flex items-center justify-center rounded-2xl">
            <div className="bg-white rounded-xl p-5 shadow-xl max-w-xs text-center">
              <HelpCircle className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900 mb-1">Ask Mom or Dad?</p>
              <p className="text-xs text-gray-500 mb-3">This will send a summary of your conversation to Mom.</p>
              <div className="flex gap-2">
                <button onClick={() => setShowAskGrownup(false)} className="flex-1 text-xs text-gray-500 py-2">Cancel</button>
                <button onClick={askGrownup} className="flex-1 bg-indigo-500 text-white py-2 rounded-lg text-xs font-medium">Send to Mom</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
