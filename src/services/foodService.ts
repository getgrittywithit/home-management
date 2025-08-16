'use client'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export interface FoodItem {
  id: string
  profile_id?: string
  name: string
  quantity: number
  unit: string
  location: 'fridge' | 'freezer' | 'pantry'
  category: 'proteins' | 'dairy' | 'produce' | 'grains' | 'canned' | 'frozen' | 'condiments' | 'snacks' | 'beverages' | 'other'
  expiration_date?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface MealPlan {
  id: string
  profile_id?: string
  date: string
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  dish_name: string
  ingredients: string[]
  servings: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface BulkSuggestion {
  item_name: string
  suggested_location: string
  suggested_category: string
  auto_expiry: string
}

// Food Inventory Functions
export async function getFoodInventory(): Promise<FoodItem[]> {
  try {
    const { data, error } = await supabase
      .from('food_inventory')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching food inventory:', error)
    // Fallback to localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('family-food-inventory')
      return saved ? JSON.parse(saved) : []
    }
    return []
  }
}

export async function addFoodItem(item: Omit<FoodItem, 'id' | 'created_at' | 'updated_at'>): Promise<FoodItem | null> {
  try {
    const { data, error } = await supabase
      .from('food_inventory')
      .insert([item])
      .select()
      .single()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error adding food item:', error)
    return null
  }
}

export async function updateFoodItem(id: string, updates: Partial<FoodItem>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('food_inventory')
      .update(updates)
      .eq('id', id)
    
    if (error) throw error
    return true
  } catch (error) {
    console.error('Error updating food item:', error)
    return false
  }
}

export async function deleteFoodItem(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('food_inventory')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting food item:', error)
    return false
  }
}

// Meal Plan Functions
export async function getMealPlans(): Promise<MealPlan[]> {
  try {
    const { data, error } = await supabase
      .from('meal_plans')
      .select('*')
      .order('date', { ascending: true })
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching meal plans:', error)
    // Fallback to localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('family-meal-plan')
      return saved ? JSON.parse(saved) : []
    }
    return []
  }
}

export async function addMealPlan(meal: Omit<MealPlan, 'id' | 'created_at' | 'updated_at'>): Promise<MealPlan | null> {
  try {
    const { data, error } = await supabase
      .from('meal_plans')
      .insert([meal])
      .select()
      .single()
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error adding meal plan:', error)
    return null
  }
}

export async function addBulkMealPlans(meals: Omit<MealPlan, 'id' | 'created_at' | 'updated_at'>[]): Promise<MealPlan[]> {
  try {
    const { data, error } = await supabase
      .from('meal_plans')
      .insert(meals)
      .select()
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error adding bulk meal plans:', error)
    return []
  }
}

// Smart Bulk Import Functions
export async function getBulkSuggestions(groceryList: string[]): Promise<BulkSuggestion[]> {
  try {
    const { data, error } = await supabase
      .rpc('bulk_add_groceries', {
        p_profile_id: 'temp-user-id', // Will be replaced with actual user ID
        grocery_list: groceryList
      })
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error getting bulk suggestions:', error)
    return []
  }
}

export async function addBulkFoodItems(items: Omit<FoodItem, 'id' | 'created_at' | 'updated_at'>[]): Promise<FoodItem[]> {
  try {
    const { data, error } = await supabase
      .from('food_inventory')
      .insert(items)
      .select()
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error adding bulk food items:', error)
    return []
  }
}

// Get current user's profile ID (simplified for now)
export function getCurrentProfileId(): string {
  // For now, return a default family member ID
  // In a real app, this would get the authenticated user's profile
  return 'moses-family-parent-1'
}