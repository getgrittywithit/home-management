import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/database'

interface WeeklyChecklistItem {
  id: string
  category: 'personal' | 'business'
  subcategory: string
  name: string
  requires_daily: boolean
  order_index: number
}

interface WeeklyChecklistCompletion {
  id: string
  user_id: string
  week_year: number
  week_number: number
  item_id: string
  day_of_week: number // 0 = Sunday, 1 = Monday, etc.
  completed: boolean
  completed_at?: string
}

// Get week number from date
function getWeekNumber(date: Date): { year: number, week: number } {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
  const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
  return { year: date.getFullYear(), week: weekNumber }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action')
    const userId = searchParams.get('userId') || 'levi' // Default to Levi
    
    if (action === 'template') {
      // Get the template items
      const { data, error } = await supabase
        .from('weekly_checklist_items')
        .select('*')
        .eq('user_id', userId)
        .order('category', { ascending: true })
        .order('subcategory', { ascending: true })
        .order('order_index', { ascending: true })
      
      if (error) {
        console.error('Error fetching template:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      
      return NextResponse.json({ data })
    }
    
    if (action === 'week') {
      const weekParam = searchParams.get('week')
      const yearParam = searchParams.get('year')
      
      const now = new Date()
      const { year, week } = weekParam && yearParam 
        ? { year: parseInt(yearParam), week: parseInt(weekParam) }
        : getWeekNumber(now)
      
      // Get template items
      const { data: items, error: itemsError } = await supabase
        .from('weekly_checklist_items')
        .select('*')
        .eq('user_id', userId)
        .order('category', { ascending: true })
        .order('subcategory', { ascending: true })
        .order('order_index', { ascending: true })
      
      if (itemsError) {
        console.error('Error fetching items:', itemsError)
        return NextResponse.json({ error: itemsError.message }, { status: 500 })
      }
      
      // Get completions for this week
      const { data: completions, error: completionsError } = await supabase
        .from('weekly_checklist_completions')
        .select('*')
        .eq('user_id', userId)
        .eq('week_year', year)
        .eq('week_number', week)
      
      if (completionsError) {
        console.error('Error fetching completions:', completionsError)
        return NextResponse.json({ error: completionsError.message }, { status: 500 })
      }
      
      return NextResponse.json({ 
        data: {
          year,
          week,
          items: items || [],
          completions: completions || []
        }
      })
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error in GET /api/weekly-checklist:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, userId = 'levi' } = body
    
    if (action === 'toggle-completion') {
      const { itemId, dayOfWeek, week, year } = body
      
      // Check if completion already exists
      const { data: existing, error: checkError } = await supabase
        .from('weekly_checklist_completions')
        .select('*')
        .eq('user_id', userId)
        .eq('item_id', itemId)
        .eq('day_of_week', dayOfWeek)
        .eq('week_year', year)
        .eq('week_number', week)
        .single()
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing completion:', checkError)
        return NextResponse.json({ error: checkError.message }, { status: 500 })
      }
      
      if (existing) {
        // Toggle existing completion
        const { data, error } = await supabase
          .from('weekly_checklist_completions')
          .update({ 
            completed: !existing.completed,
            completed_at: !existing.completed ? new Date().toISOString() : null
          })
          .eq('id', existing.id)
          .select()
          .single()
        
        if (error) {
          console.error('Error updating completion:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
        
        return NextResponse.json({ data, toggled: true })
      } else {
        // Create new completion
        const { data, error } = await supabase
          .from('weekly_checklist_completions')
          .insert({
            user_id: userId,
            item_id: itemId,
            day_of_week: dayOfWeek,
            week_year: year,
            week_number: week,
            completed: true,
            completed_at: new Date().toISOString()
          })
          .select()
          .single()
        
        if (error) {
          console.error('Error creating completion:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
        
        return NextResponse.json({ data, created: true })
      }
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error in POST /api/weekly-checklist:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}