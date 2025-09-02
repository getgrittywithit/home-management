'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Dashboard from './Dashboard'
import ChoresTab from './ChoresTab'
import SchoolTabWithSchedules from './SchoolTabWithSchedules'
import FilterableCalendar from './FilterableCalendar'
import TodoTab from './TodoTab'
import ContactsTab from './ContactsTab'
import AboutMeAdminTab from './AboutMeAdminTab'
import BulkDocumentProcessor from './BulkDocumentProcessor'
import FoodInventoryManager from './FoodInventoryManager'
import AIAgentWidget from './AIAgentWidget'
import FamilyConfigAdmin from './FamilyConfigAdmin'
import ScheduleDisplay from './ScheduleDisplay'
import KidsChecklistOverview from './KidsChecklistOverview'
import PrintTab from './PrintTab'
import MoeMoneyTab from './MoeMoneyTab'
import { getAllFamilyData } from '@/lib/familyConfig'
import { 
  Home, ClipboardList, Users, Calendar, Settings, BookOpen,
  User, Bell, Zap, CheckSquare, Phone, Upload, ChefHat, Printer, DollarSign
} from 'lucide-react'
import { DashboardData } from '@/types'

interface Tab {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

const tabs: Tab[] = [
  { id: 'overview', name: 'Overview', icon: Home, color: 'bg-blue-500' },
  { id: 'chores', name: 'Chores & Zones', icon: ClipboardList, color: 'bg-green-500' },
  { id: 'kids-checklist', name: 'Kids Daily Tasks', icon: CheckSquare, color: 'bg-emerald-600' },
  { id: 'family', name: 'Family', icon: Users, color: 'bg-purple-500' },
  { id: 'school', name: 'School', icon: BookOpen, color: 'bg-orange-500' },
  { id: 'calendar', name: 'Calendar', icon: Calendar, color: 'bg-pink-500' },
  { id: 'contacts', name: 'Contacts', icon: Phone, color: 'bg-teal-500' },
  { id: 'todos', name: 'Todos', icon: CheckSquare, color: 'bg-indigo-500' },
  { id: 'moe-money', name: 'Moe-Money', icon: DollarSign, color: 'bg-green-600' },
  { id: 'print', name: 'Print Center', icon: Printer, color: 'bg-slate-600' },
  { id: 'bulk-docs', name: 'Bulk Documents', icon: Upload, color: 'bg-amber-500' },
  { id: 'food-inventory', name: 'Food & Meals', icon: ChefHat, color: 'bg-emerald-500' },
  { id: 'aboutme', name: 'About Me Admin', icon: User, color: 'bg-rose-500' },
  { id: 'settings', name: 'Settings', icon: Settings, color: 'bg-gray-500' },
]

interface ParentPortalWithNavProps {
  initialData?: DashboardData
}

// Get all family data from centralized config
const familyData = getAllFamilyData()
const familyChildren = familyData.children.filter(Boolean) // Remove any null values
const familyMembers = familyData.allMembers.filter(Boolean) // Remove any null values

export default function ParentPortalWithNav({ initialData }: ParentPortalWithNavProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const router = useRouter()

  const renderFamilyTab = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold">Family Management</h1>
        <p className="text-purple-100">Manage your family members and their information</p>
      </div>

      {/* Family Members */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-6 h-6 text-purple-500" />
          <h2 className="text-xl font-bold">Family Members</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {familyMembers.map(member => (
            <div key={member.name} className="border rounded-lg p-4 hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  member.role === 'parent' ? 'bg-blue-100' : 'bg-purple-100'
                }`}>
                  <User className={`w-6 h-6 ${
                    member.role === 'parent' ? 'text-blue-600' : 'text-purple-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {member.role === 'child' ? (member as any).fullName || member.name : member.name}
                  </h3>
                  <p className="text-sm text-gray-600">Age: {member.age}</p>
                  <p className="text-sm text-gray-500 capitalize">{member.role}</p>
                  {member.role === 'child' && (
                    <>
                      <p className="text-xs text-gray-500">{(member as any).grade}</p>
                      <p className="text-xs text-gray-400">{(member as any).school?.name}</p>
                    </>
                  )}
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                {member.role === 'child' ? (
                  <button 
                    onClick={() => router.push(`/kids/${member.name.toLowerCase()}`)}
                    className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full hover:bg-green-200"
                  >
                    Kid Portal
                  </button>
                ) : (
                  <button className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-200">
                    Profile
                  </button>
                )}
                <button className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full hover:bg-gray-200">
                  Edit
                </button>
              </div>
              {member.role === 'child' && (member as any).birthDate && (
                <div className="mt-2 text-xs text-gray-400">
                  Born: {(member as any).birthDate.toLocaleDateString()}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-bold mb-4">Family Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 border rounded-lg hover:bg-gray-50 text-center">
            <Zap className="w-6 h-6 mx-auto mb-2 text-green-500" />
            <div className="text-sm font-medium">Post Greenlight</div>
          </button>
          <button className="p-4 border rounded-lg hover:bg-gray-50 text-center">
            <Bell className="w-6 h-6 mx-auto mb-2 text-blue-500" />
            <div className="text-sm font-medium">Send Alert</div>
          </button>
          <button className="p-4 border rounded-lg hover:bg-gray-50 text-center">
            <Calendar className="w-6 h-6 mx-auto mb-2 text-purple-500" />
            <div className="text-sm font-medium">Add Event</div>
          </button>
          <button className="p-4 border rounded-lg hover:bg-gray-50 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-pink-500" />
            <div className="text-sm font-medium">Family Meeting</div>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-bold mb-4">Recent Family Activity</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <Zap className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Hannah completed all morning tasks</p>
              <p className="text-xs text-gray-500">2 hours ago</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Calendar className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Wyatt's soccer practice added to calendar</p>
              <p className="text-xs text-gray-500">4 hours ago</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <Users className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Ellie updated her About Me profile</p>
              <p className="text-xs text-gray-500">1 day ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderCalendarTab = () => (
    <FilterableCalendar selectedChild="amos-moses-504640" />
  )

  const renderSettingsTab = () => <FamilyConfigAdmin />

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'overview':
        return <Dashboard initialData={initialData} />
      case 'chores':
        return <ChoresTab familyMembers={familyMembers} />
      case 'kids-checklist':
        return <KidsChecklistOverview />
      case 'family':
        return renderFamilyTab()
      case 'school':
        return <SchoolTabWithSchedules children={familyChildren.map(child => ({
          ...child,
          school: child.school.name
        }))} />
      case 'calendar':
        return renderCalendarTab()
      case 'contacts':
        return <ContactsTab />
      case 'todos':
        return <TodoTab />
      case 'moe-money':
        return <MoeMoneyTab />
      case 'print':
        return <PrintTab />
      case 'bulk-docs':
        return <BulkDocumentProcessor />
      case 'food-inventory':
        return <FoodInventoryManager />
      case 'aboutme':
        return <AboutMeAdminTab />
      case 'settings':
        return renderSettingsTab()
      default:
        return <Dashboard initialData={initialData} />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Navigation */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Home className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="font-bold text-lg">Family Ops</div>
              <div className="text-sm text-gray-600">Parent Dashboard</div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 p-4 space-y-2">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors
                  ${isActive 
                    ? `${tab.color} text-white shadow-md` 
                    : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{tab.name}</span>
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 text-center">
            Family Ops v2.0
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <div className={activeTab === 'overview' ? '' : 'p-6'}>
          <div className={activeTab === 'overview' ? '' : 'max-w-6xl mx-auto'}>
            {renderActiveTab()}
          </div>
        </div>
      </div>

      {/* AI Agent Widget */}
      <AIAgentWidget />
    </div>
  )
}