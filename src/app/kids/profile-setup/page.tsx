'use client'

import { useState } from 'react'
import KidProfileForm from '@/components/KidProfileForm'
import { CheckCircle2, Sparkles } from 'lucide-react'

export default function ProfileSetupPage() {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submittedData, setSubmittedData] = useState<any>(null)

  const handleFormSubmit = async (data: any) => {
    try {
      console.log('Saving kid profile data:', data)
      
      const response = await fetch('/api/kids/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        setSubmittedData(data)
        setIsSubmitted(true)
      } else {
        console.error('Failed to save profile')
        alert('Oops! Something went wrong saving your profile. Please try again!')
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Oops! Something went wrong. Please try again!')
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-100 via-blue-50 to-purple-100 p-4 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-3xl shadow-lg p-8 border">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Awesome job, {submittedData?.name}!
            </h1>
            <p className="text-gray-600 mb-6">
              Your profile is all set up! Your portal will now be customized just for you with all your favorite things!
            </p>
            
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-center space-x-2 text-green-700">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">Profile saved successfully!</span>
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-600 mb-6">
              <p>✨ Your favorite colors: {submittedData?.favoriteColors.join(', ')}</p>
              <p>🍕 Favorite foods: {submittedData?.favoriteFoods.slice(0, 3).join(', ')}</p>
              <p>🎯 Dream job: {submittedData?.dreamJob}</p>
            </div>
            
            <button
              onClick={() => window.location.href = `/kids/${submittedData?.name.toLowerCase()}`}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-center space-x-2"
            >
              <Sparkles className="w-5 h-5" />
              <span>Go to My Portal!</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <KidProfileForm onSubmit={handleFormSubmit} />
}