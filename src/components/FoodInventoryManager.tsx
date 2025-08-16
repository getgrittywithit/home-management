'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  Refrigerator, Package, ChefHat, Plus, Edit3, Trash2, Calendar,
  CheckCircle, Clock, AlertTriangle, Upload, Bot, Save, Eye,
  Home, Car, Snowflake, Coffee
} from 'lucide-react'
import { aiAgent } from '@/services/aiAgent'

interface FoodItem {
  id: string
  name: string
  quantity: string
  unit: string
  location: FoodLocation
  category: FoodCategory
  expirationDate?: string
  notes?: string
  addedDate: string
}

interface MealPlan {
  id: string
  date: string
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  dish: string
  ingredients: string[]
  servings: number
  notes?: string
}

type FoodLocation = 'kitchen-fridge' | 'kitchen-freezer' | 'garage-fridge' | 'garage-freezer' | 'pantry'
type FoodCategory = 'proteins' | 'dairy' | 'produce' | 'grains' | 'canned' | 'frozen' | 'condiments' | 'snacks' | 'beverages' | 'other'

const LOCATIONS = [
  { id: 'kitchen-fridge', name: 'Kitchen Fridge', icon: Refrigerator, color: 'bg-blue-500' },
  { id: 'kitchen-freezer', name: 'Kitchen Freezer', icon: Snowflake, color: 'bg-cyan-500' },
  { id: 'garage-fridge', name: 'Garage Fridge', icon: Car, color: 'bg-green-500' },
  { id: 'garage-freezer', name: 'Garage Freezer', icon: Snowflake, color: 'bg-teal-500' },
  { id: 'pantry', name: 'Pantry', icon: Package, color: 'bg-amber-500' }
] as const

const CATEGORIES = [
  'proteins', 'dairy', 'produce', 'grains', 'canned', 'frozen', 'condiments', 'snacks', 'beverages', 'other'
] as const

