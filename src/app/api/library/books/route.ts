import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const kid = searchParams.get('kid_name')?.toLowerCase()
  const level = searchParams.get('level')
  const interest = searchParams.get('interest')
  const status = searchParams.get('status')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

  try {
    let sql = `SELECT hl.*, kbp.status AS read_status, kbp.current_page, kbp.kid_rating
               FROM home_library hl
               LEFT JOIN kid_book_progress kbp ON kbp.book_id = hl.id AND kbp.kid_name = $1
               WHERE hl.active = TRUE`
    const params: any[] = [kid || '']
    let idx = 2

    if (level) { params.push(level); sql += ` AND hl.reading_grade_equivalent = $${idx++}` }
    if (interest) { params.push(`%${interest}%`); sql += ` AND array_to_string(hl.interest_tags, ',') ILIKE $${idx++}` }
    if (status === 'reading') sql += ` AND kbp.status = 'reading'`
    if (status === 'finished') sql += ` AND kbp.status = 'finished'`
    if (status === 'unread') sql += ` AND (kbp.status IS NULL OR kbp.status = 'not_started')`

    sql += ` ORDER BY hl.title LIMIT ${limit}`
    const rows = await db.query(sql, params).catch(() => [])
    return NextResponse.json({ books: rows })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'start_reading') {
      const { kid_name, book_id } = body
      if (!kid_name || !book_id) return NextResponse.json({ error: 'kid_name + book_id required' }, { status: 400 })
      await db.query(
        `INSERT INTO kid_book_progress (kid_name, book_id, status, started_at) VALUES ($1, $2, 'reading', NOW())
         ON CONFLICT (kid_name, book_id) DO UPDATE SET status = 'reading', started_at = COALESCE(kid_book_progress.started_at, NOW())`,
        [kid_name.toLowerCase(), book_id]
      )
      return NextResponse.json({ success: true })
    }

    if (action === 'update_progress') {
      const { kid_name, book_id, current_page } = body
      await db.query(
        `UPDATE kid_book_progress SET current_page = $3 WHERE kid_name = $1 AND book_id = $2`,
        [kid_name?.toLowerCase(), book_id, current_page]
      )
      return NextResponse.json({ success: true })
    }

    if (action === 'finish_book') {
      const { kid_name, book_id, rating, notes } = body
      await db.query(
        `UPDATE kid_book_progress SET status = 'finished', finished_at = NOW(), kid_rating = $3, kid_notes = $4 WHERE kid_name = $1 AND book_id = $2`,
        [kid_name?.toLowerCase(), book_id, rating || null, notes || null]
      )
      return NextResponse.json({ success: true })
    }

    if (action === 'bulk_tag') {
      const { books } = body // Array of { id, reading_grade_equivalent, interest_tags, genre, lexile_level, ... }
      if (!books?.length) return NextResponse.json({ error: 'books array required' }, { status: 400 })
      let updated = 0
      for (const b of books) {
        if (!b.id) continue
        const sets: string[] = []
        const vals: any[] = [b.id]
        let i = 2
        if (b.reading_grade_equivalent !== undefined) { sets.push(`reading_grade_equivalent = $${i++}`); vals.push(b.reading_grade_equivalent) }
        if (b.interest_tags !== undefined) { sets.push(`interest_tags = $${i++}`); vals.push(b.interest_tags) }
        if (b.genre !== undefined) { sets.push(`genre = $${i++}`); vals.push(b.genre) }
        if (b.lexile_level !== undefined) { sets.push(`lexile_level = $${i++}`); vals.push(b.lexile_level) }
        if (b.age_range_low !== undefined) { sets.push(`age_range_low = $${i++}`); vals.push(b.age_range_low) }
        if (b.age_range_high !== undefined) { sets.push(`age_range_high = $${i++}`); vals.push(b.age_range_high) }
        if (b.content_advisory !== undefined) { sets.push(`content_advisory = $${i++}`); vals.push(b.content_advisory) }
        if (sets.length > 0) {
          await db.query(`UPDATE home_library SET ${sets.join(', ')} WHERE id = $1`, vals).catch(() => {})
          updated++
        }
      }
      return NextResponse.json({ updated })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
