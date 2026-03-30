'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Star, ArrowUp, ArrowDown, Monitor, Target, Gift, Clock,
  Sparkles, ChevronDown, ChevronUp, Plus, Minus, Trophy
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────
interface KidBalance {
  kid_name: string
  coin_balance: number
  screen_time_minutes: number
  savings_goal_name: string | null
  savings_goal_target: number
  savings_goal_current: number
  streak_days: number
  earned_this_week: number
  spent_this_week: number
  reward_mode: string
}

interface CatalogReward {
  id: number
  name: string
  emoji: string
  cost: number
  type: 'screen_time' | 'family_reward' | 'privilege'
  active: boolean
}

interface Transaction {
  id: number
  type: 'earn' | 'spend' | 'bonus' | 'deduct' | 'redeem'
  amount: number
  description: string
  created_at: string
}

interface ScreenTimeEntry {
  id: number
  type: 'earn' | 'spend'
  minutes: number
  description: string
  created_at: string
}

interface KidRewardProfileProps {
  kidName: string
  balance: KidBalance
  catalog: CatalogReward[]
  coinEmoji: string
  coinName: string
  onBack: () => void
}

const KID_DISPLAY: Record<string, string> = {
  amos: 'Amos', ellie: 'Ellie', wyatt: 'Wyatt', hannah: 'Hannah', zoey: 'Zoey', kaylee: 'Kaylee'
}
const KID_COLORS: Record<string, string> = {
  amos: 'bg-blue-500', ellie: 'bg-purple-500', wyatt: 'bg-green-500',
  hannah: 'bg-pink-500', zoey: 'bg-amber-500', kaylee: 'bg-teal-500'
}

const TYPE_ICONS: Record<string, string> = {
  earn: '+', spend: '-', bonus: '+', deduct: '-', redeem: '-',
}
const TYPE_COLORS: Record<string, string> = {
  earn: 'text-green-600', spend: 'text-red-500', bonus: 'text-amber-600',
  deduct: 'text-red-500', redeem: 'text-purple-600',
}

