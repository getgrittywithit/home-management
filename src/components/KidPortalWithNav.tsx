'use client'

import { useState } from 'react'
import { 
  Calendar, CheckSquare, Clock, Star, MapPin, Users, 
  Plus, MessageSquare, Utensils, ChevronLeft, ChevronRight,
  CheckCircle2, Circle, AlertCircle, Award, Home, BookOpen,
  Zap, Trophy, Target, Settings, ExternalLink, Phone, Mail
} from 'lucide-react'
import { SAMPLE_SCHOOL_DATA, SchoolProfile } from '@/lib/schoolConfig'
import KidTabContent from './KidTabContent'

interface KidPortalProps {
  kidData: {
    profile: any
    todaysChecklist: any[]
    todaysEvents: any[]
    weekEvents: any[]
    zones: any[]
    tokens: any
  }
}

type TabId = 'dashboard' | 'calendar' | 'checklist' | 'school' | 'achievements' | 'goals' | 'requests'

interface NavTab {
  id: TabId
  name: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

const navTabs: NavTab[] = [
  { id: 'dashboard', name: 'Home', icon: Home, color: 'bg-blue-500' },
  { id: 'calendar', name: 'Calendar', icon: Calendar, color: 'bg-purple-500' },
  { id: 'checklist', name: 'Tasks', icon: CheckSquare, color: 'bg-green-500' },
  { id: 'school', name: 'School', icon: BookOpen, color: 'bg-orange-500' },
  { id: 'achievements', name: 'Achievements', icon: Award, color: 'bg-yellow-500' },
  { id: 'goals', name: 'Goals', icon: Target, color: 'bg-pink-500' },
  { id: 'requests', name: 'Requests', icon: MessageSquare, color: 'bg-indigo-500' }
]

export default function KidPortalWithNav({ kidData }: KidPortalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)
  const [schoolData] = useState<SchoolProfile>(SAMPLE_SCHOOL_DATA) // In production, this would come from props/API

  const { profile, todaysChecklist, todaysEvents, weekEvents, zones, tokens } = kidData

  // Calculate completion stats
  const completedTasks = todaysChecklist.filter(item => item.completed).length
  const totalTasks = todaysChecklist.length
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const toggleTaskComplete = async (taskId: string) => {
    console.log('Toggle task:', taskId)
  }

  const getDayEvents = (date: Date) => {
    return weekEvents.filter(event => {
      const eventDate = new Date(event.start_time)
      return eventDate.toDateString() === date.toDateString()
    })
  }

  const getUpcomingAssignments = () => {
    const now = new Date()
    return schoolData.assignments
      .filter(assignment => new Date(assignment.dueDate) >= now && !assignment.completed)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 3)
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {profile.first_name}! {profile.emoji}</h1>
            <p className="text-blue-100">Ready to make today amazing?</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{tokens.tokens_remaining || 0}</div>
            <div className="text-sm text-blue-100">Tokens Available</div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <CheckSquare className="w-8 h-8 text-green-500" />
            <div>
              <div className="text-2xl font-bold">{completedTasks}/{totalTasks}</div>
              <div className="text-sm text-gray-600">Tasks Complete</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-purple-500" />
            <div>
              <div className="text-2xl font-bold">{todaysEvents.length}</div>
              <div className="text-sm text-gray-600">Events Today</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-orange-500" />
            <div>
              <div className="text-2xl font-bold">{getUpcomingAssignments().length}</div>
              <div className="text-sm text-gray-600">Due Soon</div>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Schedule Preview */}
      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-bold mb-4">Today's Schedule</h2>
        <div className="space-y-2">
          {todaysEvents.length > 0 ? todaysEvents.map(event => (
            <div key={event.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <Clock className="w-4 h-4 text-gray-500" />
              <div>
                <div className="font-medium">{event.title}</div>
                <div className="text-sm text-gray-600">
                  {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {event.location && ` • ${event.location}`}
                </div>
              </div>
            </div>
          )) : (
            <p className="text-gray-500 text-center py-4">No events scheduled for today</p>
          )}
        </div>
      </div>
    </div>
  )

  const renderSchoolTab = () => (
    <div className="space-y-6">
      {/* School Info Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold">School Information</h1>
        <p className="text-orange-100">{schoolData.school} • {schoolData.grade} Grade • {schoolData.schoolYear}</p>
      </div>

      {/* Quick Links */}
      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-bold mb-4">Quick Links</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {schoolData.links.map(link => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-2xl">{link.icon}</span>
              <div>
                <div className="font-medium">{link.name}</div>
                <div className="text-sm text-gray-500">{link.description}</div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
            </a>
          ))}
        </div>
      </div>

      {/* Teachers */}
      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-bold mb-4">My Teachers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {schoolData.teachers.map(teacher => (
            <div key={teacher.id} className="border rounded-lg p-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-xl">👨‍🏫</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{teacher.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{teacher.subject} • Room {teacher.room}</p>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <a href={`mailto:${teacher.email}`} className="text-blue-600 hover:underline">
                        {teacher.email}
                      </a>
                    </div>
                    {teacher.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <a href={`tel:${teacher.phone}`} className="text-blue-600 hover:underline">
                          {teacher.phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Assignments */}
      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-bold mb-4">Upcoming Assignments</h2>
        <div className="space-y-3">
          {getUpcomingAssignments().map(assignment => (
            <div key={assignment.id} className="flex items-center gap-4 p-3 border rounded-lg">
              <Circle className="w-4 h-4 text-gray-400" />
              <div className="flex-1">
                <div className="font-medium">{assignment.title}</div>
                <div className="text-sm text-gray-600">{assignment.subject}</div>
                {assignment.description && (
                  <div className="text-sm text-gray-500">{assignment.description}</div>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">Due: {new Date(assignment.dueDate).toLocaleDateString()}</div>
                <div className={`text-xs px-2 py-1 rounded-full ${
                  assignment.priority === 'high' ? 'bg-red-100 text-red-700' :
                  assignment.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {assignment.priority} priority
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Personal Notes */}
      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-bold mb-4">My Notes</h2>
        <textarea
          className="w-full p-3 border rounded-lg resize-none"
          rows={3}
          placeholder="Add personal notes about school..."
          defaultValue={schoolData.personalNotes}
        />
        <button className="mt-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600">
          Save Notes
        </button>
      </div>
    </div>
  )

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard()
      case 'school':
        return renderSchoolTab()
      case 'calendar':
      case 'checklist':
      case 'achievements':
      case 'goals':
      case 'requests':
        return <KidTabContent kidData={kidData} activeTab={activeTab} />
      default:
        return renderDashboard()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Navigation */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Profile Section */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
              {profile.emoji || '👦'}
            </div>
            <div>
              <div className="font-semibold">{profile.first_name}</div>
              <div className="text-sm text-gray-600">{profile.grade || 'Student'}</div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 p-4 space-y-2">
          {navTabs.map(tab => {
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
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          {renderActiveTab()}
        </div>
      </div>
    </div>
  )
}