'use client'

import { useState } from 'react'
import { 
  Users, Home, Calendar, Droplets, DollarSign, 
  ChevronRight, Clock, Shield, Activity, Settings
} from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  const [selectedRole, setSelectedRole] = useState<'parent' | 'kid' | null>(null)

  const kids = [
    { name: 'Hannah', emoji: '🌟', grade: '6th', color: 'from-pink-400 to-purple-400' },
    { name: 'Wyatt', emoji: '⚽', grade: '4th', color: 'from-blue-400 to-cyan-400' },
    { name: 'Ellie', emoji: '🎭', grade: '8th', color: 'from-purple-400 to-pink-400' },
    { name: 'Kaylee', emoji: '📚', grade: '10th', color: 'from-green-400 to-teal-400' },
    { name: 'Zoey', emoji: '🎯', grade: '12th', color: 'from-orange-400 to-red-400' },
    { name: 'Amos', emoji: '🎮', grade: '12th', color: 'from-indigo-400 to-purple-400' }
  ]

  const parentFeatures = [
    { icon: <Home className="w-6 h-6" />, title: 'Family Dashboard', href: '/dashboard', description: 'Overview of all family operations' },
    { icon: <Calendar className="w-6 h-6" />, title: 'Schedule', href: '/schedule', description: 'Medical appointments & events' },
    { icon: <Droplets className="w-6 h-6" />, title: 'Resources', href: '/resources', description: 'Water, zones & pet management' },
    { icon: <DollarSign className="w-6 h-6" />, title: 'Revenue', href: '/revenue', description: 'Plant business tracking' },
    { icon: <Activity className="w-6 h-6" />, title: 'Analytics', href: '/analytics', description: 'Family performance metrics' },
    { icon: <Settings className="w-6 h-6" />, title: 'Settings', href: '/settings', description: 'System configuration' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl">
                <Home className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Family Ops</h1>
                <p className="text-sm text-gray-600">Greenhouse Playbook System</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!selectedRole ? (
          // Role Selection
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Welcome to Family Ops</h2>
            <p className="text-xl text-gray-600 mb-12">Who's using the system today?</p>
            
            <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
              {/* Parent Card */}
              <button
                onClick={() => setSelectedRole('parent')}
                className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 text-left"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 opacity-0 group-hover:opacity-10 transition-opacity" />
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
                    <Shield className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-2xl font-bold text-gray-900">Parent Portal</h3>
                    <p className="text-gray-600">Levi or Lola</p>
                  </div>
                </div>
                <p className="text-gray-600 mb-4">
                  Access the full dashboard, manage schedules, approve requests, and monitor all family operations.
                </p>
                <div className="flex items-center text-blue-600 font-medium">
                  Enter Parent Portal
                  <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              {/* Kids Card */}
              <button
                onClick={() => setSelectedRole('kid')}
                className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 text-left"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-600 opacity-0 group-hover:opacity-10 transition-opacity" />
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition-colors">
                    <Users className="w-8 h-8 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-2xl font-bold text-gray-900">Kid Portal</h3>
                    <p className="text-gray-600">Select your name</p>
                  </div>
                </div>
                <p className="text-gray-600 mb-4">
                  Check your daily tasks, view your calendar, request meals, and send notes to parents.
                </p>
                <div className="flex items-center text-purple-600 font-medium">
                  Enter Kid Portal
                  <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </div>
          </div>
        ) : selectedRole === 'parent' ? (
          // Parent Features
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Parent Dashboard</h2>
                <p className="text-gray-600 mt-1">Complete family management system</p>
              </div>
              <button
                onClick={() => setSelectedRole(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                ← Back
              </button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {parentFeatures.map((feature, index) => (
                <Link
                  key={index}
                  href={feature.href}
                  className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 p-6"
                >
                  <div className="flex items-center mb-4">
                    <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                      {feature.icon}
                    </div>
                    <h3 className="ml-4 text-lg font-semibold text-gray-900">{feature.title}</h3>
                  </div>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
                </Link>
              ))}
            </div>

            {/* Quick Stats */}
            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl p-6 text-center">
                <div className="text-3xl font-bold text-blue-600">6/6</div>
                <div className="text-sm text-gray-600 mt-1">Water Jugs Full</div>
              </div>
              <div className="bg-white rounded-xl p-6 text-center">
                <div className="text-3xl font-bold text-green-600">8</div>
                <div className="text-sm text-gray-600 mt-1">Zones Active</div>
              </div>
              <div className="bg-white rounded-xl p-6 text-center">
                <div className="text-3xl font-bold text-purple-600">5</div>
                <div className="text-sm text-gray-600 mt-1">Pets Cared For</div>
              </div>
              <div className="bg-white rounded-xl p-6 text-center">
                <div className="text-3xl font-bold text-orange-600">$0</div>
                <div className="text-sm text-gray-600 mt-1">Today's Revenue</div>
              </div>
            </div>
          </div>
        ) : (
          // Kid Selection
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Select Your Name</h2>
                <p className="text-gray-600 mt-1">Choose your profile to access your personal dashboard</p>
              </div>
              <button
                onClick={() => setSelectedRole(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                ← Back
              </button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {kids.map((kid) => (
                <Link
                  key={kid.name}
                  href={`/kids/${kid.name.toLowerCase()}`}
                  className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${kid.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                  <div className="text-center">
                    <div className="text-6xl mb-4 transform group-hover:scale-110 transition-transform">
                      {kid.emoji}
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-1">{kid.name}</h3>
                    <p className="text-gray-600 mb-4">{kid.grade} Grade</p>
                    <div className={`inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r ${kid.color} text-white font-medium`}>
                      Open My Portal
                      <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-20 text-center text-sm text-gray-500">
          <p>Family Ops System • Greenhouse Playbook v1.0</p>
          <p className="mt-1">Managing 2 adults + 6 kids with systems that work</p>
        </footer>
      </main>
    </div>
  )
}