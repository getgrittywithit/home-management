import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/database'

// Default checklist items based on your spreadsheet
const DEFAULT_ITEMS = [
  // Personal - Health & Supplements
  { category: 'personal', subcategory: 'Health', name: 'NAD', requires_daily: true, order_index: 1 },
  { category: 'personal', subcategory: 'Health', name: 'SLEEP', requires_daily: true, order_index: 2 },
  { category: 'personal', subcategory: 'Health', name: 'FOCUS', requires_daily: true, order_index: 3 },
  { category: 'personal', subcategory: 'Health', name: 'MAGNA CALM', requires_daily: true, order_index: 4 },
  { category: 'personal', subcategory: 'Health', name: 'B+ VITAMIN', requires_daily: true, order_index: 5 },
  { category: 'personal', subcategory: 'Health', name: 'TRI-MAG', requires_daily: true, order_index: 6 },
  { category: 'personal', subcategory: 'Health', name: 'Modern Man', requires_daily: true, order_index: 7 },
  
  // Personal - Supplements
  { category: 'personal', subcategory: 'Supplements', name: 'OREGANO', requires_daily: true, order_index: 1 },
  { category: 'personal', subcategory: 'Supplements', name: 'VITAMIN D3', requires_daily: true, order_index: 2 },
  { category: 'personal', subcategory: 'Supplements', name: 'ASHWAGANDHA', requires_daily: true, order_index: 3 },
  { category: 'personal', subcategory: 'Supplements', name: 'ADHD MEDS', requires_daily: true, order_index: 4 },
  
  // Personal - Personal Care
  { category: 'personal', subcategory: 'Personal Care', name: 'BRUSH TEETH', requires_daily: true, order_index: 1 },
  { category: 'personal', subcategory: 'Personal Care', name: 'FLOSS', requires_daily: true, order_index: 2 },
  { category: 'personal', subcategory: 'Personal Care', name: 'SHOWER', requires_daily: true, order_index: 3 },
  { category: 'personal', subcategory: 'Personal Care', name: 'SHAVE', requires_daily: false, order_index: 4 },
  
  // Personal - Activities
  { category: 'personal', subcategory: 'Activities', name: 'FAMILY TIME', requires_daily: true, order_index: 1 },
  { category: 'personal', subcategory: 'Activities', name: 'HOUSE CHORES', requires_daily: true, order_index: 2 },
  { category: 'personal', subcategory: 'Activities', name: 'WORKOUT-BOARD', requires_daily: false, order_index: 3 },
  { category: 'personal', subcategory: 'Activities', name: 'WALK', requires_daily: true, order_index: 4 },
  
  // Personal - Schedule
  { category: 'personal', subcategory: 'Schedule', name: 'WAKE TIME', requires_daily: true, order_index: 1 },
  { category: 'personal', subcategory: 'Schedule', name: 'LEAVE HOUSE', requires_daily: true, order_index: 2 },
  { category: 'personal', subcategory: 'Schedule', name: 'TO SLEEP TIME', requires_daily: true, order_index: 3 },
  { category: 'personal', subcategory: 'Schedule', name: 'WEIGH IN', requires_daily: false, order_index: 4 },
  
  // Business - Morning Customer Contact
  { category: 'business', subcategory: 'Morning Customer Contact', name: 'EMAILS - Save/Delete', requires_daily: true, order_index: 1 },
  { category: 'business', subcategory: 'Morning Customer Contact', name: 'TRITON PHONE - Call back', requires_daily: true, order_index: 2 },
  { category: 'business', subcategory: 'Morning Customer Contact', name: 'TRITON PHONE - Text back', requires_daily: true, order_index: 3 },
  { category: 'business', subcategory: 'Morning Customer Contact', name: 'New Leads Folder', requires_daily: true, order_index: 4 },
  { category: 'business', subcategory: 'Morning Customer Contact', name: 'Personal phone - Calls/text', requires_daily: true, order_index: 5 },
  
  // Business - Afternoon Customer Contact
  { category: 'business', subcategory: 'Afternoon Customer Contact', name: 'EMAILS - Save/Delete', requires_daily: true, order_index: 1 },
  { category: 'business', subcategory: 'Afternoon Customer Contact', name: 'TRITON PHONE - Call back', requires_daily: true, order_index: 2 },
  { category: 'business', subcategory: 'Afternoon Customer Contact', name: 'TRITON PHONE - Text back', requires_daily: true, order_index: 3 },
  { category: 'business', subcategory: 'Afternoon Customer Contact', name: 'Personal phone - Calls/text', requires_daily: true, order_index: 4 },
  { category: 'business', subcategory: 'Afternoon Customer Contact', name: 'Asana - Triton sales check in', requires_daily: true, order_index: 5 },
  
  // Business - File Organization
  { category: 'business', subcategory: 'File Organization', name: '10 Min. Cloud File Organize', requires_daily: true, order_index: 1 },
  { category: 'business', subcategory: 'File Organization', name: 'Scan Docs and file', requires_daily: true, order_index: 2 },
  
  // Business - Bookkeeping
  { category: 'business', subcategory: 'Bookkeeping', name: 'Business', requires_daily: true, order_index: 1 },
  { category: 'business', subcategory: 'Bookkeeping', name: 'Personal', requires_daily: true, order_index: 2 },
  
  // Business - Code
  { category: 'business', subcategory: 'Code', name: 'Website work', requires_daily: true, order_index: 1 },
  { category: 'business', subcategory: 'Code', name: 'Planning', requires_daily: true, order_index: 2 },
  { category: 'business', subcategory: 'Code', name: 'Product creative', requires_daily: true, order_index: 3 },
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId = 'levi' } = body

    // Check if items already exist for this user
    const { data: existing, error: checkError } = await supabase
      .from('weekly_checklist_items')
      .select('id')
      .eq('user_id', userId)
      .limit(1)

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing items:', checkError)
      return NextResponse.json({ error: checkError.message }, { status: 500 })
    }

    if (existing && existing.length > 0) {
      return NextResponse.json({ 
        message: 'Weekly checklist items already exist for this user',
        exists: true 
      })
    }

    // Create the default items
    const itemsToInsert = DEFAULT_ITEMS.map(item => ({
      user_id: userId,
      ...item,
      id: `${userId}-${item.category}-${item.subcategory.replace(/\s+/g, '-').toLowerCase()}-${item.name.replace(/\s+/g, '-').toLowerCase()}`
    }))

    const { data, error } = await supabase
      .from('weekly_checklist_items')
      .insert(itemsToInsert)
      .select()

    if (error) {
      console.error('Error creating default items:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `Created ${itemsToInsert.length} default weekly checklist items`,
      data 
    })
  } catch (error) {
    console.error('Error in POST /api/weekly-checklist/init:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}