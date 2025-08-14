'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  CheckSquare, Plus, Edit3, Trash2, Clock, AlertCircle, 
  Star, Circle, CheckCircle2, Filter, Calendar, User, Archive
} from 'lucide-react'
import { UnicornAnimation, GlitterBurst, useTodoAnimations } from './TodoAnimations'

interface Todo {
  id: string
  content: string
  status: 'pending' | 'in_progress' | 'completed'
  priority: 'high' | 'medium' | 'low'
  createdAt?: Date
  dueDate?: Date
  assignedTo?: string
  category?: string
}

export default function TodoTab() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newTodo, setNewTodo] = useState('')
  const [selectedPriority, setSelectedPriority] = useState<'high' | 'medium' | 'low'>('medium')
  const [selectedCategory, setSelectedCategory] = useState('general')
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [showArchive, setShowArchive] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editPriority, setEditPriority] = useState<'high' | 'medium' | 'low'>('medium')
  const [editCategory, setEditCategory] = useState('general')
  
  // Animation hooks
  const { 
    animationQueue, 
    triggerUnicornAnimation, 
    triggerGlitterBurst, 
    completeAnimation 
  } = useTodoAnimations()

  // Load todos from the TodoRead API
  useEffect(() => {
    loadTodos()
  }, [])

  const loadTodos = async () => {
    try {
      setIsLoading(true)
      
      // Load todos from database
      const response = await fetch('/api/todos')
      if (response.ok) {
        const data = await response.json()
        setTodos(data.map((todo: any) => ({
          ...todo,
          createdAt: new Date(todo.created_at),
          dueDate: todo.due_date ? new Date(todo.due_date) : undefined
        })))
      } else {
        // Fallback to mock data if API fails
        const mockTodos: Todo[] = [
        {
          id: 'vaccine-waiver-amos',
          content: 'URGENT: Renew Amos\' vaccine waiver - expired 05/10/2025, needs notarization and submission to CHS nurse',
          status: 'pending',
          priority: 'high',
          createdAt: new Date(),
          category: 'school',
          assignedTo: 'Parents'
        },
        {
          id: 'add-nurse-contact',
          content: 'Add Laura T. Booth (CHS Nurse) to contacts system',
          status: 'completed',
          priority: 'medium',
          createdAt: new Date(),
          category: 'contacts'
        },
        {
          id: 'contacts-tab-design',
          content: 'Design and implement Contacts tab for parent portal',
          status: 'completed',
          priority: 'medium',
          createdAt: new Date(),
          category: 'development'
        },
        {
          id: 'multi-school-contacts',
          content: 'Create multi-school contact management system',
          status: 'completed',
          priority: 'medium',
          createdAt: new Date(),
          category: 'development'
        },
        {
          id: 'todo-edit-functionality',
          content: 'Add edit functionality to TodoTab with inline editing',
          status: 'completed',
          priority: 'medium',
          createdAt: new Date(),
          category: 'development'
        },
        {
          id: 'bmsn-pto-meeting-dates',
          content: 'Check BMSN PTO Meeting Dates for 25-26 school year',
          status: 'pending',
          priority: 'medium',
          createdAt: new Date(),
          category: 'school'
        },
        {
          id: 'bmsn-chick-fil-a-days',
          content: 'Review Chick-fil-A Days program for BMSN students',
          status: 'pending',
          priority: 'low',
          createdAt: new Date(),
          category: 'school'
        },
        {
          id: 'bmsn-spirit-wear',
          content: 'Consider BMSN PTO Spirit Wear purchases for kids',
          status: 'pending',
          priority: 'low',
          createdAt: new Date(),
          category: 'family'
        },
        {
          id: 'add-bmsn-pto-contact',
          content: 'Add BMSN PTO contact to contacts system',
          status: 'completed',
          priority: 'medium',
          createdAt: new Date(),
          category: 'contacts'
        },
        {
          id: 'technology-aup-consent',
          content: 'URGENT: Review and consent to Boerne ISD Technology AUP for student',
          status: 'pending',
          priority: 'high',
          createdAt: new Date(),
          category: 'school'
        },
        {
          id: 'add-bmsn-principal',
          content: 'Add Mr. Carr (BMSN Principal) to contacts system',
          status: 'completed',
          priority: 'medium',
          createdAt: new Date(),
          category: 'contacts'
        },
        {
          id: 'review-hb1481-policy',
          content: 'Review HB 1481 cell phone policy: Off and Away for the Day',
          status: 'pending',
          priority: 'medium',
          createdAt: new Date(),
          category: 'school'
        },
        {
          id: 'add-bisd-contact',
          content: 'Add Boerne ISD contact to contacts system',
          status: 'completed',
          priority: 'low',
          createdAt: new Date(),
          category: 'contacts'
        },
        {
          id: 'payschools-account-setup',
          content: 'Set up PaySchools account for meal payments - need student IDs',
          status: 'pending',
          priority: 'high',
          createdAt: new Date(),
          category: 'school'
        },
        {
          id: 'free-reduced-meals-app',
          content: 'Apply for Free/Reduced meals if applicable',
          status: 'pending',
          priority: 'medium',
          createdAt: new Date(),
          category: 'school'
        },
        {
          id: 'review-meal-pricing',
          content: 'Review meal pricing: Breakfast $2.30, Lunch Elementary $3.40, MS/HS $3.65',
          status: 'pending',
          priority: 'low',
          createdAt: new Date(),
          category: 'school'
        },
        {
          id: 'monitor-meal-accounts',
          content: 'Monitor student meal account balances - $50 charge limit',
          status: 'pending',
          priority: 'medium',
          createdAt: new Date(),
          category: 'school'
        },
        {
          id: 'add-nutrition-contacts',
          content: 'Add Child Nutrition contacts to system',
          status: 'completed',
          priority: 'medium',
          createdAt: new Date(),
          category: 'contacts'
        },
        {
          id: 'zoey-summer-reading-book',
          content: 'URGENT: Zoey needs to bring summer reading book to Honors English 1 first day',
          status: 'pending',
          priority: 'high',
          createdAt: new Date(),
          category: 'school'
        },
        {
          id: 'add-erika-hill-contact',
          content: 'Add Erika Hill (Zoey\'s English teacher) to contacts',
          status: 'completed',
          priority: 'medium',
          createdAt: new Date(),
          category: 'contacts'
        },
        {
          id: 'register-parentsquare',
          content: 'Register for ParentSquare communication platform',
          status: 'pending',
          priority: 'high',
          createdAt: new Date(),
          category: 'school'
        },
        {
          id: 'download-parentsquare-app',
          content: 'Download ParentSquare app (optional but recommended)',
          status: 'pending',
          priority: 'low',
          createdAt: new Date(),
          category: 'school'
        },
        {
          id: 'update-skyward-contacts',
          content: 'Update contact info in Skyward Family Access if needed',
          status: 'pending',
          priority: 'medium',
          createdAt: new Date(),
          category: 'school'
        }
      ]
        setTodos(mockTodos)
      }
    } catch (error) {
      console.error('Failed to load todos:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const addTodo = () => {
    if (!newTodo.trim()) return

    const todo: Todo = {
      id: `todo-${Date.now()}`,
      content: newTodo,
      status: 'pending',
      priority: selectedPriority,
      createdAt: new Date(),
      category: selectedCategory
    }

    setTodos(prev => [todo, ...prev])
    setNewTodo('')
  }

  const updateTodoStatus = (id: string, status: Todo['status'], event?: React.MouseEvent) => {
    const updatedTodos = todos.map(todo => 
      todo.id === id ? { ...todo, status } : todo
    )
    
    setTodos(updatedTodos)

    // Trigger animations when completing a todo
    if (status === 'completed') {
      // Trigger both glitter burst at click location and flying unicorn
      if (event) {
        triggerGlitterBurst(event.clientX, event.clientY)
      }
      
      // Small delay before unicorn so they don't overlap too much
      setTimeout(() => {
        triggerUnicornAnimation()
      }, 500)
    }
  }

  const deleteTodo = (id: string) => {
    setTodos(prev => prev.filter(todo => todo.id !== id))
  }

  const startEdit = (todo: Todo) => {
    setEditingId(todo.id)
    setEditContent(todo.content)
    setEditPriority(todo.priority)
    setEditCategory(todo.category || 'general')
  }

  const saveEdit = () => {
    if (!editContent.trim() || !editingId) return

    setTodos(prev => prev.map(todo => 
      todo.id === editingId 
        ? { ...todo, content: editContent, priority: editPriority, category: editCategory }
        : todo
    ))
    cancelEdit()
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditContent('')
    setEditPriority('medium')
    setEditCategory('general')
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'low': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-5 h-5 text-green-500" />
      case 'in_progress': return <Clock className="w-5 h-5 text-blue-500" />
      default: return <Circle className="w-5 h-5 text-gray-400" />
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'school': return '🏫'
      case 'contacts': return '📞'
      case 'development': return '⚙️'
      case 'family': return '👨‍👩‍👧‍👦'
      default: return '📝'
    }
  }

  const activeTodos = todos.filter(todo => todo.status !== 'completed')
  const archivedTodos = todos.filter(todo => todo.status === 'completed')
  
  const filteredActiveTodos = activeTodos.filter(todo => {
    const statusMatch = filter === 'all' || todo.status === filter
    const priorityMatch = priorityFilter === 'all' || todo.priority === priorityFilter
    return statusMatch && priorityMatch
  })
  
  const filteredArchivedTodos = archivedTodos.filter(todo => {
    const priorityMatch = priorityFilter === 'all' || todo.priority === priorityFilter
    return priorityMatch
  })

  const todosByStatus = {
    pending: todos.filter(t => t.status === 'pending').length,
    in_progress: todos.filter(t => t.status === 'in_progress').length,
    completed: todos.filter(t => t.status === 'completed').length
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Family Todos</h1>
            <p className="text-indigo-100">Task management and reminders</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{todos.length}</div>
            <div className="text-sm text-indigo-100">Total Tasks</div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{todosByStatus.pending}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{todosByStatus.in_progress}</div>
              <div className="text-sm text-gray-600">In Progress</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{todosByStatus.completed}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Add New Todo */}
      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-lg font-semibold mb-4">Add New Task</h2>
        <div className="space-y-4">
          <textarea
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            placeholder="Describe the task..."
            className="w-full p-3 border rounded-lg resize-none"
            rows={3}
          />
          <div className="flex gap-4">
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value as any)}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="general">General</option>
              <option value="school">School</option>
              <option value="family">Family</option>
              <option value="contacts">Contacts</option>
              <option value="development">Development</option>
            </select>
            <button
              onClick={addTodo}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
            >
              <Plus className="w-4 h-4" />
              Add Task
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <span className="font-medium">Filters:</span>
          </div>
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-1 border rounded text-sm"
            >
              <option value="all">All Active</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="px-3 py-1 border rounded text-sm"
            >
              <option value="all">All Priority</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Todo List */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Active Tasks ({filteredActiveTodos.length})</h2>
        </div>
        
        <div className="divide-y">
          {filteredActiveTodos.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <CheckSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No active tasks match your current filters</p>
            </div>
          ) : (
            filteredActiveTodos.map(todo => (
              <div key={todo.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start gap-4">
                  <button
                    onClick={(e) => updateTodoStatus(
                      todo.id, 
                      todo.status === 'pending' ? 'in_progress' : 'completed',
                      e
                    )}
                    className="mt-1"
                  >
                    {getStatusIcon(todo.status)}
                  </button>
                  
                  <div className="flex-1">
                    {editingId === todo.id ? (
                      // Edit mode
                      <div className="space-y-3">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full p-2 border rounded resize-none text-sm"
                          rows={3}
                        />
                        <div className="flex items-center gap-2">
                          <select
                            value={editPriority}
                            onChange={(e) => setEditPriority(e.target.value as any)}
                            className="px-2 py-1 border rounded text-xs"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </select>
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="px-2 py-1 border rounded text-xs"
                          >
                            <option value="general">General</option>
                            <option value="school">School</option>
                            <option value="family">Family</option>
                            <option value="contacts">Contacts</option>
                            <option value="development">Development</option>
                          </select>
                          <div className="flex gap-1 ml-auto">
                            <button
                              onClick={saveEdit}
                              className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // View mode
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">
                            {todo.content}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getPriorityColor(todo.priority)}`}>
                              {todo.priority} priority
                            </span>
                            {todo.category && (
                              <span className="text-xs flex items-center gap-1 text-gray-600">
                                {getCategoryIcon(todo.category)}
                                {todo.category}
                              </span>
                            )}
                            {todo.assignedTo && (
                              <span className="text-xs flex items-center gap-1 text-gray-600">
                                <User className="w-3 h-3" />
                                {todo.assignedTo}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => startEdit(todo)}
                            className="text-gray-400 hover:text-blue-500"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteTodo(todo.id)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Archive Section */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <button
            onClick={() => setShowArchive(!showArchive)}
            className="flex items-center gap-2 w-full text-left hover:text-indigo-600"
          >
            <Archive className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Archive ({archivedTodos.length} completed tasks)</h2>
            <span className="ml-auto text-sm text-gray-500">
              {showArchive ? 'Hide' : 'Show'}
            </span>
          </button>
        </div>
        
        {showArchive && (
          <div className="divide-y">
            {filteredArchivedTodos.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Archive className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No completed tasks in archive</p>
              </div>
            ) : (
              filteredArchivedTodos.map(todo => (
                <div key={todo.id} className="p-4 hover:bg-gray-50 bg-gray-25">
                  <div className="flex items-start gap-4">
                    <button
                      onClick={(e) => updateTodoStatus(todo.id, 'pending', e)}
                      className="mt-1"
                      title="Restore to active"
                    >
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    </button>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm line-through text-gray-500">
                            {todo.content}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getPriorityColor(todo.priority)}`}>
                              {todo.priority} priority
                            </span>
                            {todo.category && (
                              <span className="text-xs flex items-center gap-1 text-gray-600">
                                {getCategoryIcon(todo.category)}
                                {todo.category}
                              </span>
                            )}
                            {todo.assignedTo && (
                              <span className="text-xs flex items-center gap-1 text-gray-600">
                                <User className="w-3 h-3" />
                                {todo.assignedTo}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => deleteTodo(todo.id)}
                            className="text-gray-400 hover:text-red-500"
                            title="Delete permanently"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Animation Components */}
      {animationQueue.map(animation => (
        animation.type === 'unicorn' ? (
          <UnicornAnimation
            key={animation.id}
            trigger={true}
            onComplete={() => completeAnimation(animation.id)}
          />
        ) : (
          <GlitterBurst
            key={animation.id}
            x={animation.x || 0}
            y={animation.y || 0}
            trigger={true}
            onComplete={() => completeAnimation(animation.id)}
          />
        )
      ))}
    </div>
  )
}