import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/database'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .order('name')
    
    if (error) {
      console.error('Error fetching categories:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in GET /api/expense-categories:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const defaultProfileId = '11111111-1111-1111-1111-111111111111'
    
    const { data, error } = await supabase
      .from('expense_categories')
      .insert({
        profile_id: defaultProfileId,
        name: body.name,
        description: body.description,
        color: body.color
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating category:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in POST /api/expense-categories:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}