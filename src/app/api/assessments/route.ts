import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { generateMathTest, type MathSkill } from '@/lib/mathSpeedTest'
import { parseDateLocal } from '@/lib/date-local'

// D61 Weekly Assessment System
// Actions:
//   GET:
//     - get_weekly_focus (week_start)
//     - get_vocab_words (book_id, set_name?)
//     - get_books_with_vocab
//     - get_assessment_history (kid_name?, assessment_type?, weeks?)
//     - generate_math_test (skill, grade, count?)
//   POST:
//     - set_weekly_focus
//     - copy_last_week
//     - upsert_vocab_word
//     - delete_vocab_word
//     - save_assessment_score
//     - log_vocab_practice

// Convert any date-ish to Monday of that week (ISO Mon-Sun)
function mondayOf(dateStr: string): string {
  const d = parseDateLocal(dateStr)
  const dow = d.getDay()
  const diff = (dow + 6) % 7
  d.setDate(d.getDate() - diff)
  return d.toLocaleDateString('en-CA')
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'get_weekly_focus'

    if (action === 'get_weekly_focus') {
      const weekStart = mondayOf(searchParams.get('week_start') || new Date().toLocaleDateString('en-CA'))
      const rows = await db.query(
        `SELECT wf.*,
                b.title AS vocab_book_title
         FROM weekly_focus wf
         LEFT JOIN home_library b ON b.id = wf.vocab_book_id
         WHERE wf.week_start = $1`,
        [weekStart]
      ).catch(() => [])
      const focus = rows[0] || null
      let mathFocus: any[] = []
      if (focus) {
        mathFocus = await db.query(
          `SELECT kid_name, skill_area, grade_level
           FROM weekly_math_focus WHERE weekly_focus_id = $1 ORDER BY kid_name`,
          [focus.id]
        ).catch(() => [])
      }
      return NextResponse.json({ focus, math_focus: mathFocus, week_start: weekStart })
    }

    if (action === 'get_vocab_words') {
      const bookId = searchParams.get('book_id')
      const setName = searchParams.get('set_name') || undefined
      if (!bookId) return NextResponse.json({ error: 'book_id required' }, { status: 400 })
      const rows = setName
        ? await db.query(
            `SELECT * FROM vocab_words WHERE book_id = $1 AND set_name = $2 ORDER BY sort_order, word`,
            [bookId, setName]
          )
        : await db.query(
            `SELECT * FROM vocab_words WHERE book_id = $1 ORDER BY set_name, sort_order, word`,
            [bookId]
          )
      return NextResponse.json({ words: rows })
    }

    if (action === 'get_books_with_vocab') {
      const rows = await db.query(
        `SELECT b.id, b.title, b.author_or_publisher,
                ARRAY_AGG(DISTINCT vw.set_name) FILTER (WHERE vw.set_name IS NOT NULL) AS sets,
                COUNT(vw.id)::int AS word_count
         FROM home_library b
         LEFT JOIN vocab_words vw ON vw.book_id = b.id
         WHERE b.item_type = 'book'
         GROUP BY b.id, b.title, b.author_or_publisher
         HAVING COUNT(vw.id) > 0
         ORDER BY b.title`
      ).catch(() => [])
      return NextResponse.json({ books: rows })
    }

    if (action === 'get_assessment_history') {
      const kidName = searchParams.get('kid_name')?.toLowerCase()
      const type = searchParams.get('assessment_type')
      const weeks = parseInt(searchParams.get('weeks') || '12', 10)
      const since = new Date()
      since.setDate(since.getDate() - weeks * 7)
      const sinceStr = since.toLocaleDateString('en-CA')

      const where: string[] = ['week_start >= $1']
      const params: any[] = [sinceStr]
      if (kidName) { params.push(kidName); where.push(`LOWER(kid_name) = $${params.length}`) }
      if (type) { params.push(type); where.push(`assessment_type = $${params.length}`) }

      const rows = await db.query(
        `SELECT s.*, b.title AS book_title
         FROM assessment_scores s
         LEFT JOIN home_library b ON b.id = s.book_id
         WHERE ${where.join(' AND ')}
         ORDER BY week_start DESC, kid_name, assessment_type`,
        params
      ).catch(() => [])
      return NextResponse.json({ scores: rows })
    }

    if (action === 'generate_math_test') {
      const skill = (searchParams.get('skill') || 'mixed') as MathSkill
      const grade = parseInt(searchParams.get('grade') || '4', 10)
      const count = parseInt(searchParams.get('count') || '20', 10)
      const problems = generateMathTest({ skill, grade, count })
      return NextResponse.json({ problems, skill, grade })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('Assessments GET error:', error)
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'set_weekly_focus') {
      const {
        week_start, vocab_book_id, vocab_set_name, vocab_test_date,
        science_unit, history_unit, notes, math_focus,
      } = body
      if (!week_start) return NextResponse.json({ error: 'week_start required' }, { status: 400 })
      const mon = mondayOf(week_start)

      const upsert = await db.query(
        `INSERT INTO weekly_focus (week_start, vocab_book_id, vocab_set_name, vocab_test_date, science_unit, history_unit, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (week_start) DO UPDATE SET
           vocab_book_id = EXCLUDED.vocab_book_id,
           vocab_set_name = EXCLUDED.vocab_set_name,
           vocab_test_date = EXCLUDED.vocab_test_date,
           science_unit = EXCLUDED.science_unit,
           history_unit = EXCLUDED.history_unit,
           notes = EXCLUDED.notes,
           updated_at = NOW()
         RETURNING *`,
        [mon, vocab_book_id || null, vocab_set_name || null, vocab_test_date || null,
         science_unit || null, history_unit || null, notes || null]
      )
      const focusId = upsert[0].id

      if (Array.isArray(math_focus)) {
        await db.query(`DELETE FROM weekly_math_focus WHERE weekly_focus_id = $1`, [focusId])
        for (const mf of math_focus) {
          if (!mf.kid_name || !mf.skill_area || !mf.grade_level) continue
          await db.query(
            `INSERT INTO weekly_math_focus (weekly_focus_id, kid_name, skill_area, grade_level)
             VALUES ($1, $2, $3, $4)`,
            [focusId, mf.kid_name.toLowerCase(), mf.skill_area, mf.grade_level]
          )
        }
      }

      return NextResponse.json({ success: true, focus: upsert[0] })
    }

    if (action === 'copy_last_week') {
      const { week_start } = body
      if (!week_start) return NextResponse.json({ error: 'week_start required' }, { status: 400 })
      const mon = mondayOf(week_start)
      const prevMon = parseDateLocal(mon)
      prevMon.setDate(prevMon.getDate() - 7)
      const prevStr = prevMon.toLocaleDateString('en-CA')

      const prev = await db.query(
        `SELECT * FROM weekly_focus WHERE week_start = $1`, [prevStr]
      )
      if (prev.length === 0) return NextResponse.json({ error: 'No previous week to copy' }, { status: 404 })

      const newTestDate = prev[0].vocab_test_date
        ? new Date(new Date(prev[0].vocab_test_date).getTime() + 7 * 86400000).toLocaleDateString('en-CA')
        : null

      const created = await db.query(
        `INSERT INTO weekly_focus (week_start, vocab_book_id, vocab_set_name, vocab_test_date, science_unit, history_unit, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (week_start) DO UPDATE SET
           vocab_book_id = EXCLUDED.vocab_book_id,
           vocab_set_name = EXCLUDED.vocab_set_name,
           vocab_test_date = EXCLUDED.vocab_test_date,
           science_unit = EXCLUDED.science_unit,
           history_unit = EXCLUDED.history_unit,
           updated_at = NOW()
         RETURNING *`,
        [mon, prev[0].vocab_book_id, prev[0].vocab_set_name, newTestDate,
         prev[0].science_unit, prev[0].history_unit, prev[0].notes]
      )
      const newFocusId = created[0].id

      const prevMath = await db.query(
        `SELECT kid_name, skill_area, grade_level FROM weekly_math_focus WHERE weekly_focus_id = $1`,
        [prev[0].id]
      )
      for (const mf of prevMath) {
        await db.query(
          `INSERT INTO weekly_math_focus (weekly_focus_id, kid_name, skill_area, grade_level)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (weekly_focus_id, kid_name) DO UPDATE SET skill_area = EXCLUDED.skill_area, grade_level = EXCLUDED.grade_level`,
          [newFocusId, mf.kid_name, mf.skill_area, mf.grade_level]
        )
      }

      return NextResponse.json({ success: true, focus: created[0] })
    }

    if (action === 'upsert_vocab_word') {
      const { id, book_id, set_name, word, definition, example_sentence, difficulty, sort_order } = body
      if (!book_id || !word || !definition) {
        return NextResponse.json({ error: 'book_id, word, and definition required' }, { status: 400 })
      }
      if (id) {
        await db.query(
          `UPDATE vocab_words SET word = $1, definition = $2, example_sentence = $3, difficulty = COALESCE($4, difficulty), sort_order = COALESCE($5, sort_order), set_name = $6
           WHERE id = $7`,
          [word, definition, example_sentence || null, difficulty || null, sort_order || null, set_name || null, id]
        )
      } else {
        await db.query(
          `INSERT INTO vocab_words (book_id, set_name, word, definition, example_sentence, difficulty, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (book_id, set_name, word) DO UPDATE SET
             definition = EXCLUDED.definition,
             example_sentence = EXCLUDED.example_sentence,
             difficulty = EXCLUDED.difficulty,
             sort_order = EXCLUDED.sort_order`,
          [book_id, set_name || null, word, definition, example_sentence || null, difficulty || 1, sort_order || 0]
        )
      }
      return NextResponse.json({ success: true })
    }

    if (action === 'delete_vocab_word') {
      const { id } = body
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      await db.query(`DELETE FROM vocab_words WHERE id = $1`, [id])
      return NextResponse.json({ success: true })
    }

    if (action === 'save_assessment_score') {
      const {
        kid_name, assessment_type, week_start, book_id, skill_area, grade_level,
        score_earned, score_possible, part_scores, time_seconds,
        problems_attempted, problems_correct, notes,
      } = body
      if (!kid_name || !assessment_type || !week_start) {
        return NextResponse.json({ error: 'kid_name, assessment_type, week_start required' }, { status: 400 })
      }
      const mon = mondayOf(week_start)
      await db.query(
        `INSERT INTO assessment_scores
           (kid_name, assessment_type, week_start, book_id, skill_area, grade_level,
            score_earned, score_possible, part_scores, time_seconds,
            problems_attempted, problems_correct, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (kid_name, assessment_type, week_start, skill_area) DO UPDATE SET
           score_earned = EXCLUDED.score_earned,
           score_possible = EXCLUDED.score_possible,
           part_scores = EXCLUDED.part_scores,
           time_seconds = EXCLUDED.time_seconds,
           problems_attempted = EXCLUDED.problems_attempted,
           problems_correct = EXCLUDED.problems_correct,
           notes = EXCLUDED.notes`,
        [kid_name.toLowerCase(), assessment_type, mon, book_id || null, skill_area || null,
         grade_level || null, score_earned || null, score_possible || null,
         part_scores ? JSON.stringify(part_scores) : null, time_seconds || null,
         problems_attempted || null, problems_correct || null, notes || null]
      )
      return NextResponse.json({ success: true })
    }

    if (action === 'log_vocab_practice') {
      const { kid_name, word_id, week_start } = body
      if (!kid_name || !word_id) return NextResponse.json({ error: 'kid_name, word_id required' }, { status: 400 })
      const mon = mondayOf(week_start || new Date().toLocaleDateString('en-CA'))
      await db.query(
        `INSERT INTO vocab_practice_log (kid_name, week_start, word_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (kid_name, week_start, word_id) DO NOTHING`,
        [kid_name.toLowerCase(), mon, word_id]
      )
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('Assessments POST error:', error)
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}
