'use client'

import { useState, useEffect } from 'react'
import { Send, Utensils, Users, Gamepad2, Heart, ShoppingBag, Lock, MessageCircle, Package, Check, X, Clock } from 'lucide-react'
import BreakButton from './BreakButton'
import RequestFormModal, { type RequestKind } from './RequestFormModal'

interface Message {
  id: string; message: string; created_at: string; parent_reply: string | null; reply_at: string | null
}

interface PendingRedemption {
  id: number; reward_name: string; coins_spent: number; status: string; created_at: string
}

interface NeedRequest {
  id: string
  name: string
  category: string
  status: 'active' | 'pending' | 'purchased' | 'denied' | 'cancelled'
  denied_reason: string | null
  created_at: string
}

const NEED_CATEGORIES = [
  '🎒 School', '🛏️ Bedding', '👕 Clothing', '🚿 Bathroom', '💻 Tech & Electronics',
  '🎨 Crafts & Art', '🍳 Kitchen', '🐾 Pet Supplies', '📦 Other',
]

const QUICK_REQUESTS: Array<{ label: string; icon: typeof Utensils; color: string; kind: RequestKind }> = [
  { label: 'Snack Request',   icon: Utensils, color: 'text-green-500',  kind: 'snack' },
  { label: 'Friend Over',     icon: Users,    color: 'text-blue-500',   kind: 'friend_over' },
  { label: 'Screen Time',     icon: Gamepad2, color: 'text-purple-500', kind: 'screen_time' },
  { label: 'Special Request', icon: Heart,    color: 'text-pink-500',   kind: 'special' },
]

const PERSONAL_NEEDS_ITEMS = [
  'Underwear', 'Socks', 'Pads/Tampons', 'Deodorant', 'Shampoo',
  'Toothbrush', 'School Supplies', 'Shoes', 'Clothing', 'Other',
]

