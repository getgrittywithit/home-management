'use client'

import { useState } from 'react'
import {
  Users, School, DollarSign, Plus, Trash2,
  BookOpen, Award
} from 'lucide-react'
import {
  CURRENT_GRADES, SCHOOL_TYPE, SCHOOL_ASSIGNMENTS, SCHOOLS,
  TEACHER_ASSIGNMENTS, EXTRACURRICULARS, CHORE_PAY_SCALE,
} from '@/lib/familyConfig'

interface FamilyConfigAdminProps {}

const KIDS = ['amos', 'zoey', 'kaylee', 'ellie', 'wyatt', 'hannah'] as const
const KID_LABELS: Record<string, string> = {
  amos: 'Amos', zoey: 'Zoey', kaylee: 'Kaylee', ellie: 'Ellie', wyatt: 'Wyatt', hannah: 'Hannah',
}

export default function FamilyConfigAdmin({}: FamilyConfigAdminProps) {
  const [activeSection, setActiveSection] = useState<'grades' | 'teachers' | 'chores' | 'extracurriculars'>('grades')
  const [activities, setActivities] = useState<Record<string, string[]>>({ ...EXTRACURRICULARS })
  const [newActivity, setNewActivity] = useState<Record<string, string>>({})

  const sections = [
    { id: 'grades', name: 'Grades & Schools', icon: School, color: 'bg-blue-500' },
    { id: 'teachers', name: 'Teachers', icon: BookOpen, color: 'bg-green-500' },
    { id: 'chores', name: 'Chore Pay Scale', icon: DollarSign, color: 'bg-purple-500' },
    { id: 'extracurriculars', name: 'Activities', icon: Award, color: 'bg-orange-500' },
  ]

  // ── Grades & Schools ──
  const renderGradesSection = () => (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-lg border">
        <h3 className="font-bold text-blue-800 mb-2">School Year 2025-2026</h3>
        <p className="text-blue-700 text-sm">Current grade levels and school assignments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {KIDS.map(kid => {
          const grade = CURRENT_GRADES[kid]
          const schoolKey = SCHOOL_ASSIGNMENTS[kid]
          const school = SCHOOLS[schoolKey]
          const schoolType = SCHOOL_TYPE[kid]

          return (
            <div key={kid} className="border rounded-lg p-4 bg-white">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  schoolType === 'homeschool' ? 'bg-teal-100' : 'bg-blue-100'
                }`}>
                  <Users className={`w-4 h-4 ${schoolType === 'homeschool' ? 'text-teal-600' : 'text-blue-600'}`} />
                </div>
                <h4 className="font-semibold">{KID_LABELS[kid]}</h4>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  schoolType === 'homeschool' ? 'bg-teal-100 text-teal-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {schoolType === 'homeschool' ? 'Homeschool' : 'Public'}
                </span>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <div><span className="text-gray-500">Grade:</span> {grade}</div>
                <div><span className="text-gray-500">School:</span> {school?.name || 'Homeschool'}</div>
                {school?.address && <div className="text-xs text-gray-400">{school.address}</div>}
                {school?.phone && <div className="text-xs text-gray-400">{school.phone}</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  // ── Teachers ──
  const renderTeachersSection = () => (
    <div className="space-y-4">
      <div className="bg-green-50 p-4 rounded-lg border">
        <h3 className="font-bold text-green-800 mb-2">Teacher Assignments</h3>
        <p className="text-green-700 text-sm">Current semester teacher assignments from school schedules</p>
      </div>

      <div className="space-y-6">
        {KIDS.map(kid => {
          const teachers = TEACHER_ASSIGNMENTS[kid] || []
          const schoolType = SCHOOL_TYPE[kid]

          return (
            <div key={kid} className="border rounded-lg p-4 bg-white">
              <h4 className="font-semibold mb-3">{KID_LABELS[kid]}&apos;s Teachers</h4>
              {schoolType === 'homeschool' ? (
                <p className="text-sm text-gray-400 italic">Homeschooled — no teacher assignments</p>
              ) : teachers.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No teachers assigned yet</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {teachers.map((t, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm bg-gray-50 rounded px-3 py-2">
                      <span className="font-medium text-gray-900">{t.name}</span>
                      <span className="text-gray-400">—</span>
                      <span className="text-gray-600">{t.subject}</span>
                      {t.room && <span className="text-xs text-gray-400 ml-auto">Rm {t.room}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )

  // ── Chore Pay Scale ──
  const renderChoresSection = () => (
    <div className="space-y-4">
      <div className="bg-purple-50 p-4 rounded-lg border">
        <h3 className="font-bold text-purple-800 mb-2">Chore Payment System</h3>
        <p className="text-purple-700 text-sm">Monthly targets and daily chore requirements</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {KIDS.map(kid => {
          const pay = CHORE_PAY_SCALE[kid]
          return (
            <div key={kid} className="border rounded-lg p-4 bg-white">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-4 h-4 text-purple-600" />
                <h4 className="font-semibold">{KID_LABELS[kid]}</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Monthly Target:</span>
                  <span className="font-medium">${pay.monthlyTarget}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Daily Paid Chores:</span>
                  <span className="font-medium">{pay.dailyPaid}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Required Daily:</span>
                  <span className="font-medium">{pay.requiredDaily}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  // ── Extracurriculars ──
  const addActivity = (kid: string) => {
    const value = newActivity[kid]?.trim()
    if (!value) return
    setActivities(prev => ({
      ...prev,
      [kid]: [...(prev[kid] || []), value],
    }))
    setNewActivity(prev => ({ ...prev, [kid]: '' }))
  }

  const removeActivity = (kid: string, index: number) => {
    setActivities(prev => ({
      ...prev,
      [kid]: (prev[kid] || []).filter((_, i) => i !== index),
    }))
  }

  const renderExtracurricularsSection = () => (
    <div className="space-y-4">
      <div className="bg-orange-50 p-4 rounded-lg border">
        <h3 className="font-bold text-orange-800 mb-2">Extracurricular Activities</h3>
        <p className="text-orange-700 text-sm">Track sports, clubs, and activities for each child</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {KIDS.map(kid => {
          const kidActivities = activities[kid] || []
          return (
            <div key={kid} className="border rounded-lg p-4 bg-white">
              <h4 className="font-semibold mb-3">{KID_LABELS[kid]}&apos;s Activities</h4>
              {kidActivities.length === 0 ? (
                <p className="text-sm text-gray-400 italic mb-2">No activities yet</p>
              ) : (
                <div className="space-y-1.5 mb-3">
                  {kidActivities.map((activity, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm bg-gray-50 rounded px-3 py-2">
                      <span className="flex-1">{activity}</span>
                      <button
                        onClick={() => removeActivity(kid, idx)}
                        className="text-gray-400 hover:text-red-500"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newActivity[kid] || ''}
                  onChange={e => setNewActivity(prev => ({ ...prev, [kid]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addActivity(kid)}
                  placeholder="Add activity..."
                  className="flex-1 text-sm border rounded px-2 py-1.5"
                />
                <button
                  onClick={() => addActivity(kid)}
                  className="text-sm text-orange-600 hover:text-orange-800 px-2"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  const renderContent = () => {
    switch (activeSection) {
      case 'grades': return renderGradesSection()
      case 'teachers': return renderTeachersSection()
      case 'chores': return renderChoresSection()
      case 'extracurriculars': return renderExtracurricularsSection()
      default: return renderGradesSection()
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold">Family Configuration</h1>
        <p className="text-indigo-100">View and manage family information</p>
      </div>

      {/* Section Navigation */}
      <div className="bg-white rounded-lg border">
        <div className="flex border-b overflow-x-auto">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id as any)}
              className={`flex items-center gap-2 px-6 py-3 font-medium border-r last:border-r-0 shrink-0 ${
                activeSection === section.id
                  ? 'bg-gray-50 text-gray-900 border-b-2 border-indigo-500'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <section.icon className="w-4 h-4" />
              {section.name}
            </button>
          ))}
        </div>

        <div className="p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}
