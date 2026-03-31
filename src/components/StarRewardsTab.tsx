'use client'

import { useState, useEffect } from 'react'
import {
  Star, Flame, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp,
  ShoppingBag, Target, X, Loader2, Gift, Monitor, Users, Sparkles
} from 'lucide-react'

interface StarRewardsTabProps {
  childName: string
}

interface BalanceData {
  balance: number
  held: number
  available: number
  streak_days: number
  lifetime_earned: number
  today_earned: number
}

interface StoreItem {
  id: number
  name: string
  description: string | null
  category: string
  star_cost: number
  requires_approval: boolean
  notes: string | null
  affordable: boolean
}

interface Redemption {
  id: number
  kid_name: string
  item_id: number
  stars_held: number
  status: string
  kid_note: string | null
  parent_note: string | null
  created_at: string
  resolved_at: string | null
  item_name: string
  item_category: string
}

interface SavingsGoal {
  id: number
  goal_name: string
  target_stars: number
  current_balance: number
  progress_pct: number
}

const CATEGORY_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  'Screen Time': { icon: Monitor, color: 'text-blue-600', bg: 'bg-blue-50' },
  'Social': { icon: Users, color: 'text-pink-600', bg: 'bg-pink-50' },
  'Activities': { icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-50' },
  'Chore Passes': { icon: Gift, color: 'text-green-600', bg: 'bg-green-50' },
}

