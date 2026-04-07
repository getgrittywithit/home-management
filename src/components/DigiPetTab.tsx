'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, ShoppingBag, History, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'

const PET_CHOICES = [
  { type: 'dog', emoji: '🐶', name: 'Puppy', flavor: 'Loyal and playful!' },
  { type: 'cat', emoji: '🐱', name: 'Kitty', flavor: 'Independent and curious!' },
  { type: 'bunny', emoji: '🐰', name: 'Bunny', flavor: 'Soft and bouncy!' },
  { type: 'hamster', emoji: '🐹', name: 'Hamster', flavor: 'Tiny and energetic!' },
  { type: 'fox', emoji: '🦊', name: 'Fox', flavor: 'Clever and sneaky!' },
  { type: 'panda', emoji: '🐼', name: 'Panda', flavor: 'Chill and cuddly!' },
  { type: 'penguin', emoji: '🐧', name: 'Penguin', flavor: 'Cool and waddly!' },
  { type: 'dragon', emoji: '🐉', name: 'Dragon', flavor: 'Fierce and magical!' },
]

const HABITAT_COLORS: Record<string, string> = {
  garden_meadow: 'from-green-100 to-emerald-50',
  mountain_lodge: 'from-stone-100 to-amber-50',
  jungle_hideout: 'from-lime-100 to-green-50',
  space_station: 'from-indigo-100 to-purple-50',
  enchanted_castle: 'from-pink-100 to-violet-50',
}

interface DigiPetTabProps {
  childName: string
}

