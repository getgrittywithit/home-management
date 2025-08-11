'use client'

import { useState } from 'react'
import { 
  BookOpen, Users, Phone, Mail, MapPin, Calendar, 
  Plus, Edit3, Save, X, Trash2, UserPlus, School,
  Clock, AlertCircle, CheckCircle2, Star, Settings
} from 'lucide-react'
import { SAMPLE_SCHOOL_DATA, Teacher, SchoolClass, SchoolLink } from '@/lib/schoolConfig'

interface Child {
  id: string
  name: string
  grade: string
  school: string
}

interface ParentSchoolTabProps {
  children: Child[]
}

export default function ParentSchoolTab({ children }: ParentSchoolTabProps) {
  const [selectedChild, setSelectedChild] = useState<string>(children[0]?.id || '')
  const [schoolData, setSchoolData] = useState(SAMPLE_SCHOOL_DATA)
  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [showAddTeacher, setShowAddTeacher] = useState(false)
  const [showAddLink, setShowAddLink] = useState(false)

  const [newTeacher, setNewTeacher] = useState<Partial<Teacher>>({
    name: '',
    email: '',
    phone: '',
    subject: '',
    room: '',
    preferredContact: 'email'
  })

  const [newLink, setNewLink] = useState<Partial<SchoolLink>>({
    name: '',
    url: '',
    category: 'portal',
    description: ''
  })

  const handleSaveField = (field: string) => {
    // In production, this would call an API to save admin-controlled data
    console.log('Admin saving field:', field, 'Value:', editingValue)
    setIsEditing(null)
    setEditingValue('')
  }

  const handleAddTeacher = () => {
    if (newTeacher.name && newTeacher.email) {
      const teacher: Teacher = {
        id: `teacher-${Date.now()}`,
        name: newTeacher.name,
        email: newTeacher.email,
        phone: newTeacher.phone,
        subject: newTeacher.subject || '',
        room: newTeacher.room,
        preferredContact: newTeacher.preferredContact || 'email',
        locked: true // Admin-added teachers are locked
      }
      
      setSchoolData(prev => ({
        ...prev,
        teachers: [...prev.teachers, teacher]
      }))
      
      setNewTeacher({
        name: '',
        email: '',
        phone: '',
        subject: '',
        room: '',
        preferredContact: 'email'
      })
      setShowAddTeacher(false)
    }
  }

  const handleAddLink = () => {
    if (newLink.name && newLink.url) {
      const link: SchoolLink = {
        id: `link-${Date.now()}`,
        name: newLink.name,
        url: newLink.url,
        category: newLink.category || 'portal',
        description: newLink.description,
        locked: true // Admin-added links are locked
      }
      
      setSchoolData(prev => ({
        ...prev,
        links: [...prev.links, link]
      }))
      
      setNewLink({
        name: '',
        url: '',
        category: 'portal',
        description: ''
      })
      setShowAddLink(false)
    }
  }

  const removeTeacher = (teacherId: string) => {
    setSchoolData(prev => ({
      ...prev,
      teachers: prev.teachers.filter(t => t.id !== teacherId)
    }))
  }

  const removeLink = (linkId: string) => {
    setSchoolData(prev => ({
      ...prev,
      links: prev.links.filter(l => l.id !== linkId)
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold">School Management</h1>
        <p className="text-blue-100">Manage school information for your children</p>
      </div>

      {/* Child Selector */}
      <div className="bg-white p-4 rounded-lg border">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Child</label>
        <div className="flex gap-2">
          {children.map(child => (
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
          ))}
        </div>
      </div>

      {/* School Basic Info */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <School className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-bold">School Information</h2>
          </div>
          <button className="text-blue-600 hover:text-blue-800">
            <Settings className="w-5 h-5" />
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-600">School Name</label>
            <div className="font-medium text-gray-900">{schoolData.school}</div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Grade</label>
            <div className="font-medium text-gray-900">{schoolData.grade}</div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">School Year</label>
            <div className="font-medium text-gray-900">{schoolData.schoolYear}</div>
          </div>
        </div>
      </div>

      {/* Teachers Management */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-green-500" />
            <h2 className="text-xl font-bold">Teachers</h2>
          </div>
          <button
            onClick={() => setShowAddTeacher(true)}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Teacher
          </button>
        </div>

        {/* Add Teacher Form */}
        {showAddTeacher && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
            <h3 className="font-semibold mb-3">Add New Teacher</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={newTeacher.name || ''}
                  onChange={(e) => setNewTeacher(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Mrs. Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={newTeacher.subject || ''}
                  onChange={(e) => setNewTeacher(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Math & Science"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={newTeacher.email || ''}
                  onChange={(e) => setNewTeacher(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="teacher@school.edu"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={newTeacher.phone || ''}
                  onChange={(e) => setNewTeacher(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
                <input
                  type="text"
                  value={newTeacher.room || ''}
                  onChange={(e) => setNewTeacher(prev => ({ ...prev, room: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Room 205"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Contact</label>
                <select
                  value={newTeacher.preferredContact || 'email'}
                  onChange={(e) => setNewTeacher(prev => ({ ...prev, preferredContact: e.target.value as 'email' | 'phone' | 'both' }))}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="both">Both</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleAddTeacher}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
              >
                Add Teacher
              </button>
              <button
                onClick={() => setShowAddTeacher(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Teachers List */}
        <div className="space-y-4">
          {schoolData.teachers.map(teacher => (
            <div key={teacher.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-xl">👨‍🏫</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{teacher.name}</h3>
                    <p className="text-sm text-gray-600">{teacher.subject}</p>
                    {teacher.room && <p className="text-sm text-gray-500">Room {teacher.room}</p>}
                    
                    <div className="flex items-center gap-4 mt-2">
                      <a 
                        href={`mailto:${teacher.email}`}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                      >
                        <Mail className="w-4 h-4" />
                        {teacher.email}
                      </a>
                      {teacher.phone && (
                        <a 
                          href={`tel:${teacher.phone}`}
                          className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                        >
                          <Phone className="w-4 h-4" />
                          {teacher.phone}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeTeacher(teacher.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* School Links Management */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-purple-500" />
            <h2 className="text-xl font-bold">School Links</h2>
          </div>
          <button
            onClick={() => setShowAddLink(true)}
            className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Link
          </button>
        </div>

        {/* Add Link Form */}
        {showAddLink && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
            <h3 className="font-semibold mb-3">Add New Link</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link Name *</label>
                <input
                  type="text"
                  value={newLink.name || ''}
                  onChange={(e) => setNewLink(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Student Portal"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={newLink.category || 'portal'}
                  onChange={(e) => setNewLink(prev => ({ ...prev, category: e.target.value as any }))}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="portal">Portal</option>
                  <option value="grade">Grades</option>
                  <option value="assignment">Assignments</option>
                  <option value="resource">Resource</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">URL *</label>
                <input
                  type="url"
                  value={newLink.url || ''}
                  onChange={(e) => setNewLink(prev => ({ ...prev, url: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="https://portal.school.edu"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={newLink.description || ''}
                  onChange={(e) => setNewLink(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Main school login portal"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleAddLink}
                className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600"
              >
                Add Link
              </button>
              <button
                onClick={() => setShowAddLink(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Links List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {schoolData.links.map(link => (
            <div key={link.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{link.icon || '🔗'}</span>
                  <div>
                    <h3 className="font-medium text-gray-900">{link.name}</h3>
                    <p className="text-sm text-gray-600">{link.description}</p>
                    <a 
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline break-all"
                    >
                      {link.url}
                    </a>
                  </div>
                </div>
                <button
                  onClick={() => removeLink(link.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 border rounded-lg hover:bg-gray-50 text-center">
            <Calendar className="w-6 h-6 mx-auto mb-2 text-blue-500" />
            <div className="text-sm font-medium">School Calendar</div>
          </button>
          <button className="p-4 border rounded-lg hover:bg-gray-50 text-center">
            <Star className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
            <div className="text-sm font-medium">Report Cards</div>
          </button>
          <button className="p-4 border rounded-lg hover:bg-gray-50 text-center">
            <Clock className="w-6 h-6 mx-auto mb-2 text-green-500" />
            <div className="text-sm font-medium">Attendance</div>
          </button>
          <button className="p-4 border rounded-lg hover:bg-gray-50 text-center">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 text-red-500" />
            <div className="text-sm font-medium">Alerts</div>
          </button>
        </div>
      </div>
    </div>
  )
}