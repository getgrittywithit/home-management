'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Refrigerator, Package, ChefHat, Plus, Edit3, Trash2, Calendar,
  CheckCircle, Clock, AlertTriangle, Upload, Bot, Save, Eye,
  Home, Car, Snowflake, Coffee, ChevronLeft, ChevronRight, Check, X,
  Wrench
} from 'lucide-react'
import MealAdminEditor from './MealAdminEditor'
import { aiAgent } from '@/services/aiAgent'
import {
  getFoodInventory, addFoodItem, updateFoodItem, deleteFoodItem,
  getBulkSuggestions, addBulkFoodItems,
  getCurrentProfileId, type FoodItem
} from '@/services/foodService'

// Using types from foodService

type FoodLocation = 'fridge' | 'freezer' | 'pantry' | 'spice-cabinet' | 'baking-cabinet' | 'other'
type FoodCategory = 'proteins' | 'dairy' | 'produce' | 'grains' | 'canned' | 'frozen' | 'condiments' | 'snacks' | 'beverages' | 'other'

const LOCATIONS = [
  { id: 'fridge', name: 'Fridge', icon: Refrigerator, color: 'bg-blue-500' },
  { id: 'freezer', name: 'Freezer', icon: Snowflake, color: 'bg-cyan-500' },
  { id: 'pantry', name: 'Pantry', icon: Package, color: 'bg-amber-500' },
  { id: 'spice-cabinet', name: 'Spice Cabinet', icon: Coffee, color: 'bg-orange-500' },
  { id: 'baking-cabinet', name: 'Baking', icon: ChefHat, color: 'bg-yellow-500' },
  { id: 'other', name: 'Other', icon: Home, color: 'bg-gray-500' },
] as const

const CATEGORIES = [
  'proteins', 'dairy', 'produce', 'grains', 'canned', 'frozen', 'condiments', 'snacks', 'beverages', 'other'
] as const

