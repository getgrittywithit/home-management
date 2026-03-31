'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit3, Trash2, X, Save, Clock, Star, ChevronDown, ChevronUp } from 'lucide-react'

interface Task {
  id: string
  kid_name: string
  subject: string
  task_label: string
  task_description: string | null
  duration_min: number
  is_recurring: boolean
  recurrence_days: string[]
  stars_value: number
  sort_order: number
  active: boolean
}

const SUBJECTS = ['Math', 'ELAR', 'Science', 'Social Studies', 'Art', 'Life Skills', 'PE']
const DAYS = [
  { key: 'mon', label: 'M' },
  { key: 'tue', label: 'T' },
  { key: 'wed', label: 'W' },
  { key: 'thu', label: 'Th' },
  { key: 'fri', label: 'F' },
]

const KIDS = [
  { id: 'Amos', label: 'Amos', grade: '10th' },
  { id: 'Ellie', label: 'Ellie', grade: '6th' },
  { id: 'Wyatt', label: 'Wyatt', grade: '4th' },
  { id: 'Hannah', label: 'Hannah', grade: '3rd' },
]

interface FormData {
  subject: string
  task_label: string
  task_description: string
  duration_min: number
  stars_value: number
  sort_order: number
  recurrence_days: string[]
}

const EMPTY_FORM: FormData = {
  subject: 'Math',
  task_label: '',
  task_description: '',
  duration_min: 15,
  stars_value: 2,
  sort_order: 0,
  recurrence_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
}

export default function ParentTaskManager() {
  const [selectedKid, setSelectedKid] = useState('Amos')
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/homeschool?action=get_kid_tasks&kid_name=${selectedKid}`)
      const json = await res.json()
      setTasks(json.tasks || [])
    } catch (err) {
      console.error('Failed to load tasks:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedKid])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const handleSave = async () => {
    if (!formData.task_label.trim()) return
    setSaving(true)
    try {
      const body: any = {
        action: editingTask ? 'update_task' : 'create_task',
        ...(editingTask ? { task_id: editingTask.id } : { kid_name: selectedKid }),
        ...formData,
      }
      await fetch('/api/homeschool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      setShowForm(false)
      setEditingTask(null)
      setFormData(EMPTY_FORM)
      fetchTasks()
    } catch (err) {
      console.error('Save failed:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (taskId: string) => {
    try {
      await fetch('/api/homeschool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_task', task_id: taskId }),
      })
      setConfirmDelete(null)
      fetchTasks()
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  const startEdit = (task: Task) => {
    setEditingTask(task)
    setFormData({
      subject: task.subject,
      task_label: task.task_label,
      task_description: task.task_description || '',
      duration_min: task.duration_min,
      stars_value: task.stars_value,
      sort_order: task.sort_order,
      recurrence_days: task.recurrence_days || ['mon', 'tue', 'wed', 'thu', 'fri'],
    })
    setShowForm(true)
  }

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      recurrence_days: prev.recurrence_days.includes(day)
        ? prev.recurrence_days.filter(d => d !== day)
        : [...prev.recurrence_days, day],
    }))
  }

  // Group tasks by subject
  const grouped: Record<string, Task[]> = {}
  for (const task of tasks) {
    if (!grouped[task.subject]) grouped[task.subject] = []
    grouped[task.subject].push(task)
  }

  // Add/Edit form
  if (showForm) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {editingTask ? 'Edit Task' : `Add Task for ${selectedKid}`}
          </h3>
          <button onClick={() => { setShowForm(false); setEditingTask(null); setFormData(EMPTY_FORM) }}
            className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Subject</label>
            <select
              value={formData.subject}
              onChange={e => setFormData(p => ({ ...p, subject: e.target.value }))}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
            >
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Task Label *</label>
            <input
              type="text"
              value={formData.task_label}
              onChange={e => setFormData(p => ({ ...p, task_label: e.target.value }))}
              placeholder="e.g., IXL Math — 4th Grade"
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Description (shown to kid)</label>
            <input
              type="text"
              value={formData.task_description}
              onChange={e => setFormData(p => ({ ...p, task_description: e.target.value }))}
              placeholder="e.g., Complete 15 minutes in workbook"
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-sm font-medium text-gray-700">Duration (min)</label>
              <input
                type="number"
                value={formData.duration_min}
                onChange={e => setFormData(p => ({ ...p, duration_min: parseInt(e.target.value) || 15 }))}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                min="1" max="120"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Stars</label>
              <input
                type="number"
                value={formData.stars_value}
                onChange={e => setFormData(p => ({ ...p, stars_value: parseInt(e.target.value) || 1 }))}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                min="0" max="10"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Sort Order</label>
              <input
                type="number"
                value={formData.sort_order}
                onChange={e => setFormData(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Recurrence Days</label>
            <div className="flex gap-2">
              {DAYS.map(day => (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => toggleDay(day.key)}
                  className={`w-10 h-10 rounded-lg text-sm font-medium ${
                    formData.recurrence_days.includes(day.key)
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSave}
            disabled={!formData.task_label.trim() || saving}
            className="flex-1 bg-teal-600 text-white py-2.5 rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : editingTask ? 'Save Changes' : 'Add Task'}
          </button>
          <button
            onClick={() => { setShowForm(false); setEditingTask(null); setFormData(EMPTY_FORM) }}
            className="px-4 py-2.5 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Kid selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Daily Task Manager</h3>
        <button
          onClick={() => { setFormData(EMPTY_FORM); setShowForm(true) }}
          className="bg-teal-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-teal-700 flex items-center gap-1"
        >
          <Plus className="w-4 h-4" /> Add Task
        </button>
      </div>

      <div className="flex gap-2">
        {KIDS.map(kid => (
          <button
            key={kid.id}
            onClick={() => setSelectedKid(kid.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              selectedKid === kid.id
                ? 'bg-teal-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {kid.label}
          </button>
        ))}
      </div>

      {/* Tasks grouped by subject */}
      {loading ? (
        <p className="text-center text-gray-500 py-8">Loading tasks...</p>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-500 mb-2">No tasks set up for {selectedKid} yet.</p>
          <button
            onClick={() => { setFormData(EMPTY_FORM); setShowForm(true) }}
            className="text-teal-600 hover:text-teal-800 text-sm font-medium"
          >
            + Add the first task
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([subject, subjectTasks]) => (
            <div key={subject} className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <h4 className="font-medium text-gray-800 text-sm">{subject}</h4>
              </div>
              <div className="divide-y divide-gray-100">
                {subjectTasks.map(task => (
                  <div key={task.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${task.active ? 'text-gray-900' : 'text-gray-400'}`}>
                        {task.task_label}
                        {!task.active && <span className="ml-2 text-xs text-gray-400">(inactive)</span>}
                      </div>
                      {task.task_description && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{task.task_description}</p>
                      )}
                      <div className="flex gap-3 mt-1 text-xs text-gray-400">
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-3 h-3" /> {task.duration_min}m
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Star className="w-3 h-3" /> {task.stars_value}
                        </span>
                        <span>
                          {(task.recurrence_days || []).map(d => d.charAt(0).toUpperCase()).join(' ')}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => startEdit(task)}
                        className="p-2 text-gray-400 hover:text-blue-600 rounded"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      {confirmDelete === task.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(task.id)}
                            className="px-2 py-1 bg-red-600 text-white rounded text-xs"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="px-2 py-1 bg-gray-200 text-gray-600 rounded text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(task.id)}
                          className="p-2 text-gray-400 hover:text-red-600 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
