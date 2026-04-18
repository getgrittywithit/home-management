import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const kidName = searchParams.get('kid_name')

  if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })

  const action = searchParams.get('action') || 'get_goals'

  if (action === 'get_goals') {
    const rows = await db.query(
      `SELECT * FROM iep_goal_progress WHERE kid_name = $1 ORDER BY status = 'in_progress' DESC, created_at DESC`,
      [kidName.toLowerCase()]
    ).catch(e => { console.error('[iep-goals]', e.message); return [] })
    return NextResponse.json({ goals: rows })
  }

  if (action === 'get_accommodations') {
    // Returns kid's IEP/504 data for Learning Buddy AI prompts
    const kid = kidName.toLowerCase()
    const goals = await db.query(
      `SELECT goal_text, measurement_type, current_value, target_value, status FROM iep_goal_progress WHERE kid_name = $1 AND status = 'in_progress'`, [kid]
    ).catch(e => { console.error('[iep-goals]', e.message); return [] })
    const docs = await db.query(
      `SELECT document_type, school_year, notes FROM iep_504_documents WHERE kid_name = $1 ORDER BY upload_date DESC LIMIT 3`, [kid]
    ).catch(e => { console.error('[iep-goals]', e.message); return [] })
    // Kid profile data from CLAUDE.md
    const KID_PROFILES: Record<string, { diagnoses: string[]; accommodations: string[]; working_level: string }> = {
      amos: { diagnoses: ['ADHD Combined', 'ASD Level 1', 'Dyslexia', 'Dyscalculia', 'APD', 'Bilateral hearing loss'], accommodations: ['Visual representations', 'Single-step problems', 'Real-world context', 'Extended time', 'Shorter passages', 'Multiple-choice preferred', 'TTS available'], working_level: '~2nd grade math, 10th grade enrolled' },
      kaylee: { diagnoses: ['Intellectual Disability', 'Speech delay'], accommodations: ['Simplified instructions', 'Visual aids', 'Extended time', 'Repetition'], working_level: '7th grade enrolled' },
      wyatt: { diagnoses: ['Severe ADHD', 'Speech (/r/ sounds)', 'Color vision deficiency'], accommodations: ['Short sessions (5-7 min)', 'High engagement', 'Immediate feedback', 'Frequent breaks'], working_level: '4th grade' },
      hannah: { diagnoses: ['Speech (/r/ sounds)', 'Auditory sensitivity'], accommodations: ['Encouraging language', 'No time pressure', 'Picture clues', 'Ear protectors available'], working_level: '3rd grade, building reading confidence' },
      ellie: { diagnoses: [], accommodations: [], working_level: '6th grade, 99th percentile math growth' },
      zoey: { diagnoses: [], accommodations: [], working_level: '9th grade' },
    }
    const profile = KID_PROFILES[kid] || { diagnoses: [], accommodations: [], working_level: '' }
    return NextResponse.json({ goals, documents: docs, profile })
  }

  const rows = await db.query(
    `SELECT * FROM iep_goal_progress WHERE kid_name = $1 ORDER BY status = 'in_progress' DESC, created_at DESC`,
    [kidName.toLowerCase()]
  ).catch(e => { console.error('[iep-goals]', e.message); return [] })
  return NextResponse.json({ goals: rows })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action } = body

  switch (action) {
    case 'add_goal': {
      const { kid_name, plan_id, goal_text, target_value, measurement_type } = body
      if (!kid_name || !goal_text) return NextResponse.json({ error: 'kid_name and goal_text required' }, { status: 400 })
      const result = await db.query(
        `INSERT INTO iep_goal_progress (kid_name, plan_id, goal_text, target_value, measurement_type)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [kid_name.toLowerCase(), plan_id || null, goal_text, target_value || null, measurement_type || 'percentage']
      )
      return NextResponse.json({ success: true, id: result[0]?.id })
    }

    case 'add_data_point': {
      const { id, value, note } = body
      if (!id || value === undefined) return NextResponse.json({ error: 'id and value required' }, { status: 400 })
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      const row = await db.query(`SELECT data_points FROM iep_goal_progress WHERE id = $1`, [id]).catch(e => { console.error('[iep-goals]', e.message); return [] })
      const existing = row[0]?.data_points || []
      existing.push({ date: today, value: String(value), note: note || null })
      await db.query(
        `UPDATE iep_goal_progress SET data_points = $2, current_value = $3 WHERE id = $1`,
        [id, JSON.stringify(existing), String(value)]
      )
      return NextResponse.json({ success: true })
    }

    case 'update_status': {
      const { id, status } = body
      if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 })
      await db.query(`UPDATE iep_goal_progress SET status = $2 WHERE id = $1`, [id, status])
      return NextResponse.json({ success: true })
    }

    case 'delete_goal': {
      const { id } = body
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      await db.query(`DELETE FROM iep_goal_progress WHERE id = $1`, [id])
      return NextResponse.json({ success: true })
    }

    case 'upload_document': {
      const { kid_name, document_type, file_url, school_year, notes } = body
      if (!kid_name || !file_url) return NextResponse.json({ error: 'kid_name, file_url required' }, { status: 400 })
      await db.query(`CREATE TABLE IF NOT EXISTS iep_504_documents (id SERIAL PRIMARY KEY, kid_name TEXT NOT NULL, document_type TEXT DEFAULT 'IEP', file_url TEXT NOT NULL, upload_date DATE DEFAULT CURRENT_DATE, school_year TEXT, notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`).catch(e => console.error('[iep-goals]', e.message))
      const result = await db.query(
        `INSERT INTO iep_504_documents (kid_name, document_type, file_url, school_year, notes) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [kid_name.toLowerCase(), document_type || 'IEP', file_url, school_year || null, notes || null]
      )
      return NextResponse.json({ success: true, id: result[0]?.id })
    }

    case 'log_buddy_progress': {
      // Auto-log goal progress from buddy sessions
      const { kid_name, subject, accuracy, session_id } = body
      if (!kid_name || !subject) return NextResponse.json({ error: 'kid_name, subject required' }, { status: 400 })
      const kid = kid_name.toLowerCase()
      // Find matching in-progress goals for this subject
      const goals = await db.query(
        `SELECT id, goal_text, data_points, current_value FROM iep_goal_progress WHERE kid_name = $1 AND status = 'in_progress' AND goal_text ILIKE $2`,
        [kid, `%${subject}%`]
      ).catch(e => { console.error('[iep-goals]', e.message); return [] })
      for (const goal of goals) {
        const existing = goal.data_points || []
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        existing.push({ date: today, value: String(accuracy), note: `Buddy session (${session_id || 'auto'})` })
        await db.query(
          `UPDATE iep_goal_progress SET data_points = $2, current_value = $3 WHERE id = $1`,
          [goal.id, JSON.stringify(existing), String(accuracy)]
        )
      }
      return NextResponse.json({ success: true, goals_updated: goals.length })
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}