export default function StarRewardsTab({ childName }: StarRewardsTabProps) {
  const kidKey = childName.toLowerCase()
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null)
  const [storeItems, setStoreItems] = useState<StoreItem[]>([])
  const [pending, setPending] = useState<Redemption[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null)
  const [kidNote, setKidNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null)
  const [loaded, setLoaded] = useState(false)

  const loadData = () => {
    Promise.all([
      fetch(`/api/stars?action=get_balance&kid_name=${kidKey}`).then(r => r.json()),
      fetch(`/api/stars?action=get_store&kid_name=${kidKey}`).then(r => r.json()),
      fetch(`/api/stars?action=get_kid_history&kid_name=${kidKey}&limit=10`).then(r => r.json()),
      fetch(`/api/stars?action=get_savings_goals&kid_name=${kidKey}`).then(r => r.json()),
    ]).then(([bal, store, hist, sav]) => {
      setBalanceData(bal)
      setStoreItems(store.items || [])
      setPending(store.pending || [])
      setHistory(hist.history || [])
      setGoals(sav.goals || [])
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }

  useEffect(() => { if (kidKey) loadData() }, [kidKey])

  const handleSubmitRedemption = async () => {
    if (!selectedItem || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/stars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_redemption',
          kid_name: kidKey,
          item_id: selectedItem.id,
          kid_note: kidNote.trim() || null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSubmitResult({ success: true, message: 'Request sent to Mom for approval!' })
        setSelectedItem(null)
        setKidNote('')
        loadData()
      } else {
        setSubmitResult({ success: false, message: data.error || 'Something went wrong' })
      }
    } catch {
      setSubmitResult({ success: false, message: 'Network error' })
    } finally {
      setSubmitting(false)
      setTimeout(() => setSubmitResult(null), 3000)
    }
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    )
  }

  // Group items by category
  const categories = Array.from(new Set(storeItems.map(i => i.category)))

  return (
    <div className="space-y-6">
      {/* Balance Header */}
      {balanceData && (
        <div className="bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 text-white p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Star className="w-8 h-8 fill-white/80" />
                <span className="text-4xl font-black">{balanceData.available}</span>
                <span className="text-amber-100 text-lg font-medium">stars</span>
              </div>
              {balanceData.held > 0 && (
                <p className="text-amber-100 text-sm">
                  ({balanceData.held} held for pending requests)
                </p>
              )}
              <p className="text-amber-100 text-xs mt-1">
                Today: +{balanceData.today_earned} | Lifetime: {balanceData.lifetime_earned}
              </p>
            </div>
            <div className="text-right">
              {balanceData.streak_days > 0 && (
                <div className="flex items-center gap-1 bg-white/20 rounded-full px-3 py-1.5 mb-2">
                  <Flame className="w-5 h-5 text-orange-200" />
                  <span className="text-lg font-bold">{balanceData.streak_days}</span>
                  <span className="text-xs text-amber-100">day streak</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Submit result toast */}
      {submitResult && (
        <div className={`p-3 rounded-lg text-sm font-medium ${
          submitResult.success
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {submitResult.message}
        </div>
      )}

      {/* Savings Goal Progress */}
      {goals.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-purple-600" />
            Savings Goals
          </h3>
          {goals.map(goal => (
            <div key={goal.id} className="mb-3 last:mb-0">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-700 font-medium">{goal.goal_name}</span>
                <span className="text-gray-500">{goal.current_balance} / {goal.target_stars}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-purple-500 h-2.5 rounded-full transition-all"
                  style={{ width: `${goal.progress_pct}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">{goal.progress_pct}% there</p>
            </div>
          ))}
        </div>
      )}

      {/* Store Grid by Category */}
      {categories.map(cat => {
        const catConfig = CATEGORY_CONFIG[cat] || { icon: ShoppingBag, color: 'text-gray-600', bg: 'bg-gray-50' }
        const CatIcon = catConfig.icon
        const catItems = storeItems.filter(i => i.category === cat)

        return (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-3">
              <CatIcon className={`w-5 h-5 ${catConfig.color}`} />
              <h3 className="font-bold text-gray-900">{cat}</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {catItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => item.affordable ? setSelectedItem(item) : undefined}
                  disabled={!item.affordable}
                  className={`text-left p-4 rounded-lg border transition-all ${
                    item.affordable
                      ? `${catConfig.bg} border-gray-200 hover:shadow-md hover:border-amber-300 cursor-pointer`
                      : 'bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-semibold text-gray-900 text-sm leading-tight">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                    <span className="text-sm font-bold text-amber-600">{item.star_cost}</span>
                  </div>
                  {item.affordable && (
                    <div className="mt-2 bg-amber-500 text-white text-xs font-bold text-center py-1.5 rounded-lg">
                      Get It!
                    </div>
                  )}
                  {!item.affordable && (
                    <div className="mt-2 bg-gray-300 text-gray-500 text-xs font-bold text-center py-1.5 rounded-lg">
                      Need more stars
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )
      })}

      {storeItems.length === 0 && (
        <div className="bg-white rounded-lg border p-8 text-center text-gray-400">
          <ShoppingBag className="w-10 h-10 mx-auto mb-2" />
          <p>No rewards in the store yet!</p>
          <p className="text-sm">Ask Mom to add some.</p>
        </div>
      )}

      {/* Pending Requests */}
      {pending.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <h3 className="font-semibold text-gray-900 mb-3">My Requests</h3>
          <div className="space-y-2">
            {pending.map(req => (
              <div key={req.id} className={`flex items-center gap-3 p-3 rounded-lg border ${
                req.status === 'pending' ? 'bg-amber-50 border-amber-200' :
                req.status === 'approved' ? 'bg-green-50 border-green-200' :
                'bg-red-50 border-red-200'
              }`}>
                <div className="flex-shrink-0">
                  {req.status === 'pending' && <Clock className="w-5 h-5 text-amber-500" />}
                  {req.status === 'approved' && <CheckCircle className="w-5 h-5 text-green-500" />}
                  {req.status === 'declined' && <XCircle className="w-5 h-5 text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{req.item_name}</p>
                  <p className="text-xs text-gray-500">
                    {req.stars_held} stars {req.status === 'pending' ? '(held)' : req.status === 'approved' ? '(spent)' : '(returned)'}
                  </p>
                  {req.parent_note && (
                    <p className="text-xs text-gray-600 mt-1 italic">Mom: {req.parent_note}</p>
                  )}
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                  req.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                  req.status === 'approved' ? 'bg-green-100 text-green-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {req.status === 'pending' ? 'Waiting' : req.status === 'approved' ? 'Approved' : 'Declined'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History (collapsible) */}
      {history.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-semibold text-gray-900">Recent Star Activity</h3>
            {showHistory ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {showHistory && (
            <div className="px-4 pb-4 space-y-2">
              {history.map((entry: any) => (
                <div key={entry.id} className="flex items-center justify-between text-sm">
                  <div className="flex-1 min-w-0">
                    <span className="text-gray-700 truncate block">{entry.reason}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Chicago' })}
                    </span>
                  </div>
                  <span className={`font-semibold ml-2 flex-shrink-0 ${
                    entry.change_amount > 0 ? 'text-green-600' : 'text-rose-600'
                  }`}>
                    {entry.change_amount > 0 ? '+' : ''}{entry.change_amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => { setSelectedItem(null); setKidNote('') }} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[70vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-lg font-bold text-gray-900">{selectedItem.name}</h3>
              <button onClick={() => { setSelectedItem(null); setKidNote('') }} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
                <span className="text-2xl font-black text-amber-600">{selectedItem.star_cost}</span>
                <span className="text-gray-500">stars</span>
              </div>
              {selectedItem.description && (
                <p className="text-sm text-gray-700">{selectedItem.description}</p>
              )}
              {selectedItem.notes && (
                <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">{selectedItem.notes}</p>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Add a note for Mom (optional)</label>
                <textarea
                  value={kidNote}
                  onChange={e => setKidNote(e.target.value)}
                  placeholder="e.g. Can I use this on Saturday?"
                  className="w-full border rounded-lg p-2.5 text-sm resize-none h-20"
                />
              </div>
              <button
                onClick={handleSubmitRedemption}
                disabled={submitting}
                className="w-full bg-amber-500 text-white font-bold py-3 rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 text-lg"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
              {selectedItem.requires_approval && (
                <p className="text-xs text-gray-400 text-center">Mom will review and approve this request</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
