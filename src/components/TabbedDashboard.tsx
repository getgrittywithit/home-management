'use client'

import { useState } from 'react'
import Dashboard from './Dashboard'
import ChoresTab from './ChoresTab'
import { Home, ClipboardList, Users, Calendar, Settings } from 'lucide-react'
import { DashboardData } from '@/types'

interface Tab {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
}

const tabs: Tab[] = [
  { id: 'overview', name: 'Overview', icon: Home },
  { id: 'chores', name: 'Chores & Zones', icon: ClipboardList },
  { id: 'family', name: 'Family', icon: Users },
  { id: 'calendar', name: 'Calendar', icon: Calendar },
  { id: 'settings', name: 'Settings', icon: Settings },
]

interface TabbedDashboardProps {
  initialData?: DashboardData
}

export default function TabbedDashboard({ initialData }: TabbedDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview')

  // Mock family data - in production this would come from the database
  const familyMembers = [
    { name: 'Levi', age: 38, role: 'parent' as const },
    { name: 'Lola', age: 36, role: 'parent' as const },
    { name: 'Child1', age: 14, role: 'child' as const },
    { name: 'Child2', age: 12, role: 'child' as const },
    { name: 'Child3', age: 10, role: 'child' as const },
    { name: 'Child4', age: 8, role: 'child' as const },
    { name: 'Child5', age: 6, role: 'child' as const },
    { name: 'Child6', age: 4, role: 'child' as const },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                    ${activeTab === tab.id
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {tab.name}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className={activeTab === 'overview' ? '' : 'p-4'}>
        <div className={activeTab === 'overview' ? '' : 'max-w-7xl mx-auto'}>
          {activeTab === 'overview' && <Dashboard initialData={initialData} />}
          {activeTab === 'chores' && <ChoresTab familyMembers={familyMembers} />}
          {activeTab === 'family' && (
            <div className="bg-white p-6 rounded-lg">
              <h2 className="text-2xl font-bold mb-4">Family Members</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {familyMembers.map(member => (
                  <div key={member.name} className="border rounded-lg p-4">
                    <h3 className="font-semibold">{member.name}</h3>
                    <p className="text-sm text-gray-600">Age: {member.age}</p>
                    <p className="text-sm text-gray-600">Role: {member.role}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {activeTab === 'calendar' && (
            <div className="bg-white p-6 rounded-lg">
              <h2 className="text-2xl font-bold mb-4">Family Calendar</h2>
              <p className="text-gray-600">Calendar integration coming soon...</p>
            </div>
          )}
          {activeTab === 'settings' && (
            <div className="bg-white p-6 rounded-lg">
              <h2 className="text-2xl font-bold mb-4">Settings</h2>
              <p className="text-gray-600">Settings and configuration options coming soon...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}