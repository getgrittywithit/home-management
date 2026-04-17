'use client'

import { useState } from 'react'
import { BarChart2, Gift, Sparkles, Flame } from 'lucide-react'
import PointsEarningTab from './PointsEarningTab'
import ParentRewardsManager from './ParentRewardsManager'
import RewardsTab from './RewardsTab'
import DigiPetParentPanel from './DigiPetParentPanel'
import HabitsTab from './HabitsTab'
import GiftSuggestions from './gifts/GiftSuggestions'

type SubTab = 'overview' | 'catalog' | 'digi-pet' | 'habits' | 'gifts'

export default function StarsAndRewardsTab({ initialSubTab }: { initialSubTab?: SubTab }) {
  const [subTab, setSubTab] = useState<SubTab>(initialSubTab || 'overview')

  const tabs: { id: SubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'catalog', label: 'Rewards', icon: Gift },
    { id: 'digi-pet', label: 'Digi-Pet', icon: Sparkles },
    { id: 'habits', label: 'Habits', icon: Flame },
    { id: 'gifts', label: 'Gift Ideas', icon: Gift },
  ]

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

      {subTab === 'overview' && <PointsEarningTab />}
      {subTab === 'catalog' && (
        <div className="space-y-6">
          <ParentRewardsManager />
          <div className="border-t pt-6">
            <h3 className="text-lg font-bold text-gray-700 mb-4">Legacy Rewards System</h3>
            <RewardsTab />
          </div>
        </div>
      )}
      {subTab === 'digi-pet' && <DigiPetParentPanel />}
      {subTab === 'habits' && <HabitsTab />}
      {subTab === 'gifts' && <GiftSuggestions />}
    </div>
  )
}
