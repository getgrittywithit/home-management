import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(req: NextRequest) {
  const kid = new URL(req.url).searchParams.get('kid_name')?.toLowerCase()
  if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
  const rows = await db.query(
    `SELECT * FROM vocabulary_study_sets WHERE kid_name = $1 AND is_active = TRUE ORDER BY created_at DESC`,
    [kid]
  ).catch(() => [])
  return NextResponse.json({ sets: rows })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'create') {
      const { kid_name, set_name, description, word_ids, source_filter } = body
      if (!kid_name || !set_name) return NextResponse.json({ error: 'kid_name + set_name required' }, { status: 400 })
      const rows = await db.query(
        `INSERT INTO vocabulary_study_sets (kid_name, set_name, description, word_ids, source_filter)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [kid_name.toLowerCase(), set_name, description || null, word_ids ? JSON.stringify(word_ids) : null, source_filter ? JSON.stringify(source_filter) : null]
      )
      return NextResponse.json({ set: rows[0] }, { status: 201 })
    }

    if (action === 'archive') {
      await db.query(`UPDATE vocabulary_study_sets SET is_active = FALSE WHERE id = $1`, [body.set_id])
      return NextResponse.json({ success: true })
    }

    if (action === 'log_session') {
      const { kid_name, set_id, session_type, words_reviewed, words_correct } = body
      await db.query(
        `INSERT INTO vocabulary_session_log (kid_name, set_id, session_type, words_reviewed, words_correct)
         VALUES ($1, $2, $3, $4, $5)`,
        [kid_name?.toLowerCase(), set_id || null, session_type || 'quiz', words_reviewed || 0, words_correct || 0]
      )
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
