'use client'

import { useState, useEffect } from 'react'
import { 
  Calendar, CheckSquare, Clock, Star, MapPin, Users, 
  Plus, MessageSquare, Utensils, ChevronLeft, ChevronRight,
  CheckCircle2, Circle, AlertCircle, Award, Home, BookOpen,
  Zap, Trophy, Target, Settings, ExternalLink, Phone, Mail,
  User
} from 'lucide-react'
import { SAMPLE_SCHOOL_DATA, SchoolProfile } from '@/lib/schoolConfig'
import { getScheduleForChild, getChildScheduleForDate, getAllTeachersForChild, SchedulePeriod } from '@/lib/scheduleConfig'
import KidTabContent from './KidTabContent'
import AboutMeTab from './AboutMeTab'
import DailyChecklist from './DailyChecklist'

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

type TabId = 'dashboard' | 'calendar' | 'checklist' | 'school' | 'about' | 'achievements' | 'goals' | 'requests'

interface NavTab {
  id: TabId
  name: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

const navTabs: NavTab[] = [
  { id: 'dashboard', name: 'Home', icon: Home, color: 'bg-blue-500' },
  { id: 'calendar', name: 'Calendar', icon: Calendar, color: 'bg-purple-500' },
  { id: 'checklist', name: 'Daily Checklist', icon: CheckSquare, color: 'bg-green-500' },
  { id: 'school', name: 'School', icon: BookOpen, color: 'bg-orange-500' },
  { id: 'about', name: 'About Me', icon: User, color: 'bg-teal-500' },
  { id: 'achievements', name: 'Achievements', icon: Award, color: 'bg-yellow-500' },
  { id: 'goals', name: 'Goals', icon: Target, color: 'bg-pink-500' },
  { id: 'requests', name: 'Requests', icon: MessageSquare, color: 'bg-indigo-500' }
]

export default function KidPortalWithNav({ kidData }: KidPortalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)
  const [schoolData, setSchoolData] = useState<SchoolProfile>(SAMPLE_SCHOOL_DATA)
  const [realSchedule, setRealSchedule] = useState<any>(null)

  const { profile, todaysChecklist, todaysEvents, weekEvents, zones, tokens } = kidData

  // Load real schedule data based on child name
  useEffect(() => {
    if (profile?.first_name) {
      const childKey = profile.first_name.toLowerCase()
      const schedule = getScheduleForChild(childKey)
      const todaysSchedule = getChildScheduleForDate(profile.first_name, selectedDate)
      
      if (schedule) {
        setRealSchedule(schedule)
        
        // Convert real schedule to SchoolProfile format for the school tab
        const realSchoolData: SchoolProfile = {
          ...schoolData,
          school: schedule.school,
          schoolYear: schedule.schoolYear,
          teachers: schedule.periods.map((period, index) => ({
            id: `teacher-${index}`,
            name: period.teacher,
            email: '', // We don't have email data in the schedule
            subject: period.course,
            room: period.room,
            preferredContact: 'email' as const,
            locked: true
          })).filter((teacher, index, array) => 
            // Remove duplicates based on teacher name
            array.findIndex(t => t.name === teacher.name) === index
          ),
          classes: schedule.periods.map((period, index) => ({
            id: `class-${index}`,
            name: period.course,
            subject: period.course,
            teacherId: `teacher-${index}`,
            room: period.room,
            color: '#3B82F6', // Default blue
            locked: true,
            schedule: [{
              dayOfWeek: period.days === 'A' ? 1 : period.days === 'B' ? 2 : 1, // Simplified mapping
              startTime: '08:00', // We don't have time data in the current schedule
              endTime: '09:00',
              period: period.period
            }]
          }))
        }
        setSchoolData(realSchoolData)
      }
    }
  }, [profile?.first_name, selectedDate])

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

