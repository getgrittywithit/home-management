'use client'

import { useState } from 'react'
import { 
  Calendar, CheckSquare, Clock, Star, MapPin, Users, 
  Plus, MessageSquare, Utensils, ChevronLeft, ChevronRight,
  CheckCircle2, Circle, AlertCircle, Award, Trophy, Target,
  Send, Heart, Book, Gamepad2
} from 'lucide-react'

interface KidData {
  profile: any
  todaysChecklist: any[]
  todaysEvents: any[]
  weekEvents: any[]
  zones: any[]
  tokens: any
}

interface TabContentProps {
  kidData: KidData
  activeTab: string
}

export default function KidTabContent({ kidData, activeTab }: TabContentProps) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const { profile, todaysChecklist, todaysEvents, weekEvents, zones, tokens } = kidData

  const renderCalendarTab = () => {
    const getDayEvents = (date: Date) => {
      return weekEvents.filter(event => {
        const eventDate = new Date(event.start_time)
        return eventDate.toDateString() === date.toDateString()
      })
    }

    const getWeekDays = () => {
      const startOfWeek = new Date(selectedDate)
      startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay())
      
      return Array.from({ length: 7 }, (_, i) => {
        const day = new Date(startOfWeek)
        day.setDate(startOfWeek.getDate() + i)
        return day
      })
    }

    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 rounded-lg">
          <h1 className="text-2xl font-bold">My Calendar</h1>
          <p className="text-purple-100">See what's coming up!</p>
        </div>

        {/* Week Navigation */}
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={() => {
                const prevWeek = new Date(selectedDate)
                prevWeek.setDate(selectedDate.getDate() - 7)
                setSelectedDate(prevWeek)
              }}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold">
              {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <button 
              onClick={() => {
                const nextWeek = new Date(selectedDate)
                nextWeek.setDate(selectedDate.getDate() + 7)
                setSelectedDate(nextWeek)
              }}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Week View */}
          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center font-medium text-gray-600 p-2">
                {day}
              </div>
            ))}
            {getWeekDays().map(day => {
              const dayEvents = getDayEvents(day)
              const isToday = day.toDateString() === new Date().toDateString()
              
              return (
                <div 
                  key={day.toISOString()}
                  className={`min-h-24 p-2 border rounded-lg ${
                    isToday ? 'bg-purple-50 border-purple-200' : 'bg-gray-50'
                  }`}
                >
                  <div className={`text-sm font-medium mb-1 ${isToday ? 'text-purple-600' : 'text-gray-900'}`}>
                    {day.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map(event => (
                      <div key={event.id} className="text-xs p-1 bg-blue-100 text-blue-700 rounded truncate">
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-gray-500">+{dayEvents.length - 2} more</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const renderChecklistTab = () => {
    const completedTasks = todaysChecklist.filter(item => item.completed).length
    const totalTasks = todaysChecklist.length
    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">My Tasks</h1>
              <p className="text-green-100">Get things done!</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{completionPercentage}%</div>
              <div className="text-sm text-green-100">Complete</div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="bg-white/20 rounded-full h-3">
              <div 
                className="bg-white rounded-full h-3 transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Task Categories */}
        <div className="space-y-4">
          {['Morning', 'School', 'Afternoon', 'Evening'].map(category => {
            const categoryTasks = todaysChecklist.filter(task => task.category === category)
            if (categoryTasks.length === 0) return null

            return (
              <div key={category} className="bg-white p-4 rounded-lg border">
                <h3 className="font-semibold text-gray-900 mb-3">{category} Tasks</h3>
                <div className="space-y-2">
                  {categoryTasks.map(task => (
                    <div key={task.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                      <button 
                        onClick={() => console.log('Toggle task:', task.id)}
                        className="flex-shrink-0"
                      >
                        {task.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                      <div className="flex-1">
                        <div className={`${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {task.title}
                        </div>
                        {task.description && (
                          <div className="text-sm text-gray-600">{task.description}</div>
                        )}
                      </div>
                      {task.points && (
                        <div className="text-sm bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                          +{task.points} pts
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderAchievementsTab = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold">My Achievements</h1>
        <p className="text-yellow-100">Look how awesome you are!</p>
      </div>

      {/* Achievement Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-6 h-6 text-yellow-500" />
            <h3 className="font-semibold">Recent Wins</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-2 bg-yellow-50 rounded">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-sm">Completed all morning tasks for 5 days!</span>
            </div>
            <div className="flex items-center gap-3 p-2 bg-green-50 rounded">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-sm">Helped with dishes without being asked</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-3 mb-4">
            <Award className="w-6 h-6 text-purple-500" />
            <h3 className="font-semibold">Badges Earned</h3>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2">
              <div className="text-2xl mb-1">🌟</div>
              <div className="text-xs">Star Student</div>
            </div>
            <div className="text-center p-2">
              <div className="text-2xl mb-1">🏆</div>
              <div className="text-xs">Goal Crusher</div>
            </div>
            <div className="text-center p-2">
              <div className="text-2xl mb-1">❤️</div>
              <div className="text-xs">Helper</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderGoalsTab = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-pink-500 to-purple-500 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold">My Goals</h1>
        <p className="text-pink-100">Dream big and achieve more!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="font-semibold mb-4">This Week's Goals</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                <Book className="w-4 h-4 text-pink-600" />
              </div>
              <div>
                <div className="font-medium">Read 30 minutes every day</div>
                <div className="text-sm text-gray-600">4/7 days completed</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div className="bg-pink-500 h-2 rounded-full" style={{ width: '57%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <h3 className="font-semibold mb-4">Long-term Goals</h3>
          <div className="space-y-3">
            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="font-medium">Learn to play guitar</div>
              <div className="text-sm text-gray-600">Started 2 weeks ago</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderRequestsTab = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-500 to-blue-500 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold">My Requests</h1>
        <p className="text-indigo-100">Ask for what you need!</p>
      </div>

      {/* Quick Request Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button className="bg-white p-4 rounded-lg border hover:bg-gray-50 text-center">
          <Utensils className="w-6 h-6 mx-auto mb-2 text-green-500" />
          <div className="font-medium text-sm">Snack Request</div>
        </button>
        <button className="bg-white p-4 rounded-lg border hover:bg-gray-50 text-center">
          <Users className="w-6 h-6 mx-auto mb-2 text-blue-500" />
          <div className="font-medium text-sm">Friend Over</div>
        </button>
        <button className="bg-white p-4 rounded-lg border hover:bg-gray-50 text-center">
          <Gamepad2 className="w-6 h-6 mx-auto mb-2 text-purple-500" />
          <div className="font-medium text-sm">Screen Time</div>
        </button>
        <button className="bg-white p-4 rounded-lg border hover:bg-gray-50 text-center">
          <Heart className="w-6 h-6 mx-auto mb-2 text-pink-500" />
          <div className="font-medium text-sm">Special Request</div>
        </button>
      </div>

      {/* Custom Request */}
      <div className="bg-white p-4 rounded-lg border">
        <h3 className="font-semibold mb-4">Send Custom Request</h3>
        <textarea 
          className="w-full p-3 border rounded-lg resize-none"
          rows={3}
          placeholder="What would you like to ask for?"
        />
        <button className="mt-2 bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 flex items-center gap-2">
          <Send className="w-4 h-4" />
          Send Request
        </button>
      </div>
    </div>
  )

  switch (activeTab) {
    case 'calendar':
      return renderCalendarTab()
    case 'checklist':
      return renderChecklistTab()
    case 'achievements':
      return renderAchievementsTab()
    case 'goals':
      return renderGoalsTab()
    case 'requests':
      return renderRequestsTab()
    default:
      return <div>Tab not found</div>
  }
}