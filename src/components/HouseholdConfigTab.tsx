'use client'

import { useState, useEffect } from 'react'
import {
  Settings, ChevronDown, ChevronUp, Plus, Eye, EyeOff,
  Heart, AlertTriangle, CheckCircle2, Clock, Trash2
} from 'lucide-react'

interface ZoneDef {
  id: number
  zone_key: string
  display_name: string
  zone_type: string
  anchor_count: number
  rotating_count: number
  active: boolean
}

interface ZoneTask {
  id: number
  zone_key: string
  task_text: string
  task_type: string
  health_priority: boolean
  equipment: string | null
  duration_mins: number
  active: boolean
  last_completed?: string | null
  kid_filter?: string[] | null
}

interface RoutineFlag {
  kid_name: string
  flag_key: string
  active: boolean
}

interface BonusTask {
  kid_name: string
  bonus_description: string
  completed_at: string
  zone_key: string
}

interface MorningCheckin {
  kid_name: string
  checkin_date: string
  checkin_type: string
  checkin_time: string
  points_awarded: number
}

export default function HouseholdConfigTab() {
  const [zones, setZones] = useState<ZoneDef[]>([])
  const [selectedZone, setSelectedZone] = useState<string | null>(null)
  const [zoneTasks, setZoneTasks] = useState<ZoneTask[]>([])
  const [viewMode, setViewMode] = useState<'tasks' | 'rotation'>('tasks')
  const [routineFlags, setRoutineFlags] = useState<RoutineFlag[]>([])
  const [bonusTasks, setBonusTasks] = useState<BonusTask[]>([])
  const [morningCheckins, setMorningCheckins] = useState<MorningCheckin[]>([])
  const [loaded, setLoaded] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTask, setNewTask] = useState({ task_text: '', task_type: 'rotating', health_priority: false, duration_mins: 5 })

  useEffect(() => {
    Promise.all([
      fetch('/api/parent/household-config?action=get_zones').then(r => r.json()).catch(() => ({ zones: [] })),
      fetch('/api/parent/household-config?action=get_routine_flags').then(r => r.json()).catch(() => ({ flags: [] })),
      fetch('/api/parent/household-config?action=get_bonus_log').then(r => r.json()).catch(() => ({ bonusTasks: [] })),
      fetch('/api/parent/household-config?action=get_morning_weekly').then(r => r.json()).catch(() => ({ checkins: [] })),
    ]).then(([zonesData, flagsData, bonusData, morningData]) => {
      setZones(zonesData.zones || [])
      setRoutineFlags(flagsData.flags || [])
      setBonusTasks(bonusData.bonusTasks || [])
      setMorningCheckins(morningData.checkins || [])
      setLoaded(true)
    })
  }, [])

  const loadZoneTasks = async (zoneKey: string) => {
    setSelectedZone(zoneKey)
    const action = viewMode === 'rotation' ? 'get_rotation_overview' : 'get_zone_tasks'
    try {
      const res = await fetch(`/api/parent/household-config?action=${action}&zone=${zoneKey}`)
      const data = await res.json()
      setZoneTasks(data.tasks || [])
    } catch {
      setZoneTasks([])
    }
  }

  const toggleTaskActive = async (taskId: number) => {
    setZoneTasks(prev => prev.map(t => t.id === taskId ? { ...t, active: !t.active } : t))
    await fetch('/api/parent/household-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_task_active', task_id: taskId })
    })
  }

  const addTask = async () => {
    if (!newTask.task_text.trim() || !selectedZone) return
    await fetch('/api/parent/household-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_task', zone_key: selectedZone, ...newTask })
    })
    setNewTask({ task_text: '', task_type: 'rotating', health_priority: false, duration_mins: 5 })
    setShowAddForm(false)
    loadZoneTasks(selectedZone)
  }

  const toggleFlag = async (kid: string, flagKey: string) => {
    setRoutineFlags(prev => prev.map(f =>
      f.kid_name === kid && f.flag_key === flagKey ? { ...f, active: !f.active } : f
    ))
    await fetch('/api/parent/household-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_routine_flag', kid, flag_key: flagKey })
    })
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    )
  }

  const daysSinceColor = (lastCompleted: string | null): string => {
    if (!lastCompleted) return 'text-red-600 bg-red-50'
    const days = Math.floor((Date.now() - new Date(lastCompleted).getTime()) / 86400000)
    if (days <= 7) return 'text-green-600 bg-green-50'
    if (days <= 14) return 'text-amber-600 bg-amber-50'
    return 'text-red-600 bg-red-50'
  }

  // Group zones by type
  const sharedZones = zones.filter(z => z.zone_type === 'shared')
  const dutyZones = zones.filter(z => z.zone_type === 'duty')
  const bedroomZones = zones.filter(z => z.zone_type === 'bedroom')
  const routineZones = zones.filter(z => z.zone_type === 'routine')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6" /> Zone Task Manager
        </h1>
        <p className="text-emerald-100 mt-1">Manage zone tasks, rotation settings, and routine flags</p>
      </div>

      {/* Morning Accountability (Zoey + Kaylee) */}
      {morningCheckins.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" /> Morning Accountability — This Week
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs">
                  <th className="text-left py-1">Kid</th>
                  <th className="text-left py-1">Type</th>
                  <th className="text-left py-1">Date</th>
                  <th className="text-left py-1">Time</th>
                  <th className="text-right py-1">Points</th>
                </tr>
              </thead>
              <tbody>
                {morningCheckins.map((c, i) => (
                  <tr key={i} className="border-t">
                    <td className="py-1.5 capitalize">{c.kid_name}</td>
                    <td className="py-1.5">{c.checkin_type === 'wake' ? 'Wake' : 'Ready'}</td>
                    <td className="py-1.5">{new Date(c.checkin_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}</td>
                    <td className="py-1.5">{c.checkin_time?.slice(0, 5)}</td>
                    <td className={`py-1.5 text-right font-medium ${c.points_awarded >= 3 ? 'text-green-600' : c.points_awarded >= 1 ? 'text-amber-600' : 'text-red-500'}`}>
                      {c.points_awarded > 0 ? '+' : ''}{c.points_awarded}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bonus Task Log */}
      {bonusTasks.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Plus className="w-5 h-5 text-green-500" /> Bonus Actions — This Week
          </h2>
          <div className="space-y-2">
            {bonusTasks.map((b, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="capitalize font-medium text-gray-700">{b.kid_name}</span>
                <span className="text-gray-400">—</span>
                <span className="text-gray-600">{b.bonus_description}</span>
                <span className="ml-auto text-xs text-green-600 font-medium">+2 pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Routine Flags */}
      {routineFlags.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" /> Health Flags
          </h2>
          <div className="space-y-2">
            {routineFlags.map((f, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm">
                  <span className="capitalize font-medium">{f.kid_name}</span>
                  <span className="text-gray-500 ml-2">{f.flag_key.replace(/_/g, ' ')}</span>
                </span>
                <button
                  onClick={() => toggleFlag(f.kid_name, f.flag_key)}
                  className={`text-xs px-3 py-1 rounded-full font-medium ${f.active ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}
                >
                  {f.active ? 'ACTIVE' : 'Inactive'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Zone List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Shared Zones */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-3 border-b bg-amber-50 rounded-t-lg">
            <h3 className="font-bold text-amber-900 text-sm">Shared Zones</h3>
          </div>
          <div className="divide-y">
            {sharedZones.map(z => (
              <button key={z.zone_key} onClick={() => loadZoneTasks(z.zone_key)}
                className={`w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 ${selectedZone === z.zone_key ? 'bg-emerald-50 font-medium' : ''}`}>
                {z.display_name}
                <span className="text-xs text-gray-400 ml-2">A:{z.anchor_count} R:{z.rotating_count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Duty Zones */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-3 border-b bg-purple-50 rounded-t-lg">
            <h3 className="font-bold text-purple-900 text-sm">Duty Zones</h3>
          </div>
          <div className="divide-y">
            {dutyZones.map(z => (
              <button key={z.zone_key} onClick={() => loadZoneTasks(z.zone_key)}
                className={`w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 ${selectedZone === z.zone_key ? 'bg-emerald-50 font-medium' : ''}`}>
                {z.display_name}
              </button>
            ))}
          </div>
        </div>

        {/* Routines */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-3 border-b bg-sky-50 rounded-t-lg">
            <h3 className="font-bold text-sky-900 text-sm">Routines</h3>
          </div>
          <div className="divide-y">
            {routineZones.map(z => (
              <button key={z.zone_key} onClick={() => loadZoneTasks(z.zone_key)}
                className={`w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 ${selectedZone === z.zone_key ? 'bg-emerald-50 font-medium' : ''}`}>
                {z.display_name}
              </button>
            ))}
          </div>
        </div>

        {/* Bedrooms */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-3 border-b bg-blue-50 rounded-t-lg">
            <h3 className="font-bold text-blue-900 text-sm">Bedrooms</h3>
          </div>
          <div className="divide-y">
            {bedroomZones.map(z => (
              <button key={z.zone_key} onClick={() => loadZoneTasks(z.zone_key)}
                className={`w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 ${selectedZone === z.zone_key ? 'bg-emerald-50 font-medium' : ''}`}>
                {z.display_name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Zone Task List */}
      {selectedZone && (
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-4 border-b flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-900">
                {zones.find(z => z.zone_key === selectedZone)?.display_name || selectedZone}
              </h2>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => { setViewMode('tasks'); loadZoneTasks(selectedZone) }}
                  className={`text-xs px-3 py-1 rounded-full ${viewMode === 'tasks' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}
                >
                  Task Library
                </button>
                <button
                  onClick={() => { setViewMode('rotation'); loadZoneTasks(selectedZone) }}
                  className={`text-xs px-3 py-1 rounded-full ${viewMode === 'rotation' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}
                >
                  Rotation Overview
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-emerald-600 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add Task
            </button>
          </div>

          {/* Add task form */}
          {showAddForm && (
            <div className="p-4 bg-gray-50 border-b space-y-3">
              <input
                type="text"
                value={newTask.task_text}
                onChange={e => setNewTask(prev => ({ ...prev, task_text: e.target.value }))}
                placeholder="Task description"
                className="w-full text-sm border rounded px-3 py-2"
              />
              <div className="flex gap-3 items-center flex-wrap">
                <select
                  value={newTask.task_type}
                  onChange={e => setNewTask(prev => ({ ...prev, task_type: e.target.value }))}
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value="anchor">Anchor (always)</option>
                  <option value="rotating">Rotating</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={newTask.health_priority}
                    onChange={e => setNewTask(prev => ({ ...prev, health_priority: e.target.checked }))}
                  />
                  Health priority
                </label>
                <input
                  type="number"
                  value={newTask.duration_mins}
                  onChange={e => setNewTask(prev => ({ ...prev, duration_mins: parseInt(e.target.value) || 5 }))}
                  className="w-16 text-sm border rounded px-2 py-1"
                  min={1}
                  max={60}
                />
                <span className="text-xs text-gray-500">mins</span>
                <button onClick={addTask} className="bg-emerald-600 text-white text-xs px-4 py-1.5 rounded hover:bg-emerald-700">
                  Save
                </button>
                <button onClick={() => setShowAddForm(false)} className="text-xs text-gray-500 hover:text-gray-700">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Task list */}
          <div className="divide-y max-h-96 overflow-y-auto">
            {zoneTasks.map(task => (
              <div key={task.id} className={`flex items-center gap-3 px-4 py-2.5 ${!task.active ? 'opacity-50' : ''}`}>
                <button onClick={() => toggleTaskActive(task.id)} className="flex-shrink-0">
                  {task.active ? (
                    <Eye className="w-4 h-4 text-green-500" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm text-gray-900">{task.task_text}</span>
                    {task.health_priority && <span className="text-xs">❤️</span>}
                    {task.kid_filter && task.kid_filter.length > 0 && (
                      <span className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                        {task.kid_filter.join(', ')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      task.task_type === 'anchor' ? 'bg-amber-50 text-amber-700' :
                      task.task_type === 'weekly' ? 'bg-blue-50 text-blue-700' :
                      task.task_type === 'monthly' ? 'bg-purple-50 text-purple-700' :
                      'bg-gray-50 text-gray-600'
                    }`}>
                      {task.task_type}
                    </span>
                    <span className="text-xs text-gray-400">{task.duration_mins}m</span>
                    {task.equipment && (
                      <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                        {task.equipment}
                      </span>
                    )}
                    {viewMode === 'rotation' && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${daysSinceColor(task.last_completed || null)}`}>
                        {task.last_completed
                          ? `${Math.floor((Date.now() - new Date(task.last_completed).getTime()) / 86400000)}d ago`
                          : 'Never'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {zoneTasks.length === 0 && (
              <div className="p-6 text-center text-gray-400 text-sm">
                {selectedZone ? 'No tasks in this zone yet' : 'Select a zone to view tasks'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
