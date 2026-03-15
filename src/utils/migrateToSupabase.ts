import { supabase } from '@/lib/database'

// Helper function to migrate data from localStorage to Supabase
export async function migrateDataToSupabase() {
  const results = {
    todos: { success: 0, failed: 0 },
    contacts: { success: 0, failed: 0 },
    foodInventory: { success: 0, failed: 0 },
    mealPlans: { success: 0, failed: 0 }
  }

  // Migrate Todos
  try {
    const localTodos = JSON.parse(localStorage.getItem('family-todos') || '[]')
    for (const todo of localTodos) {
      try {
        const { error } = await supabase.from('todos').insert({
          content: todo.content,
          status: todo.status || 'pending',
          priority: todo.priority || 'medium',
          category: todo.category || 'general',
          assigned_to: todo.assignedTo,
          due_date: todo.dueDate,
          source: todo.source,
          created_at: todo.createdAt || new Date().toISOString()
        })
        
        if (error) throw error
        results.todos.success++
      } catch (err) {
        console.error('Failed to migrate todo:', err)
        results.todos.failed++
      }
    }
  } catch (err) {
    console.error('Failed to load todos from localStorage:', err)
  }

  // Migrate Contacts
  try {
    const localContacts = JSON.parse(localStorage.getItem('family-contacts') || '[]')
    for (const contact of localContacts) {
      try {
        const { error } = await supabase.from('contacts').insert({
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          organization: contact.organization,
          role: contact.role,
          address: contact.address,
          notes: contact.notes,
          tags: contact.tags || [],
          source: contact.source,
          created_at: contact.dateAdded || new Date().toISOString()
        })
        
        if (error) throw error
        results.contacts.success++
      } catch (err) {
        console.error('Failed to migrate contact:', err)
        results.contacts.failed++
      }
    }
  } catch (err) {
    console.error('Failed to load contacts from localStorage:', err)
  }

  // Migrate Food Inventory
  try {
    const localInventory = JSON.parse(localStorage.getItem('family-food-inventory') || '[]')
    for (const item of localInventory) {
      try {
        const { error } = await supabase.from('food_inventory').insert({
          name: item.name,
          quantity: parseFloat(item.quantity) || 1,
          unit: item.unit || 'item',
          location: item.location,
          category: item.category || 'other',
          expiration_date: item.expirationDate,
          notes: item.notes,
          created_at: item.addedDate || new Date().toISOString()
        })
        
        if (error) throw error
        results.foodInventory.success++
      } catch (err) {
        console.error('Failed to migrate food item:', err)
        results.foodInventory.failed++
      }
    }
  } catch (err) {
    console.error('Failed to load food inventory from localStorage:', err)
  }

  // Migrate Meal Plans
  try {
    const localMealPlans = JSON.parse(localStorage.getItem('family-meal-plan') || '[]')
    for (const meal of localMealPlans) {
      try {
        const { error } = await supabase.from('meal_plans').insert({
          date: meal.date,
          meal_type: meal.meal,
          dish_name: meal.dish,
          ingredients: meal.ingredients || [],
          servings: meal.servings || 8,
          notes: meal.notes
        })
        
        if (error) throw error
        results.mealPlans.success++
      } catch (err) {
        console.error('Failed to migrate meal plan:', err)
        results.mealPlans.failed++
      }
    }
  } catch (err) {
    console.error('Failed to load meal plans from localStorage:', err)
  }

  return results
}

// Function to check if tables exist and are accessible
export async function checkSupabaseTables() {
  const tables = ['profiles', 'todos', 'contacts', 'food_inventory', 'meal_plans', 'documents', 'chat_history']
  const results: Record<string, boolean> = {}
  
  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('id').limit(1)
      results[table] = !error
    } catch (err) {
      results[table] = false
    }
  }
  
  return results
}