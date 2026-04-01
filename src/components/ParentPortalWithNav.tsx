'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Dashboard from './Dashboard'
import ChoresTab from './ChoresTab'
import SchoolTabWithSchedules from './SchoolTabWithSchedules'
import FilterableCalendar from './FilterableCalendar'
import CalendarTab from './CalendarTab'
import FamilyCalendarTab from './FamilyCalendarTab'
import CalendarDashboardCard from './CalendarDashboardCard'
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
import HomeschoolTab from './HomeschoolTab'
import HomeschoolDashboardCard from './HomeschoolDashboardCard'
import HouseholdConfigTab from './HouseholdConfigTab'
import PetsTab from './PetsTab'
import HealthHubTab from './HealthHubTab'
import QuickHealthLog from './QuickHealthLog'
import SchoolHealthCard from './SchoolHealthCard'
import FamilyQuickActions from './FamilyQuickActions'
import FamilyActivityFeed from './FamilyActivityFeed'
import RewardsTab from './RewardsTab'
import ParentRewardsManager from './ParentRewardsManager'
import RewardsDashboardCard from './RewardsDashboardCard'
import OpportunitiesParentPanel from './OpportunitiesParentPanel'
import HabitsTab from './HabitsTab'
import HabitsDashboardCard from './HabitsDashboardCard'
import FinanceTab from './FinanceTab'
import FinanceDashboardCard from './FinanceDashboardCard'
import DigiPetParentPanel from './DigiPetParentPanel'
import PortalSettingsPanel from './PortalSettingsPanel'
import NeedsAttentionPanel from './NeedsAttentionPanel'
import NotificationBell from './NotificationBell'
import KidSnapshotCards from './KidSnapshotCards'
import HealthMergedTab from './HealthMergedTab'
import FinanceMergedTab from './FinanceMergedTab'
import StarsAndRewardsTab from './StarsAndRewardsTab'
import MessagesAndAlertsTab from './MessagesAndAlertsTab'
import SettingsExpandedTab from './SettingsExpandedTab'
import OverviewDashboard from './OverviewDashboard'
import { getAllFamilyData } from '@/lib/familyConfig'
import {
  Home, ClipboardList, Users, Calendar, Settings, BookOpen,
  User, CheckSquare, Phone, Upload, ChefHat, Printer, DollarSign, CalendarCheck, Heart, Star, MessageCircle, ShoppingCart, Dog, BarChart2, GraduationCap, Bell, Flame, Trophy, Sparkles, Shield
} from 'lucide-react'
import { DashboardData } from '@/types'

interface Tab {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  section?: string
}

const tabs: Tab[] = [
  // DAILY
  { id: 'overview', name: 'Overview', icon: Home, color: 'bg-blue-500', section: 'DAILY' },
  { id: 'messages-alerts', name: 'Messages & Alerts', icon: MessageCircle, color: 'bg-pink-500', section: 'DAILY' },
  { id: 'kids-checklist', name: 'Kids Daily Tasks', icon: CheckSquare, color: 'bg-emerald-600', section: 'DAILY' },
  // SCHOOL
  { id: 'homeschool', name: 'Homeschool', icon: BookOpen, color: 'bg-teal-500', section: 'SCHOOL' },
  { id: 'school', name: 'School', icon: GraduationCap, color: 'bg-orange-500', section: 'SCHOOL' },
  // HOME
  { id: 'chores', name: 'Chores & Zones', icon: ClipboardList, color: 'bg-green-500', section: 'HOME' },
  { id: 'belle-care', name: 'Pets', icon: Dog, color: 'bg-amber-600', section: 'HOME' },
  { id: 'food-inventory', name: 'Food & Meals', icon: ChefHat, color: 'bg-emerald-500', section: 'HOME' },
  // REWARDS & GROWTH
  { id: 'stars-rewards', name: 'Stars & Rewards', icon: Star, color: 'bg-amber-500', section: 'REWARDS' },
  { id: 'habits', name: 'Habits', icon: Flame, color: 'bg-orange-500', section: 'REWARDS' },
  // HEALTH
  { id: 'health', name: 'Health', icon: Heart, color: 'bg-rose-600', section: 'HEALTH' },
  // PLANNING & ADMIN
  { id: 'calendar', name: 'Calendar', icon: Calendar, color: 'bg-pink-500', section: 'PLANNING' },
  { id: 'finance', name: 'Finance', icon: DollarSign, color: 'bg-green-500', section: 'PLANNING' },
  { id: 'settings', name: 'Settings', icon: Settings, color: 'bg-gray-500', section: 'PLANNING' },
]

