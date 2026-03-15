'use client'

import { useState, useEffect } from 'react'
import { 
  Calendar, MapPin, Clock, Heart, Star, Users, 
  Edit3, Save, X, Plus, Trash2, Camera, Palette,
  Baby, Cake, Home, School, Trophy
} from 'lucide-react'
import { 
  AboutMeProfile, 
  SAMPLE_ABOUT_ME_DATA, 
  ALL_KIDS_BIRTH_DATA,
  COLOR_OPTIONS, 
  ANIMAL_OPTIONS, 
  THEME_OPTIONS,
  SPORT_OPTIONS,
  INSTRUMENT_OPTIONS,
  ART_OPTIONS,
  getVisibleFields
} from '@/lib/aboutMeConfig'
import { getFamilyMemberData } from '@/lib/familyConfig'

interface AboutMeTabProps {
  childAge: number
  childId: string
  childName?: string
  initialData?: AboutMeProfile
}

export default function AboutMeTab({ childAge, childId, childName, initialData }: AboutMeTabProps) {
  // Get real birth data based on child name
  const childKey = childName?.toLowerCase() || ''
  const familyData = childKey ? getFamilyMemberData(childKey) : null
  const birthData = childKey ? ALL_KIDS_BIRTH_DATA[childKey] : null
  
  
  // Initialize with real birth data if available
  const defaultData = birthData ? {
    ...SAMPLE_ABOUT_ME_DATA,
    childId,
    birthCertificate: birthData
  } : { ...SAMPLE_ABOUT_ME_DATA, childId }
  
  const [aboutData, setAboutData] = useState<AboutMeProfile>(
    initialData || defaultData
  )
  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [newInterest, setNewInterest] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const visibleFields = getVisibleFields(childAge)

  // Load child-specific data on mount
  useEffect(() => {
    if (!initialData) {
      // If we have birth data, use it directly instead of API call
      if (birthData) {
        setIsLoading(true)
        const dataWithRealBirth = {
          ...SAMPLE_ABOUT_ME_DATA,
          childId,
          birthCertificate: birthData,
          personal: {
            ...SAMPLE_ABOUT_ME_DATA.personal,
            nickname: childName || ''
          }
        }
        setAboutData(dataWithRealBirth)
        setIsLoading(false)
      } else {
        loadAboutMeData()
      }
    } else {
      setIsLoading(false)
    }
  }, [childId, initialData, birthData, childName])

  const loadAboutMeData = async () => {
    try {
      setIsLoading(true)
      
      // First, try to use the real birth data we already have
      if (birthData) {
        const dataWithRealBirth = {
          ...SAMPLE_ABOUT_ME_DATA,
          childId,
          birthCertificate: birthData,
          personal: {
            ...SAMPLE_ABOUT_ME_DATA.personal,
            nickname: childName || ''
          }
        }
        setAboutData(dataWithRealBirth)
        setIsLoading(false)
        return
      }
      
      // If no birth data, try API
      const response = await fetch(`/api/kids/about-me?childId=${childId}`)
      if (response.ok) {
        const data = await response.json()
        // Convert birthDate string back to Date object
        if (data.birthCertificate?.birthDate) {
          data.birthCertificate.birthDate = new Date(data.birthCertificate.birthDate)
        }
        setAboutData(data)
      } else {
        console.error('Failed to load About Me data')
        // Keep the default data with the correct childId
        setAboutData(prev => ({ ...prev, childId }))
      }
    } catch (error) {
      console.error('Error loading About Me data:', error)
      // Keep the default data with the correct childId
      setAboutData(prev => ({ ...prev, childId }))
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async (field: string) => {
    try {
      const [section, subField] = field.includes('.') ? field.split('.') : [null, field]
      
      const updateData = {
        childId,
        field: subField || field,
        value: editingValue,
        section: section,
        isLocked: false
      }

      const response = await fetch('/api/kids/about-me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        const result = await response.json()
        setAboutData(result.data)
      } else {
        console.error('Failed to save About Me data')
      }
    } catch (error) {
      console.error('Error saving About Me data:', error)
    }
    
    setIsEditing(null)
    setEditingValue('')
  }

  const handleCancel = () => {
    setIsEditing(null)
    setEditingValue('')
  }

  const handleEdit = (field: string, currentValue: string) => {
    setIsEditing(field)
    setEditingValue(currentValue || '')
  }

  const addInterest = (category: keyof typeof aboutData.interests) => {
    if (newInterest.trim()) {
      setAboutData(prev => ({
        ...prev,
        interests: {
          ...prev.interests,
          [category]: [...prev.interests[category], newInterest.trim()]
        }
      }))
      setNewInterest('')
    }
  }

  const removeInterest = (category: keyof typeof aboutData.interests, index: number) => {
    setAboutData(prev => ({
      ...prev,
      interests: {
        ...prev.interests,
        [category]: prev.interests[category].filter((_, i) => i !== index)
      }
    }))
  }

  const EditableField = ({ 
    field, 
    value, 
    placeholder = "Click to add...", 
    multiline = false,
    options = undefined as string[] | undefined,
    locked = false
  }: {
    field: string
    value: string
    placeholder?: string
    multiline?: boolean
    options?: string[]
    locked?: boolean
  }) => {
    const isCurrentlyEditing = isEditing === field

    if (locked) {
      return <span className="text-gray-700">{value || 'Not set'}</span>
    }

    if (isCurrentlyEditing) {
      return (
        <div className="flex items-center gap-2">
          {options ? (
            <select
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="">{placeholder}</option>
              {options.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          ) : multiline ? (
            <textarea
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              className="border rounded px-2 py-1 text-sm resize-none w-full"
              rows={3}
              placeholder={placeholder}
            />
          ) : (
            <input
              type="text"
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
              placeholder={placeholder}
            />
          )}
          <button
            onClick={() => handleSave(field)}
            className="text-green-600 hover:text-green-800"
          >
            <Save className="w-4 h-4" />
          </button>
          <button
            onClick={handleCancel}
            className="text-red-600 hover:text-red-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )
    }

    return (
      <div className="flex items-center gap-2 group">
        <span className="text-gray-700">{value || placeholder}</span>
        <button
          onClick={() => handleEdit(field, value)}
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600"
        >
          <Edit3 className="w-4 h-4" />
        </button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-gray-100 animate-pulse rounded-lg p-6">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
        <div className="bg-white rounded-lg p-6 space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Theme Selection */}
      <div 
        className="text-white p-6 rounded-lg"
        style={{
          background: `linear-gradient(135deg, ${
            THEME_OPTIONS.find(t => t.name === aboutData.backgroundTheme)?.colors.join(', ') || '#0EA5E9, #0284C7'
          })`
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">All About {aboutData.birthCertificate.fullName?.split(' ')[0] || childName || 'Me'}! 🌟</h1>
            <p className="text-white/90">This is my special page!</p>
          </div>
          <div className="text-right">
            <div className="text-4xl mb-2">
              {THEME_OPTIONS.find(t => t.name === aboutData.backgroundTheme)?.emoji || '🌊'}
            </div>
            <div className="text-sm text-white/80">My Theme</div>
          </div>
        </div>
      </div>

      {/* Birth Certificate Info */}
      {visibleFields.birthCertificate && (
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center gap-2 mb-4">
            <Baby className="w-6 h-6 text-pink-500" />
            <h2 className="text-xl font-bold">When I Was Born</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600">Full Name</label>
                <div className="font-medium text-gray-900">{aboutData.birthCertificate.fullName || 'Not set'}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Birthday</label>
                <div className="flex items-center gap-2">
                  <Cake className="w-4 h-4 text-orange-500" />
                  <span className="font-medium text-gray-900">
                    {(() => {
                      const date = aboutData.birthCertificate.birthDate
                      if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
                        return 'Not set'
                      }
                      return date.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    })()}
                  </span>
                </div>
              </div>
              {aboutData.birthCertificate.birthTime && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Time Born</label>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span className="font-medium text-gray-900">
                      {(() => {
                        const time = aboutData.birthCertificate.birthTime
                        if (!time) return 'Unknown'
                        const [hours, minutes] = time.split(':')
                        const hour = parseInt(hours)
                        const ampm = hour >= 12 ? 'PM' : 'AM'
                        const displayHour = hour % 12 || 12
                        return `${displayHour}:${minutes} ${ampm}`
                      })()}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600">Where I Was Born</label>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-green-500" />
                  <span className="font-medium text-gray-900">{aboutData.birthCertificate.birthPlace || 'Not set'}</span>
                </div>
              </div>
              {aboutData.birthCertificate.birthWeight && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Birth Weight</label>
                  <div className="font-medium text-gray-900">{aboutData.birthCertificate.birthWeight}</div>
                </div>
              )}
              {aboutData.birthCertificate.birthLength && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Birth Length</label>
                  <div className="font-medium text-gray-900">{aboutData.birthCertificate.birthLength}</div>
                </div>
              )}
              {aboutData.birthCertificate.hospitalName && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Hospital</label>
                  <div className="font-medium text-gray-900">{aboutData.birthCertificate.hospitalName}</div>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-600">How Old Am I?</label>
                <div className="font-medium text-gray-900">
                  {(() => {
                    const birthDate = new Date(aboutData.birthCertificate.birthDate)
                    const today = new Date()
                    const ageInYears = today.getFullYear() - birthDate.getFullYear()
                    const monthDiff = today.getMonth() - birthDate.getMonth()
                    const finalAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? ageInYears - 1 : ageInYears
                    
                    // Calculate days until next birthday
                    const nextBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate())
                    if (nextBirthday < today) {
                      nextBirthday.setFullYear(today.getFullYear() + 1)
                    }
                    const daysUntilBirthday = Math.ceil((nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                    
                    return `${finalAge} years old (${daysUntilBirthday} days until my birthday!)`
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Personal Favorites */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="w-6 h-6 text-red-500" />
          <h2 className="text-xl font-bold">My Favorites</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Nickname</label>
              <EditableField 
                field="personal.nickname" 
                value={aboutData.personal.nickname || ''} 
                placeholder="What do friends call you?"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Favorite Color</label>
              <EditableField 
                field="personal.favoriteColor" 
                value={aboutData.personal.favoriteColor}
                options={COLOR_OPTIONS}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Favorite Animal</label>
              <EditableField 
                field="personal.favoriteAnimal" 
                value={aboutData.personal.favoriteAnimal || ''}
                options={ANIMAL_OPTIONS}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Favorite Food</label>
              <EditableField 
                field="personal.favoriteFood" 
                value={aboutData.personal.favoriteFood || ''}
              />
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Best Friend</label>
              <EditableField 
                field="personal.bestFriend" 
                value={aboutData.personal.bestFriend || ''}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Favorite Subject</label>
              <EditableField 
                field="personal.favoriteSubject" 
                value={aboutData.personal.favoriteSubject || ''}
              />
            </div>
            {visibleFields.dreamJob && (
              <div>
                <label className="text-sm font-medium text-gray-600">Dream Job</label>
                <EditableField 
                  field="personal.dreamJob" 
                  value={aboutData.personal.dreamJob || ''}
                />
              </div>
            )}
            {visibleFields.superpower && (
              <div>
                <label className="text-sm font-medium text-gray-600">Superpower I'd Want</label>
                <EditableField 
                  field="personal.superpower" 
                  value={aboutData.personal.superpower || ''}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interests and Hobbies */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-6 h-6 text-yellow-500" />
          <h2 className="text-xl font-bold">Things I Love</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sports */}
          <div>
            <h3 className="font-semibold mb-2">Sports & Activities</h3>
            <div className="flex flex-wrap gap-2 mb-2">
              {aboutData.interests.sports.map((sport, index) => (
                <span key={index} className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-sm flex items-center gap-1">
                  {sport}
                  <button onClick={() => removeInterest('sports', index)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <select
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="">Add a sport...</option>
                {SPORT_OPTIONS.filter(s => !aboutData.interests.sports.includes(s)).map(sport => (
                  <option key={sport} value={sport}>{sport}</option>
                ))}
              </select>
              <button
                onClick={() => addInterest('sports')}
                disabled={!newInterest}
                className="text-blue-600 hover:text-blue-800 disabled:text-gray-400"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Arts */}
          <div>
            <h3 className="font-semibold mb-2">Arts & Crafts</h3>
            <div className="flex flex-wrap gap-2 mb-2">
              {aboutData.interests.arts.map((art, index) => (
                <span key={index} className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-sm flex items-center gap-1">
                  {art}
                  <button onClick={() => removeInterest('arts', index)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <select
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="">Add an art...</option>
                {ART_OPTIONS.filter(a => !aboutData.interests.arts.includes(a)).map(art => (
                  <option key={art} value={art}>{art}</option>
                ))}
              </select>
              <button
                onClick={() => addInterest('arts')}
                disabled={!newInterest}
                className="text-purple-600 hover:text-purple-800 disabled:text-gray-400"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Free Text Section */}
      {visibleFields.freeText && (
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center gap-2 mb-4">
            <Edit3 className="w-6 h-6 text-indigo-500" />
            <h2 className="text-xl font-bold">More About Me</h2>
          </div>
          <EditableField 
            field="freeText" 
            value={aboutData.freeText}
            placeholder="Tell us anything else about yourself..."
            multiline={true}
          />
        </div>
      )}

      {/* Theme Selector */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-6 h-6 text-pink-500" />
          <h2 className="text-xl font-bold">Choose My Theme</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {THEME_OPTIONS.map(theme => (
            <button
              key={theme.name}
              onClick={() => setAboutData(prev => ({ ...prev, backgroundTheme: theme.name }))}
              className={`p-3 rounded-lg border-2 text-center transition-all ${
                aboutData.backgroundTheme === theme.name 
                  ? 'border-gray-900 shadow-lg scale-105' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              style={{
                background: `linear-gradient(135deg, ${theme.colors.join(', ')})`
              }}
            >
              <div className="text-white text-2xl mb-1">{theme.emoji}</div>
              <div className="text-white text-xs font-medium">{theme.name}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}