export default function KidRequestsTab({ childName }: { childName: string }) {
  const [customMsg, setCustomMsg] = useState('')
  const [sentLabel, setSentLabel] = useState<string | null>(null)
  const [recent, setRecent] = useState<Message[]>([])
  const [pendingRewards, setPendingRewards] = useState<PendingRedemption[]>([])
  const [loaded, setLoaded] = useState(false)
  const [showPersonalNeeds, setShowPersonalNeeds] = useState(false)
  const [personalItem, setPersonalItem] = useState('')
  const [openRequest, setOpenRequest] = useState<RequestKind | null>(null)
  const [showNeedForm, setShowNeedForm] = useState(false)
  const [needName, setNeedName] = useState('')
  const [needCategory, setNeedCategory] = useState(NEED_CATEGORIES[0])
  const [needReason, setNeedReason] = useState('')
  const [needSaving, setNeedSaving] = useState(false)
  const [myNeeds, setMyNeeds] = useState<NeedRequest[]>([])

  const childKey = childName.toLowerCase()

  const loadMyNeeds = () => {
    fetch(`/api/household-needs?action=my_requests&kid_name=${childKey}`)
      .then((r) => r.json())
      .then((d) => setMyNeeds(d.items || []))
      .catch(() => {})
  }

  useEffect(() => {
    Promise.all([
      fetch(`/api/kids/messages?action=get_messages&kid=${childKey}`).then(r => r.json()),
      fetch(`/api/rewards?action=get_redemptions&kid_name=${childKey}&status=pending`).then(r => r.json()).catch(() => ({ redemptions: [] })),
    ]).then(([msgData, rewardData]) => {
      setRecent((msgData.messages || []).slice(0, 3))
      setPendingRewards(rewardData.redemptions || [])
      setLoaded(true)
    }).catch(() => setLoaded(true))
    loadMyNeeds()
  }, [childKey])

  const submitNeed = async () => {
    if (!needName.trim()) return
    setNeedSaving(true)
    try {
      // Strip leading emoji from category label
      const category = needCategory.replace(/^\S+\s+/, '')
      await fetch('/api/household-needs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name: needName.trim(),
          category,
          notes: needReason || null,
          requested_by: childKey,
        }),
      })
      setNeedName('')
      setNeedReason('')
      setShowNeedForm(false)
      loadMyNeeds()
      setSentLabel('need')
      setTimeout(() => setSentLabel(null), 3000)
    } finally {
      setNeedSaving(false)
    }
  }

  const sendRequest = async (message: string, label: string) => {
    setSentLabel(label)
    await fetch('/api/kids/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send_message', kid: childKey, message })
    }).catch(() => {})
    setRecent(prev => [{ id: String(Date.now()), message, created_at: new Date().toISOString(), parent_reply: null, reply_at: null }, ...prev].slice(0, 3))
    setTimeout(() => setSentLabel(null), 3000)
  }

  const sendCustom = () => {
    if (!customMsg.trim()) return
    sendRequest(customMsg.trim(), 'custom')
    setCustomMsg('')
  }

  const timeAgo = (d: string) => {
    const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-500 to-blue-500 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold">My Requests</h1>
        <p className="text-indigo-100">Ask for what you need!</p>
      </div>

      {/* Talk to Mom & I Need a Break — prominently placed */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => setOpenRequest('talk_to_parents')}
          className="w-full bg-teal-50 text-teal-700 px-4 py-4 rounded-xl text-sm font-semibold hover:bg-teal-100 transition-colors border-2 border-teal-200 flex items-center gap-3"
        >
          <MessageCircle className="w-5 h-5" />
          Talk to Mom &amp; Dad
          <span className="text-xs font-normal text-teal-400 ml-auto">Send a message</span>
        </button>
        <BreakButton childName={childName} inline />
      </div>

      {/* Quick Request Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {QUICK_REQUESTS.map(req => {
          const Icon = req.icon
          const isSent = sentLabel === req.label
          return (
            <button key={req.label} onClick={() => !isSent && setOpenRequest(req.kind)}
              className={`p-4 rounded-lg border text-center transition-all ${isSent ? 'bg-green-50 border-green-300' : 'bg-white hover:bg-gray-50'}`}>
              {isSent ? (
                <div className="text-green-600 text-sm font-medium">✓ Sent to Mom!</div>
              ) : (
                <>
                  <Icon className={`w-6 h-6 mx-auto mb-2 ${req.color}`} />
                  <div className="font-medium text-sm">{req.label}</div>
                </>
              )}
            </button>
          )
        })}
      </div>

      {/* Request form modal */}
      {openRequest && (
        <RequestFormModal
          kind={openRequest}
          kidName={childName}
          onClose={() => setOpenRequest(null)}
          onSent={() => {
            const label = QUICK_REQUESTS.find(r => r.kind === openRequest)?.label
              || (openRequest === 'talk_to_parents' ? 'talk' : openRequest)
            setSentLabel(label)
            setRecent(prev => [{
              id: String(Date.now()),
              message: `${label} sent`,
              created_at: new Date().toISOString(),
              parent_reply: null,
              reply_at: null,
            }, ...prev].slice(0, 3))
            setOpenRequest(null)
            setTimeout(() => setSentLabel(null), 3000)
          }}
        />
      )}

      {/* I Need Something — adds to household needs list */}
      <div className="bg-white p-4 rounded-lg border">
        <button
          onClick={() => setShowNeedForm(!showNeedForm)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 w-full"
        >
          <Package className="w-4 h-4 text-sky-500" />
          I Need Something
          <span className="text-xs text-gray-400 ml-auto">
            {showNeedForm ? 'Close' : 'Ask Mom or Dad to add it'}
          </span>
        </button>

        {showNeedForm && (
          <div className="mt-3 space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-700">What do you need?</label>
              <input
                value={needName}
                onChange={(e) => setNeedName(e.target.value)}
                placeholder="New pillow, art supplies…"
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-sky-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700">Category</label>
              <select
                value={needCategory}
                onChange={(e) => setNeedCategory(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
              >
                {NEED_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700">Why? (optional)</label>
              <textarea
                value={needReason}
                onChange={(e) => setNeedReason(e.target.value)}
                rows={2}
                placeholder="Mine is falling apart…"
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <button
              onClick={submitNeed}
              disabled={!needName.trim() || needSaving}
              className="w-full bg-sky-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-sky-700 disabled:opacity-50"
            >
              {needSaving ? 'Sending…' : 'Send to Mom & Dad'}
            </button>
          </div>
        )}

        {sentLabel === 'need' && !showNeedForm && (
          <p className="text-xs text-green-600 font-medium mt-2">✓ Sent! Mom and Dad will see it.</p>
        )}

        {/* My recent needs with status */}
        {myNeeds.length > 0 && (
          <div className="mt-4 space-y-1.5">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">My recent requests</p>
            {myNeeds.slice(0, 5).map((n) => {
              const statusColor =
                n.status === 'active' ? 'text-green-600 bg-green-50' :
                n.status === 'pending' ? 'text-amber-600 bg-amber-50' :
                n.status === 'purchased' ? 'text-blue-600 bg-blue-50' :
                n.status === 'denied' ? 'text-red-600 bg-red-50' : 'text-gray-500 bg-gray-50'
              const statusIcon =
                n.status === 'active' ? <Check className="w-3 h-3" /> :
                n.status === 'purchased' ? <Check className="w-3 h-3" /> :
                n.status === 'denied' ? <X className="w-3 h-3" /> :
                <Clock className="w-3 h-3" />
              const statusLabel =
                n.status === 'active' ? 'Approved' :
                n.status === 'pending' ? 'Waiting' :
                n.status === 'purchased' ? 'Got it!' :
                n.status === 'denied' ? 'Not now' : n.status
              return (
                <div key={n.id} className="flex items-center gap-2 text-xs">
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-medium ${statusColor}`}>
                    {statusIcon} {statusLabel}
                  </span>
                  <span className="text-gray-700 flex-1 truncate">{n.name}</span>
                  {n.denied_reason && n.status === 'denied' && (
                    <span className="text-gray-400 italic text-[10px]">"{n.denied_reason}"</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Personal Needs (Private) */}
      <div className="bg-white p-4 rounded-lg border">
        <button
          onClick={() => setShowPersonalNeeds(!showPersonalNeeds)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          <ShoppingBag className="w-4 h-4 text-rose-500" />
          Personal Needs
          <Lock className="w-3 h-3 text-gray-400" />
          <span className="text-xs text-gray-400">(only Mom sees)</span>
        </button>

        {showPersonalNeeds && (
          <div className="mt-3 space-y-3">
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Lock className="w-3 h-3" /> This request is private — only Mom will see it.
            </p>
            <div className="flex flex-wrap gap-2">
              {PERSONAL_NEEDS_ITEMS.map(item => (
                <button
                  key={item}
                  onClick={() => {
                    sendRequest(`🔒 Personal need: ${item}`, 'personal')
                    setShowPersonalNeeds(false)
                  }}
                  className="px-3 py-1.5 text-sm bg-rose-50 text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-100"
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={personalItem}
                onChange={e => setPersonalItem(e.target.value)}
                placeholder="Something else..."
                className="flex-1 border rounded-lg px-3 py-2 text-sm"
              />
              <button
                onClick={() => {
                  if (personalItem.trim()) {
                    sendRequest(`🔒 Personal need: ${personalItem.trim()}`, 'personal')
                    setPersonalItem('')
                    setShowPersonalNeeds(false)
                  }
                }}
                disabled={!personalItem.trim()}
                className="bg-rose-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-rose-600 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Custom Request */}
      <div className="bg-white p-4 rounded-lg border">
        <h3 className="font-semibold mb-3">Send Custom Request</h3>
        {sentLabel === 'custom' ? (
          <div className="p-3 bg-green-50 rounded-lg text-center text-green-600 font-medium text-sm">✓ Sent to Mom!</div>
        ) : (
          <>
            <textarea value={customMsg} onChange={e => setCustomMsg(e.target.value)}
              className="w-full p-3 border rounded-lg resize-none text-sm" rows={3}
              placeholder="What would you like to ask for?" />
            <button onClick={sendCustom} disabled={!customMsg.trim()}
              className="mt-2 bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 disabled:opacity-50 flex items-center gap-2 text-sm">
              <Send className="w-4 h-4" /> Send Request
            </button>
          </>
        )}
      </div>

      {/* Pending Reward Redemptions */}
      {loaded && pendingRewards.length > 0 && (
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="font-semibold mb-3">Waiting for Approval</h3>
          <div className="space-y-2">
            {pendingRewards.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-gray-800">{r.reward_name}</span>
                  <span className="text-xs text-gray-500">({r.coins_spent} coins)</span>
                </div>
                <span className="text-xs text-amber-600 font-medium flex items-center gap-1">waiting for Mom</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Requests */}
      {loaded && recent.length > 0 && (
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="font-semibold mb-3">Recent Requests</h3>
          <div className="space-y-3">
            {recent.map(msg => (
              <div key={msg.id} className="text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-800">{msg.message}</span>
                  <span className="text-xs text-gray-400">{timeAgo(msg.created_at)}</span>
                </div>
                {msg.parent_reply ? (
                  <div className="mt-1 p-2 bg-green-50 rounded-lg border border-green-100">
                    <p className="text-xs font-medium text-green-600">Mom said:</p>
                    <p className="text-sm text-green-800">{msg.parent_reply}</p>
                  </div>
                ) : (
                  <p className="text-xs text-amber-500 mt-0.5">Waiting for Mom...</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
