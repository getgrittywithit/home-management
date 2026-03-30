import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'

// ============================================================================
// GET /api/homeschool?action=...
// ============================================================================
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  switch (action) {
    // ------------------------------------------------------------------
    // get_overview — all 4 students with today's plan status
    // ------------------------------------------------------------------
    case 'get_overview': {
      const date = searchParams.get('date') || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

      try {
        const students = await db.query(
          `SELECT id, kid_name, grade_level, mascot, color_theme,
                  focus_session_length_mins, break_length_mins
           FROM hs_students ORDER BY kid_name`
        )

        const overview = []
        for (const s of students) {
          // Subjects with today's completion status
          let subjects: any[] = []
          try {
            subjects = await db.query(
              `SELECT sub.id, sub.name, sub.emoji,
                      CASE WHEN EXISTS (
                        SELECT 1 FROM hs_lesson_logs ll
                        WHERE ll.student_id = sub.student_id
                          AND ll.subject_id = sub.id
                          AND ll.plan_date = $2
                      ) THEN true ELSE false END AS completed_today
               FROM hs_subjects sub
               WHERE sub.student_id = $1
               ORDER BY sub.sort_order, sub.name`,
              [s.id, date]
            )
          } catch (err) {
            console.error(`Error fetching subjects for ${s.kid_name}:`, err)
          }

          // Focus sessions today
          let focusStats = { count: 0, total_mins: 0 }
          try {
            const focusRows = await db.query(
              `SELECT COUNT(*)::int AS count,
                      COALESCE(SUM(actual_mins), 0)::int AS total_mins
               FROM hs_focus_sessions
               WHERE student_id = $1 AND plan_date = $2`,
              [s.id, date]
            )
            if (focusRows[0]) focusStats = focusRows[0]
          } catch (err) {
            console.error(`Error fetching focus stats for ${s.kid_name}:`, err)
          }

          // Energy level from daily plan
          let energyLevel: string | null = null
          let concernFlags: string[] = []
          try {
            const planRows = await db.query(
              `SELECT energy_level, concern_flags
               FROM hs_daily_plans
               WHERE student_id = $1 AND plan_date = $2
               LIMIT 1`,
              [s.id, date]
            )
            if (planRows[0]) {
              energyLevel = planRows[0].energy_level
              concernFlags = planRows[0].concern_flags || []
            }
          } catch (err) {
            console.error(`Error fetching daily plan for ${s.kid_name}:`, err)
          }

          overview.push({
            id: s.id,
            kid_name: s.kid_name,
            grade_level: s.grade_level,
            mascot: s.mascot,
            color_theme: s.color_theme,
            subjects,
            focus_sessions_today: focusStats.count,
            total_focus_mins_today: focusStats.total_mins,
            energy_level: energyLevel,
            concern_flags: concernFlags,
          })
        }

        return NextResponse.json({ date, students: overview })
      } catch (error) {
        console.error('get_overview error:', error)
        return NextResponse.json({ error: 'Failed to load overview' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_student — full student profile
    // ------------------------------------------------------------------
    case 'get_student': {
      const kidName = searchParams.get('kid_name')
      if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })

      try {
        const students = await db.query(
          `SELECT * FROM hs_students WHERE LOWER(kid_name) = LOWER($1) LIMIT 1`,
          [kidName]
        )
        if (!students[0]) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

        const student = students[0]

        let subjects: any[] = []
        try {
          subjects = await db.query(
            `SELECT * FROM hs_subjects WHERE student_id = $1 ORDER BY sort_order, name`,
            [student.id]
          )
        } catch (err) {
          console.error('Error fetching subjects:', err)
        }

        let accommodations: any[] = []
        try {
          accommodations = await db.query(
            `SELECT * FROM hs_accommodations WHERE student_id = $1 ORDER BY category, title`,
            [student.id]
          )
        } catch (err) {
          console.error('Error fetching accommodations:', err)
        }

        return NextResponse.json({ student, subjects, accommodations })
      } catch (error) {
        console.error('get_student error:', error)
        return NextResponse.json({ error: 'Failed to load student' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_student_plan — daily plan with blocks array
    // ------------------------------------------------------------------
    case 'get_student_plan': {
      const studentId = searchParams.get('student_id')
      const date = searchParams.get('date') || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      if (!studentId) return NextResponse.json({ error: 'student_id required' }, { status: 400 })

      try {
        const plans = await db.query(
          `SELECT * FROM hs_daily_plans
           WHERE student_id = $1 AND plan_date = $2
           LIMIT 1`,
          [studentId, date]
        )

        return NextResponse.json({ plan: plans[0] || null })
      } catch (error) {
        console.error('get_student_plan error:', error)
        return NextResponse.json({ error: 'Failed to load plan' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_focus_sessions — focus sessions for the day
    // ------------------------------------------------------------------
    case 'get_focus_sessions': {
      const studentId = searchParams.get('student_id')
      const date = searchParams.get('date') || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      if (!studentId) return NextResponse.json({ error: 'student_id required' }, { status: 400 })

      try {
        const sessions = await db.query(
          `SELECT fs.*, sub.name AS subject_name, sub.emoji AS subject_emoji
           FROM hs_focus_sessions fs
           LEFT JOIN hs_subjects sub ON fs.subject_id = sub.id
           WHERE fs.student_id = $1 AND fs.plan_date = $2
           ORDER BY fs.started_at DESC`,
          [studentId, date]
        )

        return NextResponse.json({ sessions })
      } catch (error) {
        console.error('get_focus_sessions error:', error)
        return NextResponse.json({ error: 'Failed to load focus sessions' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_lesson_logs — recent lesson logs, optional subject_id filter
    // ------------------------------------------------------------------
    case 'get_lesson_logs': {
      const studentId = searchParams.get('student_id')
      const subjectId = searchParams.get('subject_id')
      const limit = parseInt(searchParams.get('limit') || '20', 10)
      if (!studentId) return NextResponse.json({ error: 'student_id required' }, { status: 400 })

      try {
        let sql = `SELECT ll.*, sub.name AS subject_name, sub.emoji AS subject_emoji
                    FROM hs_lesson_logs ll
                    LEFT JOIN hs_subjects sub ON ll.subject_id = sub.id
                    WHERE ll.student_id = $1`
        const params: any[] = [studentId]

        if (subjectId) {
          sql += ` AND ll.subject_id = $2`
          params.push(subjectId)
        }

        sql += ` ORDER BY ll.plan_date DESC, ll.created_at DESC LIMIT $${params.length + 1}`
        params.push(limit)

        const logs = await db.query(sql, params)
        return NextResponse.json({ logs })
      } catch (error) {
        console.error('get_lesson_logs error:', error)
        return NextResponse.json({ error: 'Failed to load lesson logs' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_books — filtered by student names and status
    // ------------------------------------------------------------------
    case 'get_books': {
      const studentNames = searchParams.get('student_names')
      const status = searchParams.get('status')

      try {
        let sql = `SELECT * FROM hs_books WHERE 1=1`
        const params: any[] = []

        if (studentNames) {
          const names = studentNames.split(',').map(n => n.trim())
          sql += ` AND student_names && $${params.length + 1}::text[]`
          params.push(names)
        }

        if (status) {
          sql += ` AND status = $${params.length + 1}`
          params.push(status)
        }

        sql += ` ORDER BY created_at DESC`

        const books = await db.query(sql, params)
        return NextResponse.json({ books })
      } catch (error) {
        console.error('get_books error:', error)
        return NextResponse.json({ error: 'Failed to load books' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_units — active unit studies
    // ------------------------------------------------------------------
    case 'get_units': {
      const status = searchParams.get('status') || 'active'

      try {
        const units = await db.query(
          `SELECT * FROM hs_units
           WHERE status = $1
           ORDER BY start_date DESC`,
          [status]
        )

        return NextResponse.json({ units })
      } catch (error) {
        console.error('get_units error:', error)
        return NextResponse.json({ error: 'Failed to load units' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_week_view — 5-day subject completion grid
    // ------------------------------------------------------------------
    case 'get_week_view': {
      const studentId = searchParams.get('student_id')
      const weekStart = searchParams.get('week_start')
      if (!studentId || !weekStart) {
        return NextResponse.json({ error: 'student_id and week_start required' }, { status: 400 })
      }

      try {
        // Get subjects for the student
        const subjects = await db.query(
          `SELECT id, name, emoji FROM hs_subjects
           WHERE student_id = $1 ORDER BY sort_order, name`,
          [studentId]
        )

        // Get lesson logs for 5-day window
        const logs = await db.query(
          `SELECT subject_id, plan_date
           FROM hs_lesson_logs
           WHERE student_id = $1
             AND plan_date >= $2::date
             AND plan_date < $2::date + INTERVAL '5 days'`,
          [studentId, weekStart]
        )

        // Build completion grid: { subject_id: { '2026-03-24': true, ... } }
        const grid: Record<string, Record<string, boolean>> = {}
        for (const sub of subjects) {
          grid[sub.id] = {}
        }
        for (const log of logs) {
          const dateStr = typeof log.plan_date === 'string'
            ? log.plan_date
            : new Date(log.plan_date).toLocaleDateString('en-CA')
          if (grid[log.subject_id]) {
            grid[log.subject_id][dateStr] = true
          }
        }

        return NextResponse.json({ subjects, grid, week_start: weekStart })
      } catch (error) {
        console.error('get_week_view error:', error)
        return NextResponse.json({ error: 'Failed to load week view' }, { status: 500 })
      }
    }

    default:
      return NextResponse.json({ error: `Unknown GET action: ${action}` }, { status: 400 })
  }
}

// ============================================================================
// POST /api/homeschool  { action, ...body }
// ============================================================================
export async function POST(request: NextRequest) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action, ...data } = body

  switch (action) {
    // ------------------------------------------------------------------
    // create_daily_plan — UPSERT on (student_id, plan_date)
    // ------------------------------------------------------------------
    case 'create_daily_plan': {
      const { student_id, plan_date, blocks, energy_level, concern_flags, notes } = data
      if (!student_id || !plan_date) {
        return NextResponse.json({ error: 'student_id and plan_date required' }, { status: 400 })
      }

      try {
        const result = await db.query(
          `INSERT INTO hs_daily_plans (student_id, plan_date, blocks, energy_level, concern_flags, notes)
           VALUES ($1, $2, $3::jsonb, $4, $5::jsonb, $6)
           ON CONFLICT (student_id, plan_date)
           DO UPDATE SET blocks = $3::jsonb,
                         energy_level = COALESCE($4, hs_daily_plans.energy_level),
                         concern_flags = COALESCE($5::jsonb, hs_daily_plans.concern_flags),
                         notes = COALESCE($6, hs_daily_plans.notes),
                         updated_at = NOW()
           RETURNING *`,
          [
            student_id,
            plan_date,
            JSON.stringify(blocks || []),
            energy_level || null,
            concern_flags ? JSON.stringify(concern_flags) : null,
            notes || null,
          ]
        )

        return NextResponse.json({ plan: result[0] }, { status: 201 })
      } catch (error) {
        console.error('create_daily_plan error:', error)
        return NextResponse.json({ error: 'Failed to create daily plan' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // update_block_status — patch a single block inside the blocks jsonb
    // ------------------------------------------------------------------
    case 'update_block_status': {
      const { plan_id, block_id, status, actual_duration_mins, notes: blockNotes } = data
      if (!plan_id || !block_id) {
        return NextResponse.json({ error: 'plan_id and block_id required' }, { status: 400 })
      }

      try {
        // Read current blocks
        const planRows = await db.query(
          `SELECT id, blocks FROM hs_daily_plans WHERE id = $1`,
          [plan_id]
        )
        if (!planRows[0]) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

        const blocks = planRows[0].blocks || []
        const blockIndex = blocks.findIndex((b: any) => b.id === block_id)
        if (blockIndex === -1) return NextResponse.json({ error: 'Block not found in plan' }, { status: 404 })

        // Update the block
        if (status) blocks[blockIndex].status = status
        if (actual_duration_mins !== undefined) blocks[blockIndex].actual_duration_mins = actual_duration_mins
        if (blockNotes !== undefined) blocks[blockIndex].notes = blockNotes

        const result = await db.query(
          `UPDATE hs_daily_plans SET blocks = $2::jsonb, updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [plan_id, JSON.stringify(blocks)]
        )

        return NextResponse.json({ plan: result[0], updated_block: blocks[blockIndex] })
      } catch (error) {
        console.error('update_block_status error:', error)
        return NextResponse.json({ error: 'Failed to update block' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // start_focus_session
    // ------------------------------------------------------------------
    case 'start_focus_session': {
      const { student_id, subject_id, planned_mins } = data
      if (!student_id) return NextResponse.json({ error: 'student_id required' }, { status: 400 })

      try {
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        const result = await db.query(
          `INSERT INTO hs_focus_sessions
             (student_id, subject_id, planned_mins, plan_date, started_at, status, interruptions)
           VALUES ($1, $2, $3, $4, NOW(), 'active', 0)
           RETURNING *`,
          [student_id, subject_id || null, planned_mins || 25, today]
        )

        return NextResponse.json({ session: result[0] }, { status: 201 })
      } catch (error) {
        console.error('start_focus_session error:', error)
        return NextResponse.json({ error: 'Failed to start focus session' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // end_focus_session — complete + calculate coins
    // ------------------------------------------------------------------
    case 'end_focus_session': {
      const { session_id, actual_mins, energy_note } = data
      if (!session_id) return NextResponse.json({ error: 'session_id required' }, { status: 400 })

      try {
        // Fetch current session to check interruptions
        const sessionRows = await db.query(
          `SELECT * FROM hs_focus_sessions WHERE id = $1`,
          [session_id]
        )
        if (!sessionRows[0]) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

        const session = sessionRows[0]

        // Calculate coins: 3 base + 1 if no interruptions + 1 if energy = 'great'
        let coinsEarned = 3
        if ((session.interruptions || 0) === 0) coinsEarned += 1
        if (energy_note === 'great') coinsEarned += 1

        const result = await db.query(
          `UPDATE hs_focus_sessions
           SET ended_at = NOW(),
               actual_mins = $2,
               energy_note = $3,
               status = 'completed',
               coins_earned = $4,
               updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [session_id, actual_mins || null, energy_note || null, coinsEarned]
        )

        return NextResponse.json({ session: result[0] })
      } catch (error) {
        console.error('end_focus_session error:', error)
        return NextResponse.json({ error: 'Failed to end focus session' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // pause_focus_session — increment interruptions
    // ------------------------------------------------------------------
    case 'pause_focus_session': {
      const { session_id } = data
      if (!session_id) return NextResponse.json({ error: 'session_id required' }, { status: 400 })

      try {
        const result = await db.query(
          `UPDATE hs_focus_sessions
           SET interruptions = interruptions + 1, updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [session_id]
        )
        if (!result[0]) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

        return NextResponse.json({ session: result[0] })
      } catch (error) {
        console.error('pause_focus_session error:', error)
        return NextResponse.json({ error: 'Failed to pause session' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // log_lesson
    // ------------------------------------------------------------------
    case 'log_lesson': {
      const {
        student_id, subject_id, plan_date, title, description,
        duration_mins, went_well, challenges, accommodation_used,
        engagement_level, iep_goals_addressed, photos,
      } = data
      if (!student_id || !plan_date) {
        return NextResponse.json({ error: 'student_id and plan_date required' }, { status: 400 })
      }

      try {
        const result = await db.query(
          `INSERT INTO hs_lesson_logs (
             student_id, subject_id, plan_date, title, description,
             duration_mins, went_well, challenges, accommodation_used,
             engagement_level, iep_goals_addressed, photos
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb)
           RETURNING *`,
          [
            student_id,
            subject_id || null,
            plan_date,
            title || null,
            description || null,
            duration_mins || null,
            went_well || null,
            challenges || null,
            accommodation_used || null,
            engagement_level || null,
            iep_goals_addressed ? JSON.stringify(iep_goals_addressed) : null,
            photos ? JSON.stringify(photos) : null,
          ]
        )

        return NextResponse.json({ log: result[0] }, { status: 201 })
      } catch (error) {
        console.error('log_lesson error:', error)
        return NextResponse.json({ error: 'Failed to log lesson' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // create_unit
    // ------------------------------------------------------------------
    case 'create_unit': {
      const { title, description, subject_tags, student_names, start_date, resources } = data
      if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })

      try {
        const result = await db.query(
          `INSERT INTO hs_units (title, description, subject_tags, student_names, start_date, resources, status)
           VALUES ($1, $2, $3::jsonb, $4::text[], $5, $6::jsonb, 'active')
           RETURNING *`,
          [
            title,
            description || null,
            subject_tags ? JSON.stringify(subject_tags) : null,
            student_names || null,
            start_date || null,
            resources ? JSON.stringify(resources) : null,
          ]
        )

        return NextResponse.json({ unit: result[0] }, { status: 201 })
      } catch (error) {
        console.error('create_unit error:', error)
        return NextResponse.json({ error: 'Failed to create unit' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // log_unit_activity — insert lesson log per student
    // ------------------------------------------------------------------
    case 'log_unit_activity': {
      const { unit_id, student_names: unitStudents, date: activityDate, description: actDesc, notes: actNotes } = data
      if (!unit_id || !unitStudents || !unitStudents.length) {
        return NextResponse.json({ error: 'unit_id and student_names required' }, { status: 400 })
      }

      try {
        // Look up student IDs from names
        const students = await db.query(
          `SELECT id, kid_name FROM hs_students WHERE LOWER(kid_name) = ANY($1::text[])`,
          [unitStudents.map((n: string) => n.toLowerCase())]
        )

        const logs = []
        for (const s of students) {
          try {
            const result = await db.query(
              `INSERT INTO hs_lesson_logs (student_id, unit_id, plan_date, title, description, notes)
               VALUES ($1, $2, $3, $4, $5, $6)
               RETURNING *`,
              [
                s.id,
                unit_id,
                activityDate || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }),
                `Unit activity`,
                actDesc || null,
                actNotes || null,
              ]
            )
            logs.push(result[0])
          } catch (err) {
            console.error(`Error logging unit activity for ${s.kid_name}:`, err)
          }
        }

        return NextResponse.json({ logs }, { status: 201 })
      } catch (error) {
        console.error('log_unit_activity error:', error)
        return NextResponse.json({ error: 'Failed to log unit activity' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // add_book
    // ------------------------------------------------------------------
    case 'add_book': {
      const { title, author, book_type, student_names: bookStudents, subject_tag } = data
      if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })

      try {
        const result = await db.query(
          `INSERT INTO hs_books (title, author, book_type, student_names, subject_tag, status)
           VALUES ($1, $2, $3, $4::text[], $5, 'in_progress')
           RETURNING *`,
          [
            title,
            author || null,
            book_type || 'read_aloud',
            bookStudents || null,
            subject_tag || null,
          ]
        )

        return NextResponse.json({ book: result[0] }, { status: 201 })
      } catch (error) {
        console.error('add_book error:', error)
        return NextResponse.json({ error: 'Failed to add book' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // update_book
    // ------------------------------------------------------------------
    case 'update_book': {
      const { book_id, current_page, status, completed_date, rating, notes: bookNotes } = data
      if (!book_id) return NextResponse.json({ error: 'book_id required' }, { status: 400 })

      try {
        const result = await db.query(
          `UPDATE hs_books
           SET current_page = COALESCE($2, current_page),
               status = COALESCE($3, status),
               completed_date = COALESCE($4, completed_date),
               rating = COALESCE($5, rating),
               notes = COALESCE($6, notes),
               updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [book_id, current_page ?? null, status || null, completed_date || null, rating ?? null, bookNotes || null]
        )
        if (!result[0]) return NextResponse.json({ error: 'Book not found' }, { status: 404 })

        return NextResponse.json({ book: result[0] })
      } catch (error) {
        console.error('update_book error:', error)
        return NextResponse.json({ error: 'Failed to update book' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // update_student_settings
    // ------------------------------------------------------------------
    case 'update_student_settings': {
      const { student_id, focus_session_length_mins, break_length_mins, mascot_name, color_theme } = data
      if (!student_id) return NextResponse.json({ error: 'student_id required' }, { status: 400 })

      try {
        const result = await db.query(
          `UPDATE hs_students
           SET focus_session_length_mins = COALESCE($2, focus_session_length_mins),
               break_length_mins = COALESCE($3, break_length_mins),
               mascot = COALESCE($4, mascot),
               color_theme = COALESCE($5, color_theme),
               updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [student_id, focus_session_length_mins ?? null, break_length_mins ?? null, mascot_name || null, color_theme || null]
        )
        if (!result[0]) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

        return NextResponse.json({ student: result[0] })
      } catch (error) {
        console.error('update_student_settings error:', error)
        return NextResponse.json({ error: 'Failed to update student settings' }, { status: 500 })
      }
    }

    default:
      return NextResponse.json({ error: `Unknown POST action: ${action}` }, { status: 400 })
  }
}