// Map legacy tab IDs to new locations (for backwards compatibility)
const LEGACY_TAB_MAP: Record<string, string> = {
  'weekly-summary': 'overview',
  'points-earning': 'stars-rewards',
  rewards: 'stars-rewards',
  'digi-pet': 'stars-rewards',
  'needs-board': 'messages-alerts',
  messages: 'messages-alerts',
  'household-config': 'chores',
  'parents-health': 'health',
  'kids-health': 'health',
  'health-hub': 'health',
  portfolio: 'homeschool',
  teacher: 'homeschool',
  opportunities: 'homeschool',
  'weekly-checklist': 'overview',
  todos: 'settings',
  'moe-money': 'finance',
  print: 'settings',
  'bulk-docs': 'settings',
  aboutme: 'settings',
  contacts: 'settings',
}

interface ParentPortalWithNavProps {
  initialData?: DashboardData
}

// Get all family data from centralized config
const familyData = getAllFamilyData()
const familyChildren = familyData.children.filter(Boolean) // Remove any null values
const familyMembers = familyData.allMembers.filter(Boolean) // Remove any null values

function SickAlertBanner() {
  const [alerts, setAlerts] = useState<{ kid_name: string; reason?: string }[]>([])

  useEffect(() => {
    fetch('/api/parent/flags?action=get_all_flags')
      .then(r => r.json())
      .then(data => {
        const sick = data.sick_days || []
        const breaks = data.break_requests || []
        setAlerts([
          ...sick.map((s: any) => ({ kid_name: s.kid_name, reason: 'not feeling well' })),
          ...breaks.map((b: any) => ({ kid_name: b.kid_name, reason: 'needs a break' })),
        ])
      })
      .catch(() => {})
  }, [])

  if (alerts.length === 0) return null

  const names = alerts.map(a => {
    const cap = a.kid_name.charAt(0).toUpperCase() + a.kid_name.slice(1)
    return `${cap} (${a.reason})`
  })

  return (
    <div className="bg-amber-50 border-l-4 border-amber-400 rounded-lg p-4 flex items-start gap-3">
      <span className="text-xl flex-shrink-0">🤒</span>
      <div>
        <p className="font-semibold text-amber-900">
          {alerts.length} kid{alerts.length > 1 ? 's' : ''} need{alerts.length === 1 ? 's' : ''} attention
        </p>
        <p className="text-sm text-amber-800 mt-0.5">{names.join(', ')}</p>
      </div>
    </div>
  )
}

