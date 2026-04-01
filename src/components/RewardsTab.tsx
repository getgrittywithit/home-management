'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Star, Camera, Gift, Plus, CheckCircle, XCircle, RotateCcw, Clock,
  Trophy, Zap, Settings, Sparkles, Coins, Monitor, DollarSign,
  ChevronRight, Package, Edit2, Trash2, Save, X, User, AlertCircle
} from 'lucide-react'
import KidRewardProfile from './KidRewardProfile'

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

interface PhotoSubmission {
  id: number
  kid_name: string
  task_description: string
  photo_url: string | null
  coins_if_approved: number
  submitted_at: string
}

interface RewardRedemption {
  id: number
  kid_name: string
  reward_name: string
  reward_emoji: string
  coins_cost: number
  requested_at: string
}

interface CatalogReward {
  id: number
  name: string
  emoji: string
  cost: number
  type: 'screen_time' | 'family_reward' | 'privilege'
  active: boolean
}

interface BonusTask {
  id: number
  title: string
  description: string
  coin_reward: number
  due_date: string | null
  claimed_by: string | null
  assigned_to: string[] | null
  created_at: string
}

interface RewardSettings {
  zone_task_base: number
  photo_bonus: number
  weekly_task: number
  focus_session_base: number
  screen_time_coins: number
  screen_time_minutes: number
  dollar_coins: number
  dollar_amount: number
  coin_name: string
  coin_emoji: string
  per_kid_overrides: Record<string, {
    auto_approve: boolean
    photo_required: boolean
    reward_mode: string
  }>
}

// ─── Constants ───────────────────────────────────────────────────────
const KIDS = ['amos', 'ellie', 'wyatt', 'hannah', 'zoey', 'kaylee']
const KID_DISPLAY: Record<string, string> = {
  amos: 'Amos', ellie: 'Ellie', wyatt: 'Wyatt', hannah: 'Hannah', zoey: 'Zoey', kaylee: 'Kaylee'
}
const KID_COLORS: Record<string, string> = {
  amos: 'bg-blue-500', ellie: 'bg-purple-500', wyatt: 'bg-green-500',
  hannah: 'bg-pink-500', zoey: 'bg-amber-500', kaylee: 'bg-teal-500'
}
const KID_COLORS_LIGHT: Record<string, string> = {
  amos: 'bg-blue-100 text-blue-700', ellie: 'bg-purple-100 text-purple-700',
  wyatt: 'bg-green-100 text-green-700', hannah: 'bg-pink-100 text-pink-700',
  zoey: 'bg-amber-100 text-amber-700', kaylee: 'bg-teal-100 text-teal-700'
}

