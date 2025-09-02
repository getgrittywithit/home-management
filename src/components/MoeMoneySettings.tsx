'use client'

import React, { useState, useEffect } from 'react'
import { Settings, Plus, Edit2, Trash2, Save, X, Tag, Building2 } from 'lucide-react'

interface Category {
  id: string
  name: string
  description?: string
  color?: string
  is_default?: boolean
}

interface BusinessClass {
  id: string
  name: string
  code: string
  description?: string
  color?: string
  active: boolean
}

interface MoeMoneySettingsProps {
  onClose: () => void
  onCategoryUpdate: () => void
}

export default function MoeMoneySettings({ onClose, onCategoryUpdate }: MoeMoneySettingsProps) {
  const [activeTab, setActiveTab] = useState<'categories' | 'business'>('categories')
  const [categories, setCategories] = useState<Category[]>([])
  const [businessClasses, setBusinessClasses] = useState<BusinessClass[]>([])
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [editingBusiness, setEditingBusiness] = useState<string | null>(null)
  const [newCategory, setNewCategory] = useState({ name: '', description: '', color: '#3B82F6' })
  const [newBusiness, setNewBusiness] = useState({ name: '', code: '', description: '', color: '#3B82F6' })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Load categories
      const catResponse = await fetch('/api/expense-categories')
      if (catResponse.ok) {
        const { data } = await catResponse.json()
        setCategories(data || [])
      }

      // Load business classes
      const bizResponse = await fetch('/api/business-classes')
      if (bizResponse.ok) {
        const { data } = await bizResponse.json()
        setBusinessClasses(data || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) return

    try {
      const response = await fetch('/api/expense-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCategory)
      })

      if (response.ok) {
        const { data } = await response.json()
        setCategories([...categories, data])
        setNewCategory({ name: '', description: '', color: '#3B82F6' })
        onCategoryUpdate()
      }
    } catch (error) {
      console.error('Error adding category:', error)
    }
  }

  const handleUpdateCategory = async (id: string, updates: Partial<Category>) => {
    try {
      const response = await fetch(`/api/expense-categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        setCategories(categories.map(cat => 
          cat.id === id ? { ...cat, ...updates } : cat
        ))
        setEditingCategory(null)
        onCategoryUpdate()
      }
    } catch (error) {
      console.error('Error updating category:', error)
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return

    try {
      const response = await fetch(`/api/expense-categories/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setCategories(categories.filter(cat => cat.id !== id))
        onCategoryUpdate()
      }
    } catch (error) {
      console.error('Error deleting category:', error)
    }
  }

  const handleAddBusiness = async () => {
    if (!newBusiness.name.trim() || !newBusiness.code.trim()) return

    try {
      const response = await fetch('/api/business-classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBusiness)
      })

      if (response.ok) {
        const { data } = await response.json()
        setBusinessClasses([...businessClasses, data])
        setNewBusiness({ name: '', code: '', description: '', color: '#3B82F6' })
      }
    } catch (error) {
      console.error('Error adding business class:', error)
    }
  }

  const handleUpdateBusiness = async (id: string, updates: Partial<BusinessClass>) => {
    try {
      const response = await fetch(`/api/business-classes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        setBusinessClasses(businessClasses.map(biz => 
          biz.id === id ? { ...biz, ...updates } : biz
        ))
        setEditingBusiness(null)
      }
    } catch (error) {
      console.error('Error updating business class:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="w-6 h-6" />
              <h2 className="text-2xl font-bold">Moe-Money Settings</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'categories'
                ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Tag className="w-4 h-4 inline mr-2" />
            Expense Categories
          </button>
          <button
            onClick={() => setActiveTab('business')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'business'
                ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Building2 className="w-4 h-4 inline mr-2" />
            Business Classes
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : activeTab === 'categories' ? (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Add New Category</h3>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Category name"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    className="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500"
                  />
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={newCategory.description}
                    onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                    className="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500"
                  />
                  <input
                    type="color"
                    value={newCategory.color}
                    onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                    className="w-12 h-10 border rounded-md cursor-pointer"
                  />
                  <button
                    onClick={handleAddCategory}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold mb-4">Existing Categories</h3>
                {categories.map((category) => (
                  <div key={category.id} className="bg-gray-50 rounded-md p-4">
                    {editingCategory === category.id ? (
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={category.name}
                          onChange={(e) => setCategories(categories.map(cat =>
                            cat.id === category.id ? { ...cat, name: e.target.value } : cat
                          ))}
                          className="flex-1 px-3 py-2 border rounded-md"
                        />
                        <input
                          type="color"
                          value={category.color || '#3B82F6'}
                          onChange={(e) => setCategories(categories.map(cat =>
                            cat.id === category.id ? { ...cat, color: e.target.value } : cat
                          ))}
                          className="w-12 h-10 border rounded-md cursor-pointer"
                        />
                        <button
                          onClick={() => handleUpdateCategory(category.id, {
                            name: category.name,
                            color: category.color
                          })}
                          className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingCategory(null)}
                          className="bg-gray-500 text-white px-3 py-2 rounded-md hover:bg-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: category.color || '#3B82F6' }}
                          />
                          <span className="font-medium">{category.name}</span>
                          {category.description && (
                            <span className="text-sm text-gray-500">({category.description})</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingCategory(category.id)}
                            className="text-blue-600 hover:bg-blue-50 p-2 rounded-md"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {!category.is_default && (
                            <button
                              onClick={() => handleDeleteCategory(category.id)}
                              className="text-red-600 hover:bg-red-50 p-2 rounded-md"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Add New Business Class</h3>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Business name"
                    value={newBusiness.name}
                    onChange={(e) => setNewBusiness({ ...newBusiness, name: e.target.value })}
                    className="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500"
                  />
                  <input
                    type="text"
                    placeholder="Code (e.g., CHEETAH)"
                    value={newBusiness.code}
                    onChange={(e) => setNewBusiness({ ...newBusiness, code: e.target.value.toUpperCase() })}
                    className="w-32 px-3 py-2 border rounded-md focus:ring-2 focus:ring-green-500"
                  />
                  <input
                    type="color"
                    value={newBusiness.color}
                    onChange={(e) => setNewBusiness({ ...newBusiness, color: e.target.value })}
                    className="w-12 h-10 border rounded-md cursor-pointer"
                  />
                  <button
                    onClick={handleAddBusiness}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold mb-4">Business Classes</h3>
                {businessClasses.map((business) => (
                  <div key={business.id} className="bg-gray-50 rounded-md p-4">
                    {editingBusiness === business.id ? (
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={business.name}
                          onChange={(e) => setBusinessClasses(businessClasses.map(biz =>
                            biz.id === business.id ? { ...biz, name: e.target.value } : biz
                          ))}
                          className="flex-1 px-3 py-2 border rounded-md"
                        />
                        <input
                          type="color"
                          value={business.color || '#3B82F6'}
                          onChange={(e) => setBusinessClasses(businessClasses.map(biz =>
                            biz.id === business.id ? { ...biz, color: e.target.value } : biz
                          ))}
                          className="w-12 h-10 border rounded-md cursor-pointer"
                        />
                        <button
                          onClick={() => handleUpdateBusiness(business.id, {
                            name: business.name,
                            color: business.color,
                            active: business.active
                          })}
                          className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingBusiness(null)}
                          className="bg-gray-500 text-white px-3 py-2 rounded-md hover:bg-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: business.color || '#3B82F6' }}
                          />
                          <span className="font-medium">{business.name}</span>
                          <span className="text-sm text-gray-500 font-mono bg-gray-200 px-2 py-1 rounded">
                            {business.code}
                          </span>
                          {!business.active && (
                            <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">Inactive</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingBusiness(business.id)}
                            className="text-blue-600 hover:bg-blue-50 p-2 rounded-md"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleUpdateBusiness(business.id, { active: !business.active })}
                            className={`${
                              business.active ? 'text-orange-600' : 'text-green-600'
                            } hover:bg-gray-100 p-2 rounded-md`}
                          >
                            {business.active ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}