export default function FoodInventoryManager() {
  const [inventory, setInventory] = useState<FoodItem[]>([])
  const [mealPlan, setMealPlan] = useState<MealPlan[]>([])
  const [selectedLocation, setSelectedLocation] = useState<FoodLocation | 'all'>('all')
  const [isProcessing, setIsProcessing] = useState(false)
  const [activeTab, setActiveTab] = useState<'inventory' | 'meal-plan' | 'bulk-input'>('inventory')
  const [bulkInput, setBulkInput] = useState('')
  const [apiKeySet, setApiKeySet] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check API key on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasApiKey = localStorage.getItem('claude-api-key') !== null
      setApiKeySet(hasApiKey)
      loadInventory()
      loadMealPlan()
    }
  }, [])

  const loadInventory = () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('family-food-inventory')
      if (saved) {
        setInventory(JSON.parse(saved))
      }
    }
  }

  const saveInventory = (items: FoodItem[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('family-food-inventory', JSON.stringify(items))
    }
  }

  const loadMealPlan = () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('family-meal-plan')
      if (saved) {
        setMealPlan(JSON.parse(saved))
      }
    }
  }

  const saveMealPlan = (plan: MealPlan[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('family-meal-plan', JSON.stringify(plan))
    }
  }

  const processBulkInventory = async () => {
    if (!apiKeySet) {
      alert('Please set your Claude API key first')
      return
    }

    if (!bulkInput.trim()) {
      alert('Please enter your food inventory list')
      return
    }

    setIsProcessing(true)

    try {
      const prompt = `Please analyze this food inventory list and organize it into a structured format. For each item, identify:
1. Item name
2. Quantity and unit
3. Best storage location (kitchen-fridge, kitchen-freezer, garage-fridge, garage-freezer, or pantry)
4. Food category (proteins, dairy, produce, grains, canned, frozen, condiments, snacks, beverages, other)
5. Any expiration concerns

Here's the inventory:
${bulkInput}

Return the response as a JSON array of objects with fields: name, quantity, unit, location, category, notes`

      const response = await aiAgent.chatResponse(prompt)
      
      // Parse AI response and add to inventory
      try {
        // Extract JSON from response
        const jsonMatch = response.response.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          const parsedItems = JSON.parse(jsonMatch[0])
          const newItems: FoodItem[] = parsedItems.map((item: any, index: number) => ({
            id: `bulk-${Date.now()}-${index}`,
            name: item.name || 'Unknown Item',
            quantity: item.quantity || '1',
            unit: item.unit || 'item',
            location: item.location || 'pantry',
            category: item.category || 'other',
            notes: item.notes || '',
            addedDate: new Date().toISOString()
          }))

          const updatedInventory = [...inventory, ...newItems]
          setInventory(updatedInventory)
          saveInventory(updatedInventory)
          setBulkInput('')
          alert(`Added ${newItems.length} items to inventory!`)
        } else {
          throw new Error('Could not parse AI response as JSON')
        }
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError)
        alert('AI processed the list but response format was unexpected. Please try again or add items manually.')
      }

    } catch (error) {
      console.error('Error processing bulk inventory:', error)
      alert('Error processing inventory. Please check your API key and try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const generateMealPlan = async () => {
    if (!apiKeySet) {
      alert('Please set your Claude API key first')
      return
    }

    if (inventory.length === 0) {
      alert('Please add some inventory items first')
      return
    }

    setIsProcessing(true)

    try {
      const inventoryList = inventory.map(item => 
        `${item.quantity} ${item.unit} ${item.name} (${item.location})`
      ).join('\n')

      const today = new Date()
      const dates = []
      for (let i = 0; i <= 3; i++) {
        const date = new Date(today)
        date.setDate(today.getDate() + i)
        dates.push(date.toISOString().split('T')[0])
      }

      const prompt = `Based on this food inventory, create a meal plan from today (${dates[0]}) through Wednesday (${dates[3]}) for a family of 8 (2 parents, 6 kids).

Available food inventory:
${inventoryList}

Please create practical meals using primarily the ingredients we have. Consider:
- Family-friendly meals that kids will eat
- Use ingredients efficiently to minimize waste
- Include breakfast, lunch, and dinner for each day
- Note any ingredients we might need to buy

Return as JSON array with fields: date, meal (breakfast/lunch/dinner), dish, ingredients (array), servings, notes`

      const response = await aiAgent.chatResponse(prompt)
      
      try {
        const jsonMatch = response.response.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          const parsedMeals = JSON.parse(jsonMatch[0])
          const newMealPlan: MealPlan[] = parsedMeals.map((meal: any, index: number) => ({
            id: `meal-${Date.now()}-${index}`,
            date: meal.date,
            meal: meal.meal,
            dish: meal.dish,
            ingredients: Array.isArray(meal.ingredients) ? meal.ingredients : [],
            servings: meal.servings || 8,
            notes: meal.notes || ''
          }))

          setMealPlan(newMealPlan)
          saveMealPlan(newMealPlan)
          setActiveTab('meal-plan')
          alert(`Generated meal plan with ${newMealPlan.length} meals!`)
        } else {
          throw new Error('Could not parse meal plan response')
        }
      } catch (parseError) {
        console.error('Error parsing meal plan:', parseError)
        alert('AI generated meal plan but response format was unexpected. Please try again.')
      }

    } catch (error) {
      console.error('Error generating meal plan:', error)
      alert('Error generating meal plan. Please check your API key and try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const addManualItem = () => {
    const newItem: FoodItem = {
      id: `manual-${Date.now()}`,
      name: 'New Item',
      quantity: '1',
      unit: 'item',
      location: 'pantry',
      category: 'other',
      addedDate: new Date().toISOString()
    }
    const updatedInventory = [...inventory, newItem]
    setInventory(updatedInventory)
    saveInventory(updatedInventory)
  }

  const updateItem = (id: string, updates: Partial<FoodItem>) => {
    const updatedInventory = inventory.map(item => 
      item.id === id ? { ...item, ...updates } : item
    )
    setInventory(updatedInventory)
    saveInventory(updatedInventory)
  }

  const deleteItem = (id: string) => {
    const updatedInventory = inventory.filter(item => item.id !== id)
    setInventory(updatedInventory)
    saveInventory(updatedInventory)
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
            <h1 className="text-2xl font-bold">Food Inventory & Meal Planning</h1>
            <p className="text-green-100">Manage your pantry, fridges, and freezers</p>
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
                  const expiryStatus = getExpiryStatus(item.expirationDate)
                  
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
                            onChange={(e) => updateItem(item.id, { quantity: e.target.value })}
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
                          value={item.expirationDate || ''}
                          onChange={(e) => updateItem(item.id, { expirationDate: e.target.value })}
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
                  Paste or type your complete food inventory. AI will organize it by location and category.
                </p>
              </div>
              
              <div className="space-y-4">
                <textarea
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  className="w-full h-64 p-4 border rounded-lg resize-none"
                  placeholder="Enter your food inventory here. For example:
                  
Kitchen Fridge:
- 1 gallon milk
- 6 eggs
- 2 lbs ground beef
- Lettuce head
- 3 apples

Pantry:
- 1 box cereal
- 2 cans tomato sauce
- 1 bag rice
- Peanut butter jar

And so on..."
                />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">API Key:</span>
                    <div className={`w-3 h-3 rounded-full ${apiKeySet ? 'bg-green-500' : 'bg-red-500'}`} />
                  </div>
                  
                  <button
                    onClick={processBulkInventory}
                    disabled={isProcessing || !bulkInput.trim() || !apiKeySet}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                  >
                    <Bot className="w-4 h-4" />
                    {isProcessing ? 'Processing...' : 'Process with AI'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Meal Plan Tab */}
          {activeTab === 'meal-plan' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Meal Plan</h3>
                <button
                  onClick={generateMealPlan}
                  disabled={isProcessing || inventory.length === 0 || !apiKeySet}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                >
                  <ChefHat className="w-4 h-4" />
                  {isProcessing ? 'Generating...' : 'Generate Meal Plan'}
                </button>
              </div>
              
              {mealPlan.length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(
                    mealPlan.reduce((acc, meal) => {
                      if (!acc[meal.date]) acc[meal.date] = []
                      acc[meal.date].push(meal)
                      return acc
                    }, {} as Record<string, MealPlan[]>)
                  ).map(([date, meals]) => (
                    <div key={date} className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-3">
                        {new Date(date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {meals.sort((a, b) => {
                          const order = { breakfast: 0, lunch: 1, dinner: 2, snack: 3 }
                          return order[a.meal] - order[b.meal]
                        }).map(meal => (
                          <div key={meal.id} className="bg-white p-3 rounded border">
                            <div className="font-medium capitalize text-sm mb-1">{meal.meal}</div>
                            <div className="font-medium">{meal.dish}</div>
                            <div className="text-xs text-gray-600 mt-1">
                              Serves {meal.servings}
                            </div>
                            {meal.ingredients.length > 0 && (
                              <div className="text-xs text-gray-600 mt-1">
                                Ingredients: {meal.ingredients.slice(0, 3).join(', ')}
                                {meal.ingredients.length > 3 && '...'}
                              </div>
                            )}
                            {meal.notes && (
                              <div className="text-xs text-blue-600 mt-1">{meal.notes}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <ChefHat className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No meal plan generated yet</p>
                  <p className="text-sm">Add some inventory items and generate a meal plan</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}