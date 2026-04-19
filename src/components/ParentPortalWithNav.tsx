'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ChoresTab from './ChoresTab'
import FamilyCalendarTab from './FamilyCalendarTab'
import CalendarView from './CalendarView'
import CalendarDashboardCard from './CalendarDashboardCard'
import AIAgentWidget from './AIAgentWidget'
import FlagCenterPanel from './FlagCenterPanel'
import FamilyConfigAdmin from './FamilyConfigAdmin'
import KidsChecklistOverview from './KidsChecklistOverview'
import AvailabilityWidget from './AvailabilityWidget'
import HomeschoolTab from './HomeschoolTab'
import HomeschoolDashboardCard from './HomeschoolDashboardCard'
import ProfileSwitcher from './ProfileSwitcher'
import QuickActionsBar from './QuickActionsBar'
import NotificationPermissionPrompt from './NotificationPermissionPrompt'
import PetsTab from './PetsTab'
import FamilyQuickActions from './FamilyQuickActions'
import FamilyActivityFeed from './FamilyActivityFeed'
import RewardsDashboardCard from './RewardsDashboardCard'
import HabitsDashboardCard from './HabitsDashboardCard'
import FinanceDashboardCard from './FinanceDashboardCard'
import PortalSettingsPanel from './PortalSettingsPanel'
import NeedsAttentionPanel from './NeedsAttentionPanel'
import NotificationBell from './NotificationBell'
import KidSnapshotCards from './KidSnapshotCards'
import HealthMergedTab from './HealthMergedTab'
import EmailInbox from './email/EmailInbox'
import FamilyHuddle from './FamilyHuddle'
import FinanceMergedTab from './FinanceMergedTab'
import StarsAndRewardsTab from './StarsAndRewardsTab'
import MessagesAndAlertsTab from './MessagesAndAlertsTab'
import SettingsExpandedTab from './SettingsExpandedTab'
import AiBuddyChat from './AiBuddyChat'
import AdventureBoardParentTab from './AdventureBoardParentTab'
import BoardsTab from './parent/BoardsTab'
import PrintCenter from './parent/PrintCenter'
import LeaderboardCard from './LeaderboardCard'
import ParentMyDayCard from './ParentMyDayCard'
import MedStatusCard from './MedStatusCard'
import DigestCard from './DigestCard'
import KitchenMergedTab from './KitchenMergedTab'
import SchoolAdvocacyMergedTab from './SchoolAdvocacyMergedTab'
import { DashboardDataProvider, useDashboardData } from '@/context/DashboardDataContext'
import { getAllFamilyData } from '@/lib/familyConfig'
import {
  Home, ClipboardList, Users, Calendar, Settings, BookOpen,
  User, CheckSquare, ChefHat, DollarSign, Heart, Star, MessageCircle,
  Dog, GraduationCap, Shield, Mail, Printer, MapPin
} from 'lucide-react'

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
  { id: 'email', name: 'Email', icon: Mail, color: 'bg-indigo-500', section: 'DAILY' },
  { id: 'boards', name: 'My Tasks', icon: ClipboardList, color: 'bg-violet-600', section: 'DAILY' },
  { id: 'family-huddle', name: 'Family Huddle', icon: Users, color: 'bg-violet-500', section: 'DAILY' },
  // SCHOOL
  { id: 'homeschool', name: 'Homeschool', icon: BookOpen, color: 'bg-teal-500', section: 'SCHOOL' },
  { id: 'school-advocacy', name: 'School & Advocacy', icon: GraduationCap, color: 'bg-orange-500', section: 'SCHOOL' },
  // HOME
  { id: 'chores', name: 'Chores & Zones', icon: ClipboardList, color: 'bg-green-500', section: 'HOME' },
  { id: 'belle-care', name: 'Pets', icon: Dog, color: 'bg-amber-600', section: 'HOME' },
  { id: 'kitchen', name: 'Kitchen', icon: ChefHat, color: 'bg-emerald-500', section: 'HOME' },
  // REWARDS & GROWTH
  { id: 'stars-rewards', name: 'Stars & Rewards', icon: Star, color: 'bg-amber-500', section: 'REWARDS' },
  // HEALTH
  { id: 'health', name: 'Health', icon: Heart, color: 'bg-rose-600', section: 'HEALTH' },
  // FAMILY
  { id: 'family', name: 'Family', icon: Users, color: 'bg-purple-500', section: 'FAMILY' },
  // PLANNING & ADMIN
  { id: 'calendar', name: 'Calendar', icon: Calendar, color: 'bg-pink-500', section: 'PLANNING' },
  { id: 'finance', name: 'Finance', icon: DollarSign, color: 'bg-green-500', section: 'PLANNING' },
  { id: 'adventures', name: 'Adventures', icon: MapPin, color: 'bg-indigo-500', section: 'PLANNING' },
  { id: 'print-center', name: 'Print Center', icon: Printer, color: 'bg-blue-600', section: 'PLANNING' },
  { id: 'settings', name: 'Settings', icon: Settings, color: 'bg-gray-500', section: 'PLANNING' },
]

