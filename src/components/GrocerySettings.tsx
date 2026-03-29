'use client'

import { useState, useEffect } from 'react'
import { Settings, Save, Info, Check, X, Mail, Key, ShoppingCart } from 'lucide-react'

interface GrocerySettingsProps {
  onClose: () => void
}

const SETTINGS_KEY = 'grocery_app_settings'

interface AppSettings {
  anylist_email: string
  veryfi_api_key: string
}

function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return { anylist_email: '', veryfi_api_key: '' }
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { anylist_email: '', veryfi_api_key: '' }
}

function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function getGrocerySettings(): AppSettings {
  return loadSettings()
}

export default function GrocerySettings({ onClose }: GrocerySettingsProps) {
  const [settings, setSettings] = useState<AppSettings>({ anylist_email: '', veryfi_api_key: '' })
  const [savedField, setSavedField] = useState<string | null>(null)

  useEffect(() => {
    setSettings(loadSettings())
  }, [])

  const handleSave = (field: keyof AppSettings) => {
    saveSettings(settings)
    setSavedField(field)
    setTimeout(() => setSavedField(null), 2000)
  }

  return (
    <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
        <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
          <Settings className="w-4 h-4 text-gray-600" />
          Grocery App Connections
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-200 transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="p-4 space-y-5">
        {/* AnyList Email */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-500" />
            AnyList Import Email
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              value={settings.anylist_email}
              onChange={e => setSettings({ ...settings, anylist_email: e.target.value })}
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
              placeholder="your-import-address@anylist.com"
            />
            <button
              onClick={() => handleSave('anylist_email')}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              {savedField === 'anylist_email' ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {savedField === 'anylist_email' ? 'Saved' : 'Save'}
            </button>
          </div>
          <p className="text-xs text-gray-500 flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-400" />
            Find this in AnyList &rarr; Settings &rarr; Email Import
          </p>
        </div>

        {/* Apple Notes */}
        <div className="space-y-1">
          <label className="block text-sm font-semibold text-gray-800 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-green-500" />
            Apple Notes
          </label>
          <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
            <Check className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700 font-medium">Copy &amp; paste to Notes app</span>
          </div>
        </div>

        {/* Veryfi API Key */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Key className="w-4 h-4 text-purple-500" />
            Veryfi API Key
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={settings.veryfi_api_key}
              onChange={e => setSettings({ ...settings, veryfi_api_key: e.target.value })}
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
              placeholder="Enter your Veryfi API key"
            />
            <button
              onClick={() => handleSave('veryfi_api_key')}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              {savedField === 'veryfi_api_key' ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {savedField === 'veryfi_api_key' ? 'Saved' : 'Save'}
            </button>
          </div>
          <p className="text-xs text-gray-500 flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-400" />
            Sign up at veryfi.com for receipt scanning
          </p>
        </div>

        {/* Coming Soon */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600 font-medium">Walmart Account</span>
            <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-500 rounded-full font-medium">Coming soon</span>
          </div>
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600 font-medium">H-E-B Account</span>
            <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-500 rounded-full font-medium">Coming soon</span>
          </div>
        </div>
      </div>
    </div>
  )
}
