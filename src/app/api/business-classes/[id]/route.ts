import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/database'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const { id } = await params
    
    const { data, error } = await supabase
      .from('business_classes')
      .update(body)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating business class:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in PATCH /api/business-classes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}