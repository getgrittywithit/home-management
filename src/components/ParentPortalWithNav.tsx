'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Dashboard from './Dashboard'
import ChoresTab from './ChoresTab'
import SchoolTabWithSchedules from './SchoolTabWithSchedules'
import FilterableCalendar from './FilterableCalendar'
import CalendarTab from './CalendarTab'
import TodoTab from './TodoTab'
import ContactsTab from './ContactsTab'
import AboutMeAdminTab from './AboutMeAdminTab'
import BulkDocumentProcessor from './BulkDocumentProcessor'
import FoodInventoryManager from './FoodInventoryManager'
import AIAgentWidget from './AIAgentWidget'
import FlagCenterPanel from './FlagCenterPanel'
import FamilyConfigAdmin from './FamilyConfigAdmin'
import ScheduleDisplay from './ScheduleDisplay'
import KidsChecklistOverview from './KidsChecklistOverview'
import WeeklyChecklistTab from './WeeklyChecklistTab'
import PrintTab from './PrintTab'
import MoeMoneyTab from './MoeMoneyTab'
import HealthTab from './HealthTab'
import PointsEarningTab from './PointsEarningTab'
import MessagesTab from './MessagesTab'
import NeedsBoardTab from './NeedsBoardTab'
import MoodOverview from './MoodOverview'
import ParentPortfolioPanel from './ParentPortfolioPanel'
import AvailabilityWidget from './AvailabilityWidget'
import WeeklySummaryTab from './WeeklySummaryTab'
import TeacherDashboard from './TeacherDashboard'
import HouseholdConfigTab from './HouseholdConfigTab'
import PetsTab from './PetsTab'
import FamilyQuickActions from './FamilyQuickActions'
import FamilyActivityFeed from './FamilyActivityFeed'
import { getAllFamilyData } from '@/lib/familyConfig'
import {
  Home, ClipboardList, Users, Calendar, Settings, BookOpen,
  User, CheckSquare, Phone, Upload, ChefHat, Printer, DollarSign, CalendarCheck, Heart, Star, MessageCircle, ShoppingCart, Dog, BarChart2, GraduationCap, Bell
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
  { id: 'weekly-summary', name: 'Weekly Summary', icon: BarChart2, color: 'bg-violet-500' },
  { id: 'chores', name: 'Chores & Zones', icon: ClipboardList, color: 'bg-green-500' },
  { id: 'kids-checklist', name: 'Kids Daily Tasks', icon: CheckSquare, color: 'bg-emerald-600' },
  { id: 'points-earning', name: 'Points & Earning', icon: Star, color: 'bg-amber-500' },
  { id: 'messages', name: 'Messages', icon: MessageCircle, color: 'bg-pink-500' },
  { id: 'needs-board', name: 'Needs Board', icon: ShoppingCart, color: 'bg-teal-600' },
  { id: 'belle-care', name: 'Pets', icon: Dog, color: 'bg-amber-600' },
  { id: 'portfolio', name: 'Portfolio', icon: BookOpen, color: 'bg-indigo-500' },
  { id: 'weekly-checklist', name: 'Weekly Planning', icon: CalendarCheck, color: 'bg-cyan-500' },
  { id: 'teacher', name: 'Teacher', icon: GraduationCap, color: 'bg-emerald-600' },
  { id: 'household-config', name: 'Zone Tasks', icon: ClipboardList, color: 'bg-teal-600' },
  { id: 'school', name: 'School', icon: BookOpen, color: 'bg-orange-500' },
  { id: 'calendar', name: 'Calendar', icon: Calendar, color: 'bg-pink-500' },
  { id: 'contacts', name: 'Contacts', icon: Phone, color: 'bg-teal-500' },
  { id: 'parents-health', name: 'Parents Health', icon: Heart, color: 'bg-red-500' },
  { id: 'kids-health', name: 'Kids Health', icon: Heart, color: 'bg-teal-500' },
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
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({})
  const [flagPanelOpen, setFlagPanelOpen] = useState(false)
  const [flagBadgeCount, setFlagBadgeCount] = useState(0)
  const router = useRouter()

  // Fetch unread badge counts on load
  useEffect(() => {
    Promise.all([
      fetch('/api/kids/messages?action=get_unread_count').then(r => r.json()).catch(() => ({ count: 0 })),
      fetch('/api/kids/school-notes?action=get_unread_count').then(r => r.json()).catch(() => ({ count: 0 })),
      fetch('/api/kids/mood?action=get_break_flags').then(r => r.json()).catch(() => ({ flags: [] })),
    ]).then(([msgData, notesData, breakData]) => {
      setBadgeCounts({
        messages: msgData.count || 0,
        'needs-board': notesData.count || 0,
        'kids-health': (breakData.flags || []).length,
      })
    })
  }, [activeTab]) // Re-fetch when switching tabs (clears badges after viewing)

  // Fetch flag badge count for notification bell
  useEffect(() => {
    fetch('/api/parent/flags?action=get_badge_count')
      .then(r => r.json())
      .then(data => setFlagBadgeCount(data.count || 0))
      .catch(() => {})
  }, [activeTab])

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
      <FamilyQuickActions />

      {/* Recent Activity */}
      <FamilyActivityFeed />
    </div>
  )

  const renderCalendarTab = () => (
    <CalendarTab />
  )

  const renderSettingsTab = () => (
    <div className="space-y-6">
      {/* Family Members (moved from main nav) */}
      <div className="bg-white rounded-lg border shadow-sm">
        <button
          onClick={() => setActiveTab('family')}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 rounded-lg"
        >
          <div>
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-500" /> Manage Family Members
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">Names, ages, grades, schools, and profiles</p>
          </div>
          <span className="text-gray-400 text-sm">&rarr;</span>
        </button>
      </div>
      <FamilyConfigAdmin />
    </div>
  )

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <AvailabilityWidget />
            <MoodOverview />
            <Dashboard initialData={initialData} />
          </div>
        )
      case 'weekly-summary':
        return <WeeklySummaryTab />
      case 'chores':
        return <ChoresTab familyMembers={familyMembers} />
      case 'teacher':
        return <TeacherDashboard />
      case 'household-config':
        return <HouseholdConfigTab />
      case 'kids-checklist':
        return <KidsChecklistOverview />
      case 'weekly-checklist':
        return <WeeklyChecklistTab />
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
      case 'parents-health':
        return <HealthTab memberGroup="parents" />
      case 'kids-health':
        return <HealthTab memberGroup="kids" />
      case 'todos':
        return <TodoTab />
      case 'points-earning':
        return <PointsEarningTab />
      case 'messages':
        return <MessagesTab />
      case 'needs-board':
        return <NeedsBoardTab />
      case 'belle-care':
        return <PetsTab />
      case 'portfolio':
        return <ParentPortfolioPanel />
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
            <div className="flex-1">
              <div className="font-bold text-lg">Family Ops</div>
              <div className="text-sm text-gray-600">Parent Dashboard</div>
            </div>
            <button onClick={() => setFlagPanelOpen(true)} className="relative p-2 rounded-lg hover:bg-gray-100">
              <Bell className="w-5 h-5 text-gray-600" />
              {flagBadgeCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">
                  {flagBadgeCount}
                </span>
              )}
            </button>
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
                <span className="font-medium flex-1">{tab.name}</span>
                {!isActive && (badgeCounts[tab.id] || 0) > 0 && (
                  <span className="bg-teal-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center rounded-full px-1.5">
                    {badgeCounts[tab.id]}
                  </span>
                )}
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

      {/* Notification & Flag Center */}
      <FlagCenterPanel open={flagPanelOpen} onClose={() => setFlagPanelOpen(false)} onNavigate={(tab) => { setActiveTab(tab); setFlagPanelOpen(false) }} />
    </div>
  )
}