// Map legacy tab IDs to new locations (for backwards compatibility)
const LEGACY_TAB_MAP: Record<string, string> = {
  'weekly-summary': 'overview',
  'points-earning': 'stars-rewards',
  rewards: 'stars-rewards',
  'digi-pet': 'stars-rewards',
  habits: 'stars-rewards',
  gifts: 'stars-rewards',
  'needs-board': 'messages-alerts',
  messages: 'messages-alerts',
  'household-config': 'chores',
  'parents-health': 'health',
  'kids-health': 'health',
  'health-hub': 'health',
  portfolio: 'homeschool',
  teacher: 'homeschool',
  opportunities: 'homeschool',
  library: 'homeschool',
  school: 'school-advocacy',
  advocacy: 'school-advocacy',
  'food-inventory': 'kitchen',
  'recipe-import': 'kitchen',
  shopping: 'kitchen',
  'needs-list': 'kitchen',
  'weekly-checklist': 'overview',
  todos: 'settings',
  'moe-money': 'finance',
  print: 'settings',
  'bulk-docs': 'settings',
  aboutme: 'settings',
  contacts: 'settings',
}

interface ParentPortalWithNavProps {
  initialData?: any
}

// Get all family data from centralized config
const familyData = getAllFamilyData()
const familyChildren = familyData.children.filter(Boolean) // Remove any null values
const familyMembers = familyData.allMembers.filter(Boolean) // Remove any null values

function SickDayActions({ kidName }: { kidName: string }) {
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'overridden' | 'modified'>('pending')
  const [loading, setLoading] = useState(false)
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
  const display = kidName.charAt(0).toUpperCase() + kidName.slice(1)

  // Check current status on mount
  useEffect(() => {
    fetch('/api/kids/checklist', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_sick_day_status', kid_name: kidName }),
    }).then(r => r.json()).then(data => {
      if (data.sick_day?.status && data.sick_day.status !== 'active') {
        setStatus(data.sick_day.status as any)
      }
    }).catch(() => {})
  }, [kidName])

  const callAction = async (action: string, extra?: Record<string, any>) => {
    setLoading(true)
    await fetch('/api/kids/checklist', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, kid_name: kidName, date: today, ...extra }),
    }).catch(() => {})
    setLoading(false)
  }

  if (status === 'confirmed') return <span className="text-xs text-green-600 font-medium">✅ Sick day confirmed</span>
  if (status === 'overridden') return <span className="text-xs text-blue-600 font-medium">📋 Tasks restored</span>
  if (status === 'modified') return <span className="text-xs text-amber-600 font-medium">✅ Modified day set</span>

  return (
    <div className="flex gap-1.5 mt-1.5">
      <button disabled={loading} onClick={async () => { await callAction('confirm_sick_day'); setStatus('confirmed') }}
        className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium hover:bg-green-200 disabled:opacity-50">
        Confirm Sick Day
      </button>
      <button disabled={loading} onClick={async () => { await callAction('override_sick_day'); setStatus('overridden') }}
        className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium hover:bg-gray-200 disabled:opacity-50">
        Not Sick — Restore
      </button>
    </div>
  )
}

