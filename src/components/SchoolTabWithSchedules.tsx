'use client'

import { useState } from 'react'
import { 
  BookOpen, Users, Calendar, ChevronDown, 
  School, Clock, User, MapPin, GraduationCap
} from 'lucide-react'
import ScheduleDisplay from './ScheduleDisplay'
import { getAllFamilyData } from '@/lib/familyConfig'

interface Child {
  id: string
  name: string
  grade: string
  school: string
}

interface SchoolTabWithSchedulesProps {
  children: Child[]
}

export default function SchoolTabWithSchedules({ children }: SchoolTabWithSchedulesProps) {
  const [selectedChild, setSelectedChild] = useState<string>('amos')
  const [viewMode, setViewMode] = useState<'overview' | 'schedule'>('overview')
  
  const familyData = getAllFamilyData()
  const selectedChildData = familyData.children.find(child => 
    child.name.toLowerCase() === selectedChild
  )

  const renderOverview = () => (
    <div className="space-y-6">
      {/* School Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {familyData.children.map(child => (
          <div key={child.id} className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{child.fullName}</h3>
                <p className="text-sm text-gray-600 mb-2">{child.grade}</p>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <School className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700">{child.school.name}</span>
                  </div>
                  {child.teachers && child.teachers.length > 0 && (
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">{child.teachers.length} teachers</span>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex gap-2">
                  <button 
                    onClick={() => {
                      setSelectedChild(child.name.toLowerCase())
                      setViewMode('schedule')
                    }}
                    className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-200"
                  >
                    View Schedule
                  </button>
                  <button className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full hover:bg-gray-200">
                    Teachers
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border rounded-lg p-6">
        <h3 className="font-bold text-gray-900 mb-4">School Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">3</div>
            <div className="text-sm text-gray-600">Schools</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{familyData.children.length}</div>
            <div className="text-sm text-gray-600">Students</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {familyData.children.reduce((total, child) => total + (child.teachers?.length || 0), 0)}
            </div>
            <div className="text-sm text-gray-600">Teachers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{familyData.schoolYear}</div>
            <div className="text-sm text-gray-600">School Year</div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">School Management</h1>
            <p className="text-blue-100">Manage school schedules, teachers, and information</p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            <span className="text-sm">{familyData.schoolYear}</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border rounded-lg">
        <div className="flex border-b">
          <button
            onClick={() => setViewMode('overview')}
            className={`flex items-center gap-2 px-6 py-3 font-medium ${
              viewMode === 'overview'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <School className="w-4 h-4" />
            School Overview
          </button>
          <button
            onClick={() => setViewMode('schedule')}
            className={`flex items-center gap-2 px-6 py-3 font-medium ${
              viewMode === 'schedule'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            Schedule View
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {viewMode === 'overview' ? (
            renderOverview()
          ) : (
            <div className="space-y-6">
              {/* Child Selector for Schedule View */}
              <div className="flex items-center gap-4">
                <label className="font-medium text-gray-700">View schedule for:</label>
                <div className="relative">
                  <select
                    value={selectedChild}
                    onChange={(e) => setSelectedChild(e.target.value)}
                    className="appearance-none bg-white border rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {familyData.children.map(child => (
                      <option key={child.id} value={child.name.toLowerCase()}>
                        {child.fullName} ({child.grade})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Schedule Display */}
              {selectedChildData && (
                <ScheduleDisplay 
                  childKey={selectedChild}
                  isParentView={true}
                  showEditOptions={true}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}