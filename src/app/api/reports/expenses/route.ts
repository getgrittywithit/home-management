import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const expenseType = searchParams.get('expenseType') || 'all'
    
    // Build base query
    let query = supabase
      .from('expenses')
      .select(`
        *,
        expense_categories!left(name, color)
      `)
      .order('expense_date', { ascending: false })
    
    // Apply filters
    if (startDate) {
      query = query.gte('expense_date', startDate)
    }
    if (endDate) {
      query = query.lte('expense_date', endDate)
    }
    if (expenseType !== 'all') {
      query = query.eq('expense_type', expenseType)
    }
    
    const { data: expenses, error } = await query
    
    if (error) {
      console.error('Error fetching expenses for report:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // Process data for reports
    const totalExpenses = expenses?.filter(e => e.transaction_type !== 'income').reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0
    const totalIncome = expenses?.filter(e => e.transaction_type === 'income').reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0
    const netAmount = totalIncome - totalExpenses
    const transactionCount = expenses?.length || 0
    const averageTransaction = transactionCount > 0 ? totalExpenses / transactionCount : 0
    
    // Category breakdown
    const categoryMap = new Map()
    expenses?.filter(e => e.transaction_type !== 'income').forEach(expense => {
      const category = expense.parent_category || 'Uncategorized'
      const current = categoryMap.get(category) || { amount: 0, count: 0, color: '#3B82F6' }
      categoryMap.set(category, {
        amount: current.amount + parseFloat(expense.amount),
        count: current.count + 1,
        color: expense.expense_categories?.[0]?.color || '#3B82F6'
      })
    })
    
    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        color: data.color
      }))
      .sort((a, b) => b.amount - a.amount)
    
    // Business breakdown
    const businessMap = new Map()
    expenses?.filter(e => e.transaction_type !== 'income').forEach(expense => {
      const business = expense.business_class || 'Personal'
      const current = businessMap.get(business) || { amount: 0, count: 0 }
      businessMap.set(business, {
        amount: current.amount + parseFloat(expense.amount),
        count: current.count + 1
      })
    })
    
    const businessBreakdown = Array.from(businessMap.entries())
      .map(([business, data]) => ({
        business,
        amount: data.amount,
        count: data.count
      }))
      .sort((a, b) => b.amount - a.amount)
    
    // Monthly trend (simplified for now)
    const monthlyTrend = []
    
    const reportData = {
      categoryBreakdown,
      businessBreakdown,
      monthlyTrend,
      totalExpenses,
      totalIncome,
      netAmount,
      transactionCount,
      averageTransaction
    }
    
    return NextResponse.json(reportData)
  } catch (error) {
    console.error('Error in GET /api/reports/expenses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}