  const renderSchoolTab = () => {
    const todaysSchedule = getChildScheduleForDate(profile.first_name, selectedDate)
    
    return (
      <div className="space-y-6">
        {/* School Info Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6 rounded-lg">
          <h1 className="text-2xl font-bold">School Information</h1>
          <p className="text-orange-100">{schoolData.school} • {profile.grade || schoolData.grade} Grade • {schoolData.schoolYear}</p>
          {todaysSchedule && (
            <div className="mt-2 text-sm text-orange-100">
              {todaysSchedule.isSchoolDay ? 
                `Today: ${todaysSchedule.dayType} Day (${todaysSchedule.periods.length} classes)` :
                'No school today'
              }
            </div>
          )}
        </div>

        {/* Dynamic Today Section */}
        <div className="bg-white p-6 rounded-lg border">
          {(() => {
            const today = new Date()
            const dayOfWeek = today.getDay() // 0 = Sunday, 6 = Saturday
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
            const dayName = today.toLocaleDateString('en-US', { weekday: 'long' })
            const fullDate = today.toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric',
              year: 'numeric'
            })

            if (isWeekend) {
              return (
                <div className="text-center">
                  <div className="text-6xl mb-4">🎉</div>
                  <h2 className="text-2xl font-bold text-purple-700 mb-2">Happy {dayName}!</h2>
                  <p className="text-lg text-gray-600 mb-4">{fullDate}</p>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-purple-700 font-medium mb-2">
                      {dayOfWeek === 0 ? 
                        "It's Sunday! Time to relax and recharge for the week ahead! 🌟" :
                        "It's Saturday! Enjoy your weekend and have some fun! 🎈"
                      }
                    </p>
                    <p className="text-purple-600 text-sm">
                      {dayOfWeek === 0 ? 
                        "Maybe catch up on some reading, spend time with family, or prep for Monday!" :
                        "Perfect day for hobbies, friends, or just taking it easy!"
                      }
                    </p>
                  </div>
                </div>
              )
            }

            // Weekday - check if it's a school day
            if (todaysSchedule && todaysSchedule.isSchoolDay) {
              return (
                <div className="text-center">
                  <div className="text-4xl mb-4">📚</div>
                  <h2 className="text-2xl font-bold text-orange-700 mb-2">Today is {dayName}</h2>
                  <p className="text-lg text-gray-600 mb-4">{fullDate}</p>
                  <div className={`p-4 rounded-lg ${
                    todaysSchedule.dayType === 'A' ? 'bg-green-50' : 'bg-blue-50'
                  }`}>
                    <p className={`font-bold text-lg mb-2 ${
                      todaysSchedule.dayType === 'A' ? 'text-green-700' : 'text-blue-700'
                    }`}>
                      It's an {todaysSchedule.dayType} Day! 
                      <span className={`inline-block w-6 h-6 rounded-full text-white text-sm ml-2 ${
                        todaysSchedule.dayType === 'A' ? 'bg-green-500' : 'bg-blue-500'
                      }`} style={{ lineHeight: '24px' }}>
                        {todaysSchedule.dayType}
                      </span>
                    </p>
                    <p className={`text-sm mb-2 ${
                      todaysSchedule.dayType === 'A' ? 'text-green-600' : 'text-blue-600'
                    }`}>
                      You have {todaysSchedule.periods.length} classes today
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {todaysSchedule.periods.slice(0, 4).map((period, index) => (
                        <span key={index} className={`text-xs px-2 py-1 rounded-full ${
                          todaysSchedule.dayType === 'A' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {period.course}
                        </span>
                      ))}
                      {todaysSchedule.periods.length > 4 && (
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                          +{todaysSchedule.periods.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-500 text-sm mt-3">
                    💪 You've got this! Have an awesome day at school!
                  </p>
                </div>
              )
            }

            // Weekday but no school (holiday, break, etc.)
            return (
              <div className="text-center">
                <div className="text-5xl mb-4">🌟</div>
                <h2 className="text-2xl font-bold text-indigo-700 mb-2">Today is {dayName}</h2>
                <p className="text-lg text-gray-600 mb-4">{fullDate}</p>
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <p className="text-indigo-700 font-medium mb-2">
                    No school today! 🎊
                  </p>
                  <p className="text-indigo-600 text-sm">
                    Enjoy your day off! Maybe it's a holiday, teacher workday, or school break.
                  </p>
                </div>
              </div>
            )
          })()}
        </div>

        {/* Today's Schedule */}
        {todaysSchedule && todaysSchedule.isSchoolDay && (
          <div className="bg-white p-6 rounded-lg border">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              Today's Schedule - {todaysSchedule.dayType} Day
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {todaysSchedule.periods.map((period, index) => (
                <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-sm font-semibold text-orange-700">
                    {period.period}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{period.course}</div>
                    <div className="text-sm text-gray-600">{period.teacher} • Room {period.room}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Complete A/B Day Schedule Card */}
        {realSchedule && (
          <div className="bg-white p-6 rounded-lg border">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500" />
              My Complete Schedule
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* A Day Schedule */}
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="text-lg font-bold text-green-700 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">A</span>
                  A Day Classes
                </h3>
                <div className="space-y-2">
                  {realSchedule.periods
                    .filter((period: SchedulePeriod) => period.days === 'A' || period.days === 'AB')
                    .sort((a: SchedulePeriod, b: SchedulePeriod) => {
                      // Custom sort for period numbers including 0A, 0B
                      const getPeriodValue = (period: string) => {
                        if (period === '0A') return 0.1
                        if (period === '0B') return 0.2
                        return parseInt(period) || 999
                      }
                      return getPeriodValue(a.period) - getPeriodValue(b.period)
                    })
                    .map((period: SchedulePeriod, index: number) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm font-semibold text-green-700">
                          {period.period}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{period.course}</div>
                          <div className="text-sm text-gray-600">{period.teacher}</div>
                          <div className="text-xs text-gray-500">Room {period.room}</div>
                        </div>
                        {period.days === 'AB' && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                            Both Days
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              {/* B Day Schedule */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-lg font-bold text-blue-700 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">B</span>
                  B Day Classes
                </h3>
                <div className="space-y-2">
                  {realSchedule.periods
                    .filter((period: SchedulePeriod) => period.days === 'B' || period.days === 'AB')
                    .sort((a: SchedulePeriod, b: SchedulePeriod) => {
                      // Custom sort for period numbers including 0A, 0B
                      const getPeriodValue = (period: string) => {
                        if (period === '0A') return 0.1
                        if (period === '0B') return 0.2
                        return parseInt(period) || 999
                      }
                      return getPeriodValue(a.period) - getPeriodValue(b.period)
                    })
                    .map((period: SchedulePeriod, index: number) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-semibold text-blue-700">
                          {period.period}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{period.course}</div>
                          <div className="text-sm text-gray-600">{period.teacher}</div>
                          <div className="text-xs text-gray-500">Room {period.room}</div>
                        </div>
                        {period.days === 'AB' && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                            Both Days
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Quick Reference */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Schedule Legend */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-700 mb-2">Schedule Guide:</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 bg-green-500 rounded-full"></span>
                    A Day: Green schedule
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 bg-blue-500 rounded-full"></span>
                    B Day: Blue schedule
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 bg-purple-500 rounded-full"></span>
                    Both Days: Every day classes
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="p-3 bg-orange-50 rounded-lg">
                <h4 className="font-medium text-orange-700 mb-2">My Schedule Stats:</h4>
                <div className="space-y-1 text-sm text-orange-600">
                  <div>Total Classes: {realSchedule.periods.length}</div>
                  <div>A Day Classes: {realSchedule.periods.filter(p => p.days === 'A').length}</div>
                  <div>B Day Classes: {realSchedule.periods.filter(p => p.days === 'B').length}</div>
                  <div>Daily Classes: {realSchedule.periods.filter(p => p.days === 'AB').length}</div>
                </div>
              </div>
            </div>
          </div>
        )}

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
                    {teacher.email ? (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <a href={`mailto:${teacher.email}`} className="text-blue-600 hover:underline">
                          {teacher.email}
                        </a>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span>Email not available</span>
                      </div>
                    )}
                    {teacher.phone ? (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <a href={`tel:${teacher.phone}`} className="text-blue-600 hover:underline">
                          {teacher.phone}
                        </a>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>Phone not available</span>
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
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard()
      case 'school':
        return renderSchoolTab()
      case 'about':
        return <AboutMeTab childAge={profile.age || 10} childId={profile.id} childName={profile.first_name || profile.name} />
      case 'checklist':
        return <DailyChecklist childName={profile.first_name || profile.name} />
      case 'calendar':
        return (
          <div className="p-6 bg-white rounded-lg border">
            <h2 className="text-xl font-bold mb-4">Calendar</h2>
            <p className="text-gray-600">Calendar feature coming soon!</p>
          </div>
        )
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