'use client'

import { useState, useEffect } from 'react'
import { 
  BookOpen, Users, Phone, Mail, MapPin, Calendar, 
  Plus, Edit3, Save, X, Trash2, Clock, AlertCircle,
  CheckCircle2, Star, Settings, RotateCcw, Eye
} from 'lucide-react'
import { AMOS_SCHOOL_PROFILE, AMOS_PERIODS, getTodaysScheduleType } from '@/lib/amosScheduleData'
import { EnhancedSchoolProfile, getPeriodsForDay, PERIOD_COLORS } from '@/lib/enhancedSchoolConfig'

interface Child {
  id: string
  name: string
  grade: string
  school: string
}

interface EnhancedParentSchoolTabProps {
  children: Child[]
}

export default function EnhancedParentSchoolTab({ children }: EnhancedParentSchoolTabProps) {
  const [selectedChild, setSelectedChild] = useState<string>('amos-moses-504640')
  const [schoolProfile, setSchoolProfile] = useState<EnhancedSchoolProfile>(AMOS_SCHOOL_PROFILE)
  const [currentScheduleType, setCurrentScheduleType] = useState<'A' | 'B' | 'No School'>('A')
  const [selectedViewDay, setSelectedViewDay] = useState<'A' | 'B'>('A')
  const [isEditing, setIsEditing] = useState<string | null>(null)

  useEffect(() => {
    const scheduleType = getTodaysScheduleType()
    setCurrentScheduleType(scheduleType)
    if (scheduleType !== 'No School') {
      setSelectedViewDay(scheduleType)
    }
  }, [])

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const getTodaysPeriods = () => {
    if (currentScheduleType === 'No School') return []
    return getPeriodsForDay(schoolProfile.periods, currentScheduleType as any)
  }

  const getViewPeriods = () => {
    return getPeriodsForDay(schoolProfile.periods, selectedViewDay as any)
  }

  const isCurrentPeriod = (period: any) => {
    if (currentScheduleType === 'No School' || currentScheduleType !== selectedViewDay) return false
    
    const now = new Date()
    const currentTime = now.getHours() * 100 + now.getMinutes()
    const periodStart = parseInt(period.startTime.replace(':', ''))
    const periodEnd = parseInt(period.endTime.replace(':', ''))
    
    return currentTime >= periodStart && currentTime <= periodEnd
  }

  const getNextPeriod = () => {
    const todaysPeriods = getTodaysPeriods()
    const now = new Date()
    const currentTime = now.getHours() * 100 + now.getMinutes()
    
    return todaysPeriods.find(period => {
      const periodStart = parseInt(period.startTime.replace(':', ''))
      return currentTime < periodStart
    })
  }

  return (
    <div className="space-y-6">
      {/* Header with A/B Day Indicator */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">School Management</h1>
            <p className="text-blue-100">Enhanced A/B Day Schedule System</p>
          </div>
          <div className="text-right">
            <div className={`text-4xl font-bold px-4 py-2 rounded-lg ${
              currentScheduleType === 'A' ? 'bg-green-500' :
              currentScheduleType === 'B' ? 'bg-orange-500' :
              'bg-gray-500'
            }`}>
              {currentScheduleType === 'No School' ? '🏠' : currentScheduleType}
            </div>
            <div className="text-sm text-blue-100 mt-1">
              {currentScheduleType === 'No School' ? 'No School Today' : `${currentScheduleType} Day`}
            </div>
          </div>
        </div>
      </div>

      {/* Current Schedule Status */}
      {currentScheduleType !== 'No School' && (
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Current Schedule Status</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              Updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
          
          {(() => {
            const todaysPeriods = getTodaysPeriods()
            const currentPeriod = todaysPeriods.find(p => isCurrentPeriod(p))
            const nextPeriod = getNextPeriod()
            
            if (currentPeriod) {
              return (
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">
                      Currently in {currentPeriod.period}: {currentPeriod.subject}
                    </p>
                    <p className="text-sm text-green-700">
                      {currentPeriod.teacherName} • Room {currentPeriod.room} • 
                      Ends at {formatTime(currentPeriod.endTime)}
                    </p>
                  </div>
                </div>
              )
            } else if (nextPeriod) {
              return (
                <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">
                      Next: {nextPeriod.period}: {nextPeriod.subject}
                    </p>
                    <p className="text-sm text-blue-700">
                      {nextPeriod.teacherName} • Room {nextPeriod.room} • 
                      Starts at {formatTime(nextPeriod.startTime)}
                    </p>
                  </div>
                </div>
              )
            } else {
              return (
                <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-900">School day ended</p>
                    <p className="text-sm text-gray-700">No more classes today</p>
                  </div>
                </div>
              )
            }
          })()}
        </div>
      )}

      {/* Child Selector */}
      <div className="bg-white p-4 rounded-lg border">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Child</label>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedChild('amos-moses-504640')}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              selectedChild === 'amos-moses-504640'
                ? 'bg-blue-100 border-blue-500 text-blue-700'
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            Amos - 10th Grade (A/B Schedule)
          </button>
          {children.map(child => (
            child.id !== 'amos-moses-504640' && (
              <button
                key={child.id}
                onClick={() => setSelectedChild(child.id)}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  selectedChild === child.id
                    ? 'bg-blue-100 border-blue-500 text-blue-700'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {child.name} - {child.grade}
              </button>
            )
          ))}
        </div>
      </div>

      {/* A/B Day Schedule Viewer */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-purple-500" />
            <h2 className="text-xl font-bold">A/B Day Schedule</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedViewDay('A')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedViewDay === 'A' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              A Day
            </button>
            <button
              onClick={() => setSelectedViewDay('B')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedViewDay === 'B' 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              B Day
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {getViewPeriods().map((period, index) => (
            <div 
              key={period.id}
              className={`border rounded-lg p-4 transition-all ${
                isCurrentPeriod(period) 
                  ? 'border-green-500 bg-green-50 shadow-md' 
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-4 h-16 rounded"
                    style={{ backgroundColor: period.color }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-lg">{period.subject}</span>
                      <span className="text-sm bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {period.period} Period
                      </span>
                      {isCurrentPeriod(period) && (
                        <span className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded">
                          Current Class
                        </span>
                      )}
                    </div>
                    <p className="text-gray-700 font-medium">{period.teacherName}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        Room {period.room}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatTime(period.startTime)} - {formatTime(period.endTime)}
                      </span>
                      <span>({period.duration} min)</span>
                    </div>
                  </div>
                </div>
                <button className="text-blue-600 hover:text-blue-800">
                  <Eye className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Teachers List */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-6 h-6 text-green-500" />
          <h2 className="text-xl font-bold">Teachers ({schoolProfile.teachers.length})</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {schoolProfile.teachers.map(teacher => (
            <div key={teacher.id} className="border rounded-lg p-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-xl">👨‍🏫</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{teacher.name}</h3>
                  <p className="text-sm text-gray-600">{teacher.subject}</p>
                  <p className="text-sm text-gray-500">Room {teacher.room}</p>
                  
                  <div className="flex items-center gap-4 mt-2">
                    <a 
                      href={`mailto:${teacher.email}`}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                    >
                      <Mail className="w-4 h-4" />
                      Email
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* School Information */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-6 h-6 text-blue-500" />
          <h2 className="text-xl font-bold">School Information</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-2">Basic Info</h3>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">School:</span> {schoolProfile.school}</div>
              <div><span className="font-medium">Grade:</span> {schoolProfile.grade}</div>
              <div><span className="font-medium">Year:</span> {schoolProfile.schoolYear}</div>
              <div><span className="font-medium">Schedule Type:</span> {schoolProfile.scheduleType.name}</div>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Schedule Details</h3>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Start Date:</span> {schoolProfile.abSchedule?.startDate.toLocaleDateString()}</div>
              <div><span className="font-medium">Pattern:</span> Starts with {schoolProfile.abSchedule?.pattern === 'A-start' ? 'A' : 'B'} Day</div>
              <div><span className="font-medium">Total Classes:</span> {schoolProfile.periods.length}</div>
              <div><span className="font-medium">A Day Classes:</span> {schoolProfile.periods.filter(p => p.scheduleType === 'A').length}</div>
              <div><span className="font-medium">B Day Classes:</span> {schoolProfile.periods.filter(p => p.scheduleType === 'B').length}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}