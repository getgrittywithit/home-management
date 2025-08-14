'use client'

import { useState, useEffect } from 'react'
import { 
  Phone, Mail, MapPin, Plus, Edit3, Trash2, Search, 
  Building2, User, Tag, ExternalLink, Copy, Check
} from 'lucide-react'

interface Contact {
  id: string
  name: string
  title?: string
  organization?: string
  phone?: string
  email?: string
  address?: string
  office?: string
  notes?: string
  tags: string[]
  importance: 'high' | 'medium' | 'low'
  lastContact?: Date
  createdAt: Date
}

interface ContactFormData {
  name: string
  title: string
  organization: string
  phone: string
  email: string
  address: string
  office: string
  notes: string
  tags: string[]
  importance: 'high' | 'medium' | 'low'
}

export default function ContactsTab() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [copiedField, setCopiedField] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    title: '',
    organization: '',
    phone: '',
    email: '',
    address: '',
    office: '',
    notes: '',
    tags: [],
    importance: 'medium'
  })

  // Predefined tag categories for consistent organization
  const tagCategories = {
    'School': ['CHS', 'Elementary', 'Middle School', 'High School', 'Principal', 'Nurse', 'Teacher', 'Counselor'],
    'Medical': ['Doctor', 'Dentist', 'Specialist', 'Hospital', 'Pharmacy', 'Emergency'],
    'Emergency': ['Police', 'Fire', 'Hospital', 'Poison Control', 'Family Emergency'],
    'Family': ['Extended Family', 'Babysitter', 'Friend', 'Neighbor'],
    'Services': ['Repair', 'Utilities', 'Insurance', 'Bank', 'Veterinarian']
  }

  useEffect(() => {
    loadContacts()
  }, [])

  const loadContacts = async () => {
    try {
      setIsLoading(true)
      
      // Load contacts from database
      const response = await fetch('/api/contacts')
      if (response.ok) {
        const data = await response.json()
        setContacts(data.map((contact: any) => ({
          ...contact,
          createdAt: new Date(contact.created_at),
          lastContact: contact.last_contact ? new Date(contact.last_contact) : undefined
        })))
      } else {
        // Fallback to mock data if API fails
        const mockContacts: Contact[] = [
        {
          id: 'laura-booth-chs-nurse',
          name: 'Laura T. Booth BSN, RN',
          title: 'School Nurse',
          organization: 'Champion High School',
          phone: '(830) 357-2609',
          email: 'laura.booth@boerneisd.net',
          address: '201 Charger Blvd. Boerne, TX 78006',
          office: 'A136',
          notes: 'Contacted about Amos\' vaccine waiver renewal - expires 05/10/2025',
          tags: ['CHS', 'Nurse', 'School'],
          importance: 'high',
          lastContact: new Date('2025-01-11'),
          createdAt: new Date('2025-01-11')
        },
        // Additional school contacts
        {
          id: 'sample-principal',
          name: 'Dr. Jane Smith',
          title: 'Principal',
          organization: 'Champion High School',
          phone: '(830) 357-2600',
          email: 'jane.smith@boerneisd.net',
          address: '201 Charger Blvd. Boerne, TX 78006',
          office: 'Main Office',
          tags: ['CHS', 'Principal', 'School'],
          importance: 'high',
          createdAt: new Date('2025-01-10')
        },
        {
          id: 'bmsn-pto-contact',
          name: 'BMSN PTO',
          title: 'Parent Teacher Organization',
          organization: 'Boerne Middle School North',
          phone: '(830) 357-3100',
          email: 'info@bmsnpto.org',
          address: '240 W Johns Rd, Boerne, TX 78006-2026',
          office: 'Main Office',
          notes: 'PTO Meeting dates, Chick-fil-A Days program, Spirit Wear purchases available. 25-26 school year information received.',
          tags: ['Middle School', 'PTO', 'School'],
          importance: 'medium',
          lastContact: new Date('2025-01-11'),
          createdAt: new Date('2025-01-11')
        },
        {
          id: 'mr-carr-bmsn-principal',
          name: 'Mr. Carr',
          title: 'Principal',
          organization: 'Boerne Middle School North',
          phone: '(830) 357-3100',
          email: 'principal@bmsn.boerneisd.net',
          address: '240 W Johns Rd, Boerne, TX 78006-2026',
          office: 'Principal\'s Office',
          notes: 'Technology AUP consent issue notification sent 01/11/2025. Contact via front office.',
          tags: ['Middle School', 'Principal', 'School'],
          importance: 'high',
          lastContact: new Date('2025-01-11'),
          createdAt: new Date('2025-01-11')
        },
        {
          id: 'boerne-isd-district',
          name: 'Boerne ISD District Office',
          title: 'School District',
          organization: 'Boerne Independent School District',
          phone: '(830) 357-2000',
          email: 'info@boerneisd.net',
          address: '235 Johns Rd., Boerne, TX 78006',
          office: 'District Office',
          notes: 'HB 1481 Cell Phone Policy: Off and Away for the Day. Technology AUP: www.boerneisd.net/aup',
          tags: ['District', 'Administration', 'School'],
          importance: 'medium',
          lastContact: new Date('2025-01-11'),
          createdAt: new Date('2025-01-11')
        },
        {
          id: 'marissa-acosta-nutrition',
          name: 'Marissa Acosta',
          title: 'Child Nutrition Contact',
          organization: 'Boerne ISD Child Nutrition',
          phone: '(830) 357-2165',
          email: 'marissa.acosta@boerneisd.net',
          address: '235 Johns Rd., Boerne, TX 78006',
          office: 'Child Nutrition Department',
          notes: 'PaySchools setup, meal pricing info. Breakfast: $2.30, Elementary Lunch: $3.40, MS/HS: $3.65',
          tags: ['District', 'Nutrition', 'School'],
          importance: 'medium',
          lastContact: new Date('2025-01-11'),
          createdAt: new Date('2025-01-11')
        },
        {
          id: 'vlada-buck-nutrition',
          name: 'Vlada Buck',
          title: 'Child Nutrition Contact',
          organization: 'Boerne ISD Child Nutrition',
          phone: '(830) 357-2165',
          email: 'vlada.buck@boerneisd.net',
          address: '235 Johns Rd., Boerne, TX 78006',
          office: 'Child Nutrition Department',
          notes: 'PaySchools support, free/reduced meal applications. $50 charge limit on accounts.',
          tags: ['District', 'Nutrition', 'School'],
          importance: 'medium',
          lastContact: new Date('2025-01-11'),
          createdAt: new Date('2025-01-11')
        },
        {
          id: 'erika-hill-english',
          name: 'Erika Hill',
          title: 'Honors English I Teacher',
          organization: 'Boerne High School',
          phone: '',
          email: 'erika.hill@boerneisd.net',
          address: '',
          office: 'Period 1 - Honors English I',
          notes: 'Zoey\'s 9th grade English teacher. Summer reading book required first day (physical copy).',
          tags: ['High School', 'Teacher', 'School', 'English'],
          importance: 'high',
          lastContact: new Date('2025-01-11'),
          createdAt: new Date('2025-01-11')
        }
      ]
      setContacts(mockContacts)
    } catch (error) {
      console.error('Failed to load contacts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getAllTags = () => {
    const allTags = new Set<string>()
    contacts.forEach(contact => {
      contact.tags.forEach(tag => allTags.add(tag))
    })
    return Array.from(allTags).sort()
  }

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = !searchTerm || 
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.organization?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.title?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.some(tag => contact.tags.includes(tag))
    
    return matchesSearch && matchesTags
  })

  const addContact = () => {
    if (!formData.name.trim()) return

    const newContact: Contact = {
      id: `contact-${Date.now()}`,
      ...formData,
      createdAt: new Date()
    }

    setContacts(prev => [newContact, ...prev])
    resetForm()
  }

  const startEdit = (contact: Contact) => {
    setEditingId(contact.id)
    setFormData({
      name: contact.name,
      title: contact.title || '',
      organization: contact.organization || '',
      phone: contact.phone || '',
      email: contact.email || '',
      address: contact.address || '',
      office: contact.office || '',
      notes: contact.notes || '',
      tags: contact.tags,
      importance: contact.importance
    })
    setShowAddForm(true)
  }

  const saveEdit = () => {
    if (!formData.name.trim() || !editingId) return

    setContacts(prev => prev.map(contact => 
      contact.id === editingId 
        ? { ...contact, ...formData }
        : contact
    ))
    resetForm()
  }

  const deleteContact = (id: string) => {
    setContacts(prev => prev.filter(contact => contact.id !== id))
  }

  const resetForm = () => {
    setFormData({
      name: '',
      title: '',
      organization: '',
      phone: '',
      email: '',
      address: '',
      office: '',
      notes: '',
      tags: [],
      importance: 'medium'
    })
    setShowAddForm(false)
    setEditingId(null)
  }

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high': return 'border-l-red-500'
      case 'medium': return 'border-l-yellow-500'
      case 'low': return 'border-l-green-500'
      default: return 'border-l-gray-300'
    }
  }

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const addTagToContact = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags : [...prev.tags, tag]
    }))
  }

  const removeTagFromContact = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Family Contacts</h1>
            <p className="text-teal-100">School, medical, emergency, and family contacts</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{contacts.length}</div>
            <div className="text-sm text-teal-100">Total Contacts</div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600"
          >
            <Plus className="w-4 h-4" />
            Add Contact
          </button>
        </div>

        {/* Tag Filters */}
        <div className="mt-4">
          <div className="flex flex-wrap gap-2">
            {getAllTags().map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-teal-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Tag className="w-3 h-3 inline mr-1" />
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Add/Edit Contact Form */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-lg font-semibold mb-4">
            {editingId ? 'Edit Contact' : 'Add New Contact'}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Full Name *"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="p-3 border rounded-lg"
            />
            <input
              type="text"
              placeholder="Title/Position"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="p-3 border rounded-lg"
            />
            <input
              type="text"
              placeholder="Organization/School"
              value={formData.organization}
              onChange={(e) => setFormData(prev => ({ ...prev, organization: e.target.value }))}
              className="p-3 border rounded-lg"
            />
            <input
              type="text"
              placeholder="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="p-3 border rounded-lg"
            />
            <input
              type="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="p-3 border rounded-lg"
            />
            <input
              type="text"
              placeholder="Office/Room Number"
              value={formData.office}
              onChange={(e) => setFormData(prev => ({ ...prev, office: e.target.value }))}
              className="p-3 border rounded-lg"
            />
          </div>

          <div className="mt-4">
            <input
              type="text"
              placeholder="Address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              className="w-full p-3 border rounded-lg"
            />
          </div>

          <div className="mt-4">
            <textarea
              placeholder="Notes..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full p-3 border rounded-lg"
              rows={3}
            />
          </div>

          {/* Tags Selection */}
          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">Tags</label>
            <div className="space-y-2">
              {Object.entries(tagCategories).map(([category, tags]) => (
                <div key={category}>
                  <h4 className="text-xs font-medium text-gray-600 mb-1">{category}</h4>
                  <div className="flex flex-wrap gap-1">
                    {tags.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => addTagToContact(tag)}
                        className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Selected Tags */}
            {formData.tags.length > 0 && (
              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Selected Tags</label>
                <div className="flex flex-wrap gap-1">
                  {formData.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-teal-100 text-teal-800 text-xs rounded flex items-center gap-1"
                    >
                      {tag}
                      <button
                        onClick={() => removeTagFromContact(tag)}
                        className="text-teal-600 hover:text-teal-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-6">
            <select
              value={formData.importance}
              onChange={(e) => setFormData(prev => ({ ...prev, importance: e.target.value as any }))}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="low">Low Importance</option>
              <option value="medium">Medium Importance</option>
              <option value="high">High Importance</option>
            </select>

            <div className="flex gap-2">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={editingId ? saveEdit : addContact}
                className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600"
              >
                {editingId ? 'Save Changes' : 'Add Contact'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contacts List */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">
            Contacts ({filteredContacts.length})
            {selectedTags.length > 0 && (
              <span className="text-sm text-gray-500 ml-2">
                filtered by: {selectedTags.join(', ')}
              </span>
            )}
          </h2>
        </div>

        <div className="divide-y">
          {filteredContacts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No contacts found</p>
            </div>
          ) : (
            filteredContacts.map(contact => (
              <div key={contact.id} className={`p-4 hover:bg-gray-50 border-l-4 ${getImportanceColor(contact.importance)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900">{contact.name}</h3>
                      {contact.importance === 'high' && (
                        <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                          High Priority
                        </span>
                      )}
                    </div>
                    
                    {contact.title && (
                      <p className="text-sm text-gray-600">{contact.title}</p>
                    )}
                    
                    {contact.organization && (
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {contact.organization}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-4 mt-2 text-sm">
                      {contact.phone && (
                        <button
                          onClick={() => copyToClipboard(contact.phone!, `${contact.id}-phone`)}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                        >
                          <Phone className="w-3 h-3" />
                          {contact.phone}
                          {copiedField === `${contact.id}-phone` ? 
                            <Check className="w-3 h-3 text-green-500" /> : 
                            <Copy className="w-3 h-3" />
                          }
                        </button>
                      )}
                      
                      {contact.email && (
                        <button
                          onClick={() => copyToClipboard(contact.email!, `${contact.id}-email`)}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                        >
                          <Mail className="w-3 h-3" />
                          {contact.email}
                          {copiedField === `${contact.id}-email` ? 
                            <Check className="w-3 h-3 text-green-500" /> : 
                            <Copy className="w-3 h-3" />
                          }
                        </button>
                      )}

                      {contact.office && (
                        <span className="flex items-center gap-1 text-gray-600">
                          <MapPin className="w-3 h-3" />
                          {contact.office}
                        </span>
                      )}
                    </div>

                    {contact.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {contact.tags.map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {contact.notes && (
                      <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                        {contact.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => startEdit(contact)}
                      className="text-gray-400 hover:text-blue-500"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteContact(contact.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}