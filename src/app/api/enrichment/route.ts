import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS enrichment_activities (
      id SERIAL PRIMARY KEY,
      kid_name TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      duration_minutes INTEGER DEFAULT 0,
      photo_url TEXT,
      gems_earned INTEGER DEFAULT 2,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
}

let ready = false
async function init() { if (!ready) { await ensureTable(); ready = true } }

const CATEGORIES = [
  { id: 'financial_literacy', label: 'Financial Literacy', icon: '💰' },
  { id: 'art', label: 'Art & Creativity', icon: '🎨' },
  { id: 'music', label: 'Music', icon: '🎵' },
  { id: 'typing', label: 'Typing / Computer Skills', icon: '💻' },
  { id: 'cooking', label: 'Cooking & Life Skills', icon: '🍳' },
  { id: 'pe', label: 'Physical Education', icon: '🏃' },
  { id: 'nature', label: 'Nature & Gardening', icon: '🌱' },
  { id: 'theater', label: 'Theater & Drama', icon: '🎭' },
]

export async function GET(req: NextRequest) {
  await init()
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'get_activities'
  const kid = searchParams.get('kid_name')?.toLowerCase()
  const category = searchParams.get('category')

  try {
    if (action === 'get_categories') {
      return NextResponse.json({ categories: CATEGORIES })
    }

    if (action === 'get_activities') {
      let sql = `SELECT * FROM enrichment_activities WHERE 1=1`
      const params: any[] = []
      if (kid) { params.push(kid); sql += ` AND kid_name = $${params.length}` }
      if (category) { params.push(category); sql += ` AND category = $${params.length}` }
      sql += ` ORDER BY created_at DESC LIMIT 50`
      const rows = await db.query(sql, params).catch(() => [])
      return NextResponse.json({ activities: rows })
    }

    if (action === 'get_monthly_summary') {
      const month = searchParams.get('month') // YYYY-MM format
      const monthStart = month ? `${month}-01` : new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }).slice(0, 8) + '01'
      const rows = await db.query(
        `SELECT kid_name, category, COUNT(*)::int as count, COALESCE(SUM(duration_minutes), 0)::int as total_minutes,
                COALESCE(SUM(gems_earned), 0)::int as total_gems
         FROM enrichment_activities WHERE created_at >= $1::date AND created_at < ($1::date + INTERVAL '1 month')
         GROUP BY kid_name, category ORDER BY kid_name, total_minutes DESC`,
        [monthStart]
      ).catch(() => [])
      return NextResponse.json({ summary: rows, month: monthStart })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Enrichment GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  await init()
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'log_activity') {
      const { kid_name, category, title, description, duration_minutes, photo_url } = body
      if (!kid_name || !category || !title) return NextResponse.json({ error: 'kid_name, category, title required' }, { status: 400 })
      const kid = kid_name.toLowerCase()
      const rows = await db.query(
        `INSERT INTO enrichment_activities (kid_name, category, title, description, duration_minutes, photo_url, gems_earned)
         VALUES ($1, $2, $3, $4, $5, $6, 2) RETURNING *`,
        [kid, category, title, description || null, duration_minutes || 0, photo_url || null]
      )
      // Award gems
      await db.query(`UPDATE digi_pets SET gem_balance = COALESCE(gem_balance, 0) + 2 WHERE kid_name = $1`, [kid]).catch(() => {})
      await db.query(
        `INSERT INTO gem_transactions (kid_name, amount, source_type, description) VALUES ($1, 2, 'enrichment', $2)`,
        [kid, `${category}: ${title}`]
      ).catch(() => {})
      return NextResponse.json({ success: true, activity: rows[0], gems_earned: 2 })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Enrichment POST error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