function SickAlertBanner() {
  const { flagsData, loaded } = useDashboardData()
  const sick = flagsData.sick_days || []
  const breaks = flagsData.breaks || flagsData.break_requests || []

  if (sick.length === 0 && breaks.length === 0) return null

  return (
    <div className="bg-amber-50 border-l-4 border-amber-400 rounded-lg p-4 space-y-3">
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0">🤒</span>
        <div>
          <p className="font-semibold text-amber-900">
            {sick.length + breaks.length} kid{sick.length + breaks.length > 1 ? 's' : ''} need{sick.length + breaks.length === 1 ? 's' : ''} attention
          </p>
        </div>
      </div>
      {sick.map((s: any) => {
        const cap = s.kid_name.charAt(0).toUpperCase() + s.kid_name.slice(1)
        return (
          <div key={s.kid_name} className="pl-9">
            <p className="text-sm text-amber-800 font-medium">{cap} — not feeling well</p>
            <SickDayActions kidName={s.kid_name} />
          </div>
        )
      })}
      {breaks.map((b: any) => {
        const cap = b.kid_name.charAt(0).toUpperCase() + b.kid_name.slice(1)
        return (
          <div key={`break-${b.kid_name}`} className="pl-9">
            <p className="text-sm text-amber-800">{cap} — needs a break</p>
          </div>
        )
      })}
    </div>
  )
}

function BadgeCountSync({ setBadgeCounts, setFlagBadgeCount }: {
  setBadgeCounts: React.Dispatch<React.SetStateAction<Record<string, number>>>
  setFlagBadgeCount: React.Dispatch<React.SetStateAction<number>>
}) {
  const { flagsData, loaded } = useDashboardData()

  useEffect(() => {
    if (!loaded) return
    const data = flagsData || {}
    const msgCount = (data.messages || []).reduce((sum: number, m: any) => sum + (m.count || 0), 0)
    const breakCount = (data.breaks || data.break_requests || []).length
    const sickCount = (data.sick_days || []).length
    const mealCount = (data.meal_requests || []).length
    const missedChores = (data.missed_chores || []).length
    const petCare = (data.pet_care || []).length
    const lowMoods = (data.low_moods || []).length
    const schoolNotes = (data.school_notes || []).length

    // TAB-BADGE-1: Badge counts for all relevant tabs
    setBadgeCounts({
      'messages-alerts': msgCount,
      health: breakCount + sickCount + lowMoods,
      'kids-checklist': missedChores,
      'pets-plants': petCare,
      'kitchen': mealCount,
      'school-notes': schoolNotes,
    })
    setFlagBadgeCount(msgCount + breakCount + sickCount + mealCount + missedChores + petCare)
  }, [flagsData, loaded, setBadgeCounts, setFlagBadgeCount])

  // Fetch additional badge sources not in flagsData
  useEffect(() => {
    if (!loaded) return
    // Notification count for overview
    fetch('/api/notifications?action=get_unread_count&role=parent')
      .then(r => r.json())
      .then(data => {
        setBadgeCounts(prev => ({ ...prev, overview: data.count || 0 }))
      })
      .catch(() => {})
    // Positive reports pending approval
    fetch('/api/positive-reports?action=get_pending')
      .then(r => r.json())
      .then(data => {
        setBadgeCounts(prev => ({ ...prev, 'stars-rewards': (data.reports || []).length }))
      })
      .catch(() => {})
  }, [loaded, setBadgeCounts])

  return null
}

