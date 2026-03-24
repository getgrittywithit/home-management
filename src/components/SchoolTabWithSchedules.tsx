'use client'

import { useState } from 'react'
import {
  BookOpen, Users, Calendar, ChevronDown,
  School, Clock, User, MapPin, GraduationCap, Home as HomeIcon
} from 'lucide-react'
import ScheduleDisplay from './ScheduleDisplay'
import HomeschoolTab from './HomeschoolTab'
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
  const [activeSubTab, setActiveSubTab] = useState<'homeschool' | 'public'>('homeschool')
  const [selectedChild, setSelectedChild] = useState<string>('zoey')

  const familyData = getAllFamilyData()
  const publicSchoolKids = familyData.children.filter(c => c.school.name !== 'Homeschool')
  const selectedChildData = familyData.children.find(child =>
    child.name.toLowerCase() === selectedChild
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">School Management</h1>
            <p className="text-blue-100">Homeschool + public school schedules and information</p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            <span className="text-sm">{familyData.schoolYear}</span>
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="bg-white border rounded-lg">
        <div className="flex border-b">
          <button
            onClick={() => setActiveSubTab('homeschool')}
            className={`flex items-center gap-2 px-6 py-3 font-medium ${
              activeSubTab === 'homeschool'
                ? 'border-b-2 border-teal-500 text-teal-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <HomeIcon className="w-4 h-4" />
            Homeschool
            <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">4 kids</span>
          </button>
          <button
            onClick={() => setActiveSubTab('public')}
            className={`flex items-center gap-2 px-6 py-3 font-medium ${
              activeSubTab === 'public'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <School className="w-4 h-4" />
            Public School
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">2 kids</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeSubTab === 'homeschool' ? (
            <HomeschoolTab />
          ) : (
            <div className="space-y-6">
              {/* Public School Kids Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {publicSchoolKids.map(child => (
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
                        <div className="mt-4">
                          <button
                            onClick={() => setSelectedChild(child.name.toLowerCase())}
                            className={`text-sm px-3 py-1 rounded-full ${
                              selectedChild === child.name.toLowerCase()
                                ? 'bg-blue-500 text-white'
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            }`}
                          >
                            View Schedule
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Schedule Display */}
              {selectedChildData && selectedChildData.school.name !== 'Homeschool' && (
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <label className="font-medium text-gray-700">Schedule for:</label>
                    <div className="relative">
                      <select
                        value={selectedChild}
                        onChange={(e) => setSelectedChild(e.target.value)}
                        className="appearance-none bg-white border rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {publicSchoolKids.map(child => (
                          <option key={child.id} value={child.name.toLowerCase()}>
                            {child.fullName} ({child.grade})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <ScheduleDisplay
                    childKey={selectedChild}
                    isParentView={true}
                    showEditOptions={true}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
