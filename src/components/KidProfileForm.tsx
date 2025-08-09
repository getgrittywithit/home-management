'use client'

import { useState } from 'react'
import { Heart, Star, Cake, BookOpen, Sparkles, CheckCircle2 } from 'lucide-react'

interface KidProfileFormProps {
  onSubmit: (data: any) => void
  kidName?: string
}

export default function KidProfileForm({ onSubmit, kidName }: KidProfileFormProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    name: kidName || '',
    birthdate: '',
    grade: '',
    favoriteColors: [] as string[],
    favoriteFoods: [] as string[],
    favoriteAnimals: [] as string[],
    favoriteActivities: [] as string[],
    favoriteSubjects: [] as string[],
    preferredChores: [] as string[],
    avatarEmoji: '😊',
    dreamJob: '',
    learningStyle: '',
    themePreference: ''
  })

  const totalSteps = 7

  const colors = [
    { name: 'Red', value: 'red', emoji: '❤️' },
    { name: 'Blue', value: 'blue', emoji: '💙' },
    { name: 'Green', value: 'green', emoji: '💚' },
    { name: 'Purple', value: 'purple', emoji: '💜' },
    { name: 'Pink', value: 'pink', emoji: '🩷' },
    { name: 'Yellow', value: 'yellow', emoji: '💛' },
    { name: 'Orange', value: 'orange', emoji: '🧡' },
    { name: 'Rainbow', value: 'rainbow', emoji: '🌈' }
  ]

  const foods = [
    { name: 'Pizza', emoji: '🍕' },
    { name: 'Ice Cream', emoji: '🍦' },
    { name: 'Tacos', emoji: '🌮' },
    { name: 'Burgers', emoji: '🍔' },
    { name: 'Pasta', emoji: '🍝' },
    { name: 'Fruit', emoji: '🍎' },
    { name: 'Cookies', emoji: '🍪' },
    { name: 'Sandwiches', emoji: '🥪' },
    { name: 'Chicken', emoji: '🍗' },
    { name: 'Pancakes', emoji: '🥞' }
  ]

  const animals = [
    { name: 'Dogs', emoji: '🐕' },
    { name: 'Cats', emoji: '🐱' },
    { name: 'Horses', emoji: '🐴' },
    { name: 'Bears', emoji: '🐻' },
    { name: 'Lions', emoji: '🦁' },
    { name: 'Dolphins', emoji: '🐬' },
    { name: 'Birds', emoji: '🐦' },
    { name: 'Butterflies', emoji: '🦋' }
  ]

  const activities = [
    { name: 'Sports', emoji: '⚽' },
    { name: 'Reading', emoji: '📚' },
    { name: 'Art & Drawing', emoji: '🎨' },
    { name: 'Music', emoji: '🎵' },
    { name: 'Video Games', emoji: '🎮' },
    { name: 'Cooking', emoji: '👨‍🍳' },
    { name: 'Building/Legos', emoji: '🧱' },
    { name: 'Nature/Outdoors', emoji: '🌳' }
  ]

  const subjects = [
    { name: 'Math', emoji: '🔢' },
    { name: 'Science', emoji: '🔬' },
    { name: 'Reading', emoji: '📖' },
    { name: 'Art', emoji: '🎨' },
    { name: 'PE/Sports', emoji: '🏃' },
    { name: 'Music', emoji: '🎼' },
    { name: 'History', emoji: '📜' },
    { name: 'Recess', emoji: '🛝' }
  ]

  const chores = [
    { name: 'Organizing my room', emoji: '🛏️' },
    { name: 'Feeding pets', emoji: '🐕' },
    { name: 'Helping with dishes', emoji: '🍽️' },
    { name: 'Folding laundry', emoji: '👕' },
    { name: 'Watering plants', emoji: '🪴' },
    { name: 'Taking out trash', emoji: '🗑️' },
    { name: 'Cleaning bathrooms', emoji: '🛁' },
    { name: 'Helping with cooking', emoji: '👨‍🍳' },
    { name: 'Vacuuming', emoji: '🧹' },
    { name: 'Yard work', emoji: '🌱' }
  ]

  const avatars = ['😊', '😎', '🤠', '🦸', '🧙', '🦄', '🐱', '🐶', '🦁', '🐸', '🦋', '⭐']

  const handleArrayToggle = (field: string, value: string) => {
    const currentArray = formData[field as keyof typeof formData] as string[]
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value]
    
    setFormData({ ...formData, [field]: newArray })
  }

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    } else {
      onSubmit(formData)
    }
  }

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="text-center space-y-6">
            <div className="text-6xl mb-4">👋</div>
            <h2 className="text-2xl font-bold text-gray-900">Hi there! Let's set up your awesome profile!</h2>
            <p className="text-gray-600">We're going to ask you some fun questions to make your portal super special just for you!</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">What's your name?</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg text-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Your awesome name!"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">When's your birthday? 🎂</label>
                <input
                  type="date"
                  value={formData.birthdate}
                  onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg text-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">What grade are you in? 📚</label>
                <select
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg text-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Pick your grade!</option>
                  <option value="PreK">Pre-K</option>
                  <option value="K">Kindergarten</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={`${i + 1}`}>{i + 1}st Grade</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="text-center space-y-6">
            <div className="text-6xl mb-4">🎨</div>
            <h2 className="text-2xl font-bold text-gray-900">What are your favorite colors?</h2>
            <p className="text-gray-600">Pick as many as you want! These will make your portal look amazing!</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {colors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => handleArrayToggle('favoriteColors', color.value)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    formData.favoriteColors.includes(color.value)
                      ? 'border-blue-500 bg-blue-50 scale-105'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-3xl mb-2">{color.emoji}</div>
                  <div className="font-medium">{color.name}</div>
                </button>
              ))}
            </div>
          </div>
        )

      case 3:
        return (
          <div className="text-center space-y-6">
            <div className="text-6xl mb-4">🍕</div>
            <h2 className="text-2xl font-bold text-gray-900">What foods make you happy?</h2>
            <p className="text-gray-600">Choose your favorites! We might suggest these for special treats!</p>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {foods.map((food) => (
                <button
                  key={food.name}
                  onClick={() => handleArrayToggle('favoriteFoods', food.name)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    formData.favoriteFoods.includes(food.name)
                      ? 'border-green-500 bg-green-50 scale-105'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-3xl mb-2">{food.emoji}</div>
                  <div className="text-sm font-medium">{food.name}</div>
                </button>
              ))}
            </div>
          </div>
        )

      case 4:
        return (
          <div className="text-center space-y-6">
            <div className="text-6xl mb-4">🎮</div>
            <h2 className="text-2xl font-bold text-gray-900">What do you love to do?</h2>
            <p className="text-gray-600">Tell us about your favorite activities and hobbies!</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {activities.map((activity) => (
                <button
                  key={activity.name}
                  onClick={() => handleArrayToggle('favoriteActivities', activity.name)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    formData.favoriteActivities.includes(activity.name)
                      ? 'border-purple-500 bg-purple-50 scale-105'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-3xl mb-2">{activity.emoji}</div>
                  <div className="text-sm font-medium">{activity.name}</div>
                </button>
              ))}
            </div>
          </div>
        )

      case 5:
        return (
          <div className="text-center space-y-6">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-2xl font-bold text-gray-900">What subjects do you like at school?</h2>
            <p className="text-gray-600">Even if you don't love school, which ones are the most fun?</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {subjects.map((subject) => (
                <button
                  key={subject.name}
                  onClick={() => handleArrayToggle('favoriteSubjects', subject.name)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    formData.favoriteSubjects.includes(subject.name)
                      ? 'border-indigo-500 bg-indigo-50 scale-105'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-3xl mb-2">{subject.emoji}</div>
                  <div className="text-sm font-medium">{subject.name}</div>
                </button>
              ))}
            </div>
          </div>
        )

      case 6:
        return (
          <div className="text-center space-y-6">
            <div className="text-6xl mb-4">🧹</div>
            <h2 className="text-2xl font-bold text-gray-900">If you HAD to pick chores...</h2>
            <p className="text-gray-600">Which ones would you choose? Be honest - this helps us give you ones you might actually like!</p>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {chores.map((chore) => (
                <button
                  key={chore.name}
                  onClick={() => handleArrayToggle('preferredChores', chore.name)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    formData.preferredChores.includes(chore.name)
                      ? 'border-orange-500 bg-orange-50 scale-105'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-3xl mb-2">{chore.emoji}</div>
                  <div className="text-sm font-medium">{chore.name}</div>
                </button>
              ))}
            </div>
          </div>
        )

      case 7:
        return (
          <div className="text-center space-y-6">
            <div className="text-6xl mb-4">✨</div>
            <h2 className="text-2xl font-bold text-gray-900">Final touches!</h2>
            <p className="text-gray-600">Let's pick your avatar and tell us your dream job!</p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Pick your avatar!</label>
                <div className="grid grid-cols-6 gap-3">
                  {avatars.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setFormData({ ...formData, avatarEmoji: emoji })}
                      className={`p-3 rounded-xl border-2 transition-all text-3xl ${
                        formData.avatarEmoji === emoji
                          ? 'border-pink-500 bg-pink-50 scale-110'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">What do you want to be when you grow up? 🚀</label>
                <input
                  type="text"
                  value={formData.dreamJob}
                  onChange={(e) => setFormData({ ...formData, dreamJob: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg text-lg text-center focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  placeholder="Astronaut, Teacher, Chef..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">How do you learn best?</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { value: 'visual', label: 'Pictures & Videos', emoji: '👀' },
                    { value: 'hands-on', label: 'Doing & Building', emoji: '🙌' },
                    { value: 'reading', label: 'Reading & Writing', emoji: '📝' }
                  ].map((style) => (
                    <button
                      key={style.value}
                      onClick={() => setFormData({ ...formData, learningStyle: style.value })}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        formData.learningStyle === style.value
                          ? 'border-teal-500 bg-teal-50 scale-105'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-2">{style.emoji}</div>
                      <div className="font-medium">{style.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const isStepComplete = () => {
    switch (currentStep) {
      case 1:
        return formData.name && formData.birthdate && formData.grade
      case 2:
        return formData.favoriteColors.length > 0
      case 3:
        return formData.favoriteFoods.length > 0
      case 4:
        return formData.favoriteActivities.length > 0
      case 5:
        return formData.favoriteSubjects.length > 0
      case 6:
        return formData.preferredChores.length > 0
      case 7:
        return formData.avatarEmoji && formData.dreamJob && formData.learningStyle
      default:
        return false
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-yellow-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl shadow-lg p-8 border">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Step {currentStep} of {totalSteps}</span>
              <span>{Math.round((currentStep / totalSteps) * 100)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          {/* Step Content */}
          <div className="mb-8">
            {renderStep()}
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              onClick={handlePrev}
              disabled={currentStep === 1}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
            >
              ← Back
            </button>
            
            <button
              onClick={handleNext}
              disabled={!isStepComplete()}
              className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-600 hover:to-pink-600 transition-all flex items-center space-x-2"
            >
              {currentStep === totalSteps ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>All Done!</span>
                </>
              ) : (
                <>
                  <span>Next</span>
                  <Sparkles className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}