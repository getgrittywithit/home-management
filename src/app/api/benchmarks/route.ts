import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const kidName = searchParams.get('kid_name')

  if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })

  const rows = await db.query(
    `SELECT * FROM kid_benchmarks WHERE kid_name = $1 ORDER BY test_date DESC`,
    [kidName.toLowerCase()]
  ).catch(() => [])

  return NextResponse.json({ benchmarks: rows })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action } = body

  switch (action) {
    case 'add_benchmark': {
      const { kid_name, test_name, score, percentile, grade_equivalent, test_date, notes } = body
      if (!kid_name || !test_name || !test_date) return NextResponse.json({ error: 'kid_name, test_name, and test_date required' }, { status: 400 })
      const result = await db.query(
        `INSERT INTO kid_benchmarks (kid_name, test_name, score, percentile, grade_equivalent, test_date, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [kid_name.toLowerCase(), test_name, score || null, percentile || null, grade_equivalent || null, test_date, notes || null]
      )
      return NextResponse.json({ success: true, id: result[0]?.id })
    }

    case 'update_benchmark': {
      const { id, score, percentile, grade_equivalent, notes } = body
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      await db.query(
        `UPDATE kid_benchmarks SET score = COALESCE($2, score), percentile = COALESCE($3, percentile),
         grade_equivalent = COALESCE($4, grade_equivalent), notes = COALESCE($5, notes) WHERE id = $1`,
        [id, score, percentile, grade_equivalent, notes]
      )
      return NextResponse.json({ success: true })
    }

    case 'delete_benchmark': {
      const { id } = body
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      await db.query(`DELETE FROM kid_benchmarks WHERE id = $1`, [id])
      return NextResponse.json({ success: true })
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}
