'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Users, School, DollarSign, Plus, Trash2, Star, Save, Edit3,
  BookOpen, Award
} from 'lucide-react'
import {
  CURRENT_GRADES, SCHOOL_TYPE, SCHOOL_ASSIGNMENTS, SCHOOLS,
  TEACHER_ASSIGNMENTS, EXTRACURRICULARS,
} from '@/lib/familyConfig'

interface FamilyConfigAdminProps {}

const KIDS = ['amos', 'zoey', 'kaylee', 'ellie', 'wyatt', 'hannah'] as const
const KID_LABELS: Record<string, string> = {
  amos: 'Amos', zoey: 'Zoey', kaylee: 'Kaylee', ellie: 'Ellie', wyatt: 'Wyatt', hannah: 'Hannah',
}

// ── Chore Pay Section (connected to DB) ──
function ChorePaySection() {
  const [mode, setMode] = useState<'points' | 'dollars'>('points')
  const [conversionRate, setConversionRate] = useState(0.10)
  const [kids, setKids] = useState<any[]>([])
  const [starValues, setStarValues] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editValues, setEditValues] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [payingOut, setPayingOut] = useState<string | null>(null)

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/parent/chore-config')
      const data = await res.json()
      setMode(data.mode || 'points')
      setConversionRate(data.conversionRate || 0.10)
      setKids(data.kids || [])
      setStarValues(data.starValues || {})
      // Init edit values
      const ev: Record<string, any> = {}
      for (const k of (data.kids || [])) {
        ev[k.kid_name] = {
          monthly_target: k.monthly_target,
          daily_paid_chores: k.daily_paid_chores,
          required_daily: k.required_daily,
        }
      }
      setEditValues(ev)
    } catch (err) {
      console.error('Failed to load chore config:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchConfig() }, [fetchConfig])

  const handleModeSwitch = async (newMode: 'points' | 'dollars') => {
    setMode(newMode)
    await fetch('/api/parent/chore-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_mode', mode: newMode }),
    })
  }

  const handleSaveAll = async () => {
    setSaving(true)
    try {
      // Save conversion rate
      await fetch('/api/parent/chore-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_conversion_rate', conversion_rate: conversionRate }),
      })
      // Save each kid's config
      for (const [kidName, vals] of Object.entries(editValues)) {
        await fetch('/api/parent/chore-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update_config', kid_name: kidName, ...vals }),
        })
      }
      setEditing(false)
      fetchConfig()
    } catch (err) {
      console.error('Save failed:', err)
    } finally {
      setSaving(false)
    }
  }

  const handlePayout = async (kidName: string) => {
    setPayingOut(kidName)
    try {
      await fetch('/api/kids/points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'log_payout',
          child: kidName,
          points: editValues[kidName]?.monthly_target || 0,
          note: `Monthly chore payout`,
        }),
      })
    } catch (err) {
      console.error('Payout failed:', err)
    } finally {
      setPayingOut(null)
    }
  }

  if (loading) {
    return <div className="py-8 text-center text-gray-400">Loading chore settings...</div>
  }

  const STAR_LABELS: Record<string, string> = {
    zone_chore: 'Zone Chore',
    daily_chore: 'Daily Chore',
    belle_care: 'Belle Care',
    streak_3: '3-Day Streak Bonus',
    streak_7: '7-Day Streak Bonus',
  }

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <div className="bg-purple-50 p-5 rounded-lg border border-purple-200">
        <h3 className="font-bold text-purple-800 mb-2">How should chores be rewarded?</h3>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <button
            onClick={() => handleModeSwitch('points')}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              mode === 'points'
                ? 'border-amber-400 bg-amber-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Star className={`w-5 h-5 ${mode === 'points' ? 'text-amber-500' : 'text-gray-400'}`} />
              <span className="font-semibold text-gray-900">Stars Only</span>
            </div>
            <p className="text-xs text-gray-500">Kids earn stars for chores, spend in reward store. Great for summer.</p>
            {mode === 'points' && <span className="text-xs text-amber-600 font-medium mt-2 block">Active</span>}
          </button>
          <button
            onClick={() => handleModeSwitch('dollars')}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              mode === 'dollars'
                ? 'border-green-400 bg-green-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className={`w-5 h-5 ${mode === 'dollars' ? 'text-green-500' : 'text-gray-400'}`} />
              <span className="font-semibold text-gray-900">Stars + Real Money</span>
            </div>
            <p className="text-xs text-gray-500">Stars plus monthly allowance target. You manually pay out.</p>
            {mode === 'dollars' && <span className="text-xs text-green-600 font-medium mt-2 block">Active</span>}
          </button>
        </div>
      </div>

      {/* Star Values (always visible) */}
      <div className="bg-white rounded-lg border p-5">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
          <Star className="w-4 h-4 text-amber-500" />
          What Chores Earn
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(starValues).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-sm text-gray-700">{STAR_LABELS[key] || key}</span>
              <span className="text-sm font-semibold text-amber-600">{value} ⭐</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pay Scale (only in dollars mode) */}
      {mode === 'dollars' && (
        <div className="bg-white rounded-lg border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              Pay Scale
            </h3>
            <div className="flex gap-2">
              {editing ? (
                <>
                  <button onClick={() => setEditing(false)} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 border rounded-lg">
                    Cancel
                  </button>
                  <button onClick={handleSaveAll} disabled={saving}
                    className="text-sm text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg flex items-center gap-1 disabled:opacity-50">
                    <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save'}
                  </button>
                </>
              ) : (
                <button onClick={() => setEditing(true)}
                  className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1.5 border rounded-lg flex items-center gap-1">
                  <Edit3 className="w-3.5 h-3.5" /> Edit Values
                </button>
              )}
            </div>
          </div>

          {/* Conversion rate */}
          <div className="flex items-center gap-3 mb-4 bg-gray-50 rounded-lg p-3">
            <span className="text-sm text-gray-700">Conversion Rate:</span>
            {editing ? (
              <div className="flex items-center gap-1">
                <span className="text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={conversionRate}
                  onChange={e => setConversionRate(parseFloat(e.target.value) || 0)}
                  className="w-20 px-2 py-1 border rounded text-sm text-right"
                />
                <span className="text-sm text-gray-500">per star</span>
              </div>
            ) : (
              <span className="text-sm font-medium">${conversionRate.toFixed(2)} per star</span>
            )}
          </div>

          {/* Per-kid table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 font-medium">Kid</th>
                  <th className="pb-2 font-medium">Monthly Target</th>
                  <th className="pb-2 font-medium">Daily Paid</th>
                  <th className="pb-2 font-medium">Required</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {kids.map(kid => (
                  <tr key={kid.kid_name} className="hover:bg-gray-50">
                    <td className="py-3 font-medium capitalize">{KID_LABELS[kid.kid_name] || kid.kid_name}</td>
                    <td className="py-3">
                      {editing ? (
                        <div className="flex items-center gap-1">
                          <span>$</span>
                          <input
                            type="number"
                            value={editValues[kid.kid_name]?.monthly_target ?? kid.monthly_target}
                            onChange={e => setEditValues(prev => ({
                              ...prev,
                              [kid.kid_name]: { ...prev[kid.kid_name], monthly_target: parseFloat(e.target.value) || 0 },
                            }))}
                            className="w-16 px-2 py-1 border rounded text-right"
                          />
                        </div>
                      ) : (
                        <span>${Number(kid.monthly_target).toFixed(0)}</span>
                      )}
                    </td>
                    <td className="py-3">
                      {editing ? (
                        <input
                          type="number"
                          value={editValues[kid.kid_name]?.daily_paid_chores ?? kid.daily_paid_chores}
                          onChange={e => setEditValues(prev => ({
                            ...prev,
                            [kid.kid_name]: { ...prev[kid.kid_name], daily_paid_chores: parseInt(e.target.value) || 0 },
                          }))}
                          className="w-16 px-2 py-1 border rounded text-right"
                        />
                      ) : (
                        <span>{kid.daily_paid_chores}</span>
                      )}
                    </td>
                    <td className="py-3">
                      {editing ? (
                        <input
                          type="number"
                          value={editValues[kid.kid_name]?.required_daily ?? kid.required_daily}
                          onChange={e => setEditValues(prev => ({
                            ...prev,
                            [kid.kid_name]: { ...prev[kid.kid_name], required_daily: parseInt(e.target.value) || 0 },
                          }))}
                          className="w-16 px-2 py-1 border rounded text-right"
                        />
                      ) : (
                        <span>{kid.required_daily}</span>
                      )}
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => handlePayout(kid.kid_name)}
                        disabled={payingOut === kid.kid_name}
                        className="text-xs bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
                      >
                        {payingOut === kid.kid_name ? 'Paying...' : 'Pay Out'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Component ──
export default function FamilyConfigAdmin({}: FamilyConfigAdminProps) {
  const [activeSection, setActiveSection] = useState<'grades' | 'teachers' | 'chores' | 'extracurriculars'>('grades')
  const [activities, setActivities] = useState<Record<string, string[]>>({ ...EXTRACURRICULARS })
  const [newActivity, setNewActivity] = useState<Record<string, string>>({})

  const sections = [
    { id: 'grades', name: 'Grades & Schools', icon: School, color: 'bg-blue-500' },
    { id: 'teachers', name: 'Teachers', icon: BookOpen, color: 'bg-green-500' },
    { id: 'chores', name: 'Chore Rewards', icon: DollarSign, color: 'bg-purple-500' },
    { id: 'extracurriculars', name: 'Activities', icon: Award, color: 'bg-orange-500' },
  ]

  // ── Grades & Schools ──
  const renderGradesSection = () => (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-lg border">
        <h3 className="font-bold text-blue-800 mb-2">School Year 2025-2026</h3>
        <p className="text-blue-700 text-sm">Current grade levels and school assignments</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {KIDS.map(kid => {
          const grade = CURRENT_GRADES[kid]
          const schoolKey = SCHOOL_ASSIGNMENTS[kid]
          const school = SCHOOLS[schoolKey]
          const schoolType = SCHOOL_TYPE[kid]
          return (
            <div key={kid} className="border rounded-lg p-4 bg-white">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${schoolType === 'homeschool' ? 'bg-teal-100' : 'bg-blue-100'}`}>
                  <Users className={`w-4 h-4 ${schoolType === 'homeschool' ? 'text-teal-600' : 'text-blue-600'}`} />
                </div>
                <h4 className="font-semibold">{KID_LABELS[kid]}</h4>
                <span className={`text-xs px-2 py-0.5 rounded-full ${schoolType === 'homeschool' ? 'bg-teal-100 text-teal-700' : 'bg-blue-100 text-blue-700'}`}>
                  {schoolType === 'homeschool' ? 'Homeschool' : 'Public'}
                </span>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <div><span className="text-gray-500">Grade:</span> {grade}</div>
                <div><span className="text-gray-500">School:</span> {school?.name || 'Homeschool'}</div>
                {school?.address && <div className="text-xs text-gray-400">{school.address}</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  // ── Teachers ──
  const renderTeachersSection = () => (
    <div className="space-y-4">
      <div className="bg-green-50 p-4 rounded-lg border">
        <h3 className="font-bold text-green-800 mb-2">Teacher Assignments</h3>
        <p className="text-green-700 text-sm">Current semester teacher assignments from school schedules</p>
      </div>
      <div className="space-y-6">
        {KIDS.map(kid => {
          const teachers = TEACHER_ASSIGNMENTS[kid] || []
          const schoolType = SCHOOL_TYPE[kid]
          return (
            <div key={kid} className="border rounded-lg p-4 bg-white">
              <h4 className="font-semibold mb-3">{KID_LABELS[kid]}&apos;s Teachers</h4>
              {schoolType === 'homeschool' ? (
                <p className="text-sm text-gray-400 italic">Homeschooled — no teacher assignments</p>
              ) : teachers.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No teachers assigned yet</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {teachers.map((t, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm bg-gray-50 rounded px-3 py-2">
                      <span className="font-medium text-gray-900">{t.name}</span>
                      <span className="text-gray-400">—</span>
                      <span className="text-gray-600">{t.subject}</span>
                      {t.room && <span className="text-xs text-gray-400 ml-auto">Rm {t.room}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )

  // ── Extracurriculars ──
  const addActivity = (kid: string) => {
    const value = newActivity[kid]?.trim()
    if (!value) return
    setActivities(prev => ({ ...prev, [kid]: [...(prev[kid] || []), value] }))
    setNewActivity(prev => ({ ...prev, [kid]: '' }))
  }

  const removeActivity = (kid: string, index: number) => {
    setActivities(prev => ({ ...prev, [kid]: (prev[kid] || []).filter((_, i) => i !== index) }))
  }

  const renderExtracurricularsSection = () => (
    <div className="space-y-4">
      <div className="bg-orange-50 p-4 rounded-lg border">
        <h3 className="font-bold text-orange-800 mb-2">Extracurricular Activities</h3>
        <p className="text-orange-700 text-sm">Track sports, clubs, and activities for each child</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {KIDS.map(kid => {
          const kidActivities = activities[kid] || []
          return (
            <div key={kid} className="border rounded-lg p-4 bg-white">
              <h4 className="font-semibold mb-3">{KID_LABELS[kid]}&apos;s Activities</h4>
              {kidActivities.length === 0 ? (
                <p className="text-sm text-gray-400 italic mb-2">No activities yet</p>
              ) : (
                <div className="space-y-1.5 mb-3">
                  {kidActivities.map((activity, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm bg-gray-50 rounded px-3 py-2">
                      <span className="flex-1">{activity}</span>
                      <button onClick={() => removeActivity(kid, idx)} className="text-gray-400 hover:text-red-500" title="Remove">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newActivity[kid] || ''}
                  onChange={e => setNewActivity(prev => ({ ...prev, [kid]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addActivity(kid)}
                  placeholder="Add activity..."
                  className="flex-1 text-sm border rounded px-2 py-1.5"
                />
                <button onClick={() => addActivity(kid)} className="text-sm text-orange-600 hover:text-orange-800 px-2">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  const renderContent = () => {
    switch (activeSection) {
      case 'grades': return renderGradesSection()
      case 'teachers': return renderTeachersSection()
      case 'chores': return <ChorePaySection />
      case 'extracurriculars': return renderExtracurricularsSection()
      default: return renderGradesSection()
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold">Family Configuration</h1>
        <p className="text-indigo-100">View and manage family information</p>
      </div>

      {/* Section Navigation */}
      <div className="bg-white rounded-lg border">
        <div className="flex border-b overflow-x-auto">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id as any)}
              className={`flex items-center gap-2 px-6 py-3 font-medium border-r last:border-r-0 shrink-0 ${
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
        <div className="p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}
