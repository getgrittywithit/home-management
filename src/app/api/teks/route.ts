import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { HOMESCHOOL_KIDS, KID_GRADES, KID_DISPLAY } from '@/lib/constants'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'standards'

  try {
    if (action === 'standards') {
      const grade = searchParams.get('grade')
      const subject = searchParams.get('subject')
      let sql = `SELECT * FROM teks_standards WHERE 1=1`
      const params: any[] = []
      if (grade) { params.push(parseInt(grade)); sql += ` AND grade_level = $${params.length}` }
      if (subject) { params.push(subject); sql += ` AND subject = $${params.length}` }
      sql += ` ORDER BY teks_code LIMIT 500`
      const rows = await db.query(sql, params).catch(() => [])
      return NextResponse.json({ standards: rows, count: rows.length })
    }

    if (action === 'coverage') {
      const kid = searchParams.get('kid_name')?.toLowerCase()
      const year = searchParams.get('school_year') || '2025-2026'
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })

      const coverage = await db.query(
        `SELECT ktc.*, ts.subject, ts.strand, ts.student_expectation
         FROM kid_teks_coverage ktc
         JOIN teks_standards ts ON ts.teks_code = ktc.teks_code
         WHERE ktc.kid_name = $1 AND ktc.school_year = $2
         ORDER BY ts.subject, ts.strand, ts.teks_code`,
        [kid, year]
      ).catch(() => [])

      // Summary by subject
      const subjects: Record<string, { total: number; covered: number; mastered: number }> = {}
      for (const c of coverage) {
        if (!subjects[c.subject]) subjects[c.subject] = { total: 0, covered: 0, mastered: 0 }
        subjects[c.subject].total++
        if (c.status !== 'not_started') subjects[c.subject].covered++
        if (c.status === 'mastered') subjects[c.subject].mastered++
      }

      return NextResponse.json({ coverage, subjects, kid_name: kid, school_year: year })
    }

    if (action === 'gaps') {
      const kid = searchParams.get('kid_name')?.toLowerCase()
      const subject = searchParams.get('subject')
      const year = searchParams.get('school_year') || '2025-2026'
      if (!kid) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })

      let sql = `SELECT ts.* FROM teks_standards ts
                 LEFT JOIN kid_teks_coverage ktc ON ktc.teks_code = ts.teks_code AND ktc.kid_name = $1 AND ktc.school_year = $2
                 WHERE ts.grade_level = $3 AND (ktc.status IS NULL OR ktc.status = 'not_started')`
      const grade = KID_GRADES[kid] || 5
      const params: any[] = [kid, year, grade]
      if (subject) { params.push(subject); sql += ` AND ts.subject = $${params.length}` }
      sql += ` ORDER BY ts.subject, ts.teks_code LIMIT 50`

      const gaps = await db.query(sql, params).catch(() => [])
      return NextResponse.json({ gaps, count: gaps.length })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'tag_activity': {
        const { activity_type, activity_id, teks_code, tagged_by } = body
        if (!activity_type || !activity_id || !teks_code) return NextResponse.json({ error: 'activity_type + activity_id + teks_code required' }, { status: 400 })
        await db.query(
          `INSERT INTO activity_teks_map (activity_type, activity_id, teks_code, tagged_by) VALUES ($1, $2, $3, $4)
           ON CONFLICT (activity_type, activity_id, teks_code) DO NOTHING`,
          [activity_type, String(activity_id), teks_code, tagged_by || 'parent']
        )
        return NextResponse.json({ success: true })
      }

      case 'import_ixl_proficiency': {
        const { kid_name, rows } = body
        if (!kid_name || !rows?.length) return NextResponse.json({ error: 'kid_name + rows required' }, { status: 400 })
        const today = new Date().toLocaleDateString('en-CA')
        let imported = 0
        for (const row of rows) {
          await db.query(
            `INSERT INTO ixl_standards_proficiency_import (kid_name, import_date, teks_code, ixl_skill_code, smartscore, minutes_practiced, raw_csv_row)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [kid_name.toLowerCase(), today, row.teks_code || null, row.skill_code || null, row.smartscore || null, row.minutes || null, JSON.stringify(row)]
          ).catch(() => {})
          imported++
        }
        return NextResponse.json({ imported })
      }

      case 'refresh_coverage': {
        const kidName = body.kid_name?.toLowerCase()
        const year = body.school_year || '2025-2026'
        const kids = kidName ? [kidName] : [...HOMESCHOOL_KIDS]

        for (const kid of kids) {
          const grade = KID_GRADES[kid] || 5
          const standards = await db.query(
            `SELECT teks_code FROM teks_standards WHERE grade_level = $1`, [grade]
          ).catch(() => [])

          for (const s of standards) {
            const activities = await db.query(
              `SELECT COUNT(*)::int AS count, MAX(atm.created_at)::date AS last_date
               FROM activity_teks_map atm WHERE atm.teks_code = $1`,
              [s.teks_code]
            ).catch(() => [{ count: 0, last_date: null }])

            const ixl = await db.query(
              `SELECT MAX(smartscore) AS max_score FROM ixl_standards_proficiency_import
               WHERE kid_name = $1 AND teks_code = $2`, [kid, s.teks_code]
            ).catch(() => [{ max_score: null }])

            const count = activities[0]?.count || 0
            const mastery = (ixl[0]?.max_score || 0) >= 85 ? 0.9 : count >= 3 ? 0.7 : count >= 1 ? 0.3 : 0
            const status = mastery >= 0.85 ? 'mastered' : count >= 3 ? 'practiced' : count >= 1 ? 'introduced' : 'not_started'

            await db.query(
              `INSERT INTO kid_teks_coverage (kid_name, school_year, teks_code, activity_count, last_activity_date, mastery_signal, status)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               ON CONFLICT (kid_name, school_year, teks_code) DO UPDATE SET
                 activity_count = $4, last_activity_date = $5, mastery_signal = $6, status = $7, updated_at = NOW()`,
              [kid, year, s.teks_code, count, activities[0]?.last_date || null, mastery, status]
            ).catch(() => {})
          }
        }
        return NextResponse.json({ success: true, kids: kids.length })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
