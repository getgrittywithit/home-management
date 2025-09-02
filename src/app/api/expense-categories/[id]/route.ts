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
      .from('expense_categories')
      .update(body)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating category:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in PATCH /api/expense-categories:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const { error } = await supabase
      .from('expense_categories')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Error deleting category:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/expense-categories:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}