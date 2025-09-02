import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const category = searchParams.get('category')
    
    // Build query
    let query = supabase
      .from('expenses')
      .select('*')
      .order('expense_date', { ascending: false })
    
    // Apply filters
    if (startDate) {
      query = query.gte('expense_date', startDate)
    }
    if (endDate) {
      query = query.lte('expense_date', endDate)
    }
    if (category && category !== 'all') {
      query = query.eq('parent_category', category)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Error fetching expenses:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in GET /api/expenses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const body = await request.json()
    
    // Get current user's profile
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get user's profile ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()
    
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    
    // Handle batch upload
    if (body.transactions && Array.isArray(body.transactions)) {
      const expenses = body.transactions.map(transaction => ({
        profile_id: profile.id,
        expense_date: transaction.date,
        name: transaction.description,
        description: transaction.description,
        amount: Math.abs(transaction.amount), // Store as positive
        parent_category: transaction.category,
        account: transaction.account,
        transaction_type: transaction.type === 'income' ? 'income' : 'regular',
        status: 'posted',
        excluded: false,
        expense_type: 'personal'
      }))
      
      // Insert in batches to avoid conflicts
      const batchSize = 100
      const results = []
      
      for (let i = 0; i < expenses.length; i += batchSize) {
        const batch = expenses.slice(i, i + batchSize)
        
        const { data, error } = await supabase
          .from('expenses')
          .upsert(batch, {
            onConflict: 'expense_date,name,amount,account',
            ignoreDuplicates: true
          })
          .select()
        
        if (error) {
          console.error('Error inserting batch:', error)
          // Continue with next batch even if one fails
        } else {
          results.push(...(data || []))
        }
      }
      
      return NextResponse.json({ 
        success: true, 
        data: results,
        imported: results.length,
        total: expenses.length
      })
    }
    
    // Handle single expense
    const expense = {
      profile_id: profile.id,
      expense_date: body.date,
      name: body.description,
      description: body.description,
      amount: Math.abs(body.amount),
      parent_category: body.category,
      account: body.account,
      transaction_type: body.type === 'income' ? 'income' : 'regular',
      status: body.status || 'posted',
      excluded: body.excluded || false,
      expense_type: 'personal'
    }
    
    const { data, error } = await supabase
      .from('expenses')
      .insert(expense)
      .select()
      .single()
    
    if (error) {
      console.error('Error creating expense:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error in POST /api/expenses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}