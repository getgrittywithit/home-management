'use client'

import { useState } from 'react'
import { GraduationCap, Shield } from 'lucide-react'
import SchoolTabWithSchedules from './SchoolTabWithSchedules'
import AdvocacyDashboard from './parent/AdvocacyDashboard'

type SubTab = 'school' | 'advocacy'

const tabs: { id: SubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'school', label: 'School', icon: GraduationCap },
  { id: 'advocacy', label: 'Advocacy', icon: Shield },
]

export default function SchoolAdvocacyMergedTab({ initialSubTab }: { initialSubTab?: SubTab }) {
  const [subTab, setSubTab] = useState<SubTab>(initialSubTab || 'school')

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

      {subTab === 'school' && <SchoolTabWithSchedules />}
      {subTab === 'advocacy' && <AdvocacyDashboard />}
    </div>
  )
}
