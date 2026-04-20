'use client'

import { useState, useEffect } from 'react'
import { ChefHat, Upload, ShoppingCart, ShoppingBag, Check, X, Shuffle } from 'lucide-react'
import FoodInventoryManager from './FoodInventoryManager'
import RecipeImportTab from './RecipeImportTab'
import ShoppingHelper from './shopping/ShoppingHelper'
import HouseholdNeedsTab from './HouseholdNeedsTab'

type SubTab = 'meals' | 'recipes' | 'shopping' | 'needs'

const tabs: { id: SubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'meals', label: 'Meals', icon: ChefHat },
  { id: 'recipes', label: 'Recipes', icon: Upload },
  { id: 'shopping', label: 'Shopping', icon: ShoppingCart },
  { id: 'needs', label: 'Needs', icon: ShoppingBag },
]

const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : ''

function PendingMealRequests() {
  const [requests, setRequests] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/meal-plan', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_pending_requests' }),
    }).then(r => r.json()).then(d => { setRequests(d.requests || []); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [])

  const handleAction = async (id: string, action: 'approve' | 'deny') => {
    await fetch('/api/meal-plan', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: `${action}_request`, id }),
    }).catch(() => {})
    setRequests(prev => prev.filter(r => r.id !== id))
  }

  if (!loaded || requests.length === 0) return null

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-amber-900 mb-3">
        🍽️ {requests.length} Pending Meal Request{requests.length > 1 ? 's' : ''}
      </h3>
      <div className="space-y-2">
        {requests.map((r: any) => (
          <div key={r.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-amber-100">
            <div>
              <p className="text-sm font-medium text-gray-900">{r.meal_description || r.meal_name}</p>
              <p className="text-xs text-gray-500">
                {cap(r.kid_name)} · {r.request_date ? new Date(r.request_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : ''}
              </p>
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => handleAction(r.id, 'approve')}
                className="p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200" title="Approve">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => handleAction(r.id, 'deny')}
                className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200" title="Deny">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function KitchenMergedTab({ initialSubTab }: { initialSubTab?: SubTab }) {
  const [subTab, setSubTab] = useState<SubTab>(initialSubTab || 'meals')

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {tabs.map(tab => {
          const Icon = tab.icon
          const active = subTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {subTab === 'meals' && (
        <>
          <PendingMealRequests />
          <FoodInventoryManager />
        </>
      )}
      {subTab === 'recipes' && <RecipeImportTab />}
      {subTab === 'shopping' && <ShoppingHelper />}
      {subTab === 'needs' && <HouseholdNeedsTab />}
    </div>
  )
}