export default function ParentPortalWithNav({ initialData }: ParentPortalWithNavProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({})
  const [flagPanelOpen, setFlagPanelOpen] = useState(false)
  const [flagBadgeCount, setFlagBadgeCount] = useState(0)
  const [portalSettingsKid, setPortalSettingsKid] = useState<string | null>(null)
  const router = useRouter()

  // Fetch unread badge counts on load
  useEffect(() => {
    Promise.all([
      fetch('/api/kids/messages?action=get_unread_count').then(r => r.json()).catch(() => ({ count: 0 })),
      fetch('/api/kids/school-notes?action=get_unread_count').then(r => r.json()).catch(() => ({ count: 0 })),
      fetch('/api/kids/mood?action=get_break_flags').then(r => r.json()).catch(() => ({ flags: [] })),
    ]).then(([msgData, notesData, breakData]) => {
      const msgCount = (msgData.count || 0) + (notesData.count || 0)
      setBadgeCounts({
        messages: msgData.count || 0,
        'needs-board': notesData.count || 0,
        'messages-alerts': msgCount,
        health: (breakData.flags || []).length,
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
    <FamilyCalendarTab />
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

      {/* Portal Settings per kid */}
      <div className="bg-white rounded-lg border shadow-sm p-5">
        <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-indigo-500" /> Kid Portal Settings
        </h3>
        <p className="text-sm text-gray-500 mb-4">Manage PINs, lockouts, and portal access for each kid.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          {familyChildren.map(child => (
            <button
              key={child.name}
              onClick={() => setPortalSettingsKid(portalSettingsKid === child.name ? null : child.name)}
              className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2 ${
                portalSettingsKid === child.name
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Shield className="w-4 h-4" />
              {child.name}
            </button>
          ))}
        </div>
        {portalSettingsKid && (
          <PortalSettingsPanel kidName={portalSettingsKid} />
        )}
      </div>

      <FamilyConfigAdmin />
    </div>
  )

  const renderActiveTab = () => {
    // Handle legacy tab IDs — redirect to new consolidated location
    const resolvedTab = LEGACY_TAB_MAP[activeTab] || activeTab

    switch (resolvedTab) {
      case 'overview':
        return (
          <div className="space-y-6 p-6 max-w-6xl mx-auto">
            <NeedsAttentionPanel onNavigate={(tab) => setActiveTab(tab)} />
            <SickAlertBanner />
            <AvailabilityWidget />
            <HomeschoolDashboardCard onNavigate={() => setActiveTab('homeschool')} />
            <CalendarDashboardCard onNavigate={() => setActiveTab('calendar')} />
            <RewardsDashboardCard onNavigate={() => setActiveTab('stars-rewards')} />
            <HabitsDashboardCard onNavigate={() => setActiveTab('habits')} />
            <FinanceDashboardCard onNavigate={() => setActiveTab('finance')} />
            <KidSnapshotCards />
          </div>
        )
      case 'messages-alerts':
        return <MessagesAndAlertsTab onNavigate={(tab) => setActiveTab(tab)} />
      case 'kids-checklist':
        return <KidsChecklistOverview />
      case 'homeschool':
        return <HomeschoolTab />
      case 'school':
        return <SchoolTabWithSchedules children={familyChildren.map(child => ({
          ...child,
          school: child.school.name
        }))} />
      case 'chores':
        return <ChoresTab familyMembers={familyMembers} />
      case 'belle-care':
        return <PetsTab />
      case 'food-inventory':
        return <FoodInventoryManager />
      case 'stars-rewards':
        return <StarsAndRewardsTab />
      case 'habits':
        return <HabitsTab />
      case 'health':
        return <HealthMergedTab />
      case 'calendar':
        return renderCalendarTab()
      case 'finance':
        return <FinanceMergedTab />
      case 'settings':
        return <SettingsExpandedTab />
      case 'family':
        return renderFamilyTab()
      default:
        // Redirect unknown tabs to overview
        return (
          <div className="p-6 text-center text-gray-500">
            <p>Select a tab from the sidebar to get started.</p>
          </div>
        )
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
            <div className="flex items-center gap-1">
              <NotificationBell onNavigate={(tab) => setActiveTab(tab)} />
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
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {tabs.map((tab, index) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            const showSection = tab.section && (index === 0 || tabs[index - 1]?.section !== tab.section)
            const badgeCount = badgeCounts[tab.id] || (tab.id === 'messages-alerts' ? (badgeCounts['messages'] || 0) + (badgeCounts['needs-board'] || 0) : 0)

            return (
              <div key={tab.id}>
                {showSection && (
                  <div className={`text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 ${index > 0 ? 'pt-3 mt-1 border-t border-gray-100' : 'pt-1'} pb-1`}>
                    {tab.section}
                  </div>
                )}
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors text-sm
                    ${isActive
                      ? `${tab.color} text-white shadow-md`
                      : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon className="w-4.5 h-4.5" />
                  <span className="font-medium flex-1">{tab.name}</span>
                  {!isActive && badgeCount > 0 && (
                    <span className="bg-red-500 text-white text-xs min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">
                      {badgeCount}
                    </span>
                  )}
                </button>
              </div>
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