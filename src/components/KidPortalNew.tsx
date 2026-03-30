'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Star, Check, Camera, Timer, Flame, ChevronRight,
  Loader2, Home, Sparkles, BookOpen, Target, History,
  ArrowLeft
} from 'lucide-react'

// ── Config ──────────────────────────────────────────────────────────────────

const COLOR_THEMES: Record<string, { bg: string; accent: string; light: string; ring: string; text: string; gradient: string }> = {
  amos:   { bg: 'bg-blue-500',   accent: 'bg-blue-600',   light: 'bg-blue-50',   ring: 'ring-blue-400',   text: 'text-blue-700',   gradient: 'from-blue-500 to-blue-600' },
  zoey:   { bg: 'bg-pink-500',   accent: 'bg-pink-600',   light: 'bg-pink-50',   ring: 'ring-pink-400',   text: 'text-pink-700',   gradient: 'from-pink-500 to-pink-600' },
  kaylee: { bg: 'bg-rose-500',   accent: 'bg-rose-600',   light: 'bg-rose-50',   ring: 'ring-rose-400',   text: 'text-rose-700',   gradient: 'from-rose-500 to-rose-600' },
  ellie:  { bg: 'bg-purple-500', accent: 'bg-purple-600', light: 'bg-purple-50', ring: 'ring-purple-400', text: 'text-purple-700', gradient: 'from-purple-500 to-purple-600' },
  wyatt:  { bg: 'bg-orange-500', accent: 'bg-orange-600', light: 'bg-orange-50', ring: 'ring-orange-400', text: 'text-orange-700', gradient: 'from-orange-500 to-orange-600' },
  hannah: { bg: 'bg-green-500',  accent: 'bg-green-600',  light: 'bg-green-50',  ring: 'ring-green-400',  text: 'text-green-700',  gradient: 'from-green-500 to-green-600' },
}

const MASCOTS: Record<string, string> = {
  amos: '\u{1F989}', zoey: '\u{1FA77}', kaylee: '\u{1F338}',
  ellie: '\u{1F431}', wyatt: '\u{1F415}', hannah: '\u{1F430}',
}

const HOMESCHOOL_KIDS = ['amos', 'ellie', 'wyatt', 'hannah']

// ── Types ───────────────────────────────────────────────────────────────────

interface Habit {
  id: string
  title: string
  emoji: string
  category: string
  coin_reward: number
  completion_status: string | null
  completed_at: string | null
  current_streak: number | null
}

interface SavingsGoal {
  id: string
  kid_name: string
  goal_name: string
  target_coins: number
  current_coins: number
  is_primary: boolean
  is_achieved: boolean
}

interface CoinTransaction {
  id: string
  kid_name: string
  amount: number
  reason: string
  created_at: string
}

interface RewardItem {
  id: string
  name: string
  description: string
  coin_cost: number
  category: string
  emoji: string
}

interface HomeData {
  kid_name: string
  habits: Habit[]
  zone: string
  coin_balance: number
  primary_goal: SavingsGoal | null
  focus_sessions: number
  focus_mins: number
  is_homeschool: boolean
  subjects: { id: string; name: string; emoji: string }[]
  screen_time_mins: number
}

// ── Component ───────────────────────────────────────────────────────────────