const SUB_TABS = [
  { id: 'overview', label: 'Overview', icon: Star },
  { id: 'approvals', label: 'Approval Queue', icon: CheckCircle },
  { id: 'catalog', label: 'Catalog', icon: Gift },
  { id: 'bonus', label: 'Bonus Tasks', icon: Zap },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const

type SubTab = typeof SUB_TABS[number]['id']
type TypeBadge = 'screen_time' | 'family_reward' | 'privilege'

const TYPE_BADGES: Record<TypeBadge, { label: string; cls: string }> = {
  screen_time: { label: 'Screen Time', cls: 'bg-blue-100 text-blue-700' },
  family_reward: { label: 'Family Reward', cls: 'bg-purple-100 text-purple-700' },
  privilege: { label: 'Privilege', cls: 'bg-green-100 text-green-700' },
}

// ─── Component ───────────────────────────────────────────────────────
export default function RewardsTab() {
  const [subTab, setSubTab] = useState<SubTab>('overview')
  const [balances, setBalances] = useState<KidBalance[]>([])
  const [photos, setPhotos] = useState<PhotoSubmission[]>([])
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([])
  const [catalog, setCatalog] = useState<CatalogReward[]>([])
  const [bonusTasks, setBonusTasks] = useState<BonusTask[]>([])
  const [settings, setSettings] = useState<RewardSettings | null>(null)
  const [loaded, setLoaded] = useState(false)

  // Modal / form states
  const [selectedKid, setSelectedKid] = useState<string | null>(null)
  const [showAwardModal, setShowAwardModal] = useState(false)
  const [awardKid, setAwardKid] = useState(KIDS[0])
  const [awardAmount, setAwardAmount] = useState('')
  const [awardReason, setAwardReason] = useState('')
  const [showRewardForm, setShowRewardForm] = useState(false)
  const [editReward, setEditReward] = useState<CatalogReward | null>(null)
  const [rewardForm, setRewardForm] = useState({ name: '', emoji: '🎁', cost: '', type: 'family_reward' as TypeBadge })
  const [showBonusForm, setShowBonusForm] = useState(false)
  const [bonusForm, setBonusForm] = useState({ title: '', description: '', coin_reward: '', due_date: '', assignment: 'all' as 'all' | 'specific', assigned_kids: [] as string[] })
  const [settingsDraft, setSettingsDraft] = useState<RewardSettings | null>(null)

  // ─── Data fetching ─────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [balRes, photoRes, redeemRes, catRes, bonusRes, setRes] = await Promise.all([
        fetch('/api/rewards?action=balances').then(r => r.json()).catch(() => ({ balances: [] })),
        fetch('/api/rewards?action=photo_submissions').then(r => r.json()).catch(() => ({ submissions: [] })),
        fetch('/api/rewards?action=redemptions').then(r => r.json()).catch(() => ({ redemptions: [] })),
        fetch('/api/rewards?action=catalog').then(r => r.json()).catch(() => ({ rewards: [] })),
        fetch('/api/rewards?action=bonus_tasks').then(r => r.json()).catch(() => ({ tasks: [] })),
        fetch('/api/rewards?action=settings').then(r => r.json()).catch(() => ({ settings: null })),
      ])
      setBalances(balRes.balances || defaultBalances())
      setPhotos(photoRes.submissions || [])
      setRedemptions(redeemRes.redemptions || [])
      setCatalog(catRes.rewards || defaultCatalog())
      setBonusTasks(bonusRes.tasks || [])
      const s = setRes.settings || defaultSettings()
      setSettings(s)
      setSettingsDraft(s)
    } catch {
      setBalances(defaultBalances())
      setCatalog(defaultCatalog())
      setSettings(defaultSettings())
      setSettingsDraft(defaultSettings())
    }
    setLoaded(true)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // ─── Defaults (when API not yet wired) ─────────────────────────────
  function defaultBalances(): KidBalance[] {
    return KIDS.map(k => ({
      kid_name: k, coin_balance: 0, screen_time_minutes: 0,
      savings_goal_name: null, savings_goal_target: 0, savings_goal_current: 0,
      streak_days: 0, earned_this_week: 0, spent_this_week: 0, reward_mode: 'coins',
    }))
  }

  function defaultCatalog(): CatalogReward[] {
    return [
      { id: 1, name: '30 min Screen Time', emoji: '📺', cost: 20, type: 'screen_time', active: true },
      { id: 2, name: 'Movie Night Pick', emoji: '🎬', cost: 50, type: 'family_reward', active: true },
      { id: 3, name: 'Stay Up 30 min Late', emoji: '🌙', cost: 30, type: 'privilege', active: true },
      { id: 4, name: 'Choose Dinner', emoji: '🍕', cost: 40, type: 'family_reward', active: true },
      { id: 5, name: 'Skip One Chore', emoji: '🙌', cost: 60, type: 'privilege', active: true },
      { id: 6, name: '$5 Spending Money', emoji: '💵', cost: 100, type: 'family_reward', active: true },
    ]
  }

  function defaultSettings(): RewardSettings {
    return {
      zone_task_base: 5, photo_bonus: 2, weekly_task: 3, focus_session_base: 4,
      screen_time_coins: 20, screen_time_minutes: 30,
      dollar_coins: 100, dollar_amount: 5,
      coin_name: 'Coins', coin_emoji: '⭐',
      per_kid_overrides: Object.fromEntries(KIDS.map(k => [k, { auto_approve: false, photo_required: true, reward_mode: 'coins' }])),
    }
  }

  // ─── Actions ───────────────────────────────────────────────────────
  async function handleApprovePhoto(id: number) {
    await fetch('/api/rewards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'approve_photo', id }) }).catch(() => {})
    setPhotos(prev => prev.filter(p => p.id !== id))
    loadData()
  }

  async function handleRedoPhoto(id: number) {
    await fetch('/api/rewards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'redo_photo', id }) }).catch(() => {})
    setPhotos(prev => prev.filter(p => p.id !== id))
  }

  async function handleApproveRedemption(id: number) {
    await fetch('/api/rewards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'approve_redemption', id }) }).catch(() => {})
    setRedemptions(prev => prev.filter(r => r.id !== id))
    loadData()
  }

  async function handleDenyRedemption(id: number) {
    await fetch('/api/rewards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'deny_redemption', id }) }).catch(() => {})
    setRedemptions(prev => prev.filter(r => r.id !== id))
  }

  async function handleAwardCoins() {
    if (!awardAmount || !awardReason) return
    await fetch('/api/rewards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'award_coins', kid_name: awardKid, amount: parseInt(awardAmount), reason: awardReason }) }).catch(() => {})
    setShowAwardModal(false)
    setAwardAmount('')
    setAwardReason('')
    loadData()
  }

  async function handleSaveReward() {
    const payload = editReward
      ? { action: 'update_reward', id: editReward.id, ...rewardForm, cost: parseInt(rewardForm.cost) }
      : { action: 'create_reward', ...rewardForm, cost: parseInt(rewardForm.cost) }
    await fetch('/api/rewards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => {})
    setShowRewardForm(false)
    setEditReward(null)
    setRewardForm({ name: '', emoji: '🎁', cost: '', type: 'family_reward' })
    loadData()
  }

  async function handleToggleReward(id: number, active: boolean) {
    await fetch('/api/rewards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'toggle_reward', id, active }) }).catch(() => {})
    setCatalog(prev => prev.map(r => r.id === id ? { ...r, active } : r))
  }

  async function handleSaveBonusTask() {
    if (!bonusForm.title || !bonusForm.coin_reward) return
    const assigned_to = bonusForm.assignment === 'specific' && bonusForm.assigned_kids.length > 0
      ? bonusForm.assigned_kids
      : null
    await fetch('/api/rewards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_bonus_task',
        task_name: bonusForm.title,
        description: bonusForm.description,
        coin_reward: parseInt(bonusForm.coin_reward),
        expires_at: bonusForm.due_date || null,
        assigned_to,
      }),
    }).catch(() => {})
    setShowBonusForm(false)
    setBonusForm({ title: '', description: '', coin_reward: '', due_date: '', assignment: 'all', assigned_kids: [] })
    loadData()
  }

  async function handleSaveSettings() {
    if (!settingsDraft) return
    await fetch('/api/rewards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save_settings', settings: settingsDraft }) }).catch(() => {})
    setSettings(settingsDraft)
  }

  // ─── Derived ───────────────────────────────────────────────────────
  const coinEmoji = settings?.coin_emoji || '⭐'
  const coinName = settings?.coin_name || 'Coins'
  const topEarner = [...balances].sort((a, b) => b.earned_this_week - a.earned_this_week)[0]
  const pendingPhotos = photos.length
  const pendingRedemptions = redemptions.length

  // ─── Kid profile view ──────────────────────────────────────────────
  if (selectedKid) {
    const bal = balances.find(b => b.kid_name === selectedKid) || defaultBalances()[0]
    return (
      <div>
        <button onClick={() => setSelectedKid(null)} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-4">
          &larr; Back to Rewards Overview
        </button>
        <KidRewardProfile
          kidName={selectedKid}
          balance={bal}
          catalog={catalog.filter(c => c.active)}
          coinEmoji={coinEmoji}
          coinName={coinName}
          onBack={() => setSelectedKid(null)}
        />
      </div>
    )
  }

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white p-6 rounded-lg">
        <div className="flex items-center gap-3">
          <Star className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">Chore Rewards & Allowance</h1>
            <p className="text-amber-100">Track {coinEmoji} {coinName}, approve tasks, and manage the reward catalog</p>
          </div>
        </div>
      </div>

      {/* Sub-tab nav */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {SUB_TABS.map(t => {
          const Icon = t.icon
          const isActive = subTab === t.id
          const badge = t.id === 'approvals' ? pendingPhotos + pendingRedemptions : 0
          return (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                isActive ? 'bg-amber-500 text-white shadow' : 'bg-white text-gray-700 hover:bg-amber-50 border'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
              {badge > 0 && (
                <span className="bg-red-500 text-white text-xs min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Sub-tab content */}
      {!loaded ? (
        <div className="text-center py-12 text-gray-400">Loading rewards data...</div>
      ) : (
        <>
          {subTab === 'overview' && renderOverview()}
          {subTab === 'approvals' && renderApprovals()}
          {subTab === 'catalog' && renderCatalog()}
          {subTab === 'bonus' && renderBonusTasks()}
          {subTab === 'settings' && renderSettings()}
        </>
      )}

      {/* Award Coins Modal */}
      {showAwardModal && (
        <Modal title={`Award ${coinEmoji} ${coinName}`} onClose={() => setShowAwardModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kid</label>
              <select value={awardKid} onChange={e => setAwardKid(e.target.value)} className="w-full border rounded-lg px-3 py-2">
                {KIDS.map(k => <option key={k} value={k}>{KID_DISPLAY[k]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input type="number" value={awardAmount} onChange={e => setAwardAmount(e.target.value)} placeholder="10" className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <input type="text" value={awardReason} onChange={e => setAwardReason(e.target.value)} placeholder="Great attitude today!" className="w-full border rounded-lg px-3 py-2" />
            </div>
            <button onClick={handleAwardCoins} className="w-full bg-amber-500 text-white py-2 rounded-lg hover:bg-amber-600 font-medium">
              Award {coinEmoji} {awardAmount || '0'} {coinName}
            </button>
          </div>
        </Modal>
      )}

      {/* Reward Form Modal */}
      {showRewardForm && (
        <Modal title={editReward ? 'Edit Reward' : 'Add Reward'} onClose={() => { setShowRewardForm(false); setEditReward(null) }}>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-20">
                <label className="block text-sm font-medium text-gray-700 mb-1">Emoji</label>
                <input type="text" value={rewardForm.emoji} onChange={e => setRewardForm(p => ({ ...p, emoji: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-center text-xl" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" value={rewardForm.name} onChange={e => setRewardForm(p => ({ ...p, name: e.target.value }))} placeholder="Movie Night Pick" className="w-full border rounded-lg px-3 py-2" />
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Cost ({coinEmoji})</label>
                <input type="number" value={rewardForm.cost} onChange={e => setRewardForm(p => ({ ...p, cost: e.target.value }))} placeholder="50" className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={rewardForm.type} onChange={e => setRewardForm(p => ({ ...p, type: e.target.value as TypeBadge }))} className="w-full border rounded-lg px-3 py-2">
                  <option value="screen_time">Screen Time</option>
                  <option value="family_reward">Family Reward</option>
                  <option value="privilege">Privilege</option>
                </select>
              </div>
            </div>
            <button onClick={handleSaveReward} className="w-full bg-amber-500 text-white py-2 rounded-lg hover:bg-amber-600 font-medium">
              {editReward ? 'Save Changes' : 'Add to Catalog'}
            </button>
          </div>
        </Modal>
      )}

      {/* Bonus Task Form Modal */}
      {showBonusForm && (
        <Modal title="Create Bonus Task" onClose={() => setShowBonusForm(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input type="text" value={bonusForm.title} onChange={e => setBonusForm(p => ({ ...p, title: e.target.value }))} placeholder="Deep clean the garage" className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={bonusForm.description} onChange={e => setBonusForm(p => ({ ...p, description: e.target.value }))} placeholder="Sweep, organize shelves, take out recycling..." className="w-full border rounded-lg px-3 py-2 h-20" />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">{coinEmoji} Reward</label>
                <input type="number" value={bonusForm.coin_reward} onChange={e => setBonusForm(p => ({ ...p, coin_reward: e.target.value }))} placeholder="25" className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input type="date" value={bonusForm.due_date} onChange={e => setBonusForm(p => ({ ...p, due_date: e.target.value }))} className="w-full border rounded-lg px-3 py-2" />
              </div>
            </div>
            {/* Kid assignment picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Who can see this?</label>
              <div className="space-y-2 bg-gray-50 rounded-lg p-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={bonusForm.assignment === 'all'}
                    onChange={() => setBonusForm(p => ({ ...p, assignment: 'all', assigned_kids: [] }))}
                    className="text-amber-500"
                  />
                  <span className="text-sm">All Kids</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={bonusForm.assignment === 'specific'}
                    onChange={() => setBonusForm(p => ({ ...p, assignment: 'specific' }))}
                    className="text-amber-500"
                  />
                  <span className="text-sm">Specific Kids:</span>
                </label>
                {bonusForm.assignment === 'specific' && (
                  <div className="flex flex-wrap gap-2 ml-6">
                    {['Amos','Zoey','Kaylee','Ellie','Wyatt','Hannah'].map(kid => {
                      const kidLower = kid.toLowerCase()
                      const checked = bonusForm.assigned_kids.includes(kidLower)
                      return (
                        <label key={kid} className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => setBonusForm(p => ({
                              ...p,
                              assigned_kids: checked
                                ? p.assigned_kids.filter(k => k !== kidLower)
                                : [...p.assigned_kids, kidLower],
                            }))}
                            className="rounded text-amber-500"
                          />
                          <span className="text-sm">{kid}</span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleSaveBonusTask}
              disabled={bonusForm.assignment === 'specific' && bonusForm.assigned_kids.length === 0}
              className="w-full bg-amber-500 text-white py-2 rounded-lg hover:bg-amber-600 font-medium disabled:opacity-50"
            >
              Create Bonus Task
            </button>
          </div>
        </Modal>
      )}
    </div>
  )

  // ═══════════════════════════════════════════════════════════════════
  // SUB-TAB RENDERERS
  // ═══════════════════════════════════════════════════════════════════

  function renderOverview() {
    return (
      <div className="space-y-6">
        {/* Kid balance tiles — 2x3 grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {balances.map(b => {
            const k = b.kid_name
            const isTop = topEarner?.kid_name === k && topEarner.earned_this_week > 0
            return (
              <button
                key={k}
                onClick={() => setSelectedKid(k)}
                className={`relative bg-white border rounded-xl p-4 text-left hover:shadow-md transition-shadow ${isTop ? 'ring-2 ring-amber-400' : ''}`}
              >
                {isTop && (
                  <div className="absolute -top-2 -right-2 bg-amber-400 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Trophy className="w-3 h-3" /> Top Earner
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg ${KID_COLORS[k] || 'bg-gray-400'}`}>
                    {(KID_DISPLAY[k] || k)[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900">{KID_DISPLAY[k] || k}</div>
                    <div className="text-xl font-bold text-amber-600">{coinEmoji} {b.coin_balance}</div>
                    {b.screen_time_minutes > 0 && (
                      <div className="text-xs text-blue-600 flex items-center gap-1">
                        <Monitor className="w-3 h-3" /> {b.screen_time_minutes} min screen time
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300" />
                </div>
                {/* Savings goal progress */}
                {b.savings_goal_name && b.savings_goal_target > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{b.savings_goal_name}</span>
                      <span>{b.savings_goal_current}/{b.savings_goal_target}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-amber-400 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (b.savings_goal_current / b.savings_goal_target) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
                {b.streak_days > 0 && (
                  <div className="mt-2 text-xs text-orange-500 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> {b.streak_days}-day streak
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Pending counts */}
        <div className="bg-white border rounded-xl p-4 flex flex-wrap items-center gap-4">
          <span className="text-gray-600 font-medium">Pending:</span>
          <span className="flex items-center gap-1.5 text-sm">
            <Camera className="w-4 h-4 text-blue-500" /> {pendingPhotos} photo{pendingPhotos !== 1 ? 's' : ''}
          </span>
          <span className="text-gray-300">|</span>
          <span className="flex items-center gap-1.5 text-sm">
            <Gift className="w-4 h-4 text-purple-500" /> {pendingRedemptions} redemption{pendingRedemptions !== 1 ? 's' : ''} waiting
          </span>
          {(pendingPhotos + pendingRedemptions > 0) && (
            <button onClick={() => setSubTab('approvals')} className="ml-auto text-sm text-amber-600 hover:text-amber-700 font-medium">
              Review &rarr;
            </button>
          )}
        </div>

        {/* Quick actions */}
        <div className="flex gap-3">
          <button
            onClick={() => setShowAwardModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium"
          >
            <Plus className="w-4 h-4" /> Award {coinEmoji} {coinName}
          </button>
          <button
            onClick={() => { setShowBonusForm(true); setSubTab('overview') }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 font-medium"
          >
            <Zap className="w-4 h-4" /> Bonus Task
          </button>
        </div>
      </div>
    )
  }

  function renderApprovals() {
    const hasNone = photos.length === 0 && redemptions.length === 0
    return (
      <div className="space-y-6">
        {hasNone && (
          <div className="bg-white border rounded-xl p-12 text-center">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-700 text-lg">All caught up!</h3>
            <p className="text-gray-500 mt-1">No pending approvals.</p>
          </div>
        )}

        {/* Photo Submissions */}
        {photos.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-500" /> Photo Submissions ({photos.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {photos.map(p => (
                <div key={p.id} className="bg-white border rounded-xl p-4 flex gap-4">
                  {/* Photo thumbnail or placeholder */}
                  <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {p.photo_url ? (
                      <img src={p.photo_url} alt="Submission" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <Camera className="w-8 h-8 text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-medium px-2 py-0.5 rounded-full inline-block mb-1 ${KID_COLORS_LIGHT[p.kid_name] || 'bg-gray-100 text-gray-700'}`}>
                      {KID_DISPLAY[p.kid_name] || p.kid_name}
                    </div>
                    <div className="text-sm text-gray-800 font-medium truncate">{p.task_description}</div>
                    <div className="text-xs text-amber-600 mt-0.5">{coinEmoji} {p.coins_if_approved} if approved</div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => handleApprovePhoto(p.id)} className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-200 font-medium">
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button onClick={() => handleRedoPhoto(p.id)} className="flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-3 py-1.5 rounded-lg hover:bg-orange-200 font-medium">
                        <RotateCcw className="w-3.5 h-3.5" /> Needs Redo
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reward Redemptions */}
        {redemptions.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Gift className="w-5 h-5 text-purple-500" /> Reward Redemptions ({redemptions.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {redemptions.map(r => (
                <div key={r.id} className="bg-white border rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{r.reward_emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-medium px-2 py-0.5 rounded-full inline-block mb-1 ${KID_COLORS_LIGHT[r.kid_name] || 'bg-gray-100 text-gray-700'}`}>
                        {KID_DISPLAY[r.kid_name] || r.kid_name}
                      </div>
                      <div className="text-sm font-medium text-gray-800">{r.reward_name}</div>
                      <div className="text-xs text-amber-600">{coinEmoji} {r.coins_cost}</div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => handleApproveRedemption(r.id)} className="flex-1 flex items-center justify-center gap-1 text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-200 font-medium">
                      <CheckCircle className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button onClick={() => handleDenyRedemption(r.id)} className="flex-1 flex items-center justify-center gap-1 text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-200 font-medium">
                      <XCircle className="w-3.5 h-3.5" /> Deny
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  function renderCatalog() {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Reward Catalog</h3>
          <button
            onClick={() => { setEditReward(null); setRewardForm({ name: '', emoji: '🎁', cost: '', type: 'family_reward' }); setShowRewardForm(true) }}
            className="flex items-center gap-2 px-3 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Add Reward
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {catalog.map(r => (
            <div key={r.id} className={`bg-white border rounded-xl p-4 ${!r.active ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{r.emoji}</span>
                  <div>
                    <div className="font-medium text-gray-800">{r.name}</div>
                    <div className="text-amber-600 font-semibold">{coinEmoji} {r.cost}</div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => { setEditReward(r); setRewardForm({ name: r.name, emoji: r.emoji, cost: String(r.cost), type: r.type }); setShowRewardForm(true) }}
                    className="p-1.5 rounded hover:bg-gray-100"
                  >
                    <Edit2 className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() => handleToggleReward(r.id, !r.active)}
                    className="p-1.5 rounded hover:bg-gray-100"
                    title={r.active ? 'Deactivate' : 'Activate'}
                  >
                    {r.active ? <XCircle className="w-4 h-4 text-gray-400" /> : <CheckCircle className="w-4 h-4 text-green-400" />}
                  </button>
                </div>
              </div>
              <div className="mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_BADGES[r.type]?.cls || 'bg-gray-100 text-gray-600'}`}>
                  {TYPE_BADGES[r.type]?.label || r.type}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  function renderBonusTasks() {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Bonus Tasks</h3>
          <button
            onClick={() => { setBonusForm({ title: '', description: '', coin_reward: '', due_date: '', assignment: 'all', assigned_kids: [] }); setShowBonusForm(true) }}
            className="flex items-center gap-2 px-3 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Create Task
          </button>
        </div>

        {bonusTasks.length === 0 ? (
          <div className="bg-white border rounded-xl p-12 text-center">
            <Zap className="w-12 h-12 text-amber-300 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-700">No bonus tasks yet</h3>
            <p className="text-gray-500 mt-1">Create bonus tasks for kids to claim for extra {coinEmoji} {coinName}.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bonusTasks.map(t => (
              <div key={t.id} className="bg-white border rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">{t.title}</div>
                    {t.description && <div className="text-sm text-gray-500 mt-0.5">{t.description}</div>}
                    <div className="flex items-center gap-4 mt-2 text-xs">
                      <span className="text-amber-600 font-semibold">{coinEmoji} {t.coin_reward}</span>
                      {t.due_date && (
                        <span className="text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Due {new Date(t.due_date).toLocaleDateString()}
                        </span>
                      )}
                      <span className="text-gray-400">
                        {t.assigned_to ? t.assigned_to.map((k: string) => k.charAt(0).toUpperCase() + k.slice(1)).join(', ') : 'All Kids'}
                      </span>
                    </div>
                  </div>
                  <div>
                    {t.claimed_by ? (
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${KID_COLORS_LIGHT[t.claimed_by] || 'bg-gray-100 text-gray-700'}`}>
                        {KID_DISPLAY[t.claimed_by] || t.claimed_by}
                      </span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">Open</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  function renderSettings() {
    if (!settingsDraft) return null
    return (
      <div className="space-y-6">
        {/* Coin Rates */}
        <div className="bg-white border rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-500" /> Coin Earning Rates
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {([
              ['zone_task_base', 'Zone Task Base'],
              ['photo_bonus', 'Photo Bonus'],
              ['weekly_task', 'Weekly Task'],
              ['focus_session_base', 'Focus Session'],
            ] as const).map(([key, label]) => (
              <div key={key}>
                <label className="block text-sm text-gray-600 mb-1">{label}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={settingsDraft[key]}
                    onChange={e => setSettingsDraft(p => p ? { ...p, [key]: parseInt(e.target.value) || 0 } : p)}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                  <span className="text-amber-500 text-sm whitespace-nowrap">{coinEmoji}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Conversions */}
        <div className="bg-white border rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Monitor className="w-5 h-5 text-blue-500" /> Conversion Rates
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-gray-600 mb-2">Screen Time</label>
              <div className="flex items-center gap-2 text-sm">
                <input type="number" value={settingsDraft.screen_time_coins} onChange={e => setSettingsDraft(p => p ? { ...p, screen_time_coins: parseInt(e.target.value) || 0 } : p)} className="w-20 border rounded-lg px-3 py-2" />
                <span className="text-gray-500">{coinEmoji} =</span>
                <input type="number" value={settingsDraft.screen_time_minutes} onChange={e => setSettingsDraft(p => p ? { ...p, screen_time_minutes: parseInt(e.target.value) || 0 } : p)} className="w-20 border rounded-lg px-3 py-2" />
                <span className="text-gray-500">min</span>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">Dollar Value</label>
              <div className="flex items-center gap-2 text-sm">
                <input type="number" value={settingsDraft.dollar_coins} onChange={e => setSettingsDraft(p => p ? { ...p, dollar_coins: parseInt(e.target.value) || 0 } : p)} className="w-20 border rounded-lg px-3 py-2" />
                <span className="text-gray-500">{coinEmoji} =</span>
                <span className="text-gray-500">$</span>
                <input type="number" value={settingsDraft.dollar_amount} onChange={e => setSettingsDraft(p => p ? { ...p, dollar_amount: parseFloat(e.target.value) || 0 } : p)} className="w-20 border rounded-lg px-3 py-2" />
              </div>
            </div>
          </div>
        </div>

        {/* Coin Customization */}
        <div className="bg-white border rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" /> Coin Customization
          </h3>
          <div className="flex gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Emoji</label>
              <input type="text" value={settingsDraft.coin_emoji} onChange={e => setSettingsDraft(p => p ? { ...p, coin_emoji: e.target.value } : p)} className="w-20 border rounded-lg px-3 py-2 text-center text-xl" />
            </div>
            <div className="flex-1">
              <label className="block text-sm text-gray-600 mb-1">Name</label>
              <input type="text" value={settingsDraft.coin_name} onChange={e => setSettingsDraft(p => p ? { ...p, coin_name: e.target.value } : p)} placeholder="Coins" className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>
        </div>

        {/* Per-kid overrides */}
        <div className="bg-white border rounded-xl p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-teal-500" /> Per-Kid Overrides
          </h3>
          <div className="space-y-3">
            {KIDS.map(k => {
              const ov = settingsDraft.per_kid_overrides[k] || { auto_approve: false, photo_required: true, reward_mode: 'coins' }
              const update = (patch: Partial<typeof ov>) => {
                setSettingsDraft(p => {
                  if (!p) return p
                  return { ...p, per_kid_overrides: { ...p.per_kid_overrides, [k]: { ...ov, ...patch } } }
                })
              }
              return (
                <div key={k} className="flex items-center gap-4 py-2 border-b last:border-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${KID_COLORS[k]}`}>
                    {(KID_DISPLAY[k])[0]}
                  </div>
                  <span className="font-medium text-gray-700 w-20">{KID_DISPLAY[k]}</span>
                  <label className="flex items-center gap-1.5 text-xs text-gray-600">
                    <input type="checkbox" checked={ov.auto_approve} onChange={e => update({ auto_approve: e.target.checked })} className="rounded" />
                    Auto-approve
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-gray-600">
                    <input type="checkbox" checked={ov.photo_required} onChange={e => update({ photo_required: e.target.checked })} className="rounded" />
                    Photo required
                  </label>
                  <select value={ov.reward_mode} onChange={e => update({ reward_mode: e.target.value })} className="text-xs border rounded px-2 py-1">
                    <option value="coins">Coins only</option>
                    <option value="coins_screen_time">Coins + Screen Time</option>
                    <option value="coins_dollars">Coins + Dollars</option>
                    <option value="all">All modes</option>
                  </select>
                </div>
              )
            })}
          </div>
        </div>

        <button onClick={handleSaveSettings} className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium">
          <Save className="w-4 h-4" /> Save Settings
        </button>
      </div>
    )
  }
}

// ─── Reusable modal ──────────────────────────────────────────────────
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg text-gray-800">{title}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
