'use client'

import { useState } from 'react'
import { 
  Clock, User, MapPin, Calendar, BookOpen, 
  ChevronLeft, ChevronRight, School, Edit3, RefreshCw
} from 'lucide-react'
import { 
  getScheduleForChild, 
  getTodaysPeriodsForChild, 
  getCurrentDayType,
  type SchedulePeriod,
  type StudentSchedule
} from '@/lib/scheduleConfig'

interface ScheduleDisplayProps {
  childKey: string
  isParentView?: boolean
  showEditOptions?: boolean
}

export default function ScheduleDisplay({ 
  childKey, 
  isParentView = false, 
  showEditOptions = false 
}: ScheduleDisplayProps) {
  const [selectedDay, setSelectedDay] = useState<'A' | 'B'>(getCurrentDayType())
  const [viewMode, setViewMode] = useState<'today' | 'full'>('today')
  
  const schedule = getScheduleForChild(childKey)
  
  if (!schedule) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-yellow-600" />
          <span className="font-medium text-yellow-800">Schedule Not Available</span>
        </div>
        <p className="text-yellow-700 text-sm mt-1">
          {isParentView 
            ? "Upload this child's schedule to view their classes and teachers."
            : "Your schedule hasn't been uploaded yet. Ask a parent to add it!"
          }
        </p>
      </div>
    )
  }

  const todaysPeriods = getTodaysPeriodsForChild(childKey, selectedDay)
  const periods = viewMode === 'today' ? todaysPeriods : schedule.periods

  const renderPeriodCard = (period: SchedulePeriod, index: number) => (
    <div 
      key={`${period.period}-${period.days}`}
      className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              period.days === 'A' ? 'bg-blue-100 text-blue-800' : 
              period.days === 'B' ? 'bg-green-100 text-green-800' : 
              'bg-purple-100 text-purple-800'
            }`}>
              {period.period}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{period.course}</h3>
              <p className="text-sm text-gray-600">{period.days} Day{period.length === 'Y' ? ' • Year' : ''}</p>
            </div>
          </div>
          
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-gray-700">{period.teacher}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="text-gray-700">Room {period.room}</span>
            </div>
            {period.section && (
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700">Section {period.section}</span>
              </div>
            )}
          </div>
        </div>
        
        {showEditOptions && (
          <button className="text-gray-400 hover:text-gray-600">
            <Edit3 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`${
        isParentView 
          ? 'bg-gradient-to-r from-blue-500 to-indigo-500' 
          : 'bg-gradient-to-r from-green-500 to-blue-500'
      } text-white p-6 rounded-lg`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {isParentView ? `${schedule.studentName}'s Schedule` : 'My Schedule'}
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2">
                <School className="w-4 h-4" />
                <span className="text-sm">{schedule.school}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">{schedule.schoolYear}</span>
              </div>
            </div>
          </div>
          
          {showEditOptions && (
            <button className="flex items-center gap-2 bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg transition-colors">
              <RefreshCw className="w-4 h-4" />
              Update Schedule
            </button>
          )}
        </div>
      </div>

      {/* View Controls */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Day Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Day:</span>
              <div className="flex bg-gray-100 rounded-lg p-1">
                {(['A', 'B'] as const).map(day => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      selectedDay === day
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {day} Day
                  </button>
                ))}
              </div>
            </div>

            {/* View Mode Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">View:</span>
              <div className="flex bg-gray-100 rounded-lg p-1">
                {([
                  { id: 'today', label: 'Today' },
                  { id: 'full', label: 'Full Schedule' }
                ] as const).map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => setViewMode(mode.id)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      viewMode === mode.id
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Current Day Indicator */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>Today is {getCurrentDayType()} Day</span>
          </div>
        </div>
      </div>

      {/* Schedule Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {viewMode === 'today' 
              ? `${selectedDay} Day Classes (${periods.length} periods)` 
              : `All Classes (${periods.length} periods)`
            }
          </h2>
          {viewMode === 'today' && (
            <span className="text-sm text-gray-600">
              Showing {selectedDay} Day schedule
            </span>
          )}
        </div>

        {periods.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {periods.map((period, index) => renderPeriodCard(period, index))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No classes scheduled for {selectedDay} Day</p>
          </div>
        )}
      </div>

      {/* Schedule Info */}
      <div className="bg-gray-50 border rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-2">Schedule Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Schedule Type:</span>
            <p className="text-gray-600">{schedule.scheduleType}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Last Updated:</span>
            <p className="text-gray-600">{schedule.lastUpdated.toLocaleDateString()}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Total Classes:</span>
            <p className="text-gray-600">{schedule.periods.length} periods</p>
          </div>
        </div>
      </div>
    </div>
  )
}