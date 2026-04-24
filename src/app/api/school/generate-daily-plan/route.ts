import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { HOMESCHOOL_KIDS, KID_DISPLAY } from '@/lib/constants'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const kidName = body.kid_name?.toLowerCase()
    const date = body.date || new Date(Date.now() + 86400000).toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
    const kids = kidName ? [kidName] : [...HOMESCHOOL_KIDS]

    const results = []

    for (const kid of kids) {
      // Check day mode — skip if off/sick/vacation
      const mode = await db.query(
        `SELECT mode_type FROM day_modes WHERE kid_name = $1 AND date = $2 AND status = 'active'`, [kid, date]
      ).catch(() => [])
      if (['sick_day', 'off_day', 'vacation'].includes(mode[0]?.mode_type)) {
        results.push({ kid, skipped: true, reason: mode[0].mode_type })
        continue
      }

      // Get workbook progress
      const workbooks = await db.query(`SELECT * FROM kid_workbook_progress WHERE kid_name = $1`, [kid]).catch(() => [])
      const tasks: any[] = []

      // Summer Bridge — next 2 pages
      const sb = workbooks.find((w: any) => w.workbook_type === 'summer_bridge')
      if (sb) {
        const nextPage = (sb.last_page_completed || 0) + 1
        tasks.push({
          kid_name: kid, task_date: date, subject_name: 'ELAR', task_title: `Summer Bridge — pages ${nextPage} & ${nextPage + 1}`,
          is_required: true, status: 'pending', source_type: 'summer_bridge', generated_by: 'daily_plan_generator',
        })
      }

      // Ultimate Math — next 2 pages
      const um = workbooks.find((w: any) => w.workbook_type === 'ultimate_math')
      if (um) {
        const nextPage = (um.last_page_completed || 0) + 1
        tasks.push({
          kid_name: kid, task_date: date, subject_name: 'Math', task_title: `Ultimate Math — pages ${nextPage} & ${nextPage + 1}`,
          is_required: true, status: 'pending', source_type: 'ultimate_math', generated_by: 'daily_plan_generator',
        })
      }

      // IXL — 15 min recommendation
      const ixl = await db.query(`SELECT * FROM kid_ixl_config WHERE kid_name = $1`, [kid]).catch(() => [])
      if (ixl[0]) {
        tasks.push({
          kid_name: kid, task_date: date, subject_name: 'Math',
          task_title: 'IXL — 15 minutes, your choice of skills',
          is_required: true, status: 'pending', source_type: 'ixl',
          deep_link_url: ixl[0].ixl_math_url, generated_by: 'daily_plan_generator',
        })
      }

      // Reading — 20 min
      tasks.push({
        kid_name: kid, task_date: date, subject_name: 'ELAR',
        task_title: 'Reading — 20 minutes in any book you love',
        is_required: true, status: 'pending', source_type: 'library', generated_by: 'daily_plan_generator',
      })

      // Enrichment — 1 activity from the shared library.
      // enrichment_activities is a shared library (no kid_name column). Filter by
      // grade range so the pick matches this kid's level, and exclude anything that
      // already landed in their daily task list in the past 7 days.
      const kidGrade = (await import('@/lib/constants')).KID_GRADES[kid] || 5
      const enrichment = await db.query(
        `SELECT title FROM enrichment_activities ea
         WHERE ea.active = TRUE
           AND (ea.grade_min IS NULL OR ea.grade_min <= $2)
           AND (ea.grade_max IS NULL OR ea.grade_max >= $2)
           AND NOT EXISTS (
             SELECT 1 FROM homeschool_daily_tasks
             WHERE kid_name = $1
               AND title = ea.title
               AND task_date > CURRENT_DATE - 7
           )
         ORDER BY RANDOM() LIMIT 1`,
        [kid, kidGrade]
      ).catch(() => [])
      if (enrichment[0]) {
        tasks.push({
          kid_name: kid, task_date: date, subject_name: 'Enrichment',
          task_title: enrichment[0].title, is_required: false, status: 'pending',
          source_type: 'enrichment', generated_by: 'daily_plan_generator',
        })
      }

      // Insert tasks
      for (const t of tasks) {
        await db.query(
          `INSERT INTO homeschool_daily_tasks (kid_name, task_date, subject_name, task_title, is_required, status, source_type, deep_link_url, generated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT DO NOTHING`,
          [t.kid_name, t.task_date, t.subject_name, t.task_title, t.is_required, t.status, t.source_type, t.deep_link_url || null, t.generated_by]
        ).catch(() => {})
      }

      results.push({ kid, tasks_generated: tasks.length, tasks })
    }

    return NextResponse.json({ results, date })
  } catch (error: any) {
    console.error('[generate-daily-plan] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
