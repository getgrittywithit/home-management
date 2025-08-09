'use client'

import { useState } from 'react'
import { 
  Calendar, CheckSquare, Clock, Star, MapPin, Users, 
  Plus, MessageSquare, Utensils, ChevronLeft, ChevronRight,
  CheckCircle2, Circle, AlertCircle, Award
} from 'lucide-react'

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

type ViewMode = 'calendar' | 'checklist'

export default function KidPortal({ kidData }: KidPortalProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)

  const { profile, todaysChecklist, todaysEvents, weekEvents, zones, tokens } = kidData

  // Calculate completion stats
  const completedTasks = todaysChecklist.filter(item => item.completed).length
  const totalTasks = todaysChecklist.length
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const toggleTaskComplete = async (taskId: string) => {
    // This would call an API to update the task completion
    console.log('Toggle task:', taskId)
  }

  const openEventModal = (event: any) => {
    setSelectedEvent(event)
    setShowModal(true)
  }

  const getDayEvents = (date: Date) => {
    return weekEvents.filter(event => {
      const eventDate = new Date(event.start_time)
      return eventDate.toDateString() === date.toDateString()
    })
  }

  const getTasksByCategory = () => {
    const categories = {
      hygiene: todaysChecklist.filter(task => task.category === 'hygiene'),
      chores: todaysChecklist.filter(task => task.category === 'chores'),
      backpack: todaysChecklist.filter(task => task.category === 'backpack'),
      events: todaysEvents.map(event => ({
        ...event,
        title: event.title,
        completed: false,
        category: 'events'
      }))
    }
    return categories
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-6">
          <div className="bg-white rounded-2xl shadow-sm p-6 border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-4xl">{profile.emoji || '🧒'}</div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Hey {profile.first_name}! 👋
                  </h1>
                  <p className="text-gray-600">
                    {new Date().toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-600">{tokens.tokens_remaining}</div>
                    <div className="text-xs text-gray-500">Ride Tokens</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{completionPercentage}%</div>
                    <div className="text-xs text-gray-500">Tasks Done</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Today's Progress</span>
                <span>{completedTasks} of {totalTasks} tasks</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </header>

        {/* View Toggle */}
        <div className="flex justify-center mb-6">
          <div className="bg-white rounded-xl p-1 shadow-sm border inline-flex">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center space-x-2 ${
                viewMode === 'calendar'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Calendar</span>
            </button>
            <button
              onClick={() => setViewMode('checklist')}
              className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center space-x-2 ${
                viewMode === 'checklist'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span>Daily Tasks</span>
            </button>
          </div>
        </div>

        {viewMode === 'calendar' ? (
          <CalendarView
            weekEvents={weekEvents}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            onEventClick={openEventModal}
            getDayEvents={getDayEvents}
          />
        ) : (
          <ChecklistView
            categories={getTasksByCategory()}
            onToggleTask={toggleTaskComplete}
            profile={profile}
          />
        )}

        {/* Quick Actions */}
        <div className="mt-6">
          <div className="bg-white rounded-2xl shadow-sm p-6 border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <QuickActionButton
                icon={<Plus className="w-5 h-5" />}
                label="Add Event"
                color="blue"
                onClick={() => console.log('Add event')}
              />
              <QuickActionButton
                icon={<Utensils className="w-5 h-5" />}
                label="Meal Request"
                color="green"
                onClick={() => console.log('Meal request')}
              />
              <QuickActionButton
                icon={<MessageSquare className="w-5 h-5" />}
                label="Note to Parents"
                color="purple"
                onClick={() => console.log('Send note')}
              />
              <QuickActionButton
                icon={<Award className="w-5 h-5" />}
                label="My Achievements"
                color="yellow"
                onClick={() => console.log('View achievements')}
              />
            </div>
          </div>
        </div>

        {/* Event Detail Modal */}
        {showModal && selectedEvent && (
          <EventModal
            event={selectedEvent}
            onClose={() => setShowModal(false)}
            profile={profile}
          />
        )}
      </div>
    </div>
  )
}

function CalendarView({ weekEvents, selectedDate, onDateSelect, onEventClick, getDayEvents }: any) {
  const startOfWeek = new Date(selectedDate)
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startOfWeek)
    day.setDate(startOfWeek.getDate() + i)
    return day
  })

  const goToPrevWeek = () => {
    const prevWeek = new Date(selectedDate)
    prevWeek.setDate(prevWeek.getDate() - 7)
    onDateSelect(prevWeek)
  }

  const goToNextWeek = () => {
    const nextWeek = new Date(selectedDate)
    nextWeek.setDate(nextWeek.getDate() + 7)
    onDateSelect(nextWeek)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 border">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">My Calendar</h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={goToPrevWeek}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-medium">
            {startOfWeek.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={goToNextWeek}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center font-medium text-gray-500 p-3">
            {day}
          </div>
        ))}
        
        {weekDays.map((day) => {
          const dayEvents = getDayEvents(day)
          const isToday = day.toDateString() === new Date().toDateString()
          
          return (
            <div
              key={day.toISOString()}
              className={`min-h-[120px] p-2 border rounded-lg cursor-pointer transition-colors ${
                isToday
                  ? 'bg-blue-50 border-blue-200'
                  : 'hover:bg-gray-50 border-gray-200'
              }`}
              onClick={() => onDateSelect(day)}
            >
              <div className={`text-sm font-medium mb-2 ${
                isToday ? 'text-blue-600' : 'text-gray-900'
              }`}>
                {day.getDate()}
              </div>
              
              <div className="space-y-1">
                {dayEvents.map((event: any) => (
                  <div
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      onEventClick(event)
                    }}
                    className="text-xs p-1 bg-blue-100 text-blue-800 rounded cursor-pointer hover:bg-blue-200 transition-colors"
                  >
                    <div className="font-medium truncate">{event.title}</div>
                    <div className="flex items-center text-blue-600">
                      <Clock className="w-3 h-3 mr-1" />
                      {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
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

function ChecklistView({ categories, onToggleTask, profile }: any) {
  return (
    <div className="space-y-6">
      {Object.entries(categories).map(([categoryName, tasks]: [string, any]) => {
        if (tasks.length === 0) return null
        
        const categoryIcons = {
          hygiene: '🧼',
          chores: '🧹',
          backpack: '🎒',
          events: '📅'
        }

        const categoryColors = {
          hygiene: 'bg-blue-50 border-blue-200',
          chores: 'bg-green-50 border-green-200',
          backpack: 'bg-purple-50 border-purple-200',
          events: 'bg-orange-50 border-orange-200'
        }

        return (
          <div key={categoryName} className={`rounded-2xl shadow-sm p-6 border ${categoryColors[categoryName as keyof typeof categoryColors] || 'bg-white'}`}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="text-2xl mr-3">{categoryIcons[categoryName as keyof typeof categoryIcons] || '📋'}</span>
              {categoryName.charAt(0).toUpperCase() + categoryName.slice(1)}
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({tasks.filter((t: any) => t.completed).length}/{tasks.length})
              </span>
            </h3>
            
            <div className="space-y-3">
              {tasks.map((task: any) => (
                <TaskItem
                  key={task.id || task.title}
                  task={task}
                  onToggle={() => onToggleTask(task.id)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TaskItem({ task, onToggle }: { task: any, onToggle: () => void }) {
  return (
    <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border">
      <button
        onClick={onToggle}
        className="flex-shrink-0"
      >
        {task.completed ? (
          <CheckCircle2 className="w-6 h-6 text-green-500" />
        ) : (
          <Circle className="w-6 h-6 text-gray-300 hover:text-gray-400 transition-colors" />
        )}
      </button>
      
      <div className="flex-1">
        <div className={`font-medium ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
          {task.title}
        </div>
        {task.description && (
          <div className="text-sm text-gray-600 mt-1">{task.description}</div>
        )}
        {task.estimated_minutes && (
          <div className="flex items-center text-xs text-gray-500 mt-1">
            <Clock className="w-3 h-3 mr-1" />
            {task.estimated_minutes} min
          </div>
        )}
      </div>

      {task.priority === 1 && !task.completed && (
        <AlertCircle className="w-5 h-5 text-orange-500" />
      )}
    </div>
  )
}

function EventModal({ event, onClose, profile }: any) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-semibold text-gray-900">{event.title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-3 text-sm">
          <div className="flex items-center text-gray-600">
            <Clock className="w-4 h-4 mr-2" />
            {new Date(event.start_time).toLocaleString()}
          </div>
          
          {event.location && (
            <div className="flex items-center text-gray-600">
              <MapPin className="w-4 h-4 mr-2" />
              {event.location}
            </div>
          )}
          
          {event.captain_name && (
            <div className="flex items-center text-gray-600">
              <Users className="w-4 h-4 mr-2" />
              Captain: {event.captain_name}
            </div>
          )}
          
          {event.gear_needed && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="font-medium text-blue-900 mb-1">Don't Forget:</div>
              <div className="text-blue-800">{event.gear_needed}</div>
            </div>
          )}
          
          {event.contact_info && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="font-medium text-gray-900 mb-1">Contact:</div>
              <div className="text-gray-700">{event.contact_info}</div>
            </div>
          )}
        </div>
        
        <button
          onClick={onClose}
          className="w-full mt-6 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          Got it!
        </button>
      </div>
    </div>
  )
}

function QuickActionButton({ 
  icon, 
  label, 
  color, 
  onClick 
}: { 
  icon: React.ReactNode
  label: string
  color: 'blue' | 'green' | 'purple' | 'yellow'
  onClick: () => void
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
    green: 'bg-green-50 text-green-700 hover:bg-green-100',
    purple: 'bg-purple-50 text-purple-700 hover:bg-purple-100',
    yellow: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
  }

  return (
    <button 
      className={`p-4 rounded-xl font-medium transition-colors flex flex-col items-center space-y-2 ${colorClasses[color]}`}
      onClick={onClick}
    >
      {icon}
      <span className="text-sm">{label}</span>
    </button>
  )
}