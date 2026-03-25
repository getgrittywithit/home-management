import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const kid = searchParams.get('kid')?.toLowerCase()
    const action = searchParams.get('action')

    if (action === 'get_all_notes') {
      const rows = await db.query(
        `SELECT id, kid_name, category, note, created_at
         FROM kid_school_notes WHERE resolved = FALSE
         ORDER BY created_at DESC`
      )
      // Count notes added in last 24 hours for badge
      const recentCount = rows.filter((r: any) =>
        Date.now() - new Date(r.created_at).getTime() < 24 * 60 * 60 * 1000
      ).length
      return NextResponse.json({ notes: rows, recentCount })
    }

    if (action === 'get_shopping_list') {
      const rows = await db.query(
        `SELECT id, kid_name, category, note, created_at
         FROM kid_school_notes
         WHERE resolved = FALSE AND category IN ('supply_needed', 'ran_out_of')
         ORDER BY created_at DESC`
      )
      return NextResponse.json({ items: rows })
    }

    // Default: get notes for a specific kid
    if (!kid) return NextResponse.json({ error: 'kid required' }, { status: 400 })
    const rows = await db.query(
      `SELECT id, category, note, created_at
       FROM kid_school_notes WHERE kid_name = $1 AND resolved = FALSE
       ORDER BY created_at DESC LIMIT 20`,
      [kid]
    )
    return NextResponse.json({ notes: rows })
  } catch (error) {
    console.error('School notes GET error:', error)
    return NextResponse.json({ error: 'Failed to load notes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'add_note': {
        const { kid_name, category, note } = body
        if (!kid_name || !category || !note?.trim()) {
          return NextResponse.json({ error: 'kid_name, category, note required' }, { status: 400 })
        }
        await db.query(
          `INSERT INTO kid_school_notes (kid_name, category, note) VALUES ($1, $2, $3)`,
          [kid_name.toLowerCase(), category, note.trim().substring(0, 200)]
        )
        return NextResponse.json({ success: true })
      }

      case 'resolve_note': {
        const { id } = body
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
        await db.query(
          `UPDATE kid_school_notes SET resolved = TRUE, resolved_at = NOW() WHERE id = $1`,
          [id]
        )
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('School notes POST error:', error)
    return NextResponse.json({ error: 'Failed to process note' }, { status: 500 })
  }
}
