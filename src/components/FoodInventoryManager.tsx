'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  Refrigerator, Package, ChefHat, Plus, Edit3, Trash2, Calendar,
  CheckCircle, Clock, AlertTriangle, Upload, Bot, Save, Eye,
  Home, Car, Snowflake, Coffee
} from 'lucide-react'
import { aiAgent } from '@/services/aiAgent'
import {
  getFoodInventory, addFoodItem, updateFoodItem, deleteFoodItem,
  getMealPlans, addBulkMealPlans, getBulkSuggestions, addBulkFoodItems,
  getCurrentProfileId, type FoodItem, type MealPlan
} from '@/services/foodService'

// Using types from foodService

type FoodLocation = 'fridge' | 'freezer' | 'pantry'
type FoodCategory = 'proteins' | 'dairy' | 'produce' | 'grains' | 'canned' | 'frozen' | 'condiments' | 'snacks' | 'beverages' | 'other'

const LOCATIONS = [
  { id: 'fridge', name: 'Fridge', icon: Refrigerator, color: 'bg-blue-500' },
  { id: 'freezer', name: 'Freezer', icon: Snowflake, color: 'bg-cyan-500' },
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

  // Check API key and load data on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasApiKey = localStorage.getItem('claude-api-key') !== null
      setApiKeySet(hasApiKey)
      loadInventory()
      loadMealPlan()
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

  // No longer needed - individual operations save directly to DB

  const loadMealPlan = async () => {
    try {
      const plans = await getMealPlans()
      setMealPlan(plans)
    } catch (error) {
      console.error('Error loading meal plans:', error)
    }
  }

  // No longer needed - meal plans save directly to DB

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
      // Get current inventory with expiration info
      const inventoryByLocation = inventory.reduce((acc, item) => {
        if (!acc[item.location]) acc[item.location] = []
        const expiryInfo = item.expiration_date ? ` (expires ${item.expiration_date})` : ''
        acc[item.location].push(`${item.quantity} ${item.unit} ${item.name}${expiryInfo}`)
        return acc
      }, {} as Record<string, string[]>)

      const inventoryText = Object.entries(inventoryByLocation)
        .map(([location, items]) => `${location.toUpperCase()}:\n${items.join('\n')}`)
        .join('\n\n')

      const today = new Date()
      const dates = []
      for (let i = 0; i <= 6; i++) { // 7 days instead of 4
        const date = new Date(today)
        date.setDate(today.getDate() + i)
        dates.push(date.toISOString().split('T')[0])
      }

      const prompt = `Create a practical 7-day meal plan for the Moses family (8 people: 2 parents + 6 kids ages 5-17).

🏠 CURRENT FOOD INVENTORY:
${inventoryText}

📅 PLAN FOR: ${dates[0]} through ${dates[6]}

✅ REQUIREMENTS:
- Use items expiring soon FIRST
- Kid-friendly meals (they're picky!)
- 3 meals per day (breakfast, lunch, dinner)
- Realistic portions for 8 people
- Note any ingredients to buy

Return JSON array: [{"date": "2024-01-01", "meal_type": "breakfast", "dish_name": "Pancakes", "ingredients": ["flour", "eggs", "milk"], "servings": 8, "notes": "Use milk expiring today"}]`

      const response = await aiAgent.chatResponse(prompt)
      
      try {
        const jsonMatch = response.response.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          const parsedMeals = JSON.parse(jsonMatch[0])
          const profileId = getCurrentProfileId()
          
          const mealPlans = parsedMeals.map((meal: any) => ({
            profile_id: profileId,
            date: meal.date,
            meal_type: meal.meal_type,
            dish_name: meal.dish_name,
            ingredients: Array.isArray(meal.ingredients) ? meal.ingredients : [],
            servings: meal.servings || 8,
            notes: meal.notes || ''
          }))

          // Save to database
          const savedMeals = await addBulkMealPlans(mealPlans)
          
          if (savedMeals.length > 0) {
            await loadMealPlan()
            setActiveTab('meal-plan')
            alert(`🎉 Generated ${savedMeals.length} meals using your real food inventory!`)
          } else {
            alert('Error saving meal plan to database')
          }
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
                <div className="space-y-6">
                  {/* Weekly Overview */}
                  <div className="grid grid-cols-7 gap-2 text-center text-xs">
                    {Object.entries(
                      mealPlan.reduce((acc, meal) => {
                        if (!acc[meal.date]) acc[meal.date] = []
                        acc[meal.date].push(meal)
                        return acc
                      }, {} as Record<string, MealPlan[]>)
                    ).slice(0, 7).map(([date, meals]) => (
                      <div key={date} className="bg-gradient-to-b from-blue-50 to-green-50 p-2 rounded">
                        <div className="font-medium text-gray-800 mb-1">
                          {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })}
                        </div>
                        <div className="space-y-1">
                          {meals.sort((a, b) => {
                            const order = { breakfast: 0, lunch: 1, dinner: 2, snack: 3 }
                            return order[a.meal_type] - order[b.meal_type]
                          }).map(meal => (
                            <div key={meal.id} className="text-xs">
                              <div className="font-medium">{meal.meal_type.charAt(0).toUpperCase()}</div>
                              <div className="text-gray-600 truncate">{meal.dish_name}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Detailed Daily View */}
                  <div className="space-y-4">
                    {Object.entries(
                      mealPlan.reduce((acc, meal) => {
                        if (!acc[meal.date]) acc[meal.date] = []
                        acc[meal.date].push(meal)
                        return acc
                      }, {} as Record<string, MealPlan[]>)
                    ).map(([date, meals]) => (
                      <div key={date} className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border">
                        <h4 className="font-bold text-lg mb-3 text-gray-800">
                          📅 {new Date(date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {meals.sort((a, b) => {
                            const order = { breakfast: 0, lunch: 1, dinner: 2, snack: 3 }
                            return order[a.meal_type] - order[b.meal_type]
                          }).map(meal => {
                            const mealEmojis = { breakfast: '🍳', lunch: '🥗', dinner: '🍽️', snack: '🍿' }
                            return (
                              <div key={meal.id} className="bg-white p-4 rounded-lg border shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                  <span>{mealEmojis[meal.meal_type] || '🍽️'}</span>
                                  <div className="font-bold capitalize text-gray-800">{meal.meal_type}</div>
                                </div>
                                <div className="font-bold text-lg text-gray-900 mb-2">{meal.dish_name}</div>
                                <div className="text-sm text-gray-600 mb-2">
                                  👥 Serves {meal.servings} people
                                </div>
                                {meal.ingredients.length > 0 && (
                                  <div className="text-sm text-gray-700 mb-2">
                                    <div className="font-medium text-gray-800 mb-1">🥗 Ingredients:</div>
                                    <div className="bg-gray-50 p-2 rounded text-xs">
                                      {meal.ingredients.join(', ')}
                                    </div>
                                  </div>
                                )}
                                {meal.notes && (
                                  <div className="text-sm bg-blue-50 text-blue-800 p-2 rounded mt-2">
                                    📝 {meal.notes}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Smart Shopping List */}
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                    <h4 className="font-bold text-lg mb-3 text-yellow-800">
                      🛍️ Smart Shopping List
                    </h4>
                    <div className="text-sm text-yellow-700">
                      AI will suggest items you might need to buy based on your meal plan and current inventory.
                      <br />
                      <em>This feature will be enhanced as you use the system!</em>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <ChefHat className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-xl font-medium mb-2">Ready to Plan Your Meals?</h3>
                  <p className="text-gray-600 mb-4">Add your food inventory above, then generate a smart meal plan</p>
                  <div className="bg-blue-50 p-4 rounded-lg max-w-md mx-auto">
                    <p className="text-sm text-blue-800">
                      🤖 <strong>AI will create meals using your real food!</strong>
                      <br />No more guessing or wasted ingredients.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}