import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { createNotification } from '@/lib/notifications'

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
      const readType = searchParams.get('read_type')
      const schoolYear = searchParams.get('school_year')

      try {
        let sql = `SELECT id, title, author, book_type, student_names, subject_tag, status,
                          current_page, total_pages, rating, notes, completed_date,
                          COALESCE(series_name, '') AS series_name,
                          COALESCE(series_number, 0) AS series_number,
                          COALESCE(read_type, 'independent') AS read_type,
                          COALESCE(school_year, '') AS school_year,
                          created_at, updated_at
                   FROM hs_books WHERE 1=1`
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

        if (readType) {
          sql += ` AND read_type = $${params.length + 1}`
          params.push(readType)
        }

        if (schoolYear) {
          sql += ` AND school_year = $${params.length + 1}`
          params.push(schoolYear)
        }

        sql += ` ORDER BY CASE WHEN series_name IS NOT NULL AND series_name != '' THEN series_name ELSE title END, series_number, created_at DESC`

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

    // ------------------------------------------------------------------
    // get_todays_tasks — checkable daily tasks for a kid
    // ------------------------------------------------------------------
    case 'get_todays_tasks': {
      const kidName = searchParams.get('kid_name')
      if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })

      try {
        const days = ['sun','mon','tue','wed','thu','fri','sat']
        const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
        const dayOfWeek = days[now.getDay()]

        const tasks = await db.query(`
          SELECT t.*,
                 CASE WHEN c.id IS NOT NULL THEN true ELSE false END AS completed
          FROM homeschool_tasks t
          LEFT JOIN homeschool_task_completions c
            ON c.task_id = t.id AND c.kid_name = t.kid_name AND c.task_date = CURRENT_DATE
          WHERE t.kid_name = $1
            AND t.active = true
            AND (t.is_recurring = false OR $2 = ANY(t.recurrence_days))
          ORDER BY t.subject, t.sort_order
        `, [kidName, dayOfWeek])

        // Group by subject
        const bySubject: Record<string, any[]> = {}
        for (const task of tasks) {
          if (!bySubject[task.subject]) bySubject[task.subject] = []
          bySubject[task.subject].push(task)
        }

        const totalTasks = tasks.length
        const completedTasks = tasks.filter((t: any) => t.completed).length
        const totalMinutes = tasks.reduce((sum: number, t: any) => sum + (t.completed ? t.duration_min : 0), 0)

        return NextResponse.json({
          tasks,
          by_subject: bySubject,
          total_tasks: totalTasks,
          completed_tasks: completedTasks,
          total_focus_mins: totalMinutes,
        })
      } catch (error) {
        console.error('get_todays_tasks error:', error)
        return NextResponse.json({ error: 'Failed to load tasks' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_task_progress — all kids' task progress for today (parent view)
    // ------------------------------------------------------------------
    case 'get_task_progress': {
      try {
        const days = ['sun','mon','tue','wed','thu','fri','sat']
        const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
        const dayOfWeek = days[now.getDay()]

        const progress = await db.query(`
          SELECT t.kid_name,
                 COUNT(t.id)::int AS total_tasks,
                 COUNT(c.id)::int AS completed_tasks,
                 COALESCE(SUM(CASE WHEN c.id IS NOT NULL THEN t.duration_min ELSE 0 END), 0)::int AS focus_mins
          FROM homeschool_tasks t
          LEFT JOIN homeschool_task_completions c
            ON c.task_id = t.id AND c.kid_name = t.kid_name AND c.task_date = CURRENT_DATE
          WHERE t.active = true
            AND (t.is_recurring = false OR $1 = ANY(t.recurrence_days))
          GROUP BY t.kid_name
          ORDER BY t.kid_name
        `, [dayOfWeek])

        return NextResponse.json({ progress })
      } catch (error) {
        console.error('get_task_progress error:', error)
        return NextResponse.json({ error: 'Failed to load task progress' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_kid_tasks — all tasks for a kid (parent management view)
    // ------------------------------------------------------------------
    case 'get_kid_tasks': {
      const kidName = searchParams.get('kid_name')
      if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })

      try {
        const tasks = await db.query(
          `SELECT t.*,
                  CASE WHEN c.id IS NOT NULL THEN true ELSE false END AS completed,
                  c.completed_at AS completed_at
           FROM homeschool_tasks t
           LEFT JOIN homeschool_task_completions c
             ON c.task_id = t.id AND c.kid_name = t.kid_name AND c.task_date = CURRENT_DATE
           WHERE t.kid_name = $1
           ORDER BY t.subject, t.sort_order`,
          [kidName]
        )
        return NextResponse.json({ tasks })
      } catch (error) {
        console.error('get_kid_tasks error:', error)
        return NextResponse.json({ error: 'Failed to load tasks' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_enrichment_options — 3 filtered activities for a kid + subject
    // ------------------------------------------------------------------
    case 'get_enrichment_options': {
      const kidName = searchParams.get('kid_name')
      const subject = searchParams.get('subject')
      if (!kidName || !subject) {
        return NextResponse.json({ error: 'kid_name and subject required' }, { status: 400 })
      }

      try {
        // Kid accessibility flags and grade
        const KID_FLAGS: Record<string, string[]> = {
          amos: ['dyslexia','dyscalculia','speech_delay','apd','color_vision','adhd','autism'],
          ellie: ['speech_delay','suspected_adhd'],
          wyatt: ['speech_delay','adhd','color_vision'],
          hannah: ['speech_delay','stutter'],
          kaylee: ['speech_delay','autism','suspected_dyslexia'],
          zoey: [],
        }
        const KID_GRADES: Record<string, number> = {
          amos: 10, ellie: 6, wyatt: 4, hannah: 3, kaylee: 7, zoey: 9,
        }
        const kid = kidName.toLowerCase()
        const flags = KID_FLAGS[kid] || []
        const grade = KID_GRADES[kid] || 5

        // Map kid flags to activity conflict types
        const conflictMap: Record<string, string[]> = {
          color_vision: ['color_heavy'],
          dyslexia: ['reading_heavy'],
          suspected_dyslexia: ['reading_heavy'],
          dyscalculia: ['math_heavy'],
          speech_delay: ['verbal_required'],
          stutter: ['verbal_required','timed_pressure'],
          apd: ['verbal_required'],
          adhd: ['timed_pressure'],
          autism: ['complex_rules','loud_chaotic'],
        }
        const blockedConflicts = new Set<string>()
        for (const f of flags) {
          for (const c of (conflictMap[f] || [])) blockedConflicts.add(c)
        }

        // Get recently shown activities (last 5 days)
        const recentIds = await db.query(
          `SELECT DISTINCT activity_id FROM kid_enrichment_log
           WHERE kid_name = $1 AND date >= CURRENT_DATE - INTERVAL '5 days'`,
          [kid]
        )
        const recentIdSet = new Set(recentIds.map((r: any) => r.activity_id))

        // Fetch all matching activities for the subject
        const activities = await db.query(
          `SELECT * FROM enrichment_activities
           WHERE subject = $1 AND active = TRUE
             AND grade_min <= $2 AND grade_max >= $2
           ORDER BY RANDOM()`,
          [subject, grade]
        )

        // Filter out conflicts and recently shown
        const filtered = activities.filter((a: any) => {
          if (recentIdSet.has(a.id)) return false
          const conflicts = a.accessibility_conflicts || []
          for (const c of conflicts) {
            if (blockedConflicts.has(c)) return false
          }
          return true
        }).slice(0, 3)

        return NextResponse.json({ activities: filtered, kid_name: kid, subject })
      } catch (error) {
        console.error('get_enrichment_options error:', error)
        return NextResponse.json({ error: 'Failed to load enrichment options' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_enrichment_summary — parent view of picks/completions per kid
    // ------------------------------------------------------------------
    case 'get_enrichment_summary': {
      const kidName = searchParams.get('kid_name')
      const days = parseInt(searchParams.get('days') || '7', 10)

      try {
        let sql = `SELECT l.kid_name, l.date, l.picked, l.completed, l.stars_earned,
                          a.title, a.subject, a.duration_min
                   FROM kid_enrichment_log l
                   JOIN enrichment_activities a ON l.activity_id = a.id
                   WHERE l.date >= CURRENT_DATE - $1 * INTERVAL '1 day'`
        const params: any[] = [days]

        if (kidName) {
          sql += ` AND l.kid_name = $2`
          params.push(kidName.toLowerCase())
        }
        sql += ` ORDER BY l.date DESC, l.shown_at DESC`

        const logs = await db.query(sql, params)

        // Build summary per kid
        const summary: Record<string, any> = {}
        for (const log of logs) {
          if (!summary[log.kid_name]) {
            summary[log.kid_name] = { total_shown: 0, total_picked: 0, total_completed: 0, by_subject: {}, entries: [] }
          }
          const s = summary[log.kid_name]
          s.total_shown++
          if (log.picked) s.total_picked++
          if (log.completed) s.total_completed++
          if (!s.by_subject[log.subject]) s.by_subject[log.subject] = 0
          if (log.completed) s.by_subject[log.subject]++
          s.entries.push(log)
        }

        return NextResponse.json({ summary, days })
      } catch (error) {
        console.error('get_enrichment_summary error:', error)
        return NextResponse.json({ error: 'Failed to load enrichment summary' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_financial_level — current level + progress for a kid
    // ------------------------------------------------------------------
    case 'get_financial_level': {
      const kidName = searchParams.get('kid_name')
      if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })
      const explicitLevel = searchParams.get('level')

      try {
        const rows = await db.query(
          `SELECT * FROM financial_literacy_progress WHERE kid_name = $1`,
          [kidName.toLowerCase()]
        )

        // Use explicit level param if provided, otherwise fall back to DB value
        const levelToUse = explicitLevel ? parseInt(explicitLevel) : (rows[0]?.current_level || 1)

        // Get activities for the determined level
        const activities = await db.query(
          `SELECT * FROM enrichment_activities
           WHERE subject = 'financial_literacy' AND financial_level = $1 AND active = TRUE
           ORDER BY title`,
          [levelToUse]
        )

        return NextResponse.json({ progress: rows[0] || null, activities })
      } catch (error) {
        console.error('get_financial_level error:', error)
        return NextResponse.json({ error: 'Failed to load financial level' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_subject_pool — all activities for a subject + optional level
    // ------------------------------------------------------------------
    case 'get_subject_pool': {
      const subject = searchParams.get('subject')
      const level = searchParams.get('level')
      if (!subject) return NextResponse.json({ error: 'subject required' }, { status: 400 })

      try {
        let sql = `SELECT * FROM enrichment_activities WHERE subject = $1 AND active = TRUE`
        const params: any[] = [subject]
        if (level) {
          sql += ` AND financial_level = $2`
          params.push(parseInt(level, 10))
        }
        sql += ` ORDER BY financial_level NULLS FIRST, title`
        const activities = await db.query(sql, params)
        return NextResponse.json({ activities })
      } catch (error) {
        console.error('get_subject_pool error:', error)
        return NextResponse.json({ error: 'Failed to load subject pool' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_typing_personal_best — best WPM for a kid
    // ------------------------------------------------------------------
    case 'get_typing_personal_best': {
      const kidName = searchParams.get('kid_name')
      if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })

      try {
        const rows = await db.query(
          `SELECT MAX(wpm) AS best_wpm, MAX(accuracy_pct) AS best_accuracy,
                  COUNT(*)::int AS total_sessions
           FROM typing_sessions WHERE kid_name = $1`,
          [kidName.toLowerCase()]
        )
        return NextResponse.json({ stats: rows[0] || { best_wpm: 0, best_accuracy: 0, total_sessions: 0 } })
      } catch (error) {
        console.error('get_typing_personal_best error:', error)
        return NextResponse.json({ error: 'Failed to load typing stats' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_typing_history — recent sessions for a kid
    // ------------------------------------------------------------------
    case 'get_typing_history': {
      const kidName = searchParams.get('kid_name')
      const limit = parseInt(searchParams.get('limit') || '10', 10)
      if (!kidName) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })

      try {
        const sessions = await db.query(
          `SELECT * FROM typing_sessions
           WHERE kid_name = $1
           ORDER BY session_date DESC, id DESC
           LIMIT $2`,
          [kidName.toLowerCase(), limit]
        )
        return NextResponse.json({ sessions })
      } catch (error) {
        console.error('get_typing_history error:', error)
        return NextResponse.json({ error: 'Failed to load typing history' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_typing_leaderboard — all kids' personal bests
    // ------------------------------------------------------------------
    case 'get_typing_leaderboard': {
      try {
        const board = await db.query(
          `SELECT kid_name, MAX(wpm) AS best_wpm, MAX(accuracy_pct) AS best_accuracy,
                  COUNT(*)::int AS total_sessions
           FROM typing_sessions
           GROUP BY kid_name
           ORDER BY best_wpm DESC`
        )
        return NextResponse.json({ leaderboard: board })
      } catch (error) {
        console.error('get_typing_leaderboard error:', error)
        return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // get_task_instructions — all task step-by-step instructions
    // ------------------------------------------------------------------
    case 'get_task_instructions': {
      try {
        const instructions = await db.query(
          `SELECT task_source, task_key, steps FROM task_instructions ORDER BY task_source, task_key`
        )
        return NextResponse.json({ instructions })
      } catch {
        return NextResponse.json({ instructions: [] })
      }
    }

    // ------------------------------------------------------------------
    // get_typing_passages — get passages for a grade band
    // ------------------------------------------------------------------
    case 'get_typing_passages': {
      const gradeBand = searchParams.get('grade_band')

      try {
        let sql = `SELECT * FROM typing_passages WHERE active = TRUE`
        const params: any[] = []
        if (gradeBand) {
          sql += ` AND grade_band = $1`
          params.push(gradeBand)
        }
        sql += ` ORDER BY RANDOM() LIMIT 5`
        const passages = await db.query(sql, params)
        return NextResponse.json({ passages })
      } catch (error) {
        console.error('get_typing_passages error:', error)
        return NextResponse.json({ error: 'Failed to load passages' }, { status: 500 })
      }
    }

    // Alias for dashboard widget — filter by today's day-of-week so counts match kid-side view
    case 'dashboard_summary': {
      try {
        const days = ['sun','mon','tue','wed','thu','fri','sat']
        const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
        const dayOfWeek = days[now.getDay()]
        const progress = await db.query(
          `SELECT t.kid_name,
                  COUNT(t.id)::int AS total_tasks,
                  COUNT(c.id)::int AS completed_tasks,
                  COALESCE(SUM(CASE WHEN c.id IS NOT NULL THEN t.duration_min ELSE 0 END), 0)::int AS focus_mins
           FROM homeschool_tasks t
           LEFT JOIN homeschool_task_completions c
             ON c.task_id = t.id AND c.kid_name = t.kid_name AND c.task_date = CURRENT_DATE
           WHERE t.active = true
             AND (t.is_recurring = false OR $1 = ANY(t.recurrence_days))
           GROUP BY t.kid_name
           ORDER BY t.kid_name`,
          [dayOfWeek]
        )
        return NextResponse.json({ progress, date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }) })
      } catch { return NextResponse.json({ progress: [] }) }
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
      const { title, author, book_type, student_names: bookStudents, subject_tag, series_name, series_number, read_type, school_year } = data
      if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })

      // Auto-stamp school_year from current date if not provided
      // School year runs Aug-Jul: if month >= 8, year is "YYYY-(YYYY+1)", else "(YYYY-1)-YYYY"
      let resolvedSchoolYear = school_year || null
      if (!resolvedSchoolYear) {
        const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
        const yr = now.getFullYear()
        const mo = now.getMonth() + 1
        resolvedSchoolYear = mo >= 8 ? `${yr}-${yr + 1}` : `${yr - 1}-${yr}`
      }

      try {
        const result = await db.query(
          `INSERT INTO hs_books (title, author, book_type, student_names, subject_tag, status, series_name, series_number, read_type, school_year)
           VALUES ($1, $2, $3, $4::text[], $5, 'in_progress', $6, $7, $8, $9)
           RETURNING *`,
          [
            title,
            author || null,
            book_type || 'read_aloud',
            bookStudents || null,
            subject_tag || null,
            series_name || null,
            series_number || null,
            read_type || 'independent',
            resolvedSchoolYear,
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

    // ------------------------------------------------------------------
    // log_enrichment_pick — kid picked an enrichment activity
    // ------------------------------------------------------------------
    case 'log_enrichment_pick': {
      const { kid_name, activity_id } = data
      if (!kid_name || !activity_id) {
        return NextResponse.json({ error: 'kid_name and activity_id required' }, { status: 400 })
      }

      try {
        const result = await db.query(
          `INSERT INTO kid_enrichment_log (kid_name, activity_id, picked, date)
           VALUES ($1, $2, TRUE, CURRENT_DATE)
           RETURNING *`,
          [kid_name.toLowerCase(), activity_id]
        )
        return NextResponse.json({ log: result[0] }, { status: 201 })
      } catch (error) {
        console.error('log_enrichment_pick error:', error)
        return NextResponse.json({ error: 'Failed to log enrichment pick' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // log_enrichment_complete — kid completed an enrichment activity
    // ------------------------------------------------------------------
    case 'log_enrichment_complete': {
      const { kid_name, activity_id } = data
      if (!kid_name || !activity_id) {
        return NextResponse.json({ error: 'kid_name and activity_id required' }, { status: 400 })
      }

      try {
        // Update existing log entry or create new one
        const existing = await db.query(
          `SELECT id FROM kid_enrichment_log
           WHERE kid_name = $1 AND activity_id = $2 AND date = CURRENT_DATE AND picked = TRUE
           LIMIT 1`,
          [kid_name.toLowerCase(), activity_id]
        )

        let result
        if (existing[0]) {
          result = await db.query(
            `UPDATE kid_enrichment_log SET completed = TRUE, stars_earned = 1
             WHERE id = $1 RETURNING *`,
            [existing[0].id]
          )
        } else {
          result = await db.query(
            `INSERT INTO kid_enrichment_log (kid_name, activity_id, picked, completed, stars_earned, date)
             VALUES ($1, $2, TRUE, TRUE, 1, CURRENT_DATE)
             RETURNING *`,
            [kid_name.toLowerCase(), activity_id]
          )
        }
        return NextResponse.json({ log: result[0] })
      } catch (error) {
        console.error('log_enrichment_complete error:', error)
        return NextResponse.json({ error: 'Failed to log enrichment completion' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // log_enrichment_shown — record that options were shown (not picked)
    // ------------------------------------------------------------------
    case 'log_enrichment_shown': {
      const { kid_name, activity_ids } = data
      if (!kid_name || !activity_ids || !activity_ids.length) {
        return NextResponse.json({ error: 'kid_name and activity_ids required' }, { status: 400 })
      }

      try {
        for (const aid of activity_ids) {
          await db.query(
            `INSERT INTO kid_enrichment_log (kid_name, activity_id, picked, date)
             VALUES ($1, $2, FALSE, CURRENT_DATE)`,
            [kid_name.toLowerCase(), aid]
          )
        }
        return NextResponse.json({ ok: true })
      } catch (error) {
        console.error('log_enrichment_shown error:', error)
        return NextResponse.json({ error: 'Failed to log shown activities' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // advance_financial_level — parent advances a kid's level
    // ------------------------------------------------------------------
    case 'advance_financial_level': {
      const { kid_name } = data
      if (!kid_name) return NextResponse.json({ error: 'kid_name required' }, { status: 400 })

      try {
        const kid = kid_name.toLowerCase()
        const current = await db.query(
          `SELECT * FROM financial_literacy_progress WHERE kid_name = $1`,
          [kid]
        )
        if (!current[0]) {
          return NextResponse.json({ error: 'Kid not found in financial literacy' }, { status: 404 })
        }

        const lvl = current[0].current_level
        if (lvl >= 6) {
          return NextResponse.json({ error: 'Already at max level' }, { status: 400 })
        }

        // Mark current level complete and advance
        const levelCol = `level_${lvl}_complete`
        const result = await db.query(
          `UPDATE financial_literacy_progress
           SET ${levelCol} = TRUE,
               current_level = current_level + 1,
               updated_at = NOW()
           WHERE kid_name = $1
           RETURNING *`,
          [kid]
        )

        // NOTIFY-FIX-1b #3: Notify parent of financial level advance
        const kidDisplay = kid.charAt(0).toUpperCase() + kid.slice(1)
        await createNotification({
          title: `${kidDisplay} reached Financial Literacy Level ${lvl + 1}!`,
          message: `Advanced from Level ${lvl} to Level ${lvl + 1}`,
          source_type: 'financial_level_advance', source_ref: `fin-level-${kid}-${lvl + 1}`,
          link_tab: 'school', icon: '🎓',
        }).catch(e => console.error('Financial level notify failed:', e.message))

        return NextResponse.json({ progress: result[0] })
      } catch (error) {
        console.error('advance_financial_level error:', error)
        return NextResponse.json({ error: 'Failed to advance financial level' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // save_typing_session — record a completed typing session
    // ------------------------------------------------------------------
    case 'save_typing_session': {
      const { kid_name, wpm, accuracy_pct, passage_id, dyslexia_mode, race_mode, race_participants, race_position } = data
      if (!kid_name || wpm === undefined || accuracy_pct === undefined) {
        return NextResponse.json({ error: 'kid_name, wpm, and accuracy_pct required' }, { status: 400 })
      }

      try {
        const kid = kid_name.toLowerCase()

        // Check if this is a personal best
        const pbRows = await db.query(
          `SELECT MAX(wpm) AS best_wpm FROM typing_sessions WHERE kid_name = $1`,
          [kid]
        )
        const previousBest = pbRows[0]?.best_wpm || 0
        const isPersonalBest = wpm > previousBest

        // Calculate stars
        let starsEarned = 2 // base for completing a session
        if (isPersonalBest) starsEarned += 5
        if (race_mode && race_position === 1) starsEarned += 3
        if (accuracy_pct >= 95) starsEarned += 3

        const result = await db.query(
          `INSERT INTO typing_sessions
             (kid_name, wpm, accuracy_pct, passage_id, dyslexia_mode,
              race_mode, race_participants, race_position, personal_best, stars_earned)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING *`,
          [
            kid, wpm, accuracy_pct, passage_id || null,
            dyslexia_mode || false, race_mode || false,
            race_participants || null, race_position || null,
            isPersonalBest, starsEarned,
          ]
        )

        return NextResponse.json({
          session: result[0],
          is_personal_best: isPersonalBest,
          previous_best: previousBest,
          stars_earned: starsEarned,
        }, { status: 201 })
      } catch (error) {
        console.error('save_typing_session error:', error)
        return NextResponse.json({ error: 'Failed to save typing session' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // toggle_task — check/uncheck a homeschool task, award stars
    // ------------------------------------------------------------------
    case 'toggle_task': {
      const { task_id, kid_name } = data
      if (!task_id || !kid_name) {
        return NextResponse.json({ error: 'task_id and kid_name required' }, { status: 400 })
      }

      try {
        const kid = kid_name.toLowerCase()

        // Check if already completed today
        const existing = await db.query(
          `SELECT id FROM homeschool_task_completions
           WHERE task_id = $1 AND kid_name = $2 AND task_date = CURRENT_DATE`,
          [task_id, kid]
        )

        if (existing[0]) {
          // Un-complete (no shame — silent removal)
          await db.query(`DELETE FROM homeschool_task_completions WHERE id = $1`, [existing[0].id])
          return NextResponse.json({ completed: false, stars_earned: 0 })
        } else {
          // Complete — get star value and award
          const taskRows = await db.query(
            `SELECT stars_value FROM homeschool_tasks WHERE id = $1`,
            [task_id]
          )
          const starsValue = taskRows[0]?.stars_value || 1

          await db.query(
            `INSERT INTO homeschool_task_completions (task_id, kid_name, task_date, stars_earned)
             VALUES ($1, $2, CURRENT_DATE, $3)`,
            [task_id, kid, starsValue]
          )

          return NextResponse.json({ completed: true, stars_earned: starsValue })
        }
      } catch (error) {
        console.error('toggle_task error:', error)
        return NextResponse.json({ error: 'Failed to toggle task' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // create_task — parent adds a new task for a kid
    // ------------------------------------------------------------------
    case 'create_task': {
      const { kid_name, subject, task_label, task_description, duration_min, stars_value, sort_order, recurrence_days, assigned_pages, total_pages } = data
      if (!kid_name || !subject || !task_label) {
        return NextResponse.json({ error: 'kid_name, subject, and task_label required' }, { status: 400 })
      }

      try {
        await db.query(`ALTER TABLE homeschool_tasks ADD COLUMN IF NOT EXISTS assigned_pages TEXT`).catch(() => {})
        await db.query(`ALTER TABLE homeschool_tasks ADD COLUMN IF NOT EXISTS total_pages INTEGER`).catch(() => {})
        const result = await db.query(
          `INSERT INTO homeschool_tasks (kid_name, subject, task_label, task_description, duration_min, stars_value, sort_order, recurrence_days, assigned_pages, total_pages)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING *`,
          [
            kid_name, subject, task_label, task_description || null,
            duration_min || 15, stars_value || 1, sort_order || 0,
            recurrence_days || ['mon','tue','wed','thu','fri'],
            assigned_pages || null, total_pages ? parseInt(total_pages) : null,
          ]
        )
        return NextResponse.json({ task: result[0] }, { status: 201 })
      } catch (error) {
        console.error('create_task error:', error)
        return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // update_task — parent edits a task
    // ------------------------------------------------------------------
    case 'update_task': {
      const { task_id, ...updates } = data
      if (!task_id) return NextResponse.json({ error: 'task_id required' }, { status: 400 })

      const allowedFields = ['subject', 'task_label', 'task_description', 'duration_min', 'stars_value', 'sort_order', 'recurrence_days', 'active', 'is_recurring']
      const setClauses: string[] = []
      const params: any[] = [task_id]

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          params.push(value)
          setClauses.push(`${key} = $${params.length}`)
        }
      }

      if (setClauses.length === 0) {
        return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
      }

      try {
        const result = await db.query(
          `UPDATE homeschool_tasks SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
          params
        )
        if (!result[0]) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
        return NextResponse.json({ task: result[0] })
      } catch (error) {
        console.error('update_task error:', error)
        return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
      }
    }

    // ------------------------------------------------------------------
    // delete_task — parent deletes a task
    // ------------------------------------------------------------------
    case 'delete_task': {
      const { task_id } = data
      if (!task_id) return NextResponse.json({ error: 'task_id required' }, { status: 400 })

      try {
        // Delete completions first, then task
        await db.query(`DELETE FROM homeschool_task_completions WHERE task_id = $1`, [task_id])
        await db.query(`DELETE FROM homeschool_tasks WHERE id = $1`, [task_id])
        return NextResponse.json({ ok: true })
      } catch (error) {
        console.error('delete_task error:', error)
        return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
      }
    }

    default:
      return NextResponse.json({ error: `Unknown POST action: ${action}` }, { status: 400 })
  }
}
