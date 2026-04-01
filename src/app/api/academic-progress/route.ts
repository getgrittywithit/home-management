import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

const ELAR_SKILLS = [
  { id: 'R1', name: 'Retelling / Summary' }, { id: 'R2', name: 'Main Idea & Details' },
  { id: 'R3', name: 'Character Analysis' }, { id: 'R4', name: 'Setting & Context' },
  { id: 'R5', name: 'Prediction & Inference' }, { id: 'R6', name: 'Cause & Effect' },
  { id: 'R7', name: 'Compare & Contrast' }, { id: 'R8', name: "Author's Purpose" },
  { id: 'R9', name: 'Vocabulary in Context' }, { id: 'R10', name: 'Figurative Language' },
  { id: 'R11', name: 'Theme / Moral' }, { id: 'R12', name: 'Text Evidence' },
  { id: 'W1', name: 'Sentence Writing' }, { id: 'W2', name: 'Grammar & Mechanics' },
  { id: 'W3', name: 'Opinion / Response' },
]

const MATH_SKILLS = [
  { id: 'M1', name: 'Number Sense & Place Value' }, { id: 'M2', name: 'Addition & Subtraction' },
  { id: 'M3', name: 'Multiplication & Division' }, { id: 'M4', name: 'Fractions & Decimals' },
  { id: 'M5', name: 'Patterns & Sequences' }, { id: 'M6', name: 'Equations & Expressions' },
  { id: 'M7', name: 'Measurement' }, { id: 'M8', name: 'Time & Money' },
  { id: 'M9', name: 'Geometry' }, { id: 'M10', name: 'Data & Graphs' },
  { id: 'M11', name: 'Probability & Statistics' }, { id: 'M12', name: 'Word Problems & Reasoning' },
]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  switch (action) {
    case 'get_elar_progress': {
      const kidName = searchParams.get('kid_name')
      if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      try {
        const rows = await db.query(
          `SELECT * FROM kid_elar_progress WHERE kid_name = $1 ORDER BY skill_id`,
          [kidName.toLowerCase()]
        )
        // If empty, seed with defaults
        if (rows.length === 0) {
          for (const skill of ELAR_SKILLS) {
            await db.query(
              `INSERT INTO kid_elar_progress (kid_name, skill_id, skill_name) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
              [kidName.toLowerCase(), skill.id, skill.name]
            )
          }
          const seeded = await db.query(`SELECT * FROM kid_elar_progress WHERE kid_name = $1 ORDER BY skill_id`, [kidName.toLowerCase()])
          return NextResponse.json({ skills: seeded, mastered: 0, total: ELAR_SKILLS.length })
        }
        const mastered = rows.filter((r: any) => r.mastery_score >= 95).length
        return NextResponse.json({ skills: rows, mastered, total: ELAR_SKILLS.length })
      } catch (error) {
        console.error('get_elar_progress error:', error)
        return NextResponse.json({ skills: [], mastered: 0, total: ELAR_SKILLS.length })
      }
    }

    case 'get_math_progress': {
      const kidName = searchParams.get('kid_name')
      if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      try {
        const rows = await db.query(
          `SELECT * FROM kid_math_progress WHERE kid_name = $1 ORDER BY skill_id`,
          [kidName.toLowerCase()]
        )
        if (rows.length === 0) {
          for (const skill of MATH_SKILLS) {
            await db.query(
              `INSERT INTO kid_math_progress (kid_name, skill_id, skill_name) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
              [kidName.toLowerCase(), skill.id, skill.name]
            )
          }
          const seeded = await db.query(`SELECT * FROM kid_math_progress WHERE kid_name = $1 ORDER BY skill_id`, [kidName.toLowerCase()])
          return NextResponse.json({ skills: seeded, mastered: 0, total: MATH_SKILLS.length })
        }
        const mastered = rows.filter((r: any) => r.mastery_score >= 95).length
        return NextResponse.json({ skills: rows, mastered, total: MATH_SKILLS.length })
      } catch (error) {
        return NextResponse.json({ skills: [], mastered: 0, total: MATH_SKILLS.length })
      }
    }

    case 'get_all_kids_progress': {
      const subject = searchParams.get('subject') || 'elar'
      const table = subject === 'math' ? 'kid_math_progress' : 'kid_elar_progress'
      try {
        const rows = await db.query(
          `SELECT kid_name,
                  COUNT(*)::int AS total_skills,
                  COUNT(*) FILTER (WHERE mastery_score >= 95)::int AS mastered,
                  ROUND(AVG(mastery_score), 1) AS avg_mastery
           FROM ${table}
           GROUP BY kid_name
           ORDER BY kid_name`
        )
        return NextResponse.json({ progress: rows })
      } catch {
        return NextResponse.json({ progress: [] })
      }
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action } = body

  switch (action) {
    case 'update_skill': {
      const { kid_name, subject, skill_id, points_change } = body
      if (!kid_name || !skill_id) return NextResponse.json({ error: 'required' }, { status: 400 })
      const table = subject === 'math' ? 'kid_math_progress' : 'kid_elar_progress'
      const kid = kid_name.toLowerCase()
      try {
        await db.query(
          `UPDATE ${table} SET
             mastery_score = GREATEST(0, LEAST(100, mastery_score + $3)),
             attempts = attempts + 1,
             successful = CASE WHEN $3 > 0 THEN successful + 1 ELSE successful END,
             last_practiced = NOW(),
             sessions_since_review = 0,
             current_level = CASE
               WHEN mastery_score + $3 >= 95 THEN 'advanced'
               WHEN mastery_score + $3 >= 80 THEN 'intermediate'
               ELSE current_level END
           WHERE kid_name = $1 AND skill_id = $2`,
          [kid, skill_id, points_change || 0]
        )
        return NextResponse.json({ success: true })
      } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
      }
    }

    case 'log_buddy_response': {
      const { kid_name, subject, skill_id, skill_level, question_text, kid_response, correct, response_quality, points_change, session_source } = body
      const table = subject === 'math' ? 'math_buddy_responses' : 'book_buddy_responses'
      try {
        if (subject === 'math') {
          await db.query(
            `INSERT INTO math_buddy_responses (kid_name, skill_id, skill_level, question_text, kid_response, correct, response_quality, points_change, session_source)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [kid_name?.toLowerCase(), skill_id, skill_level || 'beginner', question_text, kid_response || null, correct ?? null, response_quality || null, points_change || 0, session_source || 'standalone']
          )
        } else {
          await db.query(
            `INSERT INTO book_buddy_responses (kid_name, book_title, question_type, question, kid_response, response_quality, elar_skill)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [kid_name?.toLowerCase(), body.book_title || 'Unknown', body.question_type || 'comprehension', question_text, kid_response || null, response_quality || null, skill_id]
          )
        }
        // Also update skill mastery
        if (skill_id && points_change) {
          const progressTable = subject === 'math' ? 'kid_math_progress' : 'kid_elar_progress'
          await db.query(
            `UPDATE ${progressTable} SET
               mastery_score = GREATEST(0, LEAST(100, mastery_score + $3)),
               attempts = attempts + 1,
               successful = CASE WHEN $3 > 0 THEN successful + 1 ELSE successful END,
               last_practiced = NOW(),
               sessions_since_review = 0
             WHERE kid_name = $1 AND skill_id = $2`,
            [kid_name?.toLowerCase(), skill_id, points_change]
          )
        }
        return NextResponse.json({ success: true })
      } catch (error) {
        console.error('log_buddy_response error:', error)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
      }
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}