export default function FoodInventoryManager() {
  const [inventory, setInventory] = useState<FoodItem[]>([])
  const [selectedLocation, setSelectedLocation] = useState<FoodLocation | 'all'>('all')
  const [isProcessing, setIsProcessing] = useState(false)
  const [activeTab, setActiveTab] = useState<'inventory' | 'meal-plan' | 'bulk-input' | 'shopping'>('inventory')
  const [bulkInput, setBulkInput] = useState('')
  const [apiKeySet] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check API key and load data on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      loadInventory()
    }
  }, [])

  const loadInventory = async () => {
    try {
      const items = await getFoodInventory()
      setInventory(items)
    } catch (error) {
      console.error('Error loading inventory:', error)
    }
  }

  const processBulkInventory = async () => {
    if (!bulkInput.trim()) {
      alert('Please enter your food inventory list')
      return
    }

    setIsProcessing(true)

    try {
      // Extract individual items from bulk input
      const items = bulkInput
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.includes(':') && line.includes(' '))
        .map(line => line.replace(/^[-*•]\s*/, '').trim())

      if (items.length === 0) {
        alert('No items found. Please format as a list (one item per line)')
        return
      }

      // Get smart suggestions for all items
      const suggestions = await getBulkSuggestions(items)
      
      // Create food items with smart defaults
      const profileId = getCurrentProfileId()
      const foodItems = items.map((itemText, index) => {
        const suggestion = suggestions[index]
        const [quantityPart, ...nameParts] = itemText.split(' ')
        const quantity = parseFloat(quantityPart) || 1
        const name = nameParts.join(' ') || itemText
        
        return {
          profile_id: profileId,
          name: name,
          quantity: quantity,
          unit: suggestion?.suggested_location === 'freezer' ? 'lb' : 'item',
          location: (suggestion?.suggested_location as any) || 'pantry',
          category: (suggestion?.suggested_category as any) || 'other',
          expiration_date: suggestion?.auto_expiry ? suggestion.auto_expiry.split('T')[0] : undefined,
          notes: `Added via bulk import`
        }
      })

      // Save to database
      const savedItems = await addBulkFoodItems(foodItems)
      
      if (savedItems.length > 0) {
        // Refresh inventory
        await loadInventory()
        setBulkInput('')
        alert(`Added ${savedItems.length} items to inventory with smart categorization!`)
      } else {
        alert('Error saving items to database')
      }

    } catch (error) {
      console.error('Error processing bulk inventory:', error)
      alert('Error processing inventory. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const addManualItem = async () => {
    const profileId = getCurrentProfileId()
    const newItem = {
      profile_id: profileId,
      name: 'New Item',
      quantity: 1,
      unit: 'item',
      location: 'pantry' as const,
      category: 'other' as const
    }
    
    const savedItem = await addFoodItem(newItem)
    if (savedItem) {
      await loadInventory()
    }
  }

  const updateItem = async (id: string, updates: Partial<FoodItem>) => {
    const success = await updateFoodItem(id, updates)
    if (success) {
      // Update local state immediately for better UX
      const updatedInventory = inventory.map(item => 
        item.id === id ? { ...item, ...updates } : item
      )
      setInventory(updatedInventory)
    }
  }

  const deleteItem = async (id: string) => {
    const success = await deleteFoodItem(id)
    if (success) {
      const updatedInventory = inventory.filter(item => item.id !== id)
      setInventory(updatedInventory)
    }
  }

  const filteredInventory = selectedLocation === 'all' 
    ? inventory 
    : inventory.filter(item => item.location === selectedLocation)

  const getLocationIcon = (location: FoodLocation) => {
    const locationData = LOCATIONS.find(l => l.id === location)
    return locationData ? locationData.icon : Package
  }

  const getExpiryStatus = (expirationDate?: string) => {
    if (!expirationDate) return 'none'
    const expiry = new Date(expirationDate)
    const today = new Date()
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysUntilExpiry < 0) return 'expired'
    if (daysUntilExpiry <= 3) return 'soon'
    if (daysUntilExpiry <= 7) return 'warning'
    return 'good'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Food & Meals</h1>
            <p className="text-green-100">Meal planning, pantry, and food inventory</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{inventory.length}</div>
            <div className="text-sm text-green-100">Food Items</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg border">
        <div className="flex border-b">
          {[
            { id: 'inventory', name: 'Inventory', icon: Package },
            { id: 'meal-plan', name: 'Meal Plan', icon: ChefHat },
            { id: 'shopping', name: 'Shopping List', icon: Car },
            { id: 'bulk-input', name: 'Bulk Input', icon: Upload }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 font-medium ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Inventory Tab */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              {/* Location Filter */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setSelectedLocation('all')}
                    className={`px-3 py-1 rounded text-sm ${
                      selectedLocation === 'all'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    All Locations ({inventory.length})
                  </button>
                  {LOCATIONS.map(location => {
                    const count = inventory.filter(item => item.location === location.id).length
                    const Icon = location.icon
                    return (
                      <button
                        key={location.id}
                        onClick={() => setSelectedLocation(location.id)}
                        className={`flex items-center gap-1 px-3 py-1 rounded text-sm ${
                          selectedLocation === location.id
                            ? `${location.color} text-white`
                            : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        {location.name} ({count})
                      </button>
                    )
                  })}
                </div>
                <button
                  onClick={addManualItem}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>

              {/* Inventory Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredInventory.map(item => {
                  const Icon = getLocationIcon(item.location)
                  const expiryStatus = getExpiryStatus(item.expiration_date)
                  
                  return (
                    <div key={item.id} className="bg-gray-50 p-4 rounded-lg border">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-gray-600" />
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateItem(item.id, { name: e.target.value })}
                            className="font-medium bg-transparent border-none outline-none"
                          />
                        </div>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, { quantity: parseFloat(e.target.value) || 1 })}
                            className="w-16 text-sm bg-white border rounded px-2 py-1"
                            placeholder="1"
                          />
                          <select
                            value={item.unit}
                            onChange={(e) => updateItem(item.id, { unit: e.target.value })}
                            className="text-sm bg-white border rounded px-2 py-1"
                          >
                            <option value="item">item</option>
                            <option value="lb">lb</option>
                            <option value="oz">oz</option>
                            <option value="cup">cup</option>
                            <option value="can">can</option>
                            <option value="bag">bag</option>
                            <option value="box">box</option>
                          </select>
                        </div>
                        
                        <select
                          value={item.location}
                          onChange={(e) => updateItem(item.id, { location: e.target.value as FoodLocation })}
                          className="w-full text-xs bg-white border rounded px-2 py-1"
                        >
                          {LOCATIONS.map(loc => (
                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                          ))}
                        </select>
                        
                        <select
                          value={item.category}
                          onChange={(e) => updateItem(item.id, { category: e.target.value as FoodCategory })}
                          className="w-full text-xs bg-white border rounded px-2 py-1"
                        >
                          {CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>
                              {cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </option>
                          ))}
                        </select>
                        
                        <input
                          type="date"
                          value={item.expiration_date || ''}
                          onChange={(e) => updateItem(item.id, { expiration_date: e.target.value })}
                          className="w-full text-xs bg-white border rounded px-2 py-1"
                          placeholder="Expiration date"
                        />
                        
                        {expiryStatus !== 'none' && (
                          <div className={`text-xs flex items-center gap-1 ${
                            expiryStatus === 'expired' ? 'text-red-600' :
                            expiryStatus === 'soon' ? 'text-orange-600' :
                            expiryStatus === 'warning' ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {expiryStatus === 'expired' && <AlertTriangle className="w-3 h-3" />}
                            {expiryStatus === 'soon' && <Clock className="w-3 h-3" />}
                            {expiryStatus === 'warning' && <Clock className="w-3 h-3" />}
                            {expiryStatus === 'good' && <CheckCircle className="w-3 h-3" />}
                            {expiryStatus === 'expired' ? 'Expired' :
                             expiryStatus === 'soon' ? 'Expires soon' :
                             expiryStatus === 'warning' ? 'Expires this week' : 'Good'}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                
                {filteredInventory.length === 0 && (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No items in {selectedLocation === 'all' ? 'inventory' : LOCATIONS.find(l => l.id === selectedLocation)?.name}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bulk Input Tab */}
          {activeTab === 'bulk-input' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Bulk Food Inventory Input</h3>
                <p className="text-gray-600 mb-4">
                  🚀 <strong>Super Quick Grocery Entry!</strong> Just paste your grocery list - AI will automatically sort items into fridge, freezer, or pantry with smart expiration dates.
                </p>
              </div>
              
              <div className="space-y-4">
                <textarea
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  className="w-full h-64 p-4 border rounded-lg resize-none"
                  placeholder="📝 QUICK ENTRY - Just list your groceries!

Example:
2 gallons milk
1 dozen eggs  
3 lbs ground beef
1 bag lettuce
5 lbs apples
2 boxes cereal
4 cans tomato sauce
1 bag rice
1 jar peanut butter
2 lbs chicken breast
1 bag frozen vegetables

✨ Smart AI will automatically sort by fridge/freezer/pantry!"
                />
                
                <div className="flex items-center justify-end">
                  <button
                    onClick={processBulkInventory}
                    disabled={isProcessing || !bulkInput.trim()}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                  >
                    <Bot className="w-4 h-4" />
                    {isProcessing ? 'Processing...' : 'Process with AI'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Shopping List Tab */}
          {activeTab === 'shopping' && <ShoppingListView />}

          {/* Meal Plan Tab */}
          {activeTab === 'meal-plan' && (
            <MealPlanWeekView />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Meal Plan Week View (Phase 1 + Phase 2 Recipes + R2 Dinner Rotation) ─────────────

interface MealRow { dish_name: string; meal_name?: string; recipe_id: string | null }
interface Recipe { id: string; title: string; ingredients: string[]; steps: string[] }

// ── Dinner Rotation Config ─────────────

const DINNER_ROTATION = {
  week1: {
    monday:    { kid: 'Kaylee',          theme: 'american-comfort', emoji: '🇺🇸', label: 'American Comfort Night' },
    tuesday:   { kid: 'Zoey',            theme: 'asian',          emoji: '\uD83E\uDD61', label: 'Asian Night' },
    wednesday: { kid: 'Wyatt',           theme: 'bar-night',      emoji: '\uD83E\uDD57', label: 'Bar Night' },
    thursday:  { kid: 'Amos',            theme: 'mexican',        emoji: '\uD83C\uDF2E', label: 'Mexican Night' },
    friday:    { kid: 'Ellie & Hannah',  theme: 'pizza-italian',  emoji: '\uD83C\uDF55', label: 'Pizza & Italian Night' },
    saturday:  { kid: 'Parents',         theme: 'grill',          emoji: '\uD83D\uDD25', label: 'Grill Night' },
    sunday:    { kid: 'Parents',         theme: 'roast-comfort',  emoji: '\uD83C\uDFE1', label: 'Roast/Comfort Sunday' },
  },
  week2: {
    monday:    { kid: 'Kaylee',          theme: 'soup-comfort',   emoji: '\uD83C\uDF72', label: 'Soup/Comfort Night' },
    tuesday:   { kid: 'Zoey',            theme: 'asian',          emoji: '\uD83E\uDD61', label: 'Asian Night' },
    wednesday: { kid: 'Wyatt',           theme: 'easy-lazy',      emoji: '\uD83E\uDD6A', label: 'Easy/Lazy Night' },
    thursday:  { kid: 'Amos',            theme: 'mexican',        emoji: '\uD83C\uDF2E', label: 'Mexican Night' },
    friday:    { kid: 'Ellie & Hannah',  theme: 'pizza-italian',  emoji: '\uD83C\uDF55', label: 'Pizza & Italian Night' },
    saturday:  { kid: 'Parents',         theme: 'experiment',     emoji: '\uD83D\uDD2C', label: 'Experiment/Big Cook' },
    sunday:    { kid: 'Parents',         theme: 'brunch',         emoji: '\uD83C\uDF73', label: 'Brunch Sunday' },
  }
} as const

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

const EPOCH = new Date('2026-03-30T00:00:00') // Monday of first Week 1

function getRotationWeek(monday: Date): 1 | 2 {
  const weeks = Math.floor((monday.getTime() - EPOCH.getTime()) / (7 * 24 * 60 * 60 * 1000))
  return (((weeks % 2) + 2) % 2) === 0 ? 1 : 2 // handles negative weeks correctly
}

function getCurrentSeason(): 'spring-summer' | 'fall-winter' {
  const month = new Date().getMonth() + 1
  return (month >= 3 && month <= 8) ? 'spring-summer' : 'fall-winter'
}

interface RotationRequest { date: string; kid_name: string; meal_name: string; status: string; meal_id: string }

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function getWeekDates(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

function MealPlanWeekView() {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [meals, setMeals] = useState<Record<string, MealRow>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  // Modal state
  const [editorDate, setEditorDate] = useState<string | null>(null)
  const [viewDate, setViewDate] = useState<string | null>(null)
  const [editorIngredients, setEditorIngredients] = useState<string[]>([''])
  const [editorSteps, setEditorSteps] = useState<string[]>([''])
  const [editorSaving, setEditorSaving] = useState(false)
  const [viewRecipe, setViewRecipe] = useState<Recipe | null>(null)
  const [uploadParsing, setUploadParsing] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Rotation state
  const [rotationRequests, setRotationRequests] = useState<RotationRequest[]>([])

  // Admin mode
  const [adminMode, setAdminMode] = useState(false)

  const weekDates = getWeekDates(weekStart)
  const weekEnd = weekDates[6]
  const rotationWeek = getRotationWeek(weekStart)
  const rotation = rotationWeek === 1 ? DINNER_ROTATION.week1 : DINNER_ROTATION.week2
  const season = getCurrentSeason()

  // Fetch meals for displayed week
  useEffect(() => {
    setLoaded(false)
    fetch(`/api/meal-plan?start=${toDateStr(weekStart)}&end=${toDateStr(weekEnd)}`)
      .then(res => res.json())
      .then((rows: any[]) => {
        const map: Record<string, MealRow> = {}
        rows.forEach((r: any) => {
          const key = (r.date || r.plan_date || '').split('T')[0]
          map[key] = { dish_name: r.dish_name || r.meal_name || '', meal_name: r.dish_name || r.meal_name || '', recipe_id: r.recipe_id }
        })
        setMeals(map)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [weekStart])

  // Fetch rotation requests for displayed week
  useEffect(() => {
    fetch(`/api/parent/meal-plan?action=rotation_status&weekStart=${toDateStr(weekStart)}`)
      .then(res => res.json())
      .then(data => setRotationRequests(data.requests || []))
      .catch(() => setRotationRequests([]))
  }, [weekStart])

  const saveMeal = async (dateStr: string, mealName: string) => {
    setMeals(prev => ({ ...prev, [dateStr]: { ...prev[dateStr], dish_name: mealName, meal_name: mealName, recipe_id: prev[dateStr]?.recipe_id || null } }))
    setSaving(dateStr)
    try {
      await fetch('/api/meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr, dish_name: mealName || null }),
      })
    } catch (error) {
      console.error('Error saving meal plan:', error)
    }
    setTimeout(() => setSaving(prev => (prev === dateStr ? null : prev)), 1200)
  }

  // Open recipe editor
  const openEditor = async (dateStr: string) => {
    const row = meals[dateStr]
    if (row?.recipe_id) {
      // Load existing recipe
      try {
        const res = await fetch(`/api/recipes?id=${row.recipe_id}`)
        if (res.ok) {
          const recipe: Recipe = await res.json()
          setEditorIngredients(recipe.ingredients.length > 0 ? recipe.ingredients : [''])
          setEditorSteps(recipe.steps.length > 0 ? recipe.steps : [''])
          setEditorDate(dateStr)
          return
        }
      } catch {}
    }
    // New recipe
    setEditorIngredients([''])
    setEditorSteps([''])
    setEditorDate(dateStr)
  }

  // Save recipe from editor
  const saveRecipe = async () => {
    if (!editorDate) return
    const mealName = meals[editorDate]?.meal_name || ''
    if (!mealName) return

    setEditorSaving(true)
    const ingredients = editorIngredients.filter(s => s.trim())
    const steps = editorSteps.filter(s => s.trim())

    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: mealName, ingredients, steps, plan_date: editorDate }),
      })
      if (res.ok) {
        const { recipe_id } = await res.json()
        setMeals(prev => ({ ...prev, [editorDate!]: { ...prev[editorDate!], recipe_id } }))
      }
    } catch (error) {
      console.error('Error saving recipe:', error)
    }
    setEditorSaving(false)
    setEditorDate(null)
  }

  // Upload and parse recipe file
  const handleRecipeUpload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File too large — try a smaller image.')
      return
    }

    setUploadParsing(true)
    setUploadError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/recipes/parse', { method: 'POST', body: formData })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setUploadError(data.error || "Couldn't read this file — try a clearer image or paste the recipe manually.")
        setUploadParsing(false)
        return
      }

      const parsed = await res.json()

      // Pre-fill editor fields
      if (parsed.ingredients?.length > 0) {
        setEditorIngredients(parsed.ingredients)
      }
      if (parsed.steps?.length > 0) {
        setEditorSteps(parsed.steps)
      }

      // If no meal name set yet for this day, use parsed title
      if (editorDate && parsed.title && !meals[editorDate]?.meal_name) {
        saveMeal(editorDate, parsed.title)
      }
    } catch {
      setUploadError("Couldn't read this file — try a clearer image or paste the recipe manually.")
    } finally {
      setUploadParsing(false)
    }
  }

  // Open recipe view
  const openRecipeView = async (dateStr: string) => {
    const row = meals[dateStr]
    if (!row?.recipe_id) return
    try {
      const res = await fetch(`/api/recipes?id=${row.recipe_id}`)
      if (res.ok) {
        const recipe: Recipe = await res.json()
        setViewRecipe(recipe)
        setViewDate(dateStr)
      }
    } catch {}
  }

  const goToPrevWeek = () => { const p = new Date(weekStart); p.setDate(p.getDate() - 7); setWeekStart(p) }
  const goToNextWeek = () => { const n = new Date(weekStart); n.setDate(n.getDate() + 7); setWeekStart(n) }
  const goToCurrentWeek = () => setWeekStart(getMonday(new Date()))
  const isCurrentWeek = toDateStr(weekStart) === toDateStr(getMonday(new Date()))
  const todayStr = toDateStr(new Date())

  // Build a lookup: dateStr -> rotation request
  const requestByDate: Record<string, RotationRequest> = {}
  rotationRequests.forEach(r => { requestByDate[r.date] = r })

  return (
    <div className="space-y-4">
      {/* ── Admin Mode Toggle ── */}
      <div className="flex justify-end">
        <button
          onClick={() => setAdminMode(!adminMode)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            adminMode
              ? 'bg-amber-100 text-amber-800 border border-amber-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
          }`}
        >
          <Wrench className="w-4 h-4" />
          {adminMode ? 'Exit Admin' : 'Edit Meals'}
        </button>
      </div>

      {/* ── Dinner Rotation Section ── */}
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-bold text-orange-900 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Dinner Rotation — Week {rotationWeek}
            </h3>
            <p className="text-xs text-orange-600 mt-0.5">
              {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              {' '}&middot;{' '}{season === 'spring-summer' ? 'Spring/Summer' : 'Fall/Winter'} menu
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${rotationWeek === 1 ? 'bg-orange-200 text-orange-800' : 'bg-amber-200 text-amber-800'}`}>
            Week {rotationWeek} of 2
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {DAY_KEYS.map((dayKey, idx) => {
            const info = rotation[dayKey]
            const dateStr = toDateStr(weekDates[idx])
            const isToday = dateStr === todayStr
            const isWeekend = idx >= 5
            const req = requestByDate[dateStr]
            const approvedMeal = req?.status === 'approved' ? req.meal_name : null
            const pendingMeal = req?.status === 'pending' ? req.meal_name : null
            // Also check if there's a meal in the existing meal plan
            const plannedMeal = meals[dateStr]?.meal_name

            return (
              <div
                key={dayKey}
                className={`rounded-lg p-3 border-2 transition-all ${
                  isToday
                    ? 'border-orange-500 bg-white shadow-md ring-2 ring-orange-300'
                    : isWeekend
                      ? 'border-purple-300 bg-purple-50'
                      : 'border-orange-100 bg-white'
                } ${isWeekend ? 'sm:col-span-1' : ''}`}
              >
                <div className="text-center">
                  <div className={`text-xs font-semibold uppercase tracking-wide ${isToday ? 'text-orange-600' : isWeekend ? 'text-purple-600' : 'text-gray-500'}`}>
                    {dayKey.charAt(0).toUpperCase() + dayKey.slice(1, 3)}
                  </div>
                  <div className="text-2xl mt-1">{info.emoji}</div>
                  <div className={`text-xs font-bold mt-1 ${isWeekend ? 'text-purple-800' : 'text-gray-900'}`}>
                    {info.kid}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                    {info.label}
                  </div>

                  {/* Show approved meal, pending badge, or planned meal */}
                  {approvedMeal ? (
                    <div className="mt-2 px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-[10px] font-medium truncate" title={approvedMeal}>
                      <CheckCircle className="w-2.5 h-2.5 inline mr-0.5" />
                      {approvedMeal}
                    </div>
                  ) : pendingMeal ? (
                    <div className="mt-2 px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded text-[10px] font-medium truncate" title={pendingMeal}>
                      <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                      Pending approval
                    </div>
                  ) : plannedMeal ? (
                    <div className="mt-2 px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-medium truncate" title={plannedMeal}>
                      {plannedMeal}
                    </div>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Admin Mode Editor ── */}
      {adminMode && <MealAdminEditor />}

      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <button onClick={goToPrevWeek} className="p-2 rounded hover:bg-gray-100"><ChevronLeft className="w-5 h-5" /></button>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">
            {weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – {weekEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </h3>
          {!isCurrentWeek && (
            <button onClick={goToCurrentWeek} className="text-xs text-blue-600 hover:underline mt-1">Back to this week</button>
          )}
        </div>
        <button onClick={goToNextWeek} className="p-2 rounded hover:bg-gray-100"><ChevronRight className="w-5 h-5" /></button>
      </div>

      {/* Day rows */}
      {!loaded ? (
        <div className="text-center py-8 text-gray-400">Loading...</div>
      ) : (
        <div className="space-y-3">
          {weekDates.map(date => {
            const dateStr = toDateStr(date)
            const isToday = dateStr === todayStr
            const row = meals[dateStr] || { meal_name: '', recipe_id: null }
            const hasRecipe = !!row.recipe_id
            const justSaved = saving === dateStr

            return (
              <div
                key={dateStr}
                className={`flex items-center gap-4 p-4 rounded-lg border ${
                  isToday ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'
                }`}
              >
                <div className="w-36 flex-shrink-0">
                  <div className={`font-semibold ${isToday ? 'text-blue-700' : 'text-gray-900'}`}>
                    {date.toLocaleDateString('en-US', { weekday: 'long' })}
                  </div>
                  <div className="text-xs text-gray-500">
                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>

                <div className="flex-1 flex items-center gap-2">
                  {hasRecipe ? (
                    <>
                      <button
                        onClick={() => openRecipeView(dateStr)}
                        className="px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-medium hover:bg-green-200 transition-colors"
                      >
                        {row.meal_name}
                      </button>
                      <button
                        onClick={() => openEditor(dateStr)}
                        className="text-gray-400 hover:text-gray-600"
                        title="Edit recipe"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <input
                        type="text"
                        defaultValue={row.meal_name}
                        key={`${dateStr}-${row.meal_name}`}
                        placeholder="Tonight's dinner..."
                        onBlur={e => {
                          const val = e.target.value.trim()
                          if (val !== (row.meal_name || '')) saveMeal(dateStr, val)
                        }}
                        className={`flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                          isToday ? 'border-blue-300 bg-white' : 'border-gray-200'
                        }`}
                      />
                      {row.meal_name && (
                        <button
                          onClick={() => openEditor(dateStr)}
                          className="text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap"
                        >
                          + Recipe
                        </button>
                      )}
                    </>
                  )}
                </div>

                <div className="w-16 text-right">
                  {justSaved && (
                    <span className="text-xs text-green-600 flex items-center gap-1 justify-end">
                      <Check className="w-3 h-3" /> Saved
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Recipe Editor Modal */}
      {editorDate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditorDate(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                Recipe: {meals[editorDate]?.meal_name || 'Untitled'}
              </h3>
              <button onClick={() => setEditorDate(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Upload Recipe */}
              <div>
                <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed text-sm font-medium transition-colors cursor-pointer ${
                  uploadParsing ? 'border-gray-300 text-gray-400 cursor-wait' : 'border-blue-300 text-blue-600 hover:bg-blue-50'
                }`}>
                  <Upload className="w-4 h-4" />
                  {uploadParsing ? 'Reading recipe...' : 'Upload Recipe'}
                  <input
                    type="file"
                    accept="image/*,.pdf,.txt,.text"
                    className="hidden"
                    disabled={uploadParsing}
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (f) handleRecipeUpload(f)
                      e.target.value = ''
                    }}
                  />
                </label>
                <span className="text-xs text-gray-400 ml-2">Image, PDF, or text file</span>
                {uploadError && (
                  <p className="text-xs text-red-500 mt-1">{uploadError}</p>
                )}
              </div>

              {/* Ingredients */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Ingredients</h4>
                <div className="space-y-2">
                  {editorIngredients.map((ing, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={ing}
                        onChange={e => {
                          const next = [...editorIngredients]
                          next[i] = e.target.value
                          setEditorIngredients(next)
                        }}
                        placeholder="e.g. 2 cups flour"
                        className="flex-1 border rounded px-3 py-1.5 text-sm"
                      />
                      {editorIngredients.length > 1 && (
                        <button
                          onClick={() => setEditorIngredients(editorIngredients.filter((_, j) => j !== i))}
                          className="text-red-400 hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setEditorIngredients([...editorIngredients, ''])}
                  className="text-xs text-blue-600 hover:underline mt-2"
                >
                  + Add ingredient
                </button>
              </div>

              {/* Steps */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Steps</h4>
                <div className="space-y-2">
                  {editorSteps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-xs font-bold text-gray-400 mt-2 w-5 text-right flex-shrink-0">{i + 1}.</span>
                      <textarea
                        value={step}
                        onChange={e => {
                          const next = [...editorSteps]
                          next[i] = e.target.value
                          setEditorSteps(next)
                        }}
                        placeholder="Describe this step..."
                        rows={2}
                        className="flex-1 border rounded px-3 py-1.5 text-sm resize-none"
                      />
                      {editorSteps.length > 1 && (
                        <button
                          onClick={() => setEditorSteps(editorSteps.filter((_, j) => j !== i))}
                          className="text-red-400 hover:text-red-600 mt-1.5"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setEditorSteps([...editorSteps, ''])}
                  className="text-xs text-blue-600 hover:underline mt-2"
                >
                  + Add step
                </button>
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setEditorDate(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                Cancel
              </button>
              <button
                onClick={saveRecipe}
                disabled={editorSaving}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {editorSaving ? 'Saving...' : 'Save Recipe'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recipe View Modal (read-only) */}
      {viewDate && viewRecipe && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setViewDate(null); setViewRecipe(null) }}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">{viewRecipe.title}</h3>
              <button onClick={() => { setViewDate(null); setViewRecipe(null) }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {viewRecipe.ingredients.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Ingredients</h4>
                  <ul className="space-y-1">
                    {viewRecipe.ingredients.map((ing, i) => (
                      <li key={i} className="flex items-start gap-2 text-gray-700">
                        <span className="text-green-500 mt-0.5">•</span>
                        <span className="text-base">{ing}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {viewRecipe.steps.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Steps</h4>
                  <ol className="space-y-3">
                    {viewRecipe.steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-7 h-7 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-sm font-bold">
                          {i + 1}
                        </span>
                        <span className="text-base text-gray-800 pt-0.5 leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {viewRecipe.ingredients.length === 0 && viewRecipe.steps.length === 0 && (
                <p className="text-gray-400 text-center py-4">No recipe details added yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Shopping List View ─────────────

interface ShopItem { id: number; item_name: string; quantity: string | null; category: string; checked: boolean; source: string }

function ShoppingListView() {
  const [items, setItems] = useState<ShopItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [newItem, setNewItem] = useState('')
  const [newQty, setNewQty] = useState('')
  const [newCat, setNewCat] = useState('other')
  const [generating, setGenerating] = useState(false)

  useEffect(() => { loadItems() }, [])

  const loadItems = () => {
    fetch('/api/shopping-list').then(r => r.json())
      .then(data => { setItems(data.items || []); setLoaded(true) })
      .catch(() => setLoaded(true))
  }

  const addItem = async () => {
    if (!newItem.trim()) return
    await fetch('/api/shopping-list', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_item', item_name: newItem.trim(), quantity: newQty || null, category: newCat })
    })
    setNewItem(''); setNewQty('')
    loadItems()
  }

  const toggle = async (id: number, checked: boolean) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, checked: !checked } : i))
    await fetch('/api/shopping-list', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_item', id, checked: !checked })
    })
  }

  const clearChecked = async () => {
    await fetch('/api/shopping-list', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear_checked' })
    })
    setItems(prev => prev.filter(i => !i.checked))
  }

  const generate = async () => {
    setGenerating(true)
    await fetch('/api/shopping-list', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'generate_from_meals' })
    })
    setGenerating(false)
    loadItems()
  }

  const addLowSupply = async () => {
    await fetch('/api/shopping-list', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_low_supply' })
    })
    loadItems()
  }

  if (!loaded) return <div className="text-center py-8 text-gray-400">Loading...</div>

  const unchecked = items.filter(i => !i.checked)
  const checked = items.filter(i => i.checked)
  const CATS = ['produce', 'proteins', 'dairy', 'grains', 'pantry', 'other']

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Shopping List</h3>
        <div className="flex gap-2">
          <button onClick={generate} disabled={generating}
            className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50">
            {generating ? 'Generating...' : "Generate from this week's meals"}
          </button>
          <button onClick={addLowSupply} className="bg-amber-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-amber-600">
            Add low supply items
          </button>
        </div>
      </div>

      {/* Add item */}
      <div className="flex gap-2">
        <input type="text" value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItem()}
          placeholder="Add item..." className="flex-1 border rounded-lg px-3 py-2 text-sm" />
        <input type="text" value={newQty} onChange={e => setNewQty(e.target.value)}
          placeholder="Qty" className="w-20 border rounded-lg px-3 py-2 text-sm" />
        <select value={newCat} onChange={e => setNewCat(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          {CATS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
        <button onClick={addItem} disabled={!newItem.trim()} className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600 disabled:opacity-50">Add</button>
      </div>

      {/* Items */}
      {unchecked.length === 0 && checked.length === 0 && (
        <p className="text-center text-gray-400 py-8">Shopping list is empty. Add items manually or generate from this week's meals.</p>
      )}

      <div className="divide-y border rounded-lg">
        {unchecked.map(item => (
          <div key={item.id} className="flex items-center gap-3 px-4 py-2">
            <button onClick={() => toggle(item.id, item.checked)} className="w-5 h-5 border-2 border-gray-300 rounded hover:border-green-500 flex-shrink-0" />
            <span className="text-sm text-gray-800 flex-1">{item.item_name}</span>
            {item.quantity && <span className="text-xs text-gray-500">{item.quantity}</span>}
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{item.category}</span>
          </div>
        ))}
        {checked.map(item => (
          <div key={item.id} className="flex items-center gap-3 px-4 py-2 bg-gray-50">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <span className="text-sm text-gray-400 line-through flex-1">{item.item_name}</span>
          </div>
        ))}
      </div>

      {checked.length > 0 && (
        <button onClick={clearChecked} className="text-sm text-red-500 hover:text-red-700">Clear {checked.length} checked item{checked.length > 1 ? 's' : ''}</button>
      )}
    </div>
  )
}