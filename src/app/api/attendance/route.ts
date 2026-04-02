import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

const SCHOOL_TYPES: Record<string, string> = {
  amos: 'homeschool', zoey: 'public', kaylee: 'public',
  ellie: 'homeschool', wyatt: 'homeschool', hannah: 'homeschool',
}

const SCHOOL_CONTACTS: Record<string, { name: string; phone: string }> = {
  zoey: { name: 'Samuel V Champion High School', phone: '(830) 357-2000' },
  kaylee: { name: 'Boerne Middle School North', phone: '(830) 357-2100' },
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  switch (action) {
    case 'get_attendance': {
      const kidName = searchParams.get('kid_name')
      const month = searchParams.get('month') // YYYY-MM format
      try {
        let sql = `SELECT * FROM school_attendance WHERE 1=1`
        const params: any[] = []
        if (kidName) {
          sql += ` AND kid_name = $${params.length + 1}`
          params.push(kidName.toLowerCase())
        }
        if (month) {
          sql += ` AND to_char(absence_date, 'YYYY-MM') = $${params.length + 1}`
          params.push(month)
        }
        sql += ` ORDER BY absence_date DESC`
        const rows = await db.query(sql, params)
        return NextResponse.json({ attendance: rows })
      } catch (error) {
        console.error('get_attendance error:', error)
        return NextResponse.json({ attendance: [] })
      }
    }

    case 'get_summary': {
      const month = searchParams.get('month') || new Date().toISOString().slice(0, 7)
      try {
        const rows = await db.query(
          `SELECT kid_name,
                  COUNT(*) FILTER (WHERE status = 'present')::int AS present,
                  COUNT(*) FILTER (WHERE status = 'absent_sick')::int AS sick,
                  COUNT(*) FILTER (WHERE status NOT IN ('present','absent_sick'))::int AS other
           FROM school_attendance
           WHERE to_char(absence_date, 'YYYY-MM') = $1
           GROUP BY kid_name
           ORDER BY kid_name`,
          [month]
        )
        return NextResponse.json({ summary: rows, month })
      } catch {
        return NextResponse.json({ summary: [], month })
      }
    }

    // ATTENDANCE-1: Homeschool compliance report
    case 'get_homeschool_report': {
      const kidName = searchParams.get('kid_name')
      const startDate = searchParams.get('start_date') || '2025-08-01'
      const endDate = searchParams.get('end_date') || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      const homeschoolKids = kidName ? [kidName.toLowerCase()] : ['amos', 'ellie', 'wyatt', 'hannah']

      try {
        const reports: any[] = []
        for (const kid of homeschoolKids) {
          if (SCHOOL_TYPES[kid] !== 'homeschool') continue
          const rows = await db.query(
            `SELECT
              event_date,
              COUNT(*) FILTER (WHERE completed = TRUE AND (
                event_id LIKE '%school%' OR event_id LIKE '%math%' OR event_id LIKE '%elar%'
                OR event_id LIKE '%science%' OR event_id LIKE '%reading%' OR event_id LIKE '%vocab%'
              ))::int as academic_tasks
             FROM kid_daily_checklist
             WHERE child_name = $1 AND event_date BETWEEN $2 AND $3
             GROUP BY event_date
             HAVING COUNT(*) FILTER (WHERE completed = TRUE AND (
               event_id LIKE '%school%' OR event_id LIKE '%math%' OR event_id LIKE '%elar%'
               OR event_id LIKE '%science%' OR event_id LIKE '%reading%' OR event_id LIKE '%vocab%'
             )) > 0
             ORDER BY event_date`,
            [kid, startDate, endDate]
          )
          const monthly: Record<string, number> = {}
          rows.forEach((r: any) => {
            const m = (r.event_date?.toISOString?.() || String(r.event_date)).slice(0, 7)
            monthly[m] = (monthly[m] || 0) + 1
          })
          reports.push({ kid_name: kid, total_school_days: rows.length, monthly_breakdown: monthly })
        }
        return NextResponse.json({ reports, start_date: startDate, end_date: endDate })
      } catch (error) {
        console.error('Homeschool report error:', error)
        return NextResponse.json({ reports: [], error: 'Failed' })
      }
    }

    case 'get_makeup_work': {
      const kidName = searchParams.get('kid_name')
      const status = searchParams.get('status') || 'pending'
      try {
        let sql = `SELECT * FROM makeup_work WHERE status = $1`
        const params: any[] = [status]
        if (kidName) {
          sql += ` AND kid_name = $2`
          params.push(kidName.toLowerCase())
        }
        sql += ` ORDER BY absent_date DESC, subject`
        const rows = await db.query(sql, params)
        return NextResponse.json({ makeup_work: rows })
      } catch {
        return NextResponse.json({ makeup_work: [] })
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
    case 'mark_sick': {
      const { kid_name } = body
      if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })

      const kid = kid_name.toLowerCase()
      const schoolType = SCHOOL_TYPES[kid] || 'homeschool'

      try {
        // Insert attendance record
        const attRows = await db.query(
          `INSERT INTO school_attendance (kid_name, absence_date, status, school_type, source, makeup_needed)
           VALUES ($1, CURRENT_DATE, 'absent_sick', $2, 'sick_flag', TRUE)
           ON CONFLICT (kid_name, absence_date) DO UPDATE SET status = 'absent_sick', source = 'sick_flag', makeup_needed = TRUE
           RETURNING *`,
          [kid, schoolType]
        )
        const attendance = attRows[0]

        // Auto-generate makeup work
        if (schoolType === 'homeschool') {
          // Pull today's tasks and create makeup entries
          try {
            const days = ['sun','mon','tue','wed','thu','fri','sat']
            const dayOfWeek = days[new Date().getDay()]
            const tasks = await db.query(
              `SELECT * FROM homeschool_tasks
               WHERE kid_name = $1 AND active = true
               AND (is_recurring = false OR $2 = ANY(recurrence_days))`,
              [kid, dayOfWeek]
            )
            for (const task of tasks) {
              await db.query(
                `INSERT INTO makeup_work (kid_name, attendance_id, absent_date, subject, assignment_description, status)
                 VALUES ($1, $2, CURRENT_DATE, $3, $4, 'pending')`,
                [kid, attendance.id, task.subject, task.task_label]
              )
            }
          } catch { /* tasks may not exist */ }
        } else {
          // Public school — blank entry with reminder
          const contact = SCHOOL_CONTACTS[kid]
          const note = contact
            ? `Call ${contact.name} at ${contact.phone} for missed assignments`
            : 'Check with school for missed assignments'
          await db.query(
            `INSERT INTO makeup_work (kid_name, attendance_id, absent_date, subject, assignment_description, notes, status)
             VALUES ($1, $2, CURRENT_DATE, 'All Subjects', 'Get homework from school', $3, 'pending')`,
            [kid, attendance.id, note]
          )
        }

        return NextResponse.json({
          attendance,
          school_type: schoolType,
          school_contact: SCHOOL_CONTACTS[kid] || null,
        })
      } catch (error) {
        console.error('mark_sick error:', error)
        return NextResponse.json({ error: 'Failed to mark sick day' }, { status: 500 })
      }
    }

    case 'complete_makeup': {
      const { makeup_id } = body
      if (!makeup_id) return NextResponse.json({ error: 'makeup_id required' }, { status: 400 })
      try {
        await db.query(
          `UPDATE makeup_work SET status = 'completed', completed_at = NOW() WHERE id = $1`,
          [makeup_id]
        )
        return NextResponse.json({ success: true })
      } catch (error) {
        console.error('complete_makeup error:', error)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
      }
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}
