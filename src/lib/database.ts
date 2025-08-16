import { createClient } from '@supabase/supabase-js'
import { Pool } from 'pg'

// Supabase client configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vhqgzgqklwrjmglaezmh.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseKey)

// Direct PostgreSQL connection for server-side operations
// Use connection pooling with limited connections
const poolConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.vhqgzgqklwrjmglaezmh:71jd4xNjFaBufBAA@aws-0-us-east-2.pooler.supabase.com:5432/postgres',
  ssl: {
    rejectUnauthorized: false
  },
  max: 3, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection cannot be established
}

export const pgPool = new Pool(poolConfig)

// Helper function to execute queries with proper connection handling
export async function query(text: string, params?: any[]) {
  let client
  try {
    client = await pgPool.connect()
    const result = await client.query(text, params)
    return result.rows
  } catch (error) {
    console.error('Database query error:', error)
    throw error
  } finally {
    if (client) {
      client.release()
    }
  }
}

// Single query helper that manages its own connection
async function singleQuery(text: string, params?: any[]): Promise<any[]> {
  return query(text, params)
}

// Database helper functions
export const db = {
  // Family Events
  async getUpcomingEvents(limit = 10) {
    return singleQuery(`
      SELECT 
        fe.*,
        child.first_name as child_name,
        captain.first_name as captain_name,
        backup.first_name as backup_name
      FROM family_events fe
      LEFT JOIN profiles child ON fe.child_id = child.id
      LEFT JOIN profiles captain ON fe.captain_id = captain.id  
      LEFT JOIN profiles backup ON fe.backup_id = backup.id
      WHERE fe.start_time >= NOW()
      ORDER BY fe.start_time
      LIMIT $1
    `, [limit])
  },

  async getTodaysEvents() {
    return singleQuery(`
      SELECT 
        fe.*,
        child.first_name as child_name,
        captain.first_name as captain_name
      FROM family_events fe
      LEFT JOIN profiles child ON fe.child_id = child.id
      LEFT JOIN profiles captain ON fe.captain_id = captain.id
      WHERE DATE(fe.start_time) = CURRENT_DATE
      ORDER BY fe.start_time
    `)
  },

  // Water Management
  async getWaterStatus() {
    const result = await singleQuery('SELECT * FROM water_status LIMIT 1')
    return result[0] || { jugs_full: 0, jugs_empty: 0, jugs_in_use: 0, estimated_days_left: 0 }
  },

  async updateWaterJug(jugNumber: number, status: 'full' | 'empty' | 'in_use') {
    return singleQuery(`
      UPDATE water_jugs 
      SET status = $1, updated_at = NOW(),
          last_filled_date = CASE WHEN $1 = 'full' THEN CURRENT_DATE ELSE last_filled_date END
      WHERE jug_number = $2
      RETURNING *
    `, [status, jugNumber])
  },

  // Ride Tokens
  async getTokensToday() {
    return singleQuery('SELECT * FROM tokens_available_today ORDER BY first_name')
  },

  async useTokens(childId: string, tokensUsed: number) {
    return singleQuery(`
      INSERT INTO ride_tokens (child_id, date, tokens_used, week_start)
      VALUES ($1, CURRENT_DATE, $2, date_trunc('week', CURRENT_DATE))
      ON CONFLICT (child_id, date) 
      DO UPDATE SET tokens_used = ride_tokens.tokens_used + $2
      RETURNING *
    `, [childId, tokensUsed])
  },

  // On-Call Schedule
  async getTodaysOnCall() {
    const result = await singleQuery(`
      SELECT 
        ocs.date,
        p.first_name as on_call_parent
      FROM on_call_schedule ocs
      JOIN profiles p ON ocs.on_call_parent_id = p.id
      WHERE ocs.date = CURRENT_DATE
      LIMIT 1
    `)
    return result[0]?.on_call_parent || 'Not Set'
  },

  async setOnCall(date: string, parentId: string) {
    return singleQuery(`
      INSERT INTO on_call_schedule (date, on_call_parent_id, manually_set)
      VALUES ($1, $2, true)
      ON CONFLICT (date)
      DO UPDATE SET on_call_parent_id = $2, manually_set = true
      RETURNING *
    `, [date, parentId])
  },

  // Money Tracking
  async getTodaysRevenue() {
    const result = await singleQuery(`
      SELECT COALESCE(SUM(net_amount), 0) as total
      FROM money_sales 
      WHERE date = CURRENT_DATE
    `)
    return Number(result[0]?.total || 0)
  },

  async logSale(channel: string, product: string, grossAmount: number, fees = 0) {
    const netAmount = grossAmount - fees
    return singleQuery(`
      INSERT INTO money_sales (date, channel, product, gross_amount, fees, net_amount)
      VALUES (CURRENT_DATE, $1, $2, $3, $4, $5)
      RETURNING *
    `, [channel, product, grossAmount, fees, netAmount])
  },

  // Family Profiles
  async getAllProfiles() {
    return singleQuery(`
      SELECT * FROM profiles 
      ORDER BY 
        CASE role 
          WHEN 'parent' THEN 1 
          WHEN 'child' THEN 2 
          ELSE 3 
        END,
        first_name
    `)
  },

  async getChildren() {
    return singleQuery(`
      SELECT * FROM profiles 
      WHERE role = 'child' 
      ORDER BY first_name
    `)
  },

  async getParents() {
    return singleQuery(`
      SELECT * FROM profiles 
      WHERE role = 'parent' 
      ORDER BY first_name
    `)
  },

  // Zone Management
  async getZoneStatus() {
    return singleQuery(`
      SELECT 
        z.*,
        primary_assignee.first_name as primary_name,
        buddy.first_name as buddy_name,
        zc.completion_date as last_completed
      FROM zones z
      LEFT JOIN profiles primary_assignee ON z.primary_assignee_id = primary_assignee.id
      LEFT JOIN profiles buddy ON z.buddy_id = buddy.id
      LEFT JOIN LATERAL (
        SELECT completion_date 
        FROM zone_completions 
        WHERE zone_id = z.id 
        ORDER BY completion_date DESC 
        LIMIT 1
      ) zc ON true
      ORDER BY z.name
    `)
  },

  // Todos - Updated to use Supabase
  async getTodos() {
    try {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching todos:', error)
      // Fallback to localStorage
      if (typeof window !== 'undefined') {
        return JSON.parse(localStorage.getItem('family-todos') || '[]')
      }
      return []
    }
  },

  async addTodo(content: string, priority: 'high' | 'medium' | 'low' = 'medium', category: string = 'general', assignedTo?: string) {
    try {
      const { data, error } = await supabase
        .from('todos')
        .insert([{
          content,
          priority,
          category,
          assigned_to: assignedTo,
          status: 'pending'
        }])
        .select()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error adding todo:', error)
      throw error
    }
  },

  async updateTodoStatus(id: string, status: string) {
    try {
      const { data, error } = await supabase
        .from('todos')
        .update({ status })
        .eq('id', id)
        .select()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating todo:', error)
      throw error
    }
  },

  async deleteTodo(id: string) {
    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    } catch (error) {
      console.error('Error deleting todo:', error)
      throw error
    }
  },

  // Contacts
  async getContacts() {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('name')
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching contacts:', error)
      // Fallback to localStorage
      if (typeof window !== 'undefined') {
        return JSON.parse(localStorage.getItem('family-contacts') || '[]')
      }
      return []
    }
  },

  async addContact(contact: any) {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .insert([contact])
        .select()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error adding contact:', error)
      throw error
    }
  },

  // Food Inventory
  async getFoodInventory() {
    try {
      const { data, error } = await supabase
        .from('food_inventory')
        .select('*')
        .order('name')
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching food inventory:', error)
      if (typeof window !== 'undefined') {
        return JSON.parse(localStorage.getItem('family-food-inventory') || '[]')
      }
      return []
    }
  },

  async addFoodItem(item: any) {
    try {
      const { data, error } = await supabase
        .from('food_inventory')
        .insert([item])
        .select()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error adding food item:', error)
      throw error
    }
  },

  async updateFoodItem(id: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from('food_inventory')
        .update(updates)
        .eq('id', id)
        .select()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating food item:', error)
      throw error
    }
  },

  async deleteFoodItem(id: string) {
    try {
      const { error } = await supabase
        .from('food_inventory')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    } catch (error) {
      console.error('Error deleting food item:', error)
      throw error
    }
  },

  // Meal Plans
  async getMealPlans(startDate?: string, endDate?: string) {
    try {
      let query = supabase
        .from('meal_plans')
        .select('*')
        .order('date')
        .order('meal_type')
      
      if (startDate) {
        query = query.gte('date', startDate)
      }
      if (endDate) {
        query = query.lte('date', endDate)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching meal plans:', error)
      if (typeof window !== 'undefined') {
        return JSON.parse(localStorage.getItem('family-meal-plan') || '[]')
      }
      return []
    }
  },

  async addMealPlan(mealPlan: any) {
    try {
      const { data, error } = await supabase
        .from('meal_plans')
        .insert([mealPlan])
        .select()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error adding meal plan:', error)
      throw error
    }
  },



  async updateContact(id: string, contactData: {
    name: string,
    title?: string,
    organization?: string,
    phone?: string,
    email?: string,
    address?: string,
    office?: string,
    notes?: string,
    tags: string[],
    importance: 'high' | 'medium' | 'low'
  }) {
    return singleQuery(`
      UPDATE contacts 
      SET name = $2, title = $3, organization = $4, phone = $5, 
          email = $6, address = $7, office = $8, notes = $9, 
          tags = $10, importance = $11, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [
      id,
      contactData.name,
      contactData.title,
      contactData.organization,
      contactData.phone,
      contactData.email,
      contactData.address,
      contactData.office,
      contactData.notes,
      JSON.stringify(contactData.tags),
      contactData.importance
    ])
  },

  async findContactByEmail(email: string) {
    return singleQuery(`
      SELECT * FROM contacts WHERE email = $1 LIMIT 1
    `, [email])
  },

  async deleteContact(id: string) {
    return singleQuery(`
      DELETE FROM contacts WHERE id = $1
      RETURNING *
    `, [id])
  },

  // Chat Memory
  async saveChatMessage(role: 'user' | 'assistant', content: string, session_id?: string) {
    return singleQuery(`
      INSERT INTO chat_history (role, content, session_id, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING *
    `, [role, content, session_id || 'default'])
  },

  async getChatHistory(session_id: string = 'default', limit: number = 50) {
    return singleQuery(`
      SELECT * FROM chat_history 
      WHERE session_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [session_id, limit])
  },

  async clearChatHistory(session_id: string = 'default') {
    return singleQuery(`
      DELETE FROM chat_history WHERE session_id = $1
      RETURNING *
    `, [session_id])
  },

  // Configuration
  async getConfig(key: string) {
    const result = await singleQuery(`
      SELECT value FROM family_config WHERE key = $1
    `, [key])
    return result[0]?.value
  },

  async setConfig(key: string, value: string, updatedBy?: string) {
    return singleQuery(`
      INSERT INTO family_config (key, value, updated_by)
      VALUES ($1, $2, $3)
      ON CONFLICT (key)
      DO UPDATE SET value = $2, updated_by = $3, updated_at = NOW()
      RETURNING *
    `, [key, value, updatedBy])
  },

  // Direct query method for custom queries (use sparingly)
  query: singleQuery
}

// Cleanup function for graceful shutdown
export async function closeDatabase() {
  await pgPool.end()
}