export default function DigiPetTab({ childName }: DigiPetTabProps) {
  const kidKey = childName.toLowerCase()
  const [pet, setPet] = useState<any>(null)
  const [accessories, setAccessories] = useState<any[]>([])
  const [stateName, setStateName] = useState('')
  const [stateEmoji, setStateEmoji] = useState('')
  const [petEmoji, setPetEmoji] = useState('🐶')
  const [loading, setLoading] = useState(true)
  const [shop, setShop] = useState<Record<string, any[]>>({})
  const [shopBalance, setShopBalance] = useState(0)
  const [shopTab, setShopTab] = useState<'food' | 'toy' | 'accessory' | 'habitat'>('food')
  const [buyConfirm, setBuyConfirm] = useState<any>(null)
  const [buying, setBuying] = useState(false)
  const [starHistory, setStarHistory] = useState<any[]>([])
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [setupPetType, setSetupPetType] = useState('')
  const [setupPetName, setSetupPetName] = useState('')
  const [creating, setCreating] = useState(false)
  const [animateStat, setAnimateStat] = useState<'happiness' | 'health' | null>(null)

  const loadPet = useCallback(async () => {
    try {
      const res = await fetch(`/api/digi-pet?action=get_pet&kid_name=${kidKey}`)
      const data = await res.json()
      setPet(data.pet)
      setAccessories(data.accessories || [])
      setStateName(data.state_name)
      setStateEmoji(data.state_emoji)
      setPetEmoji(data.pet_emoji || '🐶')
    } catch (e) {
      console.error('Failed to load pet', e)
    } finally {
      setLoading(false)
    }
  }, [kidKey])

  const loadShop = useCallback(async () => {
    try {
      const res = await fetch(`/api/digi-pet?action=get_shop&kid_name=${kidKey}`)
      const data = await res.json()
      setShop(data.shop || {})
      setShopBalance(data.balance || 0)
    } catch (e) {
      console.error('Failed to load shop', e)
    }
  }, [kidKey])

  const loadHistory = useCallback(async () => {
    try {
      const [starRes, purchaseRes] = await Promise.all([
        fetch(`/api/digi-pet?action=star_history&kid_name=${kidKey}&limit=15`),
        fetch(`/api/digi-pet?action=purchase_history&kid_name=${kidKey}&limit=15`),
      ])
      const starData = await starRes.json()
      const purchaseData = await purchaseRes.json()
      setStarHistory(starData.history || [])
      setPurchaseHistory(purchaseData.history || [])
    } catch (e) {
      console.error('Failed to load history', e)
    }
  }, [kidKey])

  useEffect(() => { loadPet(); loadShop() }, [loadPet, loadShop])

  const isSetupNeeded = pet && pet.pet_type === 'dog' && pet.pet_name === 'My Pet'

  const handleCreate = async () => {
    if (!setupPetType || !setupPetName.trim() || creating) return
    setCreating(true)
    try {
      await fetch('/api/digi-pet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'choose_pet', kid_name: kidKey, pet_type: setupPetType, pet_name: setupPetName.trim() }),
      })
      await loadPet()
    } finally { setCreating(false) }
  }

  const handleBuy = async (itemId: string) => {
    if (buying) return
    setBuying(true)
    try {
      const res = await fetch('/api/digi-pet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'buy_item', kid_name: kidKey, item_id: itemId }),
      })
      const data = await res.json()
      if (data.success) {
        // Animate the stat bars
        const item = Object.values(shop).flat().find((i: any) => i.id === itemId)
        if (item?.happiness > 0) setAnimateStat('happiness')
        else if (item?.health > 0) setAnimateStat('health')
        setTimeout(() => setAnimateStat(null), 1000)
        await Promise.all([loadPet(), loadShop()])
      }
    } finally {
      setBuying(false)
      setBuyConfirm(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin text-4xl">🌟</div>
      </div>
    )
  }

  // Setup screen
  if (isSetupNeeded) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-6 rounded-lg text-center">
          <Sparkles className="w-10 h-10 mx-auto mb-2" />
          <h1 className="text-2xl font-bold">Choose Your Pet!</h1>
          <p className="text-pink-100">Pick a companion to care for and grow with</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PET_CHOICES.map(p => (
            <button
              key={p.type}
              onClick={() => setSetupPetType(p.type)}
              className={`p-4 rounded-xl border-2 text-center transition-all ${
                setupPetType === p.type
                  ? 'border-purple-500 bg-purple-50 shadow-md scale-105'
                  : 'border-gray-200 bg-white hover:border-purple-300'
              }`}
            >
              <div className="text-4xl mb-1">{p.emoji}</div>
              <div className="font-semibold text-sm">{p.name}</div>
              <div className="text-xs text-gray-500">{p.flavor}</div>
            </button>
          ))}
        </div>

        <div className="bg-white rounded-lg border p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Name your pet!</label>
          <input
            type="text"
            value={setupPetName}
            onChange={e => setSetupPetName(e.target.value.slice(0, 20))}
            placeholder="Enter a name..."
            maxLength={20}
            className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
          />
          <div className="text-xs text-gray-400 mt-1">{setupPetName.length}/20 characters</div>
        </div>

        <button
          onClick={handleCreate}
          disabled={!setupPetType || !setupPetName.trim() || creating}
          className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-xl font-bold text-lg disabled:opacity-50 hover:shadow-lg transition-all"
        >
          {creating ? 'Creating...' : 'Create My Pet!'}
        </button>
      </div>
    )
  }

  const habitatBg = pet?.active_habitat ? (HABITAT_COLORS[pet.active_habitat] || 'from-blue-50 to-sky-50') : 'from-blue-50 to-sky-50'
  const habitatEmoji = pet?.active_habitat
    ? (() => {
        const items: Record<string, string> = { garden_meadow: '🌿', mountain_lodge: '⛰️', jungle_hideout: '🌴', space_station: '🚀', enchanted_castle: '🏰' }
        return items[pet.active_habitat] || ''
      })()
    : ''

  return (
    <div className="space-y-6">
      {/* Pet Display */}
      <div className={`bg-gradient-to-br ${habitatBg} rounded-xl p-6 text-center relative overflow-hidden`}>
        {habitatEmoji && (
          <div className="absolute top-2 right-3 text-3xl opacity-30">{habitatEmoji}</div>
        )}
        <div className="text-7xl mb-2 relative inline-block">
          {petEmoji}
          {/* Accessories around pet */}
          {accessories.length > 0 && (
            <div className="absolute -top-2 -right-2 flex gap-0.5">
              {accessories.map((a: any) => {
                const catalog: Record<string, string> = { tiny_hat: '🎩', cool_glasses: '🕶️', bow_bandana: '🎀', party_crown: '👑', rainbow_cape: '🌈' }
                return <span key={a.item_id} className="text-xl">{catalog[a.item_id] || ''}</span>
              })}
            </div>
          )}
        </div>
        <div className="text-lg font-bold text-gray-800">
          {pet?.pet_name} is {stateName}! {stateEmoji}
        </div>

        {/* Stat Bars */}
        <div className="mt-4 max-w-xs mx-auto space-y-2">
          <div>
            <div className="flex justify-between text-xs text-gray-600 mb-0.5">
              <span>Happiness</span>
              <span>{pet?.happiness}/100</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r from-pink-400 to-red-400 ${animateStat === 'happiness' ? 'animate-pulse' : ''}`}
                style={{ width: `${pet?.happiness || 0}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-gray-600 mb-0.5">
              <span>Health</span>
              <span>{pet?.health}/100</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r from-green-400 to-emerald-500 ${animateStat === 'health' ? 'animate-pulse' : ''}`}
                style={{ width: `${pet?.health || 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Stars & Streak */}
        <div className="mt-4 flex items-center justify-center gap-6">
          <div className="bg-white/80 rounded-full px-4 py-1.5 text-sm font-bold">
            <span className="text-yellow-500 mr-1">&#11088;</span> {pet?.stars_balance || 0}
          </div>
          {(pet?.streak_days || 0) > 0 && (
            <div className="bg-white/80 rounded-full px-4 py-1.5 text-sm font-bold text-orange-600">
              &#128293; {pet?.streak_days}-day streak!
            </div>
          )}
        </div>

        {/* Quick Buttons */}
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            onClick={() => { loadShop(); setShopTab('food') }}
            className="bg-white rounded-xl px-5 py-2 font-semibold text-sm shadow hover:shadow-md transition-all flex items-center gap-1"
          >
            &#127830; Feed
          </button>
          <button
            onClick={() => { loadShop(); setShopTab('toy') }}
            className="bg-white rounded-xl px-5 py-2 font-semibold text-sm shadow hover:shadow-md transition-all flex items-center gap-1"
          >
            &#129528; Play
          </button>
        </div>
      </div>

      {/* Pet Shop */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-4 border-b flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-purple-500" />
          <h2 className="font-bold text-lg">Pet Shop</h2>
          <span className="ml-auto text-sm font-semibold text-yellow-600">&#11088; {shopBalance}</span>
        </div>

        {/* Shop Tabs */}
        <div className="flex border-b">
          {(['food', 'toy', 'accessory', 'habitat'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => { setShopTab(tab); if (Object.keys(shop).length === 0) loadShop() }}
              className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors ${
                shopTab === tab ? 'border-b-2 border-purple-500 text-purple-700 bg-purple-50' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'food' ? '🍖 Food' : tab === 'toy' ? '🧸 Toys' : tab === 'accessory' ? '🎩 Accessories' : '🏡 Habitats'}
            </button>
          ))}
        </div>

        {/* Shop Items */}
        <div className="p-3 grid grid-cols-2 md:grid-cols-3 gap-3">
          {(shop[shopTab] || []).map((item: any) => (
            <div key={item.id} className="border rounded-lg p-3 text-center relative">
              <div className="text-3xl mb-1">{item.emoji}</div>
              <div className="font-medium text-sm">{item.name}</div>
              <div className="text-xs text-yellow-600 font-semibold mt-0.5">&#11088; {item.cost}</div>
              {item.happiness > 0 && <div className="text-xs text-pink-500">+{item.happiness} happiness</div>}
              {item.health > 0 && <div className="text-xs text-green-500">+{item.health} health</div>}
              {item.type === 'accessory' && item.owned ? (
                <div className="mt-2 text-xs text-green-600 font-semibold bg-green-50 rounded-full py-1">Owned</div>
              ) : (
                <button
                  onClick={() => setBuyConfirm(item)}
                  disabled={!item.affordable}
                  className={`mt-2 w-full py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    item.affordable
                      ? 'bg-purple-500 text-white hover:bg-purple-600'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {item.affordable ? 'Buy' : 'Not enough'}
                </button>
              )}
            </div>
          ))}
          {(shop[shopTab] || []).length === 0 && (
            <div className="col-span-full text-center text-gray-400 py-6">
              <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Loading shop items...</p>
              <button onClick={loadShop} className="mt-2 text-purple-500 text-sm underline">Load Shop</button>
            </div>
          )}
        </div>
      </div>

      {/* Buy Confirmation Modal */}
      {buyConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setBuyConfirm(null)}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <div className="text-5xl mb-3">{buyConfirm.emoji}</div>
              <h3 className="font-bold text-lg">Spend &#11088;{buyConfirm.cost} on {buyConfirm.name}?</h3>
              {buyConfirm.happiness > 0 && <p className="text-sm text-pink-500 mt-1">+{buyConfirm.happiness} happiness</p>}
              {buyConfirm.health > 0 && <p className="text-sm text-green-500 mt-1">+{buyConfirm.health} health</p>}
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => handleBuy(buyConfirm.id)}
                  disabled={buying}
                  className="flex-1 bg-purple-500 text-white py-2.5 rounded-lg font-semibold hover:bg-purple-600 disabled:opacity-50"
                >
                  {buying ? 'Buying...' : 'Yes!'}
                </button>
                <button
                  onClick={() => setBuyConfirm(null)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-semibold hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Section */}
      <div className="bg-white rounded-lg border shadow-sm">
        <button
          onClick={() => { setHistoryOpen(!historyOpen); if (!historyOpen) loadHistory() }}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-gray-500" />
            <span className="font-bold">History</span>
          </div>
          {historyOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>

        {historyOpen && (
          <div className="px-4 pb-4 space-y-4">
            {/* Recent Earnings */}
            <div>
              <h4 className="text-sm font-semibold text-gray-600 mb-2">Recent Earnings</h4>
              {starHistory.length === 0 ? (
                <p className="text-xs text-gray-400">No earnings yet</p>
              ) : (
                <div className="space-y-1.5">
                  {starHistory.filter((h: any) => h.amount > 0).map((h: any) => (
                    <div key={h.id} className="flex items-center justify-between text-sm">
                      <span className="text-green-600 font-medium">+{h.amount} &#11088; {h.note || h.source}</span>
                      <span className="text-xs text-gray-400">{new Date(h.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Purchases */}
            <div>
              <h4 className="text-sm font-semibold text-gray-600 mb-2">Recent Purchases</h4>
              {purchaseHistory.length === 0 ? (
                <p className="text-xs text-gray-400">No purchases yet</p>
              ) : (
                <div className="space-y-1.5">
                  {purchaseHistory.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <span className="text-red-500 font-medium">-{p.cost} &#11088; {p.item_id.replace(/_/g, ' ')}</span>
                      <span className="text-xs text-gray-400">{new Date(p.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
