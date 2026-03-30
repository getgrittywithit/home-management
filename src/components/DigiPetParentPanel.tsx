'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, RefreshCw, Gift, RotateCcw, ToggleLeft, ToggleRight } from 'lucide-react'

export default function DigiPetParentPanel() {
  const [kids, setKids] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedKid, setSelectedKid] = useState<string | null>(null)
  const [kidDetail, setKidDetail] = useState<any>(null)
  const [starHistory, setStarHistory] = useState<any[]>([])
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([])
  const [awardAmount, setAwardAmount] = useState('')
  const [awardNote, setAwardNote] = useState('')
  const [awarding, setAwarding] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetConfirm, setResetConfirm] = useState(false)

  const loadOverview = useCallback(async () => {
    try {
      const res = await fetch('/api/digi-pet?action=parent_overview')
      const data = await res.json()
      setKids(data.kids || [])
    } catch (e) {
      console.error('Failed to load overview', e)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadKidDetail = useCallback(async (kidName: string) => {
    try {
      const [petRes, starRes, purchaseRes] = await Promise.all([
        fetch(`/api/digi-pet?action=get_pet&kid_name=${kidName}`),
        fetch(`/api/digi-pet?action=star_history&kid_name=${kidName}&limit=20`),
        fetch(`/api/digi-pet?action=purchase_history&kid_name=${kidName}&limit=20`),
      ])
      const petData = await petRes.json()
      const starData = await starRes.json()
      const purchaseData = await purchaseRes.json()
      setKidDetail(petData)
      setStarHistory(starData.history || [])
      setPurchaseHistory(purchaseData.history || [])
    } catch (e) {
      console.error('Failed to load kid detail', e)
    }
  }, [])

  useEffect(() => { loadOverview() }, [loadOverview])

  const handleSelectKid = (kidName: string) => {
    setSelectedKid(kidName)
    loadKidDetail(kidName)
    setResetConfirm(false)
    setAwardAmount('')
    setAwardNote('')
  }

  const handleAward = async () => {
    if (!selectedKid || !awardAmount || awarding) return
    const amount = parseInt(awardAmount)
    if (isNaN(amount) || amount <= 0) return
    setAwarding(true)
    try {
      await fetch('/api/digi-pet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'award_stars',
          kid_name: selectedKid,
          amount,
          source: 'parent_bonus',
          note: awardNote || 'Parent bonus',
        }),
      })
      setAwardAmount('')
      setAwardNote('')
      await Promise.all([loadOverview(), loadKidDetail(selectedKid)])
    } finally { setAwarding(false) }
  }

  const handleReset = async () => {
    if (!selectedKid || resetting) return
    setResetting(true)
    try {
      await fetch('/api/digi-pet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_pet', kid_name: selectedKid }),
      })
      setResetConfirm(false)
      await Promise.all([loadOverview(), loadKidDetail(selectedKid)])
    } finally { setResetting(false) }
  }

  const handleToggle = async (kidName: string, enabled: boolean) => {
    await fetch('/api/digi-pet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_enabled', kid_name: kidName, enabled }),
    })
    loadOverview()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin text-4xl">🌟</div>
      </div>
    )
  }

  // Detail View
  if (selectedKid && kidDetail) {
    const pet = kidDetail.pet
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
    return (
      <div className="space-y-6">
        <button
          onClick={() => { setSelectedKid(null); setKidDetail(null) }}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to overview
        </button>

        <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-6 rounded-lg">
          <div className="flex items-center gap-4">
            <span className="text-5xl">{kidDetail.pet_emoji}</span>
            <div>
              <h2 className="text-2xl font-bold">{capitalize(selectedKid)}&apos;s Pet: {pet?.pet_name}</h2>
              <p className="text-pink-100">{kidDetail.state_name} {kidDetail.state_emoji}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg border p-3 text-center">
            <div className="text-2xl font-bold text-pink-500">{pet?.happiness}</div>
            <div className="text-xs text-gray-500">Happiness</div>
          </div>
          <div className="bg-white rounded-lg border p-3 text-center">
            <div className="text-2xl font-bold text-green-500">{pet?.health}</div>
            <div className="text-xs text-gray-500">Health</div>
          </div>
          <div className="bg-white rounded-lg border p-3 text-center">
            <div className="text-2xl font-bold text-yellow-500">{pet?.stars_balance}</div>
            <div className="text-xs text-gray-500">Stars</div>
          </div>
          <div className="bg-white rounded-lg border p-3 text-center">
            <div className="text-2xl font-bold text-orange-500">{pet?.streak_days}</div>
            <div className="text-xs text-gray-500">Streak Days</div>
          </div>
        </div>

        {/* Award Stars */}
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
            <Gift className="w-5 h-5 text-yellow-500" /> Award Stars
          </h3>
          <div className="flex gap-2">
            <input
              type="number"
              value={awardAmount}
              onChange={e => setAwardAmount(e.target.value)}
              placeholder="Amount"
              min="1"
              className="w-24 border rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={awardNote}
              onChange={e => setAwardNote(e.target.value)}
              placeholder="Note (optional)"
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
            />
            <button
              onClick={handleAward}
              disabled={!awardAmount || awarding}
              className="bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-yellow-600 disabled:opacity-50"
            >
              {awarding ? '...' : 'Award'}
            </button>
          </div>
        </div>

        {/* Recent Purchases */}
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-bold text-gray-800 mb-3">Recent Purchases</h3>
          {purchaseHistory.length === 0 ? (
            <p className="text-sm text-gray-400">No purchases yet</p>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {purchaseHistory.map((p: any) => (
                <div key={p.id} className="flex justify-between text-sm">
                  <span className="text-gray-700">{p.item_id.replace(/_/g, ' ')}</span>
                  <span className="text-gray-400">-{p.cost} &#11088; &middot; {new Date(p.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Earnings */}
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-bold text-gray-800 mb-3">Recent Earnings</h3>
          {starHistory.length === 0 ? (
            <p className="text-sm text-gray-400">No earnings yet</p>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {starHistory.map((h: any) => (
                <div key={h.id} className="flex justify-between text-sm">
                  <span className={h.amount >= 0 ? 'text-green-600' : 'text-red-500'}>
                    {h.amount >= 0 ? '+' : ''}{h.amount} &#11088; {h.note || h.source}
                  </span>
                  <span className="text-gray-400">{new Date(h.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reset Pet */}
        <div className="bg-white rounded-lg border p-4">
          {resetConfirm ? (
            <div>
              <p className="text-sm text-red-600 font-medium mb-3">
                Reset {pet?.pet_name}? Happiness and health reset to 50, accessories removed. Stars are kept.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  disabled={resetting}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-600 disabled:opacity-50"
                >
                  {resetting ? 'Resetting...' : 'Confirm Reset'}
                </button>
                <button
                  onClick={() => setResetConfirm(false)}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setResetConfirm(true)}
              className="flex items-center gap-2 text-red-500 text-sm font-medium hover:text-red-700"
            >
              <RotateCcw className="w-4 h-4" /> Reset Pet
            </button>
          )}
        </div>
      </div>
    )
  }

  // Overview Table
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          &#11088; Digi-Pet &amp; Stars Economy
        </h1>
        <p className="text-pink-100">Manage all kids&apos; digital pets and star balances</p>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 font-semibold text-gray-600">Kid</th>
                <th className="px-4 py-3 font-semibold text-gray-600">Pet</th>
                <th className="px-4 py-3 font-semibold text-gray-600">State</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-center">Happy</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-center">Health</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-center">Stars</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-center">Streak</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-center">Enabled</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {kids.map(kid => (
                <tr
                  key={kid.kid_name}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleSelectKid(kid.kid_name)}
                >
                  <td className="px-4 py-3 font-medium capitalize">{kid.kid_name}</td>
                  <td className="px-4 py-3">
                    <span className="mr-1">{kid.pet_emoji}</span>
                    <span className="text-gray-600">{kid.pet_name}</span>
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-600">{kid.state_name}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center gap-1.5 justify-center">
                      <div className="w-16 bg-gray-100 rounded-full h-2">
                        <div className="h-full rounded-full bg-pink-400" style={{ width: `${kid.happiness}%` }} />
                      </div>
                      <span className="text-xs text-gray-500">{kid.happiness}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center gap-1.5 justify-center">
                      <div className="w-16 bg-gray-100 rounded-full h-2">
                        <div className="h-full rounded-full bg-green-400" style={{ width: `${kid.health}%` }} />
                      </div>
                      <span className="text-xs text-gray-500">{kid.health}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-yellow-600">&#11088; {kid.stars_balance}</td>
                  <td className="px-4 py-3 text-center">
                    {kid.streak_days > 0 ? (
                      <span className="text-orange-500 font-medium">&#128293; {kid.streak_days}d</span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleToggle(kid.kid_name, !kid.enabled)}
                      className={`p-1 rounded ${kid.enabled ? 'text-green-500' : 'text-gray-300'}`}
                    >
                      {kid.enabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