export default function KidRewardProfile({ kidName, balance, catalog, coinEmoji, coinName, onBack }: KidRewardProfileProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [screenTimeLedger, setScreenTimeLedger] = useState<ScreenTimeEntry[]>([])
  const [showAllTx, setShowAllTx] = useState(false)
  const [redeemingId, setRedeemingId] = useState<number | null>(null)
  const [contributeAmount, setContributeAmount] = useState('')
  const [showContribute, setShowContribute] = useState(false)

  const displayName = KID_DISPLAY[kidName] || kidName
  const avatarColor = KID_COLORS[kidName] || 'bg-gray-400'
  const hasScreenTime = balance.reward_mode?.includes('screen_time') || balance.screen_time_minutes > 0
  const hasGoal = balance.savings_goal_name && balance.savings_goal_target > 0

  const loadHistory = useCallback(async () => {
    const [txRes, stRes] = await Promise.all([
      fetch(`/api/rewards?action=transactions&kid=${kidName}`).then(r => r.json()).catch(() => ({ transactions: [] })),
      fetch(`/api/rewards?action=screen_time_ledger&kid=${kidName}`).then(r => r.json()).catch(() => ({ entries: [] })),
    ])
    setTransactions(txRes.transactions || [])
    setScreenTimeLedger(stRes.entries || [])
  }, [kidName])

  useEffect(() => { loadHistory() }, [loadHistory])

  async function handleRedeem(reward: CatalogReward) {
    if (balance.coin_balance < reward.cost) return
    setRedeemingId(reward.id)
    await fetch('/api/rewards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'request_redemption', kid_name: kidName, reward_id: reward.id }),
    }).catch(() => {})
    setRedeemingId(null)
    loadHistory()
  }

  async function handleContribute() {
    const amt = parseInt(contributeAmount)
    if (!amt || amt <= 0) return
    await fetch('/api/rewards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'contribute_savings', kid_name: kidName, amount: amt }),
    }).catch(() => {})
    setShowContribute(false)
    setContributeAmount('')
    loadHistory()
  }

  const visibleTx = showAllTx ? transactions : transactions.slice(0, 10)
  const goalPct = hasGoal ? Math.min(100, (balance.savings_goal_current / balance.savings_goal_target) * 100) : 0
  const weeksToGoal = hasGoal && balance.earned_this_week > 0
    ? Math.ceil((balance.savings_goal_target - balance.savings_goal_current) / balance.earned_this_week)
    : null

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <div className="bg-white border rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl ${avatarColor}`}>
            {displayName[0]}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
            <div className="text-3xl font-bold text-amber-600 mt-1">{coinEmoji} {balance.coin_balance}</div>
          </div>
          {balance.streak_days > 0 && (
            <div className="text-right">
              <div className="flex items-center gap-1 text-orange-500">
                <Sparkles className="w-5 h-5" />
                <span className="text-lg font-bold">{balance.streak_days}</span>
              </div>
              <div className="text-xs text-gray-500">day streak</div>
            </div>
          )}
        </div>

        {/* This week stats */}
        <div className="flex gap-6 mt-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-sm text-gray-500">Earned this week</div>
            <div className="text-lg font-semibold text-green-600 flex items-center justify-center gap-1">
              <ArrowUp className="w-4 h-4" /> {coinEmoji} {balance.earned_this_week}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-500">Spent this week</div>
            <div className="text-lg font-semibold text-red-500 flex items-center justify-center gap-1">
              <ArrowDown className="w-4 h-4" /> {coinEmoji} {balance.spent_this_week}
            </div>
          </div>
          {hasScreenTime && (
            <div className="text-center">
              <div className="text-sm text-gray-500">Screen time</div>
              <div className="text-lg font-semibold text-blue-600 flex items-center justify-center gap-1">
                <Monitor className="w-4 h-4" /> {balance.screen_time_minutes} min
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Savings Goal Card */}
      {hasGoal && (
        <div className="bg-white border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-500" /> {balance.savings_goal_name}
            </h3>
            <button
              onClick={() => setShowContribute(!showContribute)}
              className="text-sm bg-amber-100 text-amber-700 px-3 py-1 rounded-lg hover:bg-amber-200 font-medium flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Contribute
            </button>
          </div>
          <div className="flex justify-between text-sm text-gray-500 mb-1">
            <span>{coinEmoji} {balance.savings_goal_current} saved</span>
            <span>{coinEmoji} {balance.savings_goal_target} goal</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-amber-400 to-yellow-400 h-3 rounded-full transition-all"
              style={{ width: `${goalPct}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {goalPct >= 100 ? (
              <span className="text-green-600 font-medium flex items-center gap-1"><Trophy className="w-3.5 h-3.5" /> Goal reached!</span>
            ) : weeksToGoal ? (
              <span>~{weeksToGoal} week{weeksToGoal !== 1 ? 's' : ''} to go at current pace</span>
            ) : (
              <span>{Math.round(goalPct)}% complete</span>
            )}
          </div>

          {showContribute && (
            <div className="mt-3 pt-3 border-t flex gap-2">
              <input
                type="number"
                value={contributeAmount}
                onChange={e => setContributeAmount(e.target.value)}
                placeholder="Amount"
                className="flex-1 border rounded-lg px-3 py-2 text-sm"
              />
              <button onClick={handleContribute} className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-amber-600 font-medium">
                Add {coinEmoji}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Kid-filtered Reward Catalog */}
      <div className="bg-white border rounded-xl p-5">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Gift className="w-5 h-5 text-purple-500" /> Rewards Available
        </h3>
        {catalog.length === 0 ? (
          <p className="text-gray-400 text-sm">No rewards available yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {catalog.map(r => {
              const canAfford = balance.coin_balance >= r.cost
              return (
                <div key={r.id} className={`border rounded-lg p-3 flex items-center gap-3 ${canAfford ? '' : 'opacity-50'}`}>
                  <span className="text-2xl">{r.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{r.name}</div>
                    <div className="text-xs text-amber-600">{coinEmoji} {r.cost}</div>
                  </div>
                  <button
                    onClick={() => handleRedeem(r)}
                    disabled={!canAfford || redeemingId === r.id}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium ${
                      canAfford
                        ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {redeemingId === r.id ? '...' : 'Redeem'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Transaction History */}
      <div className="bg-white border rounded-xl p-5">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-500" /> Transaction History
        </h3>
        {transactions.length === 0 ? (
          <p className="text-gray-400 text-sm">No transactions yet.</p>
        ) : (
          <>
            <div className="divide-y max-h-80 overflow-y-auto">
              {visibleTx.map(tx => (
                <div key={tx.id} className="py-2.5 flex items-center gap-3">
                  <div className={`text-sm font-bold w-16 text-right ${TYPE_COLORS[tx.type] || 'text-gray-500'}`}>
                    {TYPE_ICONS[tx.type]}{coinEmoji} {Math.abs(tx.amount)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-700 truncate">{tx.description}</div>
                    <div className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
            {transactions.length > 10 && (
              <button
                onClick={() => setShowAllTx(!showAllTx)}
                className="mt-2 text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
              >
                {showAllTx ? <><ChevronUp className="w-4 h-4" /> Show less</> : <><ChevronDown className="w-4 h-4" /> Show all {transactions.length}</>}
              </button>
            )}
          </>
        )}
      </div>

      {/* Screen Time Ledger */}
      {hasScreenTime && (
        <div className="bg-white border rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Monitor className="w-5 h-5 text-blue-500" /> Screen Time Ledger
          </h3>
          <div className="mb-3 text-lg font-bold text-blue-600">
            {balance.screen_time_minutes} min available
          </div>
          {screenTimeLedger.length === 0 ? (
            <p className="text-gray-400 text-sm">No screen time entries yet.</p>
          ) : (
            <div className="divide-y max-h-60 overflow-y-auto">
              {screenTimeLedger.map(e => (
                <div key={e.id} className="py-2 flex items-center gap-3">
                  <div className={`text-sm font-bold w-16 text-right ${e.type === 'earn' ? 'text-green-600' : 'text-red-500'}`}>
                    {e.type === 'earn' ? '+' : '-'}{e.minutes} min
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-700 truncate">{e.description}</div>
                    <div className="text-xs text-gray-400">{new Date(e.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