export default function KidPortalNew({ kidName }: { kidName: string }) {
  const key = kidName.toLowerCase()
  const theme = COLOR_THEMES[key] || COLOR_THEMES.amos
  const mascot = MASCOTS[key] || '\u{2B50}'
  const isHomeschool = HOMESCHOOL_KIDS.includes(key)

  const [data, setData] = useState<HomeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [zoneTasks, setZoneTasks] = useState<any[]>([])
  const [coinHistory, setCoinHistory] = useState<CoinTransaction[]>([])
  const [rewards, setRewards] = useState<RewardItem[]>([])
  const [markingHabit, setMarkingHabit] = useState<string | null>(null)
  const [showRewards, setShowRewards] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [homeRes, zoneRes, coinsRes, rewardsRes] = await Promise.all([
        fetch(`/api/kid-portal?action=get_kid_home&kid_name=${kidName}`).then(r => r.json()),
        fetch(`/api/kid-portal?action=get_kid_zone_today&kid_name=${kidName}`).then(r => r.json()),
        fetch(`/api/kid-portal?action=get_kid_coins&kid_name=${kidName}`).then(r => r.json()),
        fetch(`/api/kid-portal?action=get_kid_rewards_catalog&kid_name=${kidName}`).then(r => r.json()),
      ])
      setData(homeRes)
      setZoneTasks(zoneRes.tasks || [])
      setCoinHistory(coinsRes.recent_transactions || [])
      setRewards(rewardsRes.rewards || [])
    } catch (e) {
      console.error('KidPortalNew fetch error:', e)
    }
    setLoading(false)
  }, [kidName])

  useEffect(() => { fetchData() }, [fetchData])

  const markHabitDone = async (habitId: string) => {
    setMarkingHabit(habitId)
    try {
      await fetch('/api/kid-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'kid_mark_habit_done', kid_name: kidName, habit_id: habitId })
      })
      await fetchData()
    } catch { /* empty */ }
    setMarkingHabit(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Could not load portal data.</p>
      </div>
    )
  }

  const habits = data.habits || []
  const completedCount = habits.filter(h => h.completion_status === 'done').length
  const totalHabits = habits.length
  const goal = data.primary_goal
  const goalPct = goal ? Math.min(100, Math.round(((goal.current_coins || 0) / (goal.target_coins || 1)) * 100)) : 0

  return (
    <div className={`min-h-screen ${theme.light} pb-8`}>
      {/* ── Header ── */}
      <div className={`bg-gradient-to-r ${theme.gradient} text-white p-6 pb-8 rounded-b-3xl shadow-lg`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{mascot}</span>
            <div>
              <h1 className="text-2xl font-bold capitalize">{kidName}&apos;s Portal</h1>
              <p className="text-white/80 text-sm">
                {completedCount}/{totalHabits} habits done today
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
            <Star className="w-5 h-5 text-yellow-300 fill-yellow-300" />
            <span className="text-lg font-bold">{data.coin_balance}</span>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* ── Habits ── */}
        <section className="bg-white rounded-xl border shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className={`w-5 h-5 ${theme.text}`} />
            <h2 className="font-bold text-gray-900">Today&apos;s Habits</h2>
            <span className="ml-auto text-xs text-gray-400">{completedCount}/{totalHabits}</span>
          </div>
          {habits.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-3">No habits set up yet.</p>
          ) : (
            <div className="space-y-2">
              {habits.map(h => {
                const isDone = h.completion_status === 'done'
                return (
                  <div key={h.id} className={`flex items-center gap-3 p-3 rounded-lg transition-all ${isDone ? 'bg-green-50' : 'bg-gray-50'}`}>
                    <span className="text-xl">{h.emoji || '\u{2705}'}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isDone ? 'text-green-700 line-through' : 'text-gray-800'}`}>{h.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {h.current_streak && h.current_streak > 0 ? (
                          <span className="text-xs text-orange-500 flex items-center gap-0.5">
                            <Flame className="w-3 h-3" /> {h.current_streak} streak
                          </span>
                        ) : null}
                        {h.coin_reward > 0 && (
                          <span className="text-xs text-amber-500">+{h.coin_reward} coins</span>
                        )}
                      </div>
                    </div>
                    {isDone ? (
                      <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                    ) : (
                      <button
                        onClick={() => markHabitDone(h.id)}
                        disabled={markingHabit === h.id}
                        className={`${theme.bg} text-white text-xs font-bold px-4 py-2 rounded-full hover:opacity-90 active:scale-95 transition-all disabled:opacity-50`}
                      >
                        {markingHabit === h.id ? '...' : 'Done!'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Zone ── */}
        <section className="bg-white rounded-xl border shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Home className={`w-5 h-5 ${theme.text}`} />
            <h2 className="font-bold text-gray-900">Zone: {data.zone}</h2>
          </div>
          {zoneTasks.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-3">No zone tasks assigned today.</p>
          ) : (
            <div className="space-y-2">
              {zoneTasks.map((t: any) => (
                <div key={t.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                    {t.task_type === 'daily' ? 'D' : 'W'}
                  </div>
                  <span className="text-sm text-gray-700 flex-1">{t.task_text}</span>
                  {t.duration_mins && (
                    <span className="text-xs text-gray-400">{t.duration_mins}m</span>
                  )}
                </div>
              ))}
            </div>
          )}
          <button className={`mt-3 w-full ${theme.bg} text-white text-sm font-medium py-2.5 rounded-lg hover:opacity-90 flex items-center justify-center gap-2 opacity-60 cursor-not-allowed`} disabled>
            <Camera className="w-4 h-4" /> Submit Photo (Coming Soon)
          </button>
        </section>

        {/* ── School (homeschool only) ── */}
        {isHomeschool && (
          <section className="bg-white rounded-xl border shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className={`w-5 h-5 ${theme.text}`} />
              <h2 className="font-bold text-gray-900">School</h2>
            </div>
            <div className="flex items-center gap-4 mb-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{data.focus_sessions}</p>
                <p className="text-xs text-gray-500">Focus Sessions</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{data.focus_mins}</p>
                <p className="text-xs text-gray-500">Minutes Today</p>
              </div>
            </div>
            {data.subjects && data.subjects.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {data.subjects.map(s => (
                  <span key={s.id} className={`text-xs ${theme.light} ${theme.text} px-2.5 py-1 rounded-full font-medium`}>
                    {s.emoji} {s.name}
                  </span>
                ))}
              </div>
            )}
            <button className={`w-full ${theme.bg} text-white text-sm font-medium py-2.5 rounded-lg hover:opacity-90 flex items-center justify-center gap-2`}>
              <Timer className="w-4 h-4" /> Start Timer
            </button>
          </section>
        )}

        {/* ── Savings Goal ── */}
        <section className="bg-white rounded-xl border shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className={`w-5 h-5 ${theme.text}`} />
            <h2 className="font-bold text-gray-900">Savings Goal</h2>
          </div>
          {goal ? (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">{goal.goal_name}</span>
                <span className="text-xs text-gray-500">{goal.current_coins || 0}/{goal.target_coins} coins</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${theme.bg}`}
                  style={{ width: `${goalPct}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">{goalPct}% complete</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-2">No savings goal set yet.</p>
          )}

          {/* Spend Coins / Reward Catalog */}
          <button
            onClick={() => setShowRewards(!showRewards)}
            className="mt-3 text-sm font-medium flex items-center gap-1 text-gray-600 hover:text-gray-800"
          >
            <Star className="w-4 h-4 text-amber-500" />
            Spend Coins
            <ChevronRight className={`w-4 h-4 transition-transform ${showRewards ? 'rotate-90' : ''}`} />
          </button>

          {showRewards && (
            <div className="mt-3 space-y-2">
              {rewards.length === 0 ? (
                <p className="text-xs text-gray-400">No rewards available yet.</p>
              ) : (
                rewards.map(r => (
                  <div key={r.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                    <span className="text-xl">{r.emoji || '\u{1F381}'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{r.name}</p>
                      {r.description && <p className="text-xs text-gray-500 truncate">{r.description}</p>}
                    </div>
                    <span className="text-sm font-bold text-amber-600 flex items-center gap-0.5">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      {r.coin_cost}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        {/* ── Coin History ── */}
        <section className="bg-white rounded-xl border shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <History className={`w-5 h-5 ${theme.text}`} />
            <h2 className="font-bold text-gray-900">Recent Coins</h2>
          </div>
          {coinHistory.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-3">No coin history yet.</p>
          ) : (
            <div className="space-y-2">
              {coinHistory.slice(0, 5).map(tx => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm text-gray-700">{tx.reason}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`text-sm font-bold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {tx.amount >= 0 ? '+' : ''}{tx.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
