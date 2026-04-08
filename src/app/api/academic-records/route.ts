import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

async function ensureTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS academic_grades (
      id SERIAL PRIMARY KEY,
      kid_name TEXT NOT NULL,
      subject TEXT NOT NULL,
      grading_period TEXT NOT NULL,
      grade TEXT,
      percentage DECIMAL(5,1),
      credits DECIMAL(3,1) DEFAULT 0.5,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(kid_name, subject, grading_period)
    )
  `)
  await db.query(`
    CREATE TABLE IF NOT EXISTS test_scores (
      id SERIAL PRIMARY KEY,
      kid_name TEXT NOT NULL,
      test_name TEXT NOT NULL,
      subject TEXT,
      score TEXT,
      percentile INTEGER,
      date_taken DATE,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
}

let ready = false
async function init() { if (!ready) { await ensureTables(); ready = true } }

export async function GET(req: NextRequest) {
  await init()
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'get_grades'
  const kid = searchParams.get('kid_name')?.toLowerCase()

  try {
    if (action === 'get_grades') {
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const rows = await db.query(
        `SELECT * FROM academic_grades WHERE kid_name = $1 ORDER BY grading_period DESC, subject`, [kid]
      ).catch(() => [])
      return NextResponse.json({ grades: rows })
    }

    if (action === 'get_test_scores') {
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const rows = await db.query(
        `SELECT * FROM test_scores WHERE kid_name = $1 ORDER BY date_taken DESC`, [kid]
      ).catch(() => [])
      return NextResponse.json({ scores: rows })
    }

    if (action === 'get_transcript') {
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const grades = await db.query(
        `SELECT * FROM academic_grades WHERE kid_name = $1 ORDER BY grading_period, subject`, [kid]
      ).catch(() => [])
      const tests = await db.query(
        `SELECT * FROM test_scores WHERE kid_name = $1 ORDER BY date_taken DESC`, [kid]
      ).catch(() => [])
      // Group grades by grading period
      const periods: Record<string, any[]> = {}
      grades.forEach((g: any) => {
        if (!periods[g.grading_period]) periods[g.grading_period] = []
        periods[g.grading_period].push(g)
      })
      const totalCredits = grades.reduce((sum: number, g: any) => sum + (Number(g.credits) || 0), 0)
      return NextResponse.json({ transcript: { periods, tests, total_credits: totalCredits, kid_name: kid } })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Academic records GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  await init()
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'add_grade') {
      const { kid_name, subject, grading_period, grade, percentage, credits, notes } = body
      if (!kid_name || !subject || !grading_period) return NextResponse.json({ error: 'kid_name, subject, grading_period required' }, { status: 400 })
      await db.query(
        `INSERT INTO academic_grades (kid_name, subject, grading_period, grade, percentage, credits, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (kid_name, subject, grading_period) DO UPDATE SET grade = $4, percentage = $5, credits = $6, notes = $7`,
        [kid_name.toLowerCase(), subject, grading_period, grade || null, percentage || null, credits || 0.5, notes || null]
      )
      return NextResponse.json({ success: true })
    }

    if (action === 'add_test_score') {
      const { kid_name, test_name, subject, score, percentile, date_taken, notes } = body
      if (!kid_name || !test_name) return NextResponse.json({ error: 'kid_name, test_name required' }, { status: 400 })
      const rows = await db.query(
        `INSERT INTO test_scores (kid_name, test_name, subject, score, percentile, date_taken, notes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [kid_name.toLowerCase(), test_name, subject || null, score || null, percentile || null, date_taken || null, notes || null]
      )
      return NextResponse.json({ success: true, id: rows[0]?.id })
    }

    if (action === 'delete_grade') {
      const { id } = body
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      await db.query(`DELETE FROM academic_grades WHERE id = $1`, [id])
      return NextResponse.json({ success: true })
    }

    if (action === 'delete_test_score') {
      const { id } = body
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      await db.query(`DELETE FROM test_scores WHERE id = $1`, [id])
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Academic records POST error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
