import { createClient } from '@supabase/supabase-js'
import { Pool } from 'pg'

// Supabase client configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vhqgzgqklwrjmglaezmh.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseKey)

// Direct PostgreSQL connection for server-side operations
export const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.vhqgzgqklwrjmglaezmh:71jd4xNjFaBufBAA@aws-0-us-east-2.pooler.supabase.com:5432/postgres',
  ssl: {
    rejectUnauthorized: false
  }
})

// Helper function to execute queries
export async function query(text: string, params?: any[]) {
  const client = await pgPool.connect()
  try {
    const result = await client.query(text, params)
    return result.rows
  } catch (error) {
    console.error('Database query error:', error)
    throw error
  } finally {
    client.release()
  }
}

// Database helper functions
export const db = {
  // Family Events
  async getUpcomingEvents(limit = 10) {
    return query(`
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
    return query(`
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
    const result = await query('SELECT * FROM water_status LIMIT 1')
    return result[0] || { jugs_full: 0, jugs_empty: 0, jugs_in_use: 0, estimated_days_left: 0 }
  },

  async updateWaterJug(jugNumber: number, status: 'full' | 'empty' | 'in_use') {
    return query(`
      UPDATE water_jugs 
      SET status = $1, updated_at = NOW(),
          last_filled_date = CASE WHEN $1 = 'full' THEN CURRENT_DATE ELSE last_filled_date END
      WHERE jug_number = $2
      RETURNING *
    `, [status, jugNumber])
  },

  // Ride Tokens
  async getTokensToday() {
    return query('SELECT * FROM tokens_available_today ORDER BY first_name')
  },

  async useTokens(childId: string, tokensUsed: number) {
    return query(`
      INSERT INTO ride_tokens (child_id, date, tokens_used, week_start)
      VALUES ($1, CURRENT_DATE, $2, date_trunc('week', CURRENT_DATE))
      ON CONFLICT (child_id, date) 
      DO UPDATE SET tokens_used = ride_tokens.tokens_used + $2
      RETURNING *
    `, [childId, tokensUsed])
  },

  // On-Call Schedule
  async getTodaysOnCall() {
    const result = await query(`
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
    return query(`
      INSERT INTO on_call_schedule (date, on_call_parent_id, manually_set)
      VALUES ($1, $2, true)
      ON CONFLICT (date)
      DO UPDATE SET on_call_parent_id = $2, manually_set = true
      RETURNING *
    `, [date, parentId])
  },

  // Money Tracking
  async getTodaysRevenue() {
    const result = await query(`
      SELECT COALESCE(SUM(net_amount), 0) as total
      FROM money_sales 
      WHERE date = CURRENT_DATE
    `)
    return Number(result[0]?.total || 0)
  },

  async logSale(channel: string, product: string, grossAmount: number, fees = 0) {
    const netAmount = grossAmount - fees
    return query(`
      INSERT INTO money_sales (date, channel, product, gross_amount, fees, net_amount)
      VALUES (CURRENT_DATE, $1, $2, $3, $4, $5)
      RETURNING *
    `, [channel, product, grossAmount, fees, netAmount])
  },

  // Family Profiles
  async getAllProfiles() {
    return query(`
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
    return query(`
      SELECT * FROM profiles 
      WHERE role = 'child' 
      ORDER BY first_name
    `)
  },

  async getParents() {
    return query(`
      SELECT * FROM profiles 
      WHERE role = 'parent' 
      ORDER BY first_name
    `)
  },

  // Zone Management
  async getZoneStatus() {
    return query(`
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

  // Configuration
  async getConfig(key: string) {
    const result = await query(`
      SELECT value FROM family_config WHERE key = $1
    `, [key])
    return result[0]?.value
  },

  async setConfig(key: string, value: string, updatedBy?: string) {
    return query(`
      INSERT INTO family_config (key, value, updated_by)
      VALUES ($1, $2, $3)
      ON CONFLICT (key)
      DO UPDATE SET value = $2, updated_by = $3, updated_at = NOW()
      RETURNING *
    `, [key, value, updatedBy])
  },

  // Direct query method for custom queries
  query
}