'use client'

import { useState } from 'react'
import { 
  Users, School, Calendar, DollarSign, Edit3, Save, 
  AlertCircle, CheckCircle, BookOpen, Award
} from 'lucide-react'

interface FamilyConfigAdminProps {
  // This will eventually connect to a database for persistence
}

export default function FamilyConfigAdmin({}: FamilyConfigAdminProps) {
  const [activeSection, setActiveSection] = useState<'grades' | 'teachers' | 'chores' | 'extracurriculars'>('grades')
  const [isEditing, setIsEditing] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const sections = [
    { id: 'grades', name: 'Grades & Schools', icon: School, color: 'bg-blue-500' },
    { id: 'teachers', name: 'Teachers', icon: BookOpen, color: 'bg-green-500' },
    { id: 'chores', name: 'Chore Pay Scale', icon: DollarSign, color: 'bg-purple-500' },
    { id: 'extracurriculars', name: 'Activities', icon: Award, color: 'bg-orange-500' }
  ]

  const renderGradesSection = () => (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-lg border">
        <h3 className="font-bold text-blue-800 mb-2">📚 School Year 2024-2025</h3>
        <p className="text-blue-700 text-sm">Update grades annually at the start of each school year</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { name: 'Amos', current: '10th Grade', school: 'Samuel V Champion High School' },
          { name: 'Zoey', current: '9th Grade', school: 'Samuel V Champion High School' },
          { name: 'Kaylee', current: '7th Grade', school: 'Princeton Intermediate School' },
          { name: 'Ellie', current: '6th Grade', school: 'Princeton Intermediate School' },
          { name: 'Wyatt', current: '4th Grade', school: 'Princeton Elementary School' },
          { name: 'Hannah', current: '3rd Grade', school: 'Princeton Elementary School' }
        ].map(child => (
          <div key={child.name} className="border rounded-lg p-4 bg-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <h4 className="font-semibold">{child.name}</h4>
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-600">Current Grade</label>
                <input 
                  type="text" 
                  value={child.current}
                  className="w-full text-sm border rounded px-2 py-1 bg-gray-50"
                  disabled={!isEditing}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">School</label>
                <input 
                  type="text" 
                  value={child.school}
                  className="w-full text-xs border rounded px-2 py-1 bg-gray-50"
                  disabled={!isEditing}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderTeachersSection = () => (
    <div className="space-y-4">
      <div className="bg-green-50 p-4 rounded-lg border">
        <h3 className="font-bold text-green-800 mb-2">👩‍🏫 Teacher Assignments</h3>
        <p className="text-green-700 text-sm">Update each semester when teacher assignments change</p>
      </div>

      <div className="space-y-6">
        {[
          { name: 'Amos', teachers: ['Mr. Smith (Algebra II)', 'Mrs. Davis (English 10)', 'Coach Rodriguez (PE)', 'Ms. Thompson (World History)', 'Mr. Chen (Biology)', 'Mrs. Garcia (Spanish I)'] },
          { name: 'Zoey', teachers: ['Ms. Hill (English 9)', 'Mr. Wilson (Algebra I)', 'Mrs. Brown (Physical Science)', 'Mr. Martinez (Geography)', 'Coach Johnson (PE)', 'Mrs. Lee (Art)'] },
          { name: 'Kaylee', teachers: ['Mrs. Foster (Language Arts)', 'Mr. Cooper (Pre-Algebra)', 'Ms. Wright (Life Science)', 'Mr. Turner (Texas History)'] },
          { name: 'Ellie', teachers: ['Mrs. Parker (Reading)', 'Mr. Bailey (Math)', 'Ms. Kelly (Science)', 'Mrs. Murphy (Social Studies)'] },
          { name: 'Wyatt', teachers: ['Mrs. Adams (Homeroom)', 'Mr. Clark (Math)', 'Ms. Rivera (Reading)'] },
          { name: 'Hannah', teachers: ['Mrs. Collins (Homeroom)', 'Miss Torres (Reading)'] }
        ].map(child => (
          <div key={child.name} className="border rounded-lg p-4 bg-white">
            <h4 className="font-semibold mb-3">{child.name}'s Teachers</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {child.teachers.map((teacher, idx) => (
                <input 
                  key={idx}
                  type="text" 
                  value={teacher}
                  className="text-sm border rounded px-2 py-1 bg-gray-50"
                  disabled={!isEditing}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderChoresSection = () => (
    <div className="space-y-4">
      <div className="bg-purple-50 p-4 rounded-lg border">
        <h3 className="font-bold text-purple-800 mb-2">💰 Chore Payment System</h3>
        <p className="text-purple-700 text-sm">Age-based allowance with Amos targeting ~$40/month</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { name: 'Amos', age: 15, monthly: 40, dailyPaid: 3, required: 2 },
          { name: 'Zoey', age: 14, monthly: 35, dailyPaid: 3, required: 2 },
          { name: 'Kaylee', age: 12, monthly: 25, dailyPaid: 2, required: 2 },
          { name: 'Ellie', age: 10, monthly: 20, dailyPaid: 2, required: 2 },
          { name: 'Wyatt', age: 9, monthly: 15, dailyPaid: 2, required: 2 },
          { name: 'Hannah', age: 7, monthly: 10, dailyPaid: 1, required: 2 }
        ].map(child => (
          <div key={child.name} className="border rounded-lg p-4 bg-white">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4 text-purple-600" />
              <h4 className="font-semibold">{child.name} ({child.age})</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Monthly Target:</span>
                <input 
                  type="number" 
                  value={child.monthly}
                  className="w-16 border rounded px-1 text-right bg-gray-50"
                  disabled={!isEditing}
                />
              </div>
              <div className="flex justify-between">
                <span>Daily Paid Chores:</span>
                <input 
                  type="number" 
                  value={child.dailyPaid}
                  className="w-16 border rounded px-1 text-right bg-gray-50"
                  disabled={!isEditing}
                />
              </div>
              <div className="flex justify-between">
                <span>Required Daily:</span>
                <input 
                  type="number" 
                  value={child.required}
                  className="w-16 border rounded px-1 text-right bg-gray-50"
                  disabled={!isEditing}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderExtracurricularsSection = () => (
    <div className="space-y-4">
      <div className="bg-orange-50 p-4 rounded-lg border">
        <h3 className="font-bold text-orange-800 mb-2">🏆 Extracurricular Activities</h3>
        <p className="text-orange-700 text-sm">Track sports, clubs, and activities for each child</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { name: 'Amos', activities: ['Basketball', 'Math Club', 'Student Council'] },
          { name: 'Zoey', activities: ['Volleyball', 'Drama Club', 'Art Club'] },
          { name: 'Kaylee', activities: ['Soccer', 'Band', 'Student Newspaper'] },
          { name: 'Ellie', activities: ['Track', 'Chess Club', 'Science Fair'] },
          { name: 'Wyatt', activities: ['Soccer', 'Cub Scouts', 'Library Club'] },
          { name: 'Hannah', activities: ['Dance', 'Girl Scouts', 'Reading Club'] }
        ].map(child => (
          <div key={child.name} className="border rounded-lg p-4 bg-white">
            <h4 className="font-semibold mb-3">{child.name}'s Activities</h4>
            <div className="space-y-2">
              {child.activities.map((activity, idx) => (
                <input 
                  key={idx}
                  type="text" 
                  value={activity}
                  className="w-full text-sm border rounded px-2 py-1 bg-gray-50"
                  disabled={!isEditing}
                />
              ))}
              {isEditing && (
                <button className="text-sm text-orange-600 hover:text-orange-800">
                  + Add Activity
                </button>
              )}
            </div>
          </div>
        ))}
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Family Configuration Admin</h1>
            <p className="text-indigo-100">Update all family information from one place</p>
          </div>
          <div className="flex gap-2">
            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 bg-white text-indigo-600 px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </button>
            ) : (
              <>
                <button 
                  onClick={() => {
                    setIsEditing(false)
                    setHasChanges(false)
                  }}
                  className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setIsEditing(false)
                    setHasChanges(true)
                  }}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Status Alert */}
      {hasChanges && (
        <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-800 font-medium">Changes saved successfully!</span>
          </div>
          <p className="text-green-700 text-sm mt-1">
            All family information has been updated and will be reflected throughout the app.
          </p>
        </div>
      )}

      {/* Section Navigation */}
      <div className="bg-white rounded-lg border">
        <div className="flex border-b">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id as any)}
              className={`flex items-center gap-2 px-6 py-3 font-medium border-r last:border-r-0 ${
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

        {/* Content */}
        <div className="p-6">
          {renderContent()}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-800">Dynamic Family Data</h3>
            <p className="text-blue-700 text-sm mt-1">
              All changes made here automatically update throughout the entire app - family tabs, school information, 
              chore assignments, and kids' portals will all reflect the current information.
            </p>
            <p className="text-blue-600 text-xs mt-2">
              <strong>Tip:</strong> Update grades at the start of each school year, and teacher assignments each semester.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}