'use client'

import { useState } from 'react'
import { Heart, Activity, Users } from 'lucide-react'
import HealthTab from './HealthTab'
import HealthHubTab from './HealthHubTab'
import QuickHealthLog from './QuickHealthLog'

type SubTab = 'kids' | 'parents' | 'hub'

export default function HealthMergedTab() {
  const [subTab, setSubTab] = useState<SubTab>('kids')

  const tabs: { id: SubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'kids', label: 'Kids Health', icon: Heart },
    { id: 'parents', label: 'Parents Health', icon: Users },
    { id: 'hub', label: 'Health Hub', icon: Activity },
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
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {subTab === 'kids' && <HealthTab memberGroup="kids" />}
      {subTab === 'parents' && <HealthTab memberGroup="parents" />}
      {subTab === 'hub' && (
        <>
          <HealthHubTab />
          <QuickHealthLog />
        </>
      )}
    </div>
  )
}