export default function ParentPortalWithNav({ initialData }: ParentPortalWithNavProps) {
  const [activeTab, setActiveTabRaw] = useState('overview')
  const [messageSubTab, setMessageSubTab] = useState<'alerts' | 'messages' | 'needs' | 'checkins' | undefined>(undefined)

  const [healthSubTab, setHealthSubTab] = useState<string | undefined>(undefined)

  // Wrapper: when navigating with a subtab hint (e.g. 'messages-alerts:messages', 'health:medications')
  const setActiveTab = (tab: string) => {
    if (tab.startsWith('messages-alerts:')) {
      setActiveTabRaw('messages-alerts')
      setMessageSubTab(tab.split(':')[1] as any)
    } else if (tab.startsWith('health:')) {
      setActiveTabRaw('health')
      setHealthSubTab(tab.split(':')[1])
    } else {
      setActiveTabRaw(tab)
      if (tab !== 'messages-alerts') setMessageSubTab(undefined)
      if (tab !== 'health') setHealthSubTab(undefined)
    }
  }
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({})
  const [flagPanelOpen, setFlagPanelOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [flagBadgeCount, setFlagBadgeCount] = useState(0)
  const [portalSettingsKid, setPortalSettingsKid] = useState<string | null>(null)
  const router = useRouter()

  // Global tab navigation escape hatch — any component can
  // window.dispatchEvent(new CustomEvent('tabChange', { detail: { tab: 'food-inventory' } }))
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.tab && typeof detail.tab === 'string') setActiveTab(detail.tab)
    }
    window.addEventListener('tabChange', handler)
    return () => window.removeEventListener('tabChange', handler)
  }, [])

  // D91: Client-side reminder polling (fires check_reminders every 5 min while app is open)
  useEffect(() => {
    const poll = () => {
      fetch('/api/notifications', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check_reminders' }),
      }).catch(() => {})
    }
    poll()
    const interval = setInterval(poll, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Badge counts derived from DashboardDataContext — no independent API calls

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
    <div className="space-y-6">
      <CalendarView />
      <FamilyCalendarTab />
    </div>
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
    const resolvedTab = LEGACY_TAB_MAP[activeTab] || activeTab

    // Determine sub-tab hints for merged tabs based on original tab ID
    const kitchenSubTab = activeTab === 'recipe-import' ? 'recipes' as const
      : activeTab === 'shopping' ? 'shopping' as const
      : activeTab === 'needs-list' ? 'needs' as const
      : undefined
    const schoolSubTab = activeTab === 'advocacy' ? 'advocacy' as const : undefined
    const homeschoolSubTab = activeTab === 'library' ? 'library' as const : undefined
    const rewardsSubTab = activeTab === 'habits' ? 'habits' as const
      : activeTab === 'gifts' ? 'gifts' as const
      : activeTab === 'goals' ? 'goals' as const
      : activeTab === 'challenges' ? 'challenges' as const
      : undefined

    switch (resolvedTab) {
      case 'overview':
        return (
          <div className="space-y-6 p-6 max-w-6xl mx-auto">
            <NotificationPermissionPrompt targetRole="parent" />
            <NeedsAttentionPanel onNavigate={(tab) => setActiveTab(tab)} />
            <SickAlertBanner />
            <QuickActionsBar />
            <MedStatusCard />
            <DigestCard />
            <ParentMyDayCard onNavigate={(tab) => setActiveTab(tab)} />
            <AvailabilityWidget />
            <HomeschoolDashboardCard onNavigate={() => setActiveTab('homeschool')} />
            <CalendarDashboardCard onNavigate={() => setActiveTab('calendar')} />
            <RewardsDashboardCard onNavigate={() => setActiveTab('stars-rewards')} />
            <HabitsDashboardCard onNavigate={() => setActiveTab('stars-rewards')} />
            <FinanceDashboardCard onNavigate={() => setActiveTab('finance')} />
            <LeaderboardCard />
            <KidSnapshotCards />
          </div>
        )
      case 'messages-alerts':
        return <MessagesAndAlertsTab onNavigate={(tab) => setActiveTab(tab)} defaultSubTab={messageSubTab} />
      case 'kids-checklist':
        return <KidsChecklistOverview />
      case 'homeschool':
        return <HomeschoolTab initialSubTab={homeschoolSubTab} />
      case 'school-advocacy':
        return <SchoolAdvocacyMergedTab initialSubTab={schoolSubTab} />
      case 'chores':
        return <ChoresTab familyMembers={familyMembers} />
      case 'belle-care':
        return <PetsTab />
      case 'email':
        return <div className="p-6 max-w-5xl mx-auto"><EmailInbox /></div>
      case 'boards':
        return <BoardsTab />
      case 'family-huddle':
        return <FamilyHuddle />
      case 'kitchen':
        return <KitchenMergedTab initialSubTab={kitchenSubTab} />
      case 'stars-rewards':
        return <StarsAndRewardsTab initialSubTab={rewardsSubTab} />
      case 'health':
        return <HealthMergedTab />
      case 'calendar':
        return renderCalendarTab()
      case 'finance':
        return <FinanceMergedTab />
      case 'adventures':
        return <AdventureBoardParentTab />
      case 'print-center':
        return <PrintCenter />
      case 'settings':
        return <SettingsExpandedTab />
      case 'family':
        return renderFamilyTab()
      default:
        return (
          <div className="p-6 text-center text-gray-500">
            <p>Select a tab from the sidebar to get started.</p>
          </div>
        )
    }
  }

  return (
    <DashboardDataProvider>
    <BadgeCountSync setBadgeCounts={setBadgeCounts} setFlagBadgeCount={setFlagBadgeCount} />
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile header bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b flex items-center justify-between px-4 py-2">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
          </svg>
        </button>
        <span className="text-sm font-bold text-gray-900">Family Ops</span>
        <NotificationBell onNavigate={(tab) => { setActiveTab(tab); setSidebarOpen(false) }} badgeCount={flagBadgeCount} onFlagClick={() => setFlagPanelOpen(true)} />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && <div className="md:hidden fixed inset-0 bg-black/30 z-40" onClick={() => setSidebarOpen(false)} />}

      {/* Left Navigation */}
      <div className={`w-64 bg-white border-r border-gray-200 flex flex-col overflow-visible
        md:relative md:translate-x-0
        fixed top-0 left-0 h-full z-50 transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Header */}
        <div className="p-6 border-b border-gray-200 overflow-visible relative z-50">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/favicon.svg" alt="Family Ops" className="w-10 h-10 rounded-lg" />
            <div className="flex-1">
              <div className="font-bold text-lg">Family Ops</div>
              <div className="text-sm text-gray-600">Parent Dashboard</div>
            </div>
            <div className="hidden md:flex items-center gap-1">
              <NotificationBell onNavigate={(tab) => { setActiveTab(tab); setFlagPanelOpen(false) }} badgeCount={flagBadgeCount} onFlagClick={() => setFlagPanelOpen(true)} />
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
                  onClick={() => { setActiveTab(tab.id); setSidebarOpen(false) }}
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
      <div className="flex-1 pt-14 md:pt-0">
        <div className={activeTab === 'overview' ? '' : 'p-6'}>
          <div className={activeTab === 'overview' ? '' : 'max-w-6xl mx-auto'}>
            {renderActiveTab()}
          </div>
        </div>
      </div>

      {/* AI Agent Widget */}
      <AIAgentWidget />

      {/* AI Family Assistant */}
      <AiBuddyChat role="parent" displayName="Lola" />

      {/* Profile switcher — floating bottom-left */}
      <ProfileSwitcher currentRole="parent" />

      {/* Notification & Flag Center */}
      <FlagCenterPanel open={flagPanelOpen} onClose={() => setFlagPanelOpen(false)} onNavigate={(tab) => { setActiveTab(tab); setFlagPanelOpen(false) }} />
    </div>
    </DashboardDataProvider>
  )
}