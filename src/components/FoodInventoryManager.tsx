'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Refrigerator, Package, ChefHat, Plus, Trash2,
  CheckCircle, Clock, AlertTriangle, Upload, Bot, Eye,
  Home, Car, Snowflake, Coffee,
  Wrench, ShoppingCart
} from 'lucide-react'
import MealAdminEditor from './MealAdminEditor'
import GroceryTab from './GroceryTab'
import RecipeSuggestions from './RecipeSuggestions'
import MealFeedbackAnalytics from './MealFeedbackAnalytics'
import WeeklyMealCalendar from './WeeklyMealCalendar'
import GroceryRequestReview from './GroceryRequestReview'
import GroceryPDFButtons from './GroceryPDFButtons'
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
  const [activeTab, setActiveTab] = useState<'inventory' | 'meal-plan' | 'bulk-input' | 'shopping' | 'grocery'>('meal-plan')
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
            { id: 'grocery', name: 'Grocery', icon: ShoppingCart },
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

          {/* Grocery Tab */}
          {activeTab === 'grocery' && (
            <div className="space-y-6">
              <GroceryRequestReview />
              <GroceryPDFButtons />
              <GroceryTab />
            </div>
          )}

          {/* Meal Plan Tab */}
          {activeTab === 'meal-plan' && <MealPlanTab />}
        </div>
      </div>
    </div>
  )
}

// ── Meal Plan Tab (D50: unified expandable rotation card + admin editor) ─────────────

function MealPlanTab() {
  const [adminMode, setAdminMode] = useState(false)
  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button
          onClick={() => setAdminMode(m => !m)}
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

      <WeeklyMealCalendar isParent />

      <RecipeSuggestions />

      {adminMode && <MealAdminEditor />}

      <MealFeedbackAnalytics />
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