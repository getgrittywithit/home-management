import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'recent_revenue': {
        const limit = parseInt(searchParams.get('limit') || '3')
        const rows = await db.query(
          `SELECT id, business, amount, source, notes, logged_at
           FROM business_revenue_log
           ORDER BY logged_at DESC LIMIT $1`,
          [Math.min(limit, 20)]
        )
        return NextResponse.json({ entries: rows })
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Revenue GET error:', error)
    return NextResponse.json({ error: 'Failed to load revenue data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'log_revenue': {
        const { business, amount, source, notes } = body
        if (!business || !amount) return NextResponse.json({ error: 'business and amount required' }, { status: 400 })
        if (!['triton', 'grit'].includes(business)) return NextResponse.json({ error: 'business must be triton or grit' }, { status: 400 })
        await db.query(
          `INSERT INTO business_revenue_log (business, amount, source, notes) VALUES ($1, $2, $3, $4)`,
          [business, amount, source || null, notes || null]
        )
        return NextResponse.json({ success: true })
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Revenue POST error:', error)
    return NextResponse.json({ error: 'Failed to process revenue action' }, { status: 500 })
  }
}
