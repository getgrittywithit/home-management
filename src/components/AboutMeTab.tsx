'use client'

import { useState } from 'react'
import { 
  Calendar, MapPin, Clock, Heart, Star, Users, 
  Edit3, Save, X, Plus, Trash2, Camera, Palette,
  Baby, Cake, Home, School, Trophy
} from 'lucide-react'
import { 
  AboutMeProfile, 
  SAMPLE_ABOUT_ME_DATA, 
  COLOR_OPTIONS, 
  ANIMAL_OPTIONS, 
  THEME_OPTIONS,
  SPORT_OPTIONS,
  INSTRUMENT_OPTIONS,
  ART_OPTIONS,
  getVisibleFields
} from '@/lib/aboutMeConfig'

interface AboutMeTabProps {
  childAge: number
  childId: string
  initialData?: AboutMeProfile
}

export default function AboutMeTab({ childAge, childId, initialData }: AboutMeTabProps) {
  const [aboutData, setAboutData] = useState<AboutMeProfile>(
    initialData || { ...SAMPLE_ABOUT_ME_DATA, childId }
  )
  const [isEditing, setIsEditing] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [newInterest, setNewInterest] = useState('')

  const visibleFields = getVisibleFields(childAge)

  const handleSave = async (field: string) => {
    // In production, this would call an API
    console.log('Saving field:', field, 'Value:', editingValue)
    
    // Update local state
    if (field.includes('.')) {
      const [section, subField] = field.split('.')
      setAboutData(prev => {
        const currentSection = prev[section as keyof AboutMeProfile]
        return {
          ...prev,
          [section]: {
            ...(typeof currentSection === 'object' && currentSection !== null ? currentSection : {}),
            [subField]: editingValue
          }
        }
      })
    } else {
      setAboutData(prev => ({
        ...prev,
        [field]: editingValue
      }))
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
            <h1 className="text-2xl font-bold">All About {aboutData.birthCertificate.fullName.split(' ')[0]}! 🌟</h1>
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
                <div className="font-medium text-gray-900">{aboutData.birthCertificate.fullName}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Birthday</label>
                <div className="flex items-center gap-2">
                  <Cake className="w-4 h-4 text-orange-500" />
                  <span className="font-medium text-gray-900">
                    {aboutData.birthCertificate.birthDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>
              {aboutData.birthCertificate.birthTime && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Time Born</label>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span className="font-medium text-gray-900">{aboutData.birthCertificate.birthTime}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600">Where I Was Born</label>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-green-500" />
                  <span className="font-medium text-gray-900">{aboutData.birthCertificate.birthPlace}</span>
                </div>
              </div>
              {aboutData.birthCertificate.birthWeight && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Weight</label>
                  <div className="font-medium text-gray-900">{aboutData.birthCertificate.birthWeight}</div>
                </div>
              )}
              {aboutData.birthCertificate.birthLength && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Length</label>
                  <div className="font-medium text-gray-900">{aboutData.birthCertificate.birthLength}</div>
                </div>
              )}
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