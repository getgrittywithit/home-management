import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    const { data, error } = await supabase
      .from('business_classes')
      .select('*')
      .order('name')
    
    if (error) {
      console.error('Error fetching business classes:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in GET /api/business-classes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const body = await request.json()
    
    const { data, error } = await supabase
      .from('business_classes')
      .insert({
        name: body.name,
        code: body.code,
        description: body.description,
        color: body.color,
        active: true
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating business class:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in POST /api/business-classes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}