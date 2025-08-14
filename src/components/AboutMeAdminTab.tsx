'use client'

import { useState } from 'react'
import { Users, Play, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'

export default function AboutMeAdminTab() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const initializeProfiles = async () => {
    try {
      setIsLoading(true)
      setError(null)
      setResult(null)

      const response = await fetch('/api/kids/initialize-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        const data = await response.json()
        setResult(data)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to initialize profiles')
      }
    } catch (err) {
      setError('Network error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 border">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Kids About Me Profiles</h2>
        </div>
        
        <div className="space-y-4">
          <p className="text-gray-600">
            Initialize About Me profiles for all kids using their real birth certificate data and age-appropriate defaults.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">What this will create:</h3>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>• Individual About Me profiles for each child</li>
              <li>• Real birth certificate information (admin-locked)</li>
              <li>• Age-appropriate default preferences</li>
              <li>• Sibling relationships for all kids</li>
              <li>• Editable personal sections for each child</li>
            </ul>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={initializeProfiles}
              disabled={isLoading}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Initializing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Initialize Kids Profiles
                </>
              )}
            </button>
          </div>

          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-900">Success!</span>
              </div>
              <p className="text-green-800 mb-2">{result.message}</p>
              <div className="space-y-1">
                <strong className="text-green-900">Created profiles for:</strong>
                <ul className="list-disc list-inside text-green-800">
                  {result.profiles?.map((profile: any) => (
                    <li key={profile.childId}>{profile.name} ({profile.childId})</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="font-medium text-red-900">Error</span>
              </div>
              <p className="text-red-800">{error}</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">About Me Data Management</h3>
        <div className="space-y-3">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Admin-Controlled Fields:</h4>
            <ul className="space-y-1 text-sm text-gray-700">
              <li>• Birth certificate information (name, date, time, location)</li>
              <li>• Family member relationships and ages</li>
              <li>• Important factual data</li>
            </ul>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Kid-Editable Fields:</h4>
            <ul className="space-y-1 text-sm text-gray-700">
              <li>• Personal preferences (favorite color, food, animals, etc.)</li>
              <li>• Interests and hobbies</li>
              <li>• Free text "About Me" section</li>
              <li>• Profile themes and appearance</li>
              <li>• Physical appearance details</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}