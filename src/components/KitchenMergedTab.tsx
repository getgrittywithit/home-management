'use client'

import { useState } from 'react'
import { ChefHat, Upload, ShoppingCart, ShoppingBag } from 'lucide-react'
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

      {subTab === 'meals' && <FoodInventoryManager />}
      {subTab === 'recipes' && <RecipeImportTab />}
      {subTab === 'shopping' && <ShoppingHelper />}
      {subTab === 'needs' && <HouseholdNeedsTab />}
    </div>
  )
}
