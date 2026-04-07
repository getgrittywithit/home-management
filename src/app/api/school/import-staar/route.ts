import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'get_results'
  const kid = searchParams.get('kid_name')?.toLowerCase()

  try {
    if (action === 'get_results') {
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const subject = searchParams.get('subject')
      const year = searchParams.get('school_year')
      let sql = `SELECT * FROM staar_results WHERE kid_name = $1`
      const params: any[] = [kid]
      if (subject) { sql += ` AND subject = $${params.length + 1}`; params.push(subject) }
      if (year) { sql += ` AND school_year = $${params.length + 1}`; params.push(year) }
      sql += ` ORDER BY school_year DESC, subject`
      const rows = await db.query(sql, params).catch(() => [])
      return NextResponse.json({ results: rows })
    }

    if (action === 'get_category_breakdown') {
      const resultId = searchParams.get('result_id')
      if (!resultId) return NextResponse.json({ error: 'result_id required' }, { status: 400 })
      const rows = await db.query(
        `SELECT * FROM staar_category_results WHERE staar_result_id = $1 ORDER BY category_number`, [resultId]
      ).catch(() => [])
      return NextResponse.json({ categories: rows })
    }

    if (action === 'get_question_details') {
      const resultId = searchParams.get('result_id')
      if (!resultId) return NextResponse.json({ error: 'result_id required' }, { status: 400 })
      const rows = await db.query(
        `SELECT * FROM staar_test_questions WHERE staar_result_id = $1 ORDER BY item_number`, [resultId]
      ).catch(() => [])
      return NextResponse.json({ questions: rows })
    }

    if (action === 'get_trend') {
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const type = searchParams.get('type') || 'lexile'
      const rows = await db.query(
        `SELECT * FROM lexile_quantile_trend WHERE kid_name = $1 AND measure_type = $2 ORDER BY grade`, [kid, type]
      ).catch(() => [])
      return NextResponse.json({ trend: rows })
    }

    if (action === 'get_weakness_report') {
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      // Aggregate category performance across all tests
      const rows = await db.query(
        `SELECT c.category_name, SUM(c.points_earned)::int as total_earned, SUM(c.points_possible)::int as total_possible,
         ROUND(SUM(c.points_earned)::numeric / NULLIF(SUM(c.points_possible), 0) * 100, 1) as avg_percent
         FROM staar_category_results c
         JOIN staar_results r ON c.staar_result_id = r.id
         WHERE r.kid_name = $1
         GROUP BY c.category_name
         ORDER BY avg_percent ASC`,
        [kid]
      ).catch(() => [])
      return NextResponse.json({ weaknesses: rows })
    }

    if (action === 'get_all_summary') {
      // All kids summary
      const rows = await db.query(
        `SELECT kid_name, COUNT(*)::int as test_count,
         MAX(CASE WHEN subject IN ('RLA','Reading') THEN score END) as latest_rla_score,
         MAX(CASE WHEN subject IN ('RLA','Reading') THEN performance_level END) as latest_rla_level,
         MAX(CASE WHEN subject IN ('Math','Mathematics','Algebra I') THEN score END) as latest_math_score,
         MAX(CASE WHEN subject IN ('Math','Mathematics','Algebra I') THEN performance_level END) as latest_math_level
         FROM staar_results GROUP BY kid_name ORDER BY kid_name`
      ).catch(() => [])
      return NextResponse.json({ summary: rows })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('STAAR API error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'add_result') {
      const { kid_name, school_year, test_name, subject, grade_tested, score, performance_level,
        percentile, lexile_score, quantile_score, state_average, district_average, campus_average,
        school_name, school_code, embedded_supports, categories, questions } = body

      if (!kid_name || !test_name || !score) return NextResponse.json({ error: 'kid_name, test_name, score required' }, { status: 400 })

      const result = await db.query(
        `INSERT INTO staar_results (kid_name, school_year, test_name, subject, grade_tested, score, performance_level,
         percentile, lexile_score, quantile_score, state_average, district_average, campus_average,
         school_name, school_code, embedded_supports, source)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'manual') RETURNING id`,
        [kid_name.toLowerCase(), school_year, test_name, subject, grade_tested, score, performance_level,
         percentile || null, lexile_score || null, quantile_score || null, state_average || null,
         district_average || null, campus_average || null, school_name || null, school_code || null,
         embedded_supports || false]
      )
      const resultId = result[0]?.id

      // Insert categories if provided
      if (resultId && Array.isArray(categories)) {
        for (const cat of categories) {
          await db.query(
            `INSERT INTO staar_category_results (staar_result_id, category_number, category_name, points_earned, points_possible, percent)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [resultId, cat.number, cat.name, cat.earned, cat.possible, cat.percent]
          )
        }
      }

      // Insert questions if provided
      if (resultId && Array.isArray(questions)) {
        for (const q of questions) {
          await db.query(
            `INSERT INTO staar_test_questions (staar_result_id, item_number, category_number, category_name, points_earned, points_possible, result)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [resultId, q.item, q.cat_num, q.cat_name, q.earned, q.possible, q.result]
          )
        }
      }

      return NextResponse.json({ success: true, id: resultId })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('STAAR